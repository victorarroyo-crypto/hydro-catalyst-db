// Lovable Cloud Function: proxy updates to the external scouting backend (avoids browser CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

function formatError(error: unknown): { message: string; details: unknown } {
  if (error instanceof Error) {
    return { message: error.message, details: { name: error.name, stack: error.stack } };
  }
  return { message: String(error), details: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { id, status } = await req.json();
    console.log(`[scouting-update-queue] Received request: id=${id}, status=${status}`);

    if (!id || !status) {
      console.error('[scouting-update-queue] Missing required params');
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetros inválidos: id y status son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = `${API_BASE}/api/scouting/queue/${id}`;
    console.log(`[scouting-update-queue] Calling external API: PUT ${url}`);

    // Try PUT first (some APIs prefer PUT over PATCH for updates)
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    const text = await res.text();
    console.log(`[scouting-update-queue] External API response: status=${res.status}, body=${text}`);
    
    const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

    if (!res.ok) {
      console.error(`[scouting-update-queue] External API error: ${res.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al actualizar en backend de scouting',
          details: { status: res.status, body },
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[scouting-update-queue] Update successful');
    return new Response(JSON.stringify({ success: true, result: body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const formatted = formatError(error);
    console.error(`[scouting-update-queue] Exception: ${formatted.message}`);
    return new Response(JSON.stringify({ success: false, error: formatted.message, details: formatted.details }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
