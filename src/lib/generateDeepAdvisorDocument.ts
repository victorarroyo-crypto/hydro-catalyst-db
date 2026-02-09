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
  Header,
  Footer,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
} from './vandarumDocStyles';
import type { DeepJobSource, DeepJobFact } from './advisorProxy';
import { safeBase64Decode } from './reactflowToImage';

/**
 * Detect if a line is residual base64 data leaked from ReactFlow diagrams
 */
function isBase64Residue(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 30) return false;
  // Base64 characters only (no spaces, no natural language)
  return /^[A-Za-z0-9+/=]{30,}$/.test(trimmed);
}

/**
 * Get image dimensions from PNG ArrayBuffer
 * PNG stores width/height in bytes 16-23 of the file (IHDR chunk)
 */
function getPngDimensions(arrayBuffer: ArrayBuffer): { width: number; height: number } | null {
  try {
    const view = new DataView(arrayBuffer);
    // PNG signature is first 8 bytes, then IHDR chunk
    // Width is at bytes 16-19, Height at bytes 20-23 (big-endian)
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Generate a clean title from query or content (no truncation for header)
 * Returns { title: string, companyExtracted: string | null }
 */
function generateFullTitle(query?: string, content?: string): { title: string; companyExtracted: string | null } {
  const source = query || content || 'Análisis Técnico';
  
  // Clean up the text - remove markdown and newlines
  let cleanText = source
    .replace(/[#*_`]/g, '')
    .replace(/\n/g, ' ')
    .trim();
  
  // Remove "INFORME TÉCNICO:" prefix if present
  cleanText = cleanText.replace(/^INFORME\s+T[EÉ]CNICO\s*:\s*/i, '');
  
  // Try to extract company name after common patterns like "en [Company]" or "de [Company]"
  // Pattern: Look for company name followed by location indicator like " - Ciudad" or ", Ciudad"
  let companyExtracted: string | null = null;
  const companyMatch = cleanText.match(/\s+(?:en|de|para)\s+(.+?)(?:\s*[-–]\s*[A-ZÁÉÍÓÚ][a-záéíóú]+(?:,\s*[A-ZÁÉÍÓÚ][a-záéíóú]+)?)?$/i);
  
  if (companyMatch) {
    const potentialCompany = companyMatch[1].trim();
    // Only extract if it looks like a company name (contains capital letters, reasonable length)
    if (potentialCompany.length > 3 && potentialCompany.length < 100) {
      companyExtracted = potentialCompany;
      // Remove the company part from the title
      cleanText = cleanText.replace(companyMatch[0], '').trim();
    }
  }
  
  // Get first sentence or meaningful phrase (up to 15 words)
  const words = cleanText.split(/\s+/).slice(0, 15);
  let title = words.join(' ');
  
  return { 
    title: title || 'Análisis Técnico',
    companyExtracted 
  };
}

/**
 * Create cover page elements
 */
async function createCoverPage(studyTitle?: string, companyName?: string): Promise<Paragraph[]> {
  const currentYear = new Date().getFullYear();
  const title = studyTitle || 'Análisis Técnico Especializado';
  
  // Fetch logo image with aspect ratio preservation
  let logoImageRun: ImageRun | null = null;
  try {
    const response = await fetch('/vandarum-logo-principal.png');
    const arrayBuffer = await response.arrayBuffer();
    
    // Calculate proportional dimensions based on original aspect ratio
    const dimensions = getPngDimensions(arrayBuffer);
    let targetWidth = 120; // Default width
    let targetHeight = 60; // Default max height
    
    if (dimensions && dimensions.height > 0) {
      const aspectRatio = dimensions.width / dimensions.height;
      // Fix height to 60px and calculate width proportionally
      targetHeight = 60;
      targetWidth = Math.round(targetHeight * aspectRatio);
    }
    
    logoImageRun = new ImageRun({
      data: arrayBuffer,
      transformation: {
        width: targetWidth,
        height: targetHeight,
      },
      type: 'png',
    });
  } catch (e) {
    console.warn('Could not load logo for Word document:', e);
  }
  
  const paragraphs: Paragraph[] = [
    // Large spacer at top
    new Paragraph({ children: [], spacing: { before: 3000 } }),
    
    // Main study title
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 44, // 22pt
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Company name below title (the company being studied)
    ...(companyName ? [new Paragraph({
      children: [
        new TextRun({
          text: companyName,
          size: 36, // 18pt
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })] : []),
    
    // Date
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }),
          size: 22, // 11pt
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Push content to bottom with large spacer
    new Paragraph({ children: [], spacing: { before: 4000 } }),
  ];
  
  // Add logo if available - discrete at bottom
  if (logoImageRun) {
    paragraphs.push(
      new Paragraph({
        children: [logoImageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }
  
  // Vandarum description (no text title since we have logo)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Consultoría especializada en tratamiento y gestión del agua',
          size: 18, // 9pt
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    
    // Copyright at bottom of cover
    new Paragraph({
      children: [
        new TextRun({
          text: `© ${currentYear} Vandarum. Todos los derechos reservados.`,
          size: 16, // 8pt
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'www.vandarum.es',
          size: 16,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  
  return paragraphs;
}

/**
 * Create header with study title
 */
function createHeader(title: string): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: title, // Full title, no truncation
            size: 12, // 6pt - small as requested
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
            italics: true,
          }),
        ],
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: VANDARUM_COLORS.grisClaro },
        },
        spacing: { after: 200 },
      }),
    ],
  });
}

/**
 * Create footer with copyright
 */
function createFooter(): Footer {
  const currentYear = new Date().getFullYear();
  
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `© ${currentYear} Vandarum`,
            size: 18, // 9pt
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            text: '  |  ',
            size: 18,
            color: VANDARUM_COLORS.grisClaro,
          }),
          new TextRun({
            text: 'www.vandarum.es',
            size: 18,
            color: VANDARUM_COLORS.verdeOscuro,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: VANDARUM_COLORS.verdeOscuro },
        },
        spacing: { before: 200 },
      }),
    ],
  });
}

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
 * Now supports custom size via baseOptions.size
 */
