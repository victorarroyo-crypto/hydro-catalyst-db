import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UploadMoreDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploadComplete: () => void;
}

interface FileWithType {
  file: File;
  type: 'contrato' | 'factura' | 'listado_proveedores' | 'otro';
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

const FILE_TYPE_OPTIONS = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'factura', label: 'Factura' },
  { value: 'listado_proveedores', label: 'Listado de proveedores' },
  { value: 'otro', label: 'Otro' },
];

export function UploadMoreDocumentsModal({
  open,
  onOpenChange,
  projectId,
  onUploadComplete,
}: UploadMoreDocumentsModalProps) {
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      type: 'otro' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, type: FileWithType['type']) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, type } : f))
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, type } = files[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', type);
        formData.append('project_id', projectId);

        const { data, error } = await supabase.functions.invoke('cost-consulting-upload', {
          body: formData,
        });

        if (error) {
          throw new Error(`Error subiendo ${file.name}: ${error.message}`);
        }

        if (!data?.success) {
          throw new Error(`Error subiendo ${file.name}: ${data?.error || 'Error desconocido'}`);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setUploadComplete(true);
      toast.success('Documentos subidos correctamente', {
        description: 'Ejecuta "Re-extraer" para procesar los nuevos documentos.',
      });
      
      // Wait a bit before closing to show success state
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir documentos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setUploadProgress(0);
      setUploadComplete(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir más documentos</DialogTitle>
          <DialogDescription>
            Añade documentos adicionales al proyecto. Después de subir, ejecuta "Re-extraer" para procesarlos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-primary">Suelta los archivos aquí...</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Arrastra archivos o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Excel (.xlsx, .xls), Imágenes (PNG, JPG)
                </p>
              </>
            )}
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {files.map((fileWithType, index) => (
                <div
                  key={`${fileWithType.file.name}-${index}`}
                  className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1" title={fileWithType.file.name}>
                    {fileWithType.file.name}
                  </span>
                  <Select
                    value={fileWithType.type}
                    onValueChange={(value) => updateFileType(index, value as FileWithType['type'])}
                    disabled={isUploading}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subiendo...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success state */}
          {uploadComplete && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm">¡Documentos subidos correctamente!</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading || uploadComplete}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
