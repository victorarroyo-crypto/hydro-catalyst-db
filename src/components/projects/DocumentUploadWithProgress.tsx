import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, Layers } from 'lucide-react';
import { DocumentProcessingProgress } from './DocumentProcessingProgress';
import { DocumentPartsAccordion } from './DocumentPartsAccordion';
import { useDocumentProcessingStatus } from '@/services/documentProcessingService';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';
import type { ProjectDocumentWithParts } from '@/types/documentProcessing';

const DOCUMENT_TYPES = [
  { value: 'pid', label: 'P&ID / Diagrama de proceso' },
  { value: 'analytics', label: 'Análisis de agua' },
  { value: 'datasheet', label: 'Ficha técnica' },
  { value: 'permit', label: 'Permiso / Autorización' },
  { value: 'invoice', label: 'Factura' },
  { value: 'report', label: 'Informe técnico' },
  { value: 'manual', label: 'Manual de operación' },
  { value: 'other', label: 'Otro' },
];

// Aumentar límite a 50MB para permitir archivos grandes
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface DocumentUploadWithProgressProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function DocumentUploadWithProgress({
  projectId,
  onUploadComplete
}: DocumentUploadWithProgressProps) {
  const [documentType, setDocumentType] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [showLargeFileInfo, setShowLargeFileInfo] = useState(false);

  // Polling del estado de procesamiento
  const { status: processingStatus } = useDocumentProcessingStatus(
    projectId,
    uploadedDocId,
    !!uploadedDocId
  );

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setUploadedDocId(null);

    // Mostrar info si el archivo es grande
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      setShowLargeFileInfo(true);
      toast.info(`Archivo grande (${fileSizeMB.toFixed(1)}MB) - se dividirá en partes`);
    } else {
      setShowLargeFileInfo(false);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Error al subir documento');
      }

      const result = await response.json();

      if (result.success !== false && (result.document?.id || result.id)) {
        const docId = result.document?.id || result.id;
        setUploadedDocId(docId);
        toast.success('Documento recibido, procesando...');
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir');
      setUploadedDocId(null);
    } finally {
      setUploading(false);
    }
  }, [projectId, documentType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.jpg', '.jpeg', '.png'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  const handleReset = () => {
    setUploadedDocId(null);
    setShowLargeFileInfo(false);
    onUploadComplete?.();
  };

  // Si está procesando un documento con partes
  if (processingStatus?.is_split_document && processingStatus.parts && processingStatus.parts.length > 0) {
    const isComplete = processingStatus.status === 'completed' || 
      processingStatus.parts_completed === processingStatus.total_parts;

    const docData: ProjectDocumentWithParts = {
      id: processingStatus.document_id,
      project_id: projectId,
      filename: processingStatus.filename,
      document_type: documentType,
      processing_status: processingStatus.status,
      chunk_count: processingStatus.chunks_created,
      file_size: 0,
      created_at: processingStatus.created_at,
      is_split_document: true,
      total_parts: processingStatus.total_parts,
    };

    return (
      <div className="space-y-4">
        <DocumentPartsAccordion
          document={docData}
          parts={processingStatus.parts}
          totalChunks={processingStatus.chunks_created}
        />
        {isComplete && (
          <Button variant="outline" onClick={handleReset} className="w-full">
            Subir otro documento
          </Button>
        )}
      </div>
    );
  }

  // Si está procesando un documento normal (sin partes)
  if (processingStatus && processingStatus.status !== 'completed' && processingStatus.status !== 'failed') {
    return <DocumentProcessingProgress status={processingStatus} />;
  }

  // Si completó, mostrar mensaje y opción de subir otro
  if (processingStatus?.status === 'completed') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          <div>
            <h4 className="font-medium text-primary">
              Documento procesado correctamente
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {processingStatus.chunks_created} chunks • {processingStatus.embeddings_generated} embeddings
              {processingStatus.entities_count > 0 && ` • ${processingStatus.entities_count} entidades`}
            </p>
          </div>
          <Button variant="outline" onClick={handleReset}>
            Subir otro documento
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Si falló, mostrar error
  if (processingStatus?.status === 'failed') {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-destructive">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <div>
            <h4 className="font-medium text-destructive">Error al procesar documento</h4>
            {processingStatus.error && (
              <p className="text-sm text-muted-foreground mt-1">
                {processingStatus.error}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleReset}>
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mostrar dropzone
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {showLargeFileInfo && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Los archivos mayores a 10MB se dividen automáticamente en partes
              para un procesamiento más eficiente.
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de tipo */}
        <div className="space-y-2">
          <Label htmlFor="doc-type">Tipo de documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="doc-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive 
              ? 'border-primary bg-accent' 
              : 'border-border hover:border-primary/50 hover:bg-muted'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Subiendo documento...</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-primary" />
              <p className="text-primary font-medium">Suelta el archivo aquí...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Arrastra un archivo o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                PDF, DOCX, XLSX, JPG, PNG (máx. 50MB)
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1 flex items-center justify-center gap-1">
                <Layers className="h-3 w-3" />
                Los PDFs grandes se dividen automáticamente en partes
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
