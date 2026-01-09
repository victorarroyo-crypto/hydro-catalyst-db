/**
 * Generador de documentos Word profesionales para tecnologías del Longlist
 * Formato Vandarum con portada, headers, footers y estilos corporativos
 */

import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import {
  VANDARUM_NUMBERING_CONFIG,
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
  createVandarumCover,
  createVandarumDocumentHeader,
  createVandarumDocumentFooter,
  createVandarumHeading1,
  createVandarumHighlight,
  createVandarumRichContent,
  createVandarumFooter,
  createVandarumTechTitle,
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
  // New fields for full parity with technologies table
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
 * Crea una sección de información con campos highlight
 */
function createInfoSection(title: string, fields: { label: string; value: string | null | undefined }[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createVandarumHeading1(title),
  ];
  
  for (const field of fields) {
    if (field.value) {
      paragraphs.push(createVandarumHighlight(field.label, cleanMarkdownFromText(field.value)));
    }
  }
  
  // Si no hay campos con valor, mostrar mensaje
  if (paragraphs.length === 1) {
    paragraphs.push(new Paragraph({
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
  
  return paragraphs;
}

/**
 * Crea sección de texto largo
 */
function createTextSection(title: string, content: string | null | undefined): Paragraph[] {
  if (!content) return [];
  
  return [
    createVandarumHeading1(title),
    ...createVandarumRichContent(cleanMarkdownFromText(content)),
  ];
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
  const sections: Paragraph[] = [];
  
  // 1. Portada profesional
  sections.push(...createVandarumCover(
    'FICHA DE TECNOLOGÍA',
    tech.technology_name,
    dateStr
  ));
  
  // 2. Título de la tecnología con TRL
  sections.push(...createVandarumTechTitle(tech.technology_name, null, undefined));
  
  // Info de contexto debajo del título
  if (tech.provider || tech.country) {
    const contextParts: string[] = [];
    if (tech.provider) contextParts.push(`Proveedor: ${tech.provider}`);
    if (tech.country) contextParts.push(`País: ${tech.country}`);
    if (tech.trl) contextParts.push(`TRL: ${tech.trl}`);
    
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
  
  // 3. Información General
  sections.push(...createInfoSection('INFORMACIÓN GENERAL', [
    { label: 'Proveedor / Empresa', value: tech.provider },
    { label: 'País de origen', value: tech.country },
    { label: 'Países donde actúa', value: tech.paises_actua },
    { label: 'Web', value: tech.web },
    { label: 'Email de contacto', value: tech.email },
    { label: 'Grado de madurez (TRL)', value: tech.trl?.toString() },
    { label: 'Estado del seguimiento', value: tech.estado_seguimiento },
    { label: 'Fecha de scouting', value: tech.fecha_scouting ? new Date(tech.fecha_scouting).toLocaleDateString('es-ES') : null },
  ]));
  
  // 4. Clasificación
  sections.push(...createInfoSection('CLASIFICACIÓN', [
    { label: 'Tipo de tecnología', value: tech.type_suggested },
    { label: 'Subcategoría', value: tech.subcategory_suggested },
    { label: 'Sector', value: tech.sector },
    { label: 'Aplicaciones', value: tech.applications?.join(', ') },
  ]));
  
  // 5. Descripción Técnica
  if (tech.brief_description) {
    sections.push(...createTextSection('DESCRIPCIÓN TÉCNICA', tech.brief_description));
  }
  
  // 6. Innovación y Ventajas
  const hasInnovation = tech.ventaja_competitiva || tech.innovacion;
  if (hasInnovation) {
    sections.push(createVandarumHeading1('INNOVACIÓN Y VENTAJAS'));
    
    if (tech.ventaja_competitiva) {
      sections.push(createVandarumHighlight('Ventaja competitiva', cleanMarkdownFromText(tech.ventaja_competitiva)));
    }
    if (tech.innovacion) {
      sections.push(createVandarumHighlight('Por qué es innovadora', cleanMarkdownFromText(tech.innovacion)));
    }
  }
  
  // 7. Referencias
  if (tech.casos_referencia) {
    sections.push(...createTextSection('REFERENCIAS', tech.casos_referencia));
  }
  
  // 8. Notas del Analista
  if (tech.inclusion_reason) {
    sections.push(createVandarumHeading1('NOTAS DEL ANALISTA'));
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: cleanMarkdownFromText(tech.inclusion_reason),
          italics: true,
          size: VANDARUM_SIZES.texto,
          color: VANDARUM_COLORS.grisTexto,
          font: VANDARUM_FONTS.texto,
        })
      ],
      spacing: { after: 200 },
    }));
  }
  
  // 9. Información de Registro
  sections.push(createVandarumHeading1('INFORMACIÓN DE REGISTRO'));
  sections.push(createVandarumHighlight('Estudio', studyName));
  sections.push(createVandarumHighlight('Procedencia', 
    tech.source === 'database' ? 'Base de Datos' : 
    tech.source === 'ai_session' || tech.source === 'ai_extracted' ? 'Búsqueda Web (IA)' : 
    tech.source === 'manual' ? 'Entrada Manual' : 
    tech.source === 'chrome_extension' ? 'Extensión Chrome' : 'No especificada'
  ));
  if (tech.added_at) {
    sections.push(createVandarumHighlight('Fecha de adición', 
      new Date(tech.added_at).toLocaleDateString('es-ES')
    ));
  }
  
  // 10. Pie de documento con copyright
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
