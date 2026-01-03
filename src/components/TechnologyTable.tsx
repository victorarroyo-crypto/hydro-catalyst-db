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
import type { Technology } from '@/types/database';

interface TechnologyTableProps {
  technologies: Technology[];
  onRowClick: (tech: Technology) => void;
}

export const TechnologyTable: React.FC<TechnologyTableProps> = ({ technologies, onRowClick }) => {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Nombre de la tecnología</TableHead>
            <TableHead className="font-semibold">Proveedor / Empresa</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
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
              <TableCell className="text-muted-foreground max-w-xs">
                <span className="line-clamp-1">{tech["Proveedor / Empresa"] || '—'}</span>
              </TableCell>
              <TableCell>
                {tech["Tipo de tecnología"] && (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {tech["Tipo de tecnología"]}
                  </Badge>
                )}
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
