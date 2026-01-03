import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';

interface AISearchBarProps {
  onResults: (ids: string[] | null, explanation?: string) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
}

export const AISearchBar: React.FC<AISearchBarProps> = ({ 
  onResults, 
  isSearching, 
  setIsSearching 
}) => {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setExplanation(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search-technologies', {
        body: { query: query.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast({
          title: 'Error en búsqueda',
          description: data.error,
          variant: 'destructive',
        });
        onResults(null);
        return;
      }

      const matchingIds = data.matching_ids || [];
      setExplanation(data.explanation || null);
      
      if (matchingIds.length === 0) {
        toast({
          title: 'Sin resultados',
          description: data.explanation || 'No se encontraron tecnologías que coincidan con tu búsqueda.',
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
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al realizar la búsqueda',
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
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
      
      {explanation && (
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      )}
    </div>
  );
};
