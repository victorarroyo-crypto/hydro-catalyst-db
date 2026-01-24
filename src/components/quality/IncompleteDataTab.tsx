/**
 * Tab component for viewing and fixing technologies with missing data
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink, Edit, Filter, X } from 'lucide-react';
import type { QualityIssue } from '@/hooks/useDataQualityStats';

interface IncompleteDataTabProps {
  technologies: QualityIssue[];
  initialFilter?: string;
  onOpenTechnology: (id: string) => void;
}

const ISSUE_LABELS: Record<string, string> = {
  sin_proveedor: 'Sin Proveedor',
  sin_web: 'Sin Web',
  sin_pais: 'Sin País',
  sin_email: 'Sin Email',
  descripcion_corta: 'Descripción Corta',
  sin_trl: 'Sin TRL',
  sin_ventaja: 'Sin Ventaja',
  sin_innovacion: 'Sin Innovación',
  sin_aplicacion: 'Sin Aplicación',
  sin_clasificar: 'Sin Clasificar',
  nombre_generico: 'Nombre Genérico',
};

export function IncompleteDataTab({ technologies, initialFilter, onOpenTechnology }: IncompleteDataTabProps) {
  const [search, setSearch] = useState('');
  const [issueFilter, setIssueFilter] = useState<string>(initialFilter || 'all');
  const [sortBy, setSortBy] = useState<'issues' | 'name' | 'date'>('issues');

  // Get only technologies with issues
  const technologiesWithIssues = useMemo(() => {
    return technologies.filter(tech => tech.issues.length > 0);
  }, [technologies]);

  // Apply filters
  const filteredTechnologies = useMemo(() => {
    let result = technologiesWithIssues;

    // Filter by issue type
    if (issueFilter !== 'all') {
      result = result.filter(tech => tech.issues.includes(issueFilter));
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(tech => 
        tech.nombre.toLowerCase().includes(searchLower) ||
        tech.proveedor?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'issues') {
        return b.issues.length - a.issues.length;
      }
      if (sortBy === 'name') {
        return a.nombre.localeCompare(b.nombre);
      }
      // Sort by date (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [technologiesWithIssues, issueFilter, search, sortBy]);

  // Get unique issue types for filter
  const availableIssues = useMemo(() => {
    const issues = new Set<string>();
    technologiesWithIssues.forEach(tech => {
      tech.issues.forEach(issue => issues.add(issue));
    });
    return Array.from(issues).sort();
  }, [technologiesWithIssues]);

  const clearFilters = () => {
    setSearch('');
    setIssueFilter('all');
    setSortBy('issues');
  };

  const hasActiveFilters = search || issueFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o proveedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={issueFilter} onValueChange={setIssueFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por problema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los problemas</SelectItem>
                {availableIssues.map(issue => (
                  <SelectItem key={issue} value={issue}>
                    {ISSUE_LABELS[issue] || issue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issues">Más problemas</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="date">Más recientes</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredTechnologies.length} de {technologiesWithIssues.length} tecnologías con problemas
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tecnología</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Problemas</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnologies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters 
                      ? 'No se encontraron tecnologías con los filtros aplicados'
                      : 'Todas las tecnologías están completas'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnologies.slice(0, 100).map(tech => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-1">{tech.nombre}</p>
                        {tech.pais && (
                          <p className="text-xs text-muted-foreground">{tech.pais}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{tech.proveedor || '—'}</span>
                        {tech.web && (
                          <a 
                            href={tech.web} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tech.issues.slice(0, 4).map(issue => (
                          <Badge 
                            key={issue} 
                            variant="outline" 
                            className="text-xs bg-destructive/10 text-destructive border-destructive/20"
                          >
                            {ISSUE_LABELS[issue] || issue}
                          </Badge>
                        ))}
                        {tech.issues.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{tech.issues.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenTechnology(tech.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredTechnologies.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Mostrando 100 de {filteredTechnologies.length} resultados. Use los filtros para refinar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
