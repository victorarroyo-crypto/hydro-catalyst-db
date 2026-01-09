// Vandarum Brand Manual - Document Styles
// Based on Manual de la Marca Vandarum - Professional minimal styling

import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  PageBreak,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  LevelFormat,
  convertInchesToTwip,
} from 'docx';

// Interface for text run base styles
interface TextRunBaseStyles {
  size: number;
  color: string;
  font: string;
}

/**
 * Elimina TODOS los patrones de markdown del texto
 * - **negritas** → negritas
 * - *cursivas* → cursivas  
 * - __negritas__ → negritas
 * - _cursivas_ → cursivas
 * - Asteriscos sueltos
 * - Pipes de tablas
 */
export function cleanMarkdownFromText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **negrita**
    .replace(/\*([^*]+)\*/g, '$1')       // *cursiva*
    .replace(/__([^_]+)__/g, '$1')       // __negrita__
    .replace(/_([^_]+)_/g, '$1')         // _cursiva_
    .replace(/\*/g, '')                  // Asteriscos sueltos
    .replace(/^\s*[-•]\s*/, '')          // Bullets al inicio
    .replace(/^\s*\d+\.\s*/, '')         // Números al inicio
    .trim();
}

/**
 * Procesa texto con tablas markdown, limpiando asteriscos
 */
export function processMarkdownTable(text: string): string[] {
  const lines = text.split('\n');
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    if (line.includes('|')) {
      // Es una fila de tabla - extraer celdas y limpiar
      const cells = line.split('|')
        .map(cell => cleanMarkdownFromText(cell.trim()))
        .filter(cell => cell && !cell.match(/^-+$/)); // Ignorar separadores
      
      if (cells.length > 0) {
        cleanLines.push(cells.join(' - '));
      }
    } else {
      // Línea normal - limpiar markdown
      const cleanLine = cleanMarkdownFromText(line);
      if (cleanLine) {
        cleanLines.push(cleanLine);
      }
    }
  }
  
  return cleanLines;
}

/**
 * Convierte texto con **negritas** en array de TextRun formateados
 * Elimina los asteriscos y aplica negrita real de Word
 */
export function parseMarkdownToTextRuns(
  text: string, 
  baseStyles: TextRunBaseStyles
): TextRun[] {
  // Si no hay patrones de negrita válidos, limpiar todos los asteriscos
  if (!text.includes('**')) {
    return [new TextRun({ 
      text: text.replace(/\*/g, ''), // Eliminar asteriscos sueltos
      size: baseStyles.size,
      color: baseStyles.color,
      font: baseStyles.font,
    })];
  }
  
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({
        text: part.slice(2, -2),
        bold: true,
        size: baseStyles.size,
        color: baseStyles.color,
        font: baseStyles.font,
      });
    }
    // Limpiar asteriscos sueltos del texto normal
    return new TextRun({ 
      text: part.replace(/\*/g, ''), 
      size: baseStyles.size,
      color: baseStyles.color,
      font: baseStyles.font,
    });
  });
}

/**
 * Configuración de numeración para listas numeradas nativas de Word
 */
export const VANDARUM_NUMBERING_CONFIG = {
  config: [
    {
      reference: "vandarum-numbering",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2)",
          alignment: AlignmentType.START,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
      ],
    },
  ],
};

// Colores de marca Vandarum - uso limitado para profesionalismo
export const VANDARUM_COLORS = {
  verdeOscuro: '307177',  // #307177 - Solo para títulos principales y acentos
  negro: '000000',
  grisTexto: '333333',    // Color principal del texto
  grisClaro: '666666',    // Para texto secundario
};

// Tipografía
export const VANDARUM_FONTS = {
  titulo: 'Arial',
  texto: 'Arial',
};

// Tamaños de fuente (en half-points)
export const VANDARUM_SIZES = {
  titulo: 48,      // 24pt
  subtitulo: 36,   // 18pt
  heading1: 32,    // 16pt
  heading2: 28,    // 14pt
  texto: 22,       // 11pt
  pequeno: 18,     // 9pt
  footer: 16,      // 8pt
};

// Crear párrafo de título principal
export function createVandarumTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
        bold: true, 
        size: VANDARUM_SIZES.titulo,
        color: VANDARUM_COLORS.verdeOscuro,
        font: VANDARUM_FONTS.titulo,
      })
    ],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
}

// Crear subtítulo
export function createVandarumSubtitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
        italics: true, 
        size: VANDARUM_SIZES.subtitulo,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  });
}

// Crear heading 1
export function createVandarumHeading1(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
        bold: true, 
        size: VANDARUM_SIZES.heading1,
        color: VANDARUM_COLORS.verdeOscuro,
        font: VANDARUM_FONTS.titulo,
      })
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: {
        color: VANDARUM_COLORS.verdeOscuro,
        space: 1,
        size: 6,
        style: BorderStyle.SINGLE,
      },
    },
  });
}

