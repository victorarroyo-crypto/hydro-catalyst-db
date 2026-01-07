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
      // Railway sends 'research_start' when beginning
      case 'research_start':
      case 'session_start':
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString(),
            current_phase: data?.phase || payload.phase || 'research'
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: data?.phase || payload.phase || 'research',
          message: 'Sesión de IA iniciada - Investigación en progreso',
          details: data || payload
        });
        break;

      // Railway sends 'research_progress' for progress updates
      case 'research_progress':
      case 'progress': {
        const progressData = data || payload;
        const progressValue = progressData?.progress ?? progressData?.percentage ?? 0;
        const progressMessage = progressData?.message || progressData?.status || `Progreso: ${progressValue}%`;
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            progress_percentage: progressValue,
            current_phase: progressData?.phase || 'research',
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: progressData?.phase || 'research',
          message: progressMessage,
          details: progressData
        });
        break;
      }

      // Railway sends 'research_finding' for each finding
      case 'research_finding':
      case 'research_found': {
        // Railway may send data directly in payload or in data object
        const findingData = data || payload;
        const research = findingData?.research || findingData?.finding || findingData;
        
        // Extract research info - handle various formats from Railway
        const title = research?.title || research?.name || 'Hallazgo de investigación';
        const summary = research?.summary || research?.description || research?.content || '';
        const sourceUrl = research?.source_url || research?.url || research?.link || '';
        
        // Extract technology and provider if present
        const technologyMentioned = research?.technology || research?.technology_mentioned || '';
        const providerMentioned = research?.provider || research?.provider_mentioned || '';
        
        // Normalize source_type to valid values: 'paper', 'report', 'article', 'patent', 'website', 'other'
        const rawSourceType = research?.source_type || research?.type || 'website';
        const validSourceTypes = ['paper', 'report', 'article', 'patent', 'website', 'other'];
        const sourceTypeMap: Record<string, string> = {
          'web': 'website',
          'url': 'website',
          'link': 'website',
          'blog': 'article',
          'news': 'article',
          'journal': 'paper',
          'study': 'paper',
          'doc': 'report',
          'document': 'report'
        };
        const sourceType = validSourceTypes.includes(rawSourceType) 
          ? rawSourceType 
          : (sourceTypeMap[rawSourceType.toLowerCase()] || 'other');
        
        const keyFindings = research?.key_findings || research?.findings || [];
        
        // Normalize relevance_score to 1-5 range (DB constraint)
        const rawScore = research?.relevance_score || research?.relevance || research?.score || 3;
        let relevanceScore: number;
        if (typeof rawScore === 'number') {
          if (rawScore > 5) {
            // Railway sends 0-100, normalize to 1-5
            relevanceScore = Math.max(1, Math.min(5, Math.round(rawScore / 20)));
          } else if (rawScore < 1) {
            relevanceScore = 1;
          } else {
            relevanceScore = Math.round(rawScore);
          }
        } else {
          relevanceScore = 3;
        }
        
        // Detectar formato legacy de Railway (todo en un solo campo markdown)
        if (title === 'Web Research Results' && summary && summary.includes('###')) {
          console.log('[WEBHOOK] Detected legacy markdown format, parsing...');
          
          const sections = summary.split(/###\s*\d+\./);
          let insertedCount = 0;
          
          for (const section of sections.slice(1)) {
            const parsedTitle = section.match(/\*\*Title\*\*:\s*(.+?)(?:\n|$)/)?.[1]?.trim();
            const parsedUrl = section.match(/\*\*(?:Source )?URL\*\*:\s*(https?:\/\/[^\s\n]+)/)?.[1]?.trim();
            const parsedSummary = section.match(/\*\*Summary\*\*:\s*(.+?)(?:\n\n|\n-|$)/s)?.[1]?.trim();
            const parsedType = parsedUrl?.includes('patent') ? 'patent' 
              : parsedUrl?.includes('doi.org') ? 'paper' 
              : 'website';
            
            if (parsedTitle) {
              const { error } = await supabase.from('study_research').insert({
                study_id,
                session_id,
                title: parsedTitle.substring(0, 200),
                summary: parsedSummary?.substring(0, 1000) || '',
                source_url: parsedUrl || '',
                source_type: parsedType,
                relevance_score: relevanceScore,
                key_findings: [],
                ai_generated: true,
                ai_extracted: true
              });
              
              if (!error) {
                insertedCount++;
                console.log(`[WEBHOOK] Parsed finding ${insertedCount}: ${parsedTitle.substring(0, 50)}...`);
              } else {
                console.error('[WEBHOOK] Error inserting parsed finding:', error);
              }
            }
          }
          
          // Log del parsing
          await supabase.from('study_session_logs').insert({
            session_id,
            study_id,
            level: 'info',
            phase: 'research',
            message: `Parseados ${insertedCount} hallazgos de formato legacy`,
            details: { original_title: title, sections_found: sections.length - 1, inserted: insertedCount }
          });
        } else if (title && title !== 'Hallazgo de investigación') {
          // Comportamiento normal para formato correcto
          const { error } = await supabase
            .from('study_research')
            .insert({
              study_id,
              session_id,
              title,
              summary,
              source_url: sourceUrl,
              source_type: sourceType,
              key_findings: Array.isArray(keyFindings) ? keyFindings : [],
              relevance_score: relevanceScore,
              technology_mentioned: technologyMentioned,
              provider_mentioned: providerMentioned,
              ai_generated: true,
              ai_extracted: true,
              authors: research?.authors || '',
              publication_date: research?.publication_date || null
            });

          if (error) {
            console.error('Error inserting research:', error);
          } else {
            console.log('Research inserted successfully:', title, technologyMentioned ? `(Tech: ${technologyMentioned})` : '');
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'research',
          message: `Hallazgo: ${title}`,
          details: findingData
        });
        break;
      }

      // Railway sends 'research_complete' when research phase ends
      case 'research_complete':
      case 'session_complete': {
        const completeData = data || payload;
        const findings = completeData?.findings || completeData?.results || [];
        
        // Valid source types for constraint
        const validSourceTypes = ['paper', 'report', 'article', 'patent', 'website', 'other'];
        const sourceTypeMap: Record<string, string> = {
          'web': 'website', 'url': 'website', 'link': 'website',
          'blog': 'article', 'news': 'article',
          'journal': 'paper', 'study': 'paper',
          'doc': 'report', 'document': 'report'
        };
        
        // Insert any findings that came with the complete event
        for (const finding of findings) {
          const title = finding?.title || finding?.name || '';
          if (title) {
            // Normalize source_type
            const rawType = finding?.source_type || finding?.type || 'website';
            const sourceType = validSourceTypes.includes(rawType) 
              ? rawType 
              : (sourceTypeMap[rawType.toLowerCase()] || 'other');
            
            // Normalize relevance_score to 1-5
            const rawScore = finding?.relevance_score || finding?.relevance || 3;
            let relevanceScore = 3;
            if (typeof rawScore === 'number') {
              if (rawScore > 5) {
                relevanceScore = Math.max(1, Math.min(5, Math.round(rawScore / 20)));
              } else {
                relevanceScore = Math.max(1, Math.min(5, Math.round(rawScore)));
              }
            }
            
            const { error } = await supabase
              .from('study_research')
              .insert({
                study_id,
                session_id,
                title,
                summary: finding?.summary || finding?.description || '',
                source_url: finding?.source_url || finding?.url || '',
                source_type: sourceType,
                key_findings: finding?.key_findings || [],
                relevance_score: relevanceScore,
                ai_generated: true,
                ai_extracted: true
              });
            if (error) {
              console.error('Error inserting research finding:', error);
            }
          }
        }
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            summary: completeData?.summary || { findings_count: findings.length }
          })
          .eq('id', session_id);

        // Update study phase if applicable
        if (completeData?.next_phase) {
          await supabase
            .from('scouting_studies')
            .update({ current_phase: completeData.next_phase })
            .eq('id', study_id);
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'complete',
          message: `Investigación completada - ${findings.length || 0} hallazgos encontrados`,
          details: completeData
        });
        break;
      }

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

      // session_complete is now handled above with research_complete

      // NEW: technology_extracted - Inserts extracted technologies directly into study_longlist
      case 'technology_extracted': {
        const tech = data?.technology || data;
        
        const { error } = await supabase.from('study_longlist').insert({
          study_id,
          session_id,
          technology_name: tech?.name || 'Unknown Technology',
          provider: tech?.provider || '',
          country: tech?.country || '',
          web: tech?.web || tech?.website || '',
          trl: tech?.trl_estimated || tech?.trl || 7,
          type_suggested: tech?.type_suggested || tech?.technology_type || '',
          subcategory_suggested: tech?.subcategory_suggested || tech?.subcategory || '',
          brief_description: tech?.description || '',
          applications: Array.isArray(tech?.applications) ? tech.applications : [],
          source: 'ai_extracted',
          source_research_id: tech?.source_research_id || null,
          confidence_score: tech?.confidence_score || 0.8,
          already_in_db: tech?.already_in_db || false,
          existing_technology_id: tech?.existing_technology_id || null,
          inclusion_reason: `AI-extracted with ${Math.round((tech?.confidence_score || 0.8) * 100)}% confidence`,
        });

        if (error) {
          console.error('Error inserting extracted technology:', error);
        } else {
          console.log(`[study-webhook] Technology extracted: ${tech?.name} by ${tech?.provider}`);
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'extraction',
          message: `Tecnología extraída: ${tech?.name || 'Sin nombre'}`,
          details: data
        });
        break;
      }

      // NEW: content_extracted - Informational logging only
      case 'content_extracted':
        console.log(`[study-webhook] Content extracted from ${data?.url}: ${data?.extraction_success ? 'success' : 'failed'}`);
        
        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: data?.extraction_success ? 'info' : 'warn',
          phase: 'extraction',
          message: `Contenido extraído de ${data?.url || 'URL desconocida'}: ${data?.extraction_success ? 'éxito' : 'fallido'}`,
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
