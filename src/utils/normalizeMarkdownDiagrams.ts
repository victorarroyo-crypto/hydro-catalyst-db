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
 * Cleans stray backticks that appear before code fences.
 * LLMs sometimes emit isolated backticks that break parsing.
 */
function cleanStrayBackticks(text: string): string {
  let result = text;
  
  // Single backtick on its own line before a fence
  result = result.replace(/^`\s*\n(```)/gm, '$1');
  result = result.replace(/\n`\s*\n(```)/g, '\n$1');
  
  // Single/double backticks immediately before fence (no newline)
  result = result.replace(/`{1,2}(```(?:reactflow|mermaid|flow|chem|equation))/gi, '$1');
  
  // Backtick followed by space/newline then fence
  result = result.replace(/`\s+(```(?:reactflow|mermaid|flow|chem|equation))/gi, '$1');
  
  return result;
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
 * Finds the end of a JSON object by balancing braces.
 * Returns the index of the closing brace, or -1 if not found.
 */
function findJsonEnd(text: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  
  return -1;
}

/**
 * Checks if text already contains valid ReactFlow fences.
 */
function hasValidReactFlowFences(text: string): boolean {
  // Match properly fenced reactflow blocks with balanced opening/closing
  return /```reactflow\s*\n[\s\S]*?\n```/gi.test(text);
}

/**
 * Normalizes malformed ReactFlow blocks to proper fenced format.
 * Handles: unfenced "reactflow { ... }" and incorrect backtick counts.
 * IMPORTANT: Does NOT process blocks that are already correctly fenced.
 */
function normalizeReactFlowBlocks(text: string): string {
  let result = text;
  
  // First: Clean stray backticks that could break parsing
  result = cleanStrayBackticks(result);
  
  // If there are already valid ReactFlow fences, skip most normalization
  // to avoid breaking well-formatted content
  const hasValidFences = hasValidReactFlowFences(result);
  
  // Pattern 1: "reactflow { ... }" without backticks (single or multi-line JSON)
  // Only apply if no valid fences exist
  if (!hasValidFences) {
    result = result.replace(
      /(?:^|\n)reactflow\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi,
      (match, jsonContent) => {
        return `\n\`\`\`reactflow\n${jsonContent.trim()}\n\`\`\`\n`;
      }
    );
  }
  
  // Pattern 2: Raw JSON with ReactFlow structure (has "nodes" and "edges")
  // Only apply if no valid fences exist
  if (!hasValidFences) {
    const lines = result.split('\n');
    const newLines: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this line starts a JSON object (just "{" or "{ ...")
      if (trimmed === '{' || trimmed.startsWith('{"')) {
        // Find the rest of the JSON by looking for balanced braces
        const startLineIndex = i;
        let jsonText = '';
        let foundEnd = false;
        
        for (let j = i; j < lines.length && !foundEnd; j++) {
          jsonText += (j > i ? '\n' : '') + lines[j];
          
          // Check if we have balanced braces
          const endIndex = findJsonEnd(jsonText, 0);
          if (endIndex !== -1) {
            foundEnd = true;
            const possibleJson = jsonText.substring(0, endIndex + 1);
            
            // Check if this looks like ReactFlow
            if (possibleJson.includes('"nodes"') && possibleJson.includes('"edges"')) {
              try {
                const parsed = JSON.parse(possibleJson);
                if (parsed.nodes && Array.isArray(parsed.nodes) && 
                    parsed.edges && Array.isArray(parsed.edges)) {
                  // It's ReactFlow! Wrap it
                  newLines.push('```reactflow');
                  newLines.push(possibleJson);
                  newLines.push('```');
                  
                  // Add any remaining content after the JSON on the same line
                  const remaining = jsonText.substring(endIndex + 1).trim();
                  if (remaining) {
                    newLines.push(remaining);
                  }
                  
                  i = j + 1;
                  continue;
                }
              } catch (e) {
                // Not valid JSON
              }
            }
            
            // Not ReactFlow, add lines as-is
            for (let k = startLineIndex; k <= j; k++) {
              newLines.push(lines[k]);
            }
            i = j + 1;
          }
        }
        
        if (!foundEnd) {
          // No balanced JSON found, just add the line
          newLines.push(line);
          i++;
        }
      } else {
        newLines.push(line);
        i++;
      }
    }
    
    result = newLines.join('\n');
  }
  
  // Pattern 3: Incorrect backtick counts (1, 2 instead of 3)
  // Always fix these as they're clearly malformed
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
 * Extracts ReactFlow blocks from content and returns placeholders.
 * Similar to extractMermaidBlocks - this makes rendering resilient to Markdown parsing issues.
 */
