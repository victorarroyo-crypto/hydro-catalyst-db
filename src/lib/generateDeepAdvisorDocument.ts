/**
 * Generador de documentos Word para informes del Deep Advisor
 * Maneja correctamente símbolos Unicode, emojis y subíndices químicos
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  ShadingType,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
} from './vandarumDocStyles';
import type { DeepJobSource, DeepJobFact } from './advisorProxy';

// Mapping of problematic emojis to safe Unicode alternatives
const EMOJI_REPLACEMENTS: Record<string, string> = {
  '⭐': '★',
  '✅': '✓',
  '❌': '✗',
  '⚠️': '⚠',
  '🔴': '●',
  '🟢': '●',
  '🟡': '●',
  '🔵': '●',
  '💧': '◆',
  '🔬': '◇',
  '⚙️': '⚙',
  '📊': '▣',
  '📈': '↗',
  '📉': '↘',
  '💰': '$',
  '💡': '◈',
  '🎯': '◎',
  '✨': '*',
  '🚀': '→',
  '⚡': '↯',
  '🔥': '▲',
  '❗': '!',
  '❓': '?',
  '➡️': '→',
  '⬅️': '←',
  '⬆️': '↑',
  '⬇️': '↓',
  '▶️': '▶',
  '◀️': '◀',
  '🔸': '◆',
  '🔹': '◇',
  '📌': '▪',
  '🏭': '⌂',
  '🌊': '~',
  '♻️': '♻',
};

// Chemical subscripts mapping (Unicode subscript digits)
const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
  '₌': '=',
  '₍': '(',
  '₎': ')',
};

// Superscript mapping
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
};

/**
 * Replace problematic emojis with safe Unicode alternatives
 */
function sanitizeEmojis(text: string): string {
  let result = text;
  for (const [emoji, replacement] of Object.entries(EMOJI_REPLACEMENTS)) {
    result = result.split(emoji).join(replacement);
  }
  // Remove any remaining emoji that might cause issues (emoji ranges)
  // This regex matches most emoji but keeps standard Unicode symbols
  result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, '•');
  return result;
}

interface TextRunOptions {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
}

/**
 * Parse text and create TextRuns with proper subscript/superscript formatting
 */
function createFormattedTextRuns(text: string, baseOptions: TextRunOptions = {}): TextRun[] {
  const runs: TextRun[] = [];
  const sanitized = sanitizeEmojis(text);
  
  let currentText = '';
  let i = 0;
  
  while (i < sanitized.length) {
    const char = sanitized[i];
    
    // Check for subscript
    if (SUBSCRIPT_MAP[char]) {
      // Flush current text
      if (currentText) {
        runs.push(new TextRun({
          text: currentText,
          size: VANDARUM_SIZES.texto,
          font: VANDARUM_FONTS.texto,
          color: VANDARUM_COLORS.grisTexto,
          ...baseOptions,
        }));
        currentText = '';
      }
      // Collect consecutive subscripts
      let subscriptText = '';
      while (i < sanitized.length && SUBSCRIPT_MAP[sanitized[i]]) {
        subscriptText += SUBSCRIPT_MAP[sanitized[i]];
        i++;
      }
      runs.push(new TextRun({
        text: subscriptText,
        size: VANDARUM_SIZES.pequeno,
        font: VANDARUM_FONTS.texto,
        color: VANDARUM_COLORS.grisTexto,
        subScript: true,
        ...baseOptions,
      }));
      continue;
    }
    
    // Check for superscript
    if (SUPERSCRIPT_MAP[char]) {
      // Flush current text
      if (currentText) {
        runs.push(new TextRun({
          text: currentText,
          size: VANDARUM_SIZES.texto,
          font: VANDARUM_FONTS.texto,
          color: VANDARUM_COLORS.grisTexto,
          ...baseOptions,
        }));
        currentText = '';
      }
      // Collect consecutive superscripts
      let superscriptText = '';
      while (i < sanitized.length && SUPERSCRIPT_MAP[sanitized[i]]) {
        superscriptText += SUPERSCRIPT_MAP[sanitized[i]];
        i++;
      }
      runs.push(new TextRun({
        text: superscriptText,
        size: VANDARUM_SIZES.pequeno,
        font: VANDARUM_FONTS.texto,
        color: VANDARUM_COLORS.grisTexto,
        superScript: true,
        ...baseOptions,
      }));
      continue;
    }
    
    currentText += char;
    i++;
  }
  
  // Flush remaining text
  if (currentText) {
    runs.push(new TextRun({
      text: currentText,
      size: VANDARUM_SIZES.texto,
      font: VANDARUM_FONTS.texto,
      color: VANDARUM_COLORS.grisTexto,
      ...baseOptions,
    }));
  }
  
  return runs.length > 0 ? runs : [new TextRun({ text: '', size: VANDARUM_SIZES.texto })];
}

