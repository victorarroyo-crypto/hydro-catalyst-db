import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cpu, 
  FolderOpen, 
  Search, 
  Star, 
  ArrowRight,
  Droplets,
  TrendingUp,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const canReviewEdits = profile?.role && ['admin', 'supervisor'].includes(profile.role);

  // Subscribe to real-time updates
  useRealtimeSubscription({
    tables: ['technologies', 'projects', 'technology_edits'],
    queryKeys: [['dashboard-stats'], ['pending-edits-dashboard']],
  });

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

  const { data: pendingEdits } = useQuery({
    queryKey: ['pending-edits-dashboard'],
    queryFn: async () => {
      // Fetch pending technology edits
      const { data: editsData, error: editsError } = await supabase
        .from('technology_edits')
        .select('edit_type')
        .eq('status', 'pending');
      
      if (editsError) throw editsError;
      
      // Fetch technologies pending review
      const { count: reviewCount, error: reviewError } = await supabase
        .from('technologies')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'pending');
      
      if (reviewError) throw reviewError;
      
      const editsTotal = editsData?.length || 0;
      const reviewsTotal = reviewCount || 0;
      
      const byType = {
        create: editsData?.filter(e => e.edit_type === 'create').length || 0,
        classify: editsData?.filter(e => e.edit_type === 'classify').length || 0,
        update: editsData?.filter(e => e.edit_type === 'update').length || 0,
        review: reviewsTotal,
      };
      
      return { total: editsTotal + reviewsTotal, byType };
    },
    enabled: !!canReviewEdits,
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
              Accede a la base de datos completa de tecnologías del agua. 
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
        <Link to="/statistics" className="block">
          <StatsCard
            title="Estadísticas"
            value="Ver análisis"
            subtitle="Distribución por tipo, país, sector"
            icon={BarChart3}
            variant="secondary"
          />
        </Link>
        <StatsCard
          title="Proyectos Activos"
          value={stats?.activeProjects?.toLocaleString() || '—'}
          subtitle="En progreso"
          icon={FolderOpen}
          variant="accent"
        />
      </div>

      {/* Pending Suggestions Widget - Only for Admin/Supervisor */}
      {canReviewEdits && pendingEdits && pendingEdits.total > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sugerencias Pendientes</CardTitle>
                  <CardDescription>Requieren tu revisión</CardDescription>
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingEdits.total}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              {pendingEdits.byType.create > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{pendingEdits.byType.create}</Badge>
                  <span className="text-muted-foreground">Nuevas tecnologías</span>
                </div>
              )}
              {pendingEdits.byType.classify > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{pendingEdits.byType.classify}</Badge>
                  <span className="text-muted-foreground">Clasificaciones</span>
                </div>
              )}
              {pendingEdits.byType.update > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{pendingEdits.byType.update}</Badge>
                  <span className="text-muted-foreground">Ediciones</span>
                </div>
              )}
              {pendingEdits.byType.review > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500 hover:bg-blue-600">{pendingEdits.byType.review}</Badge>
                  <span className="text-muted-foreground">En cola de revisión</span>
                </div>
              )}
            </div>
            <Button asChild className="w-full">
              <Link to="/quality-control">
                Ir al Centro de Supervisión
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
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
