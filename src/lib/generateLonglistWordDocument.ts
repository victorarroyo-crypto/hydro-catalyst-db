/**
 * Generador de documentos Word profesionales para tecnologías del Longlist
 * Formato Vandarum oficial - basado en plantilla Vandarum_Ficha_Template.docx
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  AlignmentType,
  BorderStyle,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_NUMBERING_CONFIG,
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  createVandarumDocumentHeader,
  createVandarumDocumentFooter,
  createVandarumHeading1,
  createVandarumInfoTable,
  createVandarumFooter,
  cleanMarkdownFromText,
} from './vandarumDocStyles';

interface LonglistTechData {
  technology_name: string;
  provider?: string | null;
  country?: string | null;
  paises_actua?: string | null;
  web?: string | null;
  email?: string | null;
  trl?: number | null;
  brief_description?: string | null;
  type_suggested?: string | null;
  subcategory_suggested?: string | null;
  sector?: string | null;
  applications?: string[] | null;
  ventaja_competitiva?: string | null;
  innovacion?: string | null;
  casos_referencia?: string | null;
  inclusion_reason?: string | null;
  source?: string | null;
  added_at?: string | null;
  estado_seguimiento?: string | null;
  fecha_scouting?: string | null;
}

/**
 * Formatea una fecha para mostrar
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Crea la portada del documento siguiendo el formato Vandarum oficial
 */
