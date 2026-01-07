import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = Deno.env.get('STUDY_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('x-webhook-secret');

    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { event, session_id, study_id, data } = payload;

    if (!event || !session_id) {
      console.error('Missing required fields:', { event, session_id });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Received study webhook:', { event, session_id, study_id });

    switch (event) {
      case 'session_start':
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString(),
            current_phase: data?.phase || 'starting'
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: data?.phase || 'starting',
          message: 'Sesión de IA iniciada',
          details: data
        });
        break;

      case 'progress':
        await supabase
          .from('study_sessions')
          .update({ 
            progress_percentage: data?.progress || 0,
            current_phase: data?.phase || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: data?.phase,
          message: data?.message || `Progreso: ${data?.progress}%`,
          details: data
        });
        break;

      case 'research_found':
        // Insert research item found by AI
        if (data?.research) {
          const { error } = await supabase
            .from('study_research')
            .insert({
              study_id,
              session_id,
              title: data.research.title,
              summary: data.research.summary,
              source_url: data.research.source_url,
              source_type: data.research.source_type || 'web',
              key_findings: data.research.key_findings || [],
              relevance_score: data.research.relevance_score,
              ai_generated: true,
              ai_extracted: true,
              authors: data.research.authors,
              publication_date: data.research.publication_date
            });

          if (error) {
            console.error('Error inserting research:', error);
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'research',
          message: `Investigación encontrada: ${data?.research?.title || 'Sin título'}`,
          details: data
        });
        break;

      case 'solution_identified':
        // Insert solution identified by AI
        if (data?.solution) {
          const { error } = await supabase
            .from('study_solutions')
            .insert({
              study_id,
              name: data.solution.name,
              category: data.solution.category,
              description: data.solution.description,
              advantages: data.solution.advantages || [],
              disadvantages: data.solution.disadvantages || [],
              applicable_contexts: data.solution.applicable_contexts || [],
              estimated_trl_range: data.solution.trl_range,
              cost_range: data.solution.cost_range,
              implementation_time: data.solution.implementation_time,
              priority: data.solution.priority
            });

          if (error) {
            console.error('Error inserting solution:', error);
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'solutions',
          message: `Solución identificada: ${data?.solution?.name || 'Sin nombre'}`,
          details: data
        });
        break;

      case 'technology_matched':
        // Insert technology to longlist
        if (data?.technology) {
          const { error } = await supabase
            .from('study_longlist')
            .insert({
              study_id,
              technology_id: data.technology.technology_id || null,
              solution_id: data.technology.solution_id || null,
              technology_name: data.technology.name,
              provider: data.technology.provider,
              country: data.technology.country,
              trl: data.technology.trl,
              brief_description: data.technology.description,
              inclusion_reason: data.technology.reason,
              source: 'ai_session'
            });

          if (error) {
            console.error('Error inserting to longlist:', error);
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'longlist',
          message: `Tecnología añadida a longlist: ${data?.technology?.name || 'Sin nombre'}`,
          details: data
        });
        break;

      case 'evaluation_completed':
        // Insert or update evaluation
        if (data?.evaluation) {
          const { error } = await supabase
            .from('study_evaluations')
            .upsert({
              study_id,
              shortlist_id: data.evaluation.shortlist_id,
              session_id,
              ai_generated: true,
              ai_analyzed_at: new Date().toISOString(),
              ai_scores: data.evaluation.scores,
              ai_swot: data.evaluation.swot,
              ai_recommendation: data.evaluation.recommendation,
              ai_analysis_json: data.evaluation.full_analysis,
              ai_external_data: data.evaluation.external_data,
              ai_kb_insights: data.evaluation.kb_insights,
              overall_score: data.evaluation.overall_score,
              trl_score: data.evaluation.scores?.trl,
              cost_score: data.evaluation.scores?.cost,
              scalability_score: data.evaluation.scores?.scalability,
              context_fit_score: data.evaluation.scores?.context_fit,
              innovation_potential_score: data.evaluation.scores?.innovation,
              strengths: data.evaluation.swot?.strengths || [],
              weaknesses: data.evaluation.swot?.weaknesses || [],
              opportunities: data.evaluation.swot?.opportunities || [],
              threats: data.evaluation.swot?.threats || [],
              recommendation: data.evaluation.recommendation
            }, {
              onConflict: 'shortlist_id,study_id'
            });

          if (error) {
            console.error('Error inserting evaluation:', error);
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'evaluation',
          message: 'Evaluación completada por IA',
          details: data
        });
        break;

      case 'error':
        const isCritical = data?.critical === true;
        
        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'error',
          phase: data?.phase,
          message: data?.message || 'Error desconocido',
          details: data
        });

        if (isCritical) {
          await supabase
            .from('study_sessions')
            .update({ 
              status: 'failed',
              error_message: data?.message || 'Error crítico',
              completed_at: new Date().toISOString()
            })
            .eq('id', session_id);
        }
        break;

      case 'session_complete':
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            summary: data?.summary || {}
          })
          .eq('id', session_id);

        // Update study phase if applicable
        if (data?.next_phase) {
          await supabase
            .from('scouting_studies')
            .update({ current_phase: data.next_phase })
            .eq('id', study_id);
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'complete',
          message: 'Sesión de IA completada exitosamente',
          details: data
        });
        break;

      case 'log':
        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: data?.level || 'info',
          phase: data?.phase,
          message: data?.message || 'Log entry',
          details: data?.details
        });
        break;

      default:
        console.warn('Unknown event type:', event);
        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'warn',
          phase: 'unknown',
          message: `Evento desconocido: ${event}`,
          details: payload
        });
    }

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in study-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
