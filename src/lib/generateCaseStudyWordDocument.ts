// Vandarum Case Study Word Document Generator
// Professional Word export with Vandarum branding

import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  VANDARUM_NUMBERING_CONFIG,
  cleanMarkdownFromText,
  createVandarumCover,
  createVandarumHeading1,
  createVandarumInfoTable,
  createVandarumDocumentFooter,
  createVandarumDocumentHeader,
} from './vandarumDocStyles';

interface CaseStudyData {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  sector: string | null;
  status: string | null;
  quality_score: number | null;
  roi_percent: number | null;
  roi_rationale: string | null;
  capex: number | null;
  opex_year: number | null;
  payback_months: number | null;
  problem_parameters: Record<string, { value: number; unit: string }> | null;
  solution_applied: string | null;
  treatment_train: string[] | null;
  results_achieved: string | null;
  results_parameters: Record<string, { value: number; unit: string }> | null;
  lessons_learned: string | null;
  created_at: string;
}

interface CaseStudyTechnology {
  nombre: string;
  proveedor: string | null;
  role: string;
  web?: string | null;
  descripcion?: string | null;
  trl?: number | null;
}

// Sector labels map
const SECTOR_LABELS: Record<string, string> = {
  'general': 'General',
  'food_beverage': 'Alimentación y Bebidas',
  'pulp_paper': 'Celulosa y Papel',
  'textile': 'Textil',
  'chemical': 'Química',
  'pharma': 'Farmacéutica',
  'oil_gas': 'Oil & Gas',
  'metal': 'Metal-Mecánica',
  'mining': 'Minería',
  'power': 'Energía',
  'electronics': 'Electrónica/Semiconductores',
  'automotive': 'Automoción',
  'cosmetics': 'Cosmética',
  'municipal': 'Municipal',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function createTextSection(title: string, content: string): (Paragraph | Table)[] {
  return [
    createVandarumHeading1(title),
    new Paragraph({
      children: [
        new TextRun({
          text: cleanMarkdownFromText(content),
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      spacing: { after: 300, line: 280 },
    }),
  ];
}

function createParametersSection(
  title: string,
  parameters: Record<string, { value: number; unit: string }> | null
): (Paragraph | Table)[] {
  if (!parameters || Object.keys(parameters).length === 0) {
    return [];
  }

  const rows = Object.entries(parameters).map(([name, data]) => ({
    label: name,
    value: `${data.value} ${data.unit}`,
  }));

  return [
    createVandarumHeading1(title),
    createVandarumInfoTable(rows),
    new Paragraph({ children: [], spacing: { after: 200 } }),
  ];
}

export async function generateCaseStudyWordDocument(
  caseStudy: CaseStudyData,
  technologies: CaseStudyTechnology[] = []
): Promise<void> {
  const now = new Date();
  const dateStr = formatDate(now.toISOString());
  const sectorLabel = caseStudy.sector ? SECTOR_LABELS[caseStudy.sector] || caseStudy.sector : 'Sin sector';

  // Build document sections
  const sections: (Paragraph | Table)[] = [];

  // 1. Cover page
  sections.push(...createVandarumCover(caseStudy.name, 'Caso de Estudio', dateStr));

  // 2. General info header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: caseStudy.name,
          bold: true,
          size: VANDARUM_SIZES.heading1,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      spacing: { before: 400, after: 200 },
    })
  );

  // 3. Summary table
  sections.push(createVandarumHeading1('Resumen del Caso'));

  const summaryRows: { label: string; value: string }[] = [
    { label: 'País', value: caseStudy.country || '' },
    { label: 'Sector', value: sectorLabel },
    { label: 'ROI', value: caseStudy.roi_percent !== null ? `${caseStudy.roi_percent}%` : '' },
    { label: 'CAPEX', value: formatCurrency(caseStudy.capex) },
    { label: 'OPEX Anual', value: formatCurrency(caseStudy.opex_year) },
    { label: 'Payback', value: caseStudy.payback_months !== null ? `${caseStudy.payback_months} meses` : '' },
    { label: 'Puntuación de Calidad', value: caseStudy.quality_score !== null ? `${caseStudy.quality_score}/100` : '' },
  ].filter(row => row.value && row.value !== '—');

  sections.push(createVandarumInfoTable(summaryRows));
  sections.push(new Paragraph({ children: [], spacing: { after: 300 } }));

  // 4. Problem description
  if (caseStudy.description) {
    sections.push(...createTextSection('Problema', caseStudy.description));
  }

  // 5. Problem parameters
  sections.push(...createParametersSection('Parámetros del Problema', caseStudy.problem_parameters));

  // 6. Solution
  if (caseStudy.solution_applied) {
    sections.push(...createTextSection('Solución Aplicada', caseStudy.solution_applied));
  }

  // 7. Treatment train
  if (caseStudy.treatment_train && caseStudy.treatment_train.length > 0) {
    sections.push(createVandarumHeading1('Tren de Tratamiento'));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: caseStudy.treatment_train.join(' → '),
            size: VANDARUM_SIZES.texto,
            color: VANDARUM_COLORS.grisTexto,
            font: VANDARUM_FONTS.texto,
          }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // 8. Results
  if (caseStudy.results_achieved) {
    sections.push(...createTextSection('Resultados Alcanzados', caseStudy.results_achieved));
  }

  // 9. Results parameters
  sections.push(...createParametersSection('Parámetros de Resultados', caseStudy.results_parameters));

  // 10. ROI Rationale
  if (caseStudy.roi_rationale) {
    sections.push(...createTextSection('Justificación del ROI', caseStudy.roi_rationale));
  }

  // 11. Economic analysis
  const hasEconomicData = caseStudy.capex || caseStudy.opex_year || caseStudy.payback_months || caseStudy.roi_percent;
  if (hasEconomicData) {
    sections.push(createVandarumHeading1('Análisis Económico'));
    const economicRows: { label: string; value: string }[] = [
      { label: 'CAPEX (Inversión Inicial)', value: formatCurrency(caseStudy.capex) },
      { label: 'OPEX Anual', value: formatCurrency(caseStudy.opex_year) },
      { label: 'Periodo de Retorno', value: caseStudy.payback_months !== null ? `${caseStudy.payback_months} meses` : '' },
      { label: 'ROI', value: caseStudy.roi_percent !== null ? `${caseStudy.roi_percent}%` : '' },
    ].filter(row => row.value && row.value !== '—');

    sections.push(createVandarumInfoTable(economicRows));
    sections.push(new Paragraph({ children: [], spacing: { after: 300 } }));
  }

  // 12. Technologies
  if (technologies.length > 0) {
    sections.push(createVandarumHeading1('Tecnologías Aplicadas'));
    
    const techRows = technologies.map(tech => ({
      label: tech.nombre,
      value: [tech.proveedor, tech.role].filter(Boolean).join(' - ') || 'Sin detalles',
    }));

    sections.push(createVandarumInfoTable(techRows));
    sections.push(new Paragraph({ children: [], spacing: { after: 300 } }));
  }

  // 13. Lessons learned
  if (caseStudy.lessons_learned) {
    sections.push(...createTextSection('Lecciones Aprendidas', caseStudy.lessons_learned));
  }

  // 14. Document metadata
  sections.push(createVandarumHeading1('Información del Documento'));
  const metaRows: { label: string; value: string }[] = [
    { label: 'Fecha de Creación', value: formatDate(caseStudy.created_at) },
    { label: 'Fecha de Exportación', value: dateStr },
    { label: 'Estado', value: caseStudy.status === 'approved' ? 'Aprobado' : caseStudy.status === 'draft' ? 'Borrador' : caseStudy.status || 'Sin estado' },
  ];
  sections.push(createVandarumInfoTable(metaRows));

  // 15. Footer
  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // Create document
  const doc = new Document({
    numbering: VANDARUM_NUMBERING_CONFIG,
    sections: [
      {
        properties: {},
        headers: {
          default: createVandarumDocumentHeader('Caso de Estudio'),
        },
        children: sections,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const fileName = `Caso_Estudio_${caseStudy.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.docx`;
  saveAs(blob, fileName);
}
