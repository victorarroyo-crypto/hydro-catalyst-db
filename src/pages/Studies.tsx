import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useScoutingStudies, useCreateStudy, useDeleteStudy, ScoutingStudy } from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  FileText,
  BookOpen,
  Lightbulb,
  List,
  Star,
  BarChart3,
  Trash2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Archive,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PHASES = [
  { number: 1, name: 'Investigación', icon: BookOpen, color: 'bg-blue-500' },
  { number: 2, name: 'Soluciones', icon: Lightbulb, color: 'bg-amber-500' },
  { number: 3, name: 'Lista Larga', icon: List, color: 'bg-purple-500' },
  { number: 4, name: 'Lista Corta', icon: Star, color: 'bg-orange-500' },
  { number: 5, name: 'Evaluación', icon: BarChart3, color: 'bg-green-500' },
];

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: FileText },
  in_progress: { label: 'En Progreso', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  archived: { label: 'Archivado', color: 'bg-slate-100 text-slate-700', icon: Archive },
};

export default function Studies() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteStudy, setDeleteStudy] = useState<ScoutingStudy | null>(null);
  const [newStudy, setNewStudy] = useState({ name: '', description: '', problem_statement: '' });
  
  const { data: studies, isLoading } = useScoutingStudies();
  const createStudy = useCreateStudy();
  const deleteStudyMutation = useDeleteStudy();

  const filteredStudies = studies?.filter(study =>
    study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.problem_statement?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateStudy = async () => {
    if (!newStudy.name.trim()) return;
    const result = await createStudy.mutateAsync(newStudy);
    setIsCreateOpen(false);
    setNewStudy({ name: '', description: '', problem_statement: '' });
    navigate(`/studies/${result.id}`);
  };

  const handleDeleteStudy = async () => {
    if (!deleteStudy) return;
    await deleteStudyMutation.mutateAsync(deleteStudy.id);
    setDeleteStudy(null);
  };

  const activeStudies = filteredStudies?.filter(s => s.status === 'in_progress') ?? [];
  const draftStudies = filteredStudies?.filter(s => s.status === 'draft') ?? [];
  const completedStudies = filteredStudies?.filter(s => s.status === 'completed') ?? [];
  const archivedStudies = filteredStudies?.filter(s => s.status === 'archived') ?? [];

  const StudyCard = ({ study }: { study: ScoutingStudy }) => {
    const statusConfig = STATUS_CONFIG[study.status];
    const currentPhase = PHASES[study.current_phase - 1];
    const StatusIcon = statusConfig.icon;

    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{study.name}</CardTitle>
              {study.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {study.description}
                </CardDescription>
              )}
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {study.problem_statement && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              <span className="font-medium text-foreground">Problema:</span> {study.problem_statement}
            </p>
          )}
          
          {/* Phase Progress */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              {PHASES.map((phase, idx) => {
                const isComplete = study.current_phase > phase.number;
                const isCurrent = study.current_phase === phase.number;
                const PhaseIcon = phase.icon;
                return (
                  <div
                    key={phase.number}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      isComplete ? phase.color : isCurrent ? `${phase.color} opacity-50` : 'bg-muted'
                    }`}
                    title={`Fase ${phase.number}: ${phase.name}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {currentPhase && (
                <>
                  <currentPhase.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Fase {study.current_phase}: {currentPhase.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Actualizado {format(new Date(study.updated_at), "d MMM yyyy", { locale: es })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteStudy(study);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
              <Button asChild size="sm">
                <Link to={`/studies/${study.id}`}>
                  Abrir <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estudios de Scouting</h1>
          <p className="text-muted-foreground">
            Gestiona procesos completos de búsqueda y evaluación de tecnologías
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Estudio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Estudio</DialogTitle>
              <DialogDescription>
                Define el problema a resolver y los objetivos del estudio de scouting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Estudio *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Tecnologías de tratamiento de aguas residuales"
                  value={newStudy.name}
                  onChange={(e) => setNewStudy({ ...newStudy, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descripción del alcance del estudio"
                  value={newStudy.description}
                  onChange={(e) => setNewStudy({ ...newStudy, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem">Planteamiento del Problema</Label>
                <Textarea
                  id="problem"
                  placeholder="Describe el problema técnico o necesidad a resolver"
                  value={newStudy.problem_statement}
                  onChange={(e) => setNewStudy({ ...newStudy, problem_statement: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateStudy} 
                disabled={!newStudy.name.trim() || createStudy.isPending}
              >
                {createStudy.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Estudio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar estudios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Studies Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="w-4 h-4" />
            En Progreso ({activeStudies.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-2">
            <FileText className="w-4 h-4" />
            Borradores ({draftStudies.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completados ({completedStudies.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="w-4 h-4" />
            Archivados ({archivedStudies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeStudies.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay estudios en progreso</h3>
              <p className="text-muted-foreground mb-4">
                Crea un nuevo estudio o continúa con uno de los borradores
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Estudio
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeStudies.map(study => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft">
          {draftStudies.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay borradores</h3>
              <p className="text-muted-foreground">Los estudios nuevos empiezan como borradores</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftStudies.map(study => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedStudies.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay estudios completados</h3>
              <p className="text-muted-foreground">Los estudios se marcan como completados al finalizar la Fase 5</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedStudies.map(study => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archivedStudies.length === 0 ? (
            <Card className="p-8 text-center">
              <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay estudios archivados</h3>
              <p className="text-muted-foreground">Los estudios archivados se guardan para referencia futura</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedStudies.map(study => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStudy} onOpenChange={() => setDeleteStudy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las investigaciones, 
              soluciones, listas y evaluaciones asociadas al estudio "{deleteStudy?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStudyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
