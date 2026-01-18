import React from 'react';
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
import { DownloadTechnologyButton } from '@/components/DownloadTechnologyButton';
import type { Technology } from '@/types/database';

interface TechnologyTableProps {
  technologies: Technology[];
  onRowClick: (tech: Technology) => void;
}

/**
 * TechnologyTable - Simplified version
 * 
 * This component no longer queries taxonomy tables (taxonomy_tipos, taxonomy_subcategorias,
 * taxonomy_sectores, technology_tipos) from the external DB as they don't exist.
 * Instead, it displays the text fields directly from the technologies table.
 */
export const TechnologyTable: React.FC<TechnologyTableProps> = ({ technologies, onRowClick }) => {
  // Display tipo from text field
  const getTipoDisplay = (tech: Technology) => {
    if (tech["Tipo de tecnología"]) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {tech["Tipo de tecnología"]}
        </Badge>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  // Display subcategoria from text field
  const getSubcategoriaDisplay = (tech: Technology) => {
    if (tech["Subcategoría"]) {
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {tech["Subcategoría"]}
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  };

  // Display sector from text field
  const getSectorDisplay = (tech: Technology) => {
    if (tech["Sector y subsector"]) {
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {tech["Sector y subsector"]}
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
                  <span className={`line-clamp-2 ${isInactive ? 'text-muted-foreground' : ''}`}>{tech["Nombre de la tecnología"]}</span>
                  {isInactive && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">
                      Inactiva
                    </Badge>
                  )}
                </div>
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