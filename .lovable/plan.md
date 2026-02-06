

# Plan: Proteger bloques ReactFlow bien formateados

## Problema Identificado

La imagen muestra que el LLM envía el bloque correctamente:
```
```reactflow
{
  "title": "...",
  "nodes": [...],
  "edges": [...]
}
```
```

Pero aparece como **texto plano** en el chat. Esto ocurre porque:

1. Hay un backtick suelto antes del bloque (puede venir del LLM)
2. El `aggressiveFenceFixer` está procesando backticks de forma muy agresiva y puede estar rompiendo bloques válidos
3. El normalizador no protege bloques ReactFlow que ya están correctamente formateados

## Solución

Modificar la lógica para:
1. Detectar y limpiar backticks sueltos antes de bloques de codigo
2. Proteger bloques ReactFlow ya bien formateados (que ya tienen ` ```reactflow `)
3. Solo aplicar normalización a bloques malformados

## Cambios Tecnicos

### Archivo: `src/utils/normalizeMarkdownDiagrams.ts`

#### 1. Agregar funcion para limpiar backticks sueltos

```typescript
function cleanStrayBackticks(text: string): string {
  // Remove isolated backticks that appear before code fences
  // Pattern: single backtick on its own line followed by a code fence
  let result = text;
  
  // Single backtick on its own line before a fence
  result = result.replace(/^`\s*\n(```)/gm, '$1');
  result = result.replace(/\n`\s*\n(```)/g, '\n$1');
  
  // Single/double backticks immediately before fence (no newline)
  result = result.replace(/`{1,2}(```(?:reactflow|mermaid|flow|chem|equation))/gi, '$1');
  
  return result;
}
```

#### 2. Modificar normalizeReactFlowBlocks para NO procesar bloques ya validos

```typescript
function normalizeReactFlowBlocks(text: string): string {
  let result = text;
  
  // First: clean stray backticks
  result = cleanStrayBackticks(result);
  
  // Skip if there are already valid reactflow fences
  // (they will be handled by ReactMarkdown correctly)
  const hasValidFences = /```reactflow\s*\n[\s\S]*?\n```/gi.test(result);
  
  // Pattern 1: Only apply if no valid fences exist
  if (!hasValidFences) {
    result = result.replace(
      /(?:^|\n)reactflow\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi,
      (match, jsonContent) => {
        return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
      }
    );
  }
  
  // Pattern 2: Raw JSON detection - only if no valid fences
  if (!hasValidFences) {
    // ... existing JSON detection logic
  }
  
  // ... rest of patterns
}
```

#### 3. Actualizar orden de operaciones en normalizeMarkdownDiagrams

```typescript
export function normalizeMarkdownDiagrams(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Step 0: Clean stray backticks FIRST (NEW)
  result = cleanStrayBackticks(result);
  
  // Step 1: Check if content already has valid reactflow fences
  const hasValidReactFlow = /```reactflow\s*\n[\s\S]*?\n```/gi.test(result);
  
  // Step 2: Only normalize ReactFlow if no valid fences
  if (!hasValidReactFlow) {
    result = normalizeReactFlowBlocks(result);
  }
  
  // Step 3: Aggressive fence fixing (for Mermaid, etc)
  result = aggressiveFenceFixer(result);
  
  // ... rest of steps
}
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/normalizeMarkdownDiagrams.ts` | Agregar limpieza de backticks sueltos y proteger bloques validos |

## Resultado Esperado

1. Backticks sueltos antes de bloques seran eliminados
2. Bloques ReactFlow correctamente formateados pasaran intactos a ReactMarkdown
3. Solo se aplicara normalizacion cuando realmente sea necesario (JSON crudo sin cercas)

