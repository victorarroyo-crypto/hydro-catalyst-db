import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
    const webhookSecret = Deno.env.get('STUDY_WEBHOOK_SECRET');

    if (!railwayApiUrl) {
      console.error('RAILWAY_API_URL not configured');
      return new Response(JSON.stringify({ error: 'Backend not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;
    console.log('User authenticated:', userId);

    // Parse request body
    const body = await req.json();
    const { 
      study_id, 
      session_type, 
      config,
      phase 
    } = body;

    if (!study_id || !session_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: study_id, session_type' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Starting study session:', { study_id, session_type, phase });

    // Create session record in database
    const { data: sessionData, error: sessionError } = await supabase
      .from('study_sessions')
      .insert({
        study_id,
        session_type,
        status: 'pending',
        config: config || {},
        current_phase: phase || session_type,
        progress_percentage: 0
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session', details: sessionError }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Session created:', sessionData.id);

    // Update study with AI session reference
    const { error: updateError } = await supabase
      .from('scouting_studies')
      .update({ ai_session_id: sessionData.id })
      .eq('id', study_id);

    if (updateError) {
      console.warn('Failed to update study with session ID:', updateError);
    }

    // Log session start
    await supabase.from('study_session_logs').insert({
      session_id: sessionData.id,
      study_id,
      level: 'info',
      phase: session_type,
      message: `Iniciando sesión de ${session_type}`,
      details: { config, user_id: userId }
    });

    // Fetch study details for context
    const { data: studyData } = await supabase
      .from('scouting_studies')
      .select('*')
      .eq('id', study_id)
      .single();

    // Fetch knowledge documents linked to this study's research
    const { data: researchDocs } = await supabase
      .from('study_research')
      .select(`
        id,
        title,
        source_type,
        source_url,
        authors,
        summary,
        key_findings,
        relevance_score,
        knowledge_doc_id,
        knowledge_documents:knowledge_doc_id (
          id,
          name,
          file_path,
          description,
          status,
          chunk_count
        )
      `)
      .eq('study_id', study_id);

    // Build kb_documents by grouping chunks per document (format Railway expects)
    const kbDocuments: { id: string; title: string; content: string; relevance: number }[] = [];
    
    for (const research of researchDocs || []) {
      const doc = research.knowledge_documents as any;
      
      if (doc?.status === 'processed' && research.knowledge_doc_id) {
        // Fetch all chunks for this document
        const { data: docChunks } = await supabase
          .from('knowledge_chunks')
          .select('content, chunk_index')
          .eq('document_id', research.knowledge_doc_id)
          .order('chunk_index', { ascending: true });
        
        // Concatenate all chunk contents
        const fullContent = docChunks?.map(c => c.content).join('\n\n') || '';
        
        kbDocuments.push({
          id: research.knowledge_doc_id,
          title: research.title || doc.name,
          content: fullContent,
          relevance: research.relevance_score || 50
        });
      }
    }

    console.log(`Found ${researchDocs?.length || 0} research sources, ${kbDocuments.length} kb_documents prepared`);

    // Call Railway backend to start the AI session
    const railwayPayload = {
      session_id: sessionData.id,
      study_id,
      session_type,
      phase: phase || session_type,
      config: config || {},
      webhook_url: `${supabaseUrl}/functions/v1/study-webhook`,
      webhook_secret: webhookSecret,
      // Study context for agents
      study_context: {
        name: studyData?.name,
        problem_statement: studyData?.problem_statement,
        context: studyData?.context,
        objectives: studyData?.objectives,
        constraints: studyData?.constraints,
      },
      // Research sources with their documents
      research_sources: researchDocs?.map(r => {
        const doc = r.knowledge_documents as any;
        return {
          id: r.id,
          title: r.title,
          source_type: r.source_type,
          source_url: r.source_url,
          authors: r.authors,
          summary: r.summary,
          key_findings: r.key_findings,
          relevance_score: r.relevance_score,
          has_document: !!doc,
          document_status: doc?.status,
          document_name: doc?.name,
        };
      }) || [],
      // Knowledge base documents (format Railway expects)
      kb_documents: kbDocuments,
    };

    console.log('Calling Railway backend:', railwayApiUrl);

    const railwayResponse = await fetch(`${railwayApiUrl}/api/study/${session_type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret || '',
        'X-User-Id': userId
      },
      body: JSON.stringify(railwayPayload)
    });

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text();
      console.error('Railway backend error:', railwayResponse.status, errorText);
      
      // Update session status to failed
      await supabase
        .from('study_sessions')
        .update({ 
          status: 'failed', 
          error_message: `Backend error: ${railwayResponse.status}` 
        })
        .eq('id', sessionData.id);

      await supabase.from('study_session_logs').insert({
        session_id: sessionData.id,
        study_id,
        level: 'error',
        phase: session_type,
        message: 'Error al conectar con backend de IA',
        details: { status: railwayResponse.status, error: errorText }
      });

      return new Response(JSON.stringify({ 
        error: 'Backend connection failed', 
        session_id: sessionData.id,
        details: errorText 
      }), { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const railwayData = await railwayResponse.json();
    console.log('Railway response:', railwayData);

    // Update session to running
    await supabase
      .from('study_sessions')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', sessionData.id);

    await supabase.from('study_session_logs').insert({
      session_id: sessionData.id,
      study_id,
      level: 'info',
      phase: session_type,
      message: 'Sesión de IA iniciada correctamente',
      details: railwayData
    });

    return new Response(JSON.stringify({ 
      success: true,
      session_id: sessionData.id,
      study_id,
      session_type,
      status: 'running',
      railway_response: railwayData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in study-start-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
