
Objetivo
- Que cualquier diagrama ReactFlow se renderice como diagrama aunque llegue:
  - dentro de fences incorrectos (por ejemplo ```json o ``` sin lenguaje),
  - como JSON “pelado”,
  - o con indentaciones/listas que rompen el parser de Markdown.

Qué está pasando (según tu captura)
- En la pantalla se ve el JSON formateado como bloque (pero no se convierte a diagrama).
- Con el sistema de placeholders, esto solo puede ocurrir si `extractReactFlowBlocks()` NO está detectando ese contenido como ReactFlow.
- La causa más probable: el JSON está llegando dentro de un bloque de código que NO es ` ```reactflow ` (por ejemplo ` ```json ` o ` ``` `), por lo que:
  - No coincide con el patrón 1 (solo captura fences `reactflow`)
  - Y el patrón 2 (JSON crudo) no se dispara porque el JSON está “dentro” de un fence genérico, no como texto plano.

Plan de cambios (código)
1) Hacer que `extractReactFlowBlocks()` detecte ReactFlow también dentro de fences genéricos
   Archivo: `src/utils/normalizeMarkdownDiagrams.ts`
   - Ampliar la extracción para que capture también:
     - ` ```json ... ``` `
     - ` ``` ... ``` ` (sin lenguaje)
     - (opcional) ` ```javascript ... ``` ` si a veces viene así
   - Lógica recomendada:
     - Buscar fences genéricos con regex multiline (incluyendo indentación):
       - `^[ \t]*```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n[ \t]*````
     - Para cada bloque:
       - Intentar `JSON.parse(content)`
       - Validar estructura mínima ReactFlow:
         - `parsed.nodes` array
         - `parsed.edges` array
         - y que los nodos tengan al menos `{ id, label }` (o lo mínimo que tu renderer necesita)
       - Si valida: reemplazar ese fence completo por `:::reactflow-placeholder-N:::` y guardar `content` en `reactflowBlocks[]`
       - Si NO valida: dejar el bloque intacto
   - Mantener el comportamiento actual para ` ```reactflow ` (debe seguir funcionando igual o mejor).

2) Permitir extracción de múltiples bloques ReactFlow en el mismo mensaje
   Archivo: `src/utils/normalizeMarkdownDiagrams.ts`
   - Ahora mismo, el patrón 2 (JSON crudo) solo corre si `reactflowBlocks.length === 0`.
   - Ajuste:
     - Permitir que el patrón 2 corra aunque ya exista 1 bloque extraído, para capturar “más de uno” si el LLM manda varios (o mezcle un fenced + un crudo).

3) Añadir instrumentación de debug (solo en desarrollo) para confirmar detección
   Archivos:
   - `src/utils/normalizeMarkdownDiagrams.ts`
   - `src/components/advisor/AdvisorMessage.tsx`
   - `src/components/advisor/streaming/StreamingResponse.tsx`
   Cambios:
   - Loggear (en `console.debug`) cuando:
     - se extrae un bloque y su índice
     - falla el parseo de un placeholder
     - el placeholder aparece “fragmentado” durante streaming (para confirmar si está llegando partido)
   - Importante: que estos logs estén detrás de una bandera tipo `if (import.meta.env.DEV)` para no ensuciar producción.

4) Robustez extra: extracción aunque el fence no tenga cierre perfecto
   Archivo: `src/utils/normalizeMarkdownDiagrams.ts`
   - Si detectamos ` ```json ` (o ``` sin lenguaje) y el cierre no aparece, intentar “cerrar” el bloque cuando aparezca un patrón claro de markdown (similar a la lógica de Mermaid) o al final del texto.
   - Esto es opcional, pero útil si el modelo/railway a veces trunca.

Validación (cómo sabremos que quedó)
1) Reproducir exactamente el caso de tu captura:
   - Forzar respuesta del advisor que incluya el JSON (como el screenshot).
   - Confirmar que ya no aparece el JSON como texto, sino el diagrama ReactFlow.
2) Probar variantes:
   - Caso A: ` ```reactflow { ... } ``` ` (debe seguir funcionando)
   - Caso B: ` ```json { ... } ``` ` (debe convertirse a diagrama)
   - Caso C: ` ``` { ... } ``` ` (debe convertirse a diagrama)
   - Caso D: JSON crudo sin fence (debe convertirse a diagrama)
   - Caso E: 2 diagramas en un mismo mensaje (deben salir ambos)
3) Verificar en consola (con los nuevos `console.debug`) que:
   - `extractReactFlowBlocks` está extrayendo y creando placeholders
   - `AdvisorMessage`/`StreamingResponse` están resolviendo placeholders a diagramas sin errores de JSON

Riesgos / consideraciones
- Falsos positivos: un bloque ` ```json ` que tenga `nodes` y `edges` pero no sea ReactFlow.
  - Mitigación: validación más estricta (ej. `nodes` como array de objetos con `id` string, `edges` con `source/target`).
- Rendimiento: parsear muchos fences con JSON.parse.
  - Mitigación: solo intentar parse si el contenido incluye `"nodes"` y `"edges"` como substring antes de JSON.parse (filtro rápido).

Archivos involucrados
- `src/utils/normalizeMarkdownDiagrams.ts` (principal: ampliar extracción + múltiples bloques + robustez)
- (opcional solo debug) `src/components/advisor/AdvisorMessage.tsx`
- (opcional solo debug) `src/components/advisor/streaming/StreamingResponse.tsx`
