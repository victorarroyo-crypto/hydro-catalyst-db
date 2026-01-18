import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export interface AISearchFilters {
  tipoId?: number | null;
  subcategoriaId?: number | null;
  sectorId?: string | null;
  tipoTecnologia?: string | null;
  subcategoria?: string | null;
  sector?: string | null;
  pais?: string | null;
  trlMin?: number | null;
  trlMax?: number | null;
  estado?: string | null;
}

interface AISearchBarProps {
  onResults: (ids: string[] | null, explanation?: string) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  activeFilters?: AISearchFilters;
}

// Static fallback suggestions
const staticSuggestions = [
  'TRL alto',
  'detección de fugas',
  'oxidación avanzada',
];

export const AISearchBar: React.FC<AISearchBarProps> = ({ 
  onResults, 
  isSearching, 
  setIsSearching,
  activeFilters 
}) => {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch top sectors and tech types for dynamic suggestions
  const { data: dynamicData } = useQuery({
    queryKey: ['ai-search-suggestions'],
    queryFn: async () => {
      const { data: technologies } = await externalSupabase
        .from('technologies')
        .select('"Sector y subsector", "Tipo de tecnología"')
        .or('status.eq.active,status.is.null');

      if (!technologies) return { sectors: [], types: [] };

      // Count occurrences
      const sectorCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      technologies.forEach((t) => {
        const sector = t['Sector y subsector'];
        const type = t['Tipo de tecnología'];
        if (sector) sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      // Get top 3 of each
      const topSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return { sectors: topSectors, types: topTypes };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const searchSuggestions = useMemo(() => {
    const dynamic: string[] = [];
    if (dynamicData?.sectors) {
      dynamicData.sectors.forEach((s) => dynamic.push(`sector ${s.toLowerCase()}`));
    }
    if (dynamicData?.types) {
      dynamicData.types.forEach((t) => dynamic.push(t));
    }
    // Combine with static, dedupe, limit to 8
    const all = [...staticSuggestions, ...dynamic];
    const unique = Array.from(new Set(all));
    return unique.slice(0, 8);
  }, [dynamicData]);

  // Count active filters for display
  const activeFilterCount = useMemo(() => {
    if (!activeFilters) return 0;
    return Object.values(activeFilters).filter(v => v !== null && v !== undefined).length;
  }, [activeFilters]);

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setIsSearching(true);
    setExplanation(null);

    try {
      const response = await fetch('https://watertech-scouting-production.up.railway.app/api/technologies/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          top_k: 100,
          similarity_threshold: 0.4
        })
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error || `Error ${response.status}`;

        if (response.status === 429) {
          toast({
            title: 'Demasiadas solicitudes',
            description: 'Has realizado muchas búsquedas seguidas. Espera unos segundos e inténtalo de nuevo.',
            variant: 'destructive',
          });
        } else if (response.status === 402) {
          toast({
            title: 'Créditos agotados',
            description: 'Se requiere recargar créditos de IA. Contacta al administrador.',
            variant: 'destructive',
          });
        } else if (response.status === 400) {
          toast({
            title: 'Búsqueda demasiado amplia',
            description: 'Prueba añadir más palabras clave: sector, aplicación, TRL o proveedor para afinar la búsqueda.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error en búsqueda',
            description: errMsg,
            variant: 'destructive',
          });
        }

        onResults(null);
        return;
      }

      const data = await response.json();

      // Handle application-level errors
      if (!data.success) {
        toast({
          title: 'Error en búsqueda',
          description: data.error || 'Error desconocido',
          variant: 'destructive',
        });
        onResults(null);
        return;
      }

      // Extract IDs from technologies array
      const matchingIds = data.technologies?.map((t: { id: string }) => t.id) || [];
      const explanationText = matchingIds.length > 0 
        ? `Búsqueda semántica: ${data.total} resultados ordenados por relevancia`
        : 'No se encontraron tecnologías similares';
      
      setExplanation(explanationText);
      
      if (matchingIds.length === 0) {
        toast({
          title: 'Sin resultados',
          description: 'No se encontraron tecnologías que coincidan con tu búsqueda. Intenta con términos más generales o sinónimos.',
        });
      } else {
        toast({
          title: `${matchingIds.length} tecnología${matchingIds.length > 1 ? 's' : ''} encontrada${matchingIds.length > 1 ? 's' : ''}`,
          description: explanationText,
        });
      }

      onResults(matchingIds, explanationText);
    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servicio de búsqueda. Verifica tu conexión e inténtalo de nuevo.',
        variant: 'destructive',
      });
      onResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setExplanation(null);
    onResults(null);
  };

  const handleSearch = () => {
    setActiveSuggestion(null);
    executeSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Toggle selection
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  const handleCombinedSearch = () => {
    if (selectedSuggestions.size === 0) return;
    const combinedQuery = Array.from(selectedSuggestions).join(', ');
    setActiveSuggestion(combinedQuery);
    executeSearch(combinedQuery);
    setSelectedSuggestions(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative flex-1 min-w-0">
          <Sparkles className="absolute left-3 top-3 w-4 h-4 text-primary" />
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSearching) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Buscar con IA: describe lo que necesitas encontrar, ej. tecnologías de detección de fugas, membranas para tratamiento terciario, soluciones para industria farmacéutica con TRL alto..."
            className="w-full min-h-[80px] pl-10 pr-10 py-2.5 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSearching}
            rows={3}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={!query.trim() || isSearching}
          className="gap-2 h-[80px] px-6"
        >
          {isSearching ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Buscando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Search className="w-5 h-5" />
              <span className="text-xs">Buscar IA</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  +{activeFilterCount}
                </Badge>
              )}
            </div>
          )}
        </Button>
      </div>

      {/* Quick search suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Sugerencias:</span>
        {searchSuggestions.map((suggestion) => {
          const isSelected = selectedSuggestions.has(suggestion);
          const isActiveSearching = isSearching && activeSuggestion?.includes(suggestion);
          return (
            <Badge
              key={suggestion}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-colors text-xs ${
                isActiveSearching 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-primary/10 hover:border-primary/50'
              } ${isSearching ? 'pointer-events-none opacity-70' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {isActiveSearching && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {suggestion}
            </Badge>
          );
        })}
        {selectedSuggestions.size > 0 && !isSearching && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setSelectedSuggestions(new Set())}
            >
              <X className="w-3 h-3 mr-1" />
              Limpiar
            </Button>
            <Button
              size="sm"
              className="h-6 px-3 text-xs gap-1"
              onClick={handleCombinedSearch}
            >
              <Search className="w-3 h-3" />
              Buscar ({selectedSuggestions.size})
            </Button>
          </>
        )}
      </div>
      
      {explanation && (
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      )}
    </div>
  );
};
