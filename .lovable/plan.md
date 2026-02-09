

# Plan: Corregir Problemas en la Exportacion Word

## Problemas Detectados

### 1. Datos base64 en bruto aparecen como texto (Pagina 2)
El contenido codificado en base64 del diagrama ReactFlow se muestra como texto plano en lugar de renderizarse como imagen. Esto ocurre cuando el tag `<div data-reactflow-diagram="...">` contiene base64 muy largo que se fragmenta en multiples lineas, y la regex no lo captura completamente. El contenido no capturado pasa al procesamiento linea-por-linea y se renderiza como texto.

### 2. Tabla fragmentada antes de la portada (Pagina 1)
Aparece una tabla pequena ("Tren de Tratamiento Recomendado para el Galtanizado") antes de la portada. Esto es un fragmento de texto sobrante del fallback del diagrama ReactFlow que no se renderizo correctamente.

## Solucion

### Cambio 1: Sanitizar contenido base64 residual en `generateDeepAdvisorDocument.ts`

Despues de reemplazar los diagramas ReactFlow con placeholders, anadir un paso de limpieza que detecte y elimine bloques de texto que parezcan base64 residual (cadenas largas de caracteres alfanumericos sin espacios, tipicas de base64 que se filtro al texto).

**En `parseMarkdownToParagraphs`** (linea ~1084, despues de crear `processedMarkdown`):
- Anadir regex para detectar y eliminar lineas que contengan solo caracteres base64 (A-Za-z0-9+/=) de longitud mayor a 40 caracteres
- Estas lineas son claramente datos binarios filtrados, no contenido legible

### Cambio 2: Mejorar la regex de deteccion de `<div>` ReactFlow

**En `parseMarkdownToParagraphs`** (linea ~1047):
- La regex actual `/<div\s+data-reactflow-diagram="([^"]+)"[^>]*>/` falla si el base64 se rompe con saltos de linea
- Tambien buscar y eliminar tags `<div data-reactflow-diagram=` que se extienden por multiples lineas

### Cambio 3: Filtrar lineas base64 en el procesamiento linea-por-linea

**En el bucle `for` de `parseMarkdownToParagraphs`** (linea ~1091):
- Antes de procesar una linea como texto normal, verificar si parece ser base64 residual
- Si es asi, saltar la linea (no anadir al documento Word)

## Detalles Tecnicos

### Archivo: `src/lib/generateDeepAdvisorDocument.ts`

**Cambio A - Anadir funcion de deteccion de base64:**
```typescript
function isBase64Residue(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 30) return false;
  // Base64 characters only, possibly with line breaks
  return /^[A-Za-z0-9+/=]{30,}$/.test(trimmed);
}
```

**Cambio B - Limpiar base64 residual despues de reemplazar placeholders (alrededor de linea 1082):**
Despues de los dos bloques de reemplazo de ReactFlow, anadir:
```typescript
// Clean up any residual base64 content that leaked from ReactFlow diagrams
processedMarkdown = processedMarkdown
  .split('\n')
  .filter(line => !isBase64Residue(line))
  .join('\n');
```

**Cambio C - Mejorar regex de Pattern 1 para manejar base64 multilinea (linea ~1047):**
Reemplazar la regex del div para que capture atributos con posibles saltos de linea:
```typescript
const reactFlowDivRegex = /<div\s+data-reactflow-diagram="([^"]*?)"[^>]*>(?:<\/div>)?/gis;
```
Y limpiar tambien tags `<div data-reactflow-diagram=` parciales que no se cerraron.

**Cambio D - Filtro adicional en el bucle de lineas (alrededor de linea 1228):**
Justo antes del check de lineas vacias, anadir:
```typescript
// Skip base64 residual lines
if (isBase64Residue(trimmedLine)) {
  continue;
}
```

## Resumen de Cambios

| Archivo | Accion |
|---------|--------|
| `src/lib/generateDeepAdvisorDocument.ts` | Anadir `isBase64Residue()`, limpiar base64 residual post-reemplazo, mejorar regex div, filtrar lineas base64 en bucle |

## Verificacion

1. Exportar a Word el mismo informe de galvanizado
2. Verificar que NO aparece texto base64 en bruto
3. Verificar que la portada aparece en la primera pagina
4. Verificar que los diagramas se renderizan como imagenes o como texto fallback limpio

