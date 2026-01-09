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
  NumberFormat
} from 'docx';

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

// Crear bullet point - siempre en gris para profesionalismo
export function createVandarumBullet(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text: `• ${text}`, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { after: 50 },
    indent: { left: 360 },
  });
}

// Crear etiqueta de sección SWOT - todas en gris oscuro para profesionalismo
export function createSwotLabel(type: 'strength' | 'weakness' | 'opportunity' | 'threat'): Paragraph {
  const labels = {
    strength: 'Fortalezas',
    weakness: 'Debilidades',
    opportunity: 'Oportunidades',
    threat: 'Amenazas',
  };

  return new Paragraph({
    children: [
      new TextRun({ 
        text: labels[type], 
        bold: true, 
        size: VANDARUM_SIZES.heading2,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.titulo,
      })
    ],
    spacing: { before: 200, after: 100 },
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
