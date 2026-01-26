import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';

export type UploadStatus = 'idle' | 'uploading' | 'complete' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  currentFile?: string;
  completedCount: number;
  totalCount: number;
}

interface FileAttachmentButtonProps {
  onAttach: (files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
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
  onAttach,
  disabled = false,
  isUploading = false,
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

  return (
    <>
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
        className="h-10 w-10 shrink-0"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </Button>
    </>
  );
}
