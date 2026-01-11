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
import { useCaseStudyFiles } from '@/hooks/useCaseStudyFiles';
import { CaseStudyProcessingView } from './CaseStudyProcessingView';
import { CaseStudyFormView } from './CaseStudyFormView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewCaseStudyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type ModalStep = 'upload' | 'processing' | 'form';

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
  onCompleted,
}) => {
  const {
    pendingFiles,
    isLoading,
    hasPendingFiles,
    addFiles,
    removeFile,
    clearFiles,
  } = useCaseStudyFiles();

  const [step, setStep] = useState<ModalStep>('upload');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isStartingProcess, setIsStartingProcess] = useState(false);

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

  const handleStartProcessing = async () => {
    console.log('[CaseStudy] handleStartProcessing called');
    console.log('[CaseStudy] pendingFiles count:', pendingFiles.length);
    
    if (pendingFiles.length === 0) {
      console.log('[CaseStudy] No pending files, returning early');
      return;
    }
    
    setIsStartingProcess(true);
    
    try {
      console.log('[CaseStudy] Creating job in case_study_jobs...');
      
      // Create a new job in case_study_jobs
      const { data: job, error } = await supabase
        .from('case_study_jobs')
        .insert({
          status: 'processing',
          current_phase: 'extracting',
          progress_percentage: 0,
          documents_count: pendingFiles.length,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CaseStudy] Error creating job:', error);
        throw error;
      }

      console.log('[CaseStudy] Job created with ID:', job.id);
      setCurrentJobId(job.id);
      setStep('processing');
      
      // Send files to Railway for processing
      console.log('[CaseStudy] Building FormData...');
      const formData = new FormData();
      formData.append('job_id', job.id);
      formData.append('webhook_url', 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/case-study-webhook');
      formData.append('webhook_secret', 'AquaTechWebhook26');
      
      // Append each file to FormData
      let filesAppended = 0;
      for (const pendingFile of pendingFiles) {
        console.log('[CaseStudy] Processing file:', pendingFile.name, 'has file object:', !!pendingFile.file);
        if (pendingFile.file) {
          formData.append('files', pendingFile.file, pendingFile.name);
          filesAppended++;
        }
      }
      
      console.log('[CaseStudy] Files appended to FormData:', filesAppended);
      
      // Call Railway API
      const railwayUrl = import.meta.env.VITE_RAILWAY_CASE_STUDY_URL || 'https://watertech-scouting-production.up.railway.app/api/case-study/upload-and-process';
      const railwaySyncSecret = import.meta.env.VITE_RAILWAY_SYNC_SECRET || 'wt-sync-2026-secure';
      
      console.log('[CaseStudy] Railway URL:', railwayUrl);
      console.log('[CaseStudy] About to call fetch...');
      
      const response = await fetch(railwayUrl, {
        method: 'POST',
        headers: {
          'X-Sync-Secret': railwaySyncSecret,
        },
        body: formData,
      });
      
      console.log('[CaseStudy] Fetch completed, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CaseStudy] Railway error response:', errorText);
        throw new Error(`Error al enviar a Railway: ${response.status}`);
      }
      
      const responseData = await response.text();
      console.log('[CaseStudy] Railway success response:', responseData);
      
    } catch (error) {
      console.error('[CaseStudy] Error in handleStartProcessing:', error);
      toast.error('Error al iniciar el procesamiento');
      
      // If Railway call failed, update job status
      if (currentJobId) {
        console.log('[CaseStudy] Updating job status to failed...');
        await supabase
          .from('case_study_jobs')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : 'Error desconocido' 
          })
          .eq('id', currentJobId);
      }
    } finally {
      console.log('[CaseStudy] handleStartProcessing finished');
      setIsStartingProcess(false);
    }
  };

  const handleProcessingCompleted = async (jobId: string) => {
    // Move to form step instead of closing
    setCurrentJobId(jobId);
    setStep('form');
  };

  const handleFormBack = () => {
    // Go back to upload step
    setStep('upload');
    setCurrentJobId(null);
  };

  const handleFormSaved = async () => {
    // Clear IndexedDB files after successful save
    await clearFiles();
    // Close modal and refresh
    if (onCompleted) {
      onCompleted();
    }
    handleClose();
  };

  const handleCancel = async () => {
    if (currentJobId) {
      // Optionally mark job as cancelled
      await supabase
        .from('case_study_jobs')
        .update({ status: 'failed', error_message: 'Cancelado por el usuario' })
        .eq('id', currentJobId);
    }
    handleClose();
  };

  const handleRetry = async () => {
    setStep('upload');
    setCurrentJobId(null);
  };

  const handleClose = () => {
    setStep('upload');
    setCurrentJobId(null);
    onOpenChange(false);
  };

  const canProcess = pendingFiles.length > 0;

  // Dynamic modal size based on step
  const modalSizeClass = step === 'form' ? 'sm:max-w-2xl' : 'sm:max-w-xl';

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value && step === 'processing') {
        // Only prevent closing during processing (not form step)
        return;
      }
      handleClose();
    }}>
      <DialogContent className={`max-h-[90vh] w-[95vw] ${modalSizeClass} p-0 flex flex-col min-h-0 overflow-hidden`}>
        {step === 'upload' ? (
          <>
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
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleStartProcessing}
                disabled={!canProcess || isStartingProcess}
                className="gap-2"
              >
                {isStartingProcess ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Procesar con IA
              </Button>
            </DialogFooter>
          </>
        ) : step === 'processing' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Procesando Caso de Estudio
              </DialogTitle>
            </DialogHeader>

            {currentJobId && (
              <CaseStudyProcessingView
                jobId={currentJobId}
                onCompleted={handleProcessingCompleted}
                onCancel={handleCancel}
                onRetry={handleRetry}
              />
            )}
          </>
        ) : (
          /* Form step */
          currentJobId && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Completar Caso de Estudio
                  </DialogTitle>
                  <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <CaseStudyFormView
                jobId={currentJobId}
                onBack={handleFormBack}
                onSaved={handleFormSaved}
              />
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};
