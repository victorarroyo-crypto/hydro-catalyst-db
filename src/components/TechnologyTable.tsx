import React from 'react';
import { TRLBadge } from '@/components/TRLBadge';
import { TierBadge } from '@/components/TierBadge';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { DownloadTechnologyButton } from '@/components/DownloadTechnologyButton';
import type { Technology } from '@/types/database';

interface TechnologyTableProps {
  technologies: Technology[];
  onRowClick: (tech: Technology) => void;
}

/**
 * TechnologyTable - Displays technologies in a table format
 * 
 * Uses snake_case fields from external DB schema.
 */
export const TechnologyTable: React.FC<TechnologyTableProps> = ({ technologies, onRowClick }) => {
  // Display tipo from tipos array or legacy text field
  const getTipoDisplay = (tech: Technology) => {
    const tipo = tech.tipos?.[0] || tech.tipo;
    if (tipo) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {tipo}
        </Badge>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  // Display subcategoria from subcategorias array
  const getSubcategoriaDisplay = (tech: Technology) => {
    const subcat = tech.subcategorias?.[0];
    if (subcat) {
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {subcat}
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  // Display sector from text field
  const getSectorDisplay = (tech: Technology) => {
    if (tech.sector) {
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {tech.sector}
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
            <TableHead className="font-semibold">Sector</TableHead>
            <TableHead className="font-semibold text-center">TRL</TableHead>
            <TableHead className="font-semibold text-center">Tier</TableHead>
            <TableHead className="font-semibold">País</TableHead>
            <TableHead className="font-semibold w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {technologies.map((tech) => {
            const isInactive = tech.status === 'inactive';
            return (
            <TableRow 
              key={tech.id}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${isInactive ? 'bg-destructive/5 opacity-70' : ''}`}
              onClick={() => onRowClick(tech)}
            >
              <TableCell className="font-medium max-w-xs">
                <div className="flex items-center gap-2">
                  <span className={`line-clamp-2 ${isInactive ? 'text-muted-foreground' : ''}`}>{tech.nombre}</span>
                  {isInactive && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">
                      Inactiva
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[150px]">
                <span className="line-clamp-1">{tech.proveedor || '—'}</span>
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
                <TRLBadge trl={tech.trl} size="sm" />
              </TableCell>
              <TableCell className="text-center">
                <TierBadge tier={tech.tier} evidenceLevel={tech.evidence_level} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tech.pais || '—'}
              </TableCell>
              <TableCell>
                <DownloadTechnologyButton technology={tech} />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
