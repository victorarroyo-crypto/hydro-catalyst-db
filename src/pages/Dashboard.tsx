import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { comparisonProjectsService } from '@/services/comparisonProjectsService';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cpu, 
  FolderOpen, 
  ArrowRight,
  Droplets,
  TrendingUp,
  ClipboardList,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  Tag,
  FlaskConical,
  Radar,
  MessageSquare,
  Beaker,
  Database,
  DollarSign,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const canReviewEdits = profile?.role && ['admin', 'supervisor'].includes(profile.role);
  const isInternalUser = profile?.role && ['admin', 'supervisor'].includes(profile.role);

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

  // Main stats query (technologies, case studies, scouting projects)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', isInternalUser ? 'internal' : 'public'],
    queryFn: async () => {
      let techQuery = externalSupabase.from('technologies').select('id', { count: 'exact', head: true });
      
      if (!isInternalUser) {
        techQuery = techQuery.eq('status', 'active');
      }
      
      const projectsResponse = await comparisonProjectsService.list();
      const projectsList = projectsResponse.projects || projectsResponse.data || [];
      const activeProjectsCount = projectsList.filter((p: any) => 
        ['active', 'in_progress', 'draft'].includes(p.status)
      ).length;

      const baseQueries = [
        techQuery,
        Promise.resolve({ count: activeProjectsCount }),
        externalSupabase.from('casos_de_estudio').select('id', { count: 'exact', head: true }),
      ];

      if (isInternalUser) {
        const [techCount, projectsCount, caseStudiesCount,
               activeCount, inReviewCount, inactiveCount, pendingClassificationCount] = await Promise.all([
          ...baseQueries,
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'en_revision'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
          externalSupabase.from('technologies').select('id', { count: 'exact', head: true }).is('tipo_id', null),
        ]);
        
        return {
          totalTechnologies: techCount.count || 0,
          activeProjects: projectsCount.count || 0,
          caseStudies: caseStudiesCount.count || 0,
          statusBreakdown: {
            active: activeCount.count || 0,
            en_revision: inReviewCount.count || 0,
            inactive: inactiveCount.count || 0,
            pendingClassification: pendingClassificationCount.count || 0,
          },
        };
      }
      
      const [techCount, projectsCount, caseStudiesCount] = await Promise.all(baseQueries);
      
      return {
        totalTechnologies: techCount.count || 0,
        activeProjects: projectsCount.count || 0,
        caseStudies: caseStudiesCount.count || 0,
      };
    },
  });

  // Consultoria count (Railway API)
  const { data: consultoriaCount } = useQuery({
    queryKey: ['dashboard-consultoria-count'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects`);
      if (!res.ok) return null;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.projects || data.data || [];
      return list.length;
    },
    retry: false,
  });

  // Agua Industrial / Cost Consulting count
  const { data: costCount } = useQuery({
    queryKey: ['dashboard-cost-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('cost_consulting_projects')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
    retry: false,
  });

  // Quimicos count (external Supabase)
  const { data: chemCount } = useQuery({
    queryKey: ['dashboard-chem-count'],
    queryFn: async () => {
      const { count } = await externalSupabase
        .from('chem_projects')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
    retry: false,
  });

  // Scouting sessions count
  const { data: scoutingCount } = useQuery({
    queryKey: ['dashboard-scouting-count'],
    queryFn: async () => {
      const { count } = await externalSupabase
        .from('scouting_sessions')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
    retry: false,
  });

  // Pending edits (admin only)
  const { data: pendingEdits } = useQuery({
    queryKey: ['pending-edits-dashboard'],
    queryFn: async () => {
      const { data: editsData, error: editsError } = await supabase
        .from('technology_edits')
        .select('edit_type')
        .eq('status', 'pending');
      
      if (editsError) throw editsError;
      
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

  // Module cards config
  const modules = [
    {
      title: 'BD Tecnologías',
      description: 'Catálogo completo de tecnologías de agua',
      icon: Database,
      href: '/technologies',
      count: stats?.totalTechnologies,
      countLabel: 'tecnologías',
      variant: 'primary' as const,
    },
    {
      title: 'Consultoría de Procesos',
      description: 'Proyectos de ingeniería y consultoría',
      icon: FolderOpen,
      href: '/projects',
      count: consultoriaCount,
      countLabel: 'proyectos',
      variant: 'secondary' as const,
    },
    {
      title: 'Agua Industrial',
      description: 'Análisis de costes y optimización',
      icon: DollarSign,
      href: '/cost-consulting',
      count: costCount,
      countLabel: 'análisis',
      variant: 'accent' as const,
    },
    {
      title: 'Químicos',
      description: 'Gestión de productos químicos',
      icon: FlaskConical,
      href: '/chemicals',
      count: chemCount,
      countLabel: 'proyectos',
      variant: 'primary' as const,
    },
    {
      title: 'Scouting IA',
      description: 'Búsqueda inteligente de tecnologías',
      icon: Radar,
      href: '/scouting',
      count: scoutingCount,
      countLabel: 'sesiones',
      variant: 'secondary' as const,
    },
    {
      title: 'Advisor IA',
      description: 'Asistente experto en agua industrial',
      icon: MessageSquare,
      href: '/advisor',
      count: undefined,
      countLabel: '',
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
              Tu plataforma integral de tecnología, consultoría y optimización del agua industrial.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Tecnologías"
          value={stats?.totalTechnologies?.toLocaleString() || '—'}
          subtitle="En la base de datos"
          icon={Cpu}
          variant="primary"
        />
        <StatsCard
          title="Consultoría"
          value={consultoriaCount != null ? consultoriaCount.toLocaleString() : '—'}
          subtitle="Proyectos activos"
          icon={FolderOpen}
          variant="secondary"
        />
        <StatsCard
          title="Agua Industrial"
          value={costCount != null ? costCount.toLocaleString() : '—'}
          subtitle="Análisis activos"
          icon={DollarSign}
          variant="accent"
        />
        <StatsCard
          title="Químicos"
          value={chemCount != null ? chemCount.toLocaleString() : '—'}
          subtitle="Proyectos activos"
          icon={FlaskConical}
          variant="primary"
        />
        <StatsCard
          title="Scouting"
          value={scoutingCount != null ? scoutingCount.toLocaleString() : '—'}
          subtitle="Sesiones IA"
          icon={Radar}
          variant="secondary"
        />
        <StatsCard
          title="Casos de Estudio"
          value={stats?.caseStudies?.toLocaleString() || '—'}
          subtitle="Implementaciones"
          icon={BookOpen}
          variant="accent"
        />
      </div>

      {/* Module Grid - 2x3 */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Módulos de la Plataforma</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Link key={mod.href} to={mod.href} className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                      mod.variant === 'primary' ? 'bg-primary text-primary-foreground' :
                      mod.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                      'bg-accent text-accent-foreground'
                    }`}>
                      <mod.icon className="w-6 h-6" />
                    </div>
                    {mod.count != null && (
                      <Badge variant="secondary" className="text-xs">
                        {mod.count} {mod.countLabel}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{mod.description}</p>
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

      {/* Admin Panel - Technology Status Breakdown */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Pending Suggestions Widget - Admin/Supervisor only */}
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
    </div>
  );
};

export default Dashboard;
