

# Plan: Solución Integral para Renderizado de Diagramas Flow y Mermaid

## Problema Diagnosticado

Después de un análisis profundo del código, he identificado **múltiples puntos de falla** en el sistema de renderizado de diagramas:

### 1. Problema Principal: ReactMarkdown no procesa correctamente los code fences

El flujo actual depende de que ReactMarkdown detecte `className.includes('language-mermaid')` en el componente `pre`, pero hay casos donde:
- El parser de remark/rehype no propaga correctamente el `className` al elemento `code` interno
- El LLM envía los fences con variaciones (espacios, mayúsculas, etc.)
- El contenido llega como texto plano sin los backticks

### 2. La detección de fallback `isMermaidContent()` solo busca en párrafos

El detector en `p` solo actúa cuando el diagrama llega como texto dentro de un párrafo, pero no cuando viene en otros contextos (listas, blockquotes, etc.)

### 3. El `FlowDiagramRenderer` tiene filtros muy estrictos

Las funciones `isCalculationLine`, `isDescriptiveWithArrow`, etc. excluyen demasiados casos legítimos de flujos simples tipo `A → B → C`.

---

## Solución Propuesta (Multi-capa)

### Estrategia 1: Pre-procesamiento de Markdown antes de ReactMarkdown

Crear una función que normalice el contenido ANTES de pasarlo a ReactMarkdown:

```typescript
// src/utils/normalizeMarkdownDiagrams.ts

export function normalizeMarkdownDiagrams(text: string): string {
  let result = text;
  
  // 1. Normalizar variaciones de fences de mermaid
  // Detectar: ```mermaid, ```Mermaid, ``` mermaid, etc.
  result = result.replace(
    /```\s*[Mm]ermaid\s*\n([\s\S]*?)```/g,
    (_, content) => `\`\`\`mermaid\n${content.trim()}\n\`\`\``
  );
  
  // 2. Detectar diagramas mermaid SIN fences y añadirlas
  // Buscar patrones: flowchart, graph TD, sequenceDiagram al inicio de línea
  const mermaidKeywords = [
    'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey'
  ];
  
  const lines = result.split('\n');
  const processedLines: string[] = [];
  let inMermaidBlock = false;
  let mermaidBuffer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detectar inicio de mermaid sin fences
    const startsWithKeyword = mermaidKeywords.some(kw => 
      trimmed.toLowerCase().startsWith(kw.toLowerCase())
    );
    
    if (startsWithKeyword && !inMermaidBlock && !isInsideCodeBlock(processedLines)) {
      inMermaidBlock = true;
      mermaidBuffer = [line];
      continue;
    }
    
    if (inMermaidBlock) {
      // Continuar hasta línea vacía o fin de estructura mermaid
      if (trimmed === '' || !looksLikeMermaidContinuation(trimmed)) {
        // Cerrar bloque mermaid
        processedLines.push('```mermaid');
        processedLines.push(...mermaidBuffer);
        processedLines.push('```');
        processedLines.push(line);
        inMermaidBlock = false;
        mermaidBuffer = [];
      } else {
        mermaidBuffer.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  // Cerrar bloque pendiente
  if (inMermaidBlock && mermaidBuffer.length > 0) {
    processedLines.push('```mermaid');
    processedLines.push(...mermaidBuffer);
    processedLines.push('```');
  }
  
  return processedLines.join('\n');
}
```

### Estrategia 2: Renderizador de fallback usando `useEffect` post-render

Crear un componente que escanee el DOM después del render y convierta cualquier texto Mermaid no procesado:

```typescript
// src/components/advisor/MermaidPostProcessor.tsx

export function useMermaidPostProcessor(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Buscar todos los <pre> y <code> que contengan sintaxis mermaid no renderizada
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    
    codeBlocks.forEach(async (block) => {
      const text = block.textContent || '';
      if (isMermaidContent(text)) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, text);
          
          // Reemplazar el bloque de código con el SVG
          const container = document.createElement('div');
          container.className = 'mermaid-diagram my-4';
          container.innerHTML = svg;
          block.parentElement?.replaceWith(container);
        } catch (err) {
          console.warn('Mermaid post-process failed:', err);
        }
      }
    });
  }, [containerRef]);
}
```

### Estrategia 3: Simplificar detección de FlowDiagramRenderer

Reescribir `containsFlowDiagram` con reglas más claras y menos falsos negativos:

```typescript
// Nuevo enfoque: lista blanca en lugar de lista negra
export function containsFlowDiagram(text: string): boolean {
  if (!text || text.length < 5) return false;
  
  const normalized = normalizeArrows(text);
  
  // DEBE tener patrón A → B (texto, flecha, texto)
  const arrowPattern = /\S+\s*→\s*\S+/;
  if (!arrowPattern.test(normalized)) return false;
  
  // DEBE tener al menos 2 flechas O corchetes
  const arrowCount = (normalized.match(/→/g) || []).length;
  const hasBrackets = /\[[^\]]+\]/.test(normalized);
  
  // Excluir SOLO casos muy claros de NO-flujos
  // 1. Tablas markdown (múltiples |)
  if ((normalized.match(/\|/g) || []).length >= 3) return false;
  
  // 2. Fórmulas matemáticas con = y números
  if (/\d+\s*[×=]\s*\d+/.test(normalized)) return false;
  
  return arrowCount >= 2 || hasBrackets;
}
```

### Estrategia 4: Usar rehype-raw para mejor parsing de HTML en Markdown

Añadir `rehype-raw` para permitir que HTML embebido (como `<div class="mermaid">`) sea procesado:

```typescript
// En AdvisorMessage.tsx y StreamingResponse.tsx
import rehypeRaw from 'rehype-raw';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw]}
  // ...
