import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Map session_type to Railway endpoint
    const endpointMap: Record<string, string> = {
      'research': 'research',
      'solutions': 'solutions',
      'shortlist': 'web-scouting',  // Railway uses web-scouting for longlist
      'evaluation': 'evaluate',      // Railway uses evaluate, not evaluation
    };

    const railwayEndpoint = endpointMap[session_type];

    if (!railwayEndpoint) {
      console.error(`No endpoint mapping for session_type: ${session_type}`);
      return new Response(JSON.stringify({ 
        error: `Unsupported session type: ${session_type}`,
        valid_types: Object.keys(endpointMap)
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Mapped session_type "${session_type}" to Railway endpoint: /api/study/${railwayEndpoint}`);

    // Prevent duplicate active sessions (e.g., Railway already running a job)
    const { data: existingSession, error: existingSessionError } = await supabase
      .from('study_sessions')
      .select('id, status, session_type')
      .eq('study_id', study_id)
      .eq('session_type', session_type)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSessionError) {
      console.warn('Failed to check for existing active session:', existingSessionError);
    }

    if (existingSession) {
      console.log('Active session already exists, returning it:', existingSession.id);
      return new Response(
        JSON.stringify({
          success: true,
          session_id: existingSession.id,
          study_id,
          session_type,
          status: existingSession.status,
          already_running: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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
    // Extract required fields from study_context
    const problemStatement =
      (config && typeof config === 'object' ? (config as any).problem_statement : undefined) ||
      studyData?.problem_statement ||
      '';

    const contextStr =
      (config && typeof config === 'object' ? (config as any).context : undefined) ||
      studyData?.context ||
      '';

    // Extract objectives as array of strings
    const objectivesArray: string[] = studyData?.objectives || [];

    // For evaluation endpoint, Railway expects a "technologies" array.
    // Build it from shortlist (+ joined longlist) so evaluation can run server-side.
    let technologiesForEvaluation: Record<string, unknown>[] | undefined = undefined;

    if (session_type === 'evaluation') {
      const shortlistIds: string[] =
        (config && typeof config === 'object' ? ((config as any).shortlist_ids as string[] | undefined) : undefined) || [];

      const shortlistQuery = supabase
        .from('study_shortlist')
        .select(
          `
          id,
          longlist_id,
          priority,
          selection_reason,
          notes,
          longlist:study_longlist (
            id,
            technology_name,
            brief_description,
            provider,
            web,
            country,
            sector,
            trl,
            innovacion,
            ventaja_competitiva,
            casos_referencia,
            applications
          )
        `,
        )
        .eq('study_id', study_id);

      const { data: shortlistRows, error: shortlistError } = shortlistIds.length
        ? await shortlistQuery.in('id', shortlistIds)
        : await shortlistQuery;

      if (shortlistError) {
        console.warn('Failed to load shortlist for evaluation:', shortlistError);
      }

      const rows = shortlistRows || [];
      technologiesForEvaluation = rows
        .map((r: any) => {
          const ll = r.longlist;
          return {
            // Use shortlist_id as evaluation_id - Railway requires this field
            // This ensures Railway returns the correct ID in technology_evaluated
            evaluation_id: r.id,
            shortlist_id: r.id,
            longlist_id: r.longlist_id,
            priority: r.priority,
            selection_reason: r.selection_reason,
            notes: r.notes,
            name: ll?.technology_name,
            description: ll?.brief_description,
            provider: ll?.provider,
            web: ll?.web,
            country: ll?.country,
            sector: ll?.sector,
            trl: ll?.trl,
            innovation: ll?.innovacion,
            competitive_advantage: ll?.ventaja_competitiva,
            reference_cases: ll?.casos_referencia,
            applications: ll?.applications,
          };
        })
        .filter((t: any) => !!t.name);

      // Log shortlist_ids being sent to Railway for debugging
      console.log(`[study-start-session] Sending ${technologiesForEvaluation.length} technologies to Railway:`, 
        technologiesForEvaluation.map((t: any) => ({ 
          name: t.name, 
          shortlist_id: t.shortlist_id 
        }))
      );
    }

    // Build payload. Different endpoints have different required fields.
    const railwayPayload: Record<string, unknown> = {
      // Required fields
      study_id,
      session_id: sessionData.id,
      problem_statement: problemStatement,
      context: contextStr,
      webhook_url: `${supabaseUrl}/functions/v1/study-webhook`,
      webhook_secret: webhookSecret || '',

      // LLM configuration - from config
      provider: (config as any)?.provider || undefined,
      model: (config as any)?.model || undefined,

      // Optional fields
      objectives: objectivesArray.length > 0 ? objectivesArray : undefined,
      keywords: (config as any)?.keywords || undefined,
      kb_documents: kbDocuments.length > 0 ? kbDocuments : undefined,
      sources: (config as any)?.sources || ['web', 'papers'],
      depth: (config as any)?.depth || 'standard',

      // Evaluation-specific
      technologies: technologiesForEvaluation,
    };

    // Remove undefined keys to keep payload clean
    Object.keys(railwayPayload).forEach(key => {
      if (railwayPayload[key] === undefined) {
        delete railwayPayload[key];
      }
    });

    console.log('Calling Railway backend:', railwayApiUrl, 'payload keys:', Object.keys(railwayPayload));
    console.log('LLM config sent to Railway:', { provider: railwayPayload.provider, model: railwayPayload.model });

    // Add timeout to prevent edge function from hanging
    // NOTE: A timeout here does NOT necessarily mean the backend job didn't start.
    // We keep the DB session in "pending" on timeout to avoid creating duplicates.
    const controller = new AbortController();
    const timeoutMs = 55000; // 55s timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let railwayResponse: Response;
    try {
      railwayResponse = await fetch(`${railwayApiUrl}/api/study/${railwayEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-study-secret': webhookSecret || '',
        },
        body: JSON.stringify(railwayPayload),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
      const errorStr = fetchError instanceof Error ? `${fetchError.name}: ${fetchError.message}` : String(fetchError);
      const isTransientNetworkError = /connection reset|ECONNRESET|Connection reset/i.test(errorStr);

      console.error('Railway fetch error:', fetchError);

      // Treat timeouts / transient connection resets as non-fatal.
      // The backend may have started processing even if the connection dropped.
      if (isTimeout || isTransientNetworkError) {
        const reason = isTimeout ? 'timeout' : 'connection_reset';

        await supabase.from('study_session_logs').insert({
          session_id: sessionData.id,
          study_id,
          level: 'warn',
          phase: session_type,
          message:
            reason === 'timeout'
              ? `Timeout esperando respuesta del backend (>${Math.round(timeoutMs / 1000)}s). La sesión queda en "pending".`
              : 'Conexión reiniciada por el backend (posible cold-start). La sesión queda en "pending".',
          details: {
            reason,
            timeout_ms: timeoutMs,
            error: errorStr,
            endpoint: `/api/study/${railwayEndpoint}`,
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            session_id: sessionData.id,
            study_id,
            session_type,
            status: 'pending',
            backend_unreachable: true,
            reason,
          }),
          {
            status: 202,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Non-transient connection error: mark as failed
      await supabase
        .from('study_sessions')
        .update({
          status: 'failed',
          error_message: `Connection error: ${errorStr}`,
        })
        .eq('id', sessionData.id);

      await supabase.from('study_session_logs').insert({
        session_id: sessionData.id,
        study_id,
        level: 'error',
        phase: session_type,
        message: 'Error de conexión con backend',
        details: { error: errorStr },
      });

      return new Response(
        JSON.stringify({
          error: 'Connection failed',
          session_id: sessionData.id,
          details: errorStr,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    clearTimeout(timeoutId);

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text();
      console.error('Railway backend error:', railwayResponse.status, errorText);
      
      // Handle 409 Conflict - Railway says there's already a job running
      if (railwayResponse.status === 409) {
        // Delete the session we just created since Railway already has one
        await supabase
          .from('study_sessions')
          .delete()
          .eq('id', sessionData.id);
        
        // Try to extract the existing job_id from Railway's response
        let existingJobId: string | null = null;
        try {
          const errorJson = JSON.parse(errorText);
          existingJobId = errorJson?.detail?.job_id || errorJson?.job_id || null;
        } catch {
          // Response wasn't JSON
        }
        
        console.log('Railway 409: evaluation already running, job_id:', existingJobId);
        
        // Return success with already_running flag
        return new Response(JSON.stringify({ 
          success: true,
          session_id: sessionData.id,
          study_id,
          session_type,
          status: 'running',
          already_running: true,
          railway_job_id: existingJobId,
          message: 'Ya hay una evaluación en ejecución en Railway'
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      // Update session status to failed for other errors
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
