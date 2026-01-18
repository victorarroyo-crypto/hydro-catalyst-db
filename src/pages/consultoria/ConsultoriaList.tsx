import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, MapPin, Filter, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConsultoriaProject {
  id: string;
  nombre: string;
  cliente: string;
  planta: string;
  status: 'draft' | 'active' | 'in_progress' | 'completed';
  progreso: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  draft: { label: 'Borrador', variant: 'outline', className: 'border-muted-foreground/50 text-muted-foreground' },
  active: { label: 'Activo', variant: 'default', className: 'bg-secondary text-secondary-foreground' },
  in_progress: { label: 'En Progreso', variant: 'default', className: 'bg-accent text-accent-foreground' },
  completed: { label: 'Completado', variant: 'default', className: 'bg-primary text-primary-foreground' },
};

const API_URL = import.meta.env.VITE_API_URL || 'https://watertech-scouting-production.up.railway.app';

const fetchProjects = async (): Promise<ConsultoriaProject[]> => {
  const response = await fetch(`${API_URL}/api/projects`);
  if (!response.ok) {
    throw new Error('Error al cargar proyectos');
  }
  return response.json();
};

export default function ConsultoriaList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['consultoria-projects'],
    queryFn: fetchProjects,
  });

  const filteredProjects = statusFilter === 'todos'
    ? projects
    : projects.filter(p => p.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultoría Industrial</h1>
          <p className="text-muted-foreground">Gestiona tus proyectos de consultoría</p>
        </div>
        <Button onClick={() => navigate('/consultoria/nuevo')} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'todos' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('todos')}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">
              {error instanceof Error ? error.message : 'Error al cargar proyectos'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {statusFilter === 'todos' ? 'No hay proyectos' : 'No hay proyectos con este estado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'todos' 
                ? 'Crea tu primer proyecto de consultoría' 
                : 'Prueba con otro filtro o crea un nuevo proyecto'}
            </p>
            <Button onClick={() => navigate('/consultoria/nuevo')} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Crear Proyecto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && filteredProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
              onClick={() => navigate(`/consultoria/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{project.nombre}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{project.cliente || 'Sin cliente'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{project.planta || 'Sin planta'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium text-foreground">{project.progreso}%</span>
                  </div>
                  <Progress value={project.progreso} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
