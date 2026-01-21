import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { comparisonProjectsService } from '@/services/comparisonProjectsService';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  BookOpen,
  Lightbulb,
  CheckCircle,
  Clock,
  XCircle,
  Tag,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const canReviewEdits = profile?.role && ['admin', 'supervisor'].includes(profile.role);
  const isInternalUser = profile?.role && ['admin', 'supervisor'].includes(profile.role);

  // Subscribe to real-time updates for all dashboard data
  useRealtimeSubscription({
    tables: [
      'technologies', 
      'projects', 
      'technology_edits', 
      'casos_de_estudio', 
      'technological_trends',
      'scouting_queue',
      'scouting_sessions',
    ],
    queryKeys: [
      ['dashboard-stats', isInternalUser ? 'internal' : 'public'], 
      ['pending-edits-dashboard'],
    ],
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', isInternalUser ? 'internal' : 'public'],
    queryFn: async () => {
      // For regular users, only count active/published technologies
      // For admin/supervisor, count all technologies with breakdown by status
      let techQuery = externalSupabase.from('technologies').select('id', { count: 'exact', head: true });
      let highTrlQuery = externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).gte('"Grado de madurez (TRL)"', 7);
      
      if (!isInternalUser) {
        techQuery = techQuery.eq('status', 'active');
        highTrlQuery = highTrlQuery.eq('status', 'active');
      }
      
      // Fetch projects count from external API
      const projectsResponse = await comparisonProjectsService.list();
      const projectsList = projectsResponse.projects || projectsResponse.data || [];
      const activeProjectsCount = projectsList.filter((p: any) => 
        ['active', 'in_progress', 'draft'].includes(p.status)
      ).length;

      const baseQueries = [
        techQuery,
        highTrlQuery,
        Promise.resolve({ count: activeProjectsCount }), // projects count from API
        externalSupabase.from('casos_de_estudio').select('id', { count: 'exact', head: true }),
        externalSupabase.from('technological_trends').select('id', { count: 'exact', head: true }),
      ];

      // For internal users, also get status breakdown and pending classification
      if (isInternalUser) {
        const [techCount, highTrlCount, projectsCount, caseStudiesCount, trendsCount, 
               activeCount, inReviewCount, inactiveCount, pendingClassificationCount] = await Promise.all([
          ...baseQueries,
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'en_revision'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).is('tipo_id', null),
        ]);
        
        return {
          totalTechnologies: techCount.count || 0,
          highTrlTechnologies: highTrlCount.count || 0,
          activeProjects: projectsCount.count || 0,
          caseStudies: caseStudiesCount.count || 0,
          trends: trendsCount.count || 0,
          statusBreakdown: {
            active: activeCount.count || 0,
            en_revision: inReviewCount.count || 0,
            inactive: inactiveCount.count || 0,
            pendingClassification: pendingClassificationCount.count || 0,
          },
        };
      }
      
      const [techCount, highTrlCount, projectsCount, caseStudiesCount, trendsCount] = await Promise.all(baseQueries);
      
      return {
        totalTechnologies: techCount.count || 0,
        highTrlTechnologies: highTrlCount.count || 0,
        activeProjects: projectsCount.count || 0,
        caseStudies: caseStudiesCount.count || 0,
        trends: trendsCount.count || 0,
      };
    },
  });

  const { data: pendingEdits } = useQuery({
    queryKey: ['pending-edits-dashboard'],
    queryFn: async () => {
      // Fetch pending technology edits from main Cloud database
      const { data: editsData, error: editsError } = await supabase
        .from('technology_edits')
        .select('edit_type')
        .eq('status', 'pending');
      
      if (editsError) throw editsError;
      
      // Fetch technologies pending review from external database
      const { count: reviewCount, error: reviewError } = await externalSupabase
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
      title: 'BD Tecnologías',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Tecnologías"
          value={stats?.totalTechnologies?.toLocaleString() || '—'}
          subtitle="En la base de datos"
          icon={Cpu}
          variant="primary"
        />
        <StatsCard
          title="Casos de Estudio"
          value={stats?.caseStudies?.toLocaleString() || '—'}
          subtitle="Implementaciones reales"
          icon={BookOpen}
          variant="secondary"
        />
        <StatsCard
          title="Tendencias"
          value={stats?.trends?.toLocaleString() || '—'}
          subtitle="Análisis de tendencias"
          icon={Lightbulb}
          variant="accent"
        />
        <StatsCard
          title="Mis Proyectos"
          value={stats?.activeProjects?.toLocaleString() || '—'}
          subtitle="Total de proyectos"
          icon={FolderOpen}
          variant="primary"
        />
        <Link to="/statistics" className="block">
          <StatsCard
            title="Estadísticas"
            value="Ver análisis"
            subtitle="Distribución completa"
            icon={BarChart3}
            variant="secondary"
          />
        </Link>
      </div>

      {/* Technology Status Breakdown - Only for Admin/Supervisor */}
      {isInternalUser && stats?.statusBreakdown && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Estado de Tecnologías</CardTitle>
                <CardDescription>Desglose por estado de publicación</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {stats.statusBreakdown.active.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">Activas / Publicadas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {stats.statusBreakdown.en_revision.toLocaleString()}
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">En Revisión</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-700">
                <XCircle className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {stats.statusBreakdown.inactive.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Inactivas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <Tag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {stats.statusBreakdown.pendingClassification.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Sin Clasificar</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


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
            <Link key={action.href} to={action.href} className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105 ${
                    action.variant === 'primary' ? 'bg-primary text-primary-foreground' :
                    action.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                    'bg-accent text-accent-foreground'
                  }`}>
                    <action.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    Acceder
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
