/**
 * Content Quality Control Pipeline
 * 
 * Centralized post-processing for chat content that:
 * 1. Normalizes chemical equations as plain text
 * 2. Converts ASCII checklists to unicode
 * 3. Detects and flags wide tables
 * 4. Sanitizes problematic HTML
 * 5. Applies formatting improvements
 */

export interface SpecialBlock {
  type: 'water-balance' | 'equation' | 'wide-table' | 'checklist';
  startIndex: number;
  endIndex: number;
  originalContent: string;
}

export interface QualityResult {
  content: string;
  specialBlocks: SpecialBlock[];
  warnings: string[];
}

// Chemical formula patterns (subscript numbers, element symbols)
const CHEMICAL_PATTERNS = [
  /[A-Z][a-z]?[₀₁₂₃₄₅₆₇₈₉]+/g, // CO₂, H₂O, NH₃
  /\d*[A-Z][a-z]?\d*\s*[+→⇌↔]\s*\d*[A-Z]/g, // Reactions: 2H₂ + O₂ → 2H₂O
];

// Checklist patterns
const CHECKLIST_PATTERNS = {
  unchecked: /^\s*\[\s*\]\s+(.+)$/gm,
  checked: /^\s*\[x\]\s+(.+)$/gim,
  uncheckedAlt: /^\s*\[_\]\s+(.+)$/gm,
};

// Maximum columns before table is considered "wide"
const MAX_TABLE_COLUMNS = 5;

// Maximum cell content length before flagging
const MAX_CELL_LENGTH = 50;

/**
 * Normalize chemical equations to ensure they render as styled text, not code
 */
function normalizeChemicalEquations(text: string): string {
  let result = text;
  
  // Remove code backticks around chemical formulas
  // Match: `CO₂` or `H₂O → H₂CO₃`
  result = result.replace(/`([^`]*[₀₁₂₃₄₅₆₇₈₉→⇌↔][^`]*)`/g, '$1');
  
  // Ensure chemical equations in code blocks are converted to plain text
  // Match ```chem ... ``` or ```equation ... ```
  result = result.replace(/```(?:chem|equation)\n?([\s\S]*?)```/g, (_, content) => {
    return `\n${content.trim()}\n`;
  });
  
  return result;
}

/**
 * Convert ASCII checkboxes to unicode symbols
 */
function normalizeChecklists(text: string): string {
  let result = text;
  
  // [ ] → ☐ (unchecked)
  result = result.replace(CHECKLIST_PATTERNS.unchecked, '- ☐ $1');
  
  // [x] or [X] → ☑ (checked)
  result = result.replace(CHECKLIST_PATTERNS.checked, '- ☑ $1');
  
  // [_] → ☐ (alternative unchecked)
  result = result.replace(CHECKLIST_PATTERNS.uncheckedAlt, '- ☐ $1');
  
  return result;
}

/**
 * Detect if a table is too wide and needs special handling
 */
function analyzeTable(tableText: string): { isWide: boolean; columnCount: number; hasLongCells: boolean } {
  const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length === 0) return { isWide: false, columnCount: 0, hasLongCells: false };
  
  // Count columns from first data row
  const firstRow = lines[0];
  const cells = firstRow.split('|').filter(c => c.trim() !== '');
  const columnCount = cells.length;
  
  // Check for long cell content
  const hasLongCells = lines.some(line => {
    const rowCells = line.split('|').filter(c => c.trim() !== '');
    return rowCells.some(cell => cell.trim().length > MAX_CELL_LENGTH);
  });
  
  return {
    isWide: columnCount > MAX_TABLE_COLUMNS || hasLongCells,
    columnCount,
    hasLongCells
  };
}

/**
 * Convert wide tables to a more readable format (key-value list)
 */