function createFormattedTextRuns(text: string, baseOptions: TextRunOptions = {}): TextRun[] {
  const runs: TextRun[] = [];
  const sanitized = sanitizeEmojis(text);
  const textSize = baseOptions.size || VANDARUM_SIZES.texto;
  const subscriptSize = Math.round(textSize * 0.75); // 75% of base size
  
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
          size: textSize,
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
        size: subscriptSize,
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
          size: textSize,
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
        size: subscriptSize,
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
      size: textSize,
      font: VANDARUM_FONTS.texto,
      color: VANDARUM_COLORS.grisTexto,
      ...baseOptions,
    }));
  }
  
  return runs.length > 0 ? runs : [new TextRun({ text: '', size: textSize })];
}

/**
 * Check if a line is a markdown table row
 */
function isTableRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  
  // Must start with | and contain at least one more |
  if (!trimmed.startsWith('|')) {
    return false;
  }
  
  // Count pipes - needs at least 2 to be a valid table row
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  if (pipeCount < 2) {
    return false;
  }
  
  // If it ends with |, it's definitely a table row
  if (trimmed.endsWith('|')) {
    return true;
  }
  
  // If it doesn't end with | but has multiple cells, still consider it a table
  // This handles markdown tables that don't have trailing pipes
  const cells = trimmed.split('|').filter(c => c.trim());
  return cells.length >= 2;
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
  let trimmed = line.trim();
  
  // Remove leading pipe if present
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  
  // Remove trailing pipe if present
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.slice(0, -1);
  }
  
  return trimmed.split('|').map(cell => cell.trim());
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
  
  // Cell margins for better spacing (in twips: 1440 twips = 1 inch, ~57 twips = 1mm)
  const cellMargins = {
    top: 80,
    bottom: 80,
    left: 100,
    right: 100,
  };
  
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
                size: 18, // 9pt as requested
                color: 'FFFFFF',
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: VANDARUM_COLORS.verdeOscuro },
        margins: cellMargins,
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
              children: parseInlineFormattedRuns(cell, { size: 18 }), // 9pt
            }),
          ],
          shading: { 
            type: ShadingType.SOLID, 
            color: idx % 2 === 0 ? 'FFFFFF' : 'F8F8F8' 
          },
          margins: cellMargins,
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
 * Supports full TextRunOptions including font and color for headings
 */
