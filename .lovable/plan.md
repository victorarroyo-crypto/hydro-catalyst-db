
# Plan: Fix ReactFlow JSON Extraction - Usar findJsonEnd() para Cortar JSON Limpio

## Resumen del Problema
El sistema de placeholders está funcionando (el bloque se detecta y se reemplaza por `:::reactflow-placeholder-N:::`), pero el **contenido guardado en `reactflowBlocks[]` incluye texto basura** después del cierre del JSON (`}`). Esto causa `JSON.parse()` a fallar con "Unexpected non-whitespace character after JSON".

## Causa Raíz
La función `extractReactFlowBlocks()` guarda `content.trim()` directamente sin validar que sea JSON puro. Si el LLM incluye texto extra dentro del fence (común cuando no separa bien), ese texto queda en el bloque almacenado.

## Solución
Usar la función existente `findJsonEnd()` para extraer SOLO el JSON válido antes de guardarlo.

---

## Cambios de Código

### Archivo: `src/utils/normalizeMarkdownDiagrams.ts`

#### Cambio 1: Nueva función helper `extractPureJson()`
Añadir después de `findJsonEnd()` (alrededor de línea 378):

```typescript
/**
 * Extracts pure JSON from text that may contain trailing content.
 * Uses brace-balancing to find where the JSON object ends.
 */
function extractPureJson(text: string): string | null {
  const trimmed = text.trim();
  
  // Must start with {
  const startIndex = trimmed.indexOf('{');
  if (startIndex === -1) return null;
  
  // Find the balanced closing brace
  const endIndex = findJsonEnd(trimmed, startIndex);
  if (endIndex === -1) return null;
  
  return trimmed.substring(startIndex, endIndex + 1);
}
```

#### Cambio 2: Modificar Pattern 1 (líneas 543-557)
Antes:
```typescript
if (trimmedContent.includes('"nodes"') || trimmedContent.includes('"edges"')) {
  const index = reactflowBlocks.length;
  reactflowBlocks.push(trimmedContent);
  // ...
}
```

Después:
```typescript
if (trimmedContent.includes('"nodes"') || trimmedContent.includes('"edges"')) {
  const pureJson = extractPureJson(trimmedContent);
  if (pureJson) {
    const index = reactflowBlocks.length;
    reactflowBlocks.push(pureJson);
    // ...
  }
}
```

#### Cambio 3: Modificar Pattern 2 (líneas 561-590)
Antes:
```typescript
try {
  const parsed = JSON.parse(trimmedContent);
  if (isValidReactFlowStructure(parsed)) {
    const index = reactflowBlocks.length;
    reactflowBlocks.push(trimmedContent);
    // ...
  }
} catch (e) {
  // Not valid JSON, keep as-is
}
```

Después:
```typescript
// First, extract pure JSON (removes trailing garbage)
const pureJson = extractPureJson(trimmedContent);
if (!pureJson) return match;

try {
  const parsed = JSON.parse(pureJson);
  if (isValidReactFlowStructure(parsed)) {
    const index = reactflowBlocks.length;
    reactflowBlocks.push(pureJson);
    // ...
  }
} catch (e) {
  // Still not valid JSON, keep as-is
}
```

#### Cambio 4: Modificar Pattern 3 (líneas 594-615)
Aplicar la misma lógica: usar `extractPureJson()` antes de guardar.

---

## Flujo de Datos Corregido

```text
LLM Output:
```reactflow
{ "nodes": [...], "edges": [...] }

Aquí hay más texto que no debería estar
```

                      ↓
             extractReactFlowBlocks()
                      ↓
    findJsonEnd() encuentra el } correcto
                      ↓
          extractPureJson() devuelve:
    { "nodes": [...], "edges": [...] }
              (SIN el texto extra)
                      ↓
        reactflowBlocks[0] = JSON limpio
                      ↓
   JSON.parse() funciona correctamente
                      ↓
        ReactFlowDiagram se renderiza
```

---

## Verificación Post-Implementación

1. Enviar consulta que genere diagrama ReactFlow
2. En consola de desarrollo, buscar:
   - `[ReactFlow] Extracted from...` → confirma detección
   - NO debe aparecer "Invalid ReactFlow JSON in placeholder"
3. El diagrama debe renderizarse como gráfico interactivo, no como JSON ni error

---

## Alternativa Desde Railway (Backend)

Si prefieres arreglar en el backend en lugar del frontend:

1. **Asegurar que el JSON del diagrama esté aislado**:
   - El contenido dentro de ` ```reactflow ... ``` ` debe ser SOLO el objeto JSON
   - Sin texto explicativo antes ni después del JSON dentro del fence

2. **Formato correcto**:
```markdown
Texto explicativo previo.

```reactflow
{
  "title": "Diagrama de proceso",
  "nodes": [
    { "id": "1", "label": "Paso 1", "type": "input" }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

Texto explicativo posterior.
```

3. **Evitar**:
   - Comentarios dentro del JSON
   - Texto explicativo dentro del fence
   - Backticks anidados o malformados
