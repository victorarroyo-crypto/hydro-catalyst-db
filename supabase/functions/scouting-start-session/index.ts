import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  session_id: string;
  config?: Record<string, unknown> | null;
  status?: "running" | "completed" | "failed" | "cancelled";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[scouting-start-session] Missing backend credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Backend not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[scouting-start-session] No Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      console.error("[scouting-start-session] Unauthorized", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[scouting-start-session] Authenticated user: ${user.id}`);

    const body = (await req.json()) as RequestBody;
    const session_id = (body.session_id || "").trim();

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const status = body.status ?? "running";
    const now = new Date().toISOString();

    console.log(`[scouting-start-session] Upserting session ${session_id} status=${status}`);

    const { data, error } = await supabase
      .from("scouting_sessions")
      .upsert(
        {
          session_id,
          status,
          started_at: now,
          current_phase: "initialization",
          progress_percentage: 0,
          config: body.config ?? {},
          updated_at: now,
        },
        { onConflict: "session_id" },
      )
      .select("session_id,status,started_at,updated_at")
      .single();

    if (error) {
      console.error("[scouting-start-session] Upsert error", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[scouting-start-session] Error", e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
