import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, ExternalLink, FileCheck, FilePlus2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getDocumentById, ProjectDocument } from '@/services/costConsultingApi';
import { openDocumentUrl } from '@/utils/storageUrlHelper';

interface DocumentReclassifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ProjectDocument | null;
  projectId: string;
  userId: string;
  onReclassified: () => void;
}

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

type ProcessingState = 'idle' | 'reclassifying' | 'extracting' | 'done' | 'error';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DocumentReclassifyModal: React.FC<DocumentReclassifyModalProps> = ({
  open,
  onOpenChange,
  document,
  projectId,
  userId,
  onReclassified,
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [targetType, setTargetType] = useState<'contract' | 'invoice' | null>(null);
  const [progress, setProgress] = useState(0);

  const handleReclassify = async (type: 'contract' | 'invoice') => {
    if (!document) return;

    setTargetType(type);
    setProcessingState('reclassifying');
    setProgress(5);

    const typeLabel = type === 'contract' ? 'contrato' : 'factura';

    try {
      // Phase 1: Call reclassify endpoint (requires user_id query param)
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${document.id}/reclassify?user_id=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: type }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error al reclasificar' }));
        throw new Error(error.detail || 'Error al reclasificar el documento');
      }

      // Phase 2: Polling until extraction completes
      setProcessingState('extracting');
      setProgress(15);
      toast.info(`Extrayendo datos como ${typeLabel}...`);

      const maxAttempts = 40; // 40 * 1.5s = 60 seconds max
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(1500);
        
        // Update progress (15% to 90%)
        setProgress(15 + Math.min(75, (i / maxAttempts) * 75));

        try {
          const doc = await getDocumentById(projectId, document.id);

          if (doc.extraction_status === 'completed') {
            setProgress(100);
            setProcessingState('done');
            toast.success(`Datos extraídos correctamente como ${typeLabel}`);
            
            // Brief delay to show completion state
            await sleep(500);
            
            onReclassified();
            onOpenChange(false);
            resetState();
            return;
          }

          if (doc.extraction_status === 'failed') {
            setProcessingState('error');
            toast.error(`Error: ${doc.extraction_error || 'Extracción fallida'}`);
            return;
          }
        } catch (pollError) {
          console.warn('Polling error:', pollError);
          // Continue polling on transient errors
        }
      }

      // Timeout reached
      toast.warning('La extracción está tardando más de lo esperado. Revisa la lista de documentos.');
      setProcessingState('idle');
      setProgress(0);
      
    } catch (error) {
      console.error('Error reclassifying document:', error);
      toast.error(error instanceof Error ? error.message : 'Error al reclasificar el documento');
      setProcessingState('error');
    }
  };

  const resetState = () => {
    setProcessingState('idle');
    setTargetType(null);
    setProgress(0);
  };

  const handleClose = () => {
    if (processingState === 'reclassifying' || processingState === 'extracting') {
      // Allow closing but warn that process continues
      toast.info('El proceso de extracción continuará en segundo plano');
    }
    onOpenChange(false);
    resetState();
  };

  const handleViewPdf = () => {
    if (document?.file_url) {
      openDocumentUrl(document.file_url);
    }
  };

  if (!document) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = processingState === 'reclassifying' || processingState === 'extracting';
  const typeLabel = targetType === 'contract' ? 'contrato' : 'factura';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reclasificar Documento
          </DialogTitle>
          <DialogDescription>
            {isProcessing 
              ? 'Extrayendo datos del documento...'
              : 'Este documento fue procesado pero no generó contratos ni facturas. Puedes reclasificarlo manualmente para forzar la extracción.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document info */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-start gap-3">
              <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" title={document.filename}>
                  {document.filename}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{formatFileSize(document.file_size)}</span>
                  {document.file_type && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {document.file_type === 'contrato' ? 'Contrato' :
                         document.file_type === 'factura' ? 'Factura' :
                         document.file_type === 'otro' ? 'No clasificado' :
                         document.file_type}
                      </Badge>
                    </>
                  )}
                </div>
                {document.extraction_error && !isProcessing && (
                  <p className="text-xs text-destructive mt-2">
                    Error: {document.extraction_error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Processing state UI */}
          {isProcessing && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {processingState === 'reclassifying' 
                      ? 'Iniciando reclasificación...'
                      : `Extrayendo datos como ${typeLabel}...`
                    }
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Esto puede tardar unos segundos
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Done state */}
          {processingState === 'done' && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    ¡Extracción completada!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Los datos han sido extraídos correctamente
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {processingState === 'error' && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    Error en la extracción
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Puedes intentar de nuevo o revisar el documento
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* View PDF button - only when not processing */}
          {!isProcessing && document.file_url && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleViewPdf}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver PDF Original
            </Button>
          )}

          {/* Reclassify options - only when idle or error */}
          {(processingState === 'idle' || processingState === 'error') && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Reclasificar como:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  onClick={() => handleReclassify('contract')}
                >
                  <FileCheck className="h-6 w-6 text-blue-600" />
                  <span className="font-medium">Contrato</span>
                  <span className="text-xs text-muted-foreground">
                    Extraer como contrato
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={() => handleReclassify('invoice')}
                >
                  <FilePlus2 className="h-6 w-6 text-green-600" />
                  <span className="font-medium">Factura</span>
                  <span className="text-xs text-muted-foreground">
                    Extraer como factura
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {isProcessing ? 'Cerrar' : 'Cancelar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
