import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AISearchBarProps {
  onResults: (ids: string[] | null, explanation?: string) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
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
  setIsSearching 
}) => {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch top sectors and tech types for dynamic suggestions
  const { data: dynamicData } = useQuery({
    queryKey: ['ai-search-suggestions'],
    queryFn: async () => {
      const { data: technologies } = await supabase
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

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setIsSearching(true);
    setExplanation(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search-technologies', {
        body: { query: searchQuery.trim() }
      });

      // Handle HTTP-level errors from invoke (e.g., network issues)
      if (error) {
        throw new Error(error.message);
      }

      // Handle application-level errors returned in the response body
      if (data.error) {
        // Detect specific status codes via error message content
        const errMsg: string = data.error;

        if (errMsg.includes('demasiado amplia') || errMsg.toLowerCase().includes('context')) {
          // 400 - context too long
          toast({
            title: 'Búsqueda demasiado amplia',
            description: 'Prueba añadir más palabras clave: sector, aplicación, TRL o proveedor para afinar la búsqueda.',
            variant: 'destructive',
          });
        } else if (errMsg.includes('Límite de tasa') || errMsg.includes('rate')) {
          // 429 - rate limit
          toast({
            title: 'Demasiadas solicitudes',
            description: 'Has realizado muchas búsquedas seguidas. Espera unos segundos e inténtalo de nuevo.',
            variant: 'destructive',
          });
        } else if (errMsg.includes('pago') || errMsg.includes('payment') || errMsg.includes('402')) {
          // 402 - payment required
          toast({
            title: 'Créditos agotados',
            description: 'Se requiere recargar créditos de IA. Contacta al administrador.',
            variant: 'destructive',
          });
        } else {
          // Generic error
          toast({
            title: 'Error en búsqueda',
            description: errMsg,
            variant: 'destructive',
          });
        }

        onResults(null);
        return;
      }

      const matchingIds = data.matching_ids || [];
      setExplanation(data.explanation || null);
      
      if (matchingIds.length === 0) {
        toast({
          title: 'Sin resultados',
          description: data.explanation || 'No se encontraron tecnologías que coincidan con tu búsqueda. Intenta con términos más generales o sinónimos.',
        });
      } else {
        toast({
          title: `${matchingIds.length} tecnología${matchingIds.length > 1 ? 's' : ''} encontrada${matchingIds.length > 1 ? 's' : ''}`,
          description: data.explanation,
        });
      }

      onResults(matchingIds, data.explanation);
    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servicio de IA. Verifica tu conexión e inténtalo de nuevo.',
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
    executeSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    executeSearch(suggestion);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar con IA: ej. tecnologías de detección de fugas en tuberías, oxidación avanzada para farmacéutica..."
            className="pl-10 pr-10"
            disabled={isSearching}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={!query.trim() || isSearching}
          className="gap-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Buscar con IA
            </>
          )}
        </Button>
      </div>

      {/* Quick search suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Sugerencias:</span>
        {searchSuggestions.map((suggestion) => (
          <Badge
            key={suggestion}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors text-xs"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            {suggestion}
          </Badge>
        ))}
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
