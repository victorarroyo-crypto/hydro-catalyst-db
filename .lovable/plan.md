

# Fix: Eliminacion definitiva de base64 en exportacion Word

## Diagnostico raiz

Las correcciones previas basadas en regex fallan por una razon fundamental: el contenido del tag `<div data-reactflow-diagram="...BASE64_MUY_LARGO..."></div>` llega como UNA SOLA LINEA de miles de caracteres. Los regex con `[^"]*?` (non-greedy) o `[^]*?` con alternativa `$` no lo capturan de forma fiable, y `isBase64Residue` solo examina linea por linea (la linea entera incluye el HTML del div, no es "pura" base64).

## Solucion: Limpieza basada en string indexOf (sin regex)

Reemplazar la estrategia de regex por una busqueda directa con `indexOf` y `substring`, que es determinista y no depende de backtracking del motor regex.

### Archivo: `src/lib/generateDeepAdvisorDocument.ts`

**Cambio 1 - Nueva funcion de limpieza robusta (reemplazar isBase64Residue y los regex agresivos):**

Antes de cualquier procesamiento regex de Pattern 1/Pattern 2, hacer una limpieza por string search:

```typescript
function removeReactFlowDivTags(text: string): string {
  let result = text;
  const marker = 'data-reactflow-diagram=';
  let searchFrom = 0;
  
  while (true) {
    const markerIdx = result.indexOf(marker, searchFrom);
    if (markerIdx === -1) break;
    
    // Find the opening <div that precedes this marker
    const divStart = result.lastIndexOf('<div', markerIdx);
    if (divStart === -1) {
      // No <div found - remove from marker to end of line or </div>
      const endDiv = result.indexOf('</div>', markerIdx);
      const endLine = result.indexOf('\n', markerIdx);
      const cutEnd = endDiv !== -1 ? endDiv + 6 : (endLine !== -1 ? endLine : result.length);
      result = result.substring(0, markerIdx) + result.substring(cutEnd);
      continue;
    }
    
    // Find closing </div> or end of tag
    const closeDivIdx = result.indexOf('</div>', markerIdx);
    const cutEnd = closeDivIdx !== -1 ? closeDivIdx + 6 : result.length;
    
    result = result.substring(0, divStart) + result.substring(cutEnd);
    searchFrom = divStart; // Continue searching from where we cut
  }
  
  return result;
}
```

**Cambio 2 - Aplicar la limpieza al inicio de `parseMarkdownToParagraphs`:**

Inmediatamente despues de `let processedMarkdown = markdown;` (linea 1062), ANTES de los Pattern 1 y Pattern 2:

```typescript
// Remove raw ReactFlow div tags BEFORE regex processing (deterministic string search)
processedMarkdown = removeReactFlowDivTags(processedMarkdown);
```

**Cambio 3 - Mantener `isBase64Residue` mejorada y el filtro de lineas:**

Mantener la funcion `isBase64Residue` y el filtro `.filter(line => !isBase64Residue(line))` como red de seguridad para cualquier residuo que quede.

**Cambio 4 - Eliminar los regex agresivos redundantes (lineas 1100-1103):**

Ya no se necesitan las lineas con `/<div[^>]*data-reactflow-diagram=.../` y `/<div\s+data-reactflow-diagram=.../` ya que `removeReactFlowDivTags` hace el mismo trabajo de forma mas fiable.

## Resumen

| Archivo | Accion |
|---------|--------|
| `src/lib/generateDeepAdvisorDocument.ts` | Agregar `removeReactFlowDivTags()` con indexOf, aplicarla antes de regex, eliminar regex agresivos redundantes |

## Por que esto funciona

- `indexOf` busca la cadena literal `data-reactflow-diagram=` sin backtracking
- `lastIndexOf('<div', pos)` encuentra el inicio del tag de forma determinista
- `indexOf('</div>', pos)` encuentra el cierre sin importar el largo del base64
- No depende de cuantificadores greedy/non-greedy ni del flag dotAll
- Si no hay `</div>`, corta hasta el final del string (caso truncado)
