// Edge Function: Diagnóstico de modelos LLM inválidos
// Busca y opcionalmente corrige modelos inválidos en scouting_sessions y ai_model_settings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelos inválidos conocidos y sus reemplazos
const MODEL_FIXES: Record<string, string> = {
  "claude-3-7-sonnet-20250219": "claude-sonnet",
  "claude-3-5-sonnet-20241022": "claude-sonnet",
  "gpt-4o": "gpt-4.1",
  "gpt-4o-mini": "gpt-4.1-mini",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fix = url.searchParams.get("fix") === "true";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const report: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      fix_mode: fix,
      findings: {},
    };

    // 1. Check ai_model_settings
    const { data: modelSettings, error: settingsError } = await supabase
      .from("ai_model_settings")
      .select("*");

    if (settingsError) {
      report.ai_model_settings_error = settingsError.message;
    } else {
      const invalidSettings = modelSettings?.filter(
        (s) => Object.keys(MODEL_FIXES).some((invalid) => s.model?.includes(invalid))
      ) || [];

      report.findings = {
        ...report.findings as object,
        ai_model_settings: {
          total: modelSettings?.length || 0,
          invalid_count: invalidSettings.length,
          invalid_records: invalidSettings.map((s) => ({
            action_type: s.action_type,
            current_model: s.model,
            suggested_fix: MODEL_FIXES[s.model] || "claude-sonnet",
          })),
          all_settings: modelSettings?.map((s) => ({
            action_type: s.action_type,
            model: s.model,
          })),
        },
      };

      // Fix if requested
      if (fix && invalidSettings.length > 0) {
        const fixes = [];
        for (const setting of invalidSettings) {
          const newModel = MODEL_FIXES[setting.model] || "claude-sonnet";
          const { error: updateError } = await supabase
            .from("ai_model_settings")
            .update({ model: newModel, updated_at: new Date().toISOString() })
            .eq("action_type", setting.action_type);

          fixes.push({
            action_type: setting.action_type,
            old_model: setting.model,
            new_model: newModel,
            success: !updateError,
            error: updateError?.message,
          });
        }
        (report.findings as Record<string, unknown>).ai_model_settings_fixes = fixes;
      }
    }

    // 2. Check scouting_sessions for invalid models in config
    const { data: sessions, error: sessionsError } = await supabase
      .from("scouting_sessions")
      .select("session_id, status, config, started_at")
      .order("started_at", { ascending: false })
      .limit(50);

    if (sessionsError) {
      report.scouting_sessions_error = sessionsError.message;
    } else {
      const invalidSessions = sessions?.filter((s) => {
        const model = (s.config as Record<string, unknown>)?.model as string;
        return model && Object.keys(MODEL_FIXES).some((invalid) => model.includes(invalid));
      }) || [];

      const runningSessions = sessions?.filter((s) => s.status === "running") || [];

      report.findings = {
        ...report.findings as object,
        scouting_sessions: {
          total_checked: sessions?.length || 0,
          running_count: runningSessions.length,
          running_sessions: runningSessions.map((s) => ({
            session_id: s.session_id,
            started_at: s.started_at,
            model: (s.config as Record<string, unknown>)?.model,
          })),
          invalid_model_count: invalidSessions.length,
          invalid_sessions: invalidSessions.map((s) => ({
            session_id: s.session_id,
            status: s.status,
            started_at: s.started_at,
            current_model: (s.config as Record<string, unknown>)?.model,
            suggested_fix: MODEL_FIXES[(s.config as Record<string, unknown>)?.model as string] || "claude-sonnet",
          })),
          recent_sessions: sessions?.slice(0, 10).map((s) => ({
            session_id: s.session_id?.slice(0, 8) + "...",
            status: s.status,
            model: (s.config as Record<string, unknown>)?.model || "not set",
            started_at: s.started_at,
          })),
        },
      };

      // Fix if requested
      if (fix && invalidSessions.length > 0) {
        const fixes = [];
        for (const session of invalidSessions) {
          const oldModel = (session.config as Record<string, unknown>)?.model as string;
          const newModel = MODEL_FIXES[oldModel] || "claude-sonnet";
          const newConfig = { ...(session.config as Record<string, unknown>), model: newModel };

          const { error: updateError } = await supabase
            .from("scouting_sessions")
            .update({ config: newConfig })
            .eq("session_id", session.session_id);

          fixes.push({
            session_id: session.session_id,
            old_model: oldModel,
            new_model: newModel,
            success: !updateError,
            error: updateError?.message,
          });
        }
        (report.findings as Record<string, unknown>).scouting_sessions_fixes = fixes;
      }
    }

    // 3. Summary
    const settingsFindings = (report.findings as Record<string, unknown>).ai_model_settings as Record<string, unknown>;
    const sessionsFindings = (report.findings as Record<string, unknown>).scouting_sessions as Record<string, unknown>;

    report.summary = {
      ai_model_settings_invalid: settingsFindings?.invalid_count || 0,
      scouting_sessions_invalid: sessionsFindings?.invalid_model_count || 0,
      scouting_sessions_running: sessionsFindings?.running_count || 0,
      action_needed:
        ((settingsFindings?.invalid_count as number) || 0) > 0 ||
        ((sessionsFindings?.invalid_model_count as number) || 0) > 0,
    };

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
