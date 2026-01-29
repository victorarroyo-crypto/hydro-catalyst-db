

# Plan: Crear Edge Function Dedicada `deep-advisor`

## Contexto

Actualmente los endpoints de Background Jobs (`/api/advisor/deep/start`, `/api/advisor/deep/status/{job_id}`) se invocan a través de `advisor-railway-proxy` usando un patrón wrapper donde el `endpoint` se pasa en el body. El usuario propone crear una Edge Function dedicada con rutas RESTful directas.

## Comparación de Arquitecturas

| Aspecto | Actual (via proxy) | Propuesto (función dedicada) |
|:--------|:-------------------|:-----------------------------|
| URL para iniciar | `POST /advisor-railway-proxy` + body `{endpoint: "/api/advisor/deep/start"}` | `POST /deep-advisor/start` |
| URL para status | `POST /advisor-railway-proxy` + body `{endpoint: "/api/advisor/deep/status/xxx"}` | `GET /deep-advisor/status/xxx` |
| Complejidad cliente | Wrapper adicional | Llamadas HTTP directas |
| Mantenimiento | Un proxy genérico | Función específica |

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|:--------|:-------|:------------|
| `supabase/functions/deep-advisor/index.ts` | CREAR | Nueva Edge Function con rutas REST |
| `supabase/config.toml` | MODIFICAR | Añadir configuración para `deep-advisor` |
| `src/lib/advisorProxy.ts` | MODIFICAR | Añadir helper `callDeepAdvisor` para la nueva función |
| `src/hooks/useDeepAdvisorJob.ts` | MODIFICAR | Usar nuevas URLs directas |

## Implementación

### 1. Nueva Edge Function: `deep-advisor/index.ts`

```typescript
// supabase/functions/deep-advisor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Timeout for Railway requests (2 minutes should be enough for non-streaming)
const REQUEST_TIMEOUT_MS = 120000;

async function proxyToRailway(
  railwayUrl: string, 
  endpoint: string, 
  options?: { method?: string; body?: unknown }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const fetchOptions: RequestInit = {
      method: options?.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };
    
    if (options?.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(`${railwayUrl}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Timeout', message: 'Request timed out' }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/deep-advisor', '').replace('/functions/v1/deep-advisor', '');
  const method = req.method;

  const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
  if (!railwayApiUrl) {
    return new Response(JSON.stringify({ error: 'Backend not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // POST /start - Iniciar nuevo job
    if (path === '/start' && method === 'POST') {
      const body = await req.json();
      
      // Validar user_id
      if (!body.user_id) {
        return new Response(JSON.stringify({ error: 'user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, '/api/advisor/deep/start', { 
        method: 'POST', 
        body 
      });
    }

    // GET /status/:job_id - Consultar estado del job
    if (path.startsWith('/status/') && method === 'GET') {
      const jobId = path.split('/status/')[1];
      
      if (!jobId || !/^[\w-]+$/.test(jobId)) {
        return new Response(JSON.stringify({ error: 'Invalid job_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, `/api/advisor/deep/status/${jobId}`);
    }

    // GET /jobs?user_id=xxx - Listar jobs de un usuario
    if (path === '/jobs' && method === 'GET') {
      const userId = url.searchParams.get('user_id');
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id query param is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return proxyToRailway(railwayApiUrl, `/api/advisor/deep/jobs?user_id=${userId}`);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[deep-advisor] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      message: error instanceof Error ? error.message : 'Unknown' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 2. Configuración en `config.toml`

Añadir:
```toml
[functions.deep-advisor]
verify_jwt = false
```

### 3. Nuevo Helper en `advisorProxy.ts`

```typescript
const DEEP_ADVISOR_URL = `${SUPABASE_URL}/functions/v1/deep-advisor`;

export interface DeepJobStartParams {
  user_id: string;
  message: string;
  chat_id?: string;
  deep_mode?: boolean;
  synthesis_model?: string;
  analysis_model?: string;
  search_model?: string;
  enable_web_search?: boolean;
  enable_rag?: boolean;
  attachments?: Array<{ url: string; type: string; name: string }>;
}

export interface DeepJobStartResponse {
  job_id: string;
  chat_id?: string;
}

export interface DeepJobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  phase?: string;
  phase_detail?: string;
  progress_percent: number;
  agent_status: Record<string, 'pending' | 'running' | 'complete' | 'failed'>;
  error?: string;
  result?: {
    content: string;
    sources: Array<{ type: string; name: string; url?: string }>;
    facts_extracted: Array<{ type: string; key: string; value: string }>;
    chat_id: string;
    has_context?: boolean;
  };
}

/**
 * Start a new Deep Advisor background job
 */
export async function startDeepJob(params: DeepJobStartParams): Promise<ProxyResponse<DeepJobStartResponse>> {
  try {
    const response = await fetch(`${DEEP_ADVISOR_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: data.error || data.message || `HTTP ${response.status}`, status: response.status };
    }
    
    return { data, error: null, status: response.status };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Network error', status: 0 };
  }
}

/**
 * Get status of a Deep Advisor job
 */
export async function getDeepJobStatus(jobId: string): Promise<ProxyResponse<DeepJobStatus>> {
  try {
    const response = await fetch(`${DEEP_ADVISOR_URL}/status/${jobId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: data.error || data.message || `HTTP ${response.status}`, status: response.status };
    }
    
    return { data, error: null, status: response.status };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Network error', status: 0 };
  }
}
```

### 4. Actualizar Hook para Usar Nuevos Helpers

En `useDeepAdvisorJob.ts`, cambiar de `callAdvisorProxy` a los helpers directos:

```typescript
// Antes:
import { callAdvisorProxy } from '@/lib/advisorProxy';
// ...
const { data, error } = await callAdvisorProxy<{ job_id: string }>({
  endpoint: '/api/advisor/deep/start',
  method: 'POST',
  payload: params,
});

// Después:
import { startDeepJob, getDeepJobStatus } from '@/lib/advisorProxy';
// ...
const { data, error } = await startDeepJob(params);

// Y para el polling:
// Antes:
const { data, error } = await callAdvisorProxy<JobStatus>({
  endpoint: `/api/advisor/deep/status/${id}`,
  method: 'GET',
});

// Después:
const { data, error } = await getDeepJobStatus(id);
```

## Ventajas de la Función Dedicada

1. **URLs más limpias**: `GET /deep-advisor/status/xxx` vs wrapper complejo
2. **Mejor debugging**: Logs específicos para Deep Advisor
3. **Menor coupling**: El hook no depende del proxy genérico
4. **Validación específica**: Validar `job_id` y `user_id` en la función
5. **Futura extensibilidad**: Añadir `/cancel`, `/retry`, etc.

## Notas Técnicas

- El proxy genérico `advisor-railway-proxy` seguirá funcionando para SSE streaming y otros endpoints
- La función dedicada solo maneja los endpoints REST de background jobs
- No se elimina nada del proxy existente, esta es una adición
