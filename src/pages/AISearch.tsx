import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Search, Loader2, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TRLBadge } from '@/components/TRLBadge';
import { Link } from 'react-router-dom';

interface SearchResult {
  matching_ids: string[];
  explanation: string;
  total_analyzed?: number;
  note?: string;
}

interface Technology {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Proveedor / Empresa": string | null;
  "Grado de madurez (TRL)": number | null;
  "Descripción técnica breve": string | null;
}

const AISearch: React.FC = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [technologies, setTechnologies] = useState<Technology[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Consulta vacía',
        description: 'Por favor, escribe qué tipo de tecnología buscas',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setResults(null);
    setTechnologies([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search-technologies', {
        body: { query: query.trim() },
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
            .select('id, "Nombre de la tecnología", "Tipo de tecnología", "Proveedor / Empresa", "Grado de madurez (TRL)", "Descripción técnica breve"')
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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          Búsqueda con IA
        </h1>
        <p className="text-muted-foreground">
          Encuentra tecnologías usando lenguaje natural
        </p>
      </div>

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

      {results && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Explicación de la IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{results.explanation}</p>
              {results.note && (
                <p className="text-sm text-muted-foreground/70 mt-2 italic">{results.note}</p>
              )}
              {results.total_analyzed && (
                <Badge variant="secondary" className="mt-2">
                  {results.total_analyzed} tecnologías analizadas
                </Badge>
              )}
            </CardContent>
          </Card>

          {technologies.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                {technologies.length} resultado{technologies.length !== 1 ? 's' : ''} encontrado{technologies.length !== 1 ? 's' : ''}
              </h3>
              {technologies.map((tech, index) => (
                <Card key={tech.id} className="hover:border-primary/30 transition-colors">
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
                      <Link to={`/technologies?id=${tech.id}`}>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
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
    </div>
  );
};

export default AISearch;
