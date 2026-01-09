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
 * Convierte texto con **negritas** en array de TextRun formateados
 * Elimina los asteriscos y aplica negrita real de Word
 */
export function parseMarkdownToTextRuns(
  text: string, 
  baseStyles: TextRunBaseStyles
): TextRun[] {
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
    return new TextRun({ 
      text: part, 
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

// Crear heading 2
export function createVandarumHeading2(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
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
 * Procesa texto largo detectando párrafos, listas numeradas y bullets
 * Convierte texto plano en estructura profesional de Word
 */
export function createVandarumRichContent(text: string): Paragraph[] {
  if (!text) return [];
  
  const paragraphs: Paragraph[] = [];
  
  // Dividir por doble salto de línea para crear párrafos separados
  const blocks = text.split(/\n\n+/);
  
  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    
    // Detectar si es una lista numerada (1., 2., etc.)
    if (/^\d+\.\s/.test(trimmedBlock)) {
      const items = trimmedBlock.split(/\n(?=\d+\.)/);
      for (const item of items) {
        const match = item.match(/^\d+\.\s*(.*)$/s);
        if (match) {
          // Separar título y descripción si hay dos puntos
          const content = match[1].trim();
          const colonIndex = content.indexOf(':');
          if (colonIndex > 0 && colonIndex < 50) {
            const title = content.substring(0, colonIndex + 1);
            const description = content.substring(colonIndex + 1).trim();
            paragraphs.push(createVandarumNumberedItem(`**${title}** ${description}`));
          } else {
            paragraphs.push(createVandarumNumberedItem(content));
          }
        }
      }
    }
    // Detectar si es una lista de bullets (- o •)
    else if (/^[-•]\s/.test(trimmedBlock)) {
      const items = trimmedBlock.split(/\n(?=[-•]\s)/);
      for (const item of items) {
        const content = item.replace(/^[-•]\s*/, '').trim();
        paragraphs.push(createVandarumBullet(content));
      }
    }
    // Párrafo normal - dividir por saltos de línea simples
    else {
      const lines = trimmedBlock.split(/\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          paragraphs.push(createVandarumFormattedParagraph(trimmedLine));
        }
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
