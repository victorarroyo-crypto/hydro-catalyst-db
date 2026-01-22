import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparisonProjectsService, ComparisonProject, ProjectTechnology } from '@/services/comparisonProjectsService';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TRLBadge } from '@/components/TRLBadge';
import { Textarea } from '@/components/ui/textarea';
import { TechnologyDetailModal } from '@/components/TechnologyDetailModal';
import { ScenariosSection } from '@/components/scenarios/ScenariosSection';
import { DiagramsSection } from '@/components/diagrams/DiagramsSection';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_URL } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  Plus,
  Trash2,
  BarChart3,
  Network,
  FileText,
  Clock,
  Edit,
  Loader2,
  Search,
  MapPin,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Technology {
  id: string;
  nombre: string;
  tipo: string;
  proveedor: string | null;
  pais: string | null;
  trl: number | null;
  ventaja: string | null;
  aplicacion: string | null;
  web: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  use_case?: string | null;
  target_industry?: string | null;
  comparison_results?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface ProjectTech {
  id: string;
  technology_id: string;
  user_notes?: string;
  user_rating?: number;
  tags?: string[];
  added_at: string;
  technology: Technology;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Activo', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  completed: { label: 'Completado', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  archived: { label: 'Archivado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
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
  const [selectedTechnology, setSelectedTechnology] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active',
    use_case: '',
    target_industry: '',
  });

  // Export report as DOCX
  const exportDocx = async () => {
    if (!project) return;
    
    setIsExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/technology-comparison-projects/${id}/report/docx`);
      
      if (!response.ok) {
        if (response.status === 400) {
          toast({
            title: 'Datos insuficientes',
            description: 'El proyecto no tiene suficiente información para generar el informe.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Error al generar el informe');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_informe.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'Informe DOCX descargado' });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error al exportar',
        description: 'No se pudo generar el informe. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export report as PDF (placeholder - opens print dialog)
  const exportPdf = () => {
    toast({
      title: 'Exportar PDF',
      description: 'Use Ctrl+P o Cmd+P para imprimir/guardar como PDF.',
    });
    window.print();
  };

  // Fetch project from API
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['comparison-project', id],
    queryFn: async () => {
      const response = await comparisonProjectsService.get(id!);
      return (response.project || response) as Project | null;
    },
    enabled: !!id,
  });

  // Fetch project technologies from API
  const { data: projectTechnologies, isLoading: loadingTechs } = useQuery({
    queryKey: ['comparison-project-technologies', id],
    queryFn: async () => {
      const response = await comparisonProjectsService.listTechnologies(id!);
      return (response.technologies || response.data || response || []) as ProjectTech[];
    },
    enabled: !!id,
  });

  // Search technologies for adding (from external catalog)
  const { data: searchResults } = useQuery({
    queryKey: ['search-technologies', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('id, nombre, tipo, proveedor, trl')
        .ilike('nombre', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await comparisonProjectsService.update(id!, data as any);
      return response.project || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-project', id] });
      queryClient.invalidateQueries({ queryKey: ['comparison-projects'] });
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
      const response = await comparisonProjectsService.addTechnology(id!, {
        technology_id: technologyId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-project-technologies', id] });
      setSearchQuery('');
      toast({ title: 'Tecnología añadida al proyecto' });
    },
    onError: () => {
      toast({ title: 'Error al añadir tecnología', variant: 'destructive' });
    },
  });

  // Remove technology from project
  const removeTechMutation = useMutation({
    mutationFn: async (technologyId: string) => {
      await comparisonProjectsService.removeTechnology(id!, technologyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-project-technologies', id] });
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
        status: project.status || 'active',
        use_case: project.use_case || '',
        target_industry: project.target_industry || '',
      });
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description || null,
      status: editForm.status as any,
      use_case: editForm.use_case || null,
      target_industry: editForm.target_industry || null,
    });
  };

  const alreadyAdded = (techId: string) => {
    return projectTechnologies?.some(pt => pt.technology_id === techId);
  };

  const exportToExcel = () => {
    if (!technologies.length || !project) return;

    const data = technologies.map(tech => ({
      'Nombre': tech.nombre,
      'Proveedor / Empresa': tech.proveedor || '',
      'País de origen': tech.pais || '',
      'TRL (Madurez)': tech.trl || '',
      'Tipo de tecnología': tech.tipo,
      'Ventaja competitiva clave': tech.ventaja || '',
      'Aplicación principal': tech.aplicacion || '',
      'Web de la empresa': tech.web || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tecnologías');
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Comparativa_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    
    toast({ title: 'Excel exportado correctamente' });
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

  const status = statusConfig[project.status] || statusConfig.active;
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
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Exportar Informe
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportDocx} disabled={isExporting}>
                <FileText className="w-4 h-4 mr-2" />
                DOCX (Word)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openEditModal}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
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
              <span className="text-sm">Industria</span>
            </div>
            <p className="font-medium">
              {project.target_industry || '—'}
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
          <TabsTrigger value="diagrams" className="gap-2">
            <Network className="w-4 h-4" />
            Diagramas
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Escenarios
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="w-4 h-4" />
            Caso de uso
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
              <Button onClick={() => setAddTechModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir tecnología
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
                  Añade tecnologías a este proyecto para compararlas
                </p>
                <Button onClick={() => setAddTechModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir tecnología
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
                        onClick={() => removeTechMutation.mutate(pt.technology_id)}
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
                    {pt.user_notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {pt.user_notes}
                      </p>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedTechnology(pt.technology);
                        setDetailModalOpen(true);
                      }}
                      className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      Ver detalles
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagrams" className="mt-6">
          <DiagramsSection projectId={id!} />
        </TabsContent>

        <TabsContent value="scenarios" className="mt-6">
          <ScenariosSection projectId={id!} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Caso de uso</CardTitle>
              <CardDescription>Contexto y objetivo de este proyecto de comparación</CardDescription>
            </CardHeader>
            <CardContent>
              {project.use_case ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{project.use_case}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay caso de uso definido. Haz clic en "Editar" para añadirlo.
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
                    <SelectItem value="active">🟢 Activo</SelectItem>
                    <SelectItem value="completed">✅ Completado</SelectItem>
                    <SelectItem value="archived">📦 Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_industry">Industria objetivo</Label>
                <Input
                  id="target_industry"
                  value={editForm.target_industry}
                  onChange={(e) => setEditForm(prev => ({ ...prev, target_industry: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="use_case">Caso de uso</Label>
              <Textarea
                id="use_case"
                value={editForm.use_case}
                onChange={(e) => setEditForm(prev => ({ ...prev, use_case: e.target.value }))}
                rows={4}
                placeholder="Describe el caso de uso y objetivo de esta comparación..."
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
              Busca tecnologías del catálogo para añadirlas a este proyecto de comparación
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
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={exportToExcel} disabled={technologies.length < 2}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={() => setCompareModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Technology Detail Modal */}
      <TechnologyDetailModal
        technology={selectedTechnology}
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open);
          if (!open) setSelectedTechnology(null);
        }}
      />
    </div>
  );
};

export default ProjectDetail;
