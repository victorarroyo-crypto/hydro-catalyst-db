import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Droplets, Calendar, Loader2, AlertCircle, FileText, BarChart3, Layers, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { API_URL } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  client_contact?: string;
  project_type?: string;
  industry_sector?: string;
  plant_name?: string;
  plant_location?: string;
  plant_capacity_m3_day?: number;
  status?: string;
  current_phase?: string;
  progress_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  in_progress: 'En Progreso',
  completed: 'Completado',
  archived: 'Archivado',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  in_progress: 'bg-accent/10 text-accent-foreground',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-muted text-muted-foreground',
};

const phaseLabels: Record<string, string> = {
  setup: 'Configuración',
  data_collection: 'Recopilación de Datos',
  analysis: 'Análisis',
  recommendations: 'Recomendaciones',
  reporting: 'Informe Final',
};

export default function ConsultoriaProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['consultoria-project', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proyecto no encontrado');
        }
        throw new Error('Error al cargar el proyecto');
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/consultoria')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a lista
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error ? error.message : 'No se pudo cargar el proyecto'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/consultoria')}>
              Volver a la lista de proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = project.created_at 
    ? new Date(project.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Fecha no disponible';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/consultoria')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <Badge className={statusColors[project.status || 'draft']}>
                {statusLabels[project.status || 'draft'] || project.status}
              </Badge>
            </div>
            {project.client_name && (
              <p className="text-muted-foreground mt-1">
                Cliente: {project.client_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {project.industry_sector && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sector</p>
                  <p className="font-medium">{project.industry_sector}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.plant_location && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{project.plant_location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.plant_capacity_m3_day !== undefined && project.plant_capacity_m3_day > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacidad</p>
                  <p className="font-medium">{project.plant_capacity_m3_day.toLocaleString()} m³/día</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Creado</p>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Phase */}
      {project.current_phase && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fase Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                {phaseLabels[project.current_phase] || project.current_phase}
              </Badge>
              {project.progress_percentage !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {project.progress_percentage}% completado
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descripción del Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Placeholder for future development */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos del Proyecto</CardTitle>
          <CardDescription>
            Esta sección se expandirá con funcionalidades completas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Escenarios
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>El panel de resumen estará disponible próximamente</p>
              </div>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gestión de documentos próximamente</p>
              </div>
            </TabsContent>
            <TabsContent value="scenarios" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Diseñador de escenarios próximamente</p>
              </div>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configuración del proyecto próximamente</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
