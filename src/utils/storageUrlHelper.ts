/**
 * Converts storage:// URLs to public Supabase Storage URLs
 * 
 * Railway backend returns URLs like:
 *   storage://documents/cost-consulting/{projectId}/{filename}
 * 
 * We need to convert to:
 *   https://{supabaseProjectId}.supabase.co/storage/v1/object/public/cost-documents/{projectId}/{filename}
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bdmpshiqspkxcisnnlyr.supabase.co';

export const convertStorageUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  
  // If it's already a valid HTTP(S) URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Handle storage:// protocol from Railway backend
  if (url.startsWith('storage://')) {
    const path = url.replace('storage://', '');
    
    // Cost consulting documents (public bucket)
    let bucketPath: string;
    
    if (path.startsWith('documents/cost-consulting/')) {
      bucketPath = path.replace('documents/cost-consulting/', '');
    } else if (path.startsWith('cost-documents/')) {
      bucketPath = path.replace('cost-documents/', '');
    } else {
      bucketPath = path;
    }
    
    return `${SUPABASE_URL}/storage/v1/object/public/cost-documents/${bucketPath}`;
  }
  
  // Unknown format, return as-is (might work, might not)
  console.warn('Unknown storage URL format:', url);
  return url;
};

/**
 * Extracts the file path within the chem-documents bucket from a storage:// URL.
 * Returns null if the URL is not a chem-documents storage URL.
 */
export const extractChemDocumentPath = (url: string | undefined | null): string | null => {
  if (!url) return null;
  
  if (url.startsWith('storage://')) {
    const path = url.replace('storage://', '');
    if (path.startsWith('chem-documents/')) {
      return path.replace('chem-documents/', '');
    }
  }
  
  return null;
};

/**
 * Opens a document URL in a new tab, converting storage:// URLs if needed
 */
export const openDocumentUrl = (url: string | undefined | null): boolean => {
  const publicUrl = convertStorageUrl(url);
  
  if (!publicUrl) {
    console.error('No valid URL to open');
    return false;
  }
  
  window.open(publicUrl, '_blank');
  return true;
};
