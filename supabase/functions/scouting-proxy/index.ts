// Lovable Cloud Function: proxy requests to the external scouting backend (avoids browser CORS)
// Security: Implements endpoint allowlist, method validation, path traversal protection
// IDEMPOTENCY: Uses ATOMIC INSERT to guarantee only ONE request per requestId calls Railway

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

const API_BASE = 'https://watertech-scouting-production.up.railway.app';

// Allowlist of permitted endpoint patterns
const ALLOWED_ENDPOINT_PATTERNS = [
  // Scouting queue operations
  /^\/api\/scouting\/queue\/?$/,
  /^\/api\/scouting\/queue\/[a-f0-9-]+\/?$/,
  // Sources management
  /^\/api\/scouting\/sources\/?$/,
  /^\/api\/scouting\/sources\/[a-f0-9-]+\/?$/,
  // Technologies
  /^\/api\/scouting\/technologies\/?$/,
  /^\/api\/scouting\/technologies\/[a-f0-9-]+\/?$/,
  // Stats and sync
  /^\/api\/scouting\/stats\/?$/,
  /^\/api\/scouting\/sync\/?$/,
  /^\/api\/scouting\/import\/?$/,
  /^\/api\/scouting\/export\/?$/,
  // Scouting execution - run, status, cancel, history
  /^\/api\/scouting\/run\/?$/,
  /^\/api\/scouting\/history\/?$/,
  /^\/api\/scouting\/status\/[a-f0-9-]+\/?$/,
  /^\/api\/scouting\/cancel\/[a-f0-9-]+\/?$/,
  /^\/api\/scouting\/[a-f0-9-]+\/cancel\/?$/,
  /^\/api\/scouting\/jobs\/[a-f0-9-]+\/cancel\/?$/,
  /^\/api\/scouting\/cancel\/?$/,
  // LLM models endpoint
  /^\/api\/llm\/models\/?$/,
  // Health check
  /^\/api\/health\/?$/,
];

// Allowed HTTP methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Validate endpoint against allowlist
function isEndpointAllowed(endpoint: string): boolean {
  // Prevent path traversal attacks
  if (endpoint.includes('..') || endpoint.includes('//')) {
    return false;
  }
  
  // Normalize the endpoint
  const normalizedEndpoint = endpoint.toLowerCase().replace(/\/+$/, '');
  
  // Check against allowlist patterns
  return ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(normalizedEndpoint));
}

// Validate HTTP method
function isMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase());
}

// Check if this is the /api/scouting/run endpoint
function isScoutingRunEndpoint(endpoint: string): boolean {
  return /^\/api\/scouting\/run\/?$/i.test(endpoint.toLowerCase().replace(/\/+$/, ''));
}

