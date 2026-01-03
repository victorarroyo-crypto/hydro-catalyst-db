import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Clock, CheckCircle, XCircle, Pause, Loader2 } from 'lucide-react';
import type { Project } from '@/types/database';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'in_progress':
      return <Clock className="w-4 h-4" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Pause className="w-4 h-4" />;
  }
};

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'En progreso';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    case 'pending':
      return 'Pendiente';
    default:
      return status;
  }
};

const Projects: React.FC = () => {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Mis Proyectos
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus proyectos y asigna tecnologías
          </p>
        </div>
        <Button>
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
              Crea tu primer proyecto para empezar a organizar y asignar tecnologías de tratamiento de agua.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer proyecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Card key={project.id} className="card-hover cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {project.name}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(project.status)} className="flex items-center gap-1">
                    {getStatusIcon(project.status)}
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Creado: {new Date(project.created_at).toLocaleDateString('es-ES')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
