

# Plan: Mejorar la Resiliencia del Streaming con Documentos

## Problema Detectado

La subida de documentos funcionó correctamente (6 PDFs subidos). El fallo ocurre al enviar el mensaje con adjuntos al proxy de streaming. El edge function no llegó a loguear la solicitud, lo que indica que:

1. La solicitud puede ser demasiado grande para el edge function
2. Hay un timeout antes de que Railway responda
3. Railway sigue sin responder correctamente

## Solución Propuesta

### Paso 1: Agregar timeout y retry en el streaming

Modificar el proxy para manejar mejor las conexiones largas con documentos:

```text
supabase/functions/advisor-railway-proxy/index.ts
- Agregar log al inicio del request (para saber si llega)
- Agregar timeout específico para streaming (120s en lugar de 60s)
- Agregar headers para keep-alive más robustos
```

### Paso 2: Mejorar el manejo de errores en el frontend

Modificar el hook para detectar y reportar errores de conexión más claramente:

```text
src/hooks/useDeepAdvisorStream.ts
- Agregar timeout configurable (2 minutos para requests con adjuntos)
- Mostrar mensaje específico cuando falla la conexión al proxy
- Agregar retry automático (1 intento)
```

### Paso 3: Agregar indicador de estado de conexión

Agregar feedback visual cuando el proxy está conectando:

```text
src/lib/advisorProxy.ts
- Agregar función para verificar salud del proxy/Railway
- Retornar error descriptivo cuando Railway no responde
```

## Resultado Esperado

- Si Railway está caído, verás un mensaje claro: "Servidor no disponible, intenta más tarde"
- Si el request es muy grande, habrá un timeout controlado
- Logs completos en el edge function para diagnóstico

## Nota Técnica

El `Failed to fetch` en la última solicitud indica que la conexión al proxy se cortó antes de poder establecerse. Esto puede ser:
1. Railway completamente caído (más probable dado tu comentario anterior)
2. El edge function no pudo procesar el payload grande
3. Un timeout a nivel de red

La solución añade capas de resiliencia para cada escenario.

