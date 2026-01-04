import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

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

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#84cc16',
  '#a855f7',
];

const Statistics: React.FC = () => {
  const { user } = useAuth();

  // Subscribe to real-time updates
  useRealtimeSubscription({
    tables: ['technologies', 'taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores'],
    queryKeys: [['technologies-stats'], ['taxonomy-tipos'], ['taxonomy-subcategorias'], ['taxonomy-sectores']],
  });

  // Fetch all technologies - use range to bypass 1000 row limit
  const { data: technologies, isLoading: loadingTech } = useQuery({
    queryKey: ['technologies-stats'],
    queryFn: async () => {
      const allTechnologies: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('technologies')
          .select('id, tipo_id, subcategoria_id, sector_id, "País de origen", status')
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allTechnologies.push(...data);
        
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      return allTechnologies;
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

  // Pie chart data for classification
  const classificationPieData = React.useMemo(() => [
    { name: 'Clasificadas', value: classificationStats.classified },
    { name: 'Pendientes', value: classificationStats.pending },
  ], [classificationStats]);

  // Pie chart data for status
  const statusPieData = React.useMemo(() => 
    statusStats.filter(s => s.count > 0).map(s => ({
      name: s.name,
      value: s.count,
    })),
  [statusStats]);

  // Bar chart data for tipos (top 8)
  const tipoBarData = React.useMemo(() => 
    tipoStats.filter(t => t.count > 0).slice(0, 8).map(t => ({
      name: t.name.split(' - ')[0], // Use only code for brevity
      fullName: t.name,
      count: t.count,
    })),
  [tipoStats]);

  // Bar chart data for countries (top 10)
  const countryBarData = React.useMemo(() => 
    countryStats.slice(0, 10).map(c => ({
      name: c.name.length > 10 ? c.name.substring(0, 10) + '...' : c.name,
      fullName: c.name,
      count: c.count,
    })),
  [countryStats]);

  // Bar chart data for sectors
  const sectorBarData = React.useMemo(() => 
    sectorStats.filter(s => s.count > 0).slice(0, 8).map(s => ({
      name: s.name.split(' - ')[0],
      fullName: s.name,
      count: s.count,
    })),
  [sectorStats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.fullName || data.name}</p>
          <p className="text-muted-foreground text-sm">
            {payload[0].value.toLocaleString()} tecnologías
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{payload[0].name}</p>
          <p className="text-muted-foreground text-sm">
            {payload[0].value.toLocaleString()} tecnologías ({Math.round((payload[0].value / total) * 100)}%)
          </p>
        </div>
      );
    }
    return null;
  };

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

      {/* Classification Overview with Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classificationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                {classificationStats.classified.toLocaleString()} clasificadas ({classificationStats.percentage}%)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-muted" />
                {classificationStats.pending.toLocaleString()} pendientes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Distribución por Estado
            </CardTitle>
            <CardDescription>
              Estado actual de las tecnologías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipo Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Por Tipo de Tecnología
            </CardTitle>
            <CardDescription>
              Distribución de tecnologías por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tipoBarData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sector Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Por Sector
            </CardTitle>
            <CardDescription>
              Distribución de tecnologías por sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorBarData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Country Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Top 10 Países
            </CardTitle>
            <CardDescription>
              Principales países de origen de las tecnologías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryBarData} margin={{ left: 10, right: 30, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Top 15 Subcategorías
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subcategoriaStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tecnologías con subcategoría asignada</p>
            ) : (
              subcategoriaStats.map((stat, idx) => (
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Todos los Países
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {countryStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay información de países</p>
            ) : (
              countryStats.map((stat, idx) => (
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
      </div>
    </div>
  );
};

export default Statistics;
