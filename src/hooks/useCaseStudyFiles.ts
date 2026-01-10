import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'vandarum_case_studies';
const DB_VERSION = 1;
const STORE_NAME = 'pending_files';

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  addedAt: number;
}

export interface PendingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const arrayBufferToFile = (buffer: ArrayBuffer, name: string, type: string): File => {
  return new File([buffer], name, { type });
};

export const useCaseStudyFiles = () => {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingFiles, setHasPendingFiles] = useState(false);

  // Load files from IndexedDB on mount
  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const storedFiles: StoredFile[] = request.result || [];
          const files: PendingFile[] = storedFiles.map(sf => ({
            id: sf.id,
            name: sf.name,
            size: sf.size,
            type: sf.type,
            file: arrayBufferToFile(sf.data, sf.name, sf.type),
          }));
          setPendingFiles(files);
          setHasPendingFiles(files.length > 0);
          setIsLoading(false);
          resolve();
        };
        request.onerror = () => {
          setIsLoading(false);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error loading files from IndexedDB:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Add files to IndexedDB
  const addFiles = useCallback(async (files: File[]) => {
    try {
      // Convert all files to ArrayBuffer BEFORE opening the transaction
      // IndexedDB transactions auto-close when awaiting non-transaction promises
      const fileDataPromises = files.map(async (file) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
        const buffer = await fileToArrayBuffer(file);
        return {
          id,
          file,
          buffer,
        };
      });
      
      const filesWithBuffers = await Promise.all(fileDataPromises);
      
      // Now open the transaction and add all files synchronously
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const newPendingFiles: PendingFile[] = [];
      
      for (const { id, file, buffer } of filesWithBuffers) {
        const storedFile: StoredFile = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          data: buffer,
          addedAt: Date.now(),
        };
        
        store.add(storedFile);
        
        newPendingFiles.push({
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          file,
        });
      }
      
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      
      setPendingFiles(prev => {
        const updated = [...prev, ...newPendingFiles];
        setHasPendingFiles(updated.length > 0);
        return updated;
      });
    } catch (error) {
      console.error('Error adding files to IndexedDB:', error);
      throw error;
    }
  }, []);

  // Remove a file from IndexedDB
  const removeFile = useCallback(async (fileId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(fileId);
      
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      
      setPendingFiles(prev => {
        const updated = prev.filter(f => f.id !== fileId);
        setHasPendingFiles(updated.length > 0);
        return updated;
      });
    } catch (error) {
      console.error('Error removing file from IndexedDB:', error);
      throw error;
    }
  }, []);

  // Clear all files from IndexedDB
  const clearFiles = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      
      setPendingFiles([]);
      setHasPendingFiles(false);
    } catch (error) {
      console.error('Error clearing files from IndexedDB:', error);
      throw error;
    }
  }, []);

  // Get files for processing
  const getFilesForProcessing = useCallback((): File[] => {
    return pendingFiles
      .filter(pf => pf.file)
      .map(pf => pf.file!);
  }, [pendingFiles]);

  return {
    pendingFiles,
    isLoading,
    hasPendingFiles,
    addFiles,
    removeFile,
    clearFiles,
    getFilesForProcessing,
    refreshFiles: loadFiles,
  };
};
