/**
 * Tab for identifying and fixing technologies with generic/placeholder names
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Edit, Sparkles, Search, Trash2 } from 'lucide-react';
import type { QualityIssue } from '@/hooks/useDataQualityStats';

interface GenericNamesTabProps {
  technologies: QualityIssue[];
  onOpenTechnology: (id: string) => void;
  onDeleteTechnology?: (id: string, name: string) => void;
}

// Common generic patterns with suggestions
const PATTERN_SUGGESTIONS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /^tecnolog[ií]a\s*(de\s*)?/i, suggestion: 'Especificar nombre comercial o técnico' },
  { pattern: /^sistema\s*(de\s*)?/i, suggestion: 'Usar marca o modelo específico' },
  { pattern: /^soluci[oó]n\s*(de\s*|para\s*)?/i, suggestion: 'Indicar tecnología concreta' },
  { pattern: /^tratamiento\s*(de\s*)?/i, suggestion: 'Especificar tipo de tratamiento' },
  { pattern: /^proceso\s*(de\s*)?/i, suggestion: 'Nombrar proceso específico' },
  { pattern: /^equipo\s*(de\s*|para\s*)?/i, suggestion: 'Indicar modelo o fabricante' },
  { pattern: /^planta\s*(de\s*)?/i, suggestion: 'Especificar tipo de planta' },
  { pattern: /^filtro\s*(de\s*)?/i, suggestion: 'Indicar tipo de filtración' },
  { pattern: /^membrana\s*(de\s*)?/i, suggestion: 'Especificar tipo de membrana' },
  { pattern: /sin\s*nombre/i, suggestion: 'Requiere nombre descriptivo' },
  { pattern: /^n\/a$/i, suggestion: 'Requiere nombre real' },
  { pattern: /^-+$/, suggestion: 'Requiere nombre descriptivo' },
  { pattern: /^\d+$/, suggestion: 'Solo contiene números' },
  { pattern: /^test/i, suggestion: 'Parece ser un registro de prueba' },
  { pattern: /^prueba/i, suggestion: 'Parece ser un registro de prueba' },
];

function getSuggestion(name: string): string {
  for (const { pattern, suggestion } of PATTERN_SUGGESTIONS) {
    if (pattern.test(name)) {
      return suggestion;
    }
  }
  return 'Nombre demasiado corto o genérico';
}

function generateSuggestedName(tech: QualityIssue): string {
  const parts: string[] = [];
  
  // Try to build a better name from available data
  const subcategoria = tech.subcategorias && tech.subcategorias.length > 0 ? tech.subcategorias[0] : null;
  if (subcategoria) {
    parts.push(subcategoria);
  } else if (tech.tipo) {
    parts.push(tech.tipo);
  }
  
  if (tech.proveedor) {
    parts.push(`(${tech.proveedor})`);
  }
  
  if (parts.length === 0 && tech.descripcion) {
    // Extract first meaningful phrase from description
    const firstSentence = tech.descripcion.split(/[.,;]/)[0].trim();
    if (firstSentence.length > 10 && firstSentence.length < 60) {
      return firstSentence;
    }
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Revisar descripción para nombre';
}

export function GenericNamesTab({ technologies, onOpenTechnology, onDeleteTechnology }: GenericNamesTabProps) {
  const [search, setSearch] = useState('');

  // Filter only technologies with generic names
  const genericNameTechs = useMemo(() => {
    return technologies.filter(tech => tech.issues.includes('nombre_generico'));
  }, [technologies]);

  // Apply search filter
  const filteredTechs = useMemo(() => {
    if (!search) return genericNameTechs;
    
    const searchLower = search.toLowerCase();
    return genericNameTechs.filter(tech => 
      tech.nombre.toLowerCase().includes(searchLower) ||
      tech.proveedor?.toLowerCase().includes(searchLower) ||
      tech.descripcion?.toLowerCase().includes(searchLower)
    );
  }, [genericNameTechs, search]);

  // Group by pattern type
  const groupedByPattern = useMemo(() => {
    const groups: Record<string, QualityIssue[]> = {};
    
    filteredTechs.forEach(tech => {
      const suggestion = getSuggestion(tech.nombre);
      if (!groups[suggestion]) {
        groups[suggestion] = [];
      }
      groups[suggestion].push(tech);
    });

    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length);
  }, [filteredTechs]);

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Nombres Genéricos Detectados
          </CardTitle>
          <CardDescription>
            Tecnologías con nombres poco descriptivos que dificultan su identificación.
            Se recomienda usar nombres comerciales, modelos específicos o descripciones técnicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {genericNameTechs.length} tecnologías afectadas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en nombres genéricos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grouped Results */}
      {groupedByPattern.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'No se encontraron resultados' : '¡Excelente! No hay nombres genéricos detectados.'}
          </CardContent>
        </Card>
      ) : (
        groupedByPattern.map(([pattern, techs]) => (
          <Card key={pattern}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{pattern}</span>
                <Badge variant="secondary">{techs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Actual</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Nombre Sugerido</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techs.slice(0, 10).map(tech => (
                    <TableRow key={tech.id}>
                      <TableCell>
                        <span className="text-destructive font-medium">{tech.nombre}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tech.proveedor || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-muted-foreground italic">
                            {generateSuggestedName(tech)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenTechnology(tech.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Corregir
                          </Button>
                          {onDeleteTechnology && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onDeleteTechnology(tech.id, tech.nombre)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {techs.length > 10 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  +{techs.length - 10} más en esta categoría
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
