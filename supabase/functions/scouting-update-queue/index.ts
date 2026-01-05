// Lovable Cloud Function: proxy updates to the external scouting backend (avoids browser CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

type JsonValue = string | number | boolean | null | Record<string, unknown> | unknown[];

function formatError(error: unknown): { message: string; details: unknown } {
  if (error instanceof Error) {
    return { message: error.message, details: { name: error.name, stack: error.stack } };
  }
  return { message: String(error), details: null };
}

async function callExternalUpdate(params: {
  id: string;
  status: string;
  headers: Record<string, string>;
  method: 'PUT' | 'PATCH' | 'POST';
}): Promise<{ ok: boolean; status: number; body: JsonValue; rawText: string }> {
  const url = `${API_BASE}/api/scouting/queue/${params.id}`;

  const res = await fetch(url, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...params.headers,
    },
    body: JSON.stringify({ status: params.status }),
  });

  const text = await res.text();
  const body = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })() : null;

  return { ok: res.ok, status: res.status, body, rawText: text };
}

// Try a different endpoint pattern: /api/scouting/queue/{id}/status
async function callExternalUpdateAction(params: {
  id: string;
  status: string;
  headers: Record<string, string>;
}): Promise<{ ok: boolean; status: number; body: JsonValue; rawText: string }> {
  const url = `${API_BASE}/api/scouting/queue/${params.id}/status`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...params.headers,
    },
    body: JSON.stringify({ status: params.status }),
  });

  const text = await res.text();
  const body = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })() : null;

  return { ok: res.ok, status: res.status, body, rawText: text };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { id, status } = await req.json();
    console.log(`[scouting-update-queue] Received: id=${id}, status=${status}`);

    if (!id || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetros inválidos: id y status son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // The Railway backend requires admin credentials for queue updates.
    // Use fixed admin credentials for this internal service-to-service call.
    const forwardHeaders: Record<string, string> = {
      'X-User-Id': 'admin',
      'X-User-Role': 'admin',
    };

    // Try multiple HTTP methods since the external backend behavior is unclear.
    // Order: POST (common for actions), PATCH (partial update), PUT (full update)
    console.log(`[scouting-update-queue] External update: POST /api/scouting/queue/${id}/status (X-User-Id=admin, X-User-Role=admin)`);
    
    // First try a more RESTful action endpoint pattern
    let attempt = await callExternalUpdateAction({ id, status, headers: forwardHeaders });
    
    if (!attempt.ok) {
      console.log(`[scouting-update-queue] POST to action endpoint failed: status=${attempt.status}, body=${attempt.rawText}`);
      console.log(`[scouting-update-queue] Trying PATCH /api/scouting/queue/${id}`);
      attempt = await callExternalUpdate({ id, status, headers: forwardHeaders, method: 'PATCH' });
    }

    if (!attempt.ok) {
      console.log(`[scouting-update-queue] PATCH failed: status=${attempt.status}, body=${attempt.rawText}`);
      console.log(`[scouting-update-queue] Trying POST /api/scouting/queue/${id}`);
      attempt = await callExternalUpdate({ id, status, headers: forwardHeaders, method: 'POST' });
    }

    console.log(`[scouting-update-queue] External response: ok=${attempt.ok}, status=${attempt.status}, body=${attempt.rawText}`);

    if (!attempt.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al actualizar en backend de scouting',
          details: { status: attempt.status, body: attempt.body },
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, result: attempt.body }), {
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
