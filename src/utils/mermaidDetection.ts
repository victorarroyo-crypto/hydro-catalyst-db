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
  `^\\s*(${MERMAID_KEYWORDS.join('|')})\\s*(LR|RL|TD|TB|BT)?`,
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
    const lowerLine = firstLine.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Match exact keyword or keyword with direction (LR, TD, etc.)
    if (lowerLine.startsWith(lowerKeyword)) {
      const remaining = firstLine.slice(keyword.length).trim();
      // Valid if nothing after, or just a direction, or starts with subgraph/node
      if (
        remaining === '' ||
        /^(LR|RL|TD|TB|BT)$/i.test(remaining) ||
        /^(LR|RL|TD|TB|BT)\s/i.test(remaining)
      ) {
        return true;
      }
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
