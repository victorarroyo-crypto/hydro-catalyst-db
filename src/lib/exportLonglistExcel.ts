/**
 * Exportador de Excel para tecnologías del Longlist
 * Genera un informe profesional con todas las tecnologías identificadas
 */

import * as XLSX from 'xlsx';

interface LonglistItem {
  id: string;
  technology_name: string;
  provider?: string | null;
  country?: string | null;
  trl?: number | null;
  type_suggested?: string | null;
  subcategory_suggested?: string | null;
  sector?: string | null;
  applications?: string[] | null;
  brief_description?: string | null;
  ventaja_competitiva?: string | null;
  innovacion?: string | null;
  casos_referencia?: string | null;
  web?: string | null;
  email?: string | null;
  source?: string | null;
  added_at?: string | null;
  paises_actua?: string | null;
  inclusion_reason?: string | null;
}

/**
 * Traduce el código de fuente a texto legible
 */
function getSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case 'database':
      return 'Base de Datos';
    case 'ai_session':
    case 'ai_extracted':
      return 'Búsqueda Web (IA)';
    case 'manual':
      return 'Manual';
    default:
      return 'No especificada';
  }
}

/**
 * Formatea fecha para Excel
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Exporta la lista larga a un archivo Excel
 */
export function exportLonglistToExcel(
  longlist: LonglistItem[],
  studyName: string
): void {
  // Preparar datos para Excel
  const data = longlist.map((item, index) => ({
    '#': index + 1,
    'Nombre': item.technology_name || '',
    'Proveedor': item.provider || '',
    'País Origen': item.country || '',
    'Países Actúa': (item as any).paises_actua || '',
    'TRL': item.trl || '',
    'Tipo': item.type_suggested || '',
    'Subcategoría': item.subcategory_suggested || '',
    'Sector': (item as any).sector || '',
    'Aplicaciones': item.applications?.join(', ') || '',
    'Descripción': item.brief_description || '',
    'Ventaja Competitiva': (item as any).ventaja_competitiva || '',
    'Innovación': (item as any).innovacion || '',
    'Casos Referencia': (item as any).casos_referencia || '',
    'Web': item.web || '',
    'Email': (item as any).email || '',
    'Notas Analista': item.inclusion_reason || '',
    'Fuente': getSourceLabel(item.source),
    'Fecha Añadido': formatDate(item.added_at),
  }));

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar anchos de columna
  const colWidths = [
    { wch: 4 },   // #
    { wch: 35 },  // Nombre
    { wch: 25 },  // Proveedor
    { wch: 15 },  // País Origen
    { wch: 20 },  // Países Actúa
    { wch: 5 },   // TRL
    { wch: 20 },  // Tipo
    { wch: 25 },  // Subcategoría
    { wch: 20 },  // Sector
    { wch: 30 },  // Aplicaciones
    { wch: 50 },  // Descripción
    { wch: 40 },  // Ventaja Competitiva
    { wch: 40 },  // Innovación
    { wch: 30 },  // Casos Referencia
    { wch: 30 },  // Web
    { wch: 25 },  // Email
    { wch: 40 },  // Notas Analista
    { wch: 18 },  // Fuente
    { wch: 12 },  // Fecha Añadido
  ];
  ws['!cols'] = colWidths;

  // Añadir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Lista Larga');

  // Crear hoja de resumen
  const summaryData = [
    { Campo: 'Estudio', Valor: studyName },
    { Campo: 'Total Tecnologías', Valor: longlist.length },
    { Campo: 'Desde Base de Datos', Valor: longlist.filter(i => i.source === 'database').length },
    { Campo: 'Desde Búsqueda Web', Valor: longlist.filter(i => i.source === 'ai_session' || i.source === 'ai_extracted').length },
    { Campo: 'Manuales', Valor: longlist.filter(i => i.source === 'manual').length },
    { Campo: 'Fecha Generación', Valor: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
  ];
  
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // Generar nombre de archivo
  const safeStudyName = studyName
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Longlist_${safeStudyName}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}
