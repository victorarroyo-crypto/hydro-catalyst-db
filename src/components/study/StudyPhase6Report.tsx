import { useState } from 'react';
import {
  useStudyReports,
  useCreateReport,
  useStudyStats,
  useStudyEvaluations,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Clock,
  BookOpen,
  Target,
  Lightbulb,
  BarChart3,
  CheckCircle2,
  FileCheck,
  History,
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

export default function StudyPhase6Report({ studyId, study }: Props) {
  const { data: reports, isLoading: loadingReports } = useStudyReports(studyId);
  const { data: evaluations } = useStudyEvaluations(studyId);
  const stats = useStudyStats(studyId);
  const createReport = useCreateReport();
  const aiSession = useAIStudySession(studyId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StudyReport | null>(null);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

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

  const completedEvaluations = evaluations?.filter(e => e.recommendation) ?? [];
  const hasEnoughData = stats.shortlistCount >= 1 && completedEvaluations.length >= 1;

  const latestReport = reports?.[0];

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
                        onClick={() => setSelectedReport(report)}
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
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Exportar
                    </Button>
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">Resumen</TabsTrigger>
                    <TabsTrigger value="analysis">Análisis</TabsTrigger>
                    <TabsTrigger value="comparison">Comparativa</TabsTrigger>
                    <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="h-[400px] mt-4">
                    <TabsContent value="summary" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Resumen Ejecutivo</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.executive_summary || 'No disponible'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Metodología</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.methodology || 'No disponible'}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Análisis del Problema</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.problem_analysis || 'No disponible'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Panorama de Soluciones</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.solutions_overview || 'No disponible'}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="comparison" className="m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Comparativa de Tecnologías</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.technology_comparison || 'No disponible'}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="space-y-4 m-0">
                      <div>
                        <h4 className="font-semibold mb-2">Recomendaciones</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.recommendations || 'No disponible'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Conclusiones</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedReport.conclusions || 'No disponible'}
                        </p>
                      </div>
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
