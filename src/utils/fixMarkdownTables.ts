/**
 * Fixes markdown tables that may have incorrect line breaks.
 * Some AI models return tables without proper newlines between rows,
 * which breaks the markdown parser.
 */
export function fixMarkdownTables(text: string): string {
  if (!text) return text;
  
  let fixed = text;
  
  // Ensure newline between header row and separator row
  fixed = fixed.replace(/(\|[^|\n]+\|)\s*(\|[-:\s]+\|)/g, '$1\n$2');
  // Ensure newline after separator row
  fixed = fixed.replace(/(\|[-:\s]+\|)\s*(\|[^-])/g, '$1\n$2');
  // Ensure newline between data rows
  fixed = fixed.replace(/(\|[^|\n]+\|)\s*(?=\|[^-\s])/g, '$1\n');
  
  // Fix tables that don't have separator rows - add them
  const lines = fixed.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    
    result.push(line);
    
    // If this line looks like a table header (has | and text) 
    // and next line is a data row (not a separator), add separator
    if (isTableRow(line) && isTableRow(nextLine) && !isSeparatorRow(nextLine) && !isSeparatorRow(line)) {
      // Check if there's already a separator somewhere after
      let hasSeparator = false;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (isSeparatorRow(lines[j])) {
          hasSeparator = true;
          break;
        }
      }
      // Only add separator if this could be the header row
      if (!hasSeparator && i === 0 || (i > 0 && !isTableRow(lines[i - 1]))) {
        const colCount = (line.match(/\|/g) || []).length - 1;
        if (colCount > 0) {
          const separator = '|' + ' --- |'.repeat(colCount);
          result.push(separator);
        }
      }
    }
  }
  
  return result.join('\n');
}

function isTableRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
}

function isSeparatorRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  // Separator rows contain only |, -, :, and spaces
  return /^\|[\s\-:|]+\|$/.test(trimmed) && trimmed.includes('-');
}

/**
 * Removes ASCII art diagrams and flow charts that don't render well.
 * These include box-drawing characters, arrows, etc.
 * IMPORTANT: Does NOT remove markdown table rows (lines with |)
 */
export function removeAsciiDiagrams(text: string): string {
  if (!text) return text;
  
  // Patterns that indicate ASCII art (NOT including | which is used for tables)
  const asciiPatterns = [
    // Box drawing characters
    /[┌┐└┘├┤┬┴┼│─═║╔╗╚╝╠╣╦╩╬]/,
    // Arrow patterns
    /[-=]{3,}[>→]/,
    /[<←][-=]{3,}/,
    // Vertical arrows
    /[↑↓↕▲▼]/,
  ];
  
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let consecutiveAsciiLines = 0;
  
  for (const line of lines) {
    // Skip markdown table rows - these are valid markdown
    if (isTableRow(line) || isSeparatorRow(line)) {
      cleanedLines.push(line);
      consecutiveAsciiLines = 0;
      continue;
    }
    
    const hasAsciiArt = asciiPatterns.some(p => p.test(line));
    // Don't flag lines with | as ASCII if they could be tables
    const hasOnlySymbols = /^[\s\-=+*<>→←↑↓▲▼┌┐└┘├┤┬┴┼│─═║╔╗╚╝╠╣╦╩╬·.]+$/.test(line.trim()) && !line.includes('|');
    
    if (hasAsciiArt || (hasOnlySymbols && line.trim().length > 5)) {
      consecutiveAsciiLines++;
      if (consecutiveAsciiLines < 2) {
        // Keep single lines that might not be ASCII art
        cleanedLines.push(line);
      }
    } else {
      consecutiveAsciiLines = 0;
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
}

/**
 * Enhances title formatting by detecting common patterns and converting them to markdown headers.
 * This handles cases where the backend sends titles without proper markdown syntax.
 */
export function enhanceTitleFormatting(text: string): string {
  if (!text) return text;
  
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Skip if already a markdown header
    if (trimmed.startsWith('#')) {
      result.push(line);
      continue;
    }
    
    // Skip if inside a table or list
    if (trimmed.startsWith('|') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('>')) {
      result.push(line);
      continue;
    }
    
    // Pattern 1: Document titles like "Informe Técnico:", "Resumen Ejecutivo:", "Análisis de..."
    // Only at the start of the document (first non-empty line)
    if (i === 0 || (i > 0 && lines.slice(0, i).every(l => l.trim() === ''))) {
      if (/^(Informe|Resumen|Análisis|Evaluación|Reporte|Diagnóstico|Estudio|Propuesta)\s+\w+/i.test(trimmed)) {
        result.push(`# ${trimmed}`);
        continue;
      }
    }
    
    // Pattern 2: Main sections with number like "1. Título", "2. Título" (not "1.1")
    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑ][^.]*$/i.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      // Check it's a title (usually followed by empty line or more content, not a list item)
      const nextLine = lines[i + 1]?.trim() || '';
      if (nextLine === '' || nextLine.startsWith('-') || /^[A-ZÁÉÍÓÚÑ]/.test(nextLine) || /^\d+\./.test(nextLine)) {
        result.push(`## ${trimmed}`);
        continue;
      }
    }
    
    // Pattern 3: Subsections like "1.1 Título", "2.3 Subtítulo"
    if (/^\d+\.\d+\.?\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
      result.push(`### ${trimmed}`);
      continue;
    }
    
    // Pattern 4: ALL CAPS titles (short lines, likely headers)
    if (/^[A-ZÁÉÍÓÚÑ\s]{5,50}$/.test(trimmed) && trimmed === trimmed.toUpperCase() && !trimmed.includes('|')) {
      const nextLine = lines[i + 1]?.trim() || '';
      if (nextLine === '' || /^[A-Za-záéíóúñ]/.test(nextLine)) {
        result.push(`## ${trimmed}`);
        continue;
      }
    }
    
    // Pattern 5: Bold-like titles without asterisks (short lines ending with colon or standalone)
    if (/^[A-ZÁÉÍÓÚÑ][^:]{3,40}:?\s*$/.test(trimmed) && !trimmed.includes('|')) {
      const prevLine = lines[i - 1]?.trim() || '';
      const nextLine = lines[i + 1]?.trim() || '';
      // If preceded by empty line and followed by content, it's likely a section header
      if (prevLine === '' && nextLine !== '' && !nextLine.startsWith('#')) {
        // Make it bold instead of header for inline section titles
        result.push(`**${trimmed}**`);
        continue;
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

/**
 * Clean and normalize markdown content for better rendering.
 */
export function cleanMarkdownContent(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // First enhance title formatting
  cleaned = enhanceTitleFormatting(cleaned);
  
  // Then fix tables
  cleaned = fixMarkdownTables(cleaned);
  
  // Remove ASCII diagrams (but preserve tables)
  cleaned = removeAsciiDiagrams(cleaned);
  
  // Clean up common issues - but DON'T modify list markers as ReactMarkdown handles them
  cleaned = cleaned
    // *** or more → **
    .replace(/\*{3,}/g, '**')
    // Multiple empty lines → 2
    .replace(/\n{4,}/g, '\n\n\n')
    // Empty bullet points
    .replace(/^\s*[-*]\s*$/gm, '')
    // Remove excessive whitespace at end of lines
    .replace(/[ \t]+$/gm, '')
    .trim();
  
  return cleaned;
}
