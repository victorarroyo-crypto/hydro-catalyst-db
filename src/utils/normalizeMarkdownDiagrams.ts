/**
 * Pre-processor for Markdown content to normalize diagram syntax.
 * Ensures Mermaid diagrams render correctly regardless of LLM formatting.
 */

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
 */
function looksLikeMermaidContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Common Mermaid patterns:
  // - Node definitions: A[Label] or A((Label)) or A{Label}
  // - Edge definitions: A --> B or A --- B or A -.-> B
  // - Subgraph: subgraph title
  // - End: end
  // - Style: style A fill:#fff
  // - Class definitions: class A,B className
  // - Click handlers: click A callback
  
  // Check for node/edge patterns
  const hasEdge = /-->|---|\.->|\-\.->|==>|~~~|-.->/.test(trimmed);
  const hasNode = /\[.*\]|\(\(.*\)\)|{.*}|>.*]/.test(trimmed);
  const isKeyword = /^(subgraph|end|style|class|classDef|click|linkStyle|direction)\b/i.test(trimmed);
  const isComment = trimmed.startsWith('%%');
  
  // Node ID pattern: starts with letter/number, may have brackets
  const startsWithId = /^[A-Za-z0-9_]/.test(trimmed);
  
  return hasEdge || hasNode || isKeyword || isComment || (startsWithId && (hasEdge || trimmed.includes('[')));
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
      // Also allow continuing on same line: "graph TD\n  A --> B" style isn't common but valid
      return /^(LR|RL|TD|TB|BT)?\s*$/i.test(after) || /^(LR|RL|TD|TB|BT)\s+\w/.test(after);
    });
    
    if (startsWithKeyword && !inMermaidBlock) {
      inMermaidBlock = true;
      mermaidBuffer = [line];
      continue;
    }
    
    if (inMermaidBlock) {
      // Check if we should continue or end the block
      const isContinuation = looksLikeMermaidContinuation(trimmed);
      const isEmpty = trimmed === '';
      
      // If empty line, check if next line continues the diagram
      if (isEmpty) {
        const nextLine = lines[i + 1]?.trim() || '';
        const nextIsContinuation = looksLikeMermaidContinuation(nextLine);
        
        if (nextIsContinuation) {
          // Keep empty line in buffer
          mermaidBuffer.push(line);
          continue;
        } else {
          // End of diagram
          processedLines.push('```mermaid');
          processedLines.push(...mermaidBuffer);
          processedLines.push('```');
          processedLines.push(line); // the empty line
          inMermaidBlock = false;
          mermaidBuffer = [];
          continue;
        }
      }
      
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
