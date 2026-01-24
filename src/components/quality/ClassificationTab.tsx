/**
 * Tab for managing technologies without taxonomy classification
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag, Search, Edit, Brain, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { QualityIssue } from '@/hooks/useDataQualityStats';

interface ClassificationTabProps {
  technologies: QualityIssue[];
  onOpenTechnology: (id: string) => void;
  onClassifyWithAI?: () => void;
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

export function ClassificationTab({ technologies, onOpenTechnology, onClassifyWithAI }: ClassificationTabProps) {
  const [search, setSearch] = useState('');
  const [missingFilter, setMissingFilter] = useState<'all' | 'tipo' | 'subcategoria' | 'sector'>('all');

  // Fetch taxonomy data
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('taxonomy_tipos')
        .select('id, codigo, nombre')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  const { data: subcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
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
      const { data, error } = await externalSupabase
        .from('taxonomy_sectores')
        .select('id, nombre')
        .order('nombre');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  // Filter unclassified technologies
  const unclassifiedTechs = useMemo(() => {
    return technologies.filter(tech => tech.issues.includes('sin_clasificar'));
  }, [technologies]);

  // Apply filters
  const filteredTechs = useMemo(() => {
    let result = unclassifiedTechs;

    // Filter by what's missing
    if (missingFilter === 'tipo') {
      result = result.filter(t => !t.tipo_id);
    } else if (missingFilter === 'subcategoria') {
      result = result.filter(t => !t.subcategoria_id);
    } else if (missingFilter === 'sector') {
      result = result.filter(t => !t.sector_id);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(tech => 
        tech.nombre.toLowerCase().includes(searchLower) ||
        tech.proveedor?.toLowerCase().includes(searchLower) ||
        tech.descripcion?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [unclassifiedTechs, missingFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const noTipo = unclassifiedTechs.filter(t => !t.tipo_id).length;
    const noSubcat = unclassifiedTechs.filter(t => !t.subcategoria_id).length;
    const noSector = unclassifiedTechs.filter(t => !t.sector_id).length;
    return { noTipo, noSubcat, noSector };
  }, [unclassifiedTechs]);

  // Get tipo name by ID
  const getTipoName = (tipoId: number | null) => {
    if (!tipoId || !tipos) return null;
    const tipo = tipos.find(t => t.id === tipoId);
    return tipo?.nombre || null;
  };

  // Get sector name by ID
  const getSectorName = (sectorId: string | null) => {
    if (!sectorId || !sectores) return null;
    const sector = sectores.find(s => s.id === sectorId);
    return sector?.nombre || null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-violet-500/30 bg-violet-50/50 dark:bg-violet-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
            <Tag className="h-5 w-5" />
            Clasificación de Taxonomía
          </CardTitle>
          <CardDescription>
            Tecnologías que necesitan ser clasificadas en el sistema de taxonomía de 3 niveles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${missingFilter === 'all' ? 'bg-violet-100 border-violet-300' : ''}`}
              onClick={() => setMissingFilter('all')}
            >
              {unclassifiedTechs.length} sin clasificar
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer ${missingFilter === 'tipo' ? 'bg-red-100 border-red-300' : ''}`}
              onClick={() => setMissingFilter('tipo')}
            >
              {stats.noTipo} sin tipo
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer ${missingFilter === 'subcategoria' ? 'bg-amber-100 border-amber-300' : ''}`}
              onClick={() => setMissingFilter('subcategoria')}
            >
              {stats.noSubcat} sin subcategoría
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer ${missingFilter === 'sector' ? 'bg-blue-100 border-blue-300' : ''}`}
              onClick={() => setMissingFilter('sector')}
            >
              {stats.noSector} sin sector
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search and Actions */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tecnologías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {onClassifyWithAI && (
          <Button variant="outline" onClick={onClassifyWithAI}>
            <Brain className="h-4 w-4 mr-2" />
            Clasificar con IA
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tecnología</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p>
                        {search || missingFilter !== 'all' 
                          ? 'No se encontraron tecnologías con los filtros aplicados'
                          : '¡Excelente! Todas las tecnologías están clasificadas.'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechs.slice(0, 50).map(tech => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-1">{tech.nombre}</p>
                        {tech.descripcion && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {tech.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{tech.proveedor || '—'}</TableCell>
                    <TableCell>
                      {tech.tipo_id ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200">
                          {getTipoName(tech.tipo_id) || tech.tipo}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tech.subcategoria_id ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200">
                          {(tech.subcategorias && tech.subcategorias.length > 0 ? tech.subcategorias[0] : null) || `ID: ${tech.subcategoria_id}`}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tech.sector_id ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200">
                          {getSectorName(tech.sector_id) || tech.sector}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenTechnology(tech.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Clasificar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredTechs.length > 50 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Mostrando 50 de {filteredTechs.length} tecnologías. Use los filtros para refinar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
