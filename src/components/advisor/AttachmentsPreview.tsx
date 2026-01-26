import React from 'react';
import { X, FileText, Image, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AttachmentInfo } from '@/types/advisorChat';
import type { UploadProgress } from './FileAttachmentButton';

interface AttachmentsPreviewProps {
  attachments: AttachmentInfo[];
  onRemove: (id: string) => void;
  uploadProgress?: UploadProgress;
}

const getFileIcon = (type: string) => {
  if (type.includes('image')) return <Image className="w-3.5 h-3.5" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentsPreview({
  attachments,
  onRemove,
  uploadProgress,
}: AttachmentsPreviewProps) {
  const isUploading = uploadProgress?.status === 'uploading';
  const isComplete = uploadProgress?.status === 'complete';

  if (attachments.length === 0 && !isUploading) {
    return null;
  }

  return (
    <div className="mb-3 p-3 rounded-xl bg-muted/50 border border-border/50">
      {/* File badges */}
      <div className="flex flex-wrap gap-2">
        {attachments.map((file) => (
          <div
            key={file.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
              'bg-background border shadow-sm',
              isComplete && 'border-primary/50 bg-primary/5'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            ) : isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : (
              getFileIcon(file.type)
            )}
            <span className="max-w-[150px] truncate font-medium">{file.name}</span>
            <span className="text-muted-foreground text-xs">({formatSize(file.size)})</span>
            {!isUploading && (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Upload progress bar */}
      {isUploading && uploadProgress && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          <div className="flex-1">
            <Progress value={uploadProgress.progress} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
            {uploadProgress.completedCount}/{uploadProgress.totalCount} archivos
          </span>
        </div>
      )}
    </div>
  );
}
