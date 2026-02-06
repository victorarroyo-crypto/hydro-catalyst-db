/**
 * Comprehensive pre-processor for Markdown content with Mermaid diagrams.
 * 
 * This module handles ALL known LLM formatting issues:
 * - Malformed backtick fences (1-4 backticks instead of exactly 3)
 * - Missing newlines between fences and content  
 * - Mixed backtick counts in opening/closing fences
 * - Mermaid blocks that "swallow" subsequent markdown
 * - Unfenced Mermaid diagrams that need wrapping
 */

import { sanitizeMermaidContent } from './mermaidSanitizer';

// Mermaid diagram type keywords
const MERMAID_KEYWORDS = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'journey',
  'gantt', 'pie', 'quadrantChart', 'requirementDiagram',
  'gitGraph', 'mindmap', 'timeline', 'sankey', 'xychart', 'block'
];

// Mermaid direction keywords
const MERMAID_DIRECTIONS = ['LR', 'RL', 'TD', 'TB', 'BT'];

/**
 * Patterns that indicate end of Mermaid content and start of markdown.
 * Used to detect where LLM failed to properly close a fence.
 */
const MARKDOWN_START_PATTERNS = [
  /^#{1,6}\s/,           // Headers: # Title, ## Title, etc.
  /^[\*\-]\s+[^\[\(\{]/,  // Bullets: * text, - text (not Mermaid nodes)
  /^[\*\-]\s+\*+[A-Za-z]/, // Bold bullets: * **text**
  /^\d+\.\s+[A-Za-z]/,   // Numbered lists: 1. Text
  /^>\s/,                // Blockquotes: > text
  /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[a-záéíóúñ]+\s+[a-záéíóúñ]/, // Narrative: "El sistema permite..."
];

/**
 * Checks if a line looks like the start of regular markdown content.
 */
function looksLikeMarkdownStart(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Any backticks at start = fence attempt
  if (/^`{1,4}/.test(trimmed)) return true;
  
  return MARKDOWN_START_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Checks if a line is a Mermaid continuation (valid inside a diagram).
 */
function isMermaidContent(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true; // Empty lines OK
  
  // Comments
  if (trimmed.startsWith('%%')) return true;
  
  // Keywords
  const lowerTrimmed = trimmed.toLowerCase();
  if (['subgraph', 'end', 'style', 'class', 'classDef', 'click', 'linkStyle', 'direction',
       'participant', 'actor', 'note', 'loop', 'alt', 'else', 'opt', 'par', 'rect',
       'activate', 'deactivate', 'title', 'section'].some(kw => lowerTrimmed.startsWith(kw))) {
    return true;
  }
  
  // Edges
  if (/-->|---|\.->|-\.->|==>|~~~|-.->|-->>|--x|--o|<-->/.test(trimmed)) return true;
  
  // Nodes (ID with brackets)
  if (/^[A-Za-z0-9_]+\s*[\[\(\{>]/.test(trimmed)) return true;
  
  // Brackets somewhere
  if (/[\[\(\{].*[\]\)\}]/.test(trimmed)) return true;
  
  // Just an ID
  if (/^[A-Za-z0-9_]+$/.test(trimmed)) return true;
  
  return false;
}

/**
 * AGGRESSIVE fence fixer - handles ALL malformed backtick patterns.
 * This is the first line of defense.
 */
function aggressiveFenceFixer(text: string): string {
  let result = text;
  
  // Pattern: Any 1-4 backticks followed immediately by markdown content
  // (headers, bullets, narrative text, etc.)
  
  // Handle 4 backticks (````###, ````* )
  result = result.replace(/````(#{1,6}\s)/g, '```\n$1');
  result = result.replace(/````([\*\-]\s)/g, '```\n$1');
  result = result.replace(/````(\d+\.\s)/g, '```\n$1');
  result = result.replace(/````([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, '```\n$1');
  
  // Handle 3 backticks (```###, ```* )
  result = result.replace(/```(#{1,6}\s)/g, '```\n$1');
  result = result.replace(/```([\*\-]\s)/g, '```\n$1');
  result = result.replace(/```(\d+\.\s)/g, '```\n$1');
  result = result.replace(/```([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, '```\n$1');
  
  // Handle 2 backticks (``###, ``* )
  result = result.replace(/``(#{1,6}\s)/g, '```\n$1');
  result = result.replace(/``([\*\-]\s)/g, '```\n$1');
  result = result.replace(/``(\d+\.\s)/g, '```\n$1');
  result = result.replace(/``([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, '```\n$1');
  
  // Handle 1 backtick followed by header (`### - common LLM error)
  result = result.replace(/`(#{2,6}\s)/g, '```\n$1');
  
  // Clean up any resulting multiple newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

/**
 * Normalizes Mermaid code fence variations to standard format.
 * Handles: ```Mermaid, ``` mermaid, ```  mermaid, MERMAID, etc.
 * Also handles inline Mermaid (all content on one line).
 */
function normalizeMermaidFences(text: string): string {
  // First apply aggressive fence fixing
  let result = aggressiveFenceFixer(text);
  
  // Handle inline mermaid blocks (no newline after ```mermaid)
  // Pattern: ```mermaid flowchart TD A[x] --> B[y]```
  result = result.replace(
    /```\s*[Mm][Ee][Rr][Mm][Aa][Ii][Dd]\s+([^\n`]+)```/g,
    (match, inlineContent) => {
      // Clean and reformat the inline content
      const cleanedContent = sanitizeMermaidContent(inlineContent);
      return `\`\`\`mermaid\n${cleanedContent}\n\`\`\``;
    }
  );
  
  // Normalize case and spacing variations of mermaid fences (multi-line)
  result = result.replace(
    /```\s*[Mm][Ee][Rr][Mm][Aa][Ii][Dd]\s*\n([\s\S]*?)```/g,
    (match, content) => {
      // Clean the content using the sanitizer
      const cleanedContent = sanitizeMermaidContent(content);
      return `\`\`\`mermaid\n${cleanedContent}\n\`\`\``;
    }
  );
  
  return result;
}

/**
 * Checks if we're currently inside a code block based on processed lines.
 */
function isInsideCodeBlock(lines: string[]): boolean {
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) count++;
  }
  return count % 2 === 1;
}

/**
 * Detects unfenced Mermaid diagrams and wraps them in proper code fences.
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
    
    // Check if this line starts a Mermaid diagram
    const startsWithKeyword = MERMAID_KEYWORDS.some(kw => {
      const lowerLine = trimmed.toLowerCase();
      const lowerKw = kw.toLowerCase();
      
      if (!lowerLine.startsWith(lowerKw)) return false;
      
      const after = trimmed.slice(kw.length).trim();
      if (after === '') return true;
      if (MERMAID_DIRECTIONS.some(d => after.toUpperCase().startsWith(d))) return true;
      return /^(LR|RL|TD|TB|BT)?\s*$/i.test(after) || /^(LR|RL|TD|TB|BT)\s+\w/.test(after);
    });
    
    if (startsWithKeyword && !inMermaidBlock) {
      inMermaidBlock = true;
      mermaidBuffer = [line];
      consecutiveEmptyLines = 0;
      continue;
    }
    
    if (inMermaidBlock) {
      // Check if this line definitely ends the Mermaid block
      if (looksLikeMarkdownStart(trimmed)) {
        // Close the Mermaid block
        const cleanedBuffer = sanitizeMermaidContent(mermaidBuffer.join('\n'));
        if (cleanedBuffer) {
          processedLines.push('```mermaid');
          processedLines.push(cleanedBuffer);
          processedLines.push('```');
        }
        // Add this line as regular content
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
          // Peek ahead to see if diagram continues
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
          
          const nextLine = lines[nextIdx]?.trim() || '';
          if (isMermaidContent(nextLine)) {
            mermaidBuffer.push(line);
            continue;
          }
        }
        
        // End of diagram - flush buffer
        const cleanedBuffer = sanitizeMermaidContent(mermaidBuffer.join('\n'));
        if (cleanedBuffer) {
          processedLines.push('```mermaid');
          processedLines.push(cleanedBuffer);
          processedLines.push('```');
        }
        processedLines.push(line);
        inMermaidBlock = false;
        mermaidBuffer = [];
        consecutiveEmptyLines = 0;
        continue;
      }
      
      consecutiveEmptyLines = 0;
      
      // Check if line continues the diagram
      if (isMermaidContent(trimmed)) {
        mermaidBuffer.push(line);
      } else {
        // Not a continuation - end the block
        const cleanedBuffer = sanitizeMermaidContent(mermaidBuffer.join('\n'));
        if (cleanedBuffer) {
          processedLines.push('```mermaid');
          processedLines.push(cleanedBuffer);
          processedLines.push('```');
        }
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
    const cleanedBuffer = sanitizeMermaidContent(mermaidBuffer.join('\n'));
    if (cleanedBuffer) {
      processedLines.push('```mermaid');
      processedLines.push(cleanedBuffer);
      processedLines.push('```');
    }
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
      // Use the sanitizer to clean the content
      const cleanContent = sanitizeMermaidContent(content);
      if (cleanContent) {
        mermaidBlocks.push(cleanContent);
        return `\n\n:::mermaid-placeholder-${index}:::\n\n`;
      }
      // If nothing valid, don't create a placeholder
      return '';
    }
  );
  
  return { processedContent, mermaidBlocks };
}

/**
 * Normalizes malformed ReactFlow blocks to proper fenced format.
 * Handles: unfenced "reactflow { ... }" and incorrect backtick counts.
 */
function normalizeReactFlowBlocks(text: string): string {
  let result = text;
  
  // Pattern 1: "reactflow { ... }" without backticks (single or multi-line JSON)
  result = result.replace(
    /(?:^|\n)reactflow\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi,
    (match, jsonContent) => {
      return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
    }
  );
  
  // Pattern 2: Raw JSON with ReactFlow structure (has "nodes" and "edges")
  // This catches JSON objects that look like ReactFlow diagrams but have no prefix
  result = result.replace(
    /(?:^|\n)(\{\s*\n?\s*"(?:title|direction|nodes)"[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?"edges"\s*:\s*\[[\s\S]*?\]\s*\})/gi,
    (match, jsonContent) => {
      // Verify it's valid ReactFlow JSON before wrapping
      try {
        const parsed = JSON.parse(jsonContent.trim());
        if (parsed.nodes && Array.isArray(parsed.nodes) && 
            parsed.edges && Array.isArray(parsed.edges)) {
          return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
        }
      } catch (e) {
        // Not valid JSON, return as-is
      }
      return match;
    }
  );
  
  // Pattern 3: Incorrect backtick counts (1, 2 instead of 3)
  result = result.replace(
    /`{1,2}reactflow\s*\n?([\s\S]*?)`{1,2}(?!`)/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  // Pattern 4: Too many backticks (4+)
  result = result.replace(
    /`{4,}reactflow\s*\n?([\s\S]*?)`{4,}/gi,
    (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
  );
  
  return result;
}

/**
 * Main pre-processor: normalizes all diagram syntax in Markdown content.
 * Should be called BEFORE passing content to ReactMarkdown.
 */
export function normalizeMarkdownDiagrams(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Step 1: Aggressive fence fixing (handles ALL malformed backtick patterns)
  result = aggressiveFenceFixer(result);
  
  // Step 2: Normalize ReactFlow blocks (unfenced or malformed)
  result = normalizeReactFlowBlocks(result);
  
  // Step 3: Normalize existing Mermaid fences (case variations, spacing)
  result = normalizeMermaidFences(result);
  
  // Step 4: Detect and wrap unfenced Mermaid diagrams
  result = wrapUnfencedMermaid(result);
  
  return result;
}
