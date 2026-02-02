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
import { Loader2, FileText, ExternalLink, FileCheck, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectDocument } from '@/services/costConsultingApi';
import { openDocumentUrl } from '@/utils/storageUrlHelper';

interface DocumentReclassifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ProjectDocument | null;
  projectId: string;
  onReclassified: () => void;
}

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

export const DocumentReclassifyModal: React.FC<DocumentReclassifyModalProps> = ({
  open,
  onOpenChange,
  document,
  projectId,
  onReclassified,
}) => {
  const [isReclassifying, setIsReclassifying] = useState<'contract' | 'invoice' | null>(null);

  const handleReclassify = async (targetType: 'contract' | 'invoice') => {
    if (!document) return;

    setIsReclassifying(targetType);
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${document.id}/reclassify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: targetType }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error al reclasificar' }));
        throw new Error(error.detail || 'Error al reclasificar el documento');
      }

      const result = await response.json();
      const typeLabel = targetType === 'contract' ? 'contrato' : 'factura';
      toast.success(`Documento reclasificado como ${typeLabel}`);
      
      onReclassified();
      onOpenChange(false);
    } catch (error) {
      console.error('Error reclassifying document:', error);
      toast.error(error instanceof Error ? error.message : 'Error al reclasificar el documento');
    } finally {
      setIsReclassifying(null);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reclasificar Documento
          </DialogTitle>
          <DialogDescription>
            Este documento fue procesado pero no generó contratos ni facturas. 
            Puedes reclasificarlo manualmente para forzar la extracción.
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
                {document.extraction_error && (
                  <p className="text-xs text-destructive mt-2">
                    Error: {document.extraction_error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* View PDF button */}
          {document.file_url && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleViewPdf}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver PDF Original
            </Button>
          )}

          {/* Reclassify options */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Reclasificar como:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => handleReclassify('contract')}
                disabled={isReclassifying !== null}
              >
                {isReclassifying === 'contract' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <FileCheck className="h-6 w-6 text-blue-600" />
                )}
                <span className="font-medium">Contrato</span>
                <span className="text-xs text-muted-foreground">
                  Extraer como contrato
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={() => handleReclassify('invoice')}
                disabled={isReclassifying !== null}
              >
                {isReclassifying === 'invoice' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <FilePlus2 className="h-6 w-6 text-green-600" />
                )}
                <span className="font-medium">Factura</span>
                <span className="text-xs text-muted-foreground">
                  Extraer como factura
                </span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
