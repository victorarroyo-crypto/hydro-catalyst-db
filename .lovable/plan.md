
Objetivo: que los diagramas ReactFlow se rendericen siempre aunque el LLM los devuelva “bien”, pero el Markdown termine mostrándolos como texto (como en tu captura, donde aparece el JSON “pelado”).

## Diagnóstico (con lo que veo en el repo)
1. El render de ReactFlow depende de que ReactMarkdown detecte un bloque de código con `language-reactflow` (en `AdvisorMessage.tsx` y `StreamingResponse.tsx`, dentro del handler de `pre`).
2. Si por cualquier motivo el bloque no se parsea como fence de Markdown (por ejemplo: fence dentro de lista sin línea en blanco, fence indentado, fence “pegado” a texto, o el pre-procesado lo deforma), ReactMarkdown no genera `pre > code.language-reactflow`, y entonces:
   - o bien el contenido cae en texto normal (tu síntoma),
   - o cae en `pre` sin `language-reactflow` y nunca se intenta `JSON.parse`.
3. Hay doble pre-procesado: `cleanMarkdownContent()` ya llama `normalizeMarkdownDiagrams()`, pero luego `AdvisorMessage` y `StreamingResponse` vuelven a llamar `normalizeMarkdownDiagrams(cleanMarkdownContent(...))`. Esto aumenta el riesgo de que alguna regla “agresiva” afecte a fences que ya estaban correctas.

## Enfoque de solución (más robusto)
Dejar de depender únicamente de “que el Markdown reconozca el fence” y, en su lugar:
- Extraer (antes de ReactMarkdown) los bloques ReactFlow del texto, igual que ya se hace con Mermaid (`extractMermaidBlocks`).
- Reemplazarlos por placeholders tipo `:::reactflow-placeholder-N:::` y renderizar el diagrama al detectar ese placeholder.
- Mantener el normalizador para casos de JSON crudo, pero evitar “doble normalización”.

Esto hace que incluso si el Markdown decide tratar el fence como texto, nosotros igualmente detectemos y rendericemos el diagrama.

## Cambios propuestos (código)

### 1) Añadir extracción de ReactFlow por placeholders (similar a Mermaid)
**Archivo:** `src/utils/normalizeMarkdownDiagrams.ts`
- Crear una función nueva:
  - `extractReactFlowBlocks(text): { processedContent: string; reactflowBlocks: string[] }`
- Qué debe reconocer:
  1) Bloques correctamente fenced:
     - ` ```reactflow\n ... \n``` `
     - y también variantes con indentación común (por ejemplo `   ```reactflow`)
  2) Casos “semi-rotos” frecuentes:
     - fence sin línea en blanco antes/después
     - fence indentado dentro de listas (hasta 3-4 espacios típicamente)
- Qué debe guardar:
  - Guardar el JSON “tal cual” (sin backticks) en `reactflowBlocks[]`
  - Reemplazar en el texto por `\n\n:::reactflow-placeholder-i:::\n\n`

Además:
- Opcional: si encontramos JSON crudo con `"nodes"` y `"edges"` fuera de fences, seguir envolviéndolo (lo que ya existe), pero idealmente hacerlo antes de extraer.

### 2) Usar placeholders en el render del chat (no depender de fences)
**Archivo:** `src/components/advisor/streaming/StreamingResponse.tsx`
- En el pre-procesado `processedData`:
  1) `cleanMarkdownContent(content)`
  2) (solo una vez) normalizar diagramas
  3) `extractReactFlowBlocks(...)`
  4) `extractMermaidBlocks(...)`
- Guardar `reactflowBlocks` en un `useRef` igual que `mermaidBlocksRef`.
- En el renderer de `p` (ya intercepta placeholders de Mermaid):
  - Detectar `:::reactflow-placeholder-N:::`
  - `JSON.parse(reactflowBlocksRef.current[N])`
  - Render:
    - `<ReactFlowProvider><ReactFlowDiagram data={parsed}/></ReactFlowProvider>`
  - Si falla el parse: mostrar caja de error amigable.

**Archivo:** `src/components/advisor/AdvisorMessage.tsx`
- Misma idea, pero teniendo cuidado con el “typing effect”:
  - Importante: durante streaming carácter a carácter, un placeholder podría aparecer “a medias”.
  - Estrategia:
    - Solo intentar render placeholder si el texto del párrafo coincide exactamente con el patrón completo `^:::reactflow-placeholder-(\d+):::$`
    - Si está incompleto, renderizarlo como texto normal hasta que el placeholder esté completo.

### 3) Eliminar doble normalización (reducir riesgo de corrupción)
Opciones (elegir una y aplicar consistente):
- Opción A (recomendada): `cleanMarkdownContent()` NO debería llamar `normalizeMarkdownDiagrams()`; que lo haga solo el “render pipeline” de AdvisorMessage/StreamingResponse una única vez.
- Opción B: mantenerlo en `cleanMarkdownContent()`, y quitar `normalizeMarkdownDiagrams(...)` extra en los componentes que renderizan.

Implementaremos una sola fuente de verdad para no procesar dos veces.

### 4) Normalizar fences indentados (pequeño refuerzo)
Aunque el placeholder lo hará mucho más robusto, añadiremos un refuerzo en el normalizador:
- Si hay líneas como `^\s+```reactflow` o `^\s+```$` (cierre), “desindentar” a ` ```reactflow` / ` ``` `
- Asegurar que haya saltos de línea alrededor del bloque para que el resto del markdown no se “pegue”.

## Validación (pasos de prueba)
1. En `/advisor/chat`, provocar una respuesta que contenga un bloque ` ```reactflow ... ``` `.
2. Confirmar que:
   - si el Markdown lo parsea bien: se renderiza diagrama (como ahora).
   - si el Markdown lo rompe (lista/indentación): igual se renderiza, porque el placeholder lo “rescata”.
3. Probar también con:
   - 2 diagramas en el mismo mensaje.
   - un diagrama seguido de tabla/lista.
   - streaming (deep advisor polling y chat normal).

## Archivos a tocar
- `src/utils/normalizeMarkdownDiagrams.ts` (añadir `extractReactFlowBlocks`, mejorar normalización de indentación)
- `src/components/advisor/streaming/StreamingResponse.tsx` (pipeline + render placeholder)
- `src/components/advisor/AdvisorMessage.tsx` (pipeline + render placeholder)
- `src/utils/fixMarkdownTables.ts` (ajustar para evitar doble normalización, según opción elegida)

## Por qué esto debería arreglar tu captura
En tu foto el JSON aparece como texto (sin activarse el handler `language-reactflow`). Con placeholders, aunque el Markdown falle interpretando fences, nosotros extraemos el bloque y lo renderizamos fuera del parser, así que deja de depender del formato exacto en el markdown.
