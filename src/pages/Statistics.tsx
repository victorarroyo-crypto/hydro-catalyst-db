import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Tag, 
  MapPin, 
  Building2,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Globe,
} from 'lucide-react';

interface StatItem {
  name: string;
  count: number;
  percentage: number;
}

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
}

interface TaxonomySubcategoria {
  id: number;
  tipo_id: number;
  codigo: string;
  nombre: string;
}

interface TaxonomySector {
  id: string;
  nombre: string;
}

const Statistics: React.FC = () => {
  const { user } = useAuth();

  // Fetch all technologies
  const { data: technologies, isLoading: loadingTech } = useQuery({
    queryKey: ['technologies-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technologies')
        .select('id, tipo_id, subcategoria_id, sector_id, "País de origen", status');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch taxonomy data
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('id, codigo, nombre')
        .order('id');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  const { data: subcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_subcategorias')
        .select('id, tipo_id, codigo, nombre')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

  const { data: sectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('id, nombre');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  const total = technologies?.length || 0;

  // Calculate stats by tipo
  const tipoStats: StatItem[] = React.useMemo(() => {
    if (!technologies || !tipos) return [];
    const counts = new Map<number, number>();
    technologies.forEach(t => {
      if (t.tipo_id) {
        counts.set(t.tipo_id, (counts.get(t.tipo_id) || 0) + 1);
      }
    });
    return tipos.map(tipo => ({
      name: `${tipo.codigo} - ${tipo.nombre}`,
      count: counts.get(tipo.id) || 0,
      percentage: total > 0 ? Math.round(((counts.get(tipo.id) || 0) / total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [technologies, tipos, total]);

  // Calculate stats by sector
  const sectorStats: StatItem[] = React.useMemo(() => {
    if (!technologies || !sectores) return [];
    const counts = new Map<string, number>();
    technologies.forEach(t => {
      if (t.sector_id) {
        counts.set(t.sector_id, (counts.get(t.sector_id) || 0) + 1);
      }
    });
    return sectores.map(sector => ({
      name: `${sector.id} - ${sector.nombre}`,
      count: counts.get(sector.id) || 0,
      percentage: total > 0 ? Math.round(((counts.get(sector.id) || 0) / total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [technologies, sectores, total]);

  // Calculate stats by country
  const countryStats: StatItem[] = React.useMemo(() => {
    if (!technologies) return [];
    const counts = new Map<string, number>();
    technologies.forEach(t => {
      const country = t["País de origen"];
      if (country) {
        counts.set(country, (counts.get(country) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 countries
  }, [technologies, total]);

  // Calculate stats by status
  const statusStats: StatItem[] = React.useMemo(() => {
    if (!technologies) return [];
    const counts = new Map<string, number>();
    technologies.forEach(t => {
      const status = t.status || 'Sin estado';
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    const statusLabels: Record<string, string> = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'en_revision': 'En revisión',
      'Sin estado': 'Sin estado',
    };
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name: statusLabels[name] || name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [technologies, total]);

  // Calculate top subcategorias
  const subcategoriaStats: StatItem[] = React.useMemo(() => {
    if (!technologies || !subcategorias) return [];
    const counts = new Map<number, number>();
    technologies.forEach(t => {
      if (t.subcategoria_id) {
        counts.set(t.subcategoria_id, (counts.get(t.subcategoria_id) || 0) + 1);
      }
    });
    return subcategorias
      .map(sub => ({
        name: `${sub.codigo} - ${sub.nombre}`,
        count: counts.get(sub.id) || 0,
        percentage: total > 0 ? Math.round(((counts.get(sub.id) || 0) / total) * 100) : 0,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 subcategorias
  }, [technologies, subcategorias, total]);

  // Classification progress
  const classificationStats = React.useMemo(() => {
    if (!technologies) return { classified: 0, pending: 0, percentage: 0 };
    const classified = technologies.filter(t => t.tipo_id !== null).length;
    return {
      classified,
      pending: total - classified,
      percentage: total > 0 ? Math.round((classified / total) * 100) : 0,
    };
  }, [technologies, total]);

  const StatSection = ({ 
    title, 
    icon: Icon, 
    stats, 
    emptyMessage 
  }: { 
    title: string; 
    icon: React.ElementType; 
    stats: StatItem[]; 
    emptyMessage: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          stats.map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]" title={stat.name}>{stat.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{stat.count}</Badge>
                  <span className="text-muted-foreground text-xs w-10 text-right">{stat.percentage}%</span>
                </div>
              </div>
              <Progress value={stat.percentage} className="h-1.5" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  if (loadingTech) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Estadísticas de Tecnologías</h1>
            <p className="text-muted-foreground">
              Análisis de la distribución de {total.toLocaleString()} tecnologías
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Classification Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Estado de Clasificación
          </CardTitle>
          <CardDescription>
            Progreso de asignación de la nueva taxonomía
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Tecnologías clasificadas</span>
              <span className="font-medium">
                {classificationStats.classified.toLocaleString()} / {total.toLocaleString()} ({classificationStats.percentage}%)
              </span>
            </div>
            <Progress value={classificationStats.percentage} className="h-3" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {classificationStats.classified.toLocaleString()} clasificadas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted" />
                {classificationStats.pending.toLocaleString()} pendientes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatSection
          title="Por Tipo de Tecnología"
          icon={Tag}
          stats={tipoStats}
          emptyMessage="No hay tecnologías clasificadas por tipo"
        />

        <StatSection
          title="Por Sector"
          icon={Building2}
          stats={sectorStats}
          emptyMessage="No hay tecnologías clasificadas por sector"
        />

        <StatSection
          title="Top 15 Subcategorías"
          icon={Tag}
          stats={subcategoriaStats}
          emptyMessage="No hay tecnologías con subcategoría asignada"
        />

        <StatSection
          title="Top 15 Países"
          icon={Globe}
          stats={countryStats}
          emptyMessage="No hay información de países"
        />

        <StatSection
          title="Por Estado"
          icon={CheckCircle2}
          stats={statusStats}
          emptyMessage="No hay información de estados"
        />
      </div>
    </div>
  );
};

export default Statistics;