function convertWideTableToList(tableText: string): string {
  const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return tableText;
  
  // Extract headers
  const headerLine = lines[0];
  const headers = headerLine.split('|').filter(c => c.trim() !== '').map(h => h.trim());
  
  // Skip separator row
  const dataLines = lines.slice(2);
  
  if (dataLines.length === 0) return tableText;
  
  // Convert to list format
  const result: string[] = [];
  
  dataLines.forEach((line, rowIdx) => {
    const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
    
    if (cells.length > 0) {
      // Use first cell as item title
      result.push(`\n**${cells[0] || `Item ${rowIdx + 1}`}**`);
      
      // Add other cells as sub-items
      cells.slice(1).forEach((cell, cellIdx) => {
        if (cell && headers[cellIdx + 1]) {
          result.push(`- ${headers[cellIdx + 1]}: ${cell}`);
        }
      });
    }
  });
  
  return result.join('\n');
}

/**
 * Process tables: detect wide tables and optionally convert them
 */
function processWideTables(text: string, warnings: string[]): string {
  // Match markdown tables
  const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)*)/g;
  
  return text.replace(tableRegex, (match) => {
    const analysis = analyzeTable(match);
    
    if (analysis.isWide) {
      warnings.push(`Tabla con ${analysis.columnCount} columnas detectada`);
      
      // Only convert if extremely wide or has very long cells
      if (analysis.columnCount > 6 || analysis.hasLongCells) {
        return convertWideTableToList(match);
      }
      
      // For moderately wide tables, just add a wrapper hint
      // The component will handle responsive display
      return match;
    }
    
    return match;
  });
}

/**
 * Sanitize problematic HTML that breaks rendering
 */
function sanitizeHTML(text: string): string {
  let result = text;
  
  // Remove bare <br> tags that break markdown flow
  result = result.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove empty divs/spans
  result = result.replace(/<(div|span)>\s*<\/\1>/gi, '');
  
  // Clean up nested HTML that ReactMarkdown doesn't handle well
  result = result.replace(/<p>\s*<p>/gi, '<p>');
  result = result.replace(/<\/p>\s*<\/p>/gi, '</p>');
  
  return result;
}

/**
 * Fix common markdown formatting issues
 */
function fixMarkdownFormatting(text: string): string {
  let result = text;
  
  // Fix headers without space after #
  result = result.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
  
  // Fix bold/italic without proper spacing
  result = result.replace(/\*{4,}/g, '**');
  
  // Normalize multiple blank lines
  result = result.replace(/\n{4,}/g, '\n\n\n');
  
  // Remove trailing whitespace
  result = result.replace(/[ \t]+$/gm, '');
  
  // Fix list items without space after marker
  result = result.replace(/^(\s*[-*+])([^\s])/gm, '$1 $2');
  
  return result.trim();
}

/**
 * Main quality control pipeline
 * Applies all normalizations in the correct order
 */
export function applyContentQualityControl(rawContent: string): QualityResult {
  if (!rawContent) {
    return { content: '', specialBlocks: [], warnings: [] };
  }
  
  const warnings: string[] = [];
  const specialBlocks: SpecialBlock[] = [];
  
  let content = rawContent;
  
  // Step 1: Sanitize HTML first (prevents parsing issues)
  content = sanitizeHTML(content);
  
  // Step 2: Normalize chemical equations
  content = normalizeChemicalEquations(content);
  
  // Step 3: Normalize checklists
  content = normalizeChecklists(content);
  
  // Step 4: Process wide tables
  content = processWideTables(content, warnings);
  
  // Step 5: Fix general markdown formatting
  content = fixMarkdownFormatting(content);
  
  return {
    content,
    specialBlocks,
    warnings
  };
}

/**
 * Quick check if content likely needs quality control
 * Use this for early bailout in performance-critical paths
 */
export function needsQualityControl(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Check for patterns that need processing
  return (
    // Checklists
    /\[\s*[x_]?\s*\]/.test(text) ||
    // Wide tables (rough check: many pipes in one line)
    /\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/.test(text) ||
    // Chemical formulas in backticks
    /`[^`]*[₀₁₂₃₄₅₆₇₈₉→⇌][^`]*`/.test(text) ||
    // Problematic HTML
    /<br\s*\/?>/.test(text)
  );
}
