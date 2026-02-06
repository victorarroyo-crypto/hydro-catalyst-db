

# Plan: Corregir Renderizado de Diagramas ReactFlow

## Diagnóstico

El problema es que el LLM está enviando los diagramas ReactFlow en un formato incorrecto:

```
reactflow { "title": "Tren de tratamiento con segregación...
```

Cuando debería enviar:
```
```reactflow
{ "title": "Tren de tratamiento con segregación...
```
```

El sistema tiene normalizadores para Mermaid pero **no para ReactFlow**, por lo que el contenido llega como texto plano y ReactMarkdown no lo reconoce como un bloque de código.

## Solución

Añadir un normalizador que detecte bloques `reactflow` malformados y los convierta al formato correcto.

## Cambios Técnicos

### 1. Modificar `src/utils/normalizeMarkdownDiagrams.ts`

Añadir función para detectar y normalizar bloques ReactFlow:

```typescript
function normalizeReactFlowBlocks(text: string): string {
  let result = text;
  
  // Patrón 1: "reactflow { ... }" todo en una línea o múltiples líneas
  // sin backticks
  result = result.replace(
    /(?:^|\n)reactflow\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi,
    (match, jsonContent) => {
      return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
    }
  );
  
  // Patrón 2: Bloques con backticks incorrectos (1, 2 o 4 en lugar de 3)
  result = result.replace(
    /`{1,2}reactflow\s*\n?([\s\S]*?)`{1,2}/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  result = result.replace(
    /`{4,}reactflow\s*\n?([\s\S]*?)`{4,}/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  return result;
}
```

Actualizar la función `normalizeMarkdownDiagrams` para incluir ReactFlow:

```typescript
export function normalizeMarkdownDiagrams(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Step 1: Aggressive fence fixing
  result = aggressiveFenceFixer(result);
  
  // Step 2: Normalize ReactFlow blocks (NEW)
  result = normalizeReactFlowBlocks(result);
  
  // Step 3: Normalize existing Mermaid fences
  result = normalizeMermaidFences(result);
  
  // Step 4: Detect and wrap unfenced Mermaid diagrams
  result = wrapUnfencedMermaid(result);
  
  return result;
}
```

### 2. Actualizar `src/components/advisor/AdvisorMessage.tsx`

Asegurar que el contenido pase por el normalizador antes de ser procesado:

```typescript
import { normalizeMarkdownDiagrams } from '@/utils/normalizeMarkdownDiagrams';

// En el componente:
const cleanedContent = cleanMarkdownContent(content);
const normalizedContent = normalizeMarkdownDiagrams(cleanedContent);
```

## Resultado Esperado

1. El texto `reactflow { "title": ... }` será detectado
2. Se convertirá automáticamente a un bloque de código con triple backtick
3. ReactMarkdown lo reconocerá como `language-reactflow`
4. El componente `ReactFlowDiagram` lo renderizará correctamente

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/normalizeMarkdownDiagrams.ts` | Añadir `normalizeReactFlowBlocks()` y actualizar función principal |
| `src/components/advisor/AdvisorMessage.tsx` | Aplicar normalización al contenido |
| `src/components/advisor/streaming/StreamingResponse.tsx` | Verificar que ya aplica normalización (ya lo hace) |