/**
 * Check if a line is a markdown table row
 */
function isTableRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  
  // Must start and end with | and have some content
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|') || trimmed.length <= 2) {
    return false;
  }
  
  // NOT a table if it contains flow diagram indicators
  if (trimmed.includes('→') || trimmed.includes('←') || 
      trimmed.includes('↓') || trimmed.includes('↑') ||
      /\[\d+\./.test(trimmed)) {
    return false;
  }
  
  // A valid table row should have multiple cells (at least 2 | besides start/end)
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return pipeCount >= 3;
}

/**
 * Check if a line is a table separator row (e.g., |---|---|)
 */
function isSeparatorRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return /^\|[\s\-:|]+\|$/.test(trimmed) && trimmed.includes('-');
}

/**
 * Parse table row cells from a markdown table line
 */
function parseTableRowCells(line: string): string[] {
  return line.trim()
    .slice(1, -1)  // Remove leading and trailing |
    .split('|')
    .map(cell => cell.trim());
}

/**
 * Create a Word Table from markdown table lines
 */
function parseMarkdownTable(tableLines: string[]): Table {
  // Filter out separator rows, keep only data rows
  const dataLines = tableLines.filter(l => !isSeparatorRow(l.trim()));
  
  if (dataLines.length === 0) {
    // Return empty table if no data
    return new Table({
      rows: [],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }
  
  // First line = headers
  const headerCells = parseTableRowCells(dataLines[0]);
  const bodyLines = dataLines.slice(1);
  
  // Create header row with Vandarum styling
  const headerRow = new TableRow({
    children: headerCells.map(cell => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: sanitizeEmojis(cell),
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
      })
    ),
  });
  
  // Create data rows with zebra striping
  const dataRows = bodyLines.map((line, idx) => {
    const cells = parseTableRowCells(line);
    // Pad cells to match header count if needed
    while (cells.length < headerCells.length) {
      cells.push('');
    }
    
    return new TableRow({
      children: cells.map(cell =>
        new TableCell({
          children: [
            new Paragraph({
              children: parseInlineFormattedRuns(cell),
            }),
          ],
          shading: { 
            type: ShadingType.SOLID, 
            color: idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5' 
          },
        })
      ),
    });
  });
  
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Parse inline formatting (bold **text**) within any text content
 * Returns properly formatted TextRuns with bold and subscript/superscript handling
 */
function parseInlineFormattedRuns(text: string, baseOptions: { bold?: boolean } = {}): TextRun[] {
  const textRuns: TextRun[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold
    if (match.index > lastIndex) {
      textRuns.push(...createFormattedTextRuns(text.slice(lastIndex, match.index), baseOptions));
    }
    // Add bold text
    textRuns.push(...createFormattedTextRuns(match[1], { ...baseOptions, bold: true }));
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    textRuns.push(...createFormattedTextRuns(text.slice(lastIndex), baseOptions));
  }
  
  return textRuns.length > 0 ? textRuns : createFormattedTextRuns(text, baseOptions);
}

/**
 * Check if content is Mermaid/flowchart syntax
 */
function isMermaidContent(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().toLowerCase();
  
  // Check for mermaid keywords at the start
  const mermaidKeywords = [
    'flowchart', 'graph', 'sequencediagram', 'classDiagram', 
    'statediagram', 'erdiagram', 'gantt', 'pie', 'gitgraph'
  ];
  
  for (const keyword of mermaidKeywords) {
    if (trimmed.startsWith(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // Check for arrow patterns typical of mermaid
  if (trimmed.includes('-->') && (trimmed.includes('[') || trimmed.includes('{'))) {
    return true;
  }
  
  return false;
}

/**
 * Check if a line continues a mermaid diagram
 */
function isMermaidContinuation(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  
  // Empty lines end mermaid
  if (!trimmed) return false;
  
  // Lines with arrows or node definitions continue mermaid
  if (trimmed.includes('-->') || trimmed.includes('---') ||
      /^[A-Za-z0-9_]+[\[\{(]/.test(trimmed) ||
      /^[A-Za-z0-9_]+\s*-->/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Parse Mermaid flowchart content and convert to readable Word paragraphs
 */
function parseMermaidToReadable(mermaidContent: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Add a header indicating this is a diagram
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📊 Diagrama de Flujo',
          bold: true,
          size: VANDARUM_SIZES.texto,
          font: VANDARUM_FONTS.titulo,
          color: VANDARUM_COLORS.verdeOscuro,
        }),
      ],
      spacing: { before: 150, after: 100 },
      shading: { type: ShadingType.SOLID, color: 'F0F7F7' },
    })
  );
  
  // Parse the mermaid content to extract nodes and relationships
  const lines = mermaidContent.split('\n');
  const nodes: Map<string, string> = new Map();
  const relationships: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip header lines
    if (trimmed.match(/^(flowchart|graph)\s+(TD|LR|TB|BT|RL)/i)) {
      continue;
    }
    
    // Extract node definitions: A[Label] or A{Label} or A(Label)
    const nodeRegex = /([A-Za-z0-9_]+)[\[\{(]([^\]\})\n]+)[\]\})]/g;
    const nodeMatches = trimmed.matchAll(nodeRegex);
    for (const match of nodeMatches) {
      nodes.set(match[1], match[2]);
    }
    
    // Extract relationships: A --> B or A -->|label| B
    const arrowMatch = trimmed.match(/([A-Za-z0-9_]+)\s*-->\s*\|?([^|]*)\|?\s*([A-Za-z0-9_]+)/);
    if (arrowMatch) {
      const from = nodes.get(arrowMatch[1]) || arrowMatch[1];
      const label = arrowMatch[2]?.trim() || '';
      const to = nodes.get(arrowMatch[3]) || arrowMatch[3];
      
      if (label) {
        relationships.push(`${from} → [${label}] → ${to}`);
      } else {
        relationships.push(`${from} → ${to}`);
      }
    }
  }
  
  // Output relationships as a list
  for (const rel of relationships) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '  • ',
            size: VANDARUM_SIZES.texto,
            font: VANDARUM_FONTS.texto,
            color: VANDARUM_COLORS.verdeOscuro,
          }),
          ...createFormattedTextRuns(rel),
        ],
        spacing: { before: 30, after: 30 },
        indent: { left: 200 },
      })
    );
  }
  
  // If no relationships were parsed, just note that a diagram exists
  if (relationships.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(Ver diagrama visual en la aplicación)',
            italics: true,
            size: VANDARUM_SIZES.pequeno,
            font: VANDARUM_FONTS.texto,
            color: VANDARUM_COLORS.grisTexto,
          }),
        ],
        spacing: { after: 100 },
        indent: { left: 200 },
      })
    );
  }
  
  return paragraphs;
}

