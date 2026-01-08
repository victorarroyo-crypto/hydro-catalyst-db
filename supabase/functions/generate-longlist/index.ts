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

// Response from search_technologies_by_keywords RPC
interface TechnologySearchResult {
  id: string;
  nombre: string;
  proveedor: string | null;
  pais: string | null;
  trl: number | null;
  descripcion: string | null;
  aplicacion: string | null;
  tipo: string | null;
  subcategoria: string | null;
  web: string | null;
  ventaja: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
  sector: string | null;
  relevance_score: number;
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

    // Step 2: Search technologies using RPC (handles special column names properly)
    const { data: technologies, error: searchError } = await supabase
      .rpc('search_technologies_by_keywords', {
        p_keywords: keywords,
        p_min_trl: min_trl,
        p_max_results: max_results
      });

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

    // Step 4: Filter duplicates (RPC already calculates relevance_score)
    const techResults = (technologies || []) as TechnologySearchResult[];
    const scoredTechnologies = techResults
      .filter((tech: TechnologySearchResult) => !existingIds.has(tech.id) && !existingNames.has(tech.nombre?.toLowerCase()));

    // Step 5: Insert into study_longlist
    const insertData = scoredTechnologies.map((tech: TechnologySearchResult) => ({
      study_id,
      existing_technology_id: tech.id,
      technology_name: tech.nombre,
      provider: tech.proveedor,
      country: tech.pais,
      trl: tech.trl,
      brief_description: tech.descripcion,
      web: tech.web,
      type_suggested: tech.tipo,
      subcategory_suggested: tech.subcategoria,
      ventaja_competitiva: tech.ventaja,
      innovacion: tech.innovacion,
      casos_referencia: tech.casos_referencia,
      sector: tech.sector,
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
            // Build webhook URL for Railway to send results back
            const webhookUrl = `${supabaseUrl}/functions/v1/study-webhook`;
            
            const railwayPayload = {
              study_id,
              session_id: session.id,
              problem_statement,
              webhook_url: webhookUrl,
              webhook_secret: webhookSecret
            };

            console.log(`[generate-longlist] Calling Railway at ${railwayApiUrl}/api/study/web-scouting`);

            const response = await fetch(`${railwayApiUrl}/api/study/web-scouting`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Study-Secret': Deno.env.get('X_STUDY_SECRET') || 'wt-study-2026-7f9a3b2c1d8e5f4a',
              },
              body: JSON.stringify(railwayPayload),
            });

            let responseBody: string | null = null;
            try {
              responseBody = await response.text();
            } catch {
              responseBody = null;
            }

            if (!response.ok) {
              console.error(
                `[generate-longlist] Railway error ${response.status}:`,
                responseBody
              );
            }

            railwayResponse = {
              triggered: response.ok,
              session_id: session.id,
              status: response.status,
              error_body: response.ok ? null : responseBody,
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
