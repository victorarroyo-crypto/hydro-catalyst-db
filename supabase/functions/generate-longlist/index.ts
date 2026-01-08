import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Gateway for keyword extraction
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface LonglistRequest {
  study_id: string;
  problem_statement: string;
  context?: string;
  objectives?: string[];
  constraints?: string[];
  min_trl?: number;
  max_results?: number;
  trigger_railway?: boolean; // Whether to also trigger Railway web search
}

// Extract keywords from problem statement using Lovable AI
async function extractKeywords(problemStatement: string, context?: string, objectives?: string[]): Promise<string[]> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!lovableApiKey) {
    console.warn("LOVABLE_API_KEY not set, using basic keyword extraction");
    // Fallback: basic extraction
    return problemStatement
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 10);
  }

  try {
    const prompt = `Analiza el siguiente problema tecnológico y extrae las palabras clave más relevantes para buscar tecnologías relacionadas en una base de datos.

PROBLEMA:
${problemStatement}

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}

${objectives?.length ? `OBJETIVOS:\n${objectives.join('\n')}` : ''}

Extrae exactamente 8-12 palabras clave que sean:
1. Términos técnicos específicos del problema
2. Tipos de tecnología aplicables (ej: MBR, sensores, IoT)
3. Procesos industriales mencionados (ej: tratamiento, filtración)
4. Sectores/industrias (ej: farmacéutica, alimentaria)
5. Incluye variantes en español e inglés cuando aplique

Responde SOLO con un JSON array de strings, sin explicación:
["keyword1", "keyword2", ...]`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a technical keyword extraction assistant. Always respond with valid JSON arrays only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Rate limited by AI gateway, using fallback");
      } else if (response.status === 402) {
        console.warn("Payment required for AI gateway, using fallback");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const keywords = JSON.parse(jsonMatch[0]);
      console.log("AI extracted keywords:", keywords);
      return keywords;
    }
    
    throw new Error("Could not parse keywords from AI response");
    
  } catch (error) {
    console.error("Error extracting keywords with AI:", error);
    // Fallback to basic extraction
    return problemStatement
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 10);
  }
}

