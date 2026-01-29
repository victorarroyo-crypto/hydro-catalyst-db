
# Plan: Auto-Reanudar Deep Mode al Detectar Job Activo

## Problema Identificado

Cuando se recarga la página con un job en curso:

1. El hook `useDeepAdvisorJob` restaura el `jobId` desde `localStorage` y activa `isPolling` correctamente
2. Los toggles de Deep Mode y Streaming Mode tienen sus propios `localStorage` keys separados
3. La UI del progreso solo se muestra cuando `useStreamingUI = deepMode && streamingMode` Y `deepJob.isPolling`
4. Si los toggles no están activos, el polling continúa pero la UI no se muestra

## Flujo Actual

```text
                 Recarga
                    │
    ┌───────────────┴───────────────┐
    ▼                               ▼
useDeepAdvisorJob             useDeepMode
(localStorage:                (localStorage:
deep_advisor_active_job)      advisor_deep_mode)
    │                               │
    ▼                               ▼
isPolling = true              deepMode = false ← Problema
    │                               │
    └──────────┬────────────────────┘
               ▼
      useStreamingUI = false
               │
               ▼
    Panel de progreso OCULTO
```

## Solución

Al detectar un job activo en `localStorage`, forzar automáticamente la activación de Deep Mode y Streaming Mode:

```text
                 Recarga
                    │
                    ▼
           useDeepAdvisorJob
           (detecta job activo)
                    │
                    ▼
      Auto-activa Deep + Streaming
                    │
    ┌───────────────┴───────────────┐
    ▼                               ▼
isPolling = true           useStreamingUI = true
    │                               │
    └──────────────┬────────────────┘
                   ▼
       Panel de progreso VISIBLE
```

## Archivos a Modificar

| Archivo | Cambio |
|:--------|:-------|
| `src/hooks/useDeepAdvisorJob.ts` | Retornar flag `restoredFromStorage` cuando se recupera un job |
| `src/pages/advisor/AdvisorChat.tsx` | Usar el flag para forzar activación de Deep + Streaming modes |

## Implementación Detallada

### 1. Modificar `useDeepAdvisorJob.ts`

Añadir un estado que indica si el job fue restaurado desde storage:

```typescript
const [restoredFromStorage, setRestoredFromStorage] = useState(false);

// En el useEffect de restauración:
useEffect(() => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const { jobId: savedJobId, chatId: savedChatId, startedAt } = JSON.parse(savedData);
      const thirtyMinutesMs = 30 * 60 * 1000;
      if (Date.now() - startedAt < thirtyMinutesMs) {
        console.log('[useDeepAdvisorJob] Resuming job:', savedJobId);
        setJobId(savedJobId);
        setChatId(savedChatId);
        setIsPolling(true);
        setRestoredFromStorage(true); // ← Nuevo flag
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}, []);

// En el return:
return {
  // ... existing properties
  restoredFromStorage, // ← Exponer el flag
};
```

### 2. Modificar `AdvisorChat.tsx`

Añadir un `useEffect` que reacciona cuando se detecta un job restaurado y fuerza los toggles:

```typescript
// After getting deepJob and setDeepMode, setStreamingMode
const { deepMode, setDeepMode } = useDeepMode();
const { streamingMode, setStreamingMode } = useStreamingMode();

// Auto-activate Deep + Streaming when a job is restored from storage
useEffect(() => {
  if (deepJob.restoredFromStorage && deepJob.isPolling) {
    console.log('[AdvisorChat] Detected restored job, auto-activating Deep + Streaming modes');
    
    // Force enable Deep Mode
    if (!deepMode) {
      setDeepMode(true);
    }
    
    // Force enable Streaming Mode
    if (!streamingMode) {
      setStreamingMode(true);
    }
  }
}, [deepJob.restoredFromStorage, deepJob.isPolling, deepMode, streamingMode, setDeepMode, setStreamingMode]);
```

## Beneficios

1. **Recuperación automática**: El usuario ve el progreso sin necesidad de acción manual
2. **Consistencia de estado**: Los toggles reflejan que hay un job Deep en curso
3. **Sin pérdida de trabajo**: El job sigue ejecutándose en Railway y el frontend lo sigue

## Consideración de UX

Opcionalmente, podríamos mostrar un toast informativo cuando se restaura un job:

```typescript
import { toast } from 'sonner';

// In the useEffect:
if (deepJob.restoredFromStorage && deepJob.isPolling) {
  toast.info('Reanudando trabajo en curso...', {
    description: `Job ${deepJob.jobId?.substring(0, 8)}...`,
    duration: 3000,
  });
  // ... activate modes
}
```

## Flujo Final

```text
Usuario recarga página
         │
         ▼
useDeepAdvisorJob detecta job
en localStorage (< 30 min)
         │
         ▼
restoredFromStorage = true
isPolling = true
         │
         ▼
AdvisorChat.useEffect detecta
restoredFromStorage
         │
    ┌────┴────┐
    ▼         ▼
setDeepMode  setStreamingMode
  (true)       (true)
    │             │
    └──────┬──────┘
           ▼
useStreamingUI = true
           │
           ▼
Panel DeepAdvisorProgress
      VISIBLE
           │
           ▼
Polling continúa hasta
complete/failed
```
