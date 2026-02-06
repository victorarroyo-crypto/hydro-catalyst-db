
# Plan: Detectar JSON de ReactFlow sin marcador

## Problema Identificado

El LLM envía el JSON de diagramas **sin ningún prefijo "reactflow"** y sin backticks:

```
2.1 Decisión Estratégica: ¿Segregar o No Segregar?

{
  "title": "Arbol de decision tecnologica",
  "direction": "TD",
  "nodes": [...],
  "edges": [...]
}
```

El normalizador actual solo busca `reactflow { ... }` pero el contenido llega como JSON crudo.

---

## Solución

Añadir un nuevo patrón que detecte **JSON con estructura de ReactFlow** (objetos que contengan `"nodes"` y `"edges"`) y los envuelva automáticamente en bloques de código.

---

## Cambios Técnicos

### Archivo: `src/utils/normalizeMarkdownDiagrams.ts`

Actualizar la función `normalizeReactFlowBlocks`:

```typescript
function normalizeReactFlowBlocks(text: string): string {
  let result = text;
  
  // Pattern 1: "reactflow { ... }" without backticks
  result = result.replace(
    /(?:^|\n)reactflow\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi,
    (match, jsonContent) => {
      return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
    }
  );
  
  // NEW Pattern 2: Raw JSON with ReactFlow structure (has "nodes" and "edges")
  // This catches JSON objects that look like ReactFlow diagrams but have no prefix
  result = result.replace(
    /(?:^|\n)(\{\s*\n?\s*"(?:title|direction|nodes)"[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?"edges"\s*:\s*\[[\s\S]*?\]\s*\})/gi,
    (match, jsonContent) => {
      // Verify it's valid ReactFlow JSON before wrapping
      try {
        const parsed = JSON.parse(jsonContent.trim());
        if (parsed.nodes && Array.isArray(parsed.nodes) && 
            parsed.edges && Array.isArray(parsed.edges)) {
          return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
        }
      } catch (e) {
        // Not valid JSON, return as-is
      }
      return match;
    }
  );
  
  // Pattern 3: Incorrect backtick counts (1, 2)
  result = result.replace(
    /`{1,2}reactflow\s*\n?([\s\S]*?)`{1,2}(?!`)/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  // Pattern 4: Too many backticks (4+)
  result = result.replace(
    /`{4,}reactflow\s*\n?([\s\S]*?)`{4,}/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  return result;
}
```

---

## Lógica de Detección

La regex busca objetos JSON que:
1. Empiezan con `{`
2. Contienen `"nodes": [` 
3. Contienen `"edges": [`
4. Terminan con `}`

Antes de envolver, se valida que sea JSON válido con la estructura correcta para evitar falsos positivos.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/normalizeMarkdownDiagrams.ts` | Añadir patrón para detectar JSON crudo con estructura ReactFlow |

---

## Resultado Esperado

1. El JSON crudo `{ "title": ..., "nodes": [...], "edges": [...] }` será detectado
2. Se validará que tiene la estructura de ReactFlow
3. Se envolverá en bloques ` ```reactflow `
4. ReactMarkdown lo reconocerá y renderizará el diagrama interactivo
