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
import { Star } from 'lucide-react';
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

interface TaxonomySector {
  id: string;
  nombre: string;
}

interface TechnologyTipoRelation {
  technology_id: string;
  tipo_id: number;
  is_primary: boolean;
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
    staleTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 60 * 10,
  });

  const { data: sectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('id, nombre');
      if (error) throw error;
      return data as TaxonomySector[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch technology_tipos relationships for all displayed technologies
  const technologyIds = technologies.map(t => t.id);
  const { data: technologyTipos } = useQuery({
    queryKey: ['technology-tipos-batch', technologyIds],
    queryFn: async () => {
      if (technologyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('technology_tipos')
        .select('technology_id, tipo_id, is_primary')
        .in('technology_id', technologyIds);
      if (error) throw error;
      return data as TechnologyTipoRelation[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: technologyIds.length > 0,
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

  const sectoresMap = React.useMemo(() => {
    const map = new Map<string, TaxonomySector>();
    sectores?.forEach(s => map.set(s.id, s));
    return map;
  }, [sectores]);

  // Create map of technology_id to tipos
  const techTiposMap = React.useMemo(() => {
    const map = new Map<string, TechnologyTipoRelation[]>();
    technologyTipos?.forEach(tt => {
      const existing = map.get(tt.technology_id) || [];
      existing.push(tt);
      map.set(tt.technology_id, existing);
    });
    return map;
  }, [technologyTipos]);

  const getTipoDisplay = (tech: Technology) => {
    const techTipos = techTiposMap.get(tech.id) || [];
    
    if (techTipos.length > 0) {
      // Sort to show primary first
      const sorted = [...techTipos].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      const primaryTipo = sorted[0];
      const tipo = tiposMap.get(primaryTipo.tipo_id);
      
      if (tipo) {
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="default" className="text-xs gap-1">
              {primaryTipo.is_primary && techTipos.length > 1 && (
                <Star className="w-2.5 h-2.5 fill-current" />
              )}
              <span className="font-mono text-[10px] opacity-70">{tipo.codigo}</span>
              <span className="hidden xl:inline">{tipo.nombre}</span>
            </Badge>
            {techTipos.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                +{techTipos.length - 1}
              </Badge>
            )}
          </div>
        );
      }
    }
    
    // Fallback to legacy tipo_id
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
    
    // Fallback to legacy text
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

  const getSectorDisplay = (tech: Technology) => {
    const sectorId = (tech as any).sector_id;
    if (sectorId && sectoresMap.has(sectorId)) {
      const sector = sectoresMap.get(sectorId)!;
      return (
        <Badge variant="outline" className="text-xs">
          <span className="font-mono text-[10px] opacity-70 mr-1">{sector.id}</span>
          <span className="hidden xl:inline">{sector.nombre}</span>
        </Badge>
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
            <TableHead className="font-semibold">Sector</TableHead>
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
              <TableCell>
                {getSectorDisplay(tech)}
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
