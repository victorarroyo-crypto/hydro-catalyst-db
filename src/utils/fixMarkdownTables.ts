/**
 * Fixes markdown tables that may have incorrect line breaks.
 * Some AI models return tables without proper newlines between rows,
 * which breaks the markdown parser.
 */
export function fixMarkdownTables(text: string): string {
  if (!text) return text;
  
  return text
    // Ensure newline between header row and separator row
    .replace(/(\|[^|\n]+\|)\s*(\|[-:\s]+\|)/g, '$1\n$2')
    // Ensure newline after separator row
    .replace(/(\|[-:\s]+\|)\s*(\|[^-])/g, '$1\n$2')
    // Ensure newline between data rows
    .replace(/(\|[^|\n]+\|)\s*(?=\|[^-\s])/g, '$1\n');
}

/**
 * Removes ASCII art diagrams and flow charts that don't render well.
 * These include box-drawing characters, arrows, etc.
 */
export function removeAsciiDiagrams(text: string): string {
  if (!text) return text;
  
  // Patterns that indicate ASCII art
  const asciiPatterns = [
    // Box drawing characters
    /[┌┐└┘├┤┬┴┼│─═║╔╗╚╝╠╣╦╩╬]/,
    // Arrow patterns
    /[-=]{2,}[>→]/,
    /[<←][-=]{2,}/,
    // Vertical arrows
    /[↑↓↕▲▼]/,
  ];
  
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let inAsciiBlock = false;
  let consecutiveAsciiLines = 0;
  
  for (const line of lines) {
    const hasAsciiArt = asciiPatterns.some(p => p.test(line));
    const hasOnlySymbols = /^[\s\-=|+*<>→←↑↓▲▼┌┐└┘├┤┬┴┼│─═║╔╗╚╝╠╣╦╩╬·.]+$/.test(line.trim());
    
    if (hasAsciiArt || (hasOnlySymbols && line.trim().length > 3)) {
      consecutiveAsciiLines++;
      if (consecutiveAsciiLines >= 2) {
        inAsciiBlock = true;
      }
    } else {
      if (inAsciiBlock && consecutiveAsciiLines > 0) {
        // End of ASCII block - add a note
        cleanedLines.push('');
      }
      consecutiveAsciiLines = 0;
      inAsciiBlock = false;
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
}

/**
 * Clean and normalize markdown content for better rendering.
 */
export function cleanMarkdownContent(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // First fix tables
  cleaned = fixMarkdownTables(cleaned);
  
  // Remove ASCII diagrams
  cleaned = removeAsciiDiagrams(cleaned);
  
  // Clean up common issues
  cleaned = cleaned
    // Remove h3+ headers (keep h1, h2 only)
    .replace(/^#{3,6}\s+/gm, '**')
    // *** or more → **
    .replace(/\*{3,}/g, '**')
    // Multiple empty lines → 2
    .replace(/\n{4,}/g, '\n\n\n')
    // Empty bullet points
    .replace(/^\s*[-*]\s*$/gm, '')
    // Clean up "---" horizontal rules that look bad
    .replace(/^-{3,}$/gm, '')
    // Remove excessive whitespace
    .replace(/[ \t]+$/gm, '')
    // Normalize list markers
    .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
    .trim();
  
  return cleaned;
}
