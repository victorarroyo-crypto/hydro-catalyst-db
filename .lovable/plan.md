
# Plan: Corrección Definitiva de Visualización en Advisor

## Diagnóstico del Problema

### 1. Diagramas Mermaid Fallando
**Causa raíz identificada:** El backend Railway envía diagramas con sintaxis Markdown dentro de las etiquetas de nodos:
```
F{**Origen identificable?**}    ← Los ** causan error de parseo
```
Mermaid interpreta `*` como token `MULT`, no como formato de texto.

### 2. Pipeline Actual
El sistema tiene 3 capas de sanitización, pero **ninguna elimina los asteriscos de negrita** dentro de las etiquetas de nodos:

```
normalizeMarkdownDiagrams.ts → mermaidSanitizer.ts → MermaidRenderer.tsx
```

### 3. Flujos Afectados
- **Modo Deep** (streaming de respuestas largas con diagramas)
- **Chat estándar** (cuando la respuesta incluye flowcharts)
- Probablemente también afecta el Word export (que pre-renderiza Mermaid)

---

## Solución Propuesta

### Cambio 1: Mejorar `mermaidSanitizer.ts`
Agregar una función que limpie formato Markdown de las etiquetas de nodos Mermaid:

```typescript
/**
 * Removes Markdown formatting from inside Mermaid node labels.
 * Handles: **bold**, *italic*, `code`, __underline__
 */
function stripMarkdownFromLabels(content: string): string {
  // Pattern: content inside brackets [], (), {}, (()) etc.
  // Remove ** and * markers, but keep the text
  return content
    // **bold** → bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // *italic* → italic  
    .replace(/\*([^*]+)\*/g, '$1')
    // __underline__ → underline
    .replace(/__([^_]+)__/g, '$1')
    // `code` → code
    .replace(/`([^`]+)`/g, '$1');
}
```

Llamar esta función al inicio de `sanitizeMermaidContent()`.

### Cambio 2: Mejorar validación de líneas
En `isValidMermaidLine()`, las líneas con `**` dentro de etiquetas deben ser consideradas válidas (tras limpieza), no rechazadas.

### Cambio 3: Agregar logging de diagnóstico
En `MermaidRenderer.tsx`, cuando ocurre un error, mostrar qué contenido específico falló para facilitar depuración futura.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/mermaidSanitizer.ts` | Añadir `stripMarkdownFromLabels()` y llamarla en `sanitizeMermaidContent()` |
| `src/components/advisor/MermaidRenderer.tsx` | Mejorar logging de errores con contenido limpio vs original |

---

## Tablas: Verificación

Las tablas usan un pipeline separado (`fixMarkdownTables.ts`, `contentQualityControl.ts`). El código actual parece correcto para tablas estándar. Si hay problemas específicos con tablas, pueden deberse a:
- Tablas excesivamente anchas (ya hay lógica de conversión a lista)
- Tablas sin separador de cabecera (ya hay auto-fix)

No se detectan bugs obvios en el código de tablas. Si el problema persiste tras la corrección de Mermaid, se necesitará un ejemplo concreto.

---

## Charts (Recharts)

Los charts en `CostConsultingInvoices.tsx` usan `ComposedChart` de Recharts y parecen correctamente implementados. El error de fecha que corregimos anteriormente (`Invalid time value`) era un problema de datos, no de la librería.

Si hay problemas de visualización de charts, probablemente están relacionados con:
- Datos con fechas/valores inválidos (ya corregido con `safeFormatDate`)
- Problemas de CSS/responsive en ciertos viewports

---

## Resultado Esperado

Tras implementar estos cambios:
1. Diagramas Mermaid con `**negrita**` en etiquetas renderizarán correctamente
2. El mensaje "No se pudo renderizar el diagrama" dejará de aparecer para estos casos
3. Se mantendrá la robustez actual para otros tipos de errores (con fallback a código fuente)

---

## Sección Técnica

### Regex para limpieza de Markdown en etiquetas

```typescript
// Input:  "F{**¿Origen identificable?**}"
// Output: "F{¿Origen identificable?}"

const cleaned = line
  .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
  .replace(/\*([^*\s][^*]*)\*/g, '$1') // Italic (careful with Mermaid edge syntax)
  .replace(/__([^_]+)__/g, '$1')       // Underline
  .replace(/`([^`]+)`/g, '$1');        // Inline code
```

### Ubicación del fix

En `sanitizeMermaidContent()` (línea ~128 de `mermaidSanitizer.ts`), añadir la limpieza antes del procesamiento línea a línea:

```typescript
export function sanitizeMermaidContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // NEW: Strip Markdown formatting from node labels
  cleaned = stripMarkdownFromLabels(cleaned);
  
  // Step 1: Remove any fence markers at the start
  cleaned = cleaned.replace(/^```\s*\w*\s*\n?/, '');
  // ... rest of existing logic
}
```