// Crear heading 2 - Limpia asteriscos automáticamente
export function createVandarumHeading2(text: string): Paragraph {
  const cleanText = cleanMarkdownFromText(text);
  return new Paragraph({
    children: [
      new TextRun({ 
        text: cleanText, 
        bold: true, 
        size: VANDARUM_SIZES.heading2,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.titulo,
      })
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

/**
 * Crea título de tecnología destacado con borde verde y puntuación normalizada
 */
export function createVandarumTechTitle(
  name: string, 
  score?: number | null, 
  priority?: number
): Paragraph[] {
  const cleanName = cleanMarkdownFromText(name);
  const normalizedScore = score && score > 10 ? score / 10 : score;
  
  const paragraphs: Paragraph[] = [
    // Título de la tecnología en verde Vandarum con borde izquierdo
    new Paragraph({
      children: [
        new TextRun({ 
          text: cleanName, 
          bold: true, 
          size: VANDARUM_SIZES.heading2,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      spacing: { before: 400, after: 100 },
      border: {
        left: {
          color: VANDARUM_COLORS.verdeOscuro,
          size: 24,
          style: BorderStyle.SINGLE,
          space: 8,
        },
      },
      indent: { left: 180 },
    }),
  ];
  
  // Línea de info: Puntuación y Prioridad
  if (normalizedScore || priority) {
    const infoChildren: TextRun[] = [];
    if (normalizedScore) {
      infoChildren.push(new TextRun({ 
        text: `Puntuación: ${normalizedScore.toFixed(1)}/10`, 
        bold: true,
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      }));
    }
    if (normalizedScore && priority) {
      infoChildren.push(new TextRun({ 
        text: '  |  ',
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisClaro,
        font: VANDARUM_FONTS.texto,
      }));
    }
    if (priority) {
      infoChildren.push(new TextRun({ 
        text: `Prioridad: ${priority}`,
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      }));
    }
    
    paragraphs.push(new Paragraph({
      children: infoChildren,
      spacing: { after: 150 },
      indent: { left: 180 },
    }));
  }
  
  return paragraphs;
}

/**
 * Crea bloque SWOT completo formateado profesionalmente
 */
export function createVandarumSwotBlock(
  strengths: string[],
  weaknesses: string[],
  opportunities: string[],
  threats: string[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  if (strengths && strengths.length > 0) {
    paragraphs.push(createSwotLabel('strength'));
    for (const s of strengths) {
      paragraphs.push(createVandarumBullet(s));
    }
  }
  
  if (weaknesses && weaknesses.length > 0) {
    paragraphs.push(createSwotLabel('weakness'));
    for (const w of weaknesses) {
      paragraphs.push(createVandarumBullet(w));
    }
  }
  
  if (opportunities && opportunities.length > 0) {
    paragraphs.push(createSwotLabel('opportunity'));
    for (const o of opportunities) {
      paragraphs.push(createVandarumBullet(o));
    }
  }
  
  if (threats && threats.length > 0) {
    paragraphs.push(createSwotLabel('threat'));
    for (const t of threats) {
      paragraphs.push(createVandarumBullet(t));
    }
  }
  
  return paragraphs;
}

// Crear párrafo de texto normal
export function createVandarumParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { after: 150 },
  });
}

/**
 * Crea bullet con viñeta nativa de Word y soporte para **negritas**
 */
export function createVandarumBullet(text: string): Paragraph {
  const textRuns = parseMarkdownToTextRuns(text, {
    size: VANDARUM_SIZES.texto,
    color: VANDARUM_COLORS.grisTexto,
    font: VANDARUM_FONTS.texto,
  });
  
  return new Paragraph({
    children: textRuns,
    bullet: { level: 0 },
    spacing: { 
      after: 120,
      line: 280,
    },
    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
  });
}

/**
 * Crea item de lista numerada nativa de Word con soporte para **negritas**
 */
export function createVandarumNumberedItem(text: string): Paragraph {
  const textRuns = parseMarkdownToTextRuns(text, {
    size: VANDARUM_SIZES.texto,
    color: VANDARUM_COLORS.grisTexto,
    font: VANDARUM_FONTS.texto,
  });
  
  return new Paragraph({
    children: textRuns,
    numbering: { reference: "vandarum-numbering", level: 0 },
    spacing: { after: 120, line: 280 },
    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
  });
}

/**
 * Crea párrafo formateado procesando **negritas**
 */
export function createVandarumFormattedParagraph(text: string): Paragraph {
  const textRuns = parseMarkdownToTextRuns(text, {
    size: VANDARUM_SIZES.texto,
    color: VANDARUM_COLORS.grisTexto,
    font: VANDARUM_FONTS.texto,
  });
  
  return new Paragraph({
    children: textRuns,
    spacing: { after: 180, line: 280 },
  });
}

/**
 * Crea un sub-item formateado con etiqueta en negrita (Acción, Justificación)
 */
export function createVandarumSubItem(label: string, content: string): Paragraph {
  const cleanContent = cleanMarkdownFromText(content);
  
  return new Paragraph({
    children: [
      new TextRun({ 
        text: `${label}: `, 
        bold: true, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.verdeOscuro,
        font: VANDARUM_FONTS.titulo,
      }),
      new TextRun({ 
        text: cleanContent, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { before: 120, after: 180, line: 280 },
    indent: { left: convertInchesToTwip(0.75) },
  });
}

/**
 * Procesa texto largo detectando párrafos, listas numeradas, bullets y tablas
 * Convierte texto plano en estructura profesional de Word
 * ELIMINA todos los asteriscos y formateo markdown
 * ESPECIAL: Detecta patrones "- Acción:" y "- Justificación:" para formateo con salto de línea
 */
export function createVandarumRichContent(text: string): Paragraph[] {
  if (!text) return [];
  
  const paragraphs: Paragraph[] = [];
  
  // PRIMERO: Detectar si contiene tablas markdown
  if (text.includes('|') && text.split('|').length > 4) {
    // Procesar como contenido con tablas
    const cleanLines = processMarkdownTable(text);
    for (const line of cleanLines) {
      // Detectar encabezados markdown (#, ##, etc.)
      if (/^#+\s/.test(line)) {
        const headingText = cleanMarkdownFromText(line.replace(/^#+\s*/, ''));
        paragraphs.push(createVandarumHeading2(headingText));
      } else {
        paragraphs.push(createVandarumFormattedParagraph(cleanMarkdownFromText(line)));
      }
    }
    return paragraphs;
  }
  
  // Dividir por doble salto de línea para crear párrafos separados
  const blocks = text.split(/\n\n+/);
  
  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    
    // Detectar encabezados markdown (#, ##, etc.)
    if (/^#+\s/.test(trimmedBlock)) {
      const headingText = cleanMarkdownFromText(trimmedBlock.replace(/^#+\s*/, ''));
      paragraphs.push(createVandarumHeading2(headingText));
      continue;
    }
    
    // Detectar si es una lista numerada (1., 2., etc.)
    if (/^\d+\.\s/.test(trimmedBlock)) {
      // Dividir por items numerados pero mantener sub-items juntos
      const numberedItems = trimmedBlock.split(/\n(?=\d+\.)/);
      
      for (const item of numberedItems) {
        // Separar la línea principal de los sub-items (- Acción:, - Justificación:)
        const lines = item.split('\n');
        const mainLine = lines[0];
        const subLines = lines.slice(1);
        
        // Procesar línea principal
        const mainMatch = mainLine.match(/^\d+\.\s*(.*)$/s);
        if (mainMatch) {
          const content = cleanMarkdownFromText(mainMatch[1].trim());
          const colonIndex = content.indexOf(':');
          if (colonIndex > 0 && colonIndex < 80) {
            const title = content.substring(0, colonIndex + 1);
            const description = content.substring(colonIndex + 1).trim();
            paragraphs.push(createVandarumNumberedItem(`**${title}** ${description}`));
          } else {
            paragraphs.push(createVandarumNumberedItem(content));
          }
        }
        
        // Procesar sub-items con formato especial
        for (const subLine of subLines) {
          const trimmedSub = subLine.trim();
          if (!trimmedSub) continue;
          
          // Detectar "- Acción:" o "- Justificación:" u otros patrones similares
          const subItemMatch = trimmedSub.match(/^[-•]\s*(Acción|Justificación|Notas?|Observación|Comentario):\s*(.*)$/i);
          if (subItemMatch) {
            paragraphs.push(createVandarumSubItem(subItemMatch[1], subItemMatch[2]));
          } else {
            // Es un bullet normal
            const content = cleanMarkdownFromText(trimmedSub.replace(/^[-•]\s*/, ''));
            paragraphs.push(createVandarumBullet(content));
          }
        }
      }
      continue;
    }
    
    // Detectar si es una lista de bullets (- o •)
    if (/^[-•]\s/.test(trimmedBlock)) {
      const items = trimmedBlock.split(/\n(?=[-•]\s)/);
      for (const item of items) {
        const trimmedItem = item.trim();
        
        // Detectar patrón especial "- Acción:" o "- Justificación:"
        const specialMatch = trimmedItem.match(/^[-•]\s*(Acción|Justificación|Notas?|Observación|Comentario):\s*(.*)$/i);
        if (specialMatch) {
          paragraphs.push(createVandarumSubItem(specialMatch[1], specialMatch[2]));
        } else {
          const content = cleanMarkdownFromText(trimmedItem.replace(/^[-•]\s*/, ''));
          paragraphs.push(createVandarumBullet(content));
        }
      }
      continue;
    }
    
    // Párrafo normal - dividir por saltos de línea simples
    const lines = trimmedBlock.split(/\n/);
    for (const line of lines) {
      const cleanLine = cleanMarkdownFromText(line.trim());
      if (cleanLine) {
        paragraphs.push(createVandarumFormattedParagraph(cleanLine));
      }
    }
  }
  
  return paragraphs;
}

/**
 * Crea etiqueta SWOT con color distintivo y borde izquierdo
 */
export function createSwotLabel(type: 'strength' | 'weakness' | 'opportunity' | 'threat'): Paragraph {
  const config = {
    strength: { label: 'Fortalezas', color: '307177' },      // Verde Vandarum
    weakness: { label: 'Debilidades', color: 'B91C1C' },     // Rojo oscuro
    opportunity: { label: 'Oportunidades', color: '1D4ED8' }, // Azul
    threat: { label: 'Amenazas', color: 'B45309' },          // Naranja oscuro
  };
  
  const { label, color } = config[type];

  return new Paragraph({
    children: [
      new TextRun({ 
        text: label, 
        bold: true, 
        size: VANDARUM_SIZES.heading2,
        color: color,
        font: VANDARUM_FONTS.titulo,
      })
    ],
    spacing: { before: 280, after: 120 },
    border: {
      left: {
        color: color,
        size: 24,
        style: BorderStyle.SINGLE,
        space: 8,
      },
    },
    indent: { left: 180 },
  });
}

/**
 * Separador profesional entre tecnologías (salto de página)
 */
export function createVandarumTechSeparator(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

// Crear pie de página con copyright Vandarum
export function createVandarumFooter(date: string): Paragraph[] {
  return [
    new Paragraph({ children: [], spacing: { before: 600 } }),
    new Paragraph({
      children: [
        new TextRun({ 
          text: '─'.repeat(60), 
          color: VANDARUM_COLORS.grisClaro,
          size: VANDARUM_SIZES.footer,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ 
          text: '© Vandarum - Innovación aplicada, red global de resultados sostenibles', 
          italics: true, 
          size: VANDARUM_SIZES.footer,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ 
          text: `Documento generado el ${date} • Todos los derechos reservados`, 
          size: VANDARUM_SIZES.footer,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

// Crear portada del documento
export function createVandarumCover(title: string, subtitle: string, date: string): Paragraph[] {
  return [
    // Espaciado superior
    new Paragraph({ children: [], spacing: { before: 2000 } }),
    
    // Título principal
    new Paragraph({
      children: [
        new TextRun({ 
          text: 'VANDARUM', 
          bold: true, 
          size: 72,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    
    // Línea decorativa sutil
    new Paragraph({
      children: [
        new TextRun({ 
          text: '━━━━━━━━━━━━━━━━━━━━', 
          color: VANDARUM_COLORS.grisClaro,
          size: 24,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    
    // Título del documento
    new Paragraph({
      children: [
        new TextRun({ 
          text: title, 
          bold: true, 
          size: VANDARUM_SIZES.titulo,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Subtítulo
    new Paragraph({
      children: [
        new TextRun({ 
          text: subtitle, 
          italics: true, 
          size: VANDARUM_SIZES.subtitulo,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    
    // Fecha
    new Paragraph({
      children: [
        new TextRun({ 
          text: date, 
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Espacio antes del pie
    new Paragraph({ children: [], spacing: { before: 2000 } }),
    
    // Tagline
    new Paragraph({
      children: [
        new TextRun({ 
          text: 'Innovación aplicada, red global de resultados sostenibles', 
          italics: true, 
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
    }),
    
    // Salto de página
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
}

// Crear separador entre secciones
export function createVandarumSeparator(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text: '• • •', 
        color: VANDARUM_COLORS.grisClaro,
        size: VANDARUM_SIZES.texto,
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

// Crear texto destacado
export function createVandarumHighlight(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text: `${label}: `, 
        bold: true, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.titulo,
      }),
      new TextRun({ 
        text: value, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { after: 80 },
  });
}

// Crear footer nativo de Word con numeración de páginas y copyright
export function createVandarumDocumentFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ 
            text: '─'.repeat(80), 
            color: VANDARUM_COLORS.grisClaro,
            size: VANDARUM_SIZES.footer,
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '© 2026 Vandarum - Todos los derechos reservados',
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            text: '   |   Página ',
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            text: ' de ',
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

// Crear header nativo de Word con nombre del estudio
export function createVandarumDocumentHeader(title: string): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
            italics: true,
          }),
        ],
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: {
            color: VANDARUM_COLORS.grisClaro,
            size: 4,
            style: BorderStyle.SINGLE,
            space: 4,
          },
        },
        spacing: { after: 200 },
      }),
    ],
  });
}
