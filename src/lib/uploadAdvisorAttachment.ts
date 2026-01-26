import { externalSupabase } from '@/integrations/supabase/externalClient';

const BUCKET_NAME = 'advisor-attachments';

export type UploadProgressCallback = (progress: {
  completedCount: number;
  totalCount: number;
  currentFile: string;
  progress: number; // 0-100
}) => void;

/**
 * Uploads a file to Supabase Storage and returns the public URL
 */
export async function uploadAdvisorAttachment(
  file: File,
  userId: string
): Promise<string> {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${timestamp}-${sanitizedName}`;

  const { data, error } = await externalSupabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Error al subir archivo: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = externalSupabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Uploads multiple files with progress tracking and returns array of URLs with metadata
 */
export async function uploadMultipleAttachments(
  files: Array<{ id: string; file: File; name: string; type: string }>,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<Array<{ id: string; url: string; name: string; type: string }>> {
  const results: Array<{ id: string; url: string; name: string; type: string }> = [];
  const totalCount = files.length;

  for (let i = 0; i < files.length; i++) {
    const { id, file, name, type } = files[i];
    
    // Report progress before starting upload
    onProgress?.({
      completedCount: i,
      totalCount,
      currentFile: name,
      progress: Math.round((i / totalCount) * 100),
    });

    const url = await uploadAdvisorAttachment(file, userId);
    results.push({ id, url, name, type });

    // Report progress after completing upload
    onProgress?.({
      completedCount: i + 1,
      totalCount,
      currentFile: name,
      progress: Math.round(((i + 1) / totalCount) * 100),
    });
  }

  return results;
}
