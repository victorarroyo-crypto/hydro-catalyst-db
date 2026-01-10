import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { useCaseStudyFiles, PendingFile } from '@/hooks/useCaseStudyFiles';
import { toast } from 'sonner';

interface NewCaseStudyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess?: (files: File[]) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (type.includes('spreadsheet') || type.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

export const NewCaseStudyModal: React.FC<NewCaseStudyModalProps> = ({
  open,
  onOpenChange,
  onProcess,
}) => {
  const {
    pendingFiles,
    isLoading,
    hasPendingFiles,
    addFiles,
    removeFile,
    clearFiles,
  } = useCaseStudyFiles();

  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Filter oversized files
    const validFiles = acceptedFiles.filter(f => f.size <= MAX_FILE_SIZE);
    const rejectedCount = acceptedFiles.length - validFiles.length;
    
    if (rejectedCount > 0) {
      toast.error(`${rejectedCount} archivo(s) rechazado(s) por exceder 50MB`);
    }
    
    if (validFiles.length > 0) {
      try {
        await addFiles(validFiles);
        toast.success(`${validFiles.length} archivo(s) añadido(s)`);
      } catch (error) {
        toast.error('Error al guardar archivos');
      }
    }
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
  });

  const handleRemoveFile = async (fileId: string) => {
    setIsRemoving(fileId);
    try {
      await removeFile(fileId);
    } catch (error) {
      toast.error('Error al eliminar archivo');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClearFiles = async () => {
    setIsClearing(true);
    try {
      await clearFiles();
      toast.success('Archivos eliminados');
    } catch (error) {
      toast.error('Error al limpiar archivos');
    } finally {
      setIsClearing(false);
    }
  };

  const handleProcess = () => {
    const files = pendingFiles
      .filter(pf => pf.file)
      .map(pf => pf.file!);
    
    if (files.length > 0 && onProcess) {
      onProcess(files);
    }
  };

  const canProcess = pendingFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nuevo Caso de Estudio
          </DialogTitle>
          <DialogDescription>
            Sube documentos para extraer automáticamente la información del caso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pending files warning */}
          {hasPendingFiles && !isLoading && (
            <Alert className="border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                Tienes archivos pendientes de procesar. Puedes continuar donde lo dejaste.
              </AlertDescription>
            </Alert>
          )}

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {isDragActive 
                ? 'Suelta los archivos aquí...' 
                : 'Arrastra archivos aquí o haz clic para seleccionar'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Excel (máx 50MB cada uno)
            </p>
          </div>

          {/* File list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando archivos...</span>
            </div>
          ) : pendingFiles.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Archivos seleccionados ({pendingFiles.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFiles}
                  disabled={isClearing}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Limpiar archivos
                </Button>
              </div>
              
              <ScrollArea className="h-[180px] rounded-md border">
                <div className="p-2 space-y-2">
                  {pendingFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(file.id)}
                        disabled={isRemoving === file.id}
                      >
                        {isRemoving === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}

          {/* Security notice */}
          <Alert className="border-muted bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-xs text-muted-foreground">
              Los documentos se procesarán de forma segura y no se almacenarán en la plataforma.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!canProcess}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Procesar con IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