// Generate a stable hash of the payload for deduplication
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload || {});
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[scouting-proxy] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado: token de autenticación requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify the JWT and get user claims
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create service role client for idempotency table operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fix: Use getUser() instead of getClaims() for compatibility
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      console.warn('[scouting-proxy] Invalid JWT token:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticación inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    
    // Get user role from database
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    const userRole = roleData?.role || 'client_basic';
    
    // Only allow internal users (admin, supervisor, analyst) to use this proxy
    const allowedRoles = ['admin', 'supervisor', 'analyst'];
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[scouting-proxy] User ${userId} with role ${userRole} denied access`);
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permisos para acceder a este servicio' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse and validate request body
    const { endpoint, method = 'GET', body, requestId } = await req.json();
    
    // Also check header for idempotency key
    const idempotencyKey = requestId || req.headers.get('X-Idempotency-Key');
    
    // Validate endpoint is provided
    if (!endpoint || typeof endpoint !== 'string') {
      console.warn('[scouting-proxy] Missing or invalid endpoint parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetro "endpoint" es obligatorio y debe ser una cadena' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate endpoint against allowlist
    if (!isEndpointAllowed(endpoint)) {
      console.warn(`[scouting-proxy] Blocked disallowed endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Endpoint no permitido' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate HTTP method
    const normalizedMethod = (typeof method === 'string' ? method : 'GET').toUpperCase();
    if (!isMethodAllowed(normalizedMethod)) {
      console.warn(`[scouting-proxy] Blocked disallowed method: ${normalizedMethod}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Método HTTP no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ============ ATOMIC IDEMPOTENCY LOGIC FOR /api/scouting/run ============
    if (isScoutingRunEndpoint(endpoint) && normalizedMethod === 'POST') {
      // Require idempotency key for /run endpoint
      if (!idempotencyKey) {
        console.warn('[scouting-proxy] Missing requestId/idempotency key for /run endpoint');
        return new Response(
          JSON.stringify({ success: false, error: 'Se requiere requestId para iniciar scouting' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const payloadHash = hashPayload(body);
      console.log(`[scouting-proxy] 📥 /run request:`, {
        requestId: idempotencyKey,
        userId,
        payloadHash,
        timestamp: new Date().toISOString(),
      });

      // === STEP 0: Check for recent PENDING request with same payload_hash (race protection) ===
      // This catches double-clicks that generate different requestIds but same payload
      const { data: recentPending, error: recentError } = await supabaseAdmin
        .from('scouting_run_requests')
        .select('request_id, job_id, status, created_at')
        .eq('user_id', userId)
        .eq('payload_hash', payloadHash)
        .eq('status', 'pending')
        .gt('created_at', new Date(Date.now() - 30 * 1000).toISOString()) // last 30 seconds
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentError && recentPending && recentPending.request_id !== idempotencyKey) {
        console.log(`[scouting-proxy] ⏳ PAYLOAD DUPLICATE: Another pending request with same payload`, {
          thisRequestId: idempotencyKey,
          existingRequestId: recentPending.request_id,
          payloadHash,
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Solicitud duplicada detectada, espera unos segundos',
            details: { 
              status: 409, 
              error_type: 'duplicate_payload',
              existing_request_id: recentPending.request_id
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // === STEP 1: Attempt ATOMIC INSERT (will fail on duplicate) ===
      const { error: insertError } = await supabaseAdmin
        .from('scouting_run_requests')
        .insert({
          request_id: idempotencyKey,
          user_id: userId,
          status: 'pending',
          payload_hash: payloadHash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour TTL
        });

      if (insertError) {
        // Check if this is a unique constraint violation (duplicate request_id)
        const isDuplicate = insertError.code === '23505' || 
                           insertError.message?.includes('duplicate') ||
                           insertError.message?.includes('unique');

        if (isDuplicate) {
          console.log(`[scouting-proxy] 🔁 Duplicate requestId detected: ${idempotencyKey}`);
          
          // === STEP 2: Fetch the existing record ===
          const { data: existingRequest, error: fetchError } = await supabaseAdmin
            .from('scouting_run_requests')
            .select('request_id, job_id, status, created_at')
            .eq('request_id', idempotencyKey)
            .single();

          if (fetchError || !existingRequest) {
            console.error('[scouting-proxy] Error fetching duplicate record:', fetchError);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Error verificando idempotencia, reintenta con nuevo requestId',
                details: { error_type: 'idempotency_check_failed' }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }

          // === STEP 3: Return based on existing record status ===
          if (existingRequest.job_id) {
            // Already processed successfully - return the same job_id (IDEMPOTENT HIT)
            console.log(`[scouting-proxy] ✅ IDEMPOTENT HIT:`, {
              requestId: idempotencyKey,
              jobId: existingRequest.job_id,
            });
            return new Response(
              JSON.stringify({ 
                success: true, 
                data: { job_id: existingRequest.job_id },
                idempotent: true,
                message: 'Request ya procesado, devolviendo job_id existente'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          } else if (existingRequest.status === 'pending') {
            // Still processing (race condition) - tell client to wait
            console.log(`[scouting-proxy] ⏳ RACE DETECTED: requestId=${idempotencyKey} still pending`);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Request en proceso, espera unos segundos',
                details: { status: 409, error_type: 'processing' }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          } else if (existingRequest.status === 'failed') {
            // Previous attempt failed - allow retry by deleting old record and re-inserting
            console.log(`[scouting-proxy] 🔄 Previous failed, allowing retry for requestId=${idempotencyKey}`);
            await supabaseAdmin
              .from('scouting_run_requests')
              .delete()
              .eq('request_id', idempotencyKey);
            
            // Re-insert with pending status
            const { error: reinsertError } = await supabaseAdmin
              .from('scouting_run_requests')
              .insert({
                request_id: idempotencyKey,
                user_id: userId,
                status: 'pending',
                payload_hash: payloadHash,
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              });
            
            if (reinsertError) {
              console.error('[scouting-proxy] Error re-inserting after failed:', reinsertError);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'Error procesando retry, genera nuevo requestId',
                  details: { error_type: 'retry_failed' }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
              );
            }
            // Continue to call Railway
          }
        } else {
          // Some other database error - FAIL CLOSED (do NOT call Railway)
          console.error('[scouting-proxy] Database error during idempotency check:', insertError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Error de base de datos, reintenta',
              details: { error_type: 'database_error' }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        console.log(`[scouting-proxy] 🏆 WON INSERT RACE for requestId=${idempotencyKey}`);
      }

      // === STEP 4: This request WON the race - proceed to call Railway ===
      console.log(`[scouting-proxy] 🚀 AUTHORIZED to call Railway:`, {
        requestId: idempotencyKey,
        userId,
        payloadHash,
      });
    }
    // ============ END ATOMIC IDEMPOTENCY LOGIC ============

    console.log(`[scouting-proxy] ${normalizedMethod} ${endpoint} by user ${userId} (${userRole})`);

    const url = `${API_BASE}${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method: normalizedMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Pass authenticated user identity instead of hardcoded admin
        'X-User-Id': userId,
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole,
        // Pass idempotency key to Railway if present
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
    };

    if (body && normalizedMethod !== 'GET') {
      // Validate body is an object (basic validation)
      if (typeof body !== 'object' || body === null) {
        return new Response(
          JSON.stringify({ success: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log(`[scouting-proxy] Response status=${res.status}`);

    // ============ UPDATE IDEMPOTENCY RECORD BASED ON RESPONSE ============
    // NOTE: Only update columns that exist in the schema: job_id, status, expires_at
    // The table does NOT have an 'updated_at' column
    if (isScoutingRunEndpoint(endpoint) && normalizedMethod === 'POST' && idempotencyKey) {
      if (res.ok && data?.job_id) {
        // Success - store the job_id (CRITICAL for idempotency to work)
        const { error: updateError, count } = await supabaseAdmin
          .from('scouting_run_requests')
          .update({ 
            job_id: data.job_id, 
            status: 'completed',
            // Extend expiry since this is a valid completed request
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour TTL
          })
          .eq('request_id', idempotencyKey);

        if (updateError) {
          console.error('[scouting-proxy] ❌ CRITICAL: Failed to store job_id:', {
            requestId: idempotencyKey,
            jobId: data.job_id,
            error: updateError,
          });
        } else {
          console.log(`[scouting-proxy] ✅ STORED job_id:`, {
            requestId: idempotencyKey,
            jobId: data.job_id,
            rowsUpdated: count,
          });
        }
      } else if (!res.ok) {
        // Failed - mark as failed so retry is allowed
        const { error: updateError } = await supabaseAdmin
          .from('scouting_run_requests')
          .update({ status: 'failed' })
          .eq('request_id', idempotencyKey);

        if (updateError) {
          console.error('[scouting-proxy] Error updating idempotency record to failed:', updateError);
        } else {
          console.log(`[scouting-proxy] ❌ Marked requestId=${idempotencyKey} as failed, status=${res.status}`);
        }
      }
    }
    // ============ END UPDATE IDEMPOTENCY RECORD ============

    if (!res.ok) {
      // Enhanced error handling for specific status codes
      let errorMessage = `Error del backend: ${res.status}`;
      let errorDetails: Record<string, unknown> = { status: res.status, body: data };

      // Special handling for 409 Conflict (scouting already running)
      if (res.status === 409) {
        errorMessage = data?.detail?.message || data?.message || 'Ya hay un scouting en ejecución';
        errorDetails = {
          status: 409,
          error_type: 'conflict',
          message: errorMessage,
          active_job_id: data?.detail?.job_id || data?.job_id,
          cooldown_seconds: data?.detail?.cooldown || data?.cooldown,
          body: data,
        };
        console.log(`[scouting-proxy] 409 Conflict: ${errorMessage}, job_id: ${errorDetails.active_job_id}`);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: errorDetails,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scouting-proxy] Exception: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
