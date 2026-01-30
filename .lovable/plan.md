
# Plan: Corregir Procesamiento de Negritas en Listas

## Problema Identificado
El generador de documentos Word no está procesando correctamente las negritas (`**texto**`) dentro de elementos de lista. La imagen muestra:
- `**Para 40.000 m³/mes:**` apareciendo como texto literal en lugar de negrita
- Afecta a listas de viñetas (`- item`) y posiblemente listas numeradas

## Causa Raíz
En `parseMarkdownToParagraphs` hay un problema de lógica:
- **Párrafos regulares** (líneas 689-718): Procesan negritas con el regex `**texto**` correctamente
- **Listas de viñetas** (líneas 646-664): Pasan directamente a `createFormattedTextRuns` sin extraer negritas
- **Listas numeradas** (líneas 668-687): Mismo problema

## Solución
Crear una función auxiliar `parseInlineFormatting` que extraiga y procese las negritas inline, y usarla en todos los contextos (párrafos, listas, tablas).

---

## Cambios a Implementar

### Archivo: `src/lib/generateDeepAdvisorDocument.ts`

**1. Nueva función para procesar formateo inline:**
```typescript
function parseInlineFormattedRuns(text: string, baseOptions: TextRunOptions = {}): TextRun[] {
  const textRuns: TextRun[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Texto antes de la negrita
    if (match.index > lastIndex) {
      textRuns.push(...createFormattedTextRuns(text.slice(lastIndex, match.index), baseOptions));
    }
    // Texto en negrita
    textRuns.push(...createFormattedTextRuns(match[1], { ...baseOptions, bold: true }));
    lastIndex = match.index + match[0].length;
  }
  
  // Texto restante
  if (lastIndex < text.length) {
    textRuns.push(...createFormattedTextRuns(text.slice(lastIndex), baseOptions));
  }
  
  return textRuns.length > 0 ? textRuns : createFormattedTextRuns(text, baseOptions);
}
```

**2. Actualizar listas de viñetas (líneas ~646-664):**
```typescript
// Antes:
...createFormattedTextRuns(listContent),

// Después:
...parseInlineFormattedRuns(listContent),
```

**3. Actualizar listas numeradas (líneas ~668-687):**
```typescript
// Antes:
...createFormattedTextRuns(numberedMatch[2]),

// Después:
...parseInlineFormattedRuns(numberedMatch[2]),
```

**4. Actualizar celdas de tabla (en `parseTableRowCells` y `parseMarkdownTable`):**
Usar `parseInlineFormattedRuns` en lugar de `createFormattedTextRuns` para celdas de datos.

---

## Flujo Corregido
```text
Texto: "- **Para 40.000 m³/mes:** valor"
         ↓
parseInlineFormattedRuns()
         ↓
┌─────────────────────────────────────────┐
│ 1. Detectar **...**                     │
│ 2. Extraer "Para 40.000 m³/mes:"        │
│ 3. Marcar como bold: true               │
│ 4. Procesar superíndice ³ con superScript│
│ 5. Resto del texto normal               │
└─────────────────────────────────────────┘
         ↓
TextRuns formateados correctamente
```

---

## Resultado Esperado
- `**Para 40.000 m³/mes:**` → Texto en negrita con ³ en superíndice
- `- Canon anual: ~110.000 €/año` → Viñeta con texto normal
- Mantiene soporte para superíndices Unicode (m³) dentro de negritas
