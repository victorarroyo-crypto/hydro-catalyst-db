import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Tag, Building2, TrendingUp } from "lucide-react";

interface Source {
  id: string;
  nombre: string;
  url: string;
  tipo: string | null;
  pais: string | null;
  sector_foco: string | null;
  tecnologias_foco: string | null;
  activo: boolean | null;
  tecnologias_encontradas: number | null;
}

interface SourcesDashboardProps {
  sources: Source[];
}

interface StatGroup {
  label: string;
  count: number;
}

export function SourcesDashboard({ sources }: SourcesDashboardProps) {
  const stats = useMemo(() => {
    // Group by tipo (theme/type)
    const byTipo: Record<string, number> = {};
    // Group by pais (country/region)
    const byPais: Record<string, number> = {};
    // Group by sector
    const bySector: Record<string, number> = {};
    
    let activeSources = 0;
    let totalTechsFound = 0;

    sources.forEach(s => {
      if (s.activo !== false) activeSources++;
      totalTechsFound += s.tecnologias_encontradas || 0;
      
      // Count by tipo
      const tipo = s.tipo || "Sin clasificar";
      byTipo[tipo] = (byTipo[tipo] || 0) + 1;
      
      // Count by pais
      const pais = s.pais || "Sin región";
      byPais[pais] = (byPais[pais] || 0) + 1;
      
      // Count by sector
      const sector = s.sector_foco || "Sin sector";
      bySector[sector] = (bySector[sector] || 0) + 1;
    });

    const sortByCount = (obj: Record<string, number>): StatGroup[] => 
      Object.entries(obj)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      total: sources.length,
      active: activeSources,
      totalTechs: totalTechsFound,
      byTipo: sortByCount(byTipo),
      byPais: sortByCount(byPais),
      bySector: sortByCount(bySector),
    };
  }, [sources]);

  if (sources.length === 0) return null;

  const TIPO_LABELS: Record<string, string> = {
    'web_empresa': 'Web Empresa',
    'directorio': 'Directorio',
    'feria_evento': 'Feria/Evento',
    'revista_publicacion': 'Revista',
    'hub_innovacion': 'Hub Innovación',
    'universidad': 'Universidad',
    'aceleradora': 'Aceleradora',
    'otro': 'Otro',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Total stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Total Fuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.active} activas · {stats.totalTechs} tecnologías encontradas
          </p>
        </CardContent>
      </Card>

      {/* By Type/Theme */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Por Temática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {stats.byTipo.slice(0, 6).map(({ label, count }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="truncate text-muted-foreground">
                  {TIPO_LABELS[label] || label}
                </span>
                <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Region/Country */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Por Región
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {stats.byPais.slice(0, 6).map(({ label, count }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="truncate text-muted-foreground">{label}</span>
                <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Sector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Por Sector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {stats.bySector.slice(0, 6).map(({ label, count }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="truncate text-muted-foreground">{label}</span>
                <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
