import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/lib/api';
import type { DocumentProcessingState, DocumentProcessingStatus } from '@/types/documentProcessing';

export async function getDocumentProcessingStatus(
  projectId: string,
  documentId: string
): Promise<DocumentProcessingState> {
  const response = await fetch(
    `${API_URL}/api/projects/${projectId}/documents/${documentId}/status`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error fetching document status');
  }

  return response.json();
}

interface UseDocumentProcessingStatusResult {
  status: DocumentProcessingState | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<DocumentProcessingState | null | undefined>;
}

export function useDocumentProcessingStatus(
  projectId: string | null,
  documentId: string | null,
  enabled: boolean = true
): UseDocumentProcessingStatusResult {
  const [status, setStatus] = useState<DocumentProcessingState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectId || !documentId) return;

    try {
      setIsLoading(true);
      const data = await getDocumentProcessingStatus(projectId, documentId);
      setStatus(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    if (!projectId || !documentId || !enabled) {
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const shouldStopPolling = (data: DocumentProcessingState): boolean => {
      if (data.status === 'completed' || data.status === 'failed') {
        return true;
      }
      // For split documents, stop when all parts are complete
      if (data.is_split_document && data.parts_completed === data.total_parts) {
        return true;
      }
      return false;
    };

    const pollStatus = async () => {
      const data = await fetchStatus();

      if (isMounted && data) {
        // Detener polling si completado, fallido, o todas las partes procesadas
        if (shouldStopPolling(data)) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    // Fetch inicial
    pollStatus();

    // Polling cada 2 segundos mientras está procesando
    intervalId = setInterval(pollStatus, 2000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [projectId, documentId, enabled, fetchStatus]);

  return { status, isLoading, error, refetch: fetchStatus };
}

// Helper to check if a status indicates active processing
export function isActiveProcessing(status: DocumentProcessingStatus): boolean {
  return !['completed', 'failed', 'pending'].includes(status);
}
