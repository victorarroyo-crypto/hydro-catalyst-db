import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { study_id } = await req.json();

    if (!study_id) {
      return new Response(
        JSON.stringify({ error: 'study_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-comprehensive-report] Iniciando para estudio: ${study_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener datos del estudio
    const { data: study, error: studyError } = await supabase
      .from('scouting_studies')
      .select('*')
      .eq('id', study_id)
      .single();

    if (studyError || !study) {
      console.error('[generate-comprehensive-report] Error obteniendo estudio:', studyError);
      return new Response(
        JSON.stringify({ error: 'Estudio no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-comprehensive-report] Estudio: ${study.name}`);

    // 2. Obtener investigación
    const { data: research } = await supabase
      .from('study_research')
      .select('*')
      .eq('study_id', study_id);

    console.log(`[generate-comprehensive-report] Investigación: ${research?.length || 0} fuentes`);

    // 3. Obtener soluciones
    const { data: solutions } = await supabase
      .from('study_solutions')
      .select('*')
      .eq('study_id', study_id);

    console.log(`[generate-comprehensive-report] Soluciones: ${solutions?.length || 0} categorías`);

    // 4. Obtener longlist
    const { data: longlist } = await supabase
      .from('study_longlist')
      .select('*')
      .eq('study_id', study_id);

    console.log(`[generate-comprehensive-report] Longlist: ${longlist?.length || 0} tecnologías`);

    // 5. Obtener shortlist con longlist relacionada
    const { data: shortlist } = await supabase
      .from('study_shortlist')
      .select(`
        *,
        longlist:study_longlist(*)
      `)
      .eq('study_id', study_id);

    console.log(`[generate-comprehensive-report] Shortlist: ${shortlist?.length || 0} tecnologías`);

    // 6. Obtener evaluaciones
    const { data: evaluations } = await supabase
      .from('study_evaluations')
      .select('*')
      .eq('study_id', study_id);

    console.log(`[generate-comprehensive-report] Evaluaciones: ${evaluations?.length || 0}`);

    // Preparar contexto para la IA
    const studyContext = {
      nombre: study.name,
      descripcion: study.description,
      problema: study.problem_statement,
      contexto: study.context,
      objetivos: study.objectives || [],
      restricciones: study.constraints || [],
    };

    const researchSummary = research?.slice(0, 20).map(r => ({
      titulo: r.title,
      resumen: r.summary?.substring(0, 200),
      hallazgos: r.key_findings?.slice(0, 3),
      tipo: r.source_type,
    })) || [];

    const solutionsSummary = solutions?.slice(0, 10).map(s => ({
      nombre: s.name,
      categoria: s.category,
      descripcion: s.description?.substring(0, 150),
      ventajas: s.advantages?.slice(0, 3),
      desventajas: s.disadvantages?.slice(0, 3),
      proveedores: s.key_providers?.slice(0, 3),
    })) || [];

    const shortlistWithEvals = shortlist?.map(s => {
      const eval_ = evaluations?.find(e => e.shortlist_id === s.id);
      return {
        tecnologia: s.longlist?.technology_name,
        proveedor: s.longlist?.provider,
        pais: s.longlist?.country,
        descripcion: s.longlist?.brief_description?.substring(0, 150),
        razon_seleccion: s.selection_reason,
        prioridad: s.priority,
        puntuacion: eval_?.overall_score,
        recomendacion: eval_?.recommendation,
        fortalezas: eval_?.strengths?.slice(0, 3),
        debilidades: eval_?.weaknesses?.slice(0, 3),
        oportunidades: eval_?.opportunities?.slice(0, 3),
        amenazas: eval_?.threats?.slice(0, 3),
        ventajas_competitivas: eval_?.competitive_advantages?.slice(0, 3),
        barreras: eval_?.implementation_barriers?.slice(0, 3),
      };
    }) || [];

    // Construir el prompt para generar el informe
    const systemPrompt = `Eres un experto consultor en vigilancia tecnológica y scouting de innovación. 
Tu tarea es generar informes ejecutivos profesionales EN ESPAÑOL.

REGLAS OBLIGATORIAS DE FORMATO:
- NO uses asteriscos (**) para negritas - el texto se formateará automáticamente
- NO uses markdown en las respuestas (ni *, ni **, ni _, ni __)
- NO uses tablas markdown (| columna | valor |)
- Usa texto plano estructurado con listas numeradas y viñetas simples
- Los nombres de tecnologías van en texto normal, el sistema los destacará
- Para SWOT, usa: "Fortalezas:", "Debilidades:", "Oportunidades:", "Amenazas:" sin asteriscos

REGLAS DE CONTENIDO:
- TODO el contenido DEBE estar en ESPAÑOL profesional
- Si algún dato viene en inglés, tradúcelo (nombres de tecnologías pueden mantenerse)
- Sé específico y utiliza los datos proporcionados
- Las recomendaciones deben ser accionables y priorizadas
- El tono debe ser ejecutivo y profesional`;

    const userPrompt = `Genera un informe ejecutivo completo para el siguiente estudio de vigilancia tecnológica.

## DATOS DEL ESTUDIO

**Nombre:** ${studyContext.nombre}
**Descripción:** ${studyContext.descripcion || 'No especificada'}
**Problema a resolver:** ${studyContext.problema || 'No especificado'}
**Contexto:** ${studyContext.contexto || 'No especificado'}
**Objetivos:** ${studyContext.objetivos?.join(', ') || 'No especificados'}
**Restricciones:** ${studyContext.restricciones?.join(', ') || 'No especificadas'}

## INVESTIGACIÓN REALIZADA (${researchSummary.length} fuentes analizadas)
${JSON.stringify(researchSummary, null, 2)}

## CATEGORÍAS DE SOLUCIONES IDENTIFICADAS (${solutionsSummary.length})
${JSON.stringify(solutionsSummary, null, 2)}

## LISTA CORTA DE TECNOLOGÍAS CON EVALUACIONES (${shortlistWithEvals.length})
${JSON.stringify(shortlistWithEvals, null, 2)}

Usa la función generate_report para generar el informe completo EN ESPAÑOL.`;

    console.log('[generate-comprehensive-report] Llamando a Lovable AI con tool calling...');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar tool calling para output estructurado
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_report',
              description: 'Genera un informe ejecutivo estructurado en español',
              parameters: {
                type: 'object',
                properties: {
                  executive_summary: {
                    type: 'string',
                    description: 'Resumen ejecutivo de 2-3 párrafos que sintetice el estudio, principales hallazgos y recomendaciones clave. EN ESPAÑOL.'
                  },
                  methodology: {
                    type: 'string',
                    description: 'Descripción de la metodología de 6 fases utilizada: investigación, identificación de soluciones, lista larga, lista corta, evaluación y generación de informe. EN ESPAÑOL.'
                  },
                  problem_analysis: {
                    type: 'string',
                    description: 'Análisis profundo del problema, contexto y necesidades identificadas. EN ESPAÑOL.'
                  },
                  solutions_overview: {
                    type: 'string',
                    description: 'Panorama de las categorías de soluciones tecnológicas identificadas, con sus características principales. EN ESPAÑOL.'
                  },
                  technology_comparison: {
                    type: 'string',
                    description: 'Comparativa de tecnologías en TEXTO PLANO (sin markdown ni asteriscos). Para cada tecnología: nombre, proveedor, puntuación, y análisis SWOT con formato "Fortalezas: descripción" (sin asteriscos). EN ESPAÑOL.'
                  },
                  recommendations: {
                    type: 'string',
                    description: 'Recomendaciones estratégicas priorizadas basadas en las evaluaciones realizadas. EN ESPAÑOL.'
                  },
                  conclusions: {
                    type: 'string',
                    description: 'Conclusiones finales y próximos pasos sugeridos. EN ESPAÑOL.'
                  }
                },
                required: ['executive_summary', 'methodology', 'problem_analysis', 'solutions_overview', 'technology_comparison', 'recommendations', 'conclusions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_report' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-comprehensive-report] Error de AI:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error generando informe con IA', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('[generate-comprehensive-report] Respuesta de IA recibida');

    // Extraer el contenido del tool call
    let reportContent;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function?.arguments) {
        reportContent = JSON.parse(toolCall.function.arguments);
        console.log('[generate-comprehensive-report] Tool call parseado correctamente');
      } else {
        // Fallback: intentar parsear content como JSON
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            reportContent = JSON.parse(jsonMatch[0]);
            console.log('[generate-comprehensive-report] JSON extraído del content');
          } else {
            throw new Error('No se encontró tool call ni JSON en la respuesta');
          }
        } else {
          throw new Error('Respuesta vacía de la IA');
        }
      }
    } catch (parseError) {
      console.error('[generate-comprehensive-report] Error parseando respuesta:', parseError);
      console.error('[generate-comprehensive-report] aiData:', JSON.stringify(aiData, null, 2).substring(0, 1000));
      
      // Fallback con mensaje de error claro
      reportContent = {
        executive_summary: 'Error al generar el informe. Por favor, inténtelo de nuevo.',
        methodology: 'No se pudo generar la metodología.',
        problem_analysis: 'No se pudo generar el análisis del problema.',
        solutions_overview: 'No se pudo generar el panorama de soluciones.',
        technology_comparison: 'No se pudo generar la comparativa tecnológica.',
        recommendations: 'No se pudieron generar las recomendaciones.',
        conclusions: 'No se pudieron generar las conclusiones.',
      };
    }

    // Obtener la última versión del informe
    const { data: existingReports } = await supabase
      .from('study_reports')
      .select('version')
      .eq('study_id', study_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existingReports?.[0]?.version || 0) + 1;

    // Guardar el informe en la base de datos
    const { data: newReport, error: insertError } = await supabase
      .from('study_reports')
      .insert({
        study_id,
        title: `Informe Final - ${study.name}`,
        version: nextVersion,
        generated_by: 'ai',
        executive_summary: reportContent.executive_summary || '',
        methodology: reportContent.methodology || '',
        problem_analysis: reportContent.problem_analysis || '',
        solutions_overview: reportContent.solutions_overview || '',
        technology_comparison: reportContent.technology_comparison || '',
        recommendations: reportContent.recommendations || '',
        conclusions: reportContent.conclusions || '',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-comprehensive-report] Error guardando informe:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error guardando informe', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-comprehensive-report] Informe creado: ${newReport.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report: newReport,
        stats: {
          research: research?.length || 0,
          solutions: solutions?.length || 0,
          longlist: longlist?.length || 0,
          shortlist: shortlist?.length || 0,
          evaluations: evaluations?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-comprehensive-report] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Error interno', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
