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
  status: string;
  headers: Record<string, string>;
  method: 'PUT' | 'PATCH' | 'POST';
  payloadShape?: 'status_only' | 'id_and_status';
  statusKey?: 'status' | 'estado';
  payloadOverride?: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; body: JsonValue; rawText: string; allow: string | null }> {
  const statusKey = params.statusKey ?? 'status';

  const payload =
    params.payloadOverride ??
    (params.payloadShape === 'id_and_status'
      ? { id: params.id, [statusKey]: params.status }
      : { [statusKey]: params.status });

  const res = await fetch(params.url, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...params.headers,
    },
    body: JSON.stringify(payload),
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

    // Intentamos leer el item actual para poder enviar un PATCH con payload completo
    // (algunos backends fallan con 500 si solo reciben {status}).
    let existingItem: Record<string, unknown> | null = null;
    const getRes = await callExternalGet({ url: queueUrl(id), headers: forwardHeaders });
    if (getRes.ok && getRes.body && typeof getRes.body === 'object' && !Array.isArray(getRes.body)) {
      existingItem = getRes.body as Record<string, unknown>;
      console.log(`[scouting-update-queue] Loaded existing queue item for patch payload keys=${Object.keys(existingItem).slice(0, 20).join(',')}`);
    } else {
      console.log(`[scouting-update-queue] Could not load existing item: status=${getRes.status}, body=${getRes.rawText}`);
    }

    const PATCH: 'PATCH' = 'PATCH';
    const PUT: 'PUT' = 'PUT';
    const POST: 'POST' = 'POST';

    const attemptsList: Array<{
      label: string;
      url: string;
      method: 'PUT' | 'PATCH' | 'POST';
      payloadShape?: 'status_only' | 'id_and_status';
      statusKey?: 'status' | 'estado';
      payloadOverride?: Record<string, unknown>;
    }> = [
      // /queue/{id} parece aceptar PATCH (Allow=PATCH). Probamos varios payloads.
      ...(existingItem
        ? [
            {
              label: `PATCH /api/scouting/queue/${id} (full payload + status)`,
              url: queueUrl(id),
              method: PATCH,
              payloadOverride: { ...existingItem, status },
            },
          ]
        : []),
      { label: `PATCH /api/scouting/queue/${id} (status)`, url: queueUrl(id), method: PATCH, payloadShape: 'status_only', statusKey: 'status' },
      { label: `PATCH /api/scouting/queue/${id} (estado)`, url: queueUrl(id), method: PATCH, payloadShape: 'status_only', statusKey: 'estado' },
      { label: `PATCH /api/scouting/queue/${id} (id+status)`, url: queueUrl(id), method: PATCH, payloadShape: 'id_and_status', statusKey: 'status' },

      // /queue/{id}/status parece permitir PUT (Allow=PUT)
      { label: `PUT /api/scouting/queue/${id}/status (status)`, url: queueStatusUrl(id), method: PUT, payloadShape: 'status_only', statusKey: 'status' },
      { label: `PUT /api/scouting/queue/${id}/status (estado)`, url: queueStatusUrl(id), method: PUT, payloadShape: 'status_only', statusKey: 'estado' },
      { label: `PUT /api/scouting/queue/${id}/status (id+status)`, url: queueStatusUrl(id), method: PUT, payloadShape: 'id_and_status', statusKey: 'status' },

      // Mantener algunos fallbacks
      { label: `POST /api/scouting/queue/${id}`, url: queueUrl(id), method: POST, payloadShape: 'status_only', statusKey: 'status' },
      { label: `POST /api/scouting/queue/${id}/status`, url: queueStatusUrl(id), method: POST, payloadShape: 'status_only', statusKey: 'status' },
    ];

    let attempt: { ok: boolean; status: number; body: JsonValue; rawText: string; allow: string | null } | null = null;

    for (const a of attemptsList) {
      console.log(`[scouting-update-queue] Trying ${a.label}`);
      attempt = await callExternalUpdate({
        id,
        url: a.url,
        status,
        headers: forwardHeaders,
        method: a.method,
        payloadShape: a.payloadShape,
        statusKey: a.statusKey,
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
