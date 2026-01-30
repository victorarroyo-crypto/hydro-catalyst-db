
# Plan: Agregar Soporte de Tablas Markdown al Generador de Documentos Word

## Problema Identificado
La función `parseMarkdownToParagraphs` en `generateDeepAdvisorDocument.ts` no detecta ni convierte tablas Markdown a formato Word. Las líneas que contienen `| columna1 | columna2 |` se procesan como texto normal, resultando en el output que muestra la imagen.

## Solución Propuesta
Agregar lógica de detección y parsing de tablas Markdown dentro de `parseMarkdownToParagraphs`, creando objetos `Table` de docx cuando se detecte una tabla.

---

## Cambios a Implementar

### Archivo: `src/lib/generateDeepAdvisorDocument.ts`

**1. Nueva función auxiliar para detectar filas de tabla:**
```typescript
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return pipeCount >= 3;
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|[\s\-:|]+\|$/.test(trimmed) && trimmed.includes('-');
}
```

**2. Nueva función para crear tablas Word desde Markdown:**
```typescript
function parseMarkdownTable(tableLines: string[]): Table {
  // Filtrar líneas vacías y separadores
  const dataLines = tableLines.filter(l => !isSeparatorRow(l.trim()));
  
  // Primera línea = headers
  const headerCells = parseTableRowCells(dataLines[0]);
  const bodyLines = dataLines.slice(1);
  
  // Crear fila de headers con estilo Vandarum
  const headerRow = new TableRow({
    children: headerCells.map(cell => 
      new TableCell({
        children: [new Paragraph({
          children: createFormattedTextRuns(cell, { bold: true }),
        })],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
      })
    ),
  });
  
  // Crear filas de datos con zebra striping
  const dataRows = bodyLines.map((line, idx) => {
    const cells = parseTableRowCells(line);
    return new TableRow({
      children: cells.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: createFormattedTextRuns(cell),
          })],
          shading: { 
            type: ShadingType.SOLID, 
            color: idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5' 
          },
        })
      ),
    });
  });
  
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function parseTableRowCells(line: string): string[] {
  return line.trim()
    .slice(1, -1)  // Quitar | inicial y final
    .split('|')
    .map(cell => cell.trim());
}
```

**3. Modificar `parseMarkdownToParagraphs` para detectar tablas:**

Agregar tracking de estado para tablas dentro del bucle principal:
```typescript
let inTable = false;
let tableLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  // Detectar inicio/continuación de tabla
  if (isTableRow(trimmedLine) || isSeparatorRow(trimmedLine)) {
    if (!inTable) {
      inTable = true;
      tableLines = [];
    }
    tableLines.push(trimmedLine);
    continue;
  }
  
  // Final de tabla - procesar y generar Table
  if (inTable) {
    const table = parseMarkdownTable(tableLines);
    paragraphs.push(table); // Nota: cambiar tipo de retorno a (Paragraph | Table)[]
    inTable = false;
    tableLines = [];
  }
  
  // ... resto del procesamiento normal
}
```

**4. Actualizar tipo de retorno:**
- Cambiar `parseMarkdownToParagraphs` para retornar `(Paragraph | Table)[]`
- Actualizar los lugares donde se llama esta función para aceptar el nuevo tipo

---

## Resultado Esperado
Las tablas Markdown como:
```
| Horizonte | Enfoque | CAPEX | Ahorro | Payback |
|-----------|---------|-------|--------|---------|
| Quick Wins | Recuperación | 26-75k€ | 80-140k€ | 0.4-1.5 años |
```

Se convertirán a tablas Word formateadas con:
- Headers en fondo verde oscuro (#307177) con texto blanco
- Filas alternas con colores zebra
- Bordes consistentes con el estilo Vandarum

---

## Detalles Técnicos

### Flujo de Detección
```text
Línea de texto
    ↓
¿Es fila de tabla? (empieza/termina con | y tiene ≥3 pipes)
    ├── SÍ → Agregar a buffer de tabla
    │        ↓
    │   ¿Siguiente línea NO es tabla?
    │        ├── SÍ → Generar Table y agregarlo a paragraphs
    │        └── NO → Continuar acumulando
    └── NO → Procesar como párrafo normal
```

### Consideraciones
- Manejar tablas con diferentes números de columnas
- Preservar negritas dentro de celdas (`**texto**`)
- Mantener compatibilidad con subíndices químicos en celdas
- No confundir separadores de tabla con pipes en texto normal
