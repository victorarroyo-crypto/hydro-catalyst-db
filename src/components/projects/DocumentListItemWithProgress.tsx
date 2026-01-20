import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  FileText,
  FileSpreadsheet,
  FileImage,
  FilePieChart,
  File,
  Trash2,
  Loader2,
  Scissors,
  Brain
} from 'lucide-react';
import { useDocumentProcessingStatus, isActiveProcessing } from '@/services/documentProcessingService';
import { PROCESSING_STAGES } from '@/types/documentProcessing';
import type { DocumentProcessingStatus } from '@/types/documentProcessing';

interface ProjectDocument {
  id: string;
  filename: string;
  document_type: string;
  processing_status: string;
  created_at: string;
  file_size?: number;
  mime_type?: string;
  chunk_count?: number;
  entities_count?: number;
  processing_error?: string;
}

interface DocumentListItemWithProgressProps {
  document: ProjectDocument;
  projectId: string;
  onDelete: (id: string, filename: string) => void;
  isDeleting: boolean;
}

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

const documentTypeLabels: Record<string, string> = {
  pid: 'P&ID',
  analytics: 'Analíticas',
  datasheet: 'Datasheet',
  invoice: 'Factura',
  report: 'Informe',
  permit: 'Permiso',
  manual: 'Manual',
  other: 'Otro',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chunking: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  embedding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  extracting_entities: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function DocumentListItemWithProgress({
  document,
  projectId,
  onDelete,
  isDeleting
}: DocumentListItemWithProgressProps) {
  const FileIcon = getFileIcon(document.filename, document.mime_type);
  
  // Polling solo si está procesando
  const processingStatuses = ['pending', 'processing', 'chunking', 'embedding', 'extracting_entities'];
  const shouldPoll = processingStatuses.includes(document.processing_status);

  const { status: liveStatus } = useDocumentProcessingStatus(
    projectId,
    document.id,
    shouldPoll
  );

  // Use live status if available, otherwise fall back to document data
  const currentStatus = (liveStatus?.stage || document.processing_status) as DocumentProcessingStatus;
  const stageInfo = PROCESSING_STAGES[currentStatus] || PROCESSING_STAGES.pending;
  const isProcessing = shouldPoll && liveStatus ? isActiveProcessing(liveStatus.stage) : shouldPoll;
  
  const progressValue = liveStatus?.progress || 
    (document.processing_status === 'completed' ? 100 : stageInfo.percentage);

  const chunksCount = liveStatus?.chunks_created || document.chunk_count || 0;
  const entitiesCount = liveStatus?.entities_count || document.entities_count || 0;

  const typeLabel = documentTypeLabels[document.document_type] || document.document_type;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 text-muted-foreground">
            <FileIcon className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium truncate" title={document.filename}>
                  {document.filename}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {typeLabel}
                  </Badge>
                  <Badge className={`text-xs ${STATUS_COLORS[currentStatus] || STATUS_COLORS.pending}`}>
                    {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {stageInfo.label}
                  </Badge>
                  {document.file_size && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(document.file_size)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {formatDate(document.created_at)}
                </span>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
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
                        Esta acción no se puede deshacer. Se eliminará permanentemente el documento "{document.filename}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(document.id, document.filename)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Progress bar for processing documents */}
            {isProcessing && (
              <div className="space-y-1">
                <Progress value={progressValue} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {stageInfo.description}
                </p>
              </div>
            )}

            {/* Metrics for completed documents */}
            {document.processing_status === 'completed' && (chunksCount > 0 || entitiesCount > 0) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {chunksCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Scissors className="h-3 w-3" />
                    {chunksCount} chunks
                  </span>
                )}
                {entitiesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {entitiesCount} entidades
                  </span>
                )}
              </div>
            )}

            {/* Error message */}
            {document.processing_status === 'failed' && document.processing_error && (
              <p className="text-xs text-destructive">
                {document.processing_error}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
