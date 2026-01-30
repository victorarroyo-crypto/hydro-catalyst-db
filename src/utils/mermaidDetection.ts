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

// Regex pattern to match Mermaid diagram starts
const MERMAID_START_PATTERN = new RegExp(
  `^\\s*(${MERMAID_KEYWORDS.join('|')})\\s*(LR|RL|TD|TB|BT)?\\s*$`,
  'im'
);

/**
 * Checks if a string looks like a Mermaid diagram definition.
 * Detects patterns like "flowchart LR", "graph TD", "sequenceDiagram", etc.
 */
export function isMermaidContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (trimmed.length < 10) return false; // Too short to be a diagram
  
  // Check if first line matches a Mermaid diagram type
  const firstLine = trimmed.split('\n')[0].trim();
  
  for (const keyword of MERMAID_KEYWORDS) {
    // Match exact keyword or keyword with direction (LR, TD, etc.)
    if (
      firstLine.toLowerCase().startsWith(keyword.toLowerCase()) &&
      (firstLine.length === keyword.length || 
       /^[A-Z]{2}\s*$/.test(firstLine.slice(keyword.length).trim()) ||
       firstLine[keyword.length] === ' ' ||
       firstLine[keyword.length] === '\n')
    ) {
      return true;
    }
  }
  
  return MERMAID_START_PATTERN.test(trimmed);
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
  
  // Handle React elements
  if (typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as any).props?.children);
  }
  
  return '';
}
