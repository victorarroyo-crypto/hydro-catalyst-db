import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cpu, 
  Rocket, 
  FolderOpen, 
  Search, 
  Star, 
  ArrowRight,
  Droplets,
  TrendingUp
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
