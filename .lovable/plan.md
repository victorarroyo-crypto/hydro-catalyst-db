
Contexto / qué está pasando (según tus logs)
- Estás llamando desde el navegador (origen https://…lovable.app) a Railway (https://watertech-scouting-production.up.railway.app).
- Railway a veces responde pero muchas otras:
  1) Bloquea por CORS: “No 'Access-Control-Allow-Origin' header…”
  2) Rompe la conexión (ERR_CONNECTION_RESET / ERR_HTTP2_PROTOCOL_ERROR / QUIC_PUBLIC_RESET)
- Resultado: para ti “se queda parado” porque el frontend está esperando una respuesta/stream que nunca llega (o el navegador la bloquea antes de que se procese).

Qué significan esos errores (en claro)
- CORS policy blocked: el backend (Railway) no está permitiendo que un navegador desde tu dominio haga la petición. Aunque el backend funcione, el navegador la bloquea.
- ERR_HTTP2_PROTOCOL_ERROR / ERR_CONNECTION_RESET: la conexión se corta a mitad (reinicio del servicio, proxy/CDN intermedio, cold start, timeouts, o HTTP/2/QUIC inestable).
- Errores Firestore/api.lovable.dev: son del entorno de previsualización y no son la causa principal del “Advisor” (ruido adicional), pero empeoran la sensación de inestabilidad.

Objetivo
- Eliminar CORS del camino y estabilizar la comunicación con Railway, sin depender de que Railway tenga CORS perfecto, y sin que el navegador hable “directo” con Railway para endpoints críticos (config, modelos, chat, streaming, servicios).

Solución propuesta (arquitectura)
1) Añadir un “backend function” (proxy) dentro de Lovable Cloud para hablar con Railway “server-to-server”.
   - El navegador llama a Lovable Cloud (mismo entorno del proyecto) → no hay bloqueo CORS.
   - La función llama a Railway → aunque Railway no tenga CORS, eso ya no afecta porque no es un navegador.
2) Migrar todas las llamadas del Advisor que hoy van directas a Railway para que pasen por ese proxy:
   - GET/PUT /api/advisor/deep/config
   - GET /api/advisor/models
   - POST /api/advisor/chat/stream
   - POST /api/advisor/deep/chat
   - POST /api/advisor/deep/chat/stream (SSE)
   - POST /api/advisor/service/{comparador|checklist|ficha|presupuesto}
3) Soportar streaming (SSE) en el proxy:
   - El proxy devolverá el stream “tal cual” (Content-Type: text/event-stream) y reenviará chunks sin envolverlos en JSON (si no, el hook actual no puede parsear “data: …”).
4) Añadir resiliencia:
   - Timeout razonable en el proxy y/o en el frontend para cortar sesiones “colgadas”.
   - Reintentos controlados para endpoints no-stream (config/models).
   - Mensaje claro en UI cuando el problema es conectividad (en vez de quedarse “Iniciando…” eternamente).

Exploración realizada (archivos relevantes)
- src/hooks/useDeepAdvisorStream.ts: hace fetch directo a `${API_URL}/api/advisor/deep/chat/stream` y parsea SSE.
- src/hooks/useDeepAdvisorConfig.ts: GET/PUT directo a `${API_URL}/api/advisor/deep/config`.
- src/hooks/useAdvisorChat.ts: usa API_BASE hardcoded a Railway, y mezcla JSON y streaming.
- src/hooks/useAdvisorServices.ts + src/hooks/useLLMModels.ts: también hardcoded a Railway.
- Ya existe un patrón de proxy: supabase/functions/kb-railway-proxy y supabase/functions/study-proxy.

Decisiones clave de implementación
- Autenticación del proxy:
  - El Advisor usa auth propia (advisor_users en BD) y no necesariamente tiene sesión “Supabase Auth”.
  - Las tablas advisor_* tienen políticas permisivas (USING true), así que el proxy no puede basarse en JWT obligatorio como kb-railway-proxy.
  - Propuesta: el proxy validará como mínimo que llega un user_id y que existe en advisor_users (y opcionalmente chequea rol). No es seguridad perfecta, pero mejora trazabilidad y reduce llamadas “vacías”.
  - Si quieres seguridad fuerte, habrá que introducir un token de sesión del Advisor y dejar de tener RLS totalmente público (esto sería una fase posterior).

Plan de trabajo (pasos concretos)
1) Crear nueva backend function `advisor-railway-proxy`
   - CORS headers para navegador.
   - Allowlist estricta de endpoints (regex) y métodos.
   - Usa `RAILWAY_API_URL` (ya existe como secreto) para formar el targetUrl.
   - Para endpoints normales:
     - Hace fetch a Railway y responde JSON con status code real.
   - Para endpoint SSE (/api/advisor/deep/chat/stream y /api/advisor/chat/stream):
     - Hace fetch y retorna `new Response(railwayResponse.body, { headers: …text/event-stream… })`.
     - Mantiene headers de no-cache y conexión viva.
2) Actualizar frontend para usar el proxy en vez de Railway directo
   - useDeepAdvisorStream.ts: cambiar fetch al endpoint del proxy (vía `supabase.functions.invoke` o `fetch` a la URL de la function) manteniendo lectura `response.body.getReader()`.
   - useDeepAdvisorConfig.ts: GET/PUT pasan por proxy.
   - useAdvisorChat.ts: sustituir API_BASE hardcoded por proxy; mantener compatibilidad con el parseo del stream.
   - useAdvisorServices.ts: sustituir RAILWAY_URL hardcoded por proxy.
   - useLLMModels.ts: sustituir RAILWAY_API_URL hardcoded por proxy.
3) Observabilidad
   - Loguear en el proxy: endpoint, método, duración, status, y si es streaming.
   - En frontend: cuando el error sea CORS/ERR_FAILED, mostrar mensaje “Servidor no accesible” y sugerir reintento.
4) Validación
   - Probar “Deep config” (GET) desde /advisor/chat (debe dejar de dar CORS).
   - Probar un chat sin adjuntos en modo normal y deep.
   - Probar streaming SSE (ver llegar events “session”, “phase”…).
   - Probar servicio (comparador/checklist) para confirmar que ya no depende de CORS.
5) (Opcional, recomendado) Endurecer seguridad del Advisor
   - Reemplazar “password_hash=btoa” por un flujo con backend function de login + hash seguro.
   - Cambiar RLS de advisor_* para no ser “USING true”.
   - Emitir un token de sesión del Advisor y exigirlo en el proxy.

Riesgos / limitaciones
- Si Railway está realmente caído o congelado, el proxy no “arregla” el backend: simplemente hará que el error sea claro y no un bloqueo por CORS.
- El streaming SSE puede seguir siendo sensible a timeouts; por eso incluyo timeout + abort y mensajes de estado.
- La seguridad del Advisor actualmente es débil (por diseño en las migraciones). El proxy no empeora eso, pero tampoco lo soluciona por completo.

Resultado esperado
- Desaparecen los errores de CORS en /api/advisor/deep/config y en el streaming.
- Menos “parado”: si Railway falla, se verá un error controlado y habrá reintentos/abort.
- El Advisor queda desacoplado de cambios de CORS/HTTP2/QUIC del lado Railway.

Siguiente decisión mínima que necesito de ti (para implementarlo bien)
- ¿Quieres que TODAS las llamadas del Advisor pasen por el proxy (recomendado), o solo las que están fallando ahora (deep/config y deep/chat/stream)?
