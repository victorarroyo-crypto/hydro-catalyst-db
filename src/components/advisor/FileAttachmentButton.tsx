import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AttachmentInfo } from '@/types/advisorChat';

export type UploadStatus = 'idle' | 'uploading' | 'complete' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  currentFile?: string;
  completedCount: number;
  totalCount: number;
}

interface FileAttachmentButtonProps {
  attachments: AttachmentInfo[];
  onAttach: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  uploadProgress?: UploadProgress;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileAttachmentButton({
  attachments,
  onAttach,
  onRemove,
  disabled = false,
  uploadProgress,
}: FileAttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      onAttach(validFiles);
    }
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-3 h-3" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isUploading = uploadProgress?.status === 'uploading';
  const isComplete = uploadProgress?.status === 'complete';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={disabled || isUploading}
          title="Adjuntar análisis de agua (PDF, Excel o imagen)"
          className="h-10 w-10"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </Button>

        {/* Attached files preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  'bg-muted border border-border/50',
                  isComplete && 'border-primary/50 bg-primary/10'
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                ) : (
                  getFileIcon(file.type)
                )}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <span className="text-muted-foreground">({formatSize(file.size)})</span>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => onRemove(file.id)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {isUploading && uploadProgress && (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1">
            <Progress value={uploadProgress.progress} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {uploadProgress.completedCount}/{uploadProgress.totalCount} archivos
          </span>
        </div>
      )}
    </div>
  );
}
