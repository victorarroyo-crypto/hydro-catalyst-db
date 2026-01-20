import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2,
  File,
  FileSpreadsheet,
  FileImage,
  FilePieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { API_URL } from '@/lib/api';

interface Document {
  id: string;
  filename: string;
  document_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  file_size?: number;
  mime_type?: string;
}

interface DocumentsTabProps {
  projectId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-gray-500 hover:bg-gray-600' },
  processing: { label: 'Procesando', className: 'bg-yellow-500 hover:bg-yellow-600' },
  completed: { label: 'Completado', className: 'bg-green-500 hover:bg-green-600' },
  failed: { label: 'Error', className: 'bg-red-500 hover:bg-red-600' },
};

const documentTypes = [
  { value: 'pid', label: 'P&ID (Diagrama de Proceso e Instrumentación)' },
  { value: 'analytics', label: 'Analíticas (Resultados de laboratorio)' },
  { value: 'datasheet', label: 'Datasheet (Fichas técnicas de equipos)' },
  { value: 'invoice', label: 'Factura (Facturas de agua, químicos, energía)' },
  { value: 'report', label: 'Informe (Informes previos, auditorías)' },
  { value: 'other', label: 'Otro' },
];

const documentTypeLabels: Record<string, string> = {
  pid: 'P&ID',
  analytics: 'Analíticas',
  datasheet: 'Datasheet',
  invoice: 'Factura',
  report: 'Informe',
  water_analysis: 'Análisis de agua',
  consumption_report: 'Informe de consumo',
  technical_spec: 'Especificación técnica',
  other: 'Otro',
};

const getFileIcon = (filename: string, mimeType?: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return FileImage;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return FileSpreadsheet;
  }
  if (['pdf'].includes(ext || '')) {
    return FilePieChart;
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return FileText;
  }
  return File;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ projectId }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('other');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/documents`);
      if (!response.ok) throw new Error('Error al cargar documentos');
      const data = await response.json();
      return {
        documents: data.documents || data.data || (Array.isArray(data) ? data : []) as Document[],
        count: data.count || data.documents?.length || 0
      };
    },
    enabled: !!projectId,
  });

  const documents = data?.documents || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setSelectedDocType('other');
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;

    setIsUploading(true);
    setShowUploadModal(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', selectedDocType);

      const response = await fetch(`${API_URL}/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir documento');

      toast({
        title: 'Documento subido',
        description: `${selectedFile.name} se ha subido correctamente`,
      });

      await refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir el documento',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string, filename: string) => {
    setDeletingId(documentId);

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar documento');

      toast({
        title: 'Documento eliminado',
        description: `${filename} se ha eliminado correctamente`,
      });

      await refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-40" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documentos del Proyecto</h3>
          <p className="text-sm text-muted-foreground">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} subido{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tip */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Los documentos se procesan automáticamente para extraer datos.
            Los agentes de IA usarán esta información en el análisis.
          </p>
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-2">No hay documentos</h4>
            <p className="text-muted-foreground mb-4">
              Sube documentos para que los agentes de IA puedan analizarlos
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.filename, doc.mime_type);
            const status = statusConfig[doc.processing_status] || statusConfig.pending;
            const typeLabel = documentTypeLabels[doc.document_type] || doc.document_type;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 text-muted-foreground">
                      <FileIcon className="h-8 w-8" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium truncate" title={doc.filename}>
                            {doc.filename}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {typeLabel}
                            </Badge>
                            <Badge className={`text-xs text-white ${status.className}`}>
                              {status.label}
                            </Badge>
                            {doc.file_size && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {formatDate(doc.created_at)}
                          </span>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={deletingId === doc.id}
                              >
                                {deletingId === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el documento "{doc.filename}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id, doc.filename)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de documento para "{selectedFile?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup value={selectedDocType} onValueChange={setSelectedDocType} className="space-y-3">
            {documentTypes.map((type) => (
              <div key={type.value} className="flex items-center space-x-3">
                <RadioGroupItem value={type.value} id={type.value} />
                <Label htmlFor={type.value} className="cursor-pointer">
                  {type.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
