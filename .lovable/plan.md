

# Plan: Keep-Alive Pings + Aumentar Timeout para SSE Streaming

## Problema
Cuando los agentes del backend de Railway tardan mucho en procesar (varios minutos), la conexión SSE se cierra por:
1. Inactividad detectada por proxies intermedios (CDN, navegador)
2. El timeout actual de 5 minutos puede no ser suficiente para análisis muy complejos

## Solución

### 1. Aumentar Timeouts

| Componente | Timeout Actual | Timeout Nuevo |
|:-----------|:--------------|:--------------|
| `advisor-railway-proxy` (Edge Function) | 5 min (300s) | 10 min (600s) |
| `advisorProxy.ts` (Cliente) | 5 min (300s) | 10 min (600s) |

### 2. Implementar Keep-Alive Pings en el Edge Function

El Edge Function inyectará pings SSE cada 15 segundos para mantener la conexión activa.

**Arquitectura:**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Cliente)                                               │
│  └── useDeepAdvisorStream                                        │
│       └── Ignora eventos con event: "ping"                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SSE Stream
                              │
┌─────────────────────────────────────────────────────────────────┐
│  advisor-railway-proxy (Edge Function)                           │
│  └── TransformStream:                                            │
│       ├── Pasa datos del backend                                 │
│       └── Inyecta "data: {\"event\":\"ping\"}" cada 15s          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SSE Stream (puede tener pausas largas)
                              │
┌─────────────────────────────────────────────────────────────────┐
│  Railway Backend                                                 │
│  └── Análisis de expertos (puede demorar minutos)                │
└─────────────────────────────────────────────────────────────────┘
```

### Archivos a Modificar

| Archivo | Cambios |
|:--------|:--------|
| `supabase/functions/advisor-railway-proxy/index.ts` | - Aumentar timeout a 10 min<br>- Crear TransformStream con keep-alive pings cada 15s |
| `src/lib/advisorProxy.ts` | - Aumentar timeout a 10 min |
| `src/hooks/useDeepAdvisorStream.ts` | - Ignorar eventos `ping` en el parser |

## Implementación Técnica

### Edge Function: Keep-Alive TransformStream

```typescript
// Crear stream que inyecta pings
const PING_INTERVAL_MS = 15000; // 15 segundos

function createKeepAliveStream(originalBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pingData = encoder.encode('data: {"event":"ping"}\n\n');
  
  let pingIntervalId: number | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  
  // Pipe original stream and inject pings
  (async () => {
    writer = writable.getWriter();
    const reader = originalBody.getReader();
    
    // Start ping interval
    pingIntervalId = setInterval(() => {
      writer?.write(pingData).catch(() => {/* ignore */});
    }, PING_INTERVAL_MS);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      clearInterval(pingIntervalId);
      await writer.close();
    }
  })();
  
  return readable;
}
```

### Cliente: Ignorar Pings

```typescript
// En useDeepAdvisorStream.ts, dentro del switch:
case 'ping':
  // Keep-alive ping - ignore silently
  break;
```

## Resultado Esperado
- Conexiones SSE se mantienen activas hasta 10 minutos
- Keep-alive pings cada 15s evitan que proxies/CDN cierren la conexión por inactividad
- El cliente ignora los pings silenciosamente
- Mayor robustez para análisis complejos con muchos documentos

