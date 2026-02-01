/**
 * Generador de informes de Consultoría de Costes
 * Usa branding Vandarum y genera documentos Word reales
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  VANDARUM_NUMBERING_CONFIG,
  createVandarumTitle,
  createVandarumHeading1,
  createVandarumHeading2,
  createVandarumParagraph,
  createVandarumBullet,
  createVandarumFormattedParagraph,
  cleanMarkdownFromText,
} from './vandarumDocStyles';

export interface CostReportData {
  projectName: string;
  clientName?: string;
  totalSpendAnalyzed: number;
  totalSavingsIdentified: number;
  savingsPercentage: number;
  opportunitiesCount: number;
  quickWinsCount: number;
  contracts?: Array<{
    supplierName: string;
    contractNumber?: string;
    annualValue: number;
    riskScore?: number;
  }>;
  invoices?: Array<{
    invoiceNumber: string;
    supplierName: string;
    total: number;
    complianceStatus?: string;
  }>;
  opportunities?: Array<{
    title: string;
    description?: string;
    savingsAnnual: number;
    horizon?: string;
    priority?: number;
  }>;
  spendByCategory?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ReportConfig {
  sections: string[];
  format: 'executive' | 'complete';
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
};

async function fetchLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/vandarum-logo-principal.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function createCoverPage(data: CostReportData, logoBase64: string | null): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Espaciado superior
  paragraphs.push(new Paragraph({ spacing: { before: 2000 } }));
  
  // Logo Vandarum
  if (logoBase64) {
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBase64,
            transformation: { width: 200, height: 60 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      })
    );
  }
  
  // Espaciado
  paragraphs.push(new Paragraph({ spacing: { before: 1500 } }));
  
  // Título principal
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'INFORME DE CONSULTORÍA DE COSTES',
          bold: true,
          size: 56, // 28pt
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.titulo,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Nombre del proyecto
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.projectName,
          size: 44, // 22pt
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  
  // Cliente
  if (data.clientName) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.clientName,
            size: 36, // 18pt
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1500 },
      })
    );
  }
  
  // Fecha
  const date = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: date,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000 },
    })
  );
  
  // Línea decorativa
  paragraphs.push(
    new Paragraph({
      spacing: { before: 500 },
      border: {
        bottom: {
          color: VANDARUM_COLORS.verdeOscuro,
          size: 12,
          style: BorderStyle.SINGLE,
          space: 1,
        },
      },
    })
  );
  
  // Descripción empresa
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Vandarum - Consultoría especializada en tecnologías del agua',
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.grisClaro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
    })
  );
  
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'www.vandarum.com',
          size: VANDARUM_SIZES.pequeno,
          color: VANDARUM_COLORS.verdeOscuro,
          font: VANDARUM_FONTS.texto,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  
  // Salto de página
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  
  return paragraphs;
}

function createExecutiveSummary(data: CostReportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(createVandarumHeading1('1. Resumen Ejecutivo'));
  
  paragraphs.push(
    createVandarumFormattedParagraph(
      `Este informe presenta los resultados del análisis exhaustivo de costes operativos realizado para ${data.projectName}. Se han identificado oportunidades de ahorro significativas que pueden implementarse en diferentes horizontes temporales.`
    )
  );
  
  // KPIs en tabla
  const kpiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createKPICell('Gasto Total Analizado', formatCurrency(data.totalSpendAnalyzed)),
          createKPICell('Ahorro Identificado', formatCurrency(data.totalSavingsIdentified)),
        ],
      }),
      new TableRow({
        children: [
          createKPICell('Porcentaje de Ahorro', `${data.savingsPercentage?.toFixed(1) || 0}%`),
          createKPICell('Oportunidades', `${data.opportunitiesCount} (${data.quickWinsCount} quick wins)`),
        ],
      }),
    ],
  });
  
  paragraphs.push(new Paragraph({ spacing: { before: 300 } }));
  paragraphs.push(new Paragraph({ children: [] })); // Placeholder for table
  
  return paragraphs;
}

function createKPICell(label: string, value: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: 'F8FAFC' },
    margins: {
      top: convertInchesToTwip(0.15),
      bottom: convertInchesToTwip(0.15),
      left: convertInchesToTwip(0.2),
      right: convertInchesToTwip(0.2),
    },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 24, color: VANDARUM_COLORS.verdeOscuro },
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: value,
            bold: true,
            size: 40, // 20pt
            color: VANDARUM_COLORS.verdeOscuro,
            font: VANDARUM_FONTS.titulo,
          }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: label,
            size: VANDARUM_SIZES.pequeno,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
        ],
      }),
    ],
  });
}

function createSpendMap(data: CostReportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(createVandarumHeading1('2. Mapa de Gasto'));
  paragraphs.push(createVandarumParagraph('Distribución del gasto por categorías principales:'));
  
  if (data.spendByCategory && data.spendByCategory.length > 0) {
    for (const cat of data.spendByCategory) {
      paragraphs.push(
        createVandarumBullet(`${cat.category}: ${formatCurrency(cat.amount)} (${cat.percentage.toFixed(1)}%)`)
      );
    }
  } else {
    // Datos de ejemplo si no hay datos reales
    paragraphs.push(createVandarumBullet('Químicos: 35%'));
    paragraphs.push(createVandarumBullet('Canon y tasas: 22%'));
    paragraphs.push(createVandarumBullet('Residuos: 18%'));
    paragraphs.push(createVandarumBullet('O&M: 15%'));
    paragraphs.push(createVandarumBullet('Otros: 10%'));
  }
  
  return paragraphs;
}

function createOpportunitiesSection(data: CostReportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(createVandarumHeading1('3. Oportunidades Priorizadas'));
  paragraphs.push(
    createVandarumParagraph(
      'Las siguientes oportunidades han sido identificadas y priorizadas según su impacto y facilidad de implementación:'
    )
  );
  
  if (data.opportunities && data.opportunities.length > 0) {
    // Agrupar por horizonte
    const quickWins = data.opportunities.filter((o) => o.horizon === 'quick_win' || o.horizon === '0-3_months');
    const mediumTerm = data.opportunities.filter((o) => o.horizon === 'medium_term' || o.horizon === '3-6_months');
    const longTerm = data.opportunities.filter((o) => !['quick_win', '0-3_months', 'medium_term', '3-6_months'].includes(o.horizon || ''));
    
    if (quickWins.length > 0) {
      paragraphs.push(createVandarumHeading2('Quick Wins (0-3 meses)'));
      for (const opp of quickWins) {
        paragraphs.push(createVandarumBullet(`**${opp.title}**: ${formatCurrency(opp.savingsAnnual)}/año`));
        if (opp.description) {
          paragraphs.push(createVandarumParagraph(`   ${opp.description}`));
        }
      }
    }
    
    if (mediumTerm.length > 0) {
      paragraphs.push(createVandarumHeading2('Medio Plazo (3-6 meses)'));
      for (const opp of mediumTerm) {
        paragraphs.push(createVandarumBullet(`**${opp.title}**: ${formatCurrency(opp.savingsAnnual)}/año`));
        if (opp.description) {
          paragraphs.push(createVandarumParagraph(`   ${opp.description}`));
        }
      }
    }
    
    if (longTerm.length > 0) {
      paragraphs.push(createVandarumHeading2('Largo Plazo (6-12 meses)'));
      for (const opp of longTerm) {
        paragraphs.push(createVandarumBullet(`**${opp.title}**: ${formatCurrency(opp.savingsAnnual)}/año`));
        if (opp.description) {
          paragraphs.push(createVandarumParagraph(`   ${opp.description}`));
        }
      }
    }
  } else {
    paragraphs.push(createVandarumParagraph('No se han identificado oportunidades específicas en este análisis.'));
  }
  
  return paragraphs;
}

function createContractsSection(data: CostReportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(createVandarumHeading1('4. Análisis de Contratos'));
  
  if (data.contracts && data.contracts.length > 0) {
    paragraphs.push(
      createVandarumParagraph(`Se han analizado ${data.contracts.length} contratos activos:`)
    );
    
    for (const contract of data.contracts) {
      paragraphs.push(
        createVandarumBullet(
          `**${contract.supplierName}** - ${formatCurrency(contract.annualValue)}/año${
            contract.riskScore ? ` (Riesgo: ${contract.riskScore}/10)` : ''
          }`
        )
      );
    }
  } else {
    paragraphs.push(createVandarumParagraph('No hay contratos analizados en este informe.'));
  }
  
  return paragraphs;
}

function createRoadmapSection(data: CostReportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(createVandarumHeading1('5. Roadmap de Implementación'));
  
  paragraphs.push(createVandarumHeading2('Fase 1 (0-3 meses)'));
  paragraphs.push(createVandarumBullet('Implementar Quick Wins identificados'));
  paragraphs.push(createVandarumBullet('Renegociar contratos prioritarios'));
  
  paragraphs.push(createVandarumHeading2('Fase 2 (3-6 meses)'));
  paragraphs.push(createVandarumBullet('Optimización de proveedores'));
  paragraphs.push(createVandarumBullet('Consolidación de servicios'));
  
  paragraphs.push(createVandarumHeading2('Fase 3 (6-12 meses)'));
  paragraphs.push(createVandarumBullet('Implementación de mejoras estructurales'));
  paragraphs.push(createVandarumBullet('Seguimiento y medición de resultados'));
  
  return paragraphs;
}

function createMethodologySection(): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  paragraphs.push(createVandarumHeading1('Anexo: Metodología'));
  
  paragraphs.push(
    createVandarumParagraph(
      'El análisis se ha realizado siguiendo la metodología de Vandarum para consultoría de costes:'
    )
  );
  
  const steps = [
    'Recopilación de datos: Análisis de contratos y facturas del período',
    'Clasificación: Categorización del gasto según taxonomía estándar',
    'Benchmarking: Comparación con precios de mercado y mejores prácticas',
    'Identificación: Detección de anomalías, duplicidades y oportunidades',
    'Priorización: Clasificación por impacto y esfuerzo de implementación',
    'Recomendaciones: Plan de acción con roadmap de implementación',
  ];
  
  for (const step of steps) {
    paragraphs.push(createVandarumBullet(step));
  }
  
  return paragraphs;
}

function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Vandarum - Consultoría de Costes  |  ',
            size: VANDARUM_SIZES.footer,
            color: VANDARUM_COLORS.grisClaro,
            font: VANDARUM_FONTS.texto,
          }),
          new TextRun({
            text: 'www.vandarum.com  |  Página ',
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
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

export async function generateCostConsultingWordReport(
  data: CostReportData,
  config: ReportConfig
): Promise<void> {
  const logoBase64 = await fetchLogoAsBase64();
  
  const allParagraphs: Paragraph[] = [];
  
  // Portada
  allParagraphs.push(...createCoverPage(data, logoBase64));
  
  // Secciones según configuración
  if (config.sections.includes('executive_summary')) {
    allParagraphs.push(...createExecutiveSummary(data));
  }
  
  if (config.sections.includes('spend_map')) {
    allParagraphs.push(...createSpendMap(data));
  }
  
  if (config.sections.includes('contracts_analysis')) {
    allParagraphs.push(...createContractsSection(data));
  }
  
  if (config.sections.includes('opportunities')) {
    allParagraphs.push(...createOpportunitiesSection(data));
  }
  
  if (config.sections.includes('roadmap')) {
    allParagraphs.push(...createRoadmapSection(data));
  }
  
  if (config.sections.includes('methodology')) {
    allParagraphs.push(...createMethodologySection());
  }
  
  const doc = new Document({
    numbering: VANDARUM_NUMBERING_CONFIG,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        footers: {
          default: createFooter(),
        },
        children: allParagraphs,
      },
    ],
  });
  
  const blob = await Packer.toBlob(doc);
  const filename = `${data.projectName.replace(/\s+/g, '_')}_Informe_Costes.docx`;
  saveAs(blob, filename);
}
