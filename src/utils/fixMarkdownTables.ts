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