export function extractReactFlowBlocks(text: string): { 
  processedContent: string; 
  reactflowBlocks: string[] 
} {
  const reactflowBlocks: string[] = [];
  
  // Pattern 1: Properly fenced blocks (including indented ones - common in lists)
  // Handles: ```reactflow, ` ```reactflow, indented fences
  let processedContent = text.replace(
    /^[ \t]*```reactflow\s*\n([\s\S]*?)\n[ \t]*```/gim,
    (match, content) => {
      const trimmedContent = content.trim();
      // Validate it looks like JSON with nodes/edges
      if (trimmedContent.includes('"nodes"') || trimmedContent.includes('"edges"')) {
        const index = reactflowBlocks.length;
        reactflowBlocks.push(trimmedContent);
        return `\n\n:::reactflow-placeholder-${index}:::\n\n`;
      }
      return match; // Not valid ReactFlow, keep as-is
    }
  );
  
  // Pattern 2: Raw JSON blocks with nodes and edges (not inside fences)
  // Only if we haven't already extracted it
  if (reactflowBlocks.length === 0) {
    const jsonPattern = /(?:^|\n)\s*(\{[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?"edges"\s*:\s*\[[\s\S]*?\})\s*(?=\n|$)/g;
    processedContent = processedContent.replace(jsonPattern, (match, jsonContent) => {
      try {
        const parsed = JSON.parse(jsonContent.trim());
        if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.edges && Array.isArray(parsed.edges)) {
          const index = reactflowBlocks.length;
          reactflowBlocks.push(jsonContent.trim());
          return `\n\n:::reactflow-placeholder-${index}:::\n\n`;
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
      return match;
    });
  }
  
  return { processedContent, reactflowBlocks };
}

/**
 * Checks if text is a ReactFlow placeholder and returns the index.
 */
export function isReactFlowPlaceholder(text: string): { isPlaceholder: boolean; index: number } {
  const match = text.match(/^:::reactflow-placeholder-(\d+):::$/);
  if (match) {
    return { isPlaceholder: true, index: parseInt(match[1], 10) };
  }
  return { isPlaceholder: false, index: -1 };
}

/**
 * Main pre-processor: normalizes all diagram syntax in Markdown content.
 * Should be called BEFORE passing content to ReactMarkdown.
 * 
 * NOTE: This function normalizes raw/malformed diagrams. Extraction of blocks
 * for placeholder rendering should happen AFTER this in the render pipeline.
 */
export function normalizeMarkdownDiagrams(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Step 0: Clean stray backticks FIRST (protects valid fences)
  result = cleanStrayBackticks(result);
  
  // Step 1: De-indent fenced blocks that are inside lists (common LLM issue)
  // Convert "   ```reactflow" to "```reactflow"
  result = result.replace(/^([ \t]{1,4})(```(?:reactflow|mermaid|flow|chem|equation))/gim, '$2');
  result = result.replace(/^([ \t]{1,4})(```)$/gim, '$2');
  
  // Step 2: Ensure blank lines around fences for proper Markdown parsing
  result = result.replace(/([^\n])(```reactflow)/g, '$1\n\n$2');
  result = result.replace(/(```)\n([^\n])/g, '$1\n\n$2');
  
  // Step 3: Check if content already has valid reactflow fences
  const hasValidReactFlow = hasValidReactFlowFences(result);
  
  // Step 4: Normalize ReactFlow blocks (only if no valid fences)
  if (!hasValidReactFlow) {
    result = normalizeReactFlowBlocks(result);
  } else {
    // Still fix backtick counts even if valid fences exist
    result = result.replace(
      /`{1,2}reactflow\s*\n?([\s\S]*?)`{1,2}(?!`)/gi,
      (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
    );
    result = result.replace(
      /`{4,}reactflow\s*\n?([\s\S]*?)`{4,}/gi,
      (match, content) => `\`\`\`reactflow\n${content.trim()}\n\`\`\``
    );
  }
  
  // Step 5: Aggressive fence fixing for Mermaid (handles malformed backticks)
  result = aggressiveFenceFixer(result);
  
  // Step 6: Normalize existing Mermaid fences (case variations, spacing)
  result = normalizeMermaidFences(result);
  
  // Step 7: Detect and wrap unfenced Mermaid diagrams
  result = wrapUnfencedMermaid(result);
  
  return result;
}
