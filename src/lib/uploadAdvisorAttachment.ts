import { externalSupabase } from '@/integrations/supabase/externalClient';

const BUCKET_NAME = 'advisor-attachments';

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
 * Uploads multiple files and returns array of URLs with metadata
 */
export async function uploadMultipleAttachments(
  files: Array<{ id: string; file: File; name: string; type: string }>,
  userId: string
): Promise<Array<{ id: string; url: string; name: string; type: string }>> {
  const results = await Promise.all(
    files.map(async ({ id, file, name, type }) => {
      const url = await uploadAdvisorAttachment(file, userId);
      return { id, url, name, type };
    })
  );
  return results;
}
