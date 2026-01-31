/**
 * Comprehensive Mermaid content sanitizer.
 * 
 * This module provides robust cleaning of Mermaid diagram content,
 * handling all known LLM formatting issues including:
 * - Malformed backtick fences (`, `` ``, ```, ````)
 * - Missing newlines between fences and content
 * - Markdown content leaking into Mermaid blocks
 * - Invalid syntax at the end of blocks
 */

// Valid Mermaid diagram type declarations
const MERMAID_DIAGRAM_TYPES = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'journey',
  'gantt', 'pie', 'quadrantChart', 'requirementDiagram',
  'gitGraph', 'mindmap', 'timeline', 'sankey', 'xychart', 'block'
];

// Valid Mermaid keywords that can appear on their own line
const MERMAID_KEYWORDS = [
  'subgraph', 'end', 'style', 'class', 'classDef', 'click',
  'linkStyle', 'direction', 'participant', 'actor', 'note',
  'loop', 'alt', 'else', 'opt', 'par', 'critical', 'break',
  'rect', 'activate', 'deactivate', 'title', 'section'
];

// Directions that follow flowchart/graph
const MERMAID_DIRECTIONS = ['LR', 'RL', 'TD', 'TB', 'BT'];

/**
 * Checks if a line is valid Mermaid syntax.
 */
