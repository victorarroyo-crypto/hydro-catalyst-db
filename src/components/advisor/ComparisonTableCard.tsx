import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import type { ComparisonTable } from '@/types/advisorChat';

interface ComparisonTableCardProps {
  comparison: ComparisonTable;
}

export function ComparisonTableCard({ comparison }: ComparisonTableCardProps) {
  return (
    <Card className="mt-4 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Comparativa de Tecnologías
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Criterio</TableHead>
                {comparison.technologies.map((tech) => (
                  <TableHead key={tech} className="font-semibold text-primary">
                    {tech}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.criteria.map((criterion, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                  <TableCell className="font-medium">{criterion.name}</TableCell>
                  {comparison.technologies.map((tech) => (
                    <TableCell key={tech}>
                      {criterion.values[tech] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
