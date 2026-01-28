

# Plan: Corregir Bug de AbortSignal en Streaming

## Problema Identificado
El código actual en `advisorProxy.ts` no combina correctamente el signal del usuario con el timeout interno. Esto causa que las conexiones de streaming se aborten inesperadamente cuando:
- El navegador aplica su propio timeout (más corto que nuestros 5 minutos)
- Hay micro-cortes de red sin oportunidad de reintento

## Cambios Propuestos

### 1. Arreglar `src/lib/advisorProxy.ts`

**Antes (bug):**
```typescript
const combinedSignal = signal || timeoutController.signal;
```

**Después (correcto):**
```typescript
// Usar AbortSignal.any() para combinar ambos signals
// Si el navegador soporta AbortSignal.any() (Chrome 116+, Firefox 124+)
// O usar un AbortController manual como fallback

const combinedController = new AbortController();

// Abortar si el timeout se alcanza
const timeoutId = setTimeout(() => {
  console.warn('[advisorProxy] Streaming timeout reached (5 min)');
  combinedController.abort(new Error('CLIENT_TIMEOUT'));
}, timeoutMs);

// Abortar si el signal externo se aborta
if (signal) {
  signal.addEventListener('abort', () => {
    combinedController.abort(signal.reason);
  });
}

// Usar el controller combinado
const combinedSignal = combinedController.signal;
```

### 2. Mejorar manejo de errores en `useDeepAdvisorStream.ts`

- Distinguir entre abort por timeout vs abort por usuario
- Agregar retry automático cuando el error es timeout del cliente
- Mostrar mensaje más claro al usuario

**Cambios:**
```typescript
catch (error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    // Distinguir causa del abort
    const reason = error.message || '';
    
    if (reason === 'CLIENT_TIMEOUT') {
      // Timeout del cliente - ofrecer reintento
      setState(prev => ({
        ...prev,
        error: 'La conexión tardó demasiado. Intenta de nuevo o reduce los adjuntos.',
        phase: 'timeout',
        phaseMessage: 'Timeout de conexión',
        isStreaming: false,
      }));
    } else {
      // Abort por usuario (botón Stop)
      setState(prev => ({
        ...prev,
        response: prev.response + '\n\n*[Generación detenida por el usuario]*',
        isStreaming: false,
      }));
    }
  }
  // ... resto del manejo de errores
}
```

### 3. Agregar diagnóstico visual (opcional)

Agregar un pequeño indicador en la UI que muestre:
- Tiempo de conexión activa
- Estado de la conexión (conectando/recibiendo/procesando)

## Archivos a Modificar

| Archivo | Cambio |
|:--------|:-------|
| `src/lib/advisorProxy.ts` | Combinar signals correctamente |
| `src/hooks/useDeepAdvisorStream.ts` | Mejorar manejo de timeout vs abort |

## Detalles Técnicos

### Compatibilidad de `AbortSignal.any()`
- Chrome 116+ ✅
- Firefox 124+ ✅
- Safari 17.4+ ✅
- Para navegadores antiguos, usaremos el fallback con listeners manuales

### Código Completo para `streamAdvisorProxy`

```typescript
export async function streamAdvisorProxy(
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<Response> {
  const timeoutMs = 300000; // 5 minutos
  
  // Crear controller combinado
  const combinedController = new AbortController();
  let timeoutId: number | undefined;
  
  // Configurar timeout
  timeoutId = window.setTimeout(() => {
    console.warn('[advisorProxy] Streaming timeout reached (5 min)');
    combinedController.abort(new DOMException('CLIENT_TIMEOUT', 'AbortError'));
  }, timeoutMs);
  
  // Escuchar abort externo (usuario presiona Stop o componente se desmonta)
  const handleExternalAbort = () => {
    clearTimeout(timeoutId);
    combinedController.abort(signal?.reason || new DOMException('User cancelled', 'AbortError'));
  };
  
  if (signal) {
    if (signal.aborted) {
      // Ya abortado, no hacer fetch
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({
        error: 'Request cancelled',
        code: 'CANCELLED'
      }), { status: 499, headers: { 'Content-Type': 'application/json' } });
    }
    signal.addEventListener('abort', handleExternalAbort, { once: true });
  }
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/advisor-railway-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          endpoint,
          method: 'POST',
          payload,
        }),
        signal: combinedController.signal,
      }
    );

    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleExternalAbort);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleExternalAbort);
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      const reason = error.message || 'Unknown';
      
      if (reason === 'CLIENT_TIMEOUT') {
        return new Response(JSON.stringify({
          error: 'Request Timeout',
          message: 'La solicitud tardó demasiado. Por favor, intenta de nuevo.',
          code: 'CLIENT_TIMEOUT'
        }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Abort por usuario - propagarlo silenciosamente
      throw error;
    }
    
    throw error;
  }
}
```

## Resultado Esperado
- Las conexiones de streaming tendrán un timeout consistente de 5 minutos
- El abort por timeout mostrará un mensaje claro diferente al abort por usuario
- La combinación de signals evitará cortes inesperados del navegador

