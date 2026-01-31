
# Plan: Renderizado Robusto de Diagramas Mermaid

## Objetivo
Garantizar que los diagramas Mermaid se rendericen correctamente el 100% del tiempo, independientemente de cómo llegue el formato del LLM.

---

## Problema Raíz
El diagrama llega sin code fences y contiene caracteres HTML (`<br>`). El pre-procesador no detecta correctamente las líneas de continuación cuando tienen sintaxis HTML, y ReactMarkdown fragmenta el contenido en múltiples párrafos antes de que el detector pueda reconocerlo como diagrama.

---

## Solución: Pre-detección Temprana con Buffer Completo

La estrategia es **detectar diagramas Mermaid ANTES de pasarlos a ReactMarkdown**, en lugar de intentar detectarlos después del parseo.

### Cambios Propuestos

### 1. Mejorar `normalizeMarkdownDiagrams.ts`
**Archivo:** `src/utils/normalizeMarkdownDiagrams.ts`

- Actualizar `looksLikeMermaidContinuation` para soportar:
  - Etiquetas HTML dentro de nodos: `A[Label<br>Text]`
  - Etiquetas con pipes: `A -->|Label| B`
  - Más patrones de edges: `-->`, `-.->`
  
- Hacer la detección más permisiva cuando ya se confirmó que estamos dentro de un bloque Mermaid (después de detectar `flowchart LR`)

```text
Lógica actual:
  hasEdge = /-->|---|\.->/ detecta edges
  hasNode = /\[.*\]/ detecta nodos
  
Mejora propuesta:
  - Añadir soporte para <br> dentro de brackets
  - Si estamos en bloque mermaid, cualquier línea con indentación o ID válido es continuación
  - No terminar bloque hasta línea vacía seguida de texto normal
```

### 2. Mejorar `mermaidDetection.ts`  
**Archivo:** `src/utils/mermaidDetection.ts`

- Añadir detección de patrones con HTML embebido
- Hacer la regex más robusta para caracteres especiales

### 3. Actualizar `StreamingResponse.tsx`
**Archivo:** `src/components/advisor/streaming/StreamingResponse.tsx`

- **Eliminar la detección en el componente `p`** (demasiado tarde, el contenido ya está fragmentado)
- **Pre-procesar el contenido completo** antes de pasarlo a ReactMarkdown
- Añadir un paso de "extracción de diagramas" que:
  1. Detecte bloques Mermaid en el texto raw
  2. Los reemplace por placeholders
  3. Renderice los placeholders como `<MermaidRenderer>`

### 4. Añadir Componente Wrapper Seguro
**Archivo:** `src/components/advisor/streaming/MermaidBlock.tsx` (nuevo)

- Componente que encapsula la lógica de renderizado
- Maneja errores de forma aislada sin crashear el resto del chat
- Muestra el código fuente como fallback si falla el render

---

## Detalles Técnicos

### Mejora en `looksLikeMermaidContinuation`
```typescript
function looksLikeMermaidContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Lines with indentation (2+ spaces) inside a diagram
  if (line.startsWith('  ') || line.startsWith('\t')) return true;
  
  // Standard patterns
  const hasEdge = /-->|---|\.->|-\.->|==>|~~~|-.->/.test(trimmed);
  const hasNode = /\[[^\]]*\]|\(\([^)]*\)\)|{[^}]*}|>\s*[^\]]*\]/.test(trimmed);
  // Lines with pipes (edge labels): A -->|text| B
  const hasEdgeLabel = /-->\|[^|]*\|/.test(trimmed);
  // HTML inside brackets is valid Mermaid
  const hasHtmlNode = /<br>|<br\/>|<br \/>/.test(trimmed) && /\[/.test(trimmed);
  
  const isKeyword = /^(subgraph|end|style|class|classDef|click|linkStyle|direction)\b/i.test(trimmed);
  const isComment = trimmed.startsWith('%%');
  const startsWithId = /^[A-Za-z0-9_]/.test(trimmed);
  
  return hasEdge || hasNode || hasEdgeLabel || hasHtmlNode || 
         isKeyword || isComment || (startsWithId && (hasEdge || trimmed.includes('[')));
}
```

### Nueva Estrategia de Renderizado
```typescript
// En StreamingResponse, ANTES de ReactMarkdown:
const { processedContent, mermaidBlocks } = extractMermaidBlocks(cleanedContent);

// ReactMarkdown recibe texto sin diagramas (reemplazados por :::mermaid-0:::)
// Un componente custom renderiza los placeholders como MermaidRenderer
```

---

## Flujo Corregido

```text
Texto LLM
    ↓
normalizeMarkdownDiagrams() ← MEJORADO: detecta HTML, más permisivo
    ↓
extractMermaidBlocks() ← NUEVO: extrae diagramas a array
    ↓
ReactMarkdown(textoSinDiagramas)
    ↓
MermaidBlock renderiza placeholders
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/normalizeMarkdownDiagrams.ts` | Mejorar detección de continuación con HTML |
| `src/utils/mermaidDetection.ts` | Patrones más robustos |
| `src/components/advisor/streaming/StreamingResponse.tsx` | Extraer diagramas antes de ReactMarkdown, eliminar detección en `<p>` |

---

## Beneficios

1. **Detección temprana**: Los diagramas se identifican antes del parseo de Markdown
2. **Sin conflictos DOM**: No hay manipulación directa del DOM después de React
3. **100% consistente**: El pre-procesador ve el texto completo, no fragmentado
4. **Fallback visual**: Si Mermaid falla, se muestra el código fuente formateado
