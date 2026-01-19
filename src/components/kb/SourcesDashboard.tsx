import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Tag, Building2, Search, X } from "lucide-react";

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

interface SourceFilters {
  tipo: string;
  pais: string;
  sector: string;
  search: string;
}

interface SourcesDashboardProps {
  sources: Source[];
  filters: SourceFilters;
  onFiltersChange: (filters: SourceFilters) => void;
}

interface StatGroup {
  label: string;
  count: number;
}

const TIPO_LABELS: Record<string, string> = {
  'web_empresa': 'Web Empresa',
  'directorio': 'Directorio',
  'feria': 'Feria',
  'feria_evento': 'Feria/Evento',
  'revista': 'Revista',
  'revista_publicacion': 'Revista',
  'hub_innovacion': 'Hub Innovación',
  'universidad': 'Universidad',
  'aceleradora': 'Aceleradora',
  'asociacion': 'Asociación',
  'empresa': 'Empresa',
  'otro': 'Otro',
};

export function SourcesDashboard({ sources, filters, onFiltersChange }: SourcesDashboardProps) {
  const stats = useMemo(() => {
    const byTipo: Record<string, number> = {};
    const byPais: Record<string, number> = {};
    const bySector: Record<string, number> = {};
    
    let activeSources = 0;
    let totalTechsFound = 0;

    sources.forEach(s => {
      if (s.activo !== false) activeSources++;
      totalTechsFound += s.tecnologias_encontradas || 0;
      
      const tipo = s.tipo || "Sin clasificar";
      byTipo[tipo] = (byTipo[tipo] || 0) + 1;
      
      const pais = s.pais || "Sin región";
      byPais[pais] = (byPais[pais] || 0) + 1;
      
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

  const hasActiveFilters = filters.tipo || filters.pais || filters.sector || filters.search;

  const clearFilters = () => {
    onFiltersChange({ tipo: '', pais: '', sector: '', search: '' });
  };

  if (sources.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {stats.active} activas · {stats.totalTechs} tecnologías
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
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {stats.byTipo.slice(0, 5).map(({ label, count }) => (
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
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {stats.byPais.slice(0, 5).map(({ label, count }) => (
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
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {stats.bySector.slice(0, 5).map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{label}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fuentes..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="h-9"
          />
        </div>

        <Select
          value={filters.tipo || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, tipo: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[160px] h-9 bg-background">
            <SelectValue placeholder="Temática" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">Todas las temáticas</SelectItem>
            {stats.byTipo.map(({ label }) => (
              <SelectItem key={label} value={label}>
                {TIPO_LABELS[label] || label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.pais || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, pais: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[160px] h-9 bg-background">
            <SelectValue placeholder="Región" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">Todas las regiones</SelectItem>
            {stats.byPais.map(({ label }) => (
              <SelectItem key={label} value={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sector || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, sector: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[160px] h-9 bg-background">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">Todos los sectores</SelectItem>
            {stats.bySector.map(({ label }) => (
              <SelectItem key={label} value={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
