/**
 * Generador de documentos Word profesionales para tecnologías de la BD
 * Formato Vandarum con portada, headers, footers y estilos corporativos
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import type { Technology } from "@/types/database";
import {
  VANDARUM_NUMBERING_CONFIG,
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  createVandarumCover,
  createVandarumDocumentHeader,
  createVandarumDocumentFooter,
  createVandarumHeading1,
  createVandarumHeading2,
  createVandarumHighlight,
  createVandarumRichContent,
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

// Create a styled table row for Vandarum format
const createTableRow = (label: string, value: string) => {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "E8E8E8" },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: VANDARUM_SIZES.texto,
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value || "N/A",
                size: VANDARUM_SIZES.texto,
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// Create info section with table
function createInfoSection(title: string, fields: { label: string; value: string | null | undefined }[]): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [createVandarumHeading1(title)];
  
  const rows = fields
    .filter(f => f.value)
    .map(f => createTableRow(f.label, cleanMarkdownFromText(f.value!)));
  
  if (rows.length > 0) {
    result.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      rows,
    }));
  } else {
    result.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Sin información disponible',
          italics: true,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 150 },
    }));
  }
  
  return result;
}

// Create text section
function createTextSection(title: string, content: string | null | undefined): Paragraph[] {
  if (!content) return [];
  
  return [
    createVandarumHeading1(title),
    ...createVandarumRichContent(cleanMarkdownFromText(content)),
  ];
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
    
    // 1. Professional cover page
    sections.push(...createVandarumCover(
      'FICHA DE TECNOLOGÍA',
      technology["Nombre de la tecnología"],
      dateStr
    ));
    
    // 2. Technology title
    sections.push(createVandarumHeading2(technology["Nombre de la tecnología"]));
    
    // Context info below title
    const contextParts: string[] = [];
    if (technology["Proveedor / Empresa"]) contextParts.push(`Proveedor: ${technology["Proveedor / Empresa"]}`);
    if (technology["País de origen"]) contextParts.push(`País: ${technology["País de origen"]}`);
    if (trlText) contextParts.push(trlText);
    
    if (contextParts.length > 0) {
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: contextParts.join('  |  '),
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
            italics: true,
          })
        ],
        spacing: { after: 300 },
      }));
    }
    
    // 3. General Information
    sections.push(...createInfoSection('INFORMACIÓN GENERAL', [
      { label: 'Proveedor / Empresa', value: technology["Proveedor / Empresa"] },
      { label: 'País de origen', value: technology["País de origen"] },
      { label: 'Países donde actúa', value: technology["Paises donde actua"] },
      { label: 'Web de la empresa', value: technology["Web de la empresa"] },
      { label: 'Email de contacto', value: technology["Email de contacto"] },
      { label: 'Grado de madurez (TRL)', value: trlText },
      { label: 'Estado', value: technology.status === "inactive" ? "Inactiva" : "Activa" },
      { label: 'Estado del seguimiento', value: technology["Estado del seguimiento"] },
    ]));
    
    // 4. Classification
    sections.push(...createInfoSection('CLASIFICACIÓN', [
      { label: 'Tipo de tecnología', value: tipoText },
      { label: 'Subcategoría', value: subcategoriaText },
      { label: 'Sector', value: sectorText },
      { label: 'Aplicación principal', value: technology["Aplicación principal"] },
    ]));
    
    // 5. Technical Description
    if (technology["Descripción técnica breve"]) {
      sections.push(...createTextSection('DESCRIPCIÓN TÉCNICA', technology["Descripción técnica breve"]));
    }
    
    // 6. Innovation and Advantages
    const hasInnovation = technology["Ventaja competitiva clave"] || technology["Porque es innovadora"];
    if (hasInnovation) {
      sections.push(createVandarumHeading1('INNOVACIÓN Y VENTAJAS'));
      
      if (technology["Ventaja competitiva clave"]) {
        sections.push(createVandarumHighlight('Ventaja competitiva', cleanMarkdownFromText(technology["Ventaja competitiva clave"])));
      }
      if (technology["Porque es innovadora"]) {
        sections.push(createVandarumHighlight('Por qué es innovadora', cleanMarkdownFromText(technology["Porque es innovadora"])));
      }
    }
    
    // 7. References
    if (technology["Casos de referencia"]) {
      sections.push(...createTextSection('REFERENCIAS', technology["Casos de referencia"]));
    }
    
    // 8. Analyst Notes
    if (technology["Comentarios del analista"]) {
      sections.push(createVandarumHeading1('NOTAS DEL ANALISTA'));
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanMarkdownFromText(technology["Comentarios del analista"]),
            italics: true,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          })
        ],
        spacing: { after: 200 },
      }));
    }
    
    // 9. Registration Info
    sections.push(...createInfoSection('INFORMACIÓN DE REGISTRO', [
      { label: 'Fecha de scouting', value: formatDate(technology["Fecha de scouting"]) },
      { label: 'Fecha de creación', value: formatDate(technology.created_at) },
      { label: 'Última actualización', value: formatDate(technology.updated_at) },
      { label: 'Puntuación de calidad', value: technology.quality_score?.toString() },
    ]));
    
    // 10. Document footer with copyright
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