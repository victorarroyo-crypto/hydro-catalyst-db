import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useScoutingStudy,
  useUpdateStudy,
  useStudyStats,
} from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  BookOpen,
  Lightbulb,
  List,
  Star,
  BarChart3,
  FileText,
  Settings,
  Play,
  CheckCircle2,
  Archive,
  Loader2,
  Save,
  ChevronRight,
} from 'lucide-react';
import StudyPhase1Research from '@/components/study/StudyPhase1Research';
import StudyPhase2Solutions from '@/components/study/StudyPhase2Solutions';
import StudyPhase3Longlist from '@/components/study/StudyPhase3Longlist';
import StudyPhase4Shortlist from '@/components/study/StudyPhase4Shortlist';
import StudyPhase5Evaluation from '@/components/study/StudyPhase5Evaluation';

const PHASES = [
  { number: 1, name: 'Investigación', icon: BookOpen, description: 'Búsqueda bibliográfica y caracterización del problema' },
  { number: 2, name: 'Soluciones', icon: Lightbulb, description: 'Propuestas de soluciones genéricas' },
  { number: 3, name: 'Lista Larga', icon: List, description: 'Selección manual de tecnologías candidatas' },
  { number: 4, name: 'Lista Corta', icon: Star, description: 'Refinamiento y priorización de tecnologías' },
  { number: 5, name: 'Evaluación', icon: BarChart3, description: 'Análisis comparativo e informe final' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', icon: FileText },
  { value: 'in_progress', label: 'En Progreso', icon: Play },
  { value: 'completed', label: 'Completado', icon: CheckCircle2 },
  { value: 'archived', label: 'Archivado', icon: Archive },
];

export default function StudyDetail() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { data: study, isLoading } = useScoutingStudy(studyId);
  const updateStudy = useUpdateStudy();
  const stats = useStudyStats(studyId);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    problem_statement: '',
    context: '',
    objectives: [] as string[],
    constraints: [] as string[],
  });

  const handleStartEdit = () => {
    if (study) {
      setEditForm({
        name: study.name,
        description: study.description || '',
        problem_statement: study.problem_statement || '',
        context: study.context || '',
        objectives: study.objectives || [],
        constraints: study.constraints || [],
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!study) return;
    await updateStudy.mutateAsync({ id: study.id, ...editForm });
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!study) return;
    await updateStudy.mutateAsync({ 
      id: study.id, 
      status: newStatus as any,
      started_at: newStatus === 'in_progress' && !study.started_at ? new Date().toISOString() : study.started_at,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const handlePhaseChange = async (newPhase: number) => {
    if (!study) return;
    await updateStudy.mutateAsync({ id: study.id, current_phase: newPhase });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Estudio no encontrado</h2>
        <Button asChild variant="outline">
          <Link to="/studies">Volver a Estudios</Link>
        </Button>
      </div>
    );
  }

  const currentPhase = PHASES[study.current_phase - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/studies">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{study.name}</h1>
            {study.description && (
              <p className="text-muted-foreground mt-1">{study.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={study.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Phase Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {PHASES.map((phase, idx) => {
              const isComplete = study.current_phase > phase.number;
              const isCurrent = study.current_phase === phase.number;
              const PhaseIcon = phase.icon;
              
              return (
                <div key={phase.number} className="flex items-center flex-1">
                  <button
                    onClick={() => handlePhaseChange(phase.number)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : isComplete 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <PhaseIcon className="w-4 h-4" />
                    <span className="font-medium hidden sm:inline">{phase.name}</span>
                    <span className="font-medium sm:hidden">{phase.number}</span>
                  </button>
                  {idx < PHASES.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="phase1" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Investigación</span>
            {stats.researchCount > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.researchCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="phase2" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Soluciones</span>
            {stats.solutionsCount > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.solutionsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="phase3" className="gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista Larga</span>
            {stats.longlistCount > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.longlistCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="phase4" className="gap-2">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Lista Corta</span>
            {stats.shortlistCount > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.shortlistCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="phase5" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Evaluación</span>
            {stats.completedEvaluations > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.completedEvaluations}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Informe</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Definición del Estudio</CardTitle>
                  <CardDescription>Problema, contexto y objetivos</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={handleStartEdit}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={updateStudy.isPending}>
                      {updateStudy.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Nombre del Estudio</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Planteamiento del Problema</Label>
                    <Textarea
                      value={editForm.problem_statement}
                      onChange={(e) => setEditForm({ ...editForm, problem_statement: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contexto Técnico/Económico</Label>
                    <Textarea
                      value={editForm.context}
                      onChange={(e) => setEditForm({ ...editForm, context: e.target.value })}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Planteamiento del Problema</h4>
                    <p className="text-sm">{study.problem_statement || 'No definido'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Contexto</h4>
                    <p className="text-sm">{study.context || 'No definido'}</p>
                  </div>
                  {study.objectives && study.objectives.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Objetivos</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {study.objectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {study.constraints && study.constraints.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Restricciones</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {study.constraints.map((con, idx) => (
                          <li key={idx}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-5">
            {PHASES.map((phase) => {
              const PhaseIcon = phase.icon;
              const count = phase.number === 1 ? stats.researchCount
                : phase.number === 2 ? stats.solutionsCount
                : phase.number === 3 ? stats.longlistCount
                : phase.number === 4 ? stats.shortlistCount
                : stats.completedEvaluations;
              
              return (
                <Card 
                  key={phase.number}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    study.current_phase === phase.number ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveTab(`phase${phase.number}`)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PhaseIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-sm">{phase.name}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Phase Tabs */}
        <TabsContent value="phase1">
          <StudyPhase1Research studyId={studyId!} study={study} />
        </TabsContent>

        <TabsContent value="phase2">
          <StudyPhase2Solutions studyId={studyId!} study={study} />
        </TabsContent>

        <TabsContent value="phase3">
          <StudyPhase3Longlist studyId={studyId!} study={study} />
        </TabsContent>

        <TabsContent value="phase4">
          <StudyPhase4Shortlist studyId={studyId!} study={study} />
        </TabsContent>

        <TabsContent value="phase5">
          <StudyPhase5Evaluation studyId={studyId!} study={study} />
        </TabsContent>

        <TabsContent value="report">
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Generador de Informes</h3>
            <p className="text-muted-foreground mb-4">
              Genera el informe final con las recomendaciones técnicas y económicas
            </p>
            <Button disabled>
              Próximamente
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
