import { useState, useEffect } from 'react';
import {
  useStudyReports,
  useUpdateReport,
  useStudyStats,
  useStudyEvaluations,
  useStudyShortlist,
  ScoutingStudy,
  StudyReport,
} from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  FileText,
  Loader2,
  Download,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  BarChart3,
  CheckCircle2,
  FileCheck,
  Edit,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
  ClipboardList,
  FileBarChart,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Document, Packer, Paragraph, PageBreak, TextRun, ImageRun, Table } from 'docx';
import {
  createVandarumCover,
  createVandarumCoverWithLogo,
  createVandarumHeading1,
  createVandarumHeading2,
  createVandarumParagraph,
  createVandarumBullet,
  createSwotLabel,
  createVandarumFooter,
  createVandarumHighlight,
  createVandarumDocumentFooter,
  createVandarumDocumentHeader,
  createVandarumRichContent,
  createVandarumTechTitle,
  createVandarumSwotBlock,
  createVandarumSeparator,
  createVandarumTableOfContents,
  createVandarumInfoTable,
  createVandarumDescriptionBlock,
  VANDARUM_NUMBERING_CONFIG,
  VANDARUM_COLORS,
  VANDARUM_FONTS,
  VANDARUM_SIZES,
} from '@/lib/vandarumDocStyles';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

