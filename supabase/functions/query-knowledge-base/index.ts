import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, limit = 5 } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Searching knowledge base for:', query);

    // Search using PostgreSQL full-text search
    // Split query into terms for better matching
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, '')
      .split(/\s+/)
      .filter((term: string) => term.length > 2)
      .join(' | ');

    console.log('Search terms:', searchTerms);

    // Use plainto_tsquery for simpler queries, websearch_to_tsquery for complex ones
    const { data: chunks, error: searchError } = await supabase
      .from('knowledge_chunks')
      .select(`
        id,
        content,
        chunk_index,
        document_id,
        knowledge_documents!inner(name)
      `)
      .textSearch('content', searchTerms, {
        type: 'websearch',
        config: 'spanish'
      })
      .limit(limit);

    // If full-text search returns no results, try ILIKE fallback
    let relevantChunks = chunks || [];
    
    if (relevantChunks.length === 0) {
      console.log('Full-text search returned no results, trying ILIKE fallback');
      
      const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      
      if (queryWords.length > 0) {
        const { data: fallbackChunks } = await supabase
          .from('knowledge_chunks')
          .select(`
            id,
            content,
            chunk_index,
            document_id,
            knowledge_documents!inner(name)
          `)
          .or(queryWords.map((word: string) => `content.ilike.%${word}%`).join(','))
          .limit(limit);
        
        relevantChunks = fallbackChunks || [];
      }
    }

    console.log('Found chunks:', relevantChunks.length);

    if (relevantChunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          answer: 'No encontré información relevante en la base de conocimiento para responder tu pregunta. Intenta reformular la consulta o verifica que haya documentos cargados relacionados con el tema.',
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from relevant chunks
    const context = relevantChunks.map((chunk: any, index: number) => 
      `[Fuente ${index + 1}: ${chunk.knowledge_documents?.name || 'Documento'}]\n${chunk.content}`
    ).join('\n\n---\n\n');

    // Generate answer using Lovable AI
    const systemPrompt = `Eres un experto en ingeniería de tratamiento de aguas (potable, residual, industrial) y tecnologías del sector del agua. 
Tu tarea es responder preguntas técnicas basándote ÚNICAMENTE en el contexto proporcionado de la base de conocimiento.

Reglas:
1. Basa tus respuestas SOLO en la información del contexto proporcionado
2. Si la información no está en el contexto, indícalo claramente
3. Cita las fuentes cuando sea relevante (ej: "Según [Fuente 1]...")
4. Usa terminología técnica apropiada
5. Estructura tus respuestas de forma clara y profesional
6. Si hay información contradictoria entre fuentes, señálalo

Contexto de la base de conocimiento:
${context}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Límite de consultas excedido. Intenta de nuevo más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Contacta al administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Error al consultar la IA');
    }

    const aiResponse = await response.json();
    const answer = aiResponse.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.';

    // Format sources
    const sources = relevantChunks.map((chunk: any) => ({
      documentName: chunk.knowledge_documents?.name || 'Documento',
      documentId: chunk.document_id,
      preview: chunk.content.substring(0, 200) + '...'
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        answer,
        sources
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error querying knowledge base:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
