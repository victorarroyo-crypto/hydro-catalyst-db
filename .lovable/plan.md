
# Plan: Arreglar la Detección de Fin de Diagramas Mermaid

## Problema Identificado

El error en consola muestra exactamente qué pasa:
```
Parse error on line 15:
...rriente 4| G``* *C1: Pre-lavado**
```

El preprocesador de Mermaid (`normalizeMarkdownDiagrams.ts`) **no cierra el bloque** cuando termina el diagrama real y empieza texto markdown normal. Esto causa que líneas como `` ` ` * *C1: Pre-lavado**`` se incluyan dentro del bloque Mermaid, rompiendo el parser.

## Causa Raíz

La función `looksLikeMermaidContinuation()` es demasiado permisiva y no detecta correctamente:
1. Líneas que empiezan con backticks sueltos (`` ` ` ``)
2. Líneas que son claramente bullets markdown (`* *Texto**`)  
3. Patrones de lista con asteriscos (`* -`, `- `)

## Solución

Modificar `src/utils/normalizeMarkdownDiagrams.ts` para:

1. **Detectar explícitamente el FIN del diagrama**
   - Si una línea empieza con backticks sueltos → FIN
   - Si una línea es un bullet markdown (`* texto`, `- texto`) → FIN
   - Si una línea es texto narrativo sin sintaxis Mermaid → FIN

2. **Añadir patrones de "no es Mermaid"**
   - Bullets: `/^[\*\-]\s+\*?\*?[A-Z]/` 
   - Backticks: `/^`{1,3}[^`]/`
   - Texto normal: líneas que empiezan con mayúscula sin corchetes

3. **Limpiar el código extraído antes de pasar a Mermaid**
   - En `MermaidRenderer.tsx`: añadir limpieza adicional para eliminar backticks residuales al final del bloque

## Cambios Específicos

### Archivo: `src/utils/normalizeMarkdownDiagrams.ts`

Añadir función para detectar patrones que definitivamente NO son Mermaid:

```typescript
function definitelyNotMermaid(line: string): boolean {
  const trimmed = line.trim();
  
  // Backticks sueltos (fin de código o errores)
  if (/^`{1,3}$/.test(trimmed)) return true;
  if (/^`{1,3}[^`\n]/.test(trimmed) && !trimmed.includes('mermaid')) return true;
  
  // Bullets markdown: "* texto", "- texto"  
  if (/^[\*\-]\s+[^\[\(\{]/.test(trimmed)) return true;
  
  // Texto narrativo que empieza con mayúscula sin sintaxis Mermaid
  if (/^[A-ZÁÉÍÓÚ][a-záéíóú]+\s+[a-záéíóú]/.test(trimmed) && 
      !/[\[\]\(\)\{\}]|-->|---/.test(trimmed)) return true;
  
  return false;
}
```

En la función `wrapUnfencedMermaid()`, añadir check al inicio del loop:

```typescript
if (inMermaidBlock) {
  // NUEVO: Detectar fin explícito del diagrama
  if (definitelyNotMermaid(trimmed)) {
    // Cerrar bloque Mermaid
    processedLines.push('```mermaid');
    processedLines.push(...mermaidBuffer);
    processedLines.push('```');
    // Añadir la línea actual como texto normal
    processedLines.push(line);
    inMermaidBlock = false;
    mermaidBuffer = [];
    continue;
  }
  // ... resto de la lógica existente
}
```

### Archivo: `src/components/advisor/MermaidRenderer.tsx`

Limpiar contenido antes de renderizar - eliminar backticks residuales y líneas no-Mermaid al final:

```typescript
// Dentro de renderDiagram()
let cleanContent = content.trim();
if (cleanContent.startsWith('```')) {
  cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
}

// NUEVO: Eliminar backticks sueltos y texto no-mermaid al final
cleanContent = cleanContent.replace(/`{1,3}\s*$/, '').trim();

// NUEVO: Si hay líneas que claramente no son Mermaid al final, removerlas
const lines = cleanContent.split('\n');
while (lines.length > 0) {
  const lastLine = lines[lines.length - 1].trim();
  // Remover líneas vacías o que son claramente markdown
  if (!lastLine || /^[\*\-]\s/.test(lastLine) || /^[A-Z][a-z]+\s/.test(lastLine)) {
    lines.pop();
  } else {
    break;
  }
}
cleanContent = lines.join('\n');
```

## Beneficios

1. **Solución robusta**: Detecta correctamente dónde termina el diagrama
2. **Doble protección**: Limpieza tanto en extracción como en renderizado
3. **No afecta diagramas válidos**: Solo corta cuando detecta contenido claramente no-Mermaid
4. **Sin cambios en Railway**: Todo se maneja en frontend

## Verificación

Después de implementar:
1. El diagrama de flujo se renderizará correctamente (sin el texto `* *C1:...`)
2. El contenido markdown debajo (`* *C1: Pre-lavado**`) se mostrará como texto normal
3. No habrá error "Parse error" en consola