// Build PostgREST filter for searching technologies
function buildSearchFilter(keywords: string[]): string {
  // PostgREST .or() syntax:
  //   col.ilike.%value%,othercol.ilike.%value%
  // If column names contain spaces/special chars, wrap with double-quotes.
  const columns = [
    '"Descripción técnica breve"',
    '"Aplicación principal"',
    '"Nombre de la tecnología"',
    '"Sector y subsector"',
    '"Proveedor / Empresa"',
    '"Tipo de tecnología"',
  ];

  const sanitize = (s: string) =>
    s
      .replace(/[,%]/g, " ") // avoid breaking PostgREST syntax
      .replace(/[_]/g, " ") // '_' is a wildcard in LIKE
      .replace(/[()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const conditions: string[] = [];
  for (const kw of keywords) {
    const term = sanitize(kw);
    if (!term) continue;

    for (const col of columns) {
      conditions.push(`${col}.ilike.%${term}%`);
    }
  }

  return conditions.join(',');
}

serve(async (req) => {
  // Handle CORS preflight
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Auth client for user validation
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub;

    // Check user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = roles?.map(r => r.role) || [];
    const allowedRoles = ['admin', 'supervisor', 'analyst'];
    
    if (!userRoles.some(role => allowedRoles.includes(role))) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const body: LonglistRequest = await req.json();
    const {
      study_id,
      problem_statement,
      context,
      objectives,
      constraints,
      min_trl = 7,
      max_results = 50,
      trigger_railway = false
    } = body;

    if (!study_id || !problem_statement) {
      return new Response(JSON.stringify({ error: 'Missing study_id or problem_statement' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[generate-longlist] Starting for study ${study_id}`);
    console.log(`[generate-longlist] Problem: ${problem_statement.substring(0, 100)}...`);

    // Step 1: Extract keywords using AI
    const keywords = await extractKeywords(problem_statement, context, objectives);
    console.log(`[generate-longlist] Extracted ${keywords.length} keywords:`, keywords);

    // Step 2: Search technologies in database
    const searchConditions = buildSearchFilter(keywords);
    
    const { data: technologies, error: searchError } = await supabase
      .from('technologies')
      .select(`
        id,
        "Nombre de la tecnología",
        "Proveedor / Empresa",
        "País de origen",
        "Grado de madurez (TRL)",
        "Descripción técnica breve",
        "Aplicación principal",
        "Tipo de tecnología",
        "Subcategoría",
        "Web de la empresa",
        "Ventaja competitiva clave",
        status
      `)
      .gte('"Grado de madurez (TRL)"', min_trl)
      .eq('status', 'active')
      .or(searchConditions)
      .order('"Grado de madurez (TRL)"', { ascending: false })
      .limit(max_results);

    if (searchError) {
      console.error('[generate-longlist] Search error:', searchError);
      throw searchError;
    }

    console.log(`[generate-longlist] Found ${technologies?.length || 0} matching technologies`);

    // Step 3: Get existing longlist items to avoid duplicates
    const { data: existingItems } = await supabase
      .from('study_longlist')
      .select('existing_technology_id, technology_name')
      .eq('study_id', study_id);

    const existingIds = new Set(existingItems?.map(i => i.existing_technology_id).filter(Boolean));
    const existingNames = new Set(existingItems?.map(i => i.technology_name?.toLowerCase()).filter(Boolean));

    // Step 4: Calculate relevance score for each technology
    const scoredTechnologies = (technologies || [])
      .filter(tech => !existingIds.has(tech.id) && !existingNames.has(tech["Nombre de la tecnología"]?.toLowerCase()))
      .map(tech => {
        let score = 50; // Base score
        
        // Score based on TRL
        const trl = tech["Grado de madurez (TRL)"] || 5;
        score += (trl - 5) * 5; // Higher TRL = higher score
        
        // Score based on keyword matches
        const techText = [
          tech["Nombre de la tecnología"],
          tech["Descripción técnica breve"],
          tech["Aplicación principal"],
          tech["Tipo de tecnología"]
        ].join(' ').toLowerCase();
        
        const matchedKeywords = keywords.filter(kw => techText.includes(kw.toLowerCase()));
        score += matchedKeywords.length * 10;
        
        return { ...tech, relevance_score: Math.min(100, score) };
      })
      .sort((a, b) => b.relevance_score - a.relevance_score);

    // Step 5: Insert into study_longlist
    const insertData = scoredTechnologies.map(tech => ({
      study_id,
      existing_technology_id: tech.id,
      technology_name: tech["Nombre de la tecnología"],
      provider: tech["Proveedor / Empresa"],
      country: tech["País de origen"],
      trl: tech["Grado de madurez (TRL)"],
      brief_description: tech["Descripción técnica breve"],
      web: tech["Web de la empresa"],
      type_suggested: tech["Tipo de tecnología"],
      subcategory_suggested: tech["Subcategoría"],
      ventaja_competitiva: tech["Ventaja competitiva clave"],
      source: 'database',
      confidence_score: tech.relevance_score / 100,
      inclusion_reason: `Coincidencia con keywords: ${keywords.slice(0, 3).join(', ')}`,
      already_in_db: true,
      added_by: userId
    }));

    let insertedCount = 0;
    if (insertData.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('study_longlist')
        .insert(insertData)
        .select('id');

      if (insertError) {
        console.error('[generate-longlist] Insert error:', insertError);
        // Continue anyway, some might have been inserted
      } else {
        insertedCount = inserted?.length || 0;
      }
    }

    console.log(`[generate-longlist] Inserted ${insertedCount} technologies from DB`);

    // Step 6: Optionally trigger Railway for web search
    let railwayResponse = null;
    if (trigger_railway) {
      const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
      const webhookSecret = Deno.env.get('STUDY_WEBHOOK_SECRET');
      
      if (railwayApiUrl && webhookSecret) {
        try {
          // Create a session for Railway
          const { data: session, error: sessionError } = await supabase
            .from('study_sessions')
            .insert({
              study_id,
              session_type: 'longlist',
              status: 'pending',
              config: {
                problem_statement,
                context,
                objectives,
                constraints,
                min_trl,
                keywords,
                max_technologies: 20
              }
            })
            .select('id')
            .single();

          if (!sessionError && session) {
            const railwayPayload = {
              study_id,
              session_id: session.id,
              problem_statement,
              context,
              objectives,
              constraints,
              search_focus: keywords.slice(0, 5),
              min_trl,
              max_technologies: 20
            };

            const response = await fetch(`${railwayApiUrl}/api/study/longlist`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': webhookSecret,
                'X-User-Id': userId,
                'X-User-Roles': userRoles.join(',')
              },
              body: JSON.stringify(railwayPayload)
            });

            railwayResponse = {
              triggered: response.ok,
              session_id: session.id,
              status: response.status
            };

            console.log(`[generate-longlist] Railway triggered:`, railwayResponse);
          }
        } catch (railwayError) {
          console.error('[generate-longlist] Railway trigger error:', railwayError);
          railwayResponse = { triggered: false, error: String(railwayError) };
        }
      }
    }

    // Return results
    return new Response(JSON.stringify({
      success: true,
      keywords,
      database_results: {
        found: technologies?.length || 0,
        inserted: insertedCount,
        skipped_duplicates: (technologies?.length || 0) - scoredTechnologies.length
      },
      railway: railwayResponse,
      message: `Se añadieron ${insertedCount} tecnologías de la base de datos`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-longlist] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
