
# Fix: Datos base64 de ReactFlow siguen apareciendo en Word

## Diagnostico

El fix anterior no funciona porque:
1. La regex `reactFlowDivRegex` requiere un cierre `>` y/o `</div>` que puede no existir en el contenido
2. La funcion `isBase64Residue` solo detecta lineas de base64 **puro** - no detecta lineas que empiezan con `<div data-reactflow-diagram="` seguido de base64
3. La regex de limpieza parcial `/<div\s+data-reactflow-diagram=[\s\S]*?(?:<\/div>|(?=\n\n))/gi` es demasiado conservadora

## Solucion

Atacar el problema de forma mas agresiva con tres cambios en `src/lib/generateDeepAdvisorDocument.ts`:

### Cambio 1: Ampliar `isBase64Residue` para detectar tambien lineas con HTML + base64

Ademas de lineas de base64 puro, detectar lineas que contengan `data-reactflow-diagram` o que sean mayoritariamente caracteres base64 (>80% de la longitud sin espacios):

```typescript
function isBase64Residue(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 30) return false;
  // Pure base64 line
  if (/^[A-Za-z0-9+/=]{30,}$/.test(trimmed)) return true;
  // Line containing a reactflow div tag (partial or complete)
  if (/data-reactflow-diagram/i.test(trimmed)) return true;
  // Line that is mostly base64 characters (>80%) - likely leaked binary
  const base64Chars = (trimmed.match(/[A-Za-z0-9+/=]/g) || []).length;
  if (trimmed.length > 100 && base64Chars / trimmed.length > 0.8) return true;
  return false;
}
```

### Cambio 2: Agregar limpieza mas agresiva antes del split en lineas

Antes de hacer `split('\n')`, eliminar cualquier bloque que contenga `data-reactflow-diagram` de principio a fin, incluyendo tags sin cerrar:

```typescript
// Remove entire <div data-reactflow-diagram=...> blocks, even if malformed/unclosed
processedMarkdown = processedMarkdown.replace(
  /<div[^>]*data-reactflow-diagram=[^]*?(<\/div>|$)/gi, 
  ''
);
```

### Cambio 3: Limpiar tambien el tag suelto sin cierre

Si el tag aparece sin `>` de cierre (truncado), eliminarlo hasta el final de la linea:

```typescript
// Remove truncated div tags that span to end of line
processedMarkdown = processedMarkdown.replace(
  /<div\s+data-reactflow-diagram="[^"]*"?[^\n]*/gi, 
  ''
);
```

## Archivo modificado

| Archivo | Accion |
|---------|--------|
| `src/lib/generateDeepAdvisorDocument.ts` | Reforzar `isBase64Residue`, agregar limpieza agresiva de tags malformados |
