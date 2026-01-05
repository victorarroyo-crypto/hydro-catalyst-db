import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  
  return chunks.filter(c => c.length > 50);
}

// Basic PDF text extraction (fallback)
function extractTextFromPDFBasic(pdfBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
  
  const textContent: string[] = [];
  
  // Extract text from parentheses
  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    for (const match of matches) {
      const content = match.slice(1, -1);
      if (content.length > 2 && /^[\x20-\x7E\xA0-\xFF\s]+$/.test(content)) {
        textContent.push(content);
      }
    }
  }
  
  // Try BT/ET text blocks
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

// Use Gemini for OCR extraction from PDF
async function extractTextWithGeminiOCR(pdfBuffer: ArrayBuffer, lovableApiKey: string): Promise<string> {
  console.log('Using Gemini OCR for text extraction...');
  
  // Convert PDF buffer to base64
  const uint8Array = new Uint8Array(pdfBuffer);
  const base64String = btoa(String.fromCharCode(...uint8Array));
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en extracción de texto de documentos técnicos sobre tratamiento de aguas.
Tu tarea es extraer TODO el texto del documento PDF proporcionado de forma precisa y completa.

Instrucciones:
1. Extrae todo el texto visible del documento
2. Mantén la estructura del documento (títulos, párrafos, listas, tablas)
3. Preserva los números, fórmulas y unidades técnicas exactamente como aparecen
4. Si hay tablas, formatea los datos de forma legible
5. Ignora elementos decorativos, logos e imágenes no textuales
6. Si hay texto en múltiples idiomas, extrae todo
7. Devuelve SOLO el texto extraído, sin comentarios ni explicaciones adicionales`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae todo el texto de este documento PDF técnico sobre tratamiento de aguas:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64String}`
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';
    
    console.log('Gemini extracted text length:', extractedText.length);
    return extractedText;
  } catch (error) {
    console.error('Gemini OCR error:', error);
    throw error;
  }
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
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

    const pdfBuffer = await fileData.arrayBuffer();
    let extractedText = '';

    // Try Gemini OCR first if API key is available
    if (lovableApiKey) {
      try {
        extractedText = await extractTextWithGeminiOCR(pdfBuffer, lovableApiKey);
      } catch (ocrError) {
        console.log('Gemini OCR failed, falling back to basic extraction:', ocrError);
      }
    }

    // Fallback to basic extraction if Gemini fails or returns little text
    if (extractedText.length < 100) {
      console.log('Using basic PDF extraction as fallback');
      extractedText = extractTextFromPDFBasic(pdfBuffer);
      
      // If still not enough, try getting any readable text
      if (extractedText.length < 100) {
        const uint8Array = new Uint8Array(pdfBuffer);
        const rawText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
        const readableChars = rawText.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');
        extractedText = readableChars.replace(/\s+/g, ' ').trim();
      }
    }

    console.log('Total extracted text length:', extractedText.length);

    if (extractedText.length < 50) {
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
      tokens: Math.ceil(content.length / 4),
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

    console.log('Document processed successfully with Gemini OCR');

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        textLength: extractedText.length,
        method: lovableApiKey ? 'gemini-ocr' : 'basic'
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
