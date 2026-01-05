import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Search, Loader2, Info, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TRLBadge } from '@/components/TRLBadge';
import { TechnologyDetailModal } from '@/components/TechnologyDetailModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import type { Technology } from '@/types/database';

interface SearchResult {
  matching_ids: string[];
  explanation: string;
  total_analyzed?: number;
  total_matching_filters?: number;
  note?: string;
  usage?: {
    model: string;
    tokens: number;
    response_time_ms: number;
  };
}

interface SearchFilters {
  tipoId?: number | null;
  subcategoriaId?: number | null;
  sectorId?: string | null;
  pais?: string | null;
  trlMin?: number | null;
  trlMax?: number | null;
}

const AISearch: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTechnology, setSelectedTechnology] = useState<Technology | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    tipoId: null,
    subcategoriaId: null,
    sectorId: null,
    pais: null,
    trlMin: null,
    trlMax: null,
  });
  const [trlRange, setTrlRange] = useState<[number, number]>([1, 9]);

  // Fetch taxonomy data for filters
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('id, codigo, nombre')
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias', filters.tipoId],
    queryFn: async () => {
      let query = supabase.from('taxonomy_subcategorias').select('id, codigo, nombre, tipo_id').order('nombre');
      if (filters.tipoId) {
        query = query.eq('tipo_id', filters.tipoId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: sectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('id, nombre')
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: paises } = useQuery({
    queryKey: ['unique-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technologies')
        .select('"País de origen"')
        .not('"País de origen"', 'is', null);
      if (error) throw error;
      const unique = [...new Set(data.map(d => d["País de origen"]).filter(Boolean))].sort();
      return unique as string[];
    },
  });

  // Re-run search if URL params change (e.g., back navigation)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query && !isSearching) {
      setQuery(urlQuery);
      // Could auto-search here if desired
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Consulta vacía',
        description: 'Por favor, escribe qué tipo de tecnología buscas',
        variant: 'destructive',
      });
      return;
    }

    // Update URL with search query
    setSearchParams({ q: query.trim() });

    setIsSearching(true);
    setResults(null);
    setTechnologies([]);

    try {
      // Build filters object for the API
      const apiFilters: Record<string, any> = {};
      if (filters.tipoId) apiFilters.tipoId = filters.tipoId;
      if (filters.subcategoriaId) apiFilters.subcategoriaId = filters.subcategoriaId;
      if (filters.sectorId) apiFilters.sectorId = filters.sectorId;
      if (filters.pais) apiFilters.pais = filters.pais;
      if (trlRange[0] > 1) apiFilters.trlMin = trlRange[0];
      if (trlRange[1] < 9) apiFilters.trlMax = trlRange[1];

      const hasFilters = Object.keys(apiFilters).length > 0;

      const { data, error } = await supabase.functions.invoke('ai-search-technologies', {
        body: { 
          query: query.trim(),
          filters: hasFilters ? apiFilters : undefined,
        },
      });

      if (error) throw error;

      setResults(data);

      if (data.matching_ids && data.matching_ids.length > 0) {
        // Filter out invalid UUIDs (AI sometimes returns names instead of IDs)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validIds = data.matching_ids.filter((id: string) => uuidRegex.test(id));

        if (validIds.length > 0) {
          const { data: techData, error: techError } = await supabase
            .from('technologies')
            .select('*')
            .in('id', validIds);

          if (techError) throw techError;

          // Order by the AI's ranking
          const orderedTechs = validIds
            .map((id: string) => techData?.find((t) => t.id === id))
            .filter(Boolean) as Technology[];

          setTechnologies(orderedTechs);
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Error en la búsqueda',
        description: error.message || 'No se pudo completar la búsqueda',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewTechnology = (tech: Technology) => {
    setSelectedTechnology(tech);
    setDetailModalOpen(true);
  };

  const clearFilters = () => {
    setFilters({
      tipoId: null,
      subcategoriaId: null,
      sectorId: null,
      pais: null,
      trlMin: null,
      trlMax: null,
    });
    setTrlRange([1, 9]);
  };

  const activeFilterCount = [
    filters.tipoId,
    filters.subcategoriaId,
    filters.sectorId,
    filters.pais,
    trlRange[0] > 1 || trlRange[1] < 9,
  ].filter(Boolean).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          Búsqueda con IA
        </h1>
        <p className="text-muted-foreground">
          Encuentra tecnologías usando lenguaje natural. Aplica filtros para refinar el análisis.
        </p>
      </div>

      {/* Filters Section */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Filtros Previos
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                {filtersOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription>
                Reduce el conjunto de tecnologías antes del análisis con IA
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Tecnología</label>
                <Select
                    value={filters.tipoId?.toString() || '__all__'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      tipoId: value && value !== '__all__' ? parseInt(value) : null,
                      subcategoriaId: null, // Reset subcategory when type changes
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos los tipos</SelectItem>
                      {tipos?.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategoría */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subcategoría</label>
                <Select
                    value={filters.subcategoriaId?.toString() || '__all__'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      subcategoriaId: value && value !== '__all__' ? parseInt(value) : null,
                    }))}
                    disabled={!filters.tipoId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filters.tipoId ? "Todas las subcategorías" : "Selecciona tipo primero"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas las subcategorías</SelectItem>
                      {subcategorias?.filter(s => !filters.tipoId || s.tipo_id === filters.tipoId).map((sub) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {sub.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sector</label>
                <Select
                    value={filters.sectorId || '__all__'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      sectorId: value && value !== '__all__' ? value : null,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los sectores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos los sectores</SelectItem>
                      {sectores?.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* País */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">País de Origen</label>
                <Select
                    value={filters.pais || '__all__'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      pais: value && value !== '__all__' ? value : null,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los países" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos los países</SelectItem>
                      {paises?.map((pais) => (
                        <SelectItem key={pais} value={pais}>
                          {pais}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TRL Range */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Nivel de Madurez (TRL): {trlRange[0]} - {trlRange[1]}
                </label>
                <Slider
                  value={trlRange}
                  onValueChange={(value) => setTrlRange(value as [number, number])}
                  min={1}
                  max={9}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>TRL 1 (Básico)</span>
                  <span>TRL 9 (Comercial)</span>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Search Examples */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            Ejemplos de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            {[
              'Tecnologías para tratar aguas residuales industriales',
              'Membranas de bajo consumo energético',
              'Soluciones para eliminar microplásticos',
              'Tratamiento de lodos con bajo coste',
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setQuery(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Describe qué tecnología necesitas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-12 px-6"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Buscar con IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Explicación de la IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{results.explanation}</p>
              {results.note && (
                <p className="text-sm text-muted-foreground/70 mt-2 italic">{results.note}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {results.total_analyzed && (
                  <Badge variant="secondary">
                    {results.total_analyzed} analizadas
                  </Badge>
                )}
                {results.total_matching_filters && (
                  <Badge variant="outline">
                    {results.total_matching_filters} con filtros
                  </Badge>
                )}
                {results.usage && (
                  <Badge variant="outline" className="text-xs">
                    {results.usage.model.replace('google/', '').replace('openai/', '')} • {Math.round(results.usage.response_time_ms / 1000)}s
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {technologies.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                {technologies.length} resultado{technologies.length !== 1 ? 's' : ''} encontrado{technologies.length !== 1 ? 's' : ''}
              </h3>
              {technologies.map((tech, index) => (
                <Card 
                  key={tech.id} 
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => handleViewTechnology(tech)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <h4 className="font-semibold text-foreground truncate">
                            {tech["Nombre de la tecnología"]}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>{tech["Tipo de tecnología"]}</span>
                          {tech["Proveedor / Empresa"] && (
                            <>
                              <span>•</span>
                              <span>{tech["Proveedor / Empresa"]}</span>
                            </>
                          )}
                          {tech["Grado de madurez (TRL)"] && (
                            <TRLBadge trl={tech["Grado de madurez (TRL)"]} />
                          )}
                        </div>
                        {tech["Descripción técnica breve"] && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {tech["Descripción técnica breve"]}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => {
                        e.stopPropagation();
                        handleViewTechnology(tech);
                      }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No se encontraron tecnologías que coincidan con tu búsqueda
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Technology Detail Modal */}
      <TechnologyDetailModal
        technology={selectedTechnology}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
};

export default AISearch;
