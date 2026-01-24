/**
 * Tab for detecting and managing potential duplicate technologies
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ChevronDown, ChevronRight, Search, ExternalLink, Merge, Trash2, Check } from 'lucide-react';
import type { DuplicateGroup, QualityIssue } from '@/hooks/useDataQualityStats';

interface DuplicatesTabProps {
  duplicateGroups: DuplicateGroup[];
  onOpenTechnology: (id: string) => void;
  onMarkAsNotDuplicate?: (groupKey: string) => void;
}

function DuplicateGroupCard({ 
  group, 
  onOpenTechnology,
  onMarkAsNotDuplicate,
}: { 
  group: DuplicateGroup; 
  onOpenTechnology: (id: string) => void;
  onMarkAsNotDuplicate?: (groupKey: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const typeLabel = {
    exact: 'Coincidencia exacta',
    normalized: 'Nombres similares',
    provider: 'Mismo proveedor',
  }[group.similarityType];

  const typeColor = {
    exact: 'bg-destructive/10 text-destructive border-destructive/20',
    normalized: 'bg-amber-100 text-amber-800 border-amber-300',
    provider: 'bg-blue-100 text-blue-800 border-blue-300',
  }[group.similarityType];

  // Get unique providers in group
  const uniqueProviders = [...new Set(group.technologies.map(t => t.proveedor).filter(Boolean))];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">
                    {group.technologies.length} tecnologías similares
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {group.technologies[0].nombre.slice(0, 50)}
                    {group.technologies[0].nombre.length > 50 && '...'}
                    {uniqueProviders.length === 1 && ` • ${uniqueProviders[0]}`}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={typeColor}>
                {typeLabel}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>TRL</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.technologies.map((tech, index) => (
                  <TableRow key={tech.id} className={index === 0 ? 'bg-muted/30' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                        <span className="font-medium line-clamp-1">{tech.nombre}</span>
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
                            className="text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{tech.pais || '—'}</TableCell>
                    <TableCell className="text-sm">{tech.trl || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tech.status || 'activo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenTechnology(tech.id)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" disabled>
                <Merge className="h-4 w-4 mr-1" />
                Fusionar (próximamente)
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onMarkAsNotDuplicate?.(group.key)}
              >
                <Check className="h-4 w-4 mr-1" />
                No son duplicados
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function DuplicatesTab({ duplicateGroups, onOpenTechnology, onMarkAsNotDuplicate }: DuplicatesTabProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'normalized' | 'provider'>('all');

  // Filter groups
  const filteredGroups = useMemo(() => {
    let result = duplicateGroups;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(g => g.similarityType === filterType);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(g => 
        g.technologies.some(t => 
          t.nombre.toLowerCase().includes(searchLower) ||
          t.proveedor?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Sort by group size (larger first)
    return [...result].sort((a, b) => b.technologies.length - a.technologies.length);
  }, [duplicateGroups, filterType, search]);

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.technologies.length, 0);
  const nameGroups = duplicateGroups.filter(g => g.similarityType === 'normalized');
  const providerGroups = duplicateGroups.filter(g => g.similarityType === 'provider');

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Copy className="h-5 w-5" />
            Detección de Duplicados
          </CardTitle>
          <CardDescription>
            Tecnologías que podrían estar duplicadas basándose en similitud de nombre o mismo proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${filterType === 'all' ? 'bg-blue-100 border-blue-300' : ''}`}
              onClick={() => setFilterType('all')}
            >
              {duplicateGroups.length} grupos ({totalDuplicates} tecnologías)
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer ${filterType === 'normalized' ? 'bg-amber-100 border-amber-300' : ''}`}
              onClick={() => setFilterType('normalized')}
            >
              {nameGroups.length} por nombre similar
            </Badge>
            <Badge 
              variant="outline"
              className={`cursor-pointer ${filterType === 'provider' ? 'bg-blue-100 border-blue-300' : ''}`}
              onClick={() => setFilterType('provider')}
            >
              {providerGroups.length} por mismo proveedor
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en duplicados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Duplicate Groups */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search || filterType !== 'all' 
              ? 'No se encontraron grupos con los filtros aplicados' 
              : '¡Excelente! No se detectaron posibles duplicados.'
            }
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.slice(0, 20).map(group => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              onOpenTechnology={onOpenTechnology}
              onMarkAsNotDuplicate={onMarkAsNotDuplicate}
            />
          ))}
          {filteredGroups.length > 20 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Mostrando 20 de {filteredGroups.length} grupos. Refine la búsqueda para ver más.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
