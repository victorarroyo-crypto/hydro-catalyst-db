import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDocumentsStatus, reprocessDocument, DocumentStatus } from '@/services/costConsultingApi';

interface FailedDocumentsAlertProps {
  projectId: string;
  onDocumentReprocessed: () => void;
  onAddManual?: (type: 'contract' | 'invoice') => void;
}

export const FailedDocumentsAlert = ({
  projectId,
  onDocumentReprocessed,
  onAddManual,
}: FailedDocumentsAlertProps) => {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const data = await getDocumentsStatus(projectId);
      setStatus(data);
    } catch (error) {
      console.error('Error fetching document status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [projectId]);

  const handleReprocess = async (documentId: string) => {
    setReprocessingId(documentId);
    try {
      await reprocessDocument(projectId, documentId);
      toast.info('Reprocesando documento...');
      onDocumentReprocessed();
      // Refresh status after a delay
      setTimeout(fetchStatus, 2000);
    } catch (error) {
      toast.error('Error al reprocesar el documento');
    } finally {
      setReprocessingId(null);
    }
  };

  if (isLoading) return null;
  if (!status || status.failed === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {status.failed} documento(s) no se pudieron procesar
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Puedes reintentar el procesamiento o introducir los datos manualmente.
        </p>

        <ul className="space-y-2 mb-4">
          {status.failed_documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between bg-background/50 p-3 rounded-lg"
            >
              <div>
                <span className="font-medium">{doc.filename}</span>
                {doc.error && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({doc.error})
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReprocess(doc.id)}
                disabled={reprocessingId === doc.id}
              >
                {reprocessingId === doc.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Reintentar
              </Button>
            </li>
          ))}
        </ul>

        {onAddManual && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground mr-2 self-center">
              Añadir manualmente:
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAddManual('contract')}
            >
              <Plus className="h-3 w-3 mr-1" /> Contrato
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAddManual('invoice')}
            >
              <Plus className="h-3 w-3 mr-1" /> Factura
            </Button>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: Si el documento no se puede leer correctamente (escaneado, imagen, formato inusual), 
          usa la opción de añadir datos manualmente.
        </p>
      </AlertDescription>
    </Alert>
  );
};
