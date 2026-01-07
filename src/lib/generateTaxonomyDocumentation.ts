import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface TaxonomySubcategoria {
  id: number;
  codigo: string;
  nombre: string;
  tipo_id: number | null;
}

interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface TaxonomyStats {
  totalTechnologies: number;
  withTipoId: number;
  withSubcategoriaId: number;
  withSectorId: number;
  sinClasificar: number;
  orphanSubcategorias: string[];
  unmatchedSubcategorias: { subcategoria: string; count: number }[];
}

const createBorderedCell = (text: string, options?: { bold?: boolean; width?: number; shading?: string }) => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: options?.bold ?? false,
            size: 20,
          }),
        ],
      }),
    ],
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options?.shading ? { fill: options.shading } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
};

const createHeaderCell = (text: string, width?: number) => createBorderedCell(text, { bold: true, width, shading: "E8F4FD" });

export async function generateTaxonomyDocumentation(): Promise<void> {
  // Fetch taxonomy data
  const [tiposRes, subcategoriasRes, sectoresRes] = await Promise.all([
    supabase.from('taxonomy_tipos').select('*').order('id'),
    supabase.from('taxonomy_subcategorias').select('*').order('tipo_id, id'),
    supabase.from('taxonomy_sectores').select('*').order('nombre'),
  ]);

  const tipos: TaxonomyTipo[] = tiposRes.data || [];
  const subcategorias: TaxonomySubcategoria[] = subcategoriasRes.data || [];
  const sectores: TaxonomySector[] = sectoresRes.data || [];

  // Fetch statistics
  const { data: techStats } = await supabase
    .from('technologies')
    .select('id, tipo_id, subcategoria_id, sector_id, "Tipo de tecnología", "Subcategoría"');

  const technologies = techStats || [];
  
  const stats: TaxonomyStats = {
    totalTechnologies: technologies.length,
    withTipoId: technologies.filter(t => t.tipo_id !== null).length,
    withSubcategoriaId: technologies.filter(t => t.subcategoria_id !== null).length,
    withSectorId: technologies.filter(t => t.sector_id !== null).length,
    sinClasificar: technologies.filter(t => t["Tipo de tecnología"] === 'Sin clasificar').length,
    orphanSubcategorias: [],
    unmatchedSubcategorias: [],
  };

  // Find unmatched subcategorias (text values that don't match catalog)
  const subcategoriaNombres = new Set(subcategorias.map(s => s.nombre.toLowerCase()));
  const unmatchedMap = new Map<string, number>();
  
  technologies.forEach(t => {
    if (t["Subcategoría"] && t.subcategoria_id === null) {
      const subcat = t["Subcategoría"];
      if (!subcategoriaNombres.has(subcat.toLowerCase())) {
        unmatchedMap.set(subcat, (unmatchedMap.get(subcat) || 0) + 1);
      }
    }
  });

  stats.unmatchedSubcategorias = Array.from(unmatchedMap.entries())
    .map(([subcategoria, count]) => ({ subcategoria, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Group subcategorias by tipo
  const subcategoriasByTipo = new Map<number, TaxonomySubcategoria[]>();
  subcategorias.forEach(s => {
    if (s.tipo_id) {
      if (!subcategoriasByTipo.has(s.tipo_id)) {
        subcategoriasByTipo.set(s.tipo_id, []);
      }
      subcategoriasByTipo.get(s.tipo_id)!.push(s);
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "DOCUMENTO DE TAXONOMÍA",
              bold: true,
              size: 48,
              color: "1E40AF",
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Sistema de Clasificación de Tecnologías del Agua",
              size: 28,
              color: "6B7280",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generado: ${new Date().toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}`,
              size: 20,
              color: "9CA3AF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),

        // Summary Statistics
        new Paragraph({
          children: [new TextRun({ text: "1. RESUMEN ESTADÍSTICO", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Métrica", 60),
                createHeaderCell("Valor", 20),
                createHeaderCell("Porcentaje", 20),
              ],
            }),
            new TableRow({
              children: [
                createBorderedCell("Total de tecnologías en base de datos"),
                createBorderedCell(stats.totalTechnologies.toString()),
                createBorderedCell("100%"),
              ],
            }),
            new TableRow({
              children: [
                createBorderedCell("Con Tipo asignado (tipo_id)"),
                createBorderedCell(stats.withTipoId.toString()),
                createBorderedCell(`${((stats.withTipoId / stats.totalTechnologies) * 100).toFixed(1)}%`),
              ],
            }),
            new TableRow({
              children: [
                createBorderedCell("Con Subcategoría asignada (subcategoria_id)"),
                createBorderedCell(stats.withSubcategoriaId.toString()),
                createBorderedCell(`${((stats.withSubcategoriaId / stats.totalTechnologies) * 100).toFixed(1)}%`),
              ],
            }),
            new TableRow({
              children: [
                createBorderedCell("Con Sector asignado (sector_id)"),
                createBorderedCell(stats.withSectorId.toString()),
                createBorderedCell(`${((stats.withSectorId / stats.totalTechnologies) * 100).toFixed(1)}%`),
              ],
            }),
            new TableRow({
              children: [
                createBorderedCell("Marcadas como 'Sin clasificar'"),
                createBorderedCell(stats.sinClasificar.toString()),
                createBorderedCell(`${((stats.sinClasificar / stats.totalTechnologies) * 100).toFixed(1)}%`),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // Gap Analysis
        new Paragraph({
          children: [new TextRun({ text: "2. ANÁLISIS DE BRECHAS", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `⚠️ ${stats.totalTechnologies - stats.withSubcategoriaId} tecnologías (${(((stats.totalTechnologies - stats.withSubcategoriaId) / stats.totalTechnologies) * 100).toFixed(1)}%) no tienen subcategoría del catálogo asignada.`,
              size: 22,
              color: "D97706",
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `⚠️ ${stats.totalTechnologies - stats.withSectorId} tecnologías (${(((stats.totalTechnologies - stats.withSectorId) / stats.totalTechnologies) * 100).toFixed(1)}%) no tienen sector asignado.`,
              size: 22,
              color: "D97706",
            }),
          ],
          spacing: { after: 200 },
        }),

        // Sectores
        new Paragraph({
          children: [new TextRun({ text: "3. CATÁLOGO DE SECTORES", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                createHeaderCell("ID", 15),
                createHeaderCell("Nombre", 35),
                createHeaderCell("Descripción", 50),
              ],
            }),
            ...sectores.map(sector => new TableRow({
              children: [
                createBorderedCell(sector.id),
                createBorderedCell(sector.nombre),
                createBorderedCell(sector.descripcion || '-'),
              ],
            })),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // Tipos with their Subcategorias
        new Paragraph({
          children: [new TextRun({ text: "4. CATÁLOGO DE TIPOS Y SUBCATEGORÍAS", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        
        ...tipos.flatMap(tipo => {
          const tipoSubcats = subcategoriasByTipo.get(tipo.id) || [];
          return [
            new Paragraph({
              children: [
                new TextRun({ text: `${tipo.codigo} - ${tipo.nombre}`, bold: true, size: 24 }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: tipo.descripcion || 'Sin descripción', size: 20, italics: true, color: "6B7280" }),
              ],
              spacing: { after: 150 },
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    createHeaderCell("ID", 10),
                    createHeaderCell("Código", 20),
                    createHeaderCell("Nombre", 70),
                  ],
                }),
                ...tipoSubcats.map(subcat => new TableRow({
                  children: [
                    createBorderedCell(subcat.id.toString()),
                    createBorderedCell(subcat.codigo),
                    createBorderedCell(subcat.nombre),
                  ],
                })),
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ children: [], spacing: { after: 200 } }),
          ];
        }),

        // Subcategorías no mapeadas
        new Paragraph({
          children: [new TextRun({ text: "5. SUBCATEGORÍAS PENDIENTES DE MAPEO", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Las siguientes subcategorías fueron ingresadas manualmente y no coinciden con el catálogo oficial. Se recomienda revisar y asignar a subcategorías existentes o crear nuevas entradas en el catálogo.",
              size: 20,
              color: "6B7280",
            }),
          ],
          spacing: { after: 200 },
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Subcategoría (texto libre)", 70),
                createHeaderCell("Tecnologías", 15),
                createHeaderCell("Acción sugerida", 15),
              ],
            }),
            ...stats.unmatchedSubcategorias.map(item => new TableRow({
              children: [
                createBorderedCell(item.subcategoria.length > 80 ? item.subcategoria.substring(0, 80) + '...' : item.subcategoria),
                createBorderedCell(item.count.toString()),
                createBorderedCell("Mapear"),
              ],
            })),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // Recommendations
        new Paragraph({
          children: [new TextRun({ text: "6. RECOMENDACIONES", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "6.1 Subcategorías a considerar agregar:", bold: true, size: 22 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: "• Rehabilitación sin zanja (Trenchless) - frecuentemente utilizada\n" +
                  "• IoT y Monitoreo Remoto - alta demanda en clasificación\n" +
                  "• Almacenamiento de Energía (BESS) - categoría emergente\n" +
                  "• Inspección y Diagnóstico de Tuberías - muy frecuente\n" +
                  "• Tratamiento de FOG (Grasas/Aceites) - subcategoría específica\n" +
                  "• Gemelos Digitales - tendencia tecnológica",
            size: 20 
          })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "6.2 Nuevos Tipos a considerar:", bold: true, size: 22 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: "• REU - Reutilización de Agua (actualmente mezclado en TAR)\n" +
                  "• DES - Desalinización (podría separarse de TAP)\n" +
                  "• SOS - Sostenibilidad y Economía Circular",
            size: 20 
          })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "6.3 Acciones prioritarias:", bold: true, size: 22 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: "1. Ejecutar clasificación IA en batch para asignar subcategoria_id a tecnologías existentes\n" +
                  "2. Revisar y homologar subcategorías de texto libre más frecuentes\n" +
                  "3. Agregar sector_id a tecnologías sin sector asignado\n" +
                  "4. Considerar crear subcategorías para casos frecuentes no cubiertos",
            size: 20 
          })],
          spacing: { after: 200 },
        }),

        // Footer
        new Paragraph({
          children: [
            new TextRun({
              text: "────────────────────────────────────────────────────────────",
              color: "D1D5DB",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Documento generado automáticamente por Vandarum TechScout",
              size: 18,
              color: "9CA3AF",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Taxonomia_Vandarum_${new Date().toISOString().split('T')[0]}.docx`);
}
