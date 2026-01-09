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
import { useAIStudySession } from '@/hooks/useAIStudySession';
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
import AISessionPanel from './AISessionPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

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
  const aiSession = useAIStudySession(studyId, 'report');
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StudyReport | null>(null);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudyReport>>({});
  const [isExporting, setIsExporting] = useState(false);

  const handleStartAIReport = () => {
    aiSession.startSession('report', {
      problem_statement: study.problem_statement,
      objectives: study.objectives,
      context: study.context,
      constraints: study.constraints,
      include_evaluations: true,
      include_recommendations: true,
    });
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
      const sections: Paragraph[] = [
        // Título
        new Paragraph({
          children: [new TextRun({ text: selectedReport.title, bold: true, size: 32 })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Estudio: ${study.name}`, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generado: ${format(new Date(selectedReport.created_at), "d 'de' MMMM yyyy", { locale: es })}` })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
      ];

      // Resumen Ejecutivo
      if (selectedReport.executive_summary) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Resumen Ejecutivo', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.executive_summary })], spacing: { after: 200 } })
        );
      }

      // Metodología
      if (selectedReport.methodology) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Metodología', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.methodology })], spacing: { after: 200 } })
        );
      }

      // Análisis del Problema
      if (selectedReport.problem_analysis) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Análisis del Problema', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.problem_analysis })], spacing: { after: 200 } })
        );
      }

      // Panorama de Soluciones
      if (selectedReport.solutions_overview) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Panorama de Soluciones', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.solutions_overview })], spacing: { after: 200 } })
        );
      }

      // Comparativa Tecnológica
      if (selectedReport.technology_comparison) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Comparativa Tecnológica', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.technology_comparison })], spacing: { after: 200 } })
        );
      }

      // Recomendaciones
      if (selectedReport.recommendations) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Recomendaciones', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.recommendations })], spacing: { after: 200 } })
        );
      }

      // Conclusiones
      if (selectedReport.conclusions) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Conclusiones', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: selectedReport.conclusions })], spacing: { after: 200 } })
        );
      }

      // Análisis SWOT por Tecnología (desde evaluaciones)
      if (evaluations && evaluations.length > 0) {
        sections.push(
          new Paragraph({ children: [new TextRun({ text: 'Análisis SWOT por Tecnología', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
        );

        for (const evaluation of evaluations) {
          const techName = getTechName(evaluation.shortlist_id);
          
          // Nombre de la tecnología
          sections.push(
            new Paragraph({ 
              children: [new TextRun({ text: techName, bold: true, size: 24 })], 
              heading: HeadingLevel.HEADING_2, 
              spacing: { before: 300, after: 150 } 
            })
          );

          // Puntuación general
          if (evaluation.overall_score) {
            sections.push(
              new Paragraph({ 
                children: [new TextRun({ text: `Puntuación General: ${evaluation.overall_score}/100`, bold: true })], 
                spacing: { after: 100 } 
              })
            );
          }

          // Recomendación
          if (evaluation.recommendation) {
            sections.push(
              new Paragraph({ 
                children: [
                  new TextRun({ text: 'Recomendación: ', bold: true }),
                  new TextRun({ text: evaluation.recommendation })
                ], 
                spacing: { after: 100 } 
              })
            );
          }

          // Fortalezas
          if (evaluation.strengths && evaluation.strengths.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Fortalezas:', bold: true, color: '22863a' })], spacing: { before: 150, after: 50 } })
            );
            for (const strength of evaluation.strengths) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${strength}` })], spacing: { after: 50 } })
              );
            }
          }

          // Debilidades
          if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Debilidades:', bold: true, color: 'cb2431' })], spacing: { before: 150, after: 50 } })
            );
            for (const weakness of evaluation.weaknesses) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${weakness}` })], spacing: { after: 50 } })
              );
            }
          }

          // Oportunidades
          if (evaluation.opportunities && evaluation.opportunities.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Oportunidades:', bold: true, color: '0366d6' })], spacing: { before: 150, after: 50 } })
            );
            for (const opportunity of evaluation.opportunities) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${opportunity}` })], spacing: { after: 50 } })
              );
            }
          }

          // Amenazas
          if (evaluation.threats && evaluation.threats.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Amenazas:', bold: true, color: 'e36209' })], spacing: { before: 150, after: 50 } })
            );
            for (const threat of evaluation.threats) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${threat}` })], spacing: { after: 50 } })
              );
            }
          }

          // Ventajas competitivas
          if (evaluation.competitive_advantages && evaluation.competitive_advantages.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Ventajas Competitivas:', bold: true })], spacing: { before: 150, after: 50 } })
            );
            for (const advantage of evaluation.competitive_advantages) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${advantage}` })], spacing: { after: 50 } })
              );
            }
          }

          // Barreras de implementación
          if (evaluation.implementation_barriers && evaluation.implementation_barriers.length > 0) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: 'Barreras de Implementación:', bold: true })], spacing: { before: 150, after: 50 } })
            );
            for (const barrier of evaluation.implementation_barriers) {
              sections.push(
                new Paragraph({ children: [new TextRun({ text: `• ${barrier}` })], spacing: { after: 50 } })
              );
            }
          }

          // Separador entre tecnologías
          sections.push(
            new Paragraph({ children: [], spacing: { after: 200 } })
          );
        }
      }

      const doc = new Document({
        sections: [{ children: sections }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${selectedReport.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${selectedReport.version}.docx`;
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

  const completedEvaluations = evaluations?.filter(e => e.recommendation) ?? [];
  const hasEnoughData = stats.shortlistCount >= 1 && completedEvaluations.length >= 1;

  return (
    <div className="space-y-6">
      {/* AI Session Panel */}
      <AISessionPanel
        state={{
          isActive: aiSession.isActive,
          isStarting: aiSession.isStarting,
          currentPhase: aiSession.currentPhase,
          progress: aiSession.progress,
          status: aiSession.status,
          error: aiSession.error,
          logs: aiSession.logs,
        }}
        onStart={handleStartAIReport}
        onCancel={aiSession.cancelSession}
        isStarting={aiSession.isStarting}
        title="Generación Automática de Informe"
        description="La IA genera un informe completo con resumen ejecutivo, análisis y recomendaciones"
      />

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
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleCancelEditing}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleSaveEdits}
                          disabled={updateReport.isPending}
                        >
                          {updateReport.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          Guardar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleStartEditing}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleExportReport}
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-1" />
                          )}
                          Exportar
                        </Button>
                      </>
                    )}
                  </div>
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
                <Tabs defaultValue="summary" className="h-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="summary">Resumen</TabsTrigger>
                    <TabsTrigger value="analysis">Análisis</TabsTrigger>
                    <TabsTrigger value="comparison">Comparativa</TabsTrigger>
                    <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
                    <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="h-[400px] mt-4">
                    <TabsContent value="summary" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Resumen Ejecutivo</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.executive_summary || ''}
                            onChange={(e) => setEditForm({...editForm, executive_summary: e.target.value})}
                            rows={6}
                            placeholder="Resumen ejecutivo del estudio..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.executive_summary || 'No disponible'}
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Metodología</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.methodology || ''}
                            onChange={(e) => setEditForm({...editForm, methodology: e.target.value})}
                            rows={4}
                            placeholder="Metodología utilizada..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.methodology || 'No disponible'}
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Análisis del Problema</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.problem_analysis || ''}
                            onChange={(e) => setEditForm({...editForm, problem_analysis: e.target.value})}
                            rows={6}
                            placeholder="Análisis detallado del problema..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.problem_analysis || 'No disponible'}
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Panorama de Soluciones</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.solutions_overview || ''}
                            onChange={(e) => setEditForm({...editForm, solutions_overview: e.target.value})}
                            rows={6}
                            placeholder="Panorama de las soluciones identificadas..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.solutions_overview || 'No disponible'}
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    
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
                    
                    <TabsContent value="recommendations" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Recomendaciones</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.recommendations || ''}
                            onChange={(e) => setEditForm({...editForm, recommendations: e.target.value})}
                            rows={6}
                            placeholder="Recomendaciones del estudio..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.recommendations || 'No disponible'}
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Conclusiones</h4>
                        {isEditing ? (
                          <Textarea
                            value={editForm.conclusions || ''}
                            onChange={(e) => setEditForm({...editForm, conclusions: e.target.value})}
                            rows={4}
                            placeholder="Conclusiones finales..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedReport.conclusions || 'No disponible'}
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
