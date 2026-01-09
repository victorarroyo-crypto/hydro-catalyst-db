/**
 * Generador de PDF para fichas tecnológicas del AI Advisor
 * Usa docx y permite al usuario guardar como PDF
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
} from "docx";
import { saveAs } from "file-saver";
import type { TechnologySheet } from "@/types/advisorChat";
import {
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  createVandarumHeading1,
} from './vandarumDocStyles';

// Helper to create info table rows
function createInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: VANDARUM_SIZES.texto,
                color: VANDARUM_COLORS.grisTexto,
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
        margins: {
          top: 100,
          bottom: 100,
          left: 150,
          right: 150,
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value || 'N/A',
                size: VANDARUM_SIZES.texto,
                color: VANDARUM_COLORS.grisTexto,
                font: VANDARUM_FONTS.texto,
              }),
            ],
          }),
        ],
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
        margins: {
          top: 100,
          bottom: 100,
          left: 150,
          right: 150,
        },
      }),
    ],
  });
}

export async function generateTechSheetDocument(tech: TechnologySheet): Promise<void> {
  const sections: (Paragraph | Table)[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: tech.nombre,
          bold: true,
          size: 48,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Subtitle with provider
  if (tech.proveedor) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Proveedor: ${tech.proveedor}`,
            size: VANDARUM_SIZES.subtitulo,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // General Info Section
  sections.push(createVandarumHeading1('Información General'));
  
  const generalInfoRows = [
    { label: 'Proveedor', value: tech.proveedor },
    { label: 'País de origen', value: tech.pais || '' },
    { label: 'Grado de madurez (TRL)', value: tech.trl ? `TRL ${tech.trl}` : '' },
    { label: 'Web', value: tech.web || '' },
    { label: 'Email de contacto', value: tech.email || '' },
  ].filter(row => row.value);

  if (generalInfoRows.length > 0) {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: generalInfoRows.map(row => createInfoRow(row.label, row.value)),
      })
    );
  }

  // Classification Section
  const classificationRows = [
    { label: 'Tipo de tecnología', value: tech.tipo || '' },
    { label: 'Subcategoría', value: tech.subcategoria || '' },
    { label: 'Sector', value: tech.sector || '' },
  ].filter(row => row.value);

  if (classificationRows.length > 0) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Clasificación'));
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: classificationRows.map(row => createInfoRow(row.label, row.value)),
      })
    );
  }

  // Description
  if (tech.descripcion) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Descripción Técnica'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tech.descripcion,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // Main Application
  if (tech.aplicacion_principal) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Aplicación Principal'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tech.aplicacion_principal,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // Competitive Advantage
  if (tech.ventaja_competitiva) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Ventaja Competitiva'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tech.ventaja_competitiva,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // Innovation
  if (tech.porque_innovadora) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Innovación'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tech.porque_innovadora,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // Reference Cases
  if (tech.casos_referencia) {
    sections.push(new Paragraph({ children: [], spacing: { before: 300 } }));
    sections.push(createVandarumHeading1('Casos de Referencia'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tech.casos_referencia,
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 150 },
      })
    );
  }

  // Footer
  sections.push(new Paragraph({ children: [], spacing: { before: 600 } }));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Ficha generada por Vandarum AI Advisor - ${new Date().toLocaleDateString('es-ES')}`,
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
          italics: true,
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
  const fileName = `Ficha_${tech.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  saveAs(blob, fileName);
}
