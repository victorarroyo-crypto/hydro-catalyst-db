import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      const err = error as Error;
      lastError = err;
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      
      // Don't retry on abort (timeout)
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after 30 seconds`);
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse FormData from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string;
    const projectId = formData.get('project_id') as string;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing file or project_id' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Uploading file: ${file.name} (${file.size} bytes) for project: ${projectId}`);

    // 3. Upload to Supabase Storage - use consistent path (no timestamp) to enable overwrite
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // Use consistent path: projectId/filename (no timestamp) so same file overwrites
    const storagePath = `${projectId}/${sanitizedFilename}`;
    
    // Read file content as ArrayBuffer for storage upload
    const fileArrayBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileArrayBuffer);
    
    // First, delete any existing file at this path to avoid duplicates
    console.log(`Checking for existing file at: ${storagePath}`);
    const { error: deleteError } = await supabase.storage
      .from('cost-documents')
      .remove([storagePath]);
    
    if (deleteError) {
      // 404/not found errors are expected for new files - only log actual errors
      if (!deleteError.message?.includes('Not Found') && !deleteError.message?.includes('Object not found')) {
        console.warn('Warning deleting existing file (continuing anyway):', deleteError.message);
      }
    } else {
      console.log('Deleted existing file before re-upload');
    }
    
    // Now upload the new file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cost-documents')
      .upload(storagePath, fileContent, {
        contentType: file.type || 'application/pdf',
        upsert: true, // Also enable upsert as fallback
      });

    let fileUrl: string | null = null;
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Try to get URL anyway in case file exists
      const { data: urlData } = supabase.storage
        .from('cost-documents')
        .getPublicUrl(storagePath);
      if (urlData?.publicUrl) {
        fileUrl = urlData.publicUrl;
        console.log('Using existing Storage URL:', fileUrl);
      }
    } else if (uploadData?.path) {
      const { data: urlData } = supabase.storage
        .from('cost-documents')
        .getPublicUrl(uploadData.path);
      fileUrl = urlData.publicUrl;
      console.log('File uploaded to Storage:', fileUrl);
    }

    // 4. Forward to Railway backend with retry logic
    const railwayUrl = Deno.env.get('RAILWAY_API_URL');
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!railwayUrl) {
      console.error('RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Backend not configured' }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build FormData for Railway - need to recreate File from ArrayBuffer
    const railwayFormData = new FormData();
    const fileBlob = new Blob([fileContent], { type: file.type || 'application/pdf' });
    railwayFormData.append('file', fileBlob, file.name);
    railwayFormData.append('file_type', fileType || 'otro');
    
    // Include the storage URL for Railway to save
    if (fileUrl) {
      railwayFormData.append('file_url', fileUrl);
    }

    const railwayHeaders: Record<string, string> = {
      'X-User-Id': userData.user.id,
    };
    
    if (syncSecret) {
      railwayHeaders['X-Sync-Secret'] = syncSecret;
    }

    const targetUrl = `${railwayUrl}/api/cost-consulting/projects/${projectId}/documents`;
    console.log(`Sending to Railway: ${targetUrl}`);

    try {
      const response = await fetchWithRetry(
        targetUrl,
        {
          method: 'POST',
          headers: railwayHeaders,
          body: railwayFormData,
        },
        3, // max retries
        1000 // base delay 1s
      );

      const responseText = await response.text();
      console.log(`Railway response (${response.status}):`, responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      // Handle 409 (duplicate) as success - document already exists and is ready to process
      if (response.status === 409) {
        console.log('Document already exists in Railway, treating as success');
        return new Response(JSON.stringify({
          success: true,
          status: 200,
          file_url: fileUrl,
          already_exists: true,
          message: 'Documento ya registrado previamente',
          ...responseData,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Always return 200 to avoid FunctionsHttpError - include success/error in body
      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        file_url: fileUrl,
        ...responseData,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (networkError) {
      // Network error after all retries failed
      console.error('Network error after retries:', networkError);
      
      // Return partial success - file was uploaded to storage even if Railway failed
      return new Response(JSON.stringify({
        success: false,
        status: 503,
        file_url: fileUrl,
        error: 'El servidor de procesamiento no está disponible. El archivo se guardó pero no se pudo procesar.',
        network_error: networkError instanceof Error ? networkError.message : 'Connection failed',
        retry_suggestion: true,
      }), {
        status: 200, // Return 200 to avoid FunctionsHttpError
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Upload proxy error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