function isValidMermaidLine(line: string): boolean {
  const trimmed = line.trim();
  
  // Empty lines are valid (spacing)
  if (!trimmed) return true;
  
  // Comments are valid
  if (trimmed.startsWith('%%')) return true;
  
  // Diagram type declarations
  const lowerTrimmed = trimmed.toLowerCase();
  for (const type of MERMAID_DIAGRAM_TYPES) {
    if (lowerTrimmed.startsWith(type.toLowerCase())) {
      const rest = trimmed.slice(type.length).trim();
      // Must be followed by nothing, direction, or content
      if (!rest || MERMAID_DIRECTIONS.some(d => rest.toUpperCase().startsWith(d))) {
        return true;
      }
      // Or followed by node definitions on same line
      if (/^(LR|RL|TD|TB|BT)?\s*\w/.test(rest)) return true;
    }
  }
  
  // Mermaid keywords
  for (const kw of MERMAID_KEYWORDS) {
    if (lowerTrimmed.startsWith(kw.toLowerCase())) return true;
  }
  
  // Node definitions: ID[Label], ID((Label)), ID{Label}, ID>Label], ID([Label])
  if (/^[A-Za-z0-9_]+\s*[\\[(\\{>]/.test(trimmed)) return true;
  
  // Edge definitions: -->, ---, -.>, ==>, etc.
  if (/-->|---|.->|--.->|==>|~~~|-.->|-->>|--x|--o|<-->/.test(trimmed)) return true;
  
  // Edge with label: -->|text|
  if (/-->\|[^|]*\|/.test(trimmed)) return true;
  
  // Continuation of node with brackets
  if (/[\[(\\{].*[\])}]/.test(trimmed)) return true;
  
  // Style definitions
  if (/^(fill|stroke|color|font-size|stroke-width):/i.test(trimmed)) return true;
  
  // Alphanumeric ID followed by edge or bracket
  if (/^[A-Za-z0-9_]+\s*(-->|---|.->)/.test(trimmed)) return true;
  
  // Just an ID (could be part of edge definition on next line)
  if (/^[A-Za-z0-9_]+$/.test(trimmed)) return true;
  
  return false;
}

/**
 * Checks if a line is definitely NOT Mermaid and should terminate the block.
 */
function isDefinitelyNotMermaid(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Any backticks (malformed fence closures)
  if (/^`{1,4}/.test(trimmed)) return true;
  
  // Markdown headers: #, ##, ###, etc.
  if (/^#{1,6}\s/.test(trimmed)) return true;
  
  // Markdown bullets: * text, - text (but not Mermaid node refs)
  if (/^[\*\-]\s+[^\[(\\{]/.test(trimmed) && !/-->|---/.test(trimmed)) return true;
  
  // Markdown bullets with bold: * **text** or - **text**
  if (/^[\*\-]\s+\*+[A-Za-z]/.test(trimmed)) return true;
  
  // Numbered lists that aren't Mermaid: 1. Text, 2. Text
  if (/^\d+\.\s+[A-Za-z]/.test(trimmed) && !/[\[(\\{]/.test(trimmed)) return true;
  
  // Narrative text: starts with uppercase followed by lowercase words
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[a-záéíóúñ]+/.test(trimmed) && 
      !/[\[\]\(\)\{\}]|-->|---|.->|==>/.test(trimmed)) return true;
  
  // Blockquotes
  if (trimmed.startsWith('>')) return true;
  
  // HTML-like tags that aren't Mermaid (Mermaid uses <br> inside nodes)
  if (/^<\/[a-z]+>$/i.test(trimmed)) return true;
  
  // Colons followed by text (definitions, not Mermaid)
  if (/^[A-Za-z]+:\s+[A-Za-z]/.test(trimmed) && !/^(fill|stroke|color|font|style):/i.test(trimmed)) return true;
  
  return false;
}

/**
 * Sanitizes Mermaid content by removing any non-Mermaid lines.
 * This is the main function to call before rendering.
 */
export function sanitizeMermaidContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Step 1: Remove any fence markers at the start
  cleaned = cleaned.replace(/^```\s*\w*\s*\n?/, '');
  
  // Step 2: Remove any fence markers at the end
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  
  // Step 3: Handle malformed fences with content attached (e.g., "```###", "``###")
  // Split on any backtick sequence followed by non-backtick content
  const fenceMatch = cleaned.match(/^([\s\S]*?)(`{1,4})([^`\n])/);
  if (fenceMatch) {
    // Keep only the part before the malformed fence
    cleaned = fenceMatch[1].trim();
  }
  
  // Step 4: Also check for backticks anywhere in the middle of content
  const midFenceIdx = cleaned.indexOf('`');
  if (midFenceIdx !== -1) {
    // Check if it's a malformed fence (followed by # or narrative)
    const afterBacktick = cleaned.slice(midFenceIdx + 1);
    if (/^`*[#\*\-A-ZÁÉÍÓÚÑ]/.test(afterBacktick)) {
      cleaned = cleaned.slice(0, midFenceIdx).trim();
    }
  }
  
  // Step 5: Process line by line and remove invalid lines from the END
  const lines = cleaned.split('\n');
  
  // Remove invalid lines from the end
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (isDefinitelyNotMermaid(lastLine) || (!lastLine.trim() && lines.length > 1)) {
      lines.pop();
    } else if (!isValidMermaidLine(lastLine) && lines.length > 1) {
      // If not explicitly valid and not at the start, remove
      lines.pop();
    } else {
      break;
    }
  }
  
  // Step 6: Check if we have valid Mermaid structure
  const result = lines.join('\n').trim();
  
  // Must start with a valid diagram type
  const hasValidStart = MERMAID_DIAGRAM_TYPES.some(type => 
    result.toLowerCase().startsWith(type.toLowerCase())
  );
  
  if (!hasValidStart && result) {
    // Try to find where Mermaid content actually starts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      if (MERMAID_DIAGRAM_TYPES.some(type => line.startsWith(type.toLowerCase()))) {
        return lines.slice(i).join('\n').trim();
      }
    }
  }
  
  return result;
}

/**
 * Pre-validates if content looks like it could be valid Mermaid.
 * Use this to decide whether to attempt rendering.
 */
export function isLikelyValidMermaid(content: string): boolean {
  if (!content || content.trim().length < 10) return false;
  
  const cleaned = sanitizeMermaidContent(content);
  if (!cleaned) return false;
  
  // Must start with a diagram type
  const lowerContent = cleaned.toLowerCase();
  const hasValidStart = MERMAID_DIAGRAM_TYPES.some(type => 
    lowerContent.startsWith(type.toLowerCase())
  );
  
  if (!hasValidStart) return false;
  
  // Must have at least some structure (nodes, edges, keywords)
  const hasStructure = 
    /[\[(\\{]/.test(cleaned) || // Has brackets (nodes)
    /-->|---|==>/.test(cleaned) || // Has edges
    MERMAID_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw.toLowerCase())); // Has keywords
  
  return hasStructure;
}

/**
 * Extracts the diagram type from Mermaid content.
 */
export function extractDiagramType(content: string): string | null {
  const cleaned = sanitizeMermaidContent(content);
  if (!cleaned) return null;
  
  const lowerContent = cleaned.toLowerCase();
  for (const type of MERMAID_DIAGRAM_TYPES) {
    if (lowerContent.startsWith(type.toLowerCase())) {
      return type;
    }
  }
  
  return null;
}