function parseInlineFormattedRuns(text: string, baseOptions: TextRunOptions = {}): TextRun[] {
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
 * Create a paragraph with an embedded diagram image
 */
function createDiagramImageParagraph(imageBuffer: ArrayBuffer, title: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Add title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 24, // 12pt
          font: VANDARUM_FONTS.titulo,
          color: VANDARUM_COLORS.verdeOscuro,
        }),
      ],
      spacing: { before: 150, after: 100 },
    })
  );
  
  // Get image dimensions for proper aspect ratio
  const dimensions = getPngDimensions(imageBuffer);
  let targetWidth = 500; // Default width in points
  let targetHeight = 300; // Default height
  
  if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
    const aspectRatio = dimensions.width / dimensions.height;
    // Max width of ~500 points (about 6.9 inches) to fit page
    targetWidth = Math.min(500, dimensions.width / 2); // Scale down 2x renders
    targetHeight = Math.round(targetWidth / aspectRatio);
    
    // Cap height to reasonable size
    if (targetHeight > 600) {
      targetHeight = 600;
      targetWidth = Math.round(targetHeight * aspectRatio);
    }
  }
  
  // Add the image
  paragraphs.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: imageBuffer,
          transformation: {
            width: targetWidth,
            height: targetHeight,
          },
          type: 'png',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
    })
  );
  
  return paragraphs;
}

/**
 * Parse Mermaid flowchart content and convert to readable Word paragraphs
 * Enhanced to build complete paths through the graph and identify decision branches
 */
