import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { syncProjectTechnologyDelete, syncProjectTechnologyInsert } from '@/lib/syncToExternal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TRLBadge } from '@/components/TRLBadge';
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
  ArrowLeft,
  Calendar,
  User,
  Building2,
  Plus,
  Trash2,
  BarChart3,
  FileText,
  Clock,
  Edit,
  Loader2,
  Search,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Technology {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Proveedor / Empresa": string | null;
  "País de origen": string | null;
  "Grado de madurez (TRL)": number | null;
  "Ventaja competitiva clave": string | null;
  "Aplicación principal": string | null;
  "Web de la empresa": string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface ProjectTechnology {
  id: string;
  technology_id: string;
  added_at: string;
  technology: Technology;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  active: { label: 'Activo', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  on_hold: { label: 'En espera', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  closed: { label: 'Cerrado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [addTechModalOpen, setAddTechModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'draft',
    target_date: '',
    notes: '',
  });

  // Fetch project
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!id,
  });

  // Fetch project technologies
  const { data: projectTechnologies, isLoading: loadingTechs } = useQuery({
    queryKey: ['project-technologies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_technologies')
        .select(`
          id,
          technology_id,
          added_at,
          technology:technologies(
            id,
            "Nombre de la tecnología",
            "Tipo de tecnología",
            "Proveedor / Empresa",
            "País de origen",
            "Grado de madurez (TRL)",
            "Ventaja competitiva clave",
            "Aplicación principal",
            "Web de la empresa"
          )
        `)
        .eq('project_id', id)
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ProjectTechnology[];
    },
    enabled: !!id,
  });

  // Search technologies for adding
  const { data: searchResults } = useQuery({
    queryKey: ['search-technologies', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from('technologies')
        .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Proveedor / Empresa", "Grado de madurez (TRL)"')
        .ilike('"Nombre de la tecnología"', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditModalOpen(false);
      toast({ title: 'Proyecto actualizado' });
    },
    onError: () => {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    },
  });

  // Add technology to project
  const addTechMutation = useMutation({
    mutationFn: async (technologyId: string) => {
      const { data, error } = await supabase
        .from('project_technologies')
        .insert({
          project_id: id,
          technology_id: technologyId,
          added_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Sync to external Supabase
      try {
        await syncProjectTechnologyInsert({
          id: data.id,
          project_id: id,
          technology_id: technologyId,
          added_by: user?.id,
          added_at: data.added_at,
        });
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-technologies', id] });
      setSearchQuery('');
      toast({ title: 'Tecnología añadida al proyecto' });
    },
    onError: () => {
      toast({ title: 'Error al añadir tecnología', variant: 'destructive' });
    },
  });

  // Remove technology from project
  const removeTechMutation = useMutation({
    mutationFn: async (projectTechId: string) => {
      const { error } = await supabase
        .from('project_technologies')
        .delete()
        .eq('id', projectTechId);
      
      if (error) throw error;

      // Sync deletion to external Supabase
      try {
        await syncProjectTechnologyDelete(projectTechId);
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-technologies', id] });
      toast({ title: 'Tecnología eliminada del proyecto' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    },
  });

  const openEditModal = () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || '',
        status: project.status || 'draft',
        target_date: project.target_date || '',
        notes: project.notes || '',
      });
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description || null,
      status: editForm.status,
      target_date: editForm.target_date || null,
      notes: editForm.notes || null,
    });
  };

  const alreadyAdded = (techId: string) => {
    return projectTechnologies?.some(pt => pt.technology_id === techId);
  };

  if (loadingProject) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Proyecto no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a proyectos
        </Button>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.draft;
  const technologies = projectTechnologies?.map(pt => pt.technology).filter(Boolean) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a proyectos
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-foreground">{project.name}</h1>
            <Badge className={`${status.bg} ${status.color} border-0`}>
              {status.label}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          )}
        </div>
        <Button onClick={openEditModal}>
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Creado</span>
            </div>
            <p className="font-medium">{new Date(project.created_at).toLocaleDateString('es-ES')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Fecha objetivo</span>
            </div>
            <p className="font-medium">
              {project.target_date 
                ? new Date(project.target_date).toLocaleDateString('es-ES')
                : '—'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Tecnologías</span>
            </div>
            <p className="font-medium">{projectTechnologies?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Estado</span>
            </div>
            <p className={`font-medium ${status.color}`}>{status.label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="technologies" className="w-full">
        <TabsList>
          <TabsTrigger value="technologies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Tecnologías ({projectTechnologies?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="w-4 h-4" />
            Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="technologies" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tecnologías del proyecto</h3>
            <div className="flex gap-2">
              {technologies.length >= 2 && (
                <Button variant="outline" onClick={() => setCompareModalOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Comparar
                </Button>
              )}
              <Button asChild>
                <Link to="/technologies">
                  <Search className="w-4 h-4 mr-2" />
                  Elegir tecnologías
                </Link>
              </Button>
            </div>
          </div>

          {loadingTechs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : projectTechnologies?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h4 className="font-medium text-foreground mb-2">Sin tecnologías</h4>
                <p className="text-muted-foreground text-center mb-4">
                  Añade tecnologías a este proyecto para evaluarlas
                </p>
                <Button asChild>
                  <Link to="/technologies">
                    <Search className="w-4 h-4 mr-2" />
                    Elegir tecnologías
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectTechnologies?.map(pt => (
                <Card key={pt.id} className="card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">
                          {pt.technology["Nombre de la tecnología"]}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          {pt.technology["Proveedor / Empresa"] || 'Sin proveedor'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeTechMutation.mutate(pt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        {pt.technology["Tipo de tecnología"]}
                      </Badge>
                      <TRLBadge trl={pt.technology["Grado de madurez (TRL)"]} />
                    </div>
                    {pt.technology["País de origen"] && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {pt.technology["País de origen"]}
                      </div>
                    )}
                    <Link 
                      to={`/technologies?search=${encodeURIComponent(pt.technology["Nombre de la tecnología"])}`}
                      className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      Ver detalles
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas del proyecto</CardTitle>
              <CardDescription>Notas internas sobre este proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              {project.notes ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{project.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay notas. Haz clic en "Editar" para añadir notas al proyecto.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Project Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">🟡 Borrador</SelectItem>
                    <SelectItem value="active">🟢 Activo</SelectItem>
                    <SelectItem value="on_hold">🔵 En espera</SelectItem>
                    <SelectItem value="closed">⚫ Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_date">Fecha objetivo</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={editForm.target_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder="Notas sobre el proyecto, cliente, requisitos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.name || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Technology Modal */}
      <Dialog open={addTechModalOpen} onOpenChange={setAddTechModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir Tecnología</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tecnología por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {searchQuery.length >= 2 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron tecnologías
                  </p>
                ) : (
                  searchResults?.map(tech => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tech["Nombre de la tecnología"]}</p>
                        <p className="text-sm text-muted-foreground">
                          {tech["Proveedor / Empresa"] || 'Sin proveedor'} • {tech["Tipo de tecnología"]}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded(tech.id) ? "secondary" : "default"}
                        disabled={alreadyAdded(tech.id) || addTechMutation.isPending}
                        onClick={() => addTechMutation.mutate(tech.id)}
                      >
                        {alreadyAdded(tech.id) ? 'Añadida' : 'Añadir'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              También puedes añadir tecnologías desde la página de Tecnologías usando el botón "Añadir a proyecto"
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTechModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comparador de Tecnologías</DialogTitle>
          </DialogHeader>
          
          {technologies.length < 2 ? (
            <p className="text-muted-foreground text-center py-8">
              Necesitas al menos 2 tecnologías para comparar
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground min-w-[150px]">
                      Característica
                    </th>
                    {technologies.map(tech => (
                      <th key={tech.id} className="text-left p-3 font-semibold min-w-[180px]">
                        {tech["Nombre de la tecnología"]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Proveedor</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3">
                        {tech["Proveedor / Empresa"] || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">País</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3">
                        {tech["País de origen"] || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">TRL (Madurez)</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3">
                        <TRLBadge trl={tech["Grado de madurez (TRL)"]} />
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Tipo</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3">
                        <Badge variant="outline">{tech["Tipo de tecnología"]}</Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Ventaja clave</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3 text-sm">
                        {tech["Ventaja competitiva clave"] || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Aplicación</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3 text-sm">
                        {tech["Aplicación principal"] || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-muted-foreground">Web</td>
                    {technologies.map(tech => (
                      <td key={tech.id} className="p-3">
                        {tech["Web de la empresa"] ? (
                          <a 
                            href={tech["Web de la empresa"]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                          >
                            Visitar
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
