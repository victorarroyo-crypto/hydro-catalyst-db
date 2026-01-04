import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  Rocket, 
  FolderOpen, 
  Search, 
  Star, 
  ArrowRight,
  Droplets,
  TrendingUp,
  Tag,
  CheckCircle2,
  Clock
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [techCount, highTrlCount, projectsCount] = await Promise.all([
        supabase.from('technologies').select('id', { count: 'exact', head: true }),
        supabase.from('technologies').select('id', { count: 'exact', head: true }).gte('"Grado de madurez (TRL)"', 7),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      ]);
      
      return {
        totalTechnologies: techCount.count || 0,
        highTrlTechnologies: highTrlCount.count || 0,
        activeProjects: projectsCount.count || 0,
      };
    },
  });

  // Fetch taxonomy classification stats
  const { data: taxonomyStats } = useQuery({
    queryKey: ['taxonomy-classification-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technologies')
        .select('id, tipo_id, subcategoria_id, sector_id');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const withTipo = data?.filter(t => t.tipo_id !== null).length || 0;
      const withSubcategoria = data?.filter(t => t.subcategoria_id !== null).length || 0;
      const withSector = data?.filter(t => t.sector_id !== null).length || 0;
      const fullyClassified = data?.filter(t => t.tipo_id !== null && t.subcategoria_id !== null).length || 0;
      const pending = total - withTipo;
      
      return {
        total,
        withTipo,
        withSubcategoria,
        withSector,
        fullyClassified,
        pending,
        tipoPercentage: total > 0 ? Math.round((withTipo / total) * 100) : 0,
        subcategoriaPercentage: total > 0 ? Math.round((withSubcategoria / total) * 100) : 0,
        sectorPercentage: total > 0 ? Math.round((withSector / total) * 100) : 0,
        fullyClassifiedPercentage: total > 0 ? Math.round((fullyClassified / total) * 100) : 0,
      };
    },
  });

  const quickActions = [
    {
      title: 'Consultar Tecnologías',
      description: 'Explora más de 2600 tecnologías de tratamiento de agua',
      icon: Search,
      href: '/technologies',
      variant: 'primary' as const,
    },
    {
      title: 'Mis Proyectos',
      description: 'Gestiona tus proyectos activos y asigna tecnologías',
      icon: FolderOpen,
      href: '/projects',
      variant: 'secondary' as const,
    },
    {
      title: 'Favoritos',
      description: 'Accede a las tecnologías que has marcado',
      icon: Star,
      href: '/favorites',
      variant: 'accent' as const,
    },
  ];

  // Check if user is internal (can see classification stats)
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-secondary/50 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-accent/50 blur-2xl" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Droplets className="w-8 h-8" />
              <span className="text-sm font-medium text-primary-foreground/70">Vandarum Water Tech Hub</span>
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">
              ¡Bienvenido, {profile?.full_name || 'Usuario'}!
            </h1>
            <p className="text-primary-foreground/80 max-w-xl">
              Accede a la base de datos más completa de tecnologías de tratamiento de agua industrial. 
              Encuentra soluciones innovadoras para tus proyectos.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Tecnologías"
          value={stats?.totalTechnologies?.toLocaleString() || '—'}
          subtitle="En la base de datos"
          icon={Cpu}
          variant="primary"
        />
        <StatsCard
          title="TRL 7+"
          value={stats?.highTrlTechnologies?.toLocaleString() || '—'}
          subtitle="Listas para producción"
          icon={Rocket}
          variant="secondary"
        />
        <StatsCard
          title="Proyectos Activos"
          value={stats?.activeProjects?.toLocaleString() || '—'}
          subtitle="En progreso"
          icon={FolderOpen}
          variant="accent"
        />
      </div>

      {/* Taxonomy Classification Stats - Only for internal users */}
      {isInternalUser && taxonomyStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Estado de Clasificación Taxonómica</CardTitle>
                  <CardDescription>Progreso de la nueva taxonomía estandarizada</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {taxonomyStats.fullyClassified.toLocaleString()} clasificadas
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {taxonomyStats.pending.toLocaleString()} pendientes
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Clasificación completa (Tipo + Subcategoría)</span>
                <span className="text-muted-foreground">
                  {taxonomyStats.fullyClassified.toLocaleString()} / {taxonomyStats.total.toLocaleString()} ({taxonomyStats.fullyClassifiedPercentage}%)
                </span>
              </div>
              <Progress value={taxonomyStats.fullyClassifiedPercentage} className="h-3" />
            </div>

            {/* Detailed Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Con Tipo asignado</span>
                  <span className="font-medium">{taxonomyStats.tipoPercentage}%</span>
                </div>
                <Progress value={taxonomyStats.tipoPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {taxonomyStats.withTipo.toLocaleString()} tecnologías
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Con Subcategoría</span>
                  <span className="font-medium">{taxonomyStats.subcategoriaPercentage}%</span>
                </div>
                <Progress value={taxonomyStats.subcategoriaPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {taxonomyStats.withSubcategoria.toLocaleString()} tecnologías
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Con Sector</span>
                  <span className="font-medium">{taxonomyStats.sectorPercentage}%</span>
                </div>
                <Progress value={taxonomyStats.sectorPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {taxonomyStats.withSector.toLocaleString()} tecnologías
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/technologies" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Clasificar tecnologías
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Card key={action.href} className="card-hover group">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${
                  action.variant === 'primary' ? 'bg-primary text-primary-foreground' :
                  action.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                  'bg-accent text-accent-foreground'
                }`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost" className="p-0 h-auto font-medium group-hover:text-primary">
                  <Link to={action.href} className="flex items-center gap-2">
                    Acceder
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
