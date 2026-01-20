import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  Clock,
  Scissors,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { API_URL } from '@/lib/api';
import { DocumentListItemWithProgress } from '@/components/projects/DocumentListItemWithProgress';

interface Document {
  id: string;
  filename: string;
  document_type: string;
  processing_status: 'pending' | 'processing' | 'chunking' | 'embedding' | 'extracting_entities' | 'completed' | 'failed';
  created_at: string;
  file_size?: number;
  mime_type?: string;
  chunk_count?: number;
  entities_count?: number;
  processing_error?: string;
  // Split document fields
  is_split_document?: boolean;
  total_parts?: number | null;
  parent_document_id?: string | null;
  part_number?: number | null;
}

interface DocumentPart {
  id: string;
  filename: string;
  part_number: number;
  processing_status: string;
  chunk_count: number;
}

interface DocumentsTabProps {
  projectId: string;
}

const documentTypes = [
  { value: 'pid', label: 'P&ID (Diagrama de Proceso e Instrumentación)' },
  { value: 'analytics', label: 'Analíticas (Resultados de laboratorio)' },
  { value: 'datasheet', label: 'Datasheet (Fichas técnicas de equipos)' },
  { value: 'invoice', label: 'Factura (Facturas de agua, químicos, energía)' },
  { value: 'report', label: 'Informe (Informes previos, auditorías)' },
  { value: 'permit', label: 'Permiso / Autorización' },
  { value: 'manual', label: 'Manual de operación' },
  { value: 'other', label: 'Otro' },
];

// Component to render a split document with accordion
function SplitDocumentItem({
  document,
  allDocuments,
  onDelete,
  isDeleting,
}: {
  document: Document;
  allDocuments: Document[];
  onDelete: (id: string, filename: string) => void;
  isDeleting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter parts from allDocuments - they have parent_document_id matching this document's id
  const parts: DocumentPart[] = allDocuments
    .filter(doc => doc.parent_document_id === document.id)
    .map(doc => ({
      id: doc.id,
      filename: doc.filename,
      part_number: doc.part_number || 0,
      processing_status: doc.processing_status,
      chunk_count: doc.chunk_count || 0,
    }))
    .sort((a, b) => a.part_number - b.part_number);
  
  console.log('SplitDocumentItem - document.id:', document.id, 'parts found:', parts.length, parts);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
  };

  const partsCompleted = parts.filter(p => p.processing_status === 'completed').length;
  const totalParts = document.total_parts || parts.length;
  const allCompleted = partsCompleted === totalParts && totalParts > 0;

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 w-full text-left group">
              {/* Expand icon */}
              <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>

              {/* File icon */}
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />

              {/* Filename and info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate" title={document.filename}>
                  {document.filename}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {document.chunk_count || 0} chunks total
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {totalParts} partes
                </Badge>
                {parts.length > 0 && (
                  <Badge 
                    variant="outline" 
                    className={allCompleted 
                      ? 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800' 
                      : ''
                    }
                  >
                    {partsCompleted}/{totalParts} completadas
                  </Badge>
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Delete button - outside the trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(document.id, document.filename);
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>

          <CollapsibleContent>
            <div className="mt-4 pl-14 space-y-2">
              {parts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No se encontraron partes para este documento. (ID: {document.id})
                </p>
              ) : (
                parts.map((part) => (
                  <div 
                    key={part.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/50 font-mono text-xs">└</span>
                      <span className="text-sm">
                        Parte {part.part_number} de {totalParts}
                      </span>
                      {part.chunk_count > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Scissors className="h-3 w-3" />
                          {part.chunk_count} chunks
                        </span>
                      )}
                    </div>
                    <Badge 
                      variant={part.processing_status === 'completed' ? 'default' : 'secondary'}
                      className={part.processing_status === 'completed' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                        : ''
                      }
                    >
                      {part.processing_status === 'completed' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completado
                        </>
                      ) : part.processing_status === 'failed' ? (
                        'Error'
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Procesando...
                        </>
                      )}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

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
      const allDocs = data.documents || data.data || (Array.isArray(data) ? data : []) as Document[];
      
      // Separate parent documents from child parts
      const parentDocs = allDocs.filter((doc: Document) => !doc.parent_document_id);
      const childParts = allDocs.filter((doc: Document) => !!doc.parent_document_id);
      
      return {
        documents: parentDocs,
        allDocuments: allDocs,
        childParts: childParts,
        count: parentDocs.length
      };
    },
    enabled: !!projectId,
  });

  const documents = data?.documents || [];
  const allDocuments = data?.allDocuments || [];

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
      <Card className="bg-accent/50 border-accent">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-muted-foreground">
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
            // If this is a split document, render with accordion
            if (doc.is_split_document) {
              return (
                <SplitDocumentItem
                  key={doc.id}
                  document={doc}
                  allDocuments={allDocuments}
                  onDelete={handleDelete}
                  isDeleting={deletingId === doc.id}
                />
              );
            }

            // Regular document
            return (
              <DocumentListItemWithProgress
                key={doc.id}
                document={doc}
                projectId={projectId}
                onDelete={handleDelete}
                isDeleting={deletingId === doc.id}
              />
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
