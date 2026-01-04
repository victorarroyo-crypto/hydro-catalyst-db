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
  AlignmentType,
  HeadingLevel,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import type { Technology } from "@/types/database";

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

// Create a styled table row
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
                size: 22,
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
                size: 22,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// Create section header
const createSectionHeader = (title: string) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 26,
        color: "2563EB",
      }),
    ],
    spacing: { before: 300, after: 100 },
  });
};

// Create text paragraph
const createTextParagraph = (label: string, value: string | null) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 22,
      }),
      new TextRun({
        text: value || "N/A",
        size: 22,
      }),
    ],
    spacing: { after: 100 },
  });
};

export async function generateTechnologyWordDocument(
  technology: Technology,
  taxonomyData?: TaxonomyData
) {
  try {
    const trl = technology["Grado de madurez (TRL)"];
    const trlText = trl !== null && trl !== undefined ? `TRL ${trl}` : "N/A";

    const tipoText = taxonomyData?.tipo
      ? `${taxonomyData.tipo.codigo} - ${taxonomyData.tipo.nombre}`
      : technology["Tipo de tecnología"] || "N/A";

    const subcategoriaText = taxonomyData?.subcategoria
      ? `${taxonomyData.subcategoria.codigo} - ${taxonomyData.subcategoria.nombre}`
      : technology["Subcategoría"] || "N/A";

    const sectorText = taxonomyData?.sector
      ? `${taxonomyData.sector.id} - ${taxonomyData.sector.nombre}`
      : technology["Sector y subsector"] || "N/A";

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: "FICHA DE TECNOLOGÍA",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            
            // Technology Name
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Nombre de la tecnología"],
                  bold: true,
                  size: 36,
                  color: "1E40AF",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Main Info Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              rows: [
                createTableRow("Proveedor / Empresa", technology["Proveedor / Empresa"] || "N/A"),
                createTableRow("País de origen", technology["País de origen"] || "N/A"),
                createTableRow("Web de la empresa", technology["Web de la empresa"] || "N/A"),
                createTableRow("Email de contacto", technology["Email de contacto"] || "N/A"),
                createTableRow("Grado de madurez (TRL)", trlText),
                createTableRow("Estado", technology.status === "inactive" ? "Inactiva" : "Activa"),
              ],
            }),

            // Classification Section
            createSectionHeader("📂 Clasificación"),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              rows: [
                createTableRow("Tipo de tecnología", tipoText),
                createTableRow("Subcategoría", subcategoriaText),
                createTableRow("Sector", sectorText),
              ],
            }),

            // Technical Details Section
            createSectionHeader("🔧 Detalles Técnicos"),
            
            new Paragraph({
              children: [
                new TextRun({ text: "Aplicación principal", bold: true, size: 24 }),
              ],
              spacing: { before: 150, after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Aplicación principal"] || "N/A",
                  size: 22,
                }),
              ],
              spacing: { after: 150 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Descripción técnica breve", bold: true, size: 24 }),
              ],
              spacing: { before: 150, after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Descripción técnica breve"] || "N/A",
                  size: 22,
                }),
              ],
              spacing: { after: 150 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Ventaja competitiva clave", bold: true, size: 24 }),
              ],
              spacing: { before: 150, after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Ventaja competitiva clave"] || "N/A",
                  size: 22,
                }),
              ],
              spacing: { after: 150 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "¿Por qué es innovadora?", bold: true, size: 24 }),
              ],
              spacing: { before: 150, after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Porque es innovadora"] || "N/A",
                  size: 22,
                }),
              ],
              spacing: { after: 150 },
            }),

            // References Section
            createSectionHeader("📋 Referencias y Operaciones"),
            
            new Paragraph({
              children: [
                new TextRun({ text: "Casos de referencia", bold: true, size: 24 }),
              ],
              spacing: { before: 150, after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Casos de referencia"] || "N/A",
                  size: 22,
                }),
              ],
              spacing: { after: 150 },
            }),

            createTextParagraph("Países donde actúa", technology["Paises donde actua"]),
            createTextParagraph("Estado del seguimiento", technology["Estado del seguimiento"]),

            // Analyst Notes Section
            createSectionHeader("💬 Notas del Analista"),
            new Paragraph({
              children: [
                new TextRun({
                  text: technology["Comentarios del analista"] || "Sin comentarios",
                  size: 22,
                  italics: true,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Metadata Section
            createSectionHeader("📅 Información de Registro"),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              rows: [
                createTableRow("Fecha de scouting", formatDate(technology["Fecha de scouting"])),
                createTableRow("Fecha de creación", formatDate(technology.created_at)),
                createTableRow("Última actualización", formatDate(technology.updated_at)),
                createTableRow("Puntuación de calidad", technology.quality_score?.toString() || "N/A"),
              ],
            }),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: `Documento generado el ${formatDate(new Date().toISOString())}`,
                  size: 18,
                  color: "888888",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 },
            }),
          ],
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

    saveAs(blob, `Ficha_${safeName}.docx`);

    return true;
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
}
