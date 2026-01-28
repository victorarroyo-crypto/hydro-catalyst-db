import React from 'react';
import { X, FileText, Image, FileSpreadsheet, Loader2, CheckCircle2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AttachmentInfo } from '@/types/advisorChat';
import type { UploadProgress } from './FileAttachmentButton';

interface AttachmentsSidebarProps {
  attachments: AttachmentInfo[];
  onRemove: (id: string) => void;
  uploadProgress?: UploadProgress;
  isVisible: boolean;
}

const getFileIcon = (type: string) => {
  if (type.includes('image')) return <Image className="w-4 h-4" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentsSidebar({
  attachments,
  onRemove,
  uploadProgress,
  isVisible,
}: AttachmentsSidebarProps) {
  const isUploading = uploadProgress?.status === 'uploading';
  const isComplete = uploadProgress?.status === 'complete';

  if (!isVisible) return null;

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b bg-background/50">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Paperclip className="w-4 h-4" />
          <span>Documentos adjuntos</span>
          {attachments.length > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && uploadProgress && (
        <div className="p-3 border-b bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-primary">Subiendo...</span>
          </div>
          <Progress value={uploadProgress.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {uploadProgress.completedCount}/{uploadProgress.totalCount} archivos
          </p>
        </div>
      )}

      {/* Files list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {attachments.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                Adjunta documentos para analizarlos con tu consulta
              </p>
            </div>
          ) : (
            attachments.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'group flex items-start gap-2 p-2.5 rounded-lg transition-colors',
                  'bg-background hover:bg-muted/50 border border-border/50',
                  isComplete && 'border-primary/30 bg-primary/5'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-md shrink-0',
                  isComplete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => onRemove(file.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Hint */}
      {attachments.length > 0 && !isUploading && (
        <div className="p-3 border-t bg-background/50">
          <p className="text-xs text-muted-foreground text-center">
            Los documentos se enviarán con tu próxima consulta
          </p>
        </div>
      )}
    </div>
  );
}
