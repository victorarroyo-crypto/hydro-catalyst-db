import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TRLBadge } from '@/components/TRLBadge';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { Technology } from '@/types/database';

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
}

interface TaxonomySubcategoria {
  id: number;
  codigo: string;
  nombre: string;
}

interface TechnologyTableProps {
  technologies: Technology[];
  onRowClick: (tech: Technology) => void;
}

export const TechnologyTable: React.FC<TechnologyTableProps> = ({ technologies, onRowClick }) => {
  // Fetch all taxonomy data for efficient lookups
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('id, codigo, nombre');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const { data: subcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_subcategorias')
        .select('id, codigo, nombre');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Create lookup maps for efficient access
  const tiposMap = React.useMemo(() => {
    const map = new Map<number, TaxonomyTipo>();
    tipos?.forEach(t => map.set(t.id, t));
    return map;
  }, [tipos]);

  const subcategoriasMap = React.useMemo(() => {
    const map = new Map<number, TaxonomySubcategoria>();
    subcategorias?.forEach(s => map.set(s.id, s));
    return map;
  }, [subcategorias]);

  const getTipoDisplay = (tech: Technology) => {
    const tipoId = (tech as any).tipo_id;
    if (tipoId && tiposMap.has(tipoId)) {
      const tipo = tiposMap.get(tipoId)!;
      return (
        <Badge variant="default" className="text-xs gap-1">
          <span className="font-mono text-[10px] opacity-70">{tipo.codigo}</span>
          <span className="hidden xl:inline">{tipo.nombre}</span>
        </Badge>
      );
    }
    // Fallback to legacy
    if (tech["Tipo de tecnología"]) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {tech["Tipo de tecnología"]}
        </Badge>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  const getSubcategoriaDisplay = (tech: Technology) => {
    const subcategoriaId = (tech as any).subcategoria_id;
    if (subcategoriaId && subcategoriasMap.has(subcategoriaId)) {
      const sub = subcategoriasMap.get(subcategoriaId)!;
      return (
        <Badge variant="secondary" className="text-xs">
          <span className="font-mono text-[10px] opacity-70 mr-1">{sub.codigo}</span>
          <span className="hidden xl:inline">{sub.nombre}</span>
        </Badge>
      );
    }
    // Fallback to legacy
    if (tech["Subcategoría"]) {
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {tech["Subcategoría"]}
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Nombre de la tecnología</TableHead>
            <TableHead className="font-semibold">Proveedor</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">Subcategoría</TableHead>
            <TableHead className="font-semibold text-center">TRL</TableHead>
            <TableHead className="font-semibold">País</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {technologies.map((tech) => (
            <TableRow 
              key={tech.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onRowClick(tech)}
            >
              <TableCell className="font-medium max-w-xs">
                <span className="line-clamp-2">{tech["Nombre de la tecnología"]}</span>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[150px]">
                <span className="line-clamp-1">{tech["Proveedor / Empresa"] || '—'}</span>
              </TableCell>
              <TableCell>
                {getTipoDisplay(tech)}
              </TableCell>
              <TableCell>
                {getSubcategoriaDisplay(tech)}
              </TableCell>
              <TableCell className="text-center">
                <TRLBadge trl={tech["Grado de madurez (TRL)"]} size="sm" />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tech["País de origen"] || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
