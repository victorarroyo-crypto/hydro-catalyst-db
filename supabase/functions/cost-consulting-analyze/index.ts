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
    // Extract project ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const projectIdIndex = pathParts.findIndex(p => p === 'cost-consulting-analyze') + 1;
    const projectId = pathParts[projectIdIndex];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[cost-consulting-analyze] Starting analysis for project: ${projectId}`);

    // Forward the request to Railway - call extract endpoint (not analyze)
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

    return new Response(
      JSON.stringify(responseData),
      {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[cost-consulting-analyze] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to start analysis";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
