import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAILWAY_URL = Deno.env.get("RAILWAY_URL") || "https://watertech-scouting-production.up.railway.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get project ID from body or URL
    let projectId: string | null = null;
    
    // Try to get from body first
    try {
      const body = await req.json();
      projectId = body.projectId || body.project_id;
    } catch {
      // No JSON body, try URL path
    }
    
    // Fallback to URL path if not in body
    if (!projectId) {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const projectIdIndex = pathParts.findIndex(p => p === 'cost-consulting-analyze') + 1;
      projectId = pathParts[projectIdIndex] || null;
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "Project ID is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[cost-consulting-analyze] Starting analysis for project: ${projectId}`);

    // Forward the request to Railway - call extract endpoint
    const railwayUrl = `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/extract`;
    console.log(`[cost-consulting-analyze] Forwarding to: ${railwayUrl}`);

    const response = await fetch(railwayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log(`[cost-consulting-analyze] Railway response (${response.status}): ${responseText.substring(0, 500)}`);

    // Parse response if JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    // Handle "already processing" as success - it means extraction is underway
    if (response.status === 400 && responseData.detail?.includes("ya está siendo procesado")) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Extracción ya en progreso",
          alreadyProcessing: true 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Always return 200 to avoid FunctionsHttpError in frontend
    return new Response(
      JSON.stringify({
        success: response.ok,
        ...responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[cost-consulting-analyze] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to start analysis";
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: String(error)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
