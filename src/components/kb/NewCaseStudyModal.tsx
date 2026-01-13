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
import { Progress } from '@/components/ui/progress';
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
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useCaseStudyFiles, type PendingFile } from '@/hooks/useCaseStudyFiles';
import { CaseStudyProcessingView } from './CaseStudyProcessingView';
import { CaseStudyFormView } from './CaseStudyFormView';
import { LLMSelector } from './LLMSelector';
import { getDefaultModel } from '@/hooks/useCaseStudyModels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewCaseStudyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type ModalStep = 'upload' | 'uploading' | 'processing' | 'form';

interface FailedFile {
  name: string;
  error: string;
}

interface UploadProgress {
  current: number;
  total: number;
  completed: number;
  failed: number;
  currentFileName?: string;
  retrying?: boolean;
  currentAttempt?: number;
  maxAttempts?: number;
  failedFiles: FailedFile[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

// Rate limiting: 1 documento a la vez para Case Studies (son muy pesados)
const MAX_CONCURRENT_UPLOADS = 1;
// Timeout de 5 minutos por documento
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
// Máximo reintentos por documento
const MAX_RETRIES = 3;
// Pausa entre documentos (ms)
const INTER_DOCUMENT_PAUSE_MS = 2000;

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
    resetDB,
    refreshFiles,
  } = useCaseStudyFiles();

