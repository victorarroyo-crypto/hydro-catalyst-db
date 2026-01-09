// Vandarum Brand Manual - Document Styles
// Based on Manual de la Marca Vandarum

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

// Colores de marca Vandarum
export const VANDARUM_COLORS = {
  verdeOscuro: '307177',  // #307177 - Principal
  azul: '32b4cd',         // #32b4cd
  verdeClaro: '8cb63c',   // #8cb63c
  naranja: 'ffa720',      // #ffa720
  blanco: 'FFFFFF',
  negro: '000000',
  grisClaro: 'F5F5F5',
  grisTexto: '333333',
};

// Tipografía: Helvetica Neue LT Pro (usamos Arial como fallback en Word)
export const VANDARUM_FONTS = {
  titulo: 'Arial',      // Fallback para Helvetica Neue LT Pro 77 Bold
  texto: 'Arial',       // Fallback para Helvetica Neue LT Pro 55 Roman
  alternativa: 'Arial', // Fallback para Proxima Nova
};

// Tamaños de fuente (en half-points, Word usa half-points)
export const VANDARUM_SIZES = {
  titulo: 48,      // 24pt
  subtitulo: 36,   // 18pt
  heading1: 32,    // 16pt
  heading2: 28,    // 14pt
  texto: 22,       // 11pt
  pequeno: 18,     // 9pt
  footer: 16,      // 8pt
};

// Crear párrafo de título principal con estilo Vandarum
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

// Crear subtítulo con estilo Vandarum
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

// Crear heading 1 con estilo Vandarum
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

// Crear heading 2 con estilo Vandarum
export function createVandarumHeading2(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text, 
        bold: true, 
        size: VANDARUM_SIZES.heading2,
        color: VANDARUM_COLORS.azul,
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

// Crear bullet point
export function createVandarumBullet(text: string, color?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text: `• ${text}`, 
        size: VANDARUM_SIZES.texto,
        color: color || VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { after: 50 },
    indent: { left: 360 },
  });
}

// Crear etiqueta de sección SWOT
export function createSwotLabel(type: 'strength' | 'weakness' | 'opportunity' | 'threat'): Paragraph {
  const labels = {
    strength: { text: 'Fortalezas', color: VANDARUM_COLORS.verdeClaro },
    weakness: { text: 'Debilidades', color: 'cb2431' },
    opportunity: { text: 'Oportunidades', color: VANDARUM_COLORS.azul },
    threat: { text: 'Amenazas', color: VANDARUM_COLORS.naranja },
  };

  const config = labels[type];
  
  return new Paragraph({
    children: [
      new TextRun({ 
        text: config.text, 
        bold: true, 
        size: VANDARUM_SIZES.heading2,
        color: config.color,
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
          color: VANDARUM_COLORS.verdeOscuro,
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
          text: 'Todos los derechos reservados', 
          size: VANDARUM_SIZES.footer,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ 
          text: `Documento generado el ${date}`, 
          size: VANDARUM_SIZES.footer,
          color: VANDARUM_COLORS.grisTexto,
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
    
    // Línea decorativa
    new Paragraph({
      children: [
        new TextRun({ 
          text: '━━━━━━━━━━━━━━━━━━━━', 
          color: VANDARUM_COLORS.naranja,
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
          color: VANDARUM_COLORS.grisTexto,
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
          color: VANDARUM_COLORS.grisTexto,
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
        color: VANDARUM_COLORS.verdeOscuro,
        size: VANDARUM_SIZES.texto,
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

// Crear texto destacado (para puntuaciones, recomendaciones)
export function createVandarumHighlight(label: string, value: string): Paragraph {
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
        text: value, 
        size: VANDARUM_SIZES.texto,
        color: VANDARUM_COLORS.grisTexto,
        font: VANDARUM_FONTS.texto,
      })
    ],
    spacing: { after: 80 },
  });
}
