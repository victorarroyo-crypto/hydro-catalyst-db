import React from 'react';
import { X, FileText, Image, FileSpreadsheet, Loader2, CheckCircle2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AttachmentInfo } from '@/types/advisorChat';
import type { UploadProgress } from './FileAttachmentButton';

interface AttachmentsSidebarProps {
  attachments: AttachmentInfo[];
  onRemove: (id: string) => void;
  uploadProgress?: UploadProgress;
  isVisible: boolean;
}

const getFileIcon = (type: string) => {
  if (type.includes('image')) return <Image className="w-3.5 h-3.5" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Truncate filename smartly: keep start and extension
const truncateName = (name: string, maxLen: number = 18) => {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, name.lastIndexOf('.') > 0 ? name.lastIndexOf('.') : name.length);
  const keep = maxLen - ext.length - 2;
  if (keep < 4) return name.slice(0, maxLen - 2) + '…';
  return base.slice(0, keep) + '…' + ext;
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
    <div className="w-52 border-r bg-muted/20 flex flex-col shrink-0">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b bg-background/80 flex items-center gap-2">
        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Adjuntos</span>
        <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
          {attachments.length}
        </span>
      </div>

      {/* Upload progress - compact */}
      {isUploading && uploadProgress && (
        <div className="px-3 py-2 border-b bg-primary/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-[10px] font-medium text-primary">
              {uploadProgress.completedCount}/{uploadProgress.totalCount}
            </span>
          </div>
          <Progress value={uploadProgress.progress} className="h-1" />
        </div>
      )}

      {/* Files list - compact cards */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-1">
          {attachments.length === 0 ? (
            <div className="text-center py-6 px-2">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-1.5" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Adjunta documentos para analizar
              </p>
            </div>
          ) : (
            attachments.map((file, idx) => (
              <Tooltip key={file.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-default',
                      'hover:bg-muted/60 border border-transparent',
                      isComplete && 'bg-primary/5 border-primary/20'
                    )}
                  >
                    {/* Number + Icon */}
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center shrink-0 text-[10px] font-medium',
                      isComplete ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : isUploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    
                    {/* Filename - truncated */}
                    <span className="flex-1 text-xs truncate leading-tight">
                      {truncateName(file.name)}
                    </span>
                    
                    {/* Size */}
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatSize(file.size)}
                    </span>
                    
                    {/* Remove button */}
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs break-all">{file.name}</p>
                </TooltipContent>
              </Tooltip>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
