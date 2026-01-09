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
import { Document, Packer, Paragraph } from 'docx';
import {
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

  const handleExportReport = async () => {
    if (!selectedReport) return;
    
    setIsExporting(true);
    try {
      const dateStr = format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy", { locale: es });
      
      const sections: Paragraph[] = [
        ...createVandarumCover(
          selectedReport.title,
          `Estudio: ${study.name}`,
          dateStr
        ),
      ];

      if (selectedReport.executive_summary) {
        sections.push(
          createVandarumHeading1('Resumen Ejecutivo'),
          createVandarumParagraph(selectedReport.executive_summary)
        );
      }

      if (selectedReport.methodology) {
        sections.push(
          createVandarumHeading1('Metodología'),
          createVandarumParagraph(selectedReport.methodology)
        );
      }

      if (selectedReport.problem_analysis) {
        sections.push(
          createVandarumHeading1('Análisis del Problema'),
          createVandarumParagraph(selectedReport.problem_analysis)
        );
      }

      if (selectedReport.solutions_overview) {
        sections.push(
          createVandarumHeading1('Panorama de Soluciones'),
          createVandarumParagraph(selectedReport.solutions_overview)
        );
      }

      if (selectedReport.technology_comparison) {
        sections.push(
          createVandarumHeading1('Comparativa Tecnológica'),
          createVandarumParagraph(selectedReport.technology_comparison)
        );
      }

      if (selectedReport.recommendations) {
        sections.push(
          createVandarumHeading1('Recomendaciones'),
          createVandarumParagraph(selectedReport.recommendations)
        );
      }

      if (selectedReport.conclusions) {
        sections.push(
          createVandarumHeading1('Conclusiones'),
          createVandarumParagraph(selectedReport.conclusions)
        );
      }

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

  const handleExportEvaluationsOnly = async () => {
    setIsExportingEvaluations(true);
    try {
      const dateStr = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
      
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

            if (evaluation.strengths && evaluation.strengths.length > 0) {
              sections.push(createSwotLabel('strength'));
              for (const s of evaluation.strengths) {
                sections.push(createVandarumBullet(s));
              }
            }

            if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
              sections.push(createSwotLabel('weakness'));
              for (const w of evaluation.weaknesses) {
                sections.push(createVandarumBullet(w));
              }
            }

            if (evaluation.opportunities && evaluation.opportunities.length > 0) {
              sections.push(createSwotLabel('opportunity'));
              for (const o of evaluation.opportunities) {
                sections.push(createVandarumBullet(o));
              }
            }

            if (evaluation.threats && evaluation.threats.length > 0) {
              sections.push(createSwotLabel('threat'));
              for (const t of evaluation.threats) {
                sections.push(createVandarumBullet(t));
              }
            }

            if (evaluation.competitive_advantages && evaluation.competitive_advantages.length > 0) {
              sections.push(createVandarumHeading2('Ventajas Competitivas'));
              for (const a of evaluation.competitive_advantages) {
                sections.push(createVandarumBullet(a));
              }
            }

            if (evaluation.implementation_barriers && evaluation.implementation_barriers.length > 0) {
              sections.push(createVandarumHeading2('Barreras de Implementación'));
              for (const b of evaluation.implementation_barriers) {
                sections.push(createVandarumBullet(b));
              }
            }
          }

          sections.push(createVandarumSeparator());
        }
      } else {
        sections.push(createVandarumParagraph('No hay tecnologías en la lista corta.'));
      }

      sections.push(...createVandarumFooter(dateStr));

      const doc = new Document({
        sections: [{ children: sections }],
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
        </CardHeader>
        <CardContent>
          {!hasEnoughData && (
            <div className="text-center py-4 text-amber-600 dark:text-amber-400 text-sm mb-4">
              ⚠️ Se requiere al menos 1 tecnología en shortlist y 1 evaluación completa
            </div>
          )}

          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedReport ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    v{selectedReport.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdits}>
                      <Save className="w-4 h-4 mr-1" />
                      Guardar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleStartEditing}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Resumen Ejecutivo */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Resumen Ejecutivo
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.executive_summary || ''}
                        onChange={(e) => setEditForm({...editForm, executive_summary: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.executive_summary || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Metodología */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4" />
                      Metodología
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.methodology || ''}
                        onChange={(e) => setEditForm({...editForm, methodology: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.methodology || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Análisis del Problema */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" />
                      Análisis del Problema
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.problem_analysis || ''}
                        onChange={(e) => setEditForm({...editForm, problem_analysis: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.problem_analysis || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Panorama de Soluciones */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4" />
                      Panorama de Soluciones
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.solutions_overview || ''}
                        onChange={(e) => setEditForm({...editForm, solutions_overview: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.solutions_overview || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Comparativa Tecnológica */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4" />
                      Comparativa Tecnológica
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.technology_comparison || ''}
                        onChange={(e) => setEditForm({...editForm, technology_comparison: e.target.value})}
                        rows={6}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.technology_comparison || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Recomendaciones */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Recomendaciones
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.recommendations || ''}
                        onChange={(e) => setEditForm({...editForm, recommendations: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.recommendations || 'No disponible'}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Conclusiones */}
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                      <FileCheck className="w-4 h-4" />
                      Conclusiones
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editForm.conclusions || ''}
                        onChange={(e) => setEditForm({...editForm, conclusions: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.conclusions || 'No disponible'}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Sin informe generado</p>
              <p className="text-sm text-center max-w-md">
                Genera un informe con IA para ver el análisis completo del estudio
              </p>
            </div>
          )}
        </CardContent>
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
