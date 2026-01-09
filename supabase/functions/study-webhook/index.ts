import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
        // Progress viene en el nivel RAÍZ del payload, no dentro de data
        const progressValue = payload.progress ?? data?.progress ?? data?.percentage ?? 0;
        const phase = payload.phase ?? data?.phase ?? 'research';
        const progressMessage = data?.message || data?.status || `Progreso: ${progressValue}%`;
        
        console.log(`[study-webhook] ${event}: ${progressValue}%, phase: ${phase}`);
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            progress_percentage: progressValue,
            current_phase: phase,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: phase,
          message: progressMessage,
          details: { ...data, payload_progress: payload.progress, payload_phase: payload.phase }
        });
        break;
      }

      // Railway sends 'solutions_progress' for solutions phase progress
      case 'solutions_progress': {
        // Progress viene en el nivel RAÍZ del payload, no dentro de data
        const progressValue = payload.progress ?? data?.progress ?? data?.percentage ?? 0;
        const progressMessage = data?.message || data?.status || `Identificando soluciones: ${progressValue}%`;
        
        console.log(`[study-webhook] solutions_progress: ${progressValue}%`);
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            progress_percentage: progressValue,
            current_phase: 'solutions',
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'solutions',
          message: progressMessage,
          details: { ...data, payload_progress: payload.progress }
        });
        break;
      }

      // Railway sends 'solutions_complete' when solutions phase ends
      case 'solutions_complete': {
        const completeData = data || payload;
        const solutions = completeData?.solutions || [];
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            summary: completeData?.summary || { solutions_count: solutions.length }
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'solutions',
          message: `Fase de soluciones completada - ${solutions.length || 'varias'} soluciones identificadas`,
          details: completeData
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
        // Railway sends data.name directly, not data.solution.name
        if (data?.name) {
          const { error } = await supabase
            .from('study_solutions')
            .insert({
              study_id,
              name: data.name,
              category: data.category || 'general',
              description: data.description,
              advantages: data.advantages || [],
              disadvantages: data.disadvantages || [],
              applicable_contexts: data.applicable_contexts || [],
              estimated_trl_range: data.trl_range || data.estimated_trl_range,
              key_providers: data.key_providers || [],
              cost_range: data.cost_range,
              implementation_time: data.implementation_time,
              priority: data.priority
            });

          if (error) {
            console.error('Error inserting solution:', error);
          } else {
            console.log('Solution inserted successfully:', data.name);
          }
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'solutions',
          message: `Solución identificada: ${data?.name || 'Sin nombre'}`,
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

      // Evaluation phase handlers
      case 'evaluation_start': {
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString(),
            current_phase: 'evaluation',
            progress_percentage: 0
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'evaluation',
          message: 'Iniciando evaluación automática de tecnologías',
          details: data || payload
        });
        break;
      }

      case 'evaluation_progress': {
        // Progress y phase vienen en el nivel RAÍZ del payload, no dentro de data
        const progressValue = payload.progress ?? data?.progress ?? 0;
        const phase = payload.phase ?? data?.phase ?? 'evaluating_technologies';
        const message = data?.message || `Evaluando tecnologías: ${progressValue}%`;
        
        console.log(`[study-webhook] evaluation_progress: ${progressValue}%, phase: ${phase}`);
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            progress_percentage: progressValue,
            current_phase: 'evaluation',
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'evaluation',
          message: message,
          details: { ...data, payload_progress: payload.progress, payload_phase: payload.phase }
        });
        break;
      }

      case 'technology_evaluated': {
        const evalData = data || payload;
        
        // Railway puede enviar evaluation_id o shortlist_id
        let shortlistId = evalData?.shortlist_id || evalData?.evaluation_id;
        
        // Los scores pueden venir directamente o dentro de evaluation
        const evaluation = evalData?.evaluation || evalData;
        const overallScore = evaluation?.overall_score || evalData?.overall_score;
        
        // Los scores individuales pueden estar en scores o criteria_scores
        const scores = evaluation?.scores || evaluation?.criteria_scores || {};
        const trlScore = scores?.trl?.score ?? scores?.trl;
        const costScore = scores?.cost?.score ?? scores?.cost ?? scores?.cost_capex?.score;
        const scalabilityScore = scores?.scalability?.score ?? scores?.scalability;
        const contextFitScore = scores?.context_fit?.score ?? scores?.context_fit;
        const innovationScore = scores?.innovation?.score ?? scores?.innovation;
        
        // SWOT puede venir en evaluation.swot o evalData.swot
        const swot = evaluation?.swot || evalData?.swot || {};
        
        // Nombre de la tecnología
        const techName = evalData?.technology_name || evalData?.name || 'Sin nombre';
        
        console.log(`[study-webhook] Processing technology_evaluated: ${techName}, initial shortlistId: ${shortlistId}`);
        
        // Si no hay shortlist_id, buscar por nombre de tecnología
        if (!shortlistId && techName && study_id) {
          console.log(`[study-webhook] Searching shortlist by technology name: ${techName}`);
          
          // Primero buscar en study_shortlist con join a study_longlist
          const { data: shortlistMatch, error: searchError } = await supabase
            .from('study_shortlist')
            .select('id, longlist_id, study_longlist!inner(technology_name)')
            .eq('study_id', study_id);
          
          if (!searchError && shortlistMatch && shortlistMatch.length > 0) {
            // Buscar coincidencia por nombre (case insensitive)
            const match = shortlistMatch.find((s: any) => {
              const longlistName = s.study_longlist?.technology_name?.toLowerCase() || '';
              const searchName = techName.toLowerCase();
              return longlistName.includes(searchName) || searchName.includes(longlistName);
            });
            
            if (match) {
              shortlistId = match.id;
              console.log(`[study-webhook] Found shortlist_id by name match: ${shortlistId}`);
            }
          }
          
          if (!shortlistId && searchError) {
            console.error('[study-webhook] Error searching shortlist:', searchError);
          }
        }
        
        if (shortlistId) {
          const { error } = await supabase
            .from('study_evaluations')
            .upsert({
              study_id,
              shortlist_id: shortlistId,
              session_id,
              ai_generated: true,
              ai_analyzed_at: new Date().toISOString(),
              overall_score: overallScore,
              trl_score: trlScore,
              cost_score: costScore,
              scalability_score: scalabilityScore,
              context_fit_score: contextFitScore,
              innovation_potential_score: innovationScore,
              strengths: swot?.strengths || [],
              weaknesses: swot?.weaknesses || [],
              opportunities: swot?.opportunities || [],
              threats: swot?.threats || [],
              recommendation: evaluation?.recommendation || evalData?.recommendation,
              ai_scores: scores,
              ai_swot: swot,
              ai_recommendation: evaluation?.recommendation || evalData?.recommendation,
            }, {
              onConflict: 'shortlist_id,study_id'
            });

          if (error) {
            console.error('Error inserting technology evaluation:', error);
          } else {
            console.log(`[study-webhook] Technology evaluated successfully: ${techName} - Score: ${overallScore}`);
          }
        } else {
          console.warn(`[study-webhook] No shortlist_id found for technology: ${techName} - evaluation not saved`);
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: shortlistId ? 'info' : 'warning',
          phase: 'evaluation',
          message: shortlistId 
            ? `Tecnología evaluada: ${techName} - Puntuación: ${overallScore || 'N/A'}`
            : `⚠️ Tecnología no vinculada: ${techName} - No se encontró en shortlist`,
          details: { ...evalData, resolved_shortlist_id: shortlistId }
        });
        break;
      }

      // Railway sends 'evaluation_complete' (without 'd')
      case 'evaluation_complete':
      case 'evaluation_completed': {
        const completeData = data || payload;
        const summary = completeData?.summary || {};
        const evaluationsCount = completeData?.evaluations_count || completeData?.count || summary?.evaluations_count || 0;
        
        console.log(`[study-webhook] Processing evaluation_complete, summary:`, JSON.stringify(summary).substring(0, 500));
        
        // Handle legacy format with evaluation object
        if (completeData?.evaluation) {
          const { error } = await supabase
            .from('study_evaluations')
            .upsert({
              study_id,
              shortlist_id: completeData.evaluation.shortlist_id,
              session_id,
              ai_generated: true,
              ai_analyzed_at: new Date().toISOString(),
              ai_scores: completeData.evaluation.scores,
              ai_swot: completeData.evaluation.swot,
              ai_recommendation: completeData.evaluation.recommendation,
              ai_analysis_json: completeData.evaluation.full_analysis,
              ai_external_data: completeData.evaluation.external_data,
              ai_kb_insights: completeData.evaluation.kb_insights,
              overall_score: completeData.evaluation.overall_score,
              trl_score: completeData.evaluation.scores?.trl,
              cost_score: completeData.evaluation.scores?.cost,
              scalability_score: completeData.evaluation.scores?.scalability,
              context_fit_score: completeData.evaluation.scores?.context_fit,
              innovation_potential_score: completeData.evaluation.scores?.innovation,
              strengths: completeData.evaluation.swot?.strengths || [],
              weaknesses: completeData.evaluation.swot?.weaknesses || [],
              opportunities: completeData.evaluation.swot?.opportunities || [],
              threats: completeData.evaluation.swot?.threats || [],
              recommendation: completeData.evaluation.recommendation
            }, {
              onConflict: 'shortlist_id,study_id'
            });

          if (error) {
            console.error('Error inserting evaluation:', error);
          }
        }
        
        // Si hay un informe en el summary, guardarlo en study_reports
        if (summary?.report_summary || summary?.executive_summary) {
          const reportTitle = `Informe de Evaluación IA - ${new Date().toLocaleDateString('es-ES')}`;
          const ranking = summary?.ranking || [];
          
          // Obtener datos del estudio para problem_analysis
          let problemAnalysis = '';
          let solutionsOverview = '';
          
          const { data: studyData } = await supabase
            .from('scouting_studies')
            .select('problem_statement, objectives, context')
            .eq('id', study_id)
            .single();
          
          if (studyData) {
            problemAnalysis = studyData.problem_statement || '';
            if (studyData.objectives && Array.isArray(studyData.objectives)) {
              problemAnalysis += '\n\nObjetivos:\n' + studyData.objectives.map((o: string) => `• ${o}`).join('\n');
            }
          }
          
          // Generar solutions_overview desde las tecnologías evaluadas
          if (ranking.length > 0) {
            solutionsOverview = `Se evaluaron ${ranking.length} tecnologías candidatas.\n\n`;
            solutionsOverview += ranking.map((r: any, i: number) => {
              const score = r.overall_score || r.score || 'N/A';
              const recommendation = r.recommendation || '';
              return `${i+1}. **${r.name || r.technology_name}**: Puntuación ${score}/10${recommendation ? ` - ${recommendation}` : ''}`;
            }).join('\n');
          }
          
          // Formatear recommendations correctamente (evitar [object Object])
          let recommendationsText = '';
          if (typeof summary.primary_recommendation === 'string') {
            recommendationsText = summary.primary_recommendation;
          } else if (summary.top_recommendation) {
            const top = summary.top_recommendation;
            recommendationsText = typeof top === 'string' ? top : `${top.name || 'Recomendación principal'}: ${top.reason || top.description || ''}`;
          }
          
          // Añadir alternativas
          if (Array.isArray(summary.alternative_options)) {
            const alternatives = summary.alternative_options.map((opt: any) => {
              if (typeof opt === 'string') return opt;
              return `• ${opt.name || 'Alternativa'}: Puntuación ${opt.score || opt.overall_score || 'N/A'}${opt.reason ? ` - ${opt.reason}` : ''}`;
            }).join('\n');
            if (alternatives) {
              recommendationsText += '\n\nAlternativas:\n' + alternatives;
            }
          }
          
          // Conclusiones
          let conclusionsText = summary.conclusions || '';
          if (!conclusionsText && ranking.length > 0) {
            const topTech = ranking[0];
            conclusionsText = `Basado en el análisis, la tecnología más recomendada es ${topTech.name || topTech.technology_name} con una puntuación de ${topTech.overall_score || topTech.score}/10.`;
          }
          
          const { error: reportError } = await supabase
            .from('study_reports')
            .insert({
              study_id,
              title: reportTitle,
              generated_by: 'ai',
              executive_summary: summary.report_summary || summary.executive_summary || '',
              problem_analysis: problemAnalysis,
              solutions_overview: solutionsOverview,
              recommendations: recommendationsText || 'Ver ranking de tecnologías',
              technology_comparison: ranking.length > 0 ? 
                ranking.map((r: any, i: number) => {
                  const name = r.name || r.technology_name;
                  const score = r.overall_score || r.score;
                  const provider = r.provider ? ` (${r.provider})` : '';
                  const trl = r.trl ? ` | TRL: ${r.trl}` : '';
                  return `${i+1}. ${name}${provider} - Puntuación: ${score}${trl}`;
                }).join('\n') : '',
              conclusions: conclusionsText,
              methodology: 'Evaluación automatizada mediante IA con análisis multi-criterio',
            });
          
          if (reportError) {
            console.error('Error creating evaluation report:', reportError);
          } else {
            console.log('[study-webhook] Evaluation report saved to study_reports with full content');
          }
        }
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            summary: summary || { evaluations_count: evaluationsCount }
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'evaluation',
          message: `Evaluación automática completada - ${evaluationsCount} tecnologías evaluadas`,
          details: completeData
        });
        break;
      }

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

      // NEW: technology_extracted or technology_found - Inserts extracted technologies directly into study_longlist
      case 'technology_extracted':
      case 'technology_found': {
        const tech = data?.technology || data;
        
        const { error } = await supabase.from('study_longlist').insert({
          study_id,
          session_id,
          technology_name: tech?.name || tech?.technology_name || 'Unknown Technology',
          provider: tech?.provider || '',
          country: tech?.country || '',
          web: tech?.web || tech?.website || tech?.source_url || '',
          trl: tech?.trl_estimated || tech?.trl || 7,
          type_suggested: tech?.type_suggested || tech?.technology_type || '',
          subcategory_suggested: tech?.subcategory_suggested || tech?.subcategory || '',
          brief_description: tech?.description || tech?.brief_description || '',
          applications: Array.isArray(tech?.applications) ? tech.applications : [],
          source: 'ai_extracted',
          source_research_id: tech?.source_research_id || null,
          confidence_score: tech?.confidence_score || 0.8,
          already_in_db: tech?.already_in_db || false,
          existing_technology_id: tech?.existing_technology_id || null,
          inclusion_reason: tech?.inclusion_reason || `AI-extracted with ${Math.round((tech?.confidence_score || 0.8) * 100)}% confidence`,
        });

        if (error) {
          console.error('Error inserting extracted technology:', error);
        } else {
          console.log(`[study-webhook] Technology found/extracted: ${tech?.name || tech?.technology_name} by ${tech?.provider}`);
        }

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'longlist',
          message: `Tecnología encontrada: ${tech?.name || tech?.technology_name || 'Sin nombre'}`,
          details: data
        });
        break;
      }

      // Longlist progress and complete events
      case 'longlist_progress': {
        // Progress viene en el nivel RAÍZ del payload, no dentro de data
        const progressValue = payload.progress ?? data?.progress ?? data?.percentage ?? 0;
        const progressMessage = data?.message || data?.status || `Progreso longlist: ${progressValue}%`;
        
        console.log(`[study-webhook] longlist_progress: ${progressValue}%`);
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'running',
            progress_percentage: progressValue,
            current_phase: 'longlist',
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'longlist',
          message: progressMessage,
          details: { ...data, payload_progress: payload.progress }
        });
        break;
      }

      case 'longlist_complete': {
        const completeData = data || payload;
        const technologies = completeData?.technologies || completeData?.results || [];
        
        // Insert any technologies that came with the complete event
        for (const tech of technologies) {
          const name = tech?.name || tech?.technology_name || '';
          if (name) {
            const { error } = await supabase
              .from('study_longlist')
              .insert({
                study_id,
                session_id,
                technology_name: name,
                provider: tech?.provider || '',
                country: tech?.country || '',
                web: tech?.web || tech?.website || '',
                trl: tech?.trl || 7,
                brief_description: tech?.description || '',
                applications: Array.isArray(tech?.applications) ? tech.applications : [],
                source: 'ai_extracted',
                confidence_score: tech?.confidence_score || 0.8,
                inclusion_reason: tech?.inclusion_reason || 'Added from longlist complete'
              });
            if (error) {
              console.error('Error inserting technology from longlist_complete:', error);
            }
          }
        }
        
        await supabase
          .from('study_sessions')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            summary: completeData?.summary || { technologies_count: technologies.length }
          })
          .eq('id', session_id);

        await supabase.from('study_session_logs').insert({
          session_id,
          study_id,
          level: 'info',
          phase: 'longlist',
          message: `Longlist completada - ${technologies.length || completeData?.count || 0} tecnologías encontradas`,
          details: completeData
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
