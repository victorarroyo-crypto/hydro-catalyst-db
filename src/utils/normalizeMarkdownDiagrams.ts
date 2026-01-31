/**
 * Pre-processor for Markdown content to normalize diagram syntax.
 * Ensures Mermaid diagrams render correctly regardless of LLM formatting.
 */

/**
 * Detects patterns that are DEFINITELY NOT Mermaid syntax.
 * Used to identify when a Mermaid block has ended and normal markdown begins.
 */
function definitelyNotMermaid(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Backticks sueltos (fin de código o errores) - pero no ```mermaid
  if (/^`{1,3}$/.test(trimmed)) return true;
  if (/^`{1,3}[^`\n]/.test(trimmed) && !trimmed.toLowerCase().includes('mermaid')) return true;
  
  // Bullets markdown: "* texto", "- texto" (pero no nodos Mermaid con corchetes)
  if (/^[\*\-]\s+[^\[\(\{]/.test(trimmed) && !/-->|---/.test(trimmed)) return true;
  
  // Bullets con negrita markdown: "* *Texto**" o "* **Texto**"
  if (/^[\*\-]\s+\*+[A-Za-záéíóúÁÉÍÓÚ]/.test(trimmed)) return true;
  
  // Texto narrativo que empieza con mayúscula sin sintaxis Mermaid
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[a-záéíóúñ]/.test(trimmed) && 
      !/[\[\]\(\)\{\}]|-->|---|\.->|==>/.test(trimmed)) return true;
  
  // Líneas que empiezan con números seguidos de punto (listas numeradas markdown)
  if (/^\d+\.\s+/.test(trimmed) && !/[\[\]\(\)\{\}]/.test(trimmed)) return true;
  
  return false;
}

// Mermaid diagram type keywords
const MERMAID_KEYWORDS = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'quadrantChart',
  'requirementDiagram',
  'gitGraph',
  'mindmap',
  'timeline',
  'sankey',
  'xychart',
  'block',
];

// Mermaid direction keywords that may follow the diagram type
const MERMAID_DIRECTIONS = ['LR', 'RL', 'TD', 'TB', 'BT'];

/**
 * Checks if a line looks like a Mermaid continuation (node, edge, subgraph, etc.)
 * Enhanced to support HTML tags, edge labels, and more patterns.
 */