>
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/normalizeMarkdownDiagrams.ts` | **NUEVO** - Pre-procesador de markdown |
| `src/utils/fixMarkdownTables.ts` | Integrar pre-procesador en `cleanMarkdownContent` |
| `src/components/advisor/AdvisorMessage.tsx` | Añadir rehype-raw, usar pre-procesador |
| `src/components/advisor/streaming/StreamingResponse.tsx` | Ídem |
| `src/components/advisor/FlowDiagramRenderer.tsx` | Simplificar `containsFlowDiagram` |
| `src/components/advisor/MermaidRenderer.tsx` | Añadir reintentos y mejor manejo de errores |

---

## Flujo de Renderizado Propuesto

```text
Contenido del LLM
       │
       ▼
┌──────────────────────────────────┐
│ 1. normalizeMarkdownDiagrams()   │  ← Normaliza fences, detecta mermaid sin fences
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 2. cleanMarkdownContent()        │  ← Limpieza existente + nuevo normalizador
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 3. ReactMarkdown + rehype-raw    │  ← Parser mejorado
│    ├── pre[language-mermaid]     │  → MermaidRenderer
│    ├── pre[language-flow]        │  → FlowDiagramRenderer
│    └── p (fallback detection)    │  → MermaidRenderer si isMermaidContent()
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 4. Post-render check (useEffect) │  ← Captura casos que escaparon
└──────────────────────────────────┘
```

---

## Dependencias Nuevas

```bash
npm install rehype-raw
```

---

## Sección Técnica: Detalles de Implementación

### Por qué falla el sistema actual

1. **ReactMarkdown + remark-gfm** procesa código fenced correctamente, pero el `className` solo aparece cuando hay un lenguaje explícito (`\`\`\`mermaid`)

2. El modelo LLM a veces devuelve:
   - `\`\`\`Mermaid` (mayúscula)
   - `\`\`\` mermaid` (espacio)
   - Diagrama sin fences (solo el texto plano)

3. El `FlowDiagramRenderer` actual tiene ~100 líneas de exclusiones que bloquean casos legítimos

### Orden de implementación recomendado

1. Crear `normalizeMarkdownDiagrams.ts`
2. Integrar en `cleanMarkdownContent()`
3. Simplificar `containsFlowDiagram()`
4. Añadir `rehype-raw` a los componentes
5. Probar con ejemplos reales del chat
6. Añadir post-processor como fallback final

