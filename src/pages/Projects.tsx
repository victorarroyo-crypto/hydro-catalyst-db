import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { comparisonProjectsService, ComparisonProject } from '@/services/comparisonProjectsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FolderOpen, 
  Plus, 
  Loader2, 
  Calendar, 
  Building2, 
  BarChart3,
  ArrowRight,
  Trash2,
} from 'lucide-react';
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_date?: string | null;
  use_case?: string | null;
  target_industry?: string | null;
  notes?: string | null;
  created_at: string;
  created_by: string | null;
  selected_technology_ids?: string[];
}

const statusConfig: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', emoji: '🟡', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  active: { label: 'Activo', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  on_hold: { label: 'En espera', emoji: '🔵', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  closed: { label: 'Cerrado', emoji: '⚫', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  completed: { label: 'Completado', emoji: '✅', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  archived: { label: 'Archivado', emoji: '📦', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

const Projects: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'active',
    use_case: '',
    target_industry: '',
  });

  // Fetch projects from API
  const { data: projects, isLoading } = useQuery({
    queryKey: ['comparison-projects', user?.id],
    queryFn: async () => {
      const response = await comparisonProjectsService.list();
      return (response.projects || response.data || response || []) as Project[];
    },
    enabled: !!user,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await comparisonProjectsService.create({
        name: newProject.name,
        description: newProject.description || undefined,
        use_case: newProject.use_case || undefined,
        target_industry: newProject.target_industry || undefined,
        created_by: user?.id,
      });
      return response.project || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-projects'] });
      setCreateModalOpen(false);
      setNewProject({ name: '', description: '', status: 'active', use_case: '', target_industry: '' });
      toast({ title: 'Proyecto creado' });
    },
    onError: () => {
      toast({ title: 'Error al crear proyecto', variant: 'destructive' });
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await comparisonProjectsService.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-projects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      toast({ title: 'Proyecto eliminado' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar proyecto', variant: 'destructive' });
    },
  });

  const handleCreateProject = () => {
    if (!newProject.name.trim()) return;
    createMutation.mutate();
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const getStatus = (status: string) => statusConfig[status] || statusConfig.active;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Mis Proyectos de Comparación
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus proyectos y compara tecnologías del catálogo
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : projects?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No tienes proyectos todavía
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Crea tu primer proyecto para empezar a organizar y comparar tecnologías del agua.
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer proyecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => {
            const status = getStatus(project.status);
            const techCount = project.selected_technology_ids?.length || 0;
            
            return (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="card-hover cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={`${status.bg} ${status.color} border-0 shrink-0`}>
                        {status.emoji} {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(project, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors mt-2">
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.created_at).toLocaleDateString('es-ES')}
                      </div>
                      {project.target_industry && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{project.target_industry}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{techCount}</span>
                        <span className="text-muted-foreground">tecnologías</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver proyecto
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Proyecto de Comparación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input
                id="name"
                placeholder="Ej: Comparativa tratamiento terciario"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el objetivo del proyecto de comparación..."
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="use_case">Caso de uso</Label>
                <Input
                  id="use_case"
                  placeholder="Ej: Reutilización industrial"
                  value={newProject.use_case}
                  onChange={(e) => setNewProject(prev => ({ ...prev, use_case: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="target_industry">Industria objetivo</Label>
                <Input
                  id="target_industry"
                  placeholder="Ej: Farmacéutica"
                  value={newProject.target_industry}
                  onChange={(e) => setNewProject(prev => ({ ...prev, target_industry: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!newProject.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Proyecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el proyecto "{projectToDelete?.name}" y todas las tecnologías asociadas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => projectToDelete && deleteMutation.mutate(projectToDelete.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
