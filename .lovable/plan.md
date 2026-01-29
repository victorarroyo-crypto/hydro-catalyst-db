
## Objetivo (lo que vamos a arreglar)
Que cuando un Deep Job termine, **siempre** veas el resultado en pantalla (sin “pantalla vacía”), y que el historial/recarga carguen el chat correcto.

Ahora mismo ocurren dos fallos a la vez:
1) **Se intenta “sincronizar” el chat al finalizar** llamando `loadChat(result.chat_id)`, pero `loadChat()` está leyendo de una BD equivocada (cliente externo). Resultado: vuelve vacío y “no sale nada”.
2) **La UI de Deep Job está renderizada solo mientras `deepJob.isPolling === true`**. Cuando el job pasa a `complete`, `isPolling` se vuelve `false` y el bloque entero desaparece, aunque `deepJob.response` tenga contenido.

---

## Diagnóstico técnico (por qué pasa)
### A. `loadChat()` apunta al cliente incorrecto
- Archivo: `src/hooks/useAdvisorChat.ts`
- Línea actual: `import { externalSupabase } from '@/integrations/supabase/externalClient';`
- `loadChat()` consulta `advisor_messages` en la base externa.
- Pero los Deep Jobs (y tu app) guardan `advisor_chats` / `advisor_messages` en el backend principal.
- Conclusión: al completar el job, el frontend hace `loadChat(chat_id)` pero consulta donde **no están** esos mensajes → la UI se queda sin nada que mostrar.

### B. El bloque de “respuesta Deep” se oculta justo al completar
- Archivo: `src/pages/advisor/AdvisorChat.tsx`
- Render actual:
  - `useStreamingUI && deepJob.isPolling && (...)`
- Cuando `status === 'complete'`, el hook hace `setIsPolling(false)`, así que el bloque desaparece inmediatamente.
- Aunque `deepJob.response` tenga texto, ya no se renderiza.

---

## Cambios propuestos (solución robusta, sin dejarte en blanco)
### 1) Corregir `loadChat()` para leer del backend correcto
**Archivo:** `src/hooks/useAdvisorChat.ts`

Cambios:
- Sustituir `externalSupabase` por `supabase` (`@/integrations/supabase/client`).
- Manejar también `error` de la query (ahora se ignora).
- Mapear campos adicionales para que no se pierdan en UI:
  - `metadata`
  - `attachments`
  - `agentAnalyses` (si existe en la tabla)
  - `sources` (ya existe, mantener)
  - `credits_used` (ya existe)

Resultado esperado:
- `loadChat(result.chat_id)` cargará el historial real, y el mensaje final aparecerá como mensaje normal en el chat.

---

### 2) Mantener visible el panel de resultado Deep al terminar (aunque deje de hacer polling)
**Archivo:** `src/pages/advisor/AdvisorChat.tsx`

Cambios:
- Reemplazar el guard actual:
  - Antes: `useStreamingUI && deepJob.isPolling`
  - Después: `useStreamingUI && (deepJob.isPolling || deepJob.status?.status === 'complete' || deepJob.status?.status === 'failed')`
- Dentro del bloque:
  - Mostrar `DeepAdvisorProgress` solo cuando `deepJob.isPolling === true` (como ya está).
  - Mostrar el contenedor de respuesta si `deepJob.response` existe, **tanto si está polling como si ya terminó**.
  - Mostrar Sources/Facts cuando `!deepJob.isPolling` (ya está previsto, pero hoy no se llega porque el bloque desaparece).

Resultado esperado:
- Cuando el job termine, el progreso puede ocultarse, pero la **respuesta queda fija en pantalla**.

---

### 3) “Cinturón y tirantes”: fallback visual si `loadChat()` tarda o falla
**Archivo:** `src/pages/advisor/AdvisorChat.tsx`

En `onComplete(result)`:
- Mantener `loadChat(result.chat_id)` (porque queremos consistencia con el historial guardado).
- Añadir una protección anti-frustración:
  - Si `result.content` existe, guardar en un estado local tipo `deepResultFallback` (string) para mostrarlo aunque `messages` no llegue.
  - Si tras X ms `messages` sigue vacío, mostrar toast “Sincronizando historial…” y mantener el fallback visible.
  - Si `loadChat()` llega bien y ya hay mensajes, limpiar el fallback.

Esto evita el “terminó y no saco nada” incluso si hay un fallo puntual de DB/red.

---

### 4) (Mejora clave para Historial) Cargar chat por URL `?id=...`
**Archivo:** `src/pages/advisor/AdvisorChat.tsx`

Hoy solo se auto-carga desde `localStorage` (`advisor_active_chat_id`). Si vienes desde “Historial” con una URL como `/advisor/chat?id=...`, no está garantizado que cargue ese chat.

Cambios:
- Leer query param `id` (con `useLocation` + `URLSearchParams`).
- En el `useEffect` de autoload:
  1) Si existe `id`, llamar `loadChat(id)`.
  2) Si no existe `id`, entonces usar el `advisor_active_chat_id` como hasta ahora.

Resultado:
- Entrar desde Historial abre el chat correcto y muestra mensajes.

---

## Archivos afectados
1) `src/hooks/useAdvisorChat.ts`
2) `src/pages/advisor/AdvisorChat.tsx`

---

## Riesgos y consideraciones
- Este arreglo también reduce dependencia del cliente “externalSupabase” para Advisor, lo cual es positivo.
- Si `advisor_messages` tiene RLS en el backend principal, debemos asegurarnos de que el usuario autenticado tiene permiso de lectura para sus propios chats (si hiciera falta, lo revisaremos después; primero corregimos el bug evidente del cliente equivocado).

---

## Checklist de verificación (end-to-end)
1) Iniciar un Deep Job y esperar a que complete:
   - Debe mostrarse el resultado sin quedarse en blanco.
2) Recargar durante el job:
   - Debe reanudar el progreso (ya lo implementamos) y al terminar mostrar el resultado.
3) Ir a Historial → abrir un chat:
   - Debe cargar el chat correcto (vía `?id=`) y renderizar mensajes.
4) Caso adverso (simular red lenta):
   - Aunque `loadChat()` tarde, debe verse el resultado (fallback) y no quedar pantalla vacía.
