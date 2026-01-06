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
  url: string;
  headers: Record<string, string>;
  method: 'PUT' | 'PATCH' | 'POST';
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; body: JsonValue; rawText: string; allow: string | null }> {
  const res = await fetch(params.url, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...params.headers,
    },
    body: JSON.stringify(params.payload),
  });

  const allow = res.headers.get('allow');
  const text = await res.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  return { ok: res.ok, status: res.status, body, rawText: text, allow };
}

function queueUrl(id: string) {
  return `${API_BASE}/api/scouting/queue/${id}`;
}

function queueStatusUrl(id: string) {
  return `${API_BASE}/api/scouting/queue/${id}/status`;
}

async function callExternalGet(params: {
  url: string;
  headers: Record<string, string>;
}): Promise<{ ok: boolean; status: number; body: JsonValue; rawText: string }> {
  const res = await fetch(params.url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...params.headers,
    },
  });

  const text = await res.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  return { ok: res.ok, status: res.status, body, rawText: text };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { id, status, formData } = body;
    console.log(`[scouting-update-queue] Received: id=${id}, status=${status}, hasFormData=${!!formData}`);

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetro id es obligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // At least one of status or formData must be provided
    if (!status && !formData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Debe proporcionar status o formData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // The Railway backend requires admin credentials for queue updates.
    const forwardHeaders: Record<string, string> = {
      'X-User-Id': 'admin',
      'X-User-Role': 'admin',
    };

    // If we have formData (updating technology details), we PATCH the queue item
    if (formData) {
      console.log(`[scouting-update-queue] Updating formData for queue item ${id}`);
      
      const updatePayload: Record<string, unknown> = { ...formData };
      if (status) {
        updatePayload.status = status;
      }
      
      const patchRes = await callExternalUpdate({
        id,
        url: queueUrl(id),
        headers: forwardHeaders,
        method: 'PATCH',
        payload: updatePayload,
      });

      console.log(`[scouting-update-queue] PATCH formData response: ok=${patchRes.ok}, status=${patchRes.status}`);

      if (!patchRes.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Error al actualizar datos en backend de scouting',
            details: { status: patchRes.status, body: patchRes.body },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ success: true, result: patchRes.body }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Status-only update (original logic)
    const PATCH: 'PATCH' = 'PATCH';
    const PUT: 'PUT' = 'PUT';

    const attemptsList: Array<{
      label: string;
      url: string;
      method: 'PUT' | 'PATCH' | 'POST';
      payload: Record<string, unknown>;
    }> = [
      { label: `PATCH /api/scouting/queue/${id} (status)`, url: queueUrl(id), method: PATCH, payload: { status } },
      { label: `PATCH /api/scouting/queue/${id} (id+status)`, url: queueUrl(id), method: PATCH, payload: { id, status } },
      { label: `PUT /api/scouting/queue/${id}/status (status)`, url: queueStatusUrl(id), method: PUT, payload: { status } },
      { label: `PUT /api/scouting/queue/${id}/status (id+status)`, url: queueStatusUrl(id), method: PUT, payload: { id, status } },
    ];

    let attempt: { ok: boolean; status: number; body: JsonValue; rawText: string; allow: string | null } | null = null;

    for (const a of attemptsList) {
      console.log(`[scouting-update-queue] Trying ${a.label}`);
      attempt = await callExternalUpdate({
        id,
        url: a.url,
        headers: forwardHeaders,
        method: a.method,
        payload: a.payload,
      });

      if (!attempt.ok) {
        console.log(
          `[scouting-update-queue] Failed ${a.label}: status=${attempt.status}, allow=${attempt.allow ?? 'n/a'}, body=${attempt.rawText}`,
        );
        continue;
      }

      break;
    }

    if (!attempt) {
      throw new Error('No se pudo ejecutar ninguna llamada al backend externo');
    }

    console.log(`[scouting-update-queue] External response: ok=${attempt.ok}, status=${attempt.status}, body=${attempt.rawText}`);

    if (!attempt.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al actualizar en backend de scouting',
          details: { status: attempt.status, body: attempt.body },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
