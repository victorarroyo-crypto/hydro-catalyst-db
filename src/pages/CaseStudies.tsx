import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Search, 
  MapPin, 
  Building2, 
  Tag,
  Calendar,
  ExternalLink,
  Trash2,
  Loader2,
} from 'lucide-react';

interface CaseStudy {
  id: string;
  name: string;
  description: string | null;
  entity_type: string | null;
  country: string | null;
  sector: string | null;
  technology_types: string[] | null;
  original_data: Record<string, unknown> | null;
  source_technology_id: string | null;
  created_at: string;
}

const CaseStudies: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);

  const isAdmin = profile?.role === 'admin';

  // Fetch case studies
  const { data: caseStudies, isLoading } = useQuery({
    queryKey: ['case-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos_de_estudio')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CaseStudy[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('casos_de_estudio')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      setSelectedCase(null);
      toast({ title: 'Caso de estudio eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Get unique countries and entity types for filters
  const countries = [...new Set(caseStudies?.map(c => c.country).filter(Boolean) || [])].sort();
  const entityTypes = [...new Set(caseStudies?.map(c => c.entity_type).filter(Boolean) || [])].sort();

  // Filter case studies
  const filteredCases = caseStudies?.filter(caseStudy => {
    const matchesSearch = !searchQuery || 
      caseStudy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseStudy.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = countryFilter === 'all' || caseStudy.country === countryFilter;
    const matchesEntityType = entityTypeFilter === 'all' || caseStudy.entity_type === entityTypeFilter;

    return matchesSearch && matchesCountry && matchesEntityType;
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Casos de Estudio</h1>
            <p className="text-muted-foreground">
              Proyectos municipales, corporaciones y casos de implementación
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {caseStudies?.length || 0} casos
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos de estudio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country!}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay casos de estudio</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery || countryFilter !== 'all' || entityTypeFilter !== 'all'
                ? 'No se encontraron casos que coincidan con los filtros.'
                : 'Los casos de estudio aparecerán aquí cuando se muevan desde tecnologías.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((caseStudy) => (
            <Card 
              key={caseStudy.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedCase(caseStudy)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {caseStudy.name}
                  </CardTitle>
                  {caseStudy.entity_type && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {caseStudy.entity_type}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  {caseStudy.country && (
                    <>
                      <MapPin className="w-3 h-3" />
                      {caseStudy.country}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {caseStudy.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {caseStudy.description}
                  </p>
                )}
                {caseStudy.technology_types && caseStudy.technology_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {caseStudy.technology_types.slice(0, 3).map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {caseStudy.technology_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{caseStudy.technology_types.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCase.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-4 flex-wrap">
                  {selectedCase.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedCase.country}
                    </span>
                  )}
                  {selectedCase.entity_type && (
                    <Badge variant="secondary">{selectedCase.entity_type}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedCase.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCase.description}
                    </p>
                  </div>
                )}

                {selectedCase.sector && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Sector</h4>
                    <Badge variant="outline">{selectedCase.sector}</Badge>
                  </div>
                )}

                {selectedCase.technology_types && selectedCase.technology_types.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tipos de Tecnología</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.technology_types.map((type, i) => (
                        <Badge key={i} variant="secondary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCase.original_data && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Datos Originales</h4>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48">
                      <pre>{JSON.stringify(selectedCase.original_data, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Creado: {new Date(selectedCase.created_at).toLocaleDateString('es-ES')}
                  </span>
                  
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedCase.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseStudies;