/**
 * Parse markdown content and convert to docx elements (paragraphs and tables)
 */
function parseMarkdownToParagraphs(markdown: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = markdown.split('\n');
  
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      // If we were in a table, finalize it first
      if (inTable && tableLines.length > 0) {
        elements.push(parseMarkdownTable(tableLines));
        inTable = false;
        tableLines = [];
      }
      
      if (inCodeBlock) {
        // Check if this is a flowchart/mermaid block - convert to readable format
        const codeContent = codeBlockContent.join('\n');
        if (isMermaidContent(codeContent)) {
          elements.push(...parseMermaidToReadable(codeContent));
        } else {
          // Regular code block - render as monospace
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeContent,
                  font: 'Courier New',
                  size: VANDARUM_SIZES.pequeno,
                  color: VANDARUM_COLORS.grisTexto,
                }),
              ],
              spacing: { before: 100, after: 100 },
              shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
            })
          );
        }
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Check for inline flowchart/mermaid content (without code fences)
    if (isMermaidContent(trimmedLine)) {
      // Accumulate mermaid lines
      let mermaidContent = trimmedLine;
      while (i + 1 < lines.length && isMermaidContinuation(lines[i + 1].trim())) {
        i++;
        mermaidContent += '\n' + lines[i].trim();
      }
      elements.push(...parseMermaidToReadable(mermaidContent));
      continue;
    }
    
    // Handle table rows
    if (isTableRow(trimmedLine) || isSeparatorRow(trimmedLine)) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(trimmedLine);
      continue;
    }
    
    // If we were in a table but this line is not a table row, finalize the table
    if (inTable && tableLines.length > 0) {
      elements.push(parseMarkdownTable(tableLines));
      inTable = false;
      tableLines = [];
    }
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (elements.length > 0) {
        elements.push(new Paragraph({ children: [], spacing: { after: 100 } }));
      }
      continue;
    }
    
    // Handle headings (from most specific to least)
    if (trimmedLine.startsWith('#### ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sanitizeEmojis(trimmedLine.slice(5)),
              bold: true,
              size: VANDARUM_SIZES.texto,
              font: VANDARUM_FONTS.titulo,
              color: VANDARUM_COLORS.verdeOscuro,
            }),
          ],
          spacing: { before: 150, after: 80 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('### ')) {
      elements.push(
        new Paragraph({
          children: createFormattedTextRuns(trimmedLine.slice(4), { bold: true }),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('## ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sanitizeEmojis(trimmedLine.slice(3)),
              bold: true,
              size: VANDARUM_SIZES.subtitulo,
              font: VANDARUM_FONTS.titulo,
              color: VANDARUM_COLORS.verdeOscuro,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('# ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sanitizeEmojis(trimmedLine.slice(2)),
              bold: true,
              size: VANDARUM_SIZES.titulo,
              font: VANDARUM_FONTS.titulo,
              color: VANDARUM_COLORS.verdeOscuro,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }
    
    // Handle bullet lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const listContent = trimmedLine.slice(2);
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '• ',
              size: VANDARUM_SIZES.texto,
              font: VANDARUM_FONTS.texto,
              color: VANDARUM_COLORS.verdeOscuro,
              bold: true,
            }),
            ...parseInlineFormattedRuns(listContent),
          ],
          spacing: { before: 50, after: 50 },
          indent: { left: 300 },
        })
      );
      continue;
    }
    
    // Handle numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${numberedMatch[1]}. `,
              size: VANDARUM_SIZES.texto,
              font: VANDARUM_FONTS.texto,
              color: VANDARUM_COLORS.verdeOscuro,
              bold: true,
            }),
            ...parseInlineFormattedRuns(numberedMatch[2]),
          ],
          spacing: { before: 50, after: 50 },
          indent: { left: 300 },
        })
      );
      continue;
    }
    
    // Handle bold text within paragraphs
    let processedLine = trimmedLine;
    const textRuns: TextRun[] = [];
    
    // Split by **bold** patterns
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(processedLine)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        textRuns.push(...createFormattedTextRuns(processedLine.slice(lastIndex, match.index)));
      }
      // Add bold text
      textRuns.push(...createFormattedTextRuns(match[1], { bold: true }));
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < processedLine.length) {
      textRuns.push(...createFormattedTextRuns(processedLine.slice(lastIndex)));
    }
    
    elements.push(
      new Paragraph({
        children: textRuns.length > 0 ? textRuns : createFormattedTextRuns(processedLine),
        spacing: { after: 100 },
      })
    );
  }
  
  // Finalize any remaining table at end of content
  if (inTable && tableLines.length > 0) {
    elements.push(parseMarkdownTable(tableLines));
  }
  
  return elements;
}

