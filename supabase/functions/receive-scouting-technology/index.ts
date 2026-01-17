import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scouting-secret",
};

// Field mapping from Railway simplified names to Lovable scouting_queue column names
const RAILWAY_TO_LOVABLE_FIELDS: Record<string, string> = {
  nombre: "Nombre de la tecnología",
  proveedor: "Proveedor / Empresa",
  pais: "País de origen",
  paises_actua: "Paises donde actua",
  web: "Web de la empresa",
  email: "Email de contacto",
  descripcion: "Descripción técnica breve",
  aplicacion: "Aplicación principal",
  tipo_sugerido: "Tipo de tecnología",
  subcategoria_sugerida: "Subcategoría",
  trl_estimado: "Grado de madurez (TRL)",
  ventaja_competitiva: "Ventaja competitiva clave",
  innovacion: "Porque es innovadora",
  casos_referencia: "Casos de referencia",
  comentarios: "Comentarios del analista",
  sector: "Sector y subsector",
};

interface RailwayPayload {
  nombre: string;
  proveedor?: string;
  pais?: string;
  paises_actua?: string;
  web?: string;
  email?: string;
  descripcion?: string;
  aplicacion?: string;
  tipo_sugerido?: string;
  subcategoria_sugerida?: string;
  trl_estimado?: number;
  ventaja_competitiva?: string;
  innovacion?: string;
  casos_referencia?: string;
  comentarios?: string;
  sector?: string;
  source?: string;
  source_url?: string;
  scouting_job_id?: string;
  relevance_score?: number;
  priority?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate authentication
    const scoutingSecret = req.headers.get("x-scouting-secret");
    const expectedSecret = Deno.env.get("SCOUTING_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("SCOUTING_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scoutingSecret || scoutingSecret !== expectedSecret) {
      console.warn("Unauthorized attempt to access receive-scouting-technology");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse payload
    const payload: RailwayPayload = await req.json();
    console.log("Received technology from Railway:", {
      nombre: payload.nombre,
      proveedor: payload.proveedor,
      scouting_job_id: payload.scouting_job_id,
    });

    // Validate required field
    if (!payload.nombre || payload.nombre.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: nombre" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for insert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicates using existing RPC
    const { data: duplicateCheck, error: duplicateError } = await supabase.rpc(
      "check_scouting_duplicate",
      {
        p_name: payload.nombre,
        p_provider: payload.proveedor || "",
      }
    );

    if (duplicateError) {
      console.error("Error checking duplicates:", duplicateError);
      // Continue anyway - better to insert possible duplicate than lose data
    } else if (duplicateCheck && duplicateCheck.length > 0) {
      const dupResult = duplicateCheck[0];
      if (dupResult.in_technologies) {
        console.warn(`Duplicate found in technologies: ${dupResult.existing_tech_id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Technology already exists in main database",
            duplicate: true,
            existing_id: dupResult.existing_tech_id,
            location: "technologies",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (dupResult.in_scouting) {
        console.warn(`Duplicate found in scouting_queue: ${dupResult.existing_scouting_id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Technology already in scouting queue",
            duplicate: true,
            existing_id: dupResult.existing_scouting_id,
            location: "scouting_queue",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build the record for scouting_queue with mapped field names
    const scoutingRecord: Record<string, unknown> = {
      // Direct mapped fields
      "Nombre de la tecnología": payload.nombre.trim(),
      "Proveedor / Empresa": payload.proveedor?.trim() || null,
      "País de origen": payload.pais?.trim() || null,
      "Paises donde actua": payload.paises_actua?.trim() || null,
      "Web de la empresa": payload.web?.trim() || null,
      "Email de contacto": payload.email?.trim() || null,
      "Descripción técnica breve": payload.descripcion?.trim() || null,
      "Aplicación principal": payload.aplicacion?.trim() || null,
      "Tipo de tecnología": payload.tipo_sugerido?.trim() || "Sin clasificar",
      "Subcategoría": payload.subcategoria_sugerida?.trim() || null,
      "Grado de madurez (TRL)": payload.trl_estimado || null,
      "Ventaja competitiva clave": payload.ventaja_competitiva?.trim() || null,
      "Porque es innovadora": payload.innovacion?.trim() || null,
      "Casos de referencia": payload.casos_referencia?.trim() || null,
      "Comentarios del analista": payload.comentarios?.trim() || null,
      "Sector y subsector": payload.sector?.trim() || null,
      "Fecha de scouting": new Date().toISOString().split("T")[0],
      "Estado del seguimiento": "Nuevo",
      // Queue-specific fields
      queue_status: "pending",
      source: payload.source || "railway_scouting",
      source_url: payload.source_url || null,
      priority: payload.priority || "normal",
      notes: payload.relevance_score 
        ? `Relevance score: ${payload.relevance_score}` 
        : null,
    };

    // Link to scouting session if provided
    // Note: scouting_job_id from Railway maps to a session in scouting_sessions
    // We could store this in notes or a dedicated field if needed
    if (payload.scouting_job_id) {
      scoutingRecord.notes = scoutingRecord.notes 
        ? `${scoutingRecord.notes} | Session: ${payload.scouting_job_id}`
        : `Session: ${payload.scouting_job_id}`;
    }

    // Insert into scouting_queue
    const { data: insertedTech, error: insertError } = await supabase
      .from("scouting_queue")
      .insert(scoutingRecord)
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting technology:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${insertError.message}`,
          code: insertError.code,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Technology inserted successfully:", {
      id: insertedTech.id,
      nombre: payload.nombre,
      proveedor: payload.proveedor,
    });

    // Optionally update scouting_sessions count if scouting_job_id provided
    if (payload.scouting_job_id) {
      const { error: updateError } = await supabase
        .from("scouting_sessions")
        .update({
          technologies_found: supabase.rpc("increment_counter", { 
            row_id: payload.scouting_job_id, 
            increment_by: 1 
          }),
        })
        .eq("session_id", payload.scouting_job_id);

      if (updateError) {
        // Non-critical - just log
        console.warn("Could not update session tech count:", updateError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: insertedTech.id,
        message: "Technology saved to scouting queue",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in receive-scouting-technology:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
