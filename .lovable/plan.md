

# Plan: Integrar `useDeepAdvisorJob` con el Array de Mensajes del Chat

## Problema Identificado

Actualmente cuando un job de Deep Advisor completa:
1. El backend guarda el resultado en la base de datos (`advisor_messages`)
2. El frontend muestra el resultado desde `deepJob.response` (estado transitorio)
3. El resultado NO se integra con el array `messages` de `useAdvisorChat`
4. Si el usuario recarga la página, pierde la referencia visual del mensaje pendiente

## Solución

Integrar el resultado del job directamente en el array `messages` cuando `onComplete` se ejecuta, siguiendo el patrón que proporcionaste.

## Cambios en AdvisorChat.tsx

### 1. Callback `onComplete` Mejorado

**Actual:**
```typescript
const deepJob = useDeepAdvisorJob({
  pollingInterval: 5000,
  onComplete: (result) => {
    console.log('[AdvisorChat] Deep job complete:', result?.chat_id);
    refetchCredits();
    setPendingUserMessage(null);
  },
  // ...
});
```

**Propuesto:**
```typescript
const deepJob = useDeepAdvisorJob({
  pollingInterval: 5000,
  onComplete: (result) => {
    console.log('[AdvisorChat] Deep job complete:', result?.chat_id);
    
    // Integrar el resultado en el array de mensajes
    if (result?.content) {
      const assistantMessage: Message = {
        id: `assistant-deep-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        sources: result.sources?.map(s => ({
          name: s.name,
          type: s.type,
          similarity: 0.8, // Default since polling doesn't return similarity
          url: s.url,
        })),
        created_at: new Date().toISOString(),
      };
      
      // El pendingUserMessage también debería añadirse
      // pero el backend ya lo guardó, mejor recargar desde DB
      if (result.chat_id) {
        loadChat(result.chat_id); // Sincroniza mensajes desde la DB
      }
    }
    
    refetchCredits();
    setPendingUserMessage(null);
  },
  onError: (error) => {
    console.error('[AdvisorChat] Deep job error:', error);
    toast.error(error);
    setPendingUserMessage(null);
  },
});
```

### 2. Alternativa Más Simple: Recargar Chat desde DB

Dado que el backend ya guarda los mensajes en `advisor_messages`, la solución más limpia es recargar el chat completo cuando el job termina:

```typescript
onComplete: (result) => {
  // El backend guardó user message + assistant response en DB
  // Recargamos el chat para sincronizar el estado
  if (result?.chat_id) {
    loadChat(result.chat_id);
  }
  
  refetchCredits();
  setPendingUserMessage(null);
},
```

Esta aproximación:
- Evita duplicados
- Sincroniza IDs correctos desde la DB
- Mantiene consistencia si el usuario recargó la página

### 3. Ocultar la Sección de Polling Cuando Hay Mensajes Sincronizados

Después de `loadChat`, el mensaje del asistente estará en `messages`, por lo que debemos ajustar la condición para no mostrar la sección de polling duplicada:

```typescript
{/* Deep Mode Response - solo mientras está en progreso O hay respuesta transitoria */}
{useStreamingUI && deepJob.isPolling && (
  // ... progress and pending response
)}
```

En lugar de:
```typescript
{useStreamingUI && (deepJob.isPolling || deepJob.response || pendingUserMessage) && (
```

## Secuencia de Implementación

| Paso | Archivo | Cambio |
|:-----|:--------|:-------|
| 1 | `src/pages/advisor/AdvisorChat.tsx` | Actualizar `onComplete` para llamar `loadChat(result.chat_id)` |
| 2 | `src/pages/advisor/AdvisorChat.tsx` | Simplificar condición de renderizado del bloque de polling |
| 3 | `src/hooks/useDeepAdvisorJob.ts` | Asegurar que `reset()` se llama después de `loadChat` para limpiar estado transitorio |

## Flujo Resultante

```text
Usuario envía mensaje
        │
        ▼
setPendingUserMessage(msg)
        │
        ▼
deepJob.startJob(...)
        │
        ▼
┌─────────────────────────────────┐
│ Polling cada 5s                 │
│ UI muestra:                     │
│  - pendingUserMessage           │
│  - StreamingProgress            │
└─────────────────────────────────┘
        │
        ▼ status === 'complete'
        │
onComplete(result)
        │
        ├── loadChat(result.chat_id)  ──► messages[] actualizado desde DB
        │
        ├── setPendingUserMessage(null)
        │
        └── deepJob.reset() opcional
        │
        ▼
┌─────────────────────────────────┐
│ UI muestra:                     │
│  - messages[] (incluye user +   │
│    assistant de la DB)          │
│  - No hay bloque de polling     │
└─────────────────────────────────┘
```

## Notas Técnicas

- `loadChat` ya existe en `useAdvisorChat` y recarga mensajes desde la tabla `advisor_messages`
- El backend de Railway guarda tanto el mensaje del usuario como la respuesta del asistente
- Esta solución es más robusta que construir mensajes manualmente porque:
  - Usa los IDs reales de la DB
  - Incluye `credits_used` y otros metadatos
  - Maneja reconexiones después de page refresh

