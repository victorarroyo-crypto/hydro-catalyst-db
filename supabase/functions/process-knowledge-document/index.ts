import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF text extraction using pdf-parse compatible approach
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  // Use a simple regex-based extraction for PDF text content
  // This is a basic implementation - for production, consider using a proper PDF library
  const uint8Array = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
  
  // Extract text between stream and endstream markers
  const textContent: string[] = [];
  
  // Try to find readable text patterns in the PDF
  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    for (const match of matches) {
      const content = match.slice(1, -1);
      // Filter out binary/encoded content
      if (content.length > 2 && /^[\x20-\x7E\xA0-\xFF\s]+$/.test(content)) {
        textContent.push(content);
      }
    }
  }
  
  // Also try BT/ET text blocks
  const btMatches = text.match(/BT[\s\S]*?ET/g);
  if (btMatches) {
    for (const block of btMatches) {
      const tjMatches = block.match(/\[([^\]]+)\]\s*TJ|\(([^)]+)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const extracted = tj.replace(/\[|\]|TJ|Tj|\(|\)/g, ' ').trim();
          if (extracted.length > 2) {
            textContent.push(extracted);
          }
        }
      }
    }
  }
  
  return textContent.join(' ').replace(/\s+/g, ' ').trim();
}

// Chunk text into smaller pieces for better retrieval
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap from the end of the current chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 50); // Filter out very small chunks
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    console.log('Processing document:', documentId);

    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found: ' + docError?.message);
    }

    // Update status to processing
    await supabase
      .from('knowledge_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Download the PDF from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('knowledge-docs')
      .download(document.file_path);

    if (fileError || !fileData) {
      throw new Error('Failed to download file: ' + fileError?.message);
    }

    console.log('File downloaded, size:', fileData.size);

    // Extract text from PDF
    const pdfBuffer = await fileData.arrayBuffer();
    let extractedText = await extractTextFromPDF(pdfBuffer);
    
    // If basic extraction fails, try alternative method
    if (extractedText.length < 100) {
      console.log('Basic extraction yielded little text, using fallback');
      // Fallback: just get any readable ASCII text
      const uint8Array = new Uint8Array(pdfBuffer);
      const rawText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      const readableChars = rawText.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');
      extractedText = readableChars.replace(/\s+/g, ' ').trim();
    }

    console.log('Extracted text length:', extractedText.length);

    if (extractedText.length < 50) {
      // Update status to error
      await supabase
        .from('knowledge_documents')
        .update({ status: 'error' })
        .eq('id', documentId);
      
      throw new Error('Could not extract sufficient text from PDF. The document may be image-based or encrypted.');
    }

    // Chunk the text
    const chunks = chunkText(extractedText);
    console.log('Created chunks:', chunks.length);

    // Delete existing chunks for this document
    await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('document_id', documentId);

    // Insert new chunks
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      content,
      chunk_index: index,
      tokens: Math.ceil(content.length / 4), // Rough token estimate
    }));

    const { error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert(chunkRecords);

    if (insertError) {
      throw new Error('Failed to insert chunks: ' + insertError.message);
    }

    // Update document status
    await supabase
      .from('knowledge_documents')
      .update({ 
        status: 'processed',
        chunk_count: chunks.length
      })
      .eq('id', documentId);

    console.log('Document processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        textLength: extractedText.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