function createVandarumFichaCover(techName: string, date: string): Paragraph[] {
  return [
    // Espaciado superior
    new Paragraph({ children: [], spacing: { before: 800 } }),
    
    // Nombre de la tecnología (grande, centrado, verde)
    new Paragraph({
      children: [
        new TextRun({
          text: techName,
          bold: true,
          size: 56,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Espaciador
    new Paragraph({ children: [], spacing: { before: 400 } }),
    
    // Logo Vandarum (texto)
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
      spacing: { after: 200 },
    }),
    
    // Línea decorativa
    new Paragraph({
      children: [
        new TextRun({
          text: '━━━━━━━━━━━━━━━━━━━━',
          color: VANDARUM_COLORS.grisClaro,
          size: 24,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    
    // Ficha de Tecnología
    new Paragraph({
      children: [
        new TextRun({
          text: 'Ficha de Tecnología',
          bold: true,
          size: VANDARUM_SIZES.titulo,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Nombre de la tecnología (subtítulo)
    new Paragraph({
      children: [
        new TextRun({
          text: techName,
          italics: true,
          size: VANDARUM_SIZES.subtitulo,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
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
    
    // Espacio antes del tagline
    new Paragraph({ children: [], spacing: { before: 1200 } }),
    
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
      spacing: { after: 100 },
    }),
    
    // Copyright
    new Paragraph({
      children: [
        new TextRun({
          text: '© 2026 Vandarum - Todos los derechos reservados',
          size: VANDARUM_SIZES.footer,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      alignment: AlignmentType.CENTER,
    }),
    
    // Salto de página
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Crea el encabezado de página interior con nombre tech + TRL badge
 */
function createTechPageHeader(techName: string, provider?: string | null, country?: string | null, trl?: number | null): Paragraph[] {
  const paragraphs: Paragraph[] = [
    // Nombre de la tecnología
    new Paragraph({
      children: [
        new TextRun({
          text: techName,
          bold: true,
          size: VANDARUM_SIZES.heading1,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      border: {
        bottom: {
          color: VANDARUM_COLORS.verdeOscuro,
          space: 1,
          size: 6,
          style: BorderStyle.SINGLE,
        },
      },
      spacing: { after: 150 },
    }),
  ];
  
  // Línea de contexto: Proveedor + País
  const contextChildren: TextRun[] = [];
  
  if (provider) {
    contextChildren.push(new TextRun({
      text: `Proveedor: ${provider}`,
      bold: true,
      size: VANDARUM_SIZES.texto,
      color: VANDARUM_COLORS.grisTexto,
      font: VANDARUM_FONTS.texto,
    }));
  }
  
  if (country) {
    if (contextChildren.length > 0) {
      contextChildren.push(new TextRun({
        text: '\n',
        size: VANDARUM_SIZES.texto,
      }));
    }
    contextChildren.push(new TextRun({
      text: `País: ${country}`,
      size: VANDARUM_SIZES.texto,
      color: VANDARUM_COLORS.grisTexto,
      font: VANDARUM_FONTS.texto,
    }));
  }
  
  if (contextChildren.length > 0) {
    paragraphs.push(new Paragraph({
      children: contextChildren,
      spacing: { after: 100 },
    }));
  }
  
  // TRL Badge separado
  if (trl !== null && trl !== undefined) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `TRL ${trl}`,
          bold: true,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      spacing: { after: 300 },
    }));
  }
  
  return paragraphs;
}

/**
 * Crea una sección de texto descriptivo
 */
function createTextSection(title: string, content: string | null | undefined): Paragraph[] {
  if (!content) return [];
  
  return [
    createVandarumHeading1(title),
    new Paragraph({
      children: [
        new TextRun({
          text: cleanMarkdownFromText(content),
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 200, line: 280 },
    }),
  ];
}

/**
 * Crea sección de Innovación y Ventajas
 */
function createInnovationSection(ventaja?: string | null, innovacion?: string | null): Paragraph[] {
  if (!ventaja && !innovacion) return [];
  
  const paragraphs: Paragraph[] = [
    createVandarumHeading1('Innovación y ventajas'),
  ];
  
  if (ventaja) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Ventaja competitiva: ',
          bold: true,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.titulo,
        }),
        new TextRun({
          text: cleanMarkdownFromText(ventaja),
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 150, line: 280 },
    }));
  }
  
  if (innovacion) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Por qué es innovadora: ',
          bold: true,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.titulo,
        }),
        new TextRun({
          text: cleanMarkdownFromText(innovacion),
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 200, line: 280 },
    }));
  }
  
  return paragraphs;
}

/**
 * Genera y descarga un documento Word profesional para una tecnología del longlist
 */
export async function generateLonglistWordDocument(
  tech: LonglistTechData,
  studyName: string
): Promise<void> {
  const now = new Date();
  const dateStr = formatDate(now);
  
  // Construir contenido del documento
  const sections: (Paragraph | Table)[] = [];
  
  // 1. Portada profesional Vandarum
  sections.push(...createVandarumFichaCover(tech.technology_name, dateStr));
  
  // 2. Encabezado de página interior
  sections.push(...createTechPageHeader(
    tech.technology_name,
    tech.provider,
    tech.country,
    tech.trl
  ));
  
  // 3. Información general - Tabla profesional
  sections.push(createVandarumHeading1('Información general'));
  
  const generalInfoRows: { label: string; value: string }[] = [
    { label: 'Proveedor / Empresa', value: tech.provider || '' },
    { label: 'País de origen', value: tech.country || '' },
    { label: 'Países donde actúa', value: tech.paises_actua || '' },
    { label: 'Web de la empresa', value: tech.web || '' },
    { label: 'Email de contacto', value: tech.email || '' },
    { label: 'Grado de madurez (TRL)', value: tech.trl ? `TRL ${tech.trl}` : '' },
    { label: 'Estado del seguimiento', value: tech.estado_seguimiento || '' },
  ].filter(row => row.value);
  
  sections.push(createVandarumInfoTable(generalInfoRows));
  sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  
  // 4. CLASIFICACIÓN - Tabla profesional
  const classificationRows: { label: string; value: string }[] = [
    { label: 'Tipo de tecnología', value: tech.type_suggested || '' },
    { label: 'Subcategoría', value: tech.subcategory_suggested || '' },
    { label: 'Sector', value: tech.sector || '' },
  ].filter(row => row.value);
  
  if (classificationRows.length > 0) {
    sections.push(createVandarumHeading1('Clasificación'));
    sections.push(createVandarumInfoTable(classificationRows));
    sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }
  
  // 5. Aplicación principal
  if (tech.applications && tech.applications.length > 0) {
    sections.push(...createTextSection('Aplicación principal', tech.applications.join('. ')));
  }
  
  // 6. Descripción técnica
  if (tech.brief_description) {
    sections.push(...createTextSection('Descripción técnica', tech.brief_description));
  }
  
  // 7. INNOVACIÓN Y VENTAJAS
  sections.push(...createInnovationSection(tech.ventaja_competitiva, tech.innovacion));
  
  // 8. Referencias
  if (tech.casos_referencia) {
    sections.push(...createTextSection('Referencias', tech.casos_referencia));
  }
  
  // 9. Notas del analista
  if (tech.inclusion_reason) {
    sections.push(createVandarumHeading1('Notas del analista'));
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: cleanMarkdownFromText(tech.inclusion_reason),
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 200, line: 280 },
    }));
  }
  
  // 10. Información de registro - Tabla profesional
  sections.push(createVandarumHeading1('Información de registro'));
  
  const sourceLabel = tech.source === 'database' ? 'Base de Datos' : 
    tech.source === 'ai_session' || tech.source === 'ai_extracted' ? 'Búsqueda Web (IA)' : 
    tech.source === 'manual' ? 'Entrada Manual' : 
    tech.source === 'chrome_extension' ? 'Extensión Chrome' : 'No especificada';
  
  const registroRows: { label: string; value: string }[] = [
    { label: 'Estudio', value: studyName },
    { label: 'Procedencia', value: sourceLabel },
    { label: 'Fecha de adición', value: tech.added_at ? new Date(tech.added_at).toLocaleDateString('es-ES') : '' },
  ].filter(row => row.value);
  
  if (tech.fecha_scouting) {
    registroRows.push({ label: 'Fecha de scouting', value: new Date(tech.fecha_scouting).toLocaleDateString('es-ES') });
  }
  
  sections.push(createVandarumInfoTable(registroRows));
  
  // 11. Pie de documento con copyright
  sections.push(...createVandarumFooter(dateStr));
  
  // Crear documento
  const doc = new Document({
    numbering: VANDARUM_NUMBERING_CONFIG,
    sections: [{
      properties: {},
      headers: {
        default: createVandarumDocumentHeader(`Estudio: ${studyName}`),
      },
      footers: {
        default: createVandarumDocumentFooter(),
      },
      children: sections,
    }],
  });
  
  // Generar y descargar
  try {
    const blob = await Packer.toBlob(doc);
    const safeName = tech.technology_name
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const safeStudy = studyName
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    saveAs(blob, `Vandarum_Ficha_${safeName}_${safeStudy}.docx`);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
}
