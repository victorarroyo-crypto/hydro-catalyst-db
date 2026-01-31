/**
 * Utility to detect Mermaid diagram syntax in text content.
 * Used as a fallback when diagrams arrive without proper code fences.
 */

// Mermaid diagram type keywords that appear at the start of a diagram
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

// Mermaid directions
const MERMAID_DIRECTIONS = ['LR', 'RL', 'TD', 'TB', 'BT'];

/**
 * Checks if a string looks like a Mermaid diagram definition.
 * Detects patterns like "flowchart LR", "graph TD", "sequenceDiagram", etc.
 * Enhanced to handle HTML tags, edge labels, and complex syntax.
 */
export function isMermaidContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (trimmed.length < 10) return false; // Too short to be a diagram
  
  // Get the first line
  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();
  
  // Check if first line matches a Mermaid diagram type
  for (const keyword of MERMAID_KEYWORDS) {
    const lowerLine = firstLine.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Match exact keyword or keyword with direction (LR, TD, etc.)
    if (lowerLine.startsWith(lowerKeyword)) {
      const remaining = firstLine.slice(keyword.length).trim();
      
      // Valid if nothing after, or just a direction, or direction with content
      if (
        remaining === '' ||
        MERMAID_DIRECTIONS.some(d => remaining.toUpperCase() === d) ||
        MERMAID_DIRECTIONS.some(d => remaining.toUpperCase().startsWith(d + ' ')) ||
        MERMAID_DIRECTIONS.some(d => remaining.toUpperCase().startsWith(d + '\n'))
      ) {
        // Additional check: must have diagram content (nodes/edges)
        if (lines.length >= 2) {
          const hasNodes = /[\[\(\{].*[\]\)\}]/.test(trimmed);
          const hasEdges = /-->|---|\.->|==>/.test(trimmed);
          return hasNodes || hasEdges;
        }
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Checks if text is a mermaid placeholder (:::mermaid-placeholder-N:::)
 */
export function isMermaidPlaceholder(text: string): { isPlaceholder: boolean; index: number } {
  const match = text.trim().match(/^:::mermaid-placeholder-(\d+):::$/);
  if (match) {
    return { isPlaceholder: true, index: parseInt(match[1], 10) };
  }
  return { isPlaceholder: false, index: -1 };
}

/**
 * Extracts text content from React children (handles nested elements).
 */
export function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  
  // Handle React elements - preserve newlines in code/pre blocks
  if (typeof children === 'object' && children !== null) {
    if ('props' in children) {
      const props = (children as any).props;
      // If it's a code element, get its children
      if (props?.children !== undefined) {
        return extractTextFromChildren(props.children);
      }
    }
  }
  
  return '';
}
