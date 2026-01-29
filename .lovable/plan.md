
# Plan: Migrar Deep Advisor de SSE a Background Jobs + Polling

## Contexto del Problema

El backend de Railway tiene un **timeout de 5 minutos** para requests HTTP. El Deep Advisor con 4 agentes analizando documentos puede tardar más de 5 minutos, causando que el stream SSE se corte antes de completar aunque tengamos keep-alive pings.

La solución es cambiar a una arquitectura de **Background Jobs + Polling** que elimina la dependencia de conexiones HTTP largas.

## Nueva Arquitectura

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Cliente)                                               │
│  └── useDeepAdvisorJob                                           │
│       ├── POST /api/advisor/deep/start → Recibe job_id (~500ms) │
│       └── GET /api/advisor/deep/status/{job_id} cada 5s         │
└─────────────────────────────────────────────────────────────────┘
                              │ ▲
                              │ │ Respuestas cortas (<1s cada una)
                              ▼ │
┌─────────────────────────────────────────────────────────────────┐
│  advisor-railway-proxy (Edge Function)                           │
│  └── Proxy simple sin SSE (timeout 30s por request)             │
└─────────────────────────────────────────────────────────────────┘
                              │ ▲
                              ▼ │
┌─────────────────────────────────────────────────────────────────┐
│  Railway Backend                                                 │
│  ├── POST /start: Crea job, retorna job_id                       │
│  ├── GET /status/{job_id}: Retorna estado + progreso            │
│  └── Background worker: Procesa sin límite de tiempo            │
└─────────────────────────────────────────────────────────────────┘
```

## Ventajas

| Aspecto | SSE Actual | Background Jobs |
|:--------|:-----------|:----------------|
| Timeout máximo | 10 min (limitado por Railway) | ∞ (sin límite) |
| Reconexión | Pierde estado completo | Automática vía localStorage |
| Complejidad proxy | Alta (TransformStream, pings) | Baja (requests simples) |
| Recarga de página | Pierde todo | Continúa donde estaba |
| Múltiples pestañas | Cada una consume recursos | Comparten job |

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|:--------|:-------|:------------|
| `src/hooks/useDeepAdvisorJob.ts` | CREAR | Hook de polling con persistencia localStorage |
| `src/pages/advisor/AdvisorChat.tsx` | MODIFICAR | Usar nuevo hook en lugar de useDeepAdvisorStream |
| `src/components/advisor/streaming/StreamingProgress.tsx` | MODIFICAR | Aceptar datos del polling (progress_percent) |
| `supabase/functions/advisor-railway-proxy/index.ts` | MODIFICAR | Añadir endpoints `/deep/start` y `/deep/status/*` |

## Implementación Detallada

### 1. Nuevo Hook: `useDeepAdvisorJob.ts`

```typescript
// src/hooks/useDeepAdvisorJob.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { callAdvisorProxy } from '@/lib/advisorProxy';

interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  phase?: string;
  phase_detail?: string;
  progress_percent: number;
  agent_status: Record<string, 'pending' | 'running' | 'complete' | 'failed'>;
  error?: string;
  result?: {
    content: string;
    sources: any[];
    facts: any[];
    chat_id: string;
  };
}

interface StartJobParams {
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

interface UseDeepAdvisorJobOptions {
  pollingInterval?: number; // default 5000ms
  onProgress?: (status: JobStatus) => void;
  onComplete?: (result: JobStatus['result']) => void;
  onError?: (error: string) => void;
}

const STORAGE_KEY = 'deep_advisor_active_job';

export function useDeepAdvisorJob(options: UseDeepAdvisorJobOptions = {}) {
  const { pollingInterval = 5000, onProgress, onComplete, onError } = options;
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<number | null>(null);

  // Start a new job
  const startJob = useCallback(async (params: StartJobParams): Promise<string> => {
    try {
      const { data, error } = await callAdvisorProxy<{ job_id: string }>({
        endpoint: '/api/advisor/deep/start',
        method: 'POST',
        payload: params,
      });
      
      if (error || !data?.job_id) {
        throw new Error(error || 'No job_id returned');
      }
      
      const newJobId = data.job_id;
      setJobId(newJobId);
      setIsPolling(true);
      setStatus({ 
        job_id: newJobId, 
        status: 'pending', 
        progress_percent: 0, 
        agent_status: {} 
      });
      
      // Persist for reconnection
      localStorage.setItem(STORAGE_KEY, newJobId);
      
      return newJobId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start job';
      onError?.(msg);
      throw err;
    }
  }, [onError]);

  // Poll for status
  const pollStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await callAdvisorProxy<JobStatus>({
        endpoint: `/api/advisor/deep/status/${id}`,
        method: 'GET',
      });
      
      if (error || !data) {
        console.warn('[useDeepAdvisorJob] Poll error:', error);
        return false; // Continue polling
      }
      
      setStatus(data);
      onProgress?.(data);
      
      if (data.status === 'complete') {
        setIsPolling(false);
        localStorage.removeItem(STORAGE_KEY);
        onComplete?.(data.result);
        return true; // Stop
      }
      
      if (data.status === 'failed') {
        setIsPolling(false);
        localStorage.removeItem(STORAGE_KEY);
        onError?.(data.error || 'Job failed');
        return true; // Stop
      }
      
      return false; // Continue
    } catch (err) {
      console.error('[useDeepAdvisorJob] Poll exception:', err);
      return false; // Continue on error
    }
  }, [onProgress, onComplete, onError]);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !jobId) return;
    
    const poll = async () => {
      const shouldStop = await pollStatus(jobId);
      if (!shouldStop && isPolling) {
        pollingRef.current = window.setTimeout(poll, pollingInterval);
      }
    };
    
    poll();
    
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [isPolling, jobId, pollStatus, pollingInterval]);

  // Resume from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem(STORAGE_KEY);
    if (savedJobId) {
      setJobId(savedJobId);
      setIsPolling(true);
    }
  }, []);

  // Cancel polling
  const cancel = useCallback(() => {
    setIsPolling(false);
    localStorage.removeItem(STORAGE_KEY);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }
    // Optionally call backend to cancel job
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cancel();
    setJobId(null);
    setStatus(null);
  }, [cancel]);

  return {
    startJob,
    cancel,
    reset,
    jobId,
    status,
    isPolling,
    isRunning: status?.status === 'running' || status?.status === 'pending',
    isComplete: status?.status === 'complete',
    progress: status?.progress_percent || 0,
    phase: status?.phase || '',
    phaseDetail: status?.phase_detail || '',
    agentStatus: status?.agent_status || {},
    result: status?.result,
    error: status?.error,
  };
}
```

### 2. Modificar Edge Function: Añadir Endpoints

En `advisor-railway-proxy/index.ts`:

```typescript
// Añadir a ALLOWED_ENDPOINT_PATTERNS:
/^\/api\/advisor\/deep\/start$/,
/^\/api\/advisor\/deep\/status\/[\w-]+$/,

// Estos endpoints NO son SSE, se manejan con el flujo normal
```

### 3. Modificar AdvisorChat.tsx

Cambiar de `useDeepAdvisorStream` a `useDeepAdvisorJob`:

```typescript
// Reemplazar:
import { useDeepAdvisorStream } from '@/hooks/useDeepAdvisorStream';
// Por:
import { useDeepAdvisorJob } from '@/hooks/useDeepAdvisorJob';

// En el componente:
const deepJob = useDeepAdvisorJob({
  pollingInterval: 5000,
  onComplete: (result) => {
    // Añadir mensaje al historial
    refetchCredits();
    setPendingUserMessage(null);
  },
  onError: (error) => {
    toast.error(error);
    setPendingUserMessage(null);
  },
});

// En handleSend(), reemplazar deepStream.sendMessage() por:
await deepJob.startJob({
  user_id: advisorUser.id,
  message,
  chat_id: deepJob.status?.result?.chat_id || chatId,
  deep_mode: true,
  synthesis_model: validatedConfig?.synthesis_model,
  // ... resto de config
  attachments: uploadedAttachments,
});
```

### 4. Modificar StreamingProgress.tsx

Añadir soporte para `progress_percent`:

```typescript
interface StreamingProgressProps {
  phase: string;
  phaseMessage: string;
  agents: Record<string, AgentState>;
  isStreaming: boolean;
  error: string | null;
  progressPercent?: number; // NUEVO: 0-100
}

// Añadir barra de progreso visual
{progressPercent !== undefined && (
  <div className="mt-3">
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-[#307177] to-[#32b4cd] transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
    <p className="text-xs text-muted-foreground mt-1 text-center">
      {progressPercent}% completado
    </p>
  </div>
)}
```

## Migración Gradual

Para minimizar riesgos, mantendremos ambos hooks durante la transición:

1. **Fase 1**: Crear `useDeepAdvisorJob` sin romper `useDeepAdvisorStream`
2. **Fase 2**: Añadir feature flag `usePollingMode` (localStorage)
3. **Fase 3**: Si el backend soporta `/deep/start` y `/deep/status`, usar polling
4. **Fase 4**: Eliminar SSE cuando polling esté validado

## Requisitos del Backend (Railway)

El backend debe implementar:

```python
# POST /api/advisor/deep/start
# Request: { user_id, message, chat_id?, attachments?, ... }
# Response: { job_id: "uuid" }

# GET /api/advisor/deep/status/{job_id}
# Response: {
#   job_id: "uuid",
#   status: "pending" | "running" | "complete" | "failed",
#   phase: "domain" | "rag" | "web" | "agents" | "synthesis",
#   phase_detail: "Buscando en Knowledge Base...",
#   progress_percent: 45,
#   agent_status: { technical: "running", economic: "pending", ... },
#   error?: "mensaje si failed",
#   result?: { content, sources, facts, chat_id } # solo cuando complete
# }
```

## Notas Técnicas

- El polling cada 5 segundos es un buen balance entre responsividad y carga del servidor
- localStorage permite que el usuario recargue la página sin perder el job
- Si el usuario cierra el navegador y vuelve, el job sigue procesándose y puede reconectarse
- El backend guarda el resultado en el historial de chat, así que aunque el polling falle al final, el usuario puede ver el resultado en el historial
