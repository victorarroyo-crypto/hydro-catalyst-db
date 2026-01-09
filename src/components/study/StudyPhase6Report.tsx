import { useState } from 'react';
import {
  useStudyReports,
  useCreateReport,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Loader2,
  Download,
  Eye,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  BarChart3,
  CheckCircle2,
  FileCheck,
  History,
  Edit,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import {
  VANDARUM_COLORS,
  createVandarumCover,
  createVandarumHeading1,
  createVandarumHeading2,
  createVandarumParagraph,
  createVandarumBullet,
  createSwotLabel,
  createVandarumFooter,
  createVandarumHighlight,
  createVandarumSeparator,
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
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StudyReport | null>(null);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudyReport>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingEvaluations, setIsExportingEvaluations] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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
        // Refrescar la lista de informes
        queryClient.invalidateQueries({ queryKey: ['study-reports', studyId] });
        
        // Seleccionar el nuevo informe
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

  const handleCreateManualReport = async () => {
    if (!newReportTitle.trim()) return;
    
    await createReport.mutateAsync({
      study_id: studyId,
      title: newReportTitle,
      generated_by: 'manual',
    });
    
    setNewReportTitle('');
    setIsCreateOpen(false);
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

  // Helper para obtener nombre de tecnología desde shortlist
  const getTechName = (shortlistId: string) => {
    const shortlistItem = shortlist?.find(s => s.id === shortlistId);
    return shortlistItem?.longlist?.technology_name || 'Tecnología';
  };

  const handleExportReport = async () => {
    if (!selectedReport) return;
    
    setIsExporting(true);
    try {
      const dateStr = format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy", { locale: es });
      
      // Portada Vandarum
      const sections: Paragraph[] = [
        ...createVandarumCover(
          selectedReport.title,
          `Estudio: ${study.name}`,
          dateStr
        ),
      ];

      // Resumen Ejecutivo
      if (selectedReport.executive_summary) {
        sections.push(
          createVandarumHeading1('Resumen Ejecutivo'),
          createVandarumParagraph(selectedReport.executive_summary)
        );
      }

      // Metodología
      if (selectedReport.methodology) {
        sections.push(
          createVandarumHeading1('Metodología'),
          createVandarumParagraph(selectedReport.methodology)
        );
      }

      // Análisis del Problema
      if (selectedReport.problem_analysis) {
        sections.push(
          createVandarumHeading1('Análisis del Problema'),
          createVandarumParagraph(selectedReport.problem_analysis)
        );
      }

      // Panorama de Soluciones
      if (selectedReport.solutions_overview) {
        sections.push(
          createVandarumHeading1('Panorama de Soluciones'),
          createVandarumParagraph(selectedReport.solutions_overview)
        );
      }

      // Comparativa Tecnológica
      if (selectedReport.technology_comparison) {
        sections.push(
          createVandarumHeading1('Comparativa Tecnológica'),
          createVandarumParagraph(selectedReport.technology_comparison)
        );
      }

      // Recomendaciones
      if (selectedReport.recommendations) {
        sections.push(
          createVandarumHeading1('Recomendaciones'),
          createVandarumParagraph(selectedReport.recommendations)
        );
      }

      // Conclusiones
      if (selectedReport.conclusions) {
        sections.push(
          createVandarumHeading1('Conclusiones'),
          createVandarumParagraph(selectedReport.conclusions)
        );
      }

      // Análisis SWOT por Tecnología
      if (evaluations && evaluations.length > 0) {
        sections.push(createVandarumHeading1('Análisis SWOT por Tecnología'));

        for (const evaluation of evaluations) {
          const techName = getTechName(evaluation.shortlist_id);
          
          sections.push(createVandarumHeading2(techName));

          if (evaluation.overall_score) {
            sections.push(createVandarumHighlight('Puntuación General', `${evaluation.overall_score}/10`));
          }

          if (evaluation.recommendation) {
            const recText = evaluation.recommendation === 'highly_recommended' ? 'Muy recomendada' :
                            evaluation.recommendation === 'recommended' ? 'Recomendada' :
                            evaluation.recommendation === 'conditional' ? 'Condicional' : 'No recomendada';
            sections.push(createVandarumHighlight('Recomendación', recText));
          }

          // Fortalezas
          if (evaluation.strengths && evaluation.strengths.length > 0) {
            sections.push(createSwotLabel('strength'));
            for (const s of evaluation.strengths) {
              sections.push(createVandarumBullet(s, VANDARUM_COLORS.verdeClaro));
            }
          }

          // Debilidades
          if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
            sections.push(createSwotLabel('weakness'));
            for (const w of evaluation.weaknesses) {
              sections.push(createVandarumBullet(w, 'cb2431'));
            }
          }

          // Oportunidades
          if (evaluation.opportunities && evaluation.opportunities.length > 0) {
            sections.push(createSwotLabel('opportunity'));
            for (const o of evaluation.opportunities) {
              sections.push(createVandarumBullet(o, VANDARUM_COLORS.azul));
            }
          }

          // Amenazas
          if (evaluation.threats && evaluation.threats.length > 0) {
            sections.push(createSwotLabel('threat'));
            for (const t of evaluation.threats) {
              sections.push(createVandarumBullet(t, VANDARUM_COLORS.naranja));
            }
          }

          // Ventajas competitivas
          if (evaluation.competitive_advantages && evaluation.competitive_advantages.length > 0) {
            sections.push(createVandarumHeading2('Ventajas Competitivas'));
            for (const a of evaluation.competitive_advantages) {
              sections.push(createVandarumBullet(a));
            }
          }

          // Barreras de implementación
          if (evaluation.implementation_barriers && evaluation.implementation_barriers.length > 0) {
            sections.push(createVandarumHeading2('Barreras de Implementación'));
            for (const b of evaluation.implementation_barriers) {
              sections.push(createVandarumBullet(b));
            }
          }

          sections.push(createVandarumSeparator());
        }
      }

      // Footer con copyright Vandarum
      sections.push(...createVandarumFooter(format(new Date(), "d 'de' MMMM yyyy", { locale: es })));

      const doc = new Document({
        sections: [{ children: sections }],
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

  // Descarga rápida de evaluaciones con estilo Vandarum
  const handleExportEvaluationsOnly = async () => {
    setIsExportingEvaluations(true);
    try {
      const dateStr = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
      
      // Portada Vandarum
      const sections: Paragraph[] = [
        ...createVandarumCover(
          'Informe de Evaluación de Tecnologías',
          study.name,
          dateStr
        ),
      ];

      // Comparativa de Tecnologías
      sections.push(createVandarumHeading1('Comparativa de Tecnologías'));

      if (shortlist && shortlist.length > 0) {
        for (const item of shortlist) {
          const evaluation = evaluations?.find(e => e.shortlist_id === item.id);
          const techName = item.longlist?.technology_name || 'Tecnología';
          
          sections.push(createVandarumHeading2(techName));

          if (item.longlist?.provider) {
            sections.push(createVandarumHighlight('Proveedor', item.longlist.provider));
          }

          if (evaluation) {
            if (evaluation.overall_score) {
              sections.push(createVandarumHighlight('Puntuación General', `${evaluation.overall_score}/10`));
            }

            if (evaluation.recommendation) {
              const recText = evaluation.recommendation === 'highly_recommended' ? 'Muy recomendada' :
                              evaluation.recommendation === 'recommended' ? 'Recomendada' :
                              evaluation.recommendation === 'conditional' ? 'Condicional' : 'No recomendada';
              sections.push(createVandarumHighlight('Recomendación', recText));
            }

            // SWOT con colores de marca
            if (evaluation.strengths && evaluation.strengths.length > 0) {
              sections.push(createSwotLabel('strength'));
              for (const s of evaluation.strengths) {
                sections.push(createVandarumBullet(s, VANDARUM_COLORS.verdeClaro));
              }
            }

            if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
              sections.push(createSwotLabel('weakness'));
              for (const w of evaluation.weaknesses) {
                sections.push(createVandarumBullet(w, 'cb2431'));
              }
            }

            if (evaluation.opportunities && evaluation.opportunities.length > 0) {
              sections.push(createSwotLabel('opportunity'));
              for (const o of evaluation.opportunities) {
                sections.push(createVandarumBullet(o, VANDARUM_COLORS.azul));
              }
            }

            if (evaluation.threats && evaluation.threats.length > 0) {
              sections.push(createSwotLabel('threat'));
              for (const t of evaluation.threats) {
                sections.push(createVandarumBullet(t, VANDARUM_COLORS.naranja));
              }
            }
          }

          sections.push(createVandarumSeparator());
        }
      } else {
        sections.push(createVandarumParagraph('No hay tecnologías en la lista corta.'));
      }

      // Footer Vandarum
      sections.push(...createVandarumFooter(dateStr));

      const doc = new Document({
        sections: [{ children: sections }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `Vandarum_Evaluacion_${study.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      saveAs(blob, fileName);

      toast({
        title: 'Evaluaciones exportadas',
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

  return (
    <div className="space-y-6">
      {/* Generate Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generar Informe Final
          </CardTitle>
          <CardDescription>
            La IA genera un informe completo con resumen ejecutivo, análisis comparativo y recomendaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateComprehensiveReport}
              disabled={isGeneratingReport || !hasEnoughData}
              className="flex-1"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar Informe Final
                </>
              )}
            </Button>
            {selectedReport && (
              <Button
                variant="outline"
                onClick={handleExportReport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Informe
                  </>
                )}
              </Button>
            )}
          </div>
          
          <Button
            variant="secondary"
            onClick={handleExportEvaluationsOnly}
            disabled={isExportingEvaluations || !hasEnoughData}
            className="w-full"
          >
            {isExportingEvaluations ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando evaluaciones...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar Evaluaciones Rápidas
              </>
            )}
          </Button>
          
          {!hasEnoughData && (
            <p className="text-sm text-muted-foreground text-center">
              Se requiere al menos 1 tecnología en shortlist y 1 evaluación completa
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data Readiness Check */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Datos Disponibles para el Informe
          </CardTitle>
          <CardDescription>
            Verifica que tienes suficientes datos antes de generar el informe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className={`p-3 rounded-lg border ${stats.researchCount > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Investigación</span>
              </div>
              <p className="text-2xl font-bold">{stats.researchCount}</p>
            </div>
            <div className={`p-3 rounded-lg border ${stats.solutionsCount > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">Soluciones</span>
              </div>
              <p className="text-2xl font-bold">{stats.solutionsCount}</p>
            </div>
            <div className={`p-3 rounded-lg border ${stats.longlistCount > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Lista Larga</span>
              </div>
              <p className="text-2xl font-bold">{stats.longlistCount}</p>
            </div>
            <div className={`p-3 rounded-lg border ${stats.shortlistCount > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Lista Corta</span>
              </div>
              <p className="text-2xl font-bold">{stats.shortlistCount}</p>
            </div>
            <div className={`p-3 rounded-lg border ${completedEvaluations.length > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Evaluaciones</span>
              </div>
              <p className="text-2xl font-bold">{completedEvaluations.length}</p>
            </div>
          </div>
          
          {!hasEnoughData && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Se recomienda tener al menos 1 tecnología en la lista corta y 1 evaluación completa antes de generar el informe.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Informes
                </CardTitle>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Nuevo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Informe Manual</DialogTitle>
                      <DialogDescription>
                        Crea un informe vacío para completar manualmente
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Título del Informe</Label>
                        <Input
                          value={newReportTitle}
                          onChange={(e) => setNewReportTitle(e.target.value)}
                          placeholder="Ej: Informe de Vigilancia Tecnológica - Q1 2024"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateManualReport} 
                        disabled={!newReportTitle.trim() || createReport.isPending}
                        className="w-full"
                      >
                        {createReport.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Crear Informe
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports && reports.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setIsEditing(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                          selectedReport?.id === report.id ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{report.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              v{report.version}
                            </Badge>
                            {report.generated_by === 'ai' && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay informes generados</p>
                  <p className="text-xs mt-1">Usa la IA o crea uno manualmente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {selectedReport ? selectedReport.title : 'Vista Previa del Informe'}
                </CardTitle>
                {selectedReport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportEvaluationsOnly}
                    disabled={isExportingEvaluations || !hasEnoughData}
                  >
                    {isExportingEvaluations ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Descargar Evaluaciones Rápidas
                  </Button>
                )}
              </div>
              {selectedReport && (
                <CardDescription>
                  Versión {selectedReport.version} • Generado: {format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy", { locale: es })}
                  {selectedReport.generated_by === 'ai' && (
                    <Badge variant="secondary" className="ml-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generado por IA
                    </Badge>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedReport ? (
                <Tabs defaultValue="comparison" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="comparison">Comparativa de Tecnologías</TabsTrigger>
                    <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="h-[400px] mt-4">
                    <TabsContent value="comparison" className="m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Comparativa de Tecnologías</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.technology_comparison || ''}
                            onChange={(e) => setEditForm({...editForm, technology_comparison: e.target.value})}
                            rows={10}
                            placeholder="Comparativa detallada de tecnologías..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.technology_comparison || 'No disponible'}
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="evaluations" className="m-0">
                      {evaluations && evaluations.length > 0 ? (
                        <div className="space-y-4">
                          {evaluations.map((evaluation) => (
                            <Card key={evaluation.id} className="border">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">
                                    {getTechName(evaluation.shortlist_id)}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    {evaluation.overall_score && (
                                      <Badge variant="outline" className="text-lg">
                                        {evaluation.overall_score}/10
                                      </Badge>
                                    )}
                                    {evaluation.recommendation && (
                                      <Badge 
                                        variant={
                                          evaluation.recommendation === 'highly_recommended' ? 'default' :
                                          evaluation.recommendation === 'recommended' ? 'secondary' :
                                          evaluation.recommendation === 'conditional' ? 'outline' : 'destructive'
                                        }
                                      >
                                        {evaluation.recommendation === 'highly_recommended' ? 'Muy recomendada' :
                                         evaluation.recommendation === 'recommended' ? 'Recomendada' :
                                         evaluation.recommendation === 'conditional' ? 'Condicional' : 'No recomendada'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-2">
                                {/* Scores */}
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                  {evaluation.trl_score && (
                                    <div className="text-center p-2 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">TRL</p>
                                      <p className="font-bold">{evaluation.trl_score}</p>
                                    </div>
                                  )}
                                  {evaluation.cost_score && (
                                    <div className="text-center p-2 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Coste</p>
                                      <p className="font-bold">{evaluation.cost_score}</p>
                                    </div>
                                  )}
                                  {evaluation.scalability_score && (
                                    <div className="text-center p-2 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Escala</p>
                                      <p className="font-bold">{evaluation.scalability_score}</p>
                                    </div>
                                  )}
                                  {evaluation.context_fit_score && (
                                    <div className="text-center p-2 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Contexto</p>
                                      <p className="font-bold">{evaluation.context_fit_score}</p>
                                    </div>
                                  )}
                                  {evaluation.innovation_potential_score && (
                                    <div className="text-center p-2 bg-muted rounded">
                                      <p className="text-xs text-muted-foreground">Innovación</p>
                                      <p className="font-bold">{evaluation.innovation_potential_score}</p>
                                    </div>
                                  )}
                                </div>

                                {/* SWOT */}
                                <div className="grid grid-cols-2 gap-4">
                                  {evaluation.strengths && evaluation.strengths.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-sm flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Fortalezas
                                      </h5>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {evaluation.strengths.map((s, i) => (
                                          <li key={i}>• {s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-sm flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                                        <TrendingDown className="w-3 h-3" />
                                        Debilidades
                                      </h5>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {evaluation.weaknesses.map((w, i) => (
                                          <li key={i}>• {w}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {evaluation.opportunities && evaluation.opportunities.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                                        <Zap className="w-3 h-3" />
                                        Oportunidades
                                      </h5>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {evaluation.opportunities.map((o, i) => (
                                          <li key={i}>• {o}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {evaluation.threats && evaluation.threats.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-sm flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Amenazas
                                      </h5>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {evaluation.threats.map((t, i) => (
                                          <li key={i}>• {t}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No hay evaluaciones disponibles</p>
                          <p className="text-xs mt-1">Completa las evaluaciones en la Fase 5</p>
                        </div>
                      )}
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Selecciona un informe</p>
                  <p className="text-sm text-center max-w-md">
                    Elige un informe de la lista para ver su contenido, o genera uno nuevo con IA
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