export default function StudyPhase6Report({ studyId, study }: Props) {
  const { data: reports, isLoading: loadingReports } = useStudyReports(studyId);
  const { data: evaluations } = useStudyEvaluations(studyId);
  const { data: shortlist } = useStudyShortlist(studyId);
  const stats = useStudyStats(studyId);
  const updateReport = useUpdateReport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedReport, setSelectedReport] = useState<StudyReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudyReport>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingEvaluations, setIsExportingEvaluations] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Auto-select latest report
  useEffect(() => {
    if (reports && reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  const handleGenerateComprehensiveReport = async () => {
    setIsGeneratingReport(true);
    try {
      toast({
        title: 'Generando informe...',
        description: 'Recopilando datos y generando informe con IA. Esto puede tardar unos segundos.',
      });

      const { data, error } = await supabase.functions.invoke('generate-comprehensive-report', {
        body: { study_id: studyId },
      });

      if (error) {
        throw error;
      }

      if (data?.report) {
        queryClient.invalidateQueries({ queryKey: ['study-reports', studyId] });
        setSelectedReport(data.report);
        
        toast({
          title: 'Informe generado',
          description: `Se ha creado el informe final con datos de ${data.stats?.shortlist || 0} tecnologías evaluadas.`,
        });
      }
    } catch (error: any) {
      console.error('Error generando informe:', error);
      toast({
        title: 'Error al generar informe',
        description: error.message || 'No se pudo generar el informe. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleStartEditing = () => {
    if (selectedReport) {
      setEditForm({
        executive_summary: selectedReport.executive_summary || '',
        methodology: selectedReport.methodology || '',
        problem_analysis: selectedReport.problem_analysis || '',
        solutions_overview: selectedReport.solutions_overview || '',
        technology_comparison: selectedReport.technology_comparison || '',
        recommendations: selectedReport.recommendations || '',
        conclusions: selectedReport.conclusions || '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedReport) return;
    
    await updateReport.mutateAsync({
      id: selectedReport.id,
      study_id: studyId,
      ...editForm,
    });
    
    setSelectedReport({ ...selectedReport, ...editForm });
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const getTechName = (shortlistId: string) => {
    const shortlistItem = shortlist?.find(s => s.id === shortlistId);
    return shortlistItem?.longlist?.technology_name || 'Tecnología';
  };

  const getProviderName = (shortlistId: string) => {
    const shortlistItem = shortlist?.find(s => s.id === shortlistId);
    return shortlistItem?.longlist?.provider || '';
  };

  // Normaliza puntuación (77 -> 7.7, 8 -> 8)
  const formatScore = (score: number | null): string => {
    if (!score) return 'N/A';
    const normalizedScore = score > 10 ? score / 10 : score;
    return `${normalizedScore.toFixed(1)}/10`;
  };

  // Interface for translated evaluation data
  interface TranslatedEvaluation {
    id: string;
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
    competitive_advantages?: string[];
    implementation_barriers?: string[];
    was_translated: boolean;
  }

  const handleExportReport = async () => {
    if (!selectedReport) return;
    
    setIsExporting(true);
    try {
      const dateStr = format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy", { locale: es });
      
      // Prepare evaluations for translation (same as handleExportEvaluationsOnly)
      const evalsWithContent = evaluations?.filter(e => 
        (e.strengths && e.strengths.length > 0) ||
        (e.weaknesses && e.weaknesses.length > 0) ||
        (e.opportunities && e.opportunities.length > 0) ||
        (e.threats && e.threats.length > 0)
      ) || [];

      let translationsMap = new Map<string, TranslatedEvaluation>();

      if (evalsWithContent.length > 0) {
        try {
          const evalData = evalsWithContent.map(e => ({
            id: e.id,
            strengths: e.strengths || [],
            weaknesses: e.weaknesses || [],
            opportunities: e.opportunities || [],
            threats: e.threats || [],
            competitive_advantages: e.competitive_advantages || [],
            implementation_barriers: e.implementation_barriers || [],
          }));

          const { data: translationResult, error: translationError } = await supabase.functions.invoke('translate-swot', {
            body: { evaluations: evalData }
          });

          if (!translationError && translationResult?.translations) {
            for (const t of translationResult.translations) {
              translationsMap.set(t.id, t);
            }
          }
        } catch (translateError) {
          console.warn('Translation check failed, using original content:', translateError);
        }
      }
      
      // Construir índice dinámico
      const tocItems: { title: string; isAnnex?: boolean }[] = [];
      if (selectedReport.executive_summary) tocItems.push({ title: 'Resumen Ejecutivo' });
      if (selectedReport.methodology) tocItems.push({ title: 'Metodología' });
      if (selectedReport.problem_analysis) tocItems.push({ title: 'Análisis del Problema' });
      if (selectedReport.solutions_overview) tocItems.push({ title: 'Panorama de Soluciones' });
      if (shortlist && shortlist.length > 0) tocItems.push({ title: 'Comparativa Tecnológica' });
      if (selectedReport.recommendations) tocItems.push({ title: 'Recomendaciones' });
      if (selectedReport.conclusions) tocItems.push({ title: 'Conclusiones' });
      if (shortlist && shortlist.length > 0) tocItems.push({ title: 'ANEXO: Fichas de Tecnologías', isAnnex: true });

      // Cargar logo de Vandarum - mantener proporciones originales
      let logoImageRun: ImageRun | null = null;
      try {
        const logoResponse = await fetch('/vandarum-logo-report.png');
        const logoBlob = await logoResponse.blob();
        const logoArrayBuffer = await logoBlob.arrayBuffer();
        
        // Crear imagen temporal para obtener proporciones originales
        const img = new Image();
        const imgUrl = URL.createObjectURL(logoBlob);
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = imgUrl;
        });
        URL.revokeObjectURL(imgUrl);
        
        // Calcular dimensiones manteniendo aspect ratio
        const maxWidth = 180;
        const aspectRatio = img.width / img.height;
        const width = maxWidth;
        const height = Math.round(maxWidth / aspectRatio);
        
        logoImageRun = new ImageRun({
          data: logoArrayBuffer,
          transformation: {
            width,
            height,
          },
          type: 'png',
        });
      } catch (logoError) {
        console.warn('No se pudo cargar el logo, usando portada de texto:', logoError);
      }

      const sections: (Paragraph | Table)[] = [];
      
      // Portada con logo o sin logo
      if (logoImageRun) {
        sections.push(...createVandarumCoverWithLogo(
          selectedReport.title,
          `Estudio: ${study.name}`,
          dateStr,
          logoImageRun
        ));
      } else {
        sections.push(...createVandarumCover(
          selectedReport.title,
          `Estudio: ${study.name}`,
          dateStr
        ));
      }
      
      // Índice (sin PageBreak al final, lo añadimos nosotros)
      sections.push(...createVandarumTableOfContents(tocItems));

      // Cada sección principal empieza en página nueva
      if (selectedReport.executive_summary) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Resumen Ejecutivo'));
        sections.push(...createVandarumRichContent(selectedReport.executive_summary));
      }

      if (selectedReport.methodology) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Metodología'));
        sections.push(...createVandarumRichContent(selectedReport.methodology));
      }

      if (selectedReport.problem_analysis) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Análisis del Problema'));
        sections.push(...createVandarumRichContent(selectedReport.problem_analysis));
      }

      if (selectedReport.solutions_overview) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Panorama de Soluciones'));
        sections.push(...createVandarumRichContent(selectedReport.solutions_overview));
      }

      // SECCIÓN COMPARATIVA TECNOLÓGICA - Cada tecnología en página nueva
      if (shortlist && shortlist.length > 0) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Comparativa Tecnológica'));
        
        for (const [index, item] of shortlist.entries()) {
          const evaluation = evaluations?.find(e => e.shortlist_id === item.id);
          const techName = item.longlist?.technology_name || 'Tecnología';
          const provider = item.longlist?.provider || '';
          
          // Get translated content if available
          const translation = evaluation ? translationsMap.get(evaluation.id) : undefined;
          
          // Cada tecnología en página nueva (excepto la primera que sigue al título)
          if (index > 0) {
            sections.push(new Paragraph({ children: [new PageBreak()] }));
          }
          
          // Título de tecnología profesional con puntuación y prioridad
          sections.push(...createVandarumTechTitle(
            `${index + 1}. ${techName}`,
            evaluation?.overall_score,
            index + 1
          ));
          
          // Proveedor
          if (provider) {
            sections.push(createVandarumHighlight('Proveedor', provider));
          }
          
          // Recomendación
          if (evaluation?.recommendation) {
            const recText = evaluation.recommendation === 'highly_recommended' ? 'Muy recomendada' :
                            evaluation.recommendation === 'recommended' ? 'Recomendada' :
                            evaluation.recommendation === 'conditional' ? 'Condicional' : 'No recomendada';
            sections.push(createVandarumHighlight('Recomendación', recText));
          }
          
          // Use translated content if available, otherwise use original
          const strengths = translation?.strengths || evaluation?.strengths || [];
          const weaknesses = translation?.weaknesses || evaluation?.weaknesses || [];
          const opportunities = translation?.opportunities || evaluation?.opportunities || [];
          const threats = translation?.threats || evaluation?.threats || [];
          
          // Bloque SWOT profesional
          sections.push(...createVandarumSwotBlock(strengths, weaknesses, opportunities, threats));
        }
      } else if (selectedReport.technology_comparison) {
        // Fallback: usar texto raw si no hay shortlist
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Comparativa Tecnológica'));
        sections.push(...createVandarumRichContent(selectedReport.technology_comparison));
      }

      if (selectedReport.recommendations) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Recomendaciones'));
        sections.push(...createVandarumRichContent(selectedReport.recommendations));
      }

      if (selectedReport.conclusions) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(createVandarumHeading1('Conclusiones'));
        sections.push(...createVandarumRichContent(selectedReport.conclusions));
      }

      // ========== ANEXO: FICHAS DE TECNOLOGÍAS COMPLETAS ==========
      if (shortlist && shortlist.length > 0) {
        // Página solo con título del Anexo
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(new Paragraph({ children: [], spacing: { before: 2000 } }));
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: 'ANEXO',
              bold: true,
              size: 72,
              color: VANDARUM_COLORS.verdeOscuro,
              font: VANDARUM_FONTS.titulo,
            })
          ],
          alignment: 'center' as any,
          spacing: { after: 200 },
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: 'Fichas de Tecnologías',
              bold: true,
              size: VANDARUM_SIZES.titulo,
              color: VANDARUM_COLORS.grisTexto,
              font: VANDARUM_FONTS.titulo,
            })
          ],
          alignment: 'center' as any,
          spacing: { after: 400 },
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: `${shortlist.length} tecnologías de la Lista Corta`,
              size: VANDARUM_SIZES.subtitulo,
              color: VANDARUM_COLORS.grisClaro,
              font: VANDARUM_FONTS.texto,
              italics: true,
            })
          ],
          alignment: 'center' as any,
        }));

        // Cada ficha de tecnología en página nueva con formato Vandarum oficial
        for (const item of shortlist) {
          const tech = item.longlist;
          if (!tech) continue;

          // Cada ficha en página nueva
          sections.push(new Paragraph({ children: [new PageBreak()] }));

          // Nombre de la tecnología con borde inferior (header de página)
          sections.push(new Paragraph({
            children: [
              new TextRun({
                text: tech.technology_name,
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
                style: 'single' as any,
              },
            },
            spacing: { after: 150 },
          }));

          // Línea de contexto: Proveedor + País + TRL
          const contextParts: TextRun[] = [];
          if (tech.provider) {
            contextParts.push(new TextRun({
              text: `Proveedor: ${tech.provider}`,
              bold: true,
              size: VANDARUM_SIZES.texto,
              color: VANDARUM_COLORS.grisTexto,
              font: VANDARUM_FONTS.texto,
            }));
          }
          if (tech.country) {
            if (contextParts.length > 0) contextParts.push(new TextRun({ text: '\n', size: VANDARUM_SIZES.texto }));
            contextParts.push(new TextRun({
              text: `País: ${tech.country}`,
              size: VANDARUM_SIZES.texto,
              color: VANDARUM_COLORS.grisTexto,
              font: VANDARUM_FONTS.texto,
            }));
          }
          if (contextParts.length > 0) {
            sections.push(new Paragraph({
              children: contextParts,
              spacing: { after: 100 },
            }));
          }

          // TRL Badge separado
          if (tech.trl) {
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: `TRL ${tech.trl}`,
                  bold: true,
                  size: VANDARUM_SIZES.texto,
                  color: VANDARUM_COLORS.verdeOscuro,
                  font: VANDARUM_FONTS.titulo,
                })
              ],
              spacing: { after: 300 },
            }));
          }

          // ===== INFORMACIÓN GENERAL - Tabla profesional =====
          sections.push(createVandarumHeading1('INFORMACIÓN GENERAL'));
          
          const generalInfoRows: { label: string; value: string }[] = [
            { label: 'Proveedor / Empresa', value: tech.provider || '' },
            { label: 'País de origen', value: tech.country || '' },
            { label: 'Países donde actúa', value: tech.paises_actua || '' },
            { label: 'Web de la empresa', value: tech.web || '' },
            { label: 'Email de contacto', value: tech.email || '' },
            { label: 'Grado de madurez (TRL)', value: tech.trl ? `TRL ${tech.trl}` : '' },
          ].filter(row => row.value);
          
          if (generalInfoRows.length > 0) {
            sections.push(createVandarumInfoTable(generalInfoRows));
            sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
          }

          // ===== CLASIFICACIÓN - Tabla profesional =====
          const classificationRows: { label: string; value: string }[] = [
            { label: 'Tipo de tecnología', value: tech.type_suggested || '' },
            { label: 'Subcategoría', value: tech.subcategory_suggested || '' },
            { label: 'Sector', value: tech.sector || '' },
            { label: 'Subsector industrial', value: tech.subsector_industrial || '' },
          ].filter(row => row.value);
          
          if (classificationRows.length > 0) {
            sections.push(createVandarumHeading1('CLASIFICACIÓN'));
            sections.push(createVandarumInfoTable(classificationRows));
            sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
          }

          // ===== Aplicación principal =====
          if (tech.applications && tech.applications.length > 0) {
            sections.push(createVandarumHeading1('Aplicación principal'));
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: tech.applications.join('. '),
                  size: VANDARUM_SIZES.texto,
                  color: VANDARUM_COLORS.grisTexto,
                  font: VANDARUM_FONTS.texto,
                })
              ],
              spacing: { after: 200, line: 280 },
            }));
          }

          // ===== DESCRIPCIÓN TÉCNICA =====
          if (tech.brief_description) {
            sections.push(createVandarumHeading1('DESCRIPCIÓN TÉCNICA'));
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: tech.brief_description,
                  size: VANDARUM_SIZES.texto,
                  color: VANDARUM_COLORS.grisTexto,
                  font: VANDARUM_FONTS.texto,
                })
              ],
              spacing: { after: 200, line: 280 },
            }));
          }

          // ===== INNOVACIÓN Y VENTAJAS =====
          if (tech.ventaja_competitiva || tech.innovacion) {
            sections.push(createVandarumHeading1('INNOVACIÓN Y VENTAJAS'));
            
            if (tech.ventaja_competitiva) {
              sections.push(new Paragraph({
                children: [
                  new TextRun({
                    text: 'Ventaja competitiva: ',
                    bold: true,
                    size: VANDARUM_SIZES.texto,
                    color: VANDARUM_COLORS.grisTexto,
                    font: VANDARUM_FONTS.titulo,
                  }),
                  new TextRun({
                    text: tech.ventaja_competitiva,
                    size: VANDARUM_SIZES.texto,
                    color: VANDARUM_COLORS.grisTexto,
                    font: VANDARUM_FONTS.texto,
                  })
                ],
                spacing: { after: 150, line: 280 },
              }));
            }
            
            if (tech.innovacion) {
              sections.push(new Paragraph({
                children: [
                  new TextRun({
                    text: 'Por qué es innovadora: ',
                    bold: true,
                    size: VANDARUM_SIZES.texto,
                    color: VANDARUM_COLORS.grisTexto,
                    font: VANDARUM_FONTS.titulo,
                  }),
                  new TextRun({
                    text: tech.innovacion,
                    size: VANDARUM_SIZES.texto,
                    color: VANDARUM_COLORS.grisTexto,
                    font: VANDARUM_FONTS.texto,
                  })
                ],
                spacing: { after: 200, line: 280 },
              }));
            }
          }

          // ===== REFERENCIAS =====
          if (tech.casos_referencia) {
            sections.push(createVandarumHeading1('REFERENCIAS'));
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: tech.casos_referencia,
                  size: VANDARUM_SIZES.texto,
                  color: VANDARUM_COLORS.grisTexto,
                  font: VANDARUM_FONTS.texto,
                })
              ],
              spacing: { after: 200, line: 280 },
            }));
          }

          // ===== NOTAS DEL ANALISTA =====
          if (tech.inclusion_reason) {
            sections.push(createVandarumHeading1('NOTAS DEL ANALISTA'));
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: tech.inclusion_reason,
                  size: VANDARUM_SIZES.texto,
                  color: VANDARUM_COLORS.grisTexto,
                  font: VANDARUM_FONTS.texto,
                })
              ],
              spacing: { after: 200, line: 280 },
            }));
          }

          // ===== INFORMACIÓN DE REGISTRO - Tabla profesional =====
          const sourceLabel = tech.source === 'database' ? 'Base de Datos' : 
            tech.source === 'ai_session' || tech.source === 'ai_extracted' ? 'Búsqueda Web (IA)' : 
            tech.source === 'manual' ? 'Entrada Manual' : 
            tech.source === 'chrome_extension' ? 'Extensión Chrome' : 'No especificada';
          
          const registroRows: { label: string; value: string }[] = [
            { label: 'Estudio', value: study.name },
            { label: 'Procedencia', value: sourceLabel },
            { label: 'Fecha de adición', value: tech.added_at ? new Date(tech.added_at).toLocaleDateString('es-ES') : '' },
          ].filter(row => row.value);
          
          if (item.selection_reason) {
            registroRows.push({ label: 'Razón de selección', value: item.selection_reason });
          }
          
          sections.push(createVandarumHeading1('INFORMACIÓN DE REGISTRO'));
          sections.push(createVandarumInfoTable(registroRows));
        }
      }

      sections.push(...createVandarumFooter(format(new Date(), "d 'de' MMMM yyyy", { locale: es })));

      const doc = new Document({
        numbering: VANDARUM_NUMBERING_CONFIG,
        sections: [{
          properties: {},
          headers: {
            default: createVandarumDocumentHeader(study.name),
          },
          footers: {
            default: createVandarumDocumentFooter(),
          },
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `Vandarum_${selectedReport.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${selectedReport.version}.docx`;
      saveAs(blob, fileName);

      toast({
        title: 'Informe exportado',
        description: `El archivo ${fileName} se ha descargado correctamente`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Error al exportar',
        description: 'No se pudo generar el archivo Word',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEvaluationsOnly = async () => {
    setIsExportingEvaluations(true);
    try {
      const dateStr = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
      
      // Show initial toast
      toast({
        title: 'Preparando fichas...',
        description: 'Verificando idioma del contenido...',
      });

      // Prepare evaluations data for translation check
      const evalsWithContent = evaluations?.filter(e => 
        (e.strengths && e.strengths.length > 0) ||
        (e.weaknesses && e.weaknesses.length > 0) ||
        (e.opportunities && e.opportunities.length > 0) ||
        (e.threats && e.threats.length > 0)
      ) || [];

      // Create translation map
      let translationsMap = new Map<string, TranslatedEvaluation>();

      // If there are evaluations with content, check if translation is needed
      if (evalsWithContent.length > 0) {
        try {
          const evalData = evalsWithContent.map(e => ({
            id: e.id,
            strengths: e.strengths || [],
            weaknesses: e.weaknesses || [],
            opportunities: e.opportunities || [],
            threats: e.threats || [],
            competitive_advantages: e.competitive_advantages || [],
            implementation_barriers: e.implementation_barriers || [],
          }));

          const { data: translationResult, error: translationError } = await supabase.functions.invoke('translate-swot', {
            body: { evaluations: evalData }
          });

          if (!translationError && translationResult?.translations) {
            // Check if translation was applied
            const wasTranslated = translationResult.translations.some((t: TranslatedEvaluation) => t.was_translated);
            
            if (wasTranslated) {
              toast({
                title: 'Contenido traducido',
                description: 'El análisis SWOT ha sido traducido al español',
              });
            }

            // Create map from translations
            for (const t of translationResult.translations) {
              translationsMap.set(t.id, t);
            }
          }
        } catch (translateError) {
          console.warn('Translation check failed, using original content:', translateError);
        }
      }

      const sections: Paragraph[] = [
        ...createVandarumCover(
          'Fichas de Evaluación de Tecnologías',
          study.name,
          dateStr
        ),
      ];

      sections.push(createVandarumHeading1('Fichas de Evaluación'));

      if (shortlist && shortlist.length > 0) {
        for (const item of shortlist) {
          const evaluation = evaluations?.find(e => e.shortlist_id === item.id);
          const techName = item.longlist?.technology_name || 'Tecnología';
          
          // Get translated content if available
          const translation = evaluation ? translationsMap.get(evaluation.id) : undefined;
          
          sections.push(createVandarumHeading2(techName));

          if (item.longlist?.provider) {
            sections.push(createVandarumHighlight('Proveedor', item.longlist.provider));
          }

          if (evaluation) {
            if (evaluation.overall_score) {
              sections.push(createVandarumHighlight('Puntuación General', formatScore(evaluation.overall_score)));
            }

            if (evaluation.recommendation) {
              const recText = evaluation.recommendation === 'highly_recommended' ? 'Muy recomendada' :
                              evaluation.recommendation === 'recommended' ? 'Recomendada' :
                              evaluation.recommendation === 'conditional' ? 'Condicional' : 'No recomendada';
              sections.push(createVandarumHighlight('Recomendación', recText));
            }

            // Use translated content if available, otherwise use original
            const strengths = translation?.strengths || evaluation.strengths;
            const weaknesses = translation?.weaknesses || evaluation.weaknesses;
            const opportunities = translation?.opportunities || evaluation.opportunities;
            const threats = translation?.threats || evaluation.threats;
            const competitiveAdvantages = translation?.competitive_advantages || evaluation.competitive_advantages;
            const implementationBarriers = translation?.implementation_barriers || evaluation.implementation_barriers;

            if (strengths && strengths.length > 0) {
              sections.push(createSwotLabel('strength'));
              for (const s of strengths) {
                sections.push(createVandarumBullet(s));
              }
            }

            if (weaknesses && weaknesses.length > 0) {
              sections.push(createSwotLabel('weakness'));
              for (const w of weaknesses) {
                sections.push(createVandarumBullet(w));
              }
            }

            if (opportunities && opportunities.length > 0) {
              sections.push(createSwotLabel('opportunity'));
              for (const o of opportunities) {
                sections.push(createVandarumBullet(o));
              }
            }

            if (threats && threats.length > 0) {
              sections.push(createSwotLabel('threat'));
              for (const t of threats) {
                sections.push(createVandarumBullet(t));
              }
            }

            if (competitiveAdvantages && competitiveAdvantages.length > 0) {
              sections.push(createVandarumHeading2('Ventajas Competitivas'));
              for (const a of competitiveAdvantages) {
                sections.push(createVandarumBullet(a));
              }
            }

            if (implementationBarriers && implementationBarriers.length > 0) {
              sections.push(createVandarumHeading2('Barreras de Implementación'));
              for (const b of implementationBarriers) {
                sections.push(createVandarumBullet(b));
              }
            }
          }

          // Salto de página entre tecnologías (excepto la última)
          if (shortlist && shortlist.indexOf(item) < shortlist.length - 1) {
            sections.push(createVandarumSeparator());
          }
        }
      } else {
        sections.push(createVandarumParagraph('No hay tecnologías en la lista corta.'));
      }

      sections.push(...createVandarumFooter(dateStr));

      const doc = new Document({
        numbering: VANDARUM_NUMBERING_CONFIG,
        sections: [{
          properties: {},
          headers: {
            default: createVandarumDocumentHeader(study.name),
          },
          footers: {
            default: createVandarumDocumentFooter(),
          },
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `Vandarum_Fichas_Evaluacion_${study.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      saveAs(blob, fileName);

      toast({
        title: 'Fichas exportadas',
        description: `El archivo ${fileName} se ha descargado correctamente`,
      });
    } catch (error) {
      console.error('Error exporting evaluations:', error);
      toast({
        title: 'Error al exportar',
        description: 'No se pudo generar el archivo Word',
        variant: 'destructive',
      });
    } finally {
      setIsExportingEvaluations(false);
    }
  };

  const completedEvaluations = evaluations?.filter(e => e.recommendation) ?? [];
  const hasEnoughData = stats.shortlistCount >= 1 && completedEvaluations.length >= 1;

  const getRecommendationBadge = (recommendation: string | null) => {
    if (!recommendation) return null;
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      highly_recommended: { variant: 'default', label: 'Muy recomendada' },
      recommended: { variant: 'secondary', label: 'Recomendada' },
      conditional: { variant: 'outline', label: 'Condicional' },
      not_recommended: { variant: 'destructive', label: 'No recomendada' },
    };
    const config = variants[recommendation] || { variant: 'outline', label: recommendation };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* ============================================== */}
      {/* BLOQUE 1: INFORME FINAL */}
      {/* ============================================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileBarChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Informe Final</CardTitle>
                <CardDescription>
                  Documento narrativo con análisis completo del estudio
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {reports && reports.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExportReport}
                  disabled={isExporting || !selectedReport}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Descargar Informe
                </Button>
              )}
              <Button
                onClick={handleGenerateComprehensiveReport}
                disabled={isGeneratingReport || !hasEnoughData}
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {reports && reports.length > 0 ? 'Regenerar' : 'Generar con IA'}
                  </>
                )}
              </Button>
            </div>
          </div>
          {!hasEnoughData && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Se requiere al menos 1 tecnología en shortlist y 1 evaluación completa
            </p>
          )}
          {selectedReport && (
            <p className="text-sm text-muted-foreground mt-2">
              Última versión: v{selectedReport.version} • {format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* ============================================== */}
      {/* BLOQUE 2: FICHAS DE EVALUACIÓN */}
      {/* ============================================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Fichas de Evaluación</CardTitle>
                <CardDescription>
                  Resumen SWOT y puntuaciones de las tecnologías evaluadas
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExportEvaluationsOnly}
              disabled={isExportingEvaluations || completedEvaluations.length === 0}
            >
              {isExportingEvaluations ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Descargar Fichas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {completedEvaluations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {evaluations?.map((evaluation) => {
                const techName = getTechName(evaluation.shortlist_id);
                const provider = getProviderName(evaluation.shortlist_id);
                
                return (
                  <Card key={evaluation.id} className="border hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{techName}</CardTitle>
                          {provider && (
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3" />
                              {provider}
                            </CardDescription>
                          )}
                        </div>
                        {evaluation.overall_score && (
                          <div className="flex flex-col items-center bg-primary/10 px-3 py-1 rounded-lg">
                            <span className="text-2xl font-bold text-primary">{evaluation.overall_score}</span>
                            <span className="text-[10px] text-muted-foreground">/10</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        {getRecommendationBadge(evaluation.recommendation)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="swot" className="border-none">
                          <AccordionTrigger className="py-2 text-sm hover:no-underline">
                            <span className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Ver análisis SWOT
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {evaluation.strengths && evaluation.strengths.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <TrendingUp className="w-3 h-3" />
                                    Fortalezas
                                  </h5>
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {evaluation.strengths.slice(0, 3).map((s, i) => (
                                      <li key={i} className="truncate">• {s}</li>
                                    ))}
                                    {evaluation.strengths.length > 3 && (
                                      <li className="text-primary">+{evaluation.strengths.length - 3} más</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-xs flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <TrendingDown className="w-3 h-3" />
                                    Debilidades
                                  </h5>
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {evaluation.weaknesses.slice(0, 3).map((w, i) => (
                                      <li key={i} className="truncate">• {w}</li>
                                    ))}
                                    {evaluation.weaknesses.length > 3 && (
                                      <li className="text-primary">+{evaluation.weaknesses.length - 3} más</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {evaluation.opportunities && evaluation.opportunities.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                    <Zap className="w-3 h-3" />
                                    Oportunidades
                                  </h5>
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {evaluation.opportunities.slice(0, 3).map((o, i) => (
                                      <li key={i} className="truncate">• {o}</li>
                                    ))}
                                    {evaluation.opportunities.length > 3 && (
                                      <li className="text-primary">+{evaluation.opportunities.length - 3} más</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {evaluation.threats && evaluation.threats.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="w-3 h-3" />
                                    Amenazas
                                  </h5>
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {evaluation.threats.slice(0, 3).map((t, i) => (
                                      <li key={i} className="truncate">• {t}</li>
                                    ))}
                                    {evaluation.threats.length > 3 && (
                                      <li className="text-primary">+{evaluation.threats.length - 3} más</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {/* Puntuaciones detalladas */}
                            <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t">
                              {evaluation.trl_score && (
                                <div className="text-center p-1.5 bg-muted rounded">
                                  <p className="text-[10px] text-muted-foreground">TRL</p>
                                  <p className="font-bold text-sm">{evaluation.trl_score}</p>
                                </div>
                              )}
                              {evaluation.cost_score && (
                                <div className="text-center p-1.5 bg-muted rounded">
                                  <p className="text-[10px] text-muted-foreground">Coste</p>
                                  <p className="font-bold text-sm">{evaluation.cost_score}</p>
                                </div>
                              )}
                              {evaluation.scalability_score && (
                                <div className="text-center p-1.5 bg-muted rounded">
                                  <p className="text-[10px] text-muted-foreground">Escala</p>
                                  <p className="font-bold text-sm">{evaluation.scalability_score}</p>
                                </div>
                              )}
                              {evaluation.context_fit_score && (
                                <div className="text-center p-1.5 bg-muted rounded">
                                  <p className="text-[10px] text-muted-foreground">Contexto</p>
                                  <p className="font-bold text-sm">{evaluation.context_fit_score}</p>
                                </div>
                              )}
                              {evaluation.innovation_potential_score && (
                                <div className="text-center p-1.5 bg-muted rounded">
                                  <p className="text-[10px] text-muted-foreground">Innovación</p>
                                  <p className="font-bold text-sm">{evaluation.innovation_potential_score}</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium mb-1">No hay evaluaciones completadas</p>
              <p className="text-sm text-center max-w-md">
                Completa las evaluaciones SWOT en la Fase 5 para ver las fichas aquí
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