/**
 * Create sources table
 */
function createSourcesTable(sources: DeepJobSource[]): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Fuente',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 50, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tipo',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 25, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Referencias',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 25, type: WidthType.PERCENTAGE },
      }),
    ],
  });
  
  const dataRows = sources.map((source, index) => 
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: createFormattedTextRuns(source.name || 'N/A'),
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: source.type || 'web',
                  size: VANDARUM_SIZES.texto,
                  font: VANDARUM_FONTS.texto,
                  color: VANDARUM_COLORS.grisTexto,
                }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: source.count?.toString() || '1',
                  size: VANDARUM_SIZES.texto,
                  font: VANDARUM_FONTS.texto,
                  color: VANDARUM_COLORS.grisTexto,
                }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
      ],
    })
  );
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });
}

/**
 * Create facts table
 */
function createFactsTable(facts: DeepJobFact[]): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Dato',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 40, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Valor',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 40, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tipo',
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        width: { size: 20, type: WidthType.PERCENTAGE },
      }),
    ],
  });
  
  const dataRows = facts.map((fact, index) => 
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: createFormattedTextRuns(fact.key || 'N/A'),
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: createFormattedTextRuns(fact.value || 'N/A'),
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: fact.type || 'dato',
                  size: VANDARUM_SIZES.texto,
                  font: VANDARUM_FONTS.texto,
                  color: VANDARUM_COLORS.grisTexto,
                }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
        }),
      ],
    })
  );
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });
}