  const [step, setStep] = useState<ModalStep>('upload');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isStartingProcess, setIsStartingProcess] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState<string>(getDefaultModel());
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    current: 0,
    total: 0,
    completed: 0,
    failed: 0,
    failedFiles: [],
  });

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
      console.log('[CaseStudy] handleClearFiles: attempting clearFiles...');
      await clearFiles();
      
      // Verify files are actually cleared
      await refreshFiles();
      
      // If still has pending files, do a hard reset
      if (pendingFiles.length > 0) {
        console.log('[CaseStudy] handleClearFiles: files still present, doing hard reset...');
        toast.info('Ejecutando limpieza completa...');
        await resetDB();
        await refreshFiles();
      }
      
      toast.success('Archivos eliminados');
    } catch (error) {
      console.error('[CaseStudy] handleClearFiles error:', error);
      // Fallback to hard reset on any error
      try {
        console.log('[CaseStudy] handleClearFiles: error occurred, trying resetDB...');
        await resetDB();
        toast.success('Almacenamiento reiniciado');
      } catch (resetError) {
        toast.error('Error al limpiar archivos. Intenta recargar la página.');
      }
    } finally {
      setIsClearing(false);
    }
  };

  // Upload single file with retry and exponential backoff
  const uploadFileWithRetry = async (
    file: PendingFile,
    index: number,
    jobId: string,
    totalFiles: number,
    railwayUrl: string,
    railwaySyncSecret: string
  ): Promise<{ success: boolean; error?: string }> => {
    const fileName = file.name;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        console.log(`[CaseStudy] Intento ${attempt}/${MAX_RETRIES}: ${fileName}`);
        
        setUploadProgress(prev => ({
          ...prev,
          currentFileName: fileName,
          retrying: attempt > 1,
          currentAttempt: attempt,
          maxAttempts: MAX_RETRIES,
        }));

        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('file_index', String(index));
        formData.append('total_files', String(totalFiles));
        formData.append('webhook_url', 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/case-study-webhook');
        formData.append('webhook_secret', 'AquaTechWebhook26');
        formData.append('llm_key', selectedLLM);
        formData.append('files', file.file!, fileName);

        const response = await fetch(railwayUrl, {
          method: 'POST',
          headers: {
            'X-Sync-Secret': railwaySyncSecret,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[CaseStudy] File ${index + 1} error:`, errorText);
          throw new Error(`HTTP ${response.status}`);
        }

        console.log(`[CaseStudy] ✅ ${fileName} procesado en intento ${attempt}`);
        return { success: true };

      } catch (error) {
        clearTimeout(timeoutId);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        const isAborted = error instanceof Error && error.name === 'AbortError';
        
        console.error(`[CaseStudy] ❌ Fallo intento ${attempt}: ${isAborted ? 'Timeout (5 min)' : errorMsg}`);

        if (attempt < MAX_RETRIES) {
          // Backoff exponencial: 5s, 15s, 45s
          const delay = 5000 * Math.pow(3, attempt - 1);
          console.log(`[CaseStudy] Esperando ${delay / 1000}s antes de reintentar...`);
          
          setUploadProgress(prev => ({
            ...prev,
            currentFileName: `${fileName} - esperando ${delay / 1000}s para reintentar...`,
          }));
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          return { 
            success: false, 
            error: isAborted ? 'Timeout (5 min)' : errorMsg 
          };
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  };

  // Rate-limited file upload function with retries
  const processFilesWithLimit = async (
    files: PendingFile[],
    jobId: string,
    limit: number = MAX_CONCURRENT_UPLOADS
  ): Promise<{ completed: number; failed: number; failedFiles: FailedFile[] }> => {
    const railwayUrl = import.meta.env.VITE_RAILWAY_CASE_STUDY_URL || 'https://watertech-scouting-production.up.railway.app/api/case-study/upload-and-process';
    const railwaySyncSecret = import.meta.env.VITE_RAILWAY_SYNC_SECRET || 'wt-sync-2026-secure';
    
    const queue = [...files];
    let completed = 0;
    let failed = 0;
    let processed = 0;
    const failedFiles: FailedFile[] = [];
    const inProgress: Promise<void>[] = [];

    const processOne = async (file: PendingFile, index: number): Promise<void> => {
      const result = await uploadFileWithRetry(
        file,
        index,
        jobId,
        files.length,
        railwayUrl,
        railwaySyncSecret
      );

      processed++;

      if (result.success) {
        completed++;
        setUploadProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          current: processed,
        }));
        toast.success(`✅ ${file.name} procesado`);
      } else {
        failed++;
        failedFiles.push({ name: file.name, error: result.error || 'Error desconocido' });
        setUploadProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
          current: processed,
          failedFiles: [...prev.failedFiles, { name: file.name, error: result.error || 'Error desconocido' }],
        }));
        toast.error(`❌ ${file.name} falló después de ${MAX_RETRIES} intentos`);
      }

      // Pausa entre documentos para evitar saturación
      if (queue.length > 0 || inProgress.length > 1) {
        console.log(`[CaseStudy] Pausa de ${INTER_DOCUMENT_PAUSE_MS / 1000}s antes del siguiente documento...`);
        await new Promise(resolve => setTimeout(resolve, INTER_DOCUMENT_PAUSE_MS));
      }
    };

    let fileIndex = 0;

    // Process with concurrency limit (sequential for Case Studies)
    while (queue.length > 0 || inProgress.length > 0) {
      // Fill up to the limit
      while (inProgress.length < limit && queue.length > 0) {
        const file = queue.shift()!;
        const currentIndex = fileIndex++;
        const promise = processOne(file, currentIndex).finally(() => {
          const idx = inProgress.indexOf(promise);
          if (idx !== -1) inProgress.splice(idx, 1);
        });
        inProgress.push(promise);
      }

      // Wait for at least one to complete before continuing
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return { completed, failed, failedFiles };
  };

  const handleStartProcessing = async () => {
    console.log('[CaseStudy] handleStartProcessing called');
    console.log('[CaseStudy] pendingFiles count:', pendingFiles.length);
    
    const filesToProcess = pendingFiles.filter(f => f.file);
    
    if (filesToProcess.length === 0) {
      console.log('[CaseStudy] No pending files with file objects, returning early');
      toast.error('No hay archivos válidos para procesar');
      return;
    }
    
    setIsStartingProcess(true);
    setUploadProgress({
      current: 0,
      total: filesToProcess.length,
      completed: 0,
      failed: 0,
      failedFiles: [],
    });
    
    try {
      console.log('[CaseStudy] Creating job in case_study_jobs...');
      
      // Create a new job in case_study_jobs
      const { data: job, error } = await supabase
        .from('case_study_jobs')
        .insert({
          status: 'processing',
          current_phase: 'uploading',
          progress_percentage: 0,
          documents_count: filesToProcess.length,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CaseStudy] Error creating job:', error);
        throw error;
      }

      console.log('[CaseStudy] Job created with ID:', job.id);
      setCurrentJobId(job.id);
      setStep('uploading');
      
      // Process files with rate limiting (1 concurrent) and retries
      console.log(`[CaseStudy] Starting robust upload (${MAX_CONCURRENT_UPLOADS} concurrent, ${MAX_RETRIES} retries, ${UPLOAD_TIMEOUT_MS / 1000}s timeout)...`);
      const { completed, failed, failedFiles } = await processFilesWithLimit(
        filesToProcess,
        job.id,
        MAX_CONCURRENT_UPLOADS
      );
      
      console.log(`[CaseStudy] Upload complete: ${completed} OK, ${failed} failed`);
      
      if (failed > 0 && completed === 0) {
        // All failed
        toast.error('Todos los documentos fallaron al subir');
        await supabase
          .from('case_study_jobs')
          .update({ 
            status: 'failed', 
            error_message: `Todos los ${failed} documentos fallaron al subir` 
          })
          .eq('id', job.id);
        // Stay in uploading step to allow retry
        return;
      }
      
      if (failed > 0) {
        toast.warning(`${completed} documentos subidos, ${failed} fallidos. Puedes reintentar los fallidos.`);
      } else {
        toast.success(`${completed} documentos subidos correctamente`);
      }
      
      // Update job phase to extracting and move to processing view
      await supabase
        .from('case_study_jobs')
        .update({ 
          current_phase: 'extracting',
          progress_percentage: 10,
        })
        .eq('id', job.id);
      
      setStep('processing');
      
    } catch (error) {
      console.error('[CaseStudy] Error in handleStartProcessing:', error);
      toast.error('Error al iniciar el procesamiento');
      
      // If job was created but failed, update status
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
      setStep('upload');
    } finally {
      console.log('[CaseStudy] handleStartProcessing finished');
      setIsStartingProcess(false);
    }
  };

  // Retry only failed files
  const handleRetryFailed = async () => {
    if (!currentJobId || uploadProgress.failedFiles.length === 0) return;
    
    const failedNames = uploadProgress.failedFiles.map(f => f.name);
    const filesToRetry = pendingFiles.filter(f => failedNames.includes(f.name) && f.file);
    
    if (filesToRetry.length === 0) {
      toast.error('No se encontraron los archivos originales para reintentar');
      return;
    }
    
    setIsRetryingFailed(true);
    
    // Reset failed count but keep completed
    const previousCompleted = uploadProgress.completed;
    setUploadProgress(prev => ({
      ...prev,
      current: previousCompleted,
      total: previousCompleted + filesToRetry.length,
      failed: 0,
      failedFiles: [],
    }));
    
    console.log(`[CaseStudy] Retrying ${filesToRetry.length} failed files...`);
    
    const { completed, failed, failedFiles } = await processFilesWithLimit(
      filesToRetry,
      currentJobId,
      MAX_CONCURRENT_UPLOADS
    );
    
    setIsRetryingFailed(false);
    
    if (failed === 0) {
      toast.success('Todos los documentos reintentados exitosamente');
      
      // Move to processing if all are now done
      await supabase
        .from('case_study_jobs')
        .update({ 
          current_phase: 'extracting',
          progress_percentage: 10,
        })
        .eq('id', currentJobId);
      
      setStep('processing');
    } else {
      toast.warning(`${completed} OK, ${failed} siguen fallando`);
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
    
    // Ask if user wants to clear pending files
    if (pendingFiles.length > 0) {
      const shouldClear = window.confirm(
        '¿Deseas eliminar los archivos seleccionados?\n\nSi dices "Cancelar", podrás continuar donde lo dejaste la próxima vez.'
      );
      if (shouldClear) {
        await clearFiles();
      }
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
    setUploadProgress({
      current: 0,
      total: 0,
      completed: 0,
      failed: 0,
      failedFiles: [],
    });
    onOpenChange(false);
  };

  const canProcess = pendingFiles.length > 0;

  // Dynamic modal size based on step
  const modalSizeClass = step === 'form' ? 'sm:max-w-2xl' : 'sm:max-w-xl';

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value && (step === 'processing' || step === 'uploading')) {
        // Prevent closing during uploading or processing
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

            <div className="flex-1 overflow-y-auto space-y-4 py-4 px-6 min-h-0">
              {/* Pending files warning */}
              {hasPendingFiles && !isLoading && (
                <Alert className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="flex items-center justify-between w-full text-sm">
                    <span>Tienes archivos pendientes de una sesión anterior.</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearFiles}
                      disabled={isClearing}
                      className="ml-2 text-xs h-7 px-2"
                    >
                      {isClearing ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Limpiar y empezar nuevo
                    </Button>
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
                  
                  <ScrollArea className="h-[150px] rounded-md border">
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

            {/* LLM Model Selector - OUTSIDE scroll area, always visible when files selected */}
            {pendingFiles.length > 0 && (
              <div className="px-6 pb-3 pt-2 border-t bg-background">
                <LLMSelector value={selectedLLM} onChange={setSelectedLLM} />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6">
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
        ) : step === 'uploading' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                Subiendo Documentos
              </DialogTitle>
              <DialogDescription>
                1 documento a la vez con reintentos automáticos (hasta {MAX_RETRIES} intentos)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6 px-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progreso de subida</span>
                  <span className="text-muted-foreground">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
                
                <Progress 
                  value={(uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100} 
                  className="h-2"
                />
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {uploadProgress.completed} completados
                    </span>
                    {uploadProgress.failed > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3.5 w-3.5" />
                        {uploadProgress.failed} fallidos
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Current file with retry indicator */}
                {uploadProgress.currentFileName && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
                    {uploadProgress.retrying ? (
                      <RotateCcw className="h-4 w-4 animate-spin text-yellow-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    <span className="text-sm truncate flex-1">
                      {uploadProgress.currentFileName}
                      {uploadProgress.retrying && uploadProgress.currentAttempt && (
                        <span className="text-yellow-600 ml-2">
                          (intento {uploadProgress.currentAttempt}/{uploadProgress.maxAttempts})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Failed files list */}
              {uploadProgress.failedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Documentos fallidos ({uploadProgress.failedFiles.length}):
                  </p>
                  <ScrollArea className="h-24 rounded-md border border-destructive/30">
                    <div className="p-2 space-y-1">
                      {uploadProgress.failedFiles.map((f, i) => (
                        <div key={i} className="text-xs text-destructive flex items-start gap-1">
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{f.name}: {f.error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetryFailed}
                    disabled={isRetryingFailed}
                    className="w-full"
                  >
                    {isRetryingFailed ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reintentar {uploadProgress.failedFiles.length} fallidos
                  </Button>
                </div>
              )}

              <Alert className="border-muted bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Procesando 1 documento a la vez. Reintentos automáticos con backoff (5s, 15s, 45s).
                  Timeout: 5 minutos por documento. No cierres esta ventana.
                </AlertDescription>
              </Alert>

              {/* Continue button when some succeeded */}
              {uploadProgress.completed > 0 && uploadProgress.current >= uploadProgress.total && (
                <Button 
                  onClick={async () => {
                    if (currentJobId) {
                      await supabase
                        .from('case_study_jobs')
                        .update({ 
                          current_phase: 'extracting',
                          progress_percentage: 10,
                        })
                        .eq('id', currentJobId);
                      setStep('processing');
                    }
                  }}
                  className="w-full"
                >
                  Continuar con {uploadProgress.completed} documentos subidos
                </Button>
              )}

              {/* Close button when ALL uploads failed */}
              {uploadProgress.completed === 0 && uploadProgress.current >= uploadProgress.total && uploadProgress.failed > 0 && (
                <Button 
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  Cerrar
                </Button>
              )}
            </div>
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