function parseMermaidToReadable(mermaidContent: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Determine diagram type for the header
  const trimmedContent = mermaidContent.trim().toLowerCase();
  let diagramTitle = 'Diagrama de Flujo';
  if (trimmedContent.startsWith('sequencediagram')) {
    diagramTitle = 'Diagrama de Secuencia';
  } else if (trimmedContent.startsWith('classdiagram')) {
    diagramTitle = 'Diagrama de Clases';
  } else if (trimmedContent.startsWith('erdiagram')) {
    diagramTitle = 'Diagrama Entidad-Relación';
  } else if (trimmedContent.startsWith('gantt')) {
    diagramTitle = 'Diagrama de Gantt';
  } else if (trimmedContent.startsWith('pie')) {
    diagramTitle = 'Diagrama Circular';
  } else if (trimmedContent.startsWith('statediagram')) {
    diagramTitle = 'Diagrama de Estados';
  }
  
  // Add header with subtle background
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: diagramTitle,
          bold: true,
          size: 24, // 12pt
          font: VANDARUM_FONTS.titulo,
          color: VANDARUM_COLORS.verdeOscuro,
        }),
      ],
      spacing: { before: 150, after: 100 },
      shading: { type: ShadingType.SOLID, color: 'F0F7F7' },
    })
  );
  
  // Parse the mermaid content to build a graph
  const lines = mermaidContent.split('\n');
  const nodes: Map<string, { label: string; type: 'decision' | 'process' | 'terminal' }> = new Map();
  const edges: Array<{ from: string; to: string; label?: string }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip header lines, empty lines, and style definitions
    if (trimmed.match(/^(flowchart|graph)\s+(TD|LR|TB|BT|RL)/i) || !trimmed) continue;
    if (trimmed.match(/^(subgraph|end|style|classDef|class|click|linkStyle|direction)\b/i)) continue;
    if (trimmed.startsWith('%%')) continue;
    
    // Extract node definitions - detect type based on bracket style
    // {Label} = decision (diamond), [Label] = process (rectangle), ((Label)) = terminal (circle)
    const nodePatterns = [
      { regex: /([A-Za-z0-9_]+)\{([^}]*)\}/g, type: 'decision' as const },
      { regex: /([A-Za-z0-9_]+)\[\[([^\]]*)\]\]/g, type: 'process' as const },
      { regex: /([A-Za-z0-9_]+)\(\(([^)]*)\)\)/g, type: 'terminal' as const },
      { regex: /([A-Za-z0-9_]+)\(\[([^\]]*)\]\)/g, type: 'terminal' as const },
      { regex: /([A-Za-z0-9_]+)\[([^\]]*)\]/g, type: 'process' as const },
    ];
    
    for (const { regex, type } of nodePatterns) {
      let match;
      while ((match = regex.exec(trimmed)) !== null) {
        const nodeId = match[1];
        const label = match[2]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]*>/g, '')
          .trim();
        if (label && !nodes.has(nodeId)) {
          nodes.set(nodeId, { label, type });
        }
      }
    }
    
    // Extract edges with optional labels
    const edgeRegex = /([A-Za-z0-9_]+)\s*(?:-->|---|-\.->|==>)\s*(?:\|([^|]*)\|)?\s*([A-Za-z0-9_]+)/g;
    let edgeMatch;
    while ((edgeMatch = edgeRegex.exec(trimmed)) !== null) {
      edges.push({
        from: edgeMatch[1],
        to: edgeMatch[3],
        label: edgeMatch[2]?.trim(),
      });
    }
  }
  
  // Build adjacency list for path finding
  const adjacency: Map<string, Array<{ to: string; label?: string }>> = new Map();
  const inDegree: Map<string, number> = new Map();
  
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push({ to: edge.to, label: edge.label });
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    if (!inDegree.has(edge.from)) inDegree.set(edge.from, 0);
  }
  
  // Find start nodes (nodes with in-degree 0)
  const startNodes = Array.from(inDegree.entries())
    .filter(([_, deg]) => deg === 0)
    .map(([id]) => id);
  
  // Find all complete paths through the graph
  const allPaths: Array<{ path: string[]; labels: (string | undefined)[] }> = [];
  
  function findPaths(nodeId: string, currentPath: string[], currentLabels: (string | undefined)[], visited: Set<string>) {
    if (visited.has(nodeId)) return; // Prevent cycles
    
    const newPath = [...currentPath, nodeId];
    const neighbors = adjacency.get(nodeId) || [];
    
    if (neighbors.length === 0) {
      // End of path
      allPaths.push({ path: newPath, labels: currentLabels });
    } else {
      visited.add(nodeId);
      for (const neighbor of neighbors) {
        findPaths(neighbor.to, newPath, [...currentLabels, neighbor.label], new Set(visited));
      }
    }
  }
  
  // Find paths from each start node
  for (const start of startNodes) {
    findPaths(start, [], [], new Set());
  }
  
  // If we have paths, render them grouped by decision branches
  if (allPaths.length > 0) {
    // Group paths by their first decision point
    const decisionBranches: Map<string, typeof allPaths> = new Map();
    
    for (const pathInfo of allPaths) {
      // Find the first decision node and its edge label
      let branchKey = 'General';
      for (let i = 0; i < pathInfo.path.length; i++) {
        const nodeId = pathInfo.path[i];
        const node = nodes.get(nodeId);
        if (node?.type === 'decision' && pathInfo.labels[i]) {
          branchKey = `${node.label}: ${pathInfo.labels[i]}`;
          break;
        }
      }
      
      if (!decisionBranches.has(branchKey)) {
        decisionBranches.set(branchKey, []);
      }
      decisionBranches.get(branchKey)!.push(pathInfo);
    }
    
    // Render each branch
    for (const [branchName, paths] of decisionBranches) {
      // Add branch header if there are multiple branches
      if (decisionBranches.size > 1 && branchName !== 'General') {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `▸ ${branchName}`,
                bold: true,
                size: 20,
                font: VANDARUM_FONTS.texto,
                color: VANDARUM_COLORS.verdeOscuro,
              }),
            ],
            spacing: { before: 120, after: 60 },
            indent: { left: 100 },
          })
        );
      }
      
      // Render each path as a treatment train
      for (const pathInfo of paths) {
        // Build path string with node labels
        const pathLabels = pathInfo.path
          .map(nodeId => nodes.get(nodeId)?.label || nodeId)
          .filter(label => label && !label.includes('?')); // Skip decision nodes in the path display
        
        if (pathLabels.length > 1) {
          const pathString = pathLabels.join(' → ');
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '• ',
                  size: 18,
                  font: VANDARUM_FONTS.texto,
                  color: VANDARUM_COLORS.verdeOscuro,
                }),
                ...createFormattedTextRuns(pathString, { size: 18 }),
              ],
              spacing: { before: 30, after: 30 },
              indent: { left: decisionBranches.size > 1 ? 300 : 200 },
            })
          );
        }
      }
    }
  } else {
    // Fallback: show nodes as components if no paths found
    const nodeLabels = Array.from(nodes.values()).map(n => n.label);
    if (nodeLabels.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Componentes del proceso:',
              bold: true,
              italics: true,
              size: 18,
              font: VANDARUM_FONTS.texto,
              color: VANDARUM_COLORS.grisTexto,
            }),
          ],
          spacing: { before: 80, after: 50 },
          indent: { left: 100 },
        })
      );
      
      nodeLabels.forEach((label) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• ',
                size: 18,
                font: VANDARUM_FONTS.texto,
                color: VANDARUM_COLORS.verdeOscuro,
              }),
              ...createFormattedTextRuns(label, { size: 18 }),
            ],
            spacing: { before: 20, after: 20 },
            indent: { left: 200 },
          })
        );
      });
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '(Ver diagrama visual en la aplicación)',
              italics: true,
              size: 18,
              font: VANDARUM_FONTS.texto,
              color: VANDARUM_COLORS.grisTexto,
            }),
          ],
          spacing: { after: 100 },
          indent: { left: 200 },
        })
      );
    }
  }
  
  return paragraphs;
}