export interface DeepAdvisorReportData {
  content: string;
  sources?: DeepJobSource[];
  factsExtracted?: DeepJobFact[];
  query?: string;
  chatId?: string;
}

/**
 * Generate and download a Word document from Deep Advisor report data
 */
export async function generateDeepAdvisorDocument(data: DeepAdvisorReportData): Promise<void> {
  const { content, sources = [], factsExtracted = [], query } = data;
  
  const sections: (Paragraph | Table)[] = [];
  
  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Informe Deep Advisor',
          bold: true,
          size: 56,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );
  
  // Subtitle with date
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Vandarum AI Advisor • ${new Date().toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}`,
          size: VANDARUM_SIZES.subtitulo,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Query section if available
  if (query) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Consulta analizada',
            bold: true,
            size: VANDARUM_SIZES.subtitulo,
            font: VANDARUM_FONTS.titulo,
            color: VANDARUM_COLORS.verdeOscuro,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    
    sections.push(
      new Paragraph({
        children: createFormattedTextRuns(query),
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        spacing: { after: 300 },
      })
    );
  }
  
  // Separator
  sections.push(
    new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: VANDARUM_COLORS.verdeOscuro },
      },
      spacing: { after: 300 },
    })
  );
  
  // Main content
  const contentParagraphs = parseMarkdownToParagraphs(content);
  sections.push(...contentParagraphs);
  
  // Sources section
  if (sources.length > 0) {
    sections.push(new Paragraph({ children: [], spacing: { before: 400 } }));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Fuentes consultadas',
            bold: true,
            size: VANDARUM_SIZES.subtitulo,
            font: VANDARUM_FONTS.titulo,
            color: VANDARUM_COLORS.verdeOscuro,
          }),
        ],
        spacing: { before: 300, after: 150 },
      })
    );
    sections.push(createSourcesTable(sources));
  }
  
  // Facts section
  if (factsExtracted.length > 0) {
    sections.push(new Paragraph({ children: [], spacing: { before: 400 } }));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Datos extraídos',
            bold: true,
            size: VANDARUM_SIZES.subtitulo,
            font: VANDARUM_FONTS.titulo,
            color: VANDARUM_COLORS.verdeOscuro,
          }),
        ],
        spacing: { before: 300, after: 150 },
      })
    );
    sections.push(createFactsTable(factsExtracted));
  }
  
  // Footer
  sections.push(new Paragraph({ children: [], spacing: { before: 600 } }));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '─────────────────────────────────────────────────────────',
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.grisClaro,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generado por Vandarum AI Advisor',
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'www.vandarum.es',
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });
  
  const blob = await Packer.toBlob(doc);
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Informe_DeepAdvisor_${timestamp}.docx`;
  saveAs(blob, fileName);
}
