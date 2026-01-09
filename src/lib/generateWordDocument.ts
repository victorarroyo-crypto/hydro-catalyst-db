/**
 * Generador de documentos Word profesionales para tecnologías de la BD
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
} from "docx";
import { saveAs } from "file-saver";
import type { Technology } from "@/types/database";
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

interface TaxonomyData {
  tipo?: { codigo: string; nombre: string } | null;
  subcategoria?: { codigo: string; nombre: string } | null;
  sector?: { id: string; nombre: string } | null;
}

// Format date helper
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Crea la portada del documento siguiendo el formato Vandarum oficial
 * Logo centrado + Nombre tecnología + "FICHA DE TECNOLOGÍA" + Fecha + slogan + copyright
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
          size: 56, // 28pt
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Espaciador
    new Paragraph({ children: [], spacing: { before: 400 } }),
    
    // Logo Vandarum (texto como placeholder - se puede reemplazar con imagen)
    new Paragraph({
      children: [
        new TextRun({
          text: 'VANDARUM',
          bold: true,
          size: 72, // 36pt
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
  
  // Línea de contexto: Proveedor + País + TRL
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
 * Crea una sección de texto descriptivo con título y contenido
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
 * Crea sección de Innovación y Ventajas con formato label: value
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

export async function generateTechnologyWordDocument(
  technology: Technology,
  taxonomyData?: TaxonomyData
) {
  try {
    const now = new Date();
    const dateStr = formatDate(now.toISOString());
    
    const trl = technology["Grado de madurez (TRL)"];
    const trlText = trl !== null && trl !== undefined ? `TRL ${trl}` : null;

    const tipoText = taxonomyData?.tipo
      ? `${taxonomyData.tipo.codigo} - ${taxonomyData.tipo.nombre}`
      : technology["Tipo de tecnología"] || null;

    const subcategoriaText = taxonomyData?.subcategoria
      ? `${taxonomyData.subcategoria.codigo} - ${taxonomyData.subcategoria.nombre}`
      : technology["Subcategoría"] || null;

    const sectorText = taxonomyData?.sector
      ? `${taxonomyData.sector.id} - ${taxonomyData.sector.nombre}`
      : technology["Sector y subsector"] || null;

    // Build document sections
    const sections: (Paragraph | Table)[] = [];
    
    // 1. Portada profesional Vandarum
    sections.push(...createVandarumFichaCover(
      technology["Nombre de la tecnología"],
      dateStr
    ));
    
    // 2. Encabezado de página interior con nombre + proveedor + país + TRL
    sections.push(...createTechPageHeader(
      technology["Nombre de la tecnología"],
      technology["Proveedor / Empresa"],
      technology["País de origen"],
      trl
    ));
    
    // 3. Información general - Tabla profesional
    sections.push(createVandarumHeading1('Información general'));
    
    const generalInfoRows: { label: string; value: string }[] = [
      { label: 'Proveedor / Empresa', value: technology["Proveedor / Empresa"] || '' },
      { label: 'País de origen', value: technology["País de origen"] || '' },
      { label: 'Países donde actúa', value: technology["Paises donde actua"] || '' },
      { label: 'Web de la empresa', value: technology["Web de la empresa"] || '' },
      { label: 'Email de contacto', value: technology["Email de contacto"] || '' },
      { label: 'Grado de madurez (TRL)', value: trlText || '' },
      { label: 'Estado', value: technology.status === "inactive" ? "Inactiva" : "Activa" },
      { label: 'Estado del seguimiento', value: technology["Estado del seguimiento"] || '' },
    ].filter(row => row.value); // Solo incluir filas con valor
    
    sections.push(createVandarumInfoTable(generalInfoRows));
    sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    
    // 4. Clasificación - Tabla profesional
    sections.push(createVandarumHeading1('Clasificación'));
    
    const classificationRows: { label: string; value: string }[] = [
      { label: 'Tipo de tecnología', value: tipoText || '' },
      { label: 'Subcategoría', value: subcategoriaText || '' },
      { label: 'Sector', value: sectorText || '' },
    ].filter(row => row.value);
    
    sections.push(createVandarumInfoTable(classificationRows));
    sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    
    // 5. Aplicación principal
    if (technology["Aplicación principal"]) {
      sections.push(...createTextSection('Aplicación principal', technology["Aplicación principal"]));
    }
    
    // 6. Descripción técnica
    if (technology["Descripción técnica breve"]) {
      sections.push(...createTextSection('Descripción técnica', technology["Descripción técnica breve"]));
    }
    
    // 7. INNOVACIÓN Y VENTAJAS
    sections.push(...createInnovationSection(
      technology["Ventaja competitiva clave"],
      technology["Porque es innovadora"]
    ));
    
    // 8. Referencias
    if (technology["Casos de referencia"]) {
      sections.push(...createTextSection('Referencias', technology["Casos de referencia"]));
    }
    
    // 9. Notas del analista
    if (technology["Comentarios del analista"]) {
      sections.push(createVandarumHeading1('Notas del analista'));
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanMarkdownFromText(technology["Comentarios del analista"]),
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
    
    const registroRows: { label: string; value: string }[] = [
      { label: 'Fecha de scouting', value: formatDate(technology["Fecha de scouting"]) },
      { label: 'Fecha de creación', value: formatDate(technology.created_at) },
      { label: 'Última actualización', value: formatDate(technology.updated_at) },
      { label: 'Puntuación de calidad', value: technology.quality_score?.toString() || '0' },
    ];
    
    sections.push(createVandarumInfoTable(registroRows));
    
    // 11. Pie de documento con copyright
    sections.push(...createVandarumFooter(dateStr));

    const doc = new Document({
      numbering: VANDARUM_NUMBERING_CONFIG,
      sections: [
        {
          properties: {},
          headers: {
            default: createVandarumDocumentHeader(technology["Nombre de la tecnología"]),
          },
          footers: {
            default: createVandarumDocumentFooter(),
          },
          children: sections,
        },
      ],
    });

    // Generate and download the document
    const blob = await Packer.toBlob(doc);

    // Create filename from technology name
    const safeName = technology["Nombre de la tecnología"]
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    saveAs(blob, `Vandarum_Ficha_${safeName}.docx`);

    return true;
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
}
