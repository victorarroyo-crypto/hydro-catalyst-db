

# Plan: Cerrar Bloques de Código No Balanceados

## Diagnóstico Confirmado

El LLM genera bloques de código con ` ``` ` de apertura pero sin cierre. ReactMarkdown entonces interpreta TODO el contenido subsiguiente como código, mostrando:
- `> **Disclaimer crítico**:` como texto literal (el `>` y `**` visibles)
- `- --` o `---` como texto en vez de separador horizontal
- Headers y bold como asteriscos visibles

## Solución

Añadir una función `closeUnclosedCodeFences` en `contentQualityControl.ts` que:
1. Cuente los fences de apertura y cierre
2. Si hay fences sin cerrar, los cierre automáticamente

## Cambios Requeridos

### Archivo: `src/utils/contentQualityControl.ts`

**Ubicación**: Añadir nueva función antes de `applyContentQualityControl` (aproximadamente línea 230)

**Nueva función**:
```typescript
/**
 * Close unclosed code fences.
 * When the LLM opens a ``` block but forgets to close it,
 * all subsequent content is interpreted as code and rendered literally.
 * This function detects and closes orphaned fences.
 */
function closeUnclosedCodeFences(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let openFenceCount = 0;
  let currentFenceLang = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect fence opening: ``` or ```language
    const openMatch = trimmed.match(/^```(\w*)$/);
    if (openMatch && openFenceCount === 0) {
      openFenceCount++;
      currentFenceLang = openMatch[1] || '';
      result.push(line);
      continue;
    }
    
    // Detect fence closing: ```
    if (trimmed === '```' && openFenceCount > 0) {
      openFenceCount--;
      currentFenceLang = '';
      result.push(line);
      continue;
    }
    
    // If we're inside an unclosed fence and hit markdown content,
    // close the fence before this line
    if (openFenceCount > 0) {
      // Check if this line looks like markdown that escaped the fence
      const looksLikeEscapedMarkdown = 
        /^#{1,6}\s/.test(trimmed) ||           // Headers
        /^>\s/.test(trimmed) ||                 // Blockquotes
        /^---+\s*$/.test(trimmed) ||            // Horizontal rules
        /^\*\*[A-Za-z]/.test(trimmed) ||        // Bold start
        /^>\s*\*\*/.test(trimmed);              // Blockquote with bold
      
      if (looksLikeEscapedMarkdown) {
        // Close the orphaned fence
        result.push('```');
        openFenceCount--;
        currentFenceLang = '';
      }
    }
    
    result.push(line);
  }
  
  // If still unclosed at end of content, close it
  while (openFenceCount > 0) {
    result.push('```');
    openFenceCount--;
  }
  
  return result.join('\n');
}
```

**Modificar pipeline**: En `applyContentQualityControl`, añadir el paso antes de `fixMarkdownFormatting`:

```typescript
export function applyContentQualityControl(rawContent: string): QualityResult {
  // ... existing code ...
  
  let content = rawContent;
  
  // Step 1: Sanitize HTML first
  content = sanitizeHTML(content);
  
  // Step 2: Close unclosed code fences (NEW STEP)
  content = closeUnclosedCodeFences(content);
  
  // Step 3: Normalize chemical equations
  content = normalizeChemicalEquations(content);
  
  // ... rest of steps ...
}
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/utils/contentQualityControl.ts` | Nueva función `closeUnclosedCodeFences` + integrar en pipeline |

## Verificación

1. Los blockquotes `> **text**` deben renderizarse como quotes estilizados (no texto plano)
2. Los separadores `---` deben renderizarse como líneas horizontales
3. El bold `**text**` dentro de blockquotes debe renderizarse correctamente
4. Los bloques de código válidos (con cierre) deben seguir funcionando
5. No debe haber regresión en los diagramas ReactFlow ni Mermaid