function looksLikeMermaidContinuation(line: string, insideMermaidBlock: boolean = false): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // If we're inside a mermaid block, be more permissive
  // Lines with indentation are likely continuations
  if (insideMermaidBlock && (line.startsWith('  ') || line.startsWith('\t'))) {
    return true;
  }
  
  // Standard Mermaid patterns:
  
  // Edge patterns: -->, ---, -.>, -.->, ==>, ~~~, -.->
  const hasEdge = /-->|---|\.->|-\.->|==>|~~~|-.->|-->>|--x|--o/.test(trimmed);
  
  // Node patterns: A[Label], A((Label)), A{Label}, A>Label], A([Label])
  // Enhanced to support HTML inside brackets like <br>
  const hasNode = /\[[^\]]*\]|\(\([^)]*\)\)|{[^}]*}|>\s*[^\]]*\]|\(\[[^\]]*\]\)/.test(trimmed);
  
  // Edge labels with pipes: A -->|text| B
  const hasEdgeLabel = /-->\|[^|]*\|/.test(trimmed);
  
  // HTML inside brackets is valid Mermaid: A[Label<br>More text]
  const hasHtmlInNode = /<br\s*\/?>/.test(trimmed) && /[\[\(\{]/.test(trimmed);
  
  // Mermaid keywords
  const isKeyword = /^(subgraph|end|style|class|classDef|click|linkStyle|direction)\b/i.test(trimmed);
  
  // Comments
  const isComment = trimmed.startsWith('%%');
  
  // Node ID at start (alphanumeric) with brackets or edges
  const startsWithId = /^[A-Za-z0-9_]/.test(trimmed);
  const hasIdWithNode = startsWithId && /[\[\(\{]/.test(trimmed);
  const hasIdWithEdge = startsWithId && hasEdge;
  
  // Inside a block, also accept lines that start with valid node IDs
  // even if they don't have brackets (could be edge definitions)
  if (insideMermaidBlock && startsWithId && /^[A-Za-z0-9_]+\s*(-->|---|\.->)/.test(trimmed)) {
    return true;
  }
  
  return hasEdge || hasNode || hasEdgeLabel || hasHtmlInNode || 
         isKeyword || isComment || hasIdWithNode || hasIdWithEdge;
}

/**
 * Checks if the current processed lines indicate we're inside a code block
 */
function isInsideCodeBlock(lines: string[]): boolean {
  let count = 0;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      count++;
    }
  }
  return count % 2 === 1; // Odd number means inside a code block
}

/**
 * Normalizes Mermaid code fence variations to standard format.
 * Handles: ```Mermaid, ``` mermaid, ```  mermaid, etc.
 */
function normalizeMermaidFences(text: string): string {
  // Match: ``` followed by optional spaces, then mermaid (case-insensitive)
  // Capture the content and normalize
  return text.replace(
    /```\s*[Mm][Ee][Rr][Mm][Aa][Ii][Dd]\s*\n([\s\S]*?)```/g,
    (_, content) => `\`\`\`mermaid\n${content.trim()}\n\`\`\``
  );
}

/**
 * Detects unfenced Mermaid diagrams and wraps them in proper code fences.
 * Only triggers when a line starts with a Mermaid keyword.
 */
function wrapUnfencedMermaid(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inMermaidBlock = false;
  let mermaidBuffer: string[] = [];
  let consecutiveEmptyLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip if inside existing code block
    if (isInsideCodeBlock(processedLines)) {
      processedLines.push(line);
      continue;
    }
    
    // Check if this line starts a Mermaid diagram (keyword at start)
    const startsWithKeyword = MERMAID_KEYWORDS.some(kw => {
      const lowerLine = trimmed.toLowerCase();
      const lowerKw = kw.toLowerCase();
      
      if (!lowerLine.startsWith(lowerKw)) return false;
      
      // Must be followed by nothing, whitespace, or direction
      const after = trimmed.slice(kw.length).trim();
      if (after === '') return true;
      if (MERMAID_DIRECTIONS.some(d => after.toUpperCase().startsWith(d))) return true;
      // Also allow continuing on same line
      return /^(LR|RL|TD|TB|BT)?\s*$/i.test(after) || /^(LR|RL|TD|TB|BT)\s+\w/.test(after);
    });
    
    if (startsWithKeyword && !inMermaidBlock) {
      inMermaidBlock = true;
      mermaidBuffer = [line];
      consecutiveEmptyLines = 0;
      continue;
    }
    
    if (inMermaidBlock) {
      // NUEVO: Detectar fin explícito del diagrama antes de cualquier otra cosa
      if (definitelyNotMermaid(trimmed)) {
        // Cerrar bloque Mermaid
        processedLines.push('```mermaid');
        processedLines.push(...mermaidBuffer);
        processedLines.push('```');
        // Añadir la línea actual como texto normal
        processedLines.push(line);
        inMermaidBlock = false;
        mermaidBuffer = [];
        consecutiveEmptyLines = 0;
        continue;
      }
      
      const isEmpty = trimmed === '';
      
      if (isEmpty) {
        consecutiveEmptyLines++;
        
        // Allow up to 1 empty line inside a diagram
        if (consecutiveEmptyLines <= 1) {
          // Check if next non-empty line continues the diagram
          let nextNonEmptyIdx = i + 1;
          while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === '') {
            nextNonEmptyIdx++;
          }
          
          const nextLine = lines[nextNonEmptyIdx]?.trim() || '';
          if (looksLikeMermaidContinuation(nextLine, true)) {
            mermaidBuffer.push(line);
            continue;
          }
        }
        
        // End of diagram - flush buffer
        processedLines.push('```mermaid');
        processedLines.push(...mermaidBuffer);
        processedLines.push('```');
        processedLines.push(line);
        inMermaidBlock = false;
        mermaidBuffer = [];
        consecutiveEmptyLines = 0;
        continue;
      }
      
      // Reset empty line counter when we see content
      consecutiveEmptyLines = 0;
      
      // Check if this line continues the diagram
      const isContinuation = looksLikeMermaidContinuation(trimmed, true);
      
      if (isContinuation) {
        mermaidBuffer.push(line);
      } else {
        // Not a continuation - end the block
        processedLines.push('```mermaid');
        processedLines.push(...mermaidBuffer);
        processedLines.push('```');
        processedLines.push(line);
        inMermaidBlock = false;
        mermaidBuffer = [];
      }
    } else {
      processedLines.push(line);
    }
  }
  
  // Handle unclosed block at end
  if (inMermaidBlock && mermaidBuffer.length > 0) {
    processedLines.push('```mermaid');
    processedLines.push(...mermaidBuffer);
    processedLines.push('```');
  }
  
  return processedLines.join('\n');
}

/**
 * Extracts Mermaid blocks from content and returns placeholders.
 * This allows ReactMarkdown to process text without fragmenting diagrams.
 */
export function extractMermaidBlocks(text: string): { 
  processedContent: string; 
  mermaidBlocks: string[] 
} {
  const mermaidBlocks: string[] = [];
  
  // Match properly fenced mermaid blocks
  const processedContent = text.replace(
    /```mermaid\s*\n([\s\S]*?)\n```/g,
    (_, content) => {
      const index = mermaidBlocks.length;
      mermaidBlocks.push(content.trim());
      return `\n\n:::mermaid-placeholder-${index}:::\n\n`;
    }
  );
  
  return { processedContent, mermaidBlocks };
}

/**
 * Main pre-processor: normalizes all diagram syntax in Markdown content.
 * Should be called BEFORE passing content to ReactMarkdown.
 */
export function normalizeMarkdownDiagrams(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Step 1: Normalize existing Mermaid fences (case variations, spacing)
  result = normalizeMermaidFences(result);
  
  // Step 2: Detect and wrap unfenced Mermaid diagrams
  result = wrapUnfencedMermaid(result);
  
  return result;
}