/**
 * Parse markdown content and convert to docx elements (paragraphs and tables)
 * @param markdown - The markdown content to parse
 * @param diagramImages - Optional map of diagram code/base64 to rendered PNG images
 */
function parseMarkdownToParagraphs(
  markdown: string,
  diagramImages?: Map<string, ArrayBuffer>
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  
  // First, process ReactFlow divs and replace them with placeholders
  let processedMarkdown = markdown;
  const reactFlowDivRegex = /<div\s+data-reactflow-diagram="([^"]*?)"[^>]*>(?:<\/div>)?/gis;
  const reactFlowMatches: { match: string; jsonContent: string; placeholder: string }[] = [];
  let rfMatch;
  let rfIndex = 0;
  
  // Pattern 1: <div data-reactflow-diagram="BASE64"> format
  while ((rfMatch = reactFlowDivRegex.exec(markdown)) !== null) {
    const placeholder = `__REACTFLOW_DIAGRAM_${rfIndex}__`;
    try {
      const base64 = rfMatch[1];
      const jsonContent = safeBase64Decode(base64).trim(); // Use safe decode for Unicode support
      reactFlowMatches.push({
        match: rfMatch[0],
        jsonContent, // Use JSON content as key (consistent with renderAllReactFlowDiagrams)
        placeholder,
      });
      processedMarkdown = processedMarkdown.replace(rfMatch[0], `\n${placeholder}\n`);
      rfIndex++;
    } catch (e) {
      console.warn('Failed to decode ReactFlow base64:', e);
    }
  }
  
  // Pattern 2: ```reactflow fenced code blocks
  const reactFlowFenceRegex = /```reactflow\s*\n([\s\S]*?)\n```/gi;
  while ((rfMatch = reactFlowFenceRegex.exec(markdown)) !== null) {
    const placeholder = `__REACTFLOW_DIAGRAM_${rfIndex}__`;
    const jsonContent = rfMatch[1].trim();
    reactFlowMatches.push({
      match: rfMatch[0],
      jsonContent, // Use JSON content as key
      placeholder,
    });
    processedMarkdown = processedMarkdown.replace(rfMatch[0], `\n${placeholder}\n`);
    rfIndex++;
  }
  
  // Clean up any partial/unclosed ReactFlow div tags that weren't captured by the regex
  processedMarkdown = processedMarkdown.replace(/<div\s+data-reactflow-diagram=[\s\S]*?(?:<\/div>|(?=\n\n))/gi, '');
  
  // Clean up any residual base64 content that leaked from ReactFlow diagrams
  processedMarkdown = processedMarkdown
    .split('\n')
    .filter(line => !isBase64Residue(line))
    .join('\n');
  
  const lines = processedMarkdown.split('\n');
  
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
        // Check if this is a flowchart/mermaid block
        const codeContent = codeBlockContent.join('\n');
        if (isMermaidContent(codeContent)) {
          // Try to use pre-rendered image if available
          const diagramImage = diagramImages?.get(codeContent.trim());
          if (diagramImage) {
            elements.push(...createDiagramImageParagraph(diagramImage, 'Diagrama de Flujo'));
          } else {
            // Fallback to readable text format
            elements.push(...parseMermaidToReadable(codeContent));
          }
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
      
      // Try to use pre-rendered image if available
      const diagramImage = diagramImages?.get(mermaidContent.trim());
      if (diagramImage) {
        elements.push(...createDiagramImageParagraph(diagramImage, 'Diagrama de Flujo'));
      } else {
        // Fallback to readable text format
        elements.push(...parseMermaidToReadable(mermaidContent));
      }
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
    
    // Check for ReactFlow diagram placeholder
    const reactFlowPlaceholder = reactFlowMatches.find(m => trimmedLine === m.placeholder);
    if (reactFlowPlaceholder) {
      // Try to use pre-rendered image if available (using jsonContent as key)
      const diagramImage = diagramImages?.get(reactFlowPlaceholder.jsonContent);
      if (diagramImage) {
        elements.push(...createDiagramImageParagraph(diagramImage, 'Diagrama de Proceso'));
      } else {
        // Fallback: try to parse and create simple text representation
        try {
          const data = JSON.parse(reactFlowPlaceholder.jsonContent);
          if (data && Array.isArray(data.nodes)) {
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: data.title || 'Diagrama de Proceso',
                    bold: true,
                    size: 24,
                    font: VANDARUM_FONTS.titulo,
                    color: VANDARUM_COLORS.verdeOscuro,
                  }),
                ],
                spacing: { before: 150, after: 100 },
              })
            );
            // List nodes as bullet points
            data.nodes.forEach((node: { data?: { label?: string } }) => {
              if (node.data?.label) {
                elements.push(
                  new Paragraph({
                    children: createFormattedTextRuns(`• ${node.data.label}`),
                    spacing: { after: 50 },
                  })
                );
              }
            });
          }
        } catch (e) {
          console.warn('Failed to parse ReactFlow diagram for Word:', e);
        }
      }
      continue;
    }
    
    // Skip base64 residual lines that leaked from ReactFlow diagrams
    if (isBase64Residue(trimmedLine)) {
      continue;
    }
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (elements.length > 0) {
        elements.push(new Paragraph({ children: [], spacing: { after: 100 } }));
      }
      continue;
    }
    
    // Skip separator lines (--- or ___)
    if (/^[-_]{3,}$/.test(trimmedLine)) {
      continue;
    }
    
    // Handle headings (from most specific to least) - all at 12pt (size 24) as requested
    // Use parseInlineFormattedRuns to handle **bold** markers within heading text
    const headingOptions = { bold: true, size: 24, font: VANDARUM_FONTS.titulo, color: VANDARUM_COLORS.verdeOscuro };
    
    if (trimmedLine.startsWith('#### ')) {
      const headingText = sanitizeEmojis(trimmedLine.slice(5));
      elements.push(
        new Paragraph({
          children: parseInlineFormattedRuns(headingText, headingOptions),
          spacing: { before: 150, after: 80 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('### ')) {
      const headingText = sanitizeEmojis(trimmedLine.slice(4));
      elements.push(
        new Paragraph({
          children: parseInlineFormattedRuns(headingText, headingOptions),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('## ')) {
      const headingText = sanitizeEmojis(trimmedLine.slice(3));
      elements.push(
        new Paragraph({
          children: parseInlineFormattedRuns(headingText, headingOptions),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }
    
    if (trimmedLine.startsWith('# ')) {
      const headingText = sanitizeEmojis(trimmedLine.slice(2));
      elements.push(
        new Paragraph({
          children: parseInlineFormattedRuns(headingText, headingOptions),
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
  companyName?: string; // Name of the company being studied
  diagramImages?: Map<string, ArrayBuffer>; // Rendered Mermaid and ReactFlow diagrams as PNG images
}

/**
 * Generate and download a Word document from Deep Advisor report data
 */
export async function generateDeepAdvisorDocument(data: DeepAdvisorReportData): Promise<void> {
  const { content, query, companyName, diagramImages } = data;
  
  const sections: (Paragraph | Table)[] = [];
  
  // Query section if available - 12pt heading as requested
  if (query) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Consulta analizada',
            bold: true,
            size: 24, // 12pt as requested
            font: VANDARUM_FONTS.titulo,
            color: VANDARUM_COLORS.verdeOscuro,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    
    sections.push(
      new Paragraph({
        children: createFormattedTextRuns(query, { size: 18 }), // 9pt for query text
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        spacing: { after: 300 },
      })
    );
  }
  
  // No separator line as requested (removed ---)
  sections.push(
    new Paragraph({
      children: [],
      spacing: { after: 200 },
    })
  );
  
  // Main content - pass diagram images for embedding
  const contentParagraphs = parseMarkdownToParagraphs(content, diagramImages);
  sections.push(...contentParagraphs);
  
  // Generate full title for header (no truncation)
  const { title: studyTitle, companyExtracted } = generateFullTitle(query, content);
  
  // Use extracted company if no explicit companyName provided
  const finalCompanyName = companyName || companyExtracted;
  
  // Create cover page with study title and company name
  const coverPageElements = await createCoverPage(studyTitle, finalCompanyName);
  
  const doc = new Document({
    sections: [
      // Cover page section (no header/footer)
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
        children: coverPageElements,
      },
      // Main content section with header and footer
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
        headers: {
          default: createHeader(studyTitle),
        },
        footers: {
          default: createFooter(),
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
