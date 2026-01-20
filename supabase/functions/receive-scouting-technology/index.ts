import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scouting-secret",
};

// External DB config (where scouting_queue actually lives)
const EXTERNAL_URL = "https://ktzhrlcvluaptixngrsh.supabase.co";

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
    console.log("📥 Received technology from Railway:", {
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

    // Initialize clients
    // Local Supabase - for checking approved technologies
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const localSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // External Supabase - where scouting_queue actually lives (source of truth)
    const externalServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    if (!externalServiceKey) {
      console.error("EXTERNAL_SUPABASE_SERVICE_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "External DB not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const externalSupabase = createClient(EXTERNAL_URL, externalServiceKey);

    // Normalize for comparison
    const normalizedName = payload.nombre.trim().toLowerCase();
    const normalizedProvider = (payload.proveedor || "").trim().toLowerCase();

    // ====== DUPLICATE CHECK 1: External DB scouting_queue (snake_case schema) ======
    console.log("🔍 Checking duplicates in external scouting_queue...");
    const { data: existingInQueue, error: queueCheckError } = await externalSupabase
      .from("scouting_queue")
      .select("id, nombre, proveedor")
      .or(`nombre.ilike.%${normalizedName}%,proveedor.ilike.%${normalizedProvider}%`)
      .limit(10);

    if (queueCheckError) {
      console.warn("⚠️ Error checking external queue (continuing):", queueCheckError.message);
    } else if (existingInQueue && existingInQueue.length > 0) {
      // Check for exact or close matches
      const exactMatch = existingInQueue.find(item => 
        item.nombre?.toLowerCase().trim() === normalizedName ||
        (normalizedProvider && item.proveedor?.toLowerCase().trim() === normalizedProvider)
      );
      
      if (exactMatch) {
        console.warn(`🚫 Duplicate found in external scouting_queue: ${exactMatch.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Technology already in scouting queue (external DB)",
            duplicate: true,
            existing_id: exactMatch.id,
            location: "scouting_queue_external",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ====== DUPLICATE CHECK 2: External DB rejected_technologies ======
    console.log("🔍 Checking duplicates in external rejected_technologies...");
    const { data: existingRejected, error: rejectedCheckError } = await externalSupabase
      .from("rejected_technologies")
      .select("id, nombre, proveedor")
      .or(`nombre.ilike.%${normalizedName}%,proveedor.ilike.%${normalizedProvider}%`)
      .limit(5);

    if (rejectedCheckError) {
      console.warn("⚠️ Error checking rejected (continuing):", rejectedCheckError.message);
    } else if (existingRejected && existingRejected.length > 0) {
      const exactMatch = existingRejected.find(item =>
        item.nombre?.toLowerCase().trim() === normalizedName
      );
      if (exactMatch) {
        console.warn(`🚫 Technology was previously rejected: ${exactMatch.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Technology was previously rejected",
            duplicate: true,
            existing_id: exactMatch.id,
            location: "rejected_technologies",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ====== DUPLICATE CHECK 3: External DB approved technologies ======
    console.log("🔍 Checking duplicates in external technologies...");
    const { data: existingApproved, error: approvedCheckError } = await externalSupabase
      .from("technologies")
      .select("id, nombre, proveedor")
      .or(`nombre.ilike.%${normalizedName}%,proveedor.ilike.%${normalizedProvider}%`)
      .limit(5);

    if (approvedCheckError) {
      console.warn("⚠️ Error checking approved (continuing):", approvedCheckError.message);
    } else if (existingApproved && existingApproved.length > 0) {
      const exactMatch = existingApproved.find(item =>
        item.nombre?.toLowerCase().trim() === normalizedName
      );
      if (exactMatch) {
        console.warn(`🚫 Technology already approved in main DB: ${exactMatch.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Technology already exists in main database",
            duplicate: true,
            existing_id: exactMatch.id,
            location: "technologies",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ====== DUPLICATE CHECK 4: Local DB technologies (Lovable Cloud) ======
    console.log("🔍 Checking duplicates in local technologies...");
    const { data: localTechCheck, error: localCheckError } = await localSupabase
      .from("technologies")
      .select("id")
      .ilike('"Nombre de la tecnología"', `%${normalizedName}%`)
      .limit(1);

    if (localCheckError) {
      console.warn("⚠️ Error checking local technologies:", localCheckError.message);
    } else if (localTechCheck && localTechCheck.length > 0) {
      console.warn(`🚫 Technology exists in local Lovable Cloud DB: ${localTechCheck[0].id}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Technology already exists in Lovable Cloud database",
          duplicate: true,
          existing_id: localTechCheck[0].id,
          location: "technologies_local",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== NO DUPLICATES - INSERT INTO EXTERNAL DB ======
    console.log("✅ No duplicates found, inserting into external DB...");

    // Build the record for external scouting_queue (snake_case schema)
    const externalRecord: Record<string, unknown> = {
      nombre: payload.nombre.trim(),
      proveedor: payload.proveedor?.trim() || null,
      pais_origen: payload.pais?.trim() || null,
      paises_actua: payload.paises_actua?.trim() || null,
      web: payload.web?.trim() || null,
      email: payload.email?.trim() || null,
      descripcion: payload.descripcion?.trim() || null,
      aplicacion: payload.aplicacion?.trim() || null,
      tipo_tecnologia: payload.tipo_sugerido?.trim() || "Sin clasificar",
      subcategoria: payload.subcategoria_sugerida?.trim() || null,
      trl: payload.trl_estimado || null,
      ventaja_competitiva: payload.ventaja_competitiva?.trim() || null,
      innovacion: payload.innovacion?.trim() || null,
      casos_referencia: payload.casos_referencia?.trim() || null,
      comentarios: payload.comentarios?.trim() || null,
      sector: payload.sector?.trim() || null,
      fecha_scouting: new Date().toISOString().split("T")[0],
      estado: "Nuevo",
      status: "pending",
      source: payload.source || "railway_scouting",
      source_url: payload.source_url || null,
      priority: payload.priority || "normal",
      notas: payload.relevance_score 
        ? `Relevance score: ${payload.relevance_score}` 
        : null,
      scouting_job_id: payload.scouting_job_id || null,
    };

    // Insert into external scouting_queue
    const { data: insertedTech, error: insertError } = await externalSupabase
      .from("scouting_queue")
      .insert(externalRecord)
      .select("id")
      .single();

    if (insertError) {
      console.error("❌ Error inserting into external DB:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${insertError.message}`,
          code: insertError.code,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Technology inserted successfully in external DB:", {
      id: insertedTech.id,
      nombre: payload.nombre,
      proveedor: payload.proveedor,
    });

    // Update session tech count in external DB if scouting_job_id provided
    if (payload.scouting_job_id) {
      try {
        const { data: session } = await externalSupabase
          .from("scouting_sessions")
          .select("technologies_found")
          .eq("session_id", payload.scouting_job_id)
          .single();

        const currentCount = session?.technologies_found || 0;
        const { error: updateError } = await externalSupabase
          .from("scouting_sessions")
          .update({ technologies_found: currentCount + 1 })
          .eq("session_id", payload.scouting_job_id);

        if (updateError) {
          console.warn("⚠️ Could not update session tech count:", updateError.message);
        } else {
          console.log(`📊 Updated session ${payload.scouting_job_id} tech count: ${currentCount + 1}`);
        }
      } catch (countError) {
        console.warn("⚠️ Error updating tech count:", countError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: insertedTech.id,
        message: "Technology saved to external scouting queue",
        location: "external_db",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Unexpected error in receive-scouting-technology:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
