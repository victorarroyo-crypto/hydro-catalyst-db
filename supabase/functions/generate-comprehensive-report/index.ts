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

    const researchSummary = research?.map(r => ({
      titulo: r.title,
      resumen: r.summary,
      hallazgos: r.key_findings,
      tipo: r.source_type,
    })) || [];

    const solutionsSummary = solutions?.map(s => ({
      nombre: s.name,
      categoria: s.category,
      descripcion: s.description,
      ventajas: s.advantages,
      desventajas: s.disadvantages,
      proveedores: s.key_providers,
      trl: s.estimated_trl_range,
      costo: s.cost_range,
    })) || [];

    const longlistSummary = longlist?.map(l => ({
      tecnologia: l.technology_name,
      proveedor: l.provider,
      pais: l.country,
      descripcion: l.brief_description,
      trl: l.trl,
      aplicaciones: l.applications,
    })) || [];

    const shortlistWithEvals = shortlist?.map(s => {
      const eval_ = evaluations?.find(e => e.shortlist_id === s.id);
      return {
        tecnologia: s.longlist?.technology_name,
        proveedor: s.longlist?.provider,
        razon_seleccion: s.selection_reason,
        prioridad: s.priority,
        puntuacion: eval_?.overall_score,
        recomendacion: eval_?.recommendation,
        fortalezas: eval_?.strengths,
        debilidades: eval_?.weaknesses,
        oportunidades: eval_?.opportunities,
        amenazas: eval_?.threats,
        ventajas_competitivas: eval_?.competitive_advantages,
        barreras: eval_?.implementation_barriers,
      };
    }) || [];

    // Construir el prompt para generar el informe
    const prompt = `Eres un experto en scouting tecnológico. Genera un informe ejecutivo completo para el siguiente estudio.

IMPORTANTE: TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL. Si algún dato viene en inglés (como fortalezas, debilidades, oportunidades, amenazas), TRADÚCELO al español profesional.

## DATOS DEL ESTUDIO

**Nombre:** ${studyContext.nombre}
**Descripción:** ${studyContext.descripcion || 'No especificada'}
**Problema a resolver:** ${studyContext.problema || 'No especificado'}
**Contexto:** ${studyContext.contexto || 'No especificado'}
**Objetivos:** ${studyContext.objetivos?.join(', ') || 'No especificados'}
**Restricciones:** ${studyContext.restricciones?.join(', ') || 'No especificadas'}

## INVESTIGACIÓN REALIZADA (${researchSummary.length} fuentes)
${JSON.stringify(researchSummary, null, 2)}

## CATEGORÍAS DE SOLUCIONES IDENTIFICADAS (${solutionsSummary.length})
${JSON.stringify(solutionsSummary, null, 2)}

## LISTA LARGA DE TECNOLOGÍAS (${longlistSummary.length})
${JSON.stringify(longlistSummary, null, 2)}

## LISTA CORTA CON EVALUACIONES (${shortlistWithEvals.length})
(Nota: Los campos fortalezas, debilidades, oportunidades, amenazas pueden estar en inglés - tradúcelos al español)
${JSON.stringify(shortlistWithEvals, null, 2)}

---

Genera un informe estructurado en formato JSON con las siguientes secciones:

{
  "executive_summary": "Resumen ejecutivo de 2-3 párrafos que sintetice el estudio, principales hallazgos y recomendaciones clave",
  "methodology": "Descripción de la metodología de 6 fases utilizada: investigación, identificación de soluciones, lista larga, lista corta, evaluación y generación de informe",
  "problem_analysis": "Análisis profundo del problema, contexto y necesidades identificadas",
  "solutions_overview": "Panorama de las categorías de soluciones tecnológicas identificadas, con sus características principales",
  "technology_comparison": "Comparativa detallada de las tecnologías en la lista corta, incluyendo análisis SWOT (Fortalezas, Debilidades, Oportunidades, Amenazas) EN ESPAÑOL, puntuaciones y recomendaciones",
  "recommendations": "Recomendaciones estratégicas priorizadas basadas en las evaluaciones realizadas",
  "conclusions": "Conclusiones finales y próximos pasos sugeridos"
}

REGLAS OBLIGATORIAS:
- TODO el contenido debe estar en español profesional
- Si los datos del SWOT están en inglés, tradúcelos al español
- Sé específico y utiliza los datos proporcionados
- Si faltan datos en alguna sección, menciona que no hay información disponible
- Las recomendaciones deben ser accionables`;

    console.log('[generate-comprehensive-report] Llamando a Lovable AI...');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Llamar a Lovable AI (gemini-2.5-flash)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
    const aiContent = aiData.choices?.[0]?.message?.content;

    console.log('[generate-comprehensive-report] Respuesta de IA recibida');

    // Parsear el JSON de la respuesta
    let reportContent;
    try {
      // Extraer JSON del contenido (puede venir con markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON en la respuesta');
      }
    } catch (parseError) {
      console.error('[generate-comprehensive-report] Error parseando respuesta:', parseError);
      // Usar contenido como texto plano si no es JSON
      reportContent = {
        executive_summary: aiContent,
        methodology: '',
        problem_analysis: '',
        solutions_overview: '',
        technology_comparison: '',
        recommendations: '',
        conclusions: '',
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
        executive_summary: reportContent.executive_summary,
        methodology: reportContent.methodology,
        problem_analysis: reportContent.problem_analysis,
        solutions_overview: reportContent.solutions_overview,
        technology_comparison: reportContent.technology_comparison,
        recommendations: reportContent.recommendations,
        conclusions: reportContent.conclusions,
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
