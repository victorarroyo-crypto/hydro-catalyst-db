import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Droplets, AlertTriangle, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { WaterAnalysisResult } from '@/types/advisorChat';
import { cn } from '@/lib/utils';

interface WaterAnalysisCardProps {
  analysis: WaterAnalysisResult;
}

export function WaterAnalysisCard({ analysis }: WaterAnalysisCardProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'normal':
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'bg-destructive/10 text-destructive';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'normal':
      default:
        return 'bg-green-500/10 text-green-700';
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Parameters Table */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 to-transparent">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            Parámetros del Análisis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Parámetro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.parameters.map((param, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{param.name}</TableCell>
                    <TableCell className="text-right font-mono">{param.value}</TableCell>
                    <TableCell className="text-muted-foreground">{param.unit}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={cn('gap-1', getStatusClass(param.status))}
                      >
                        {getStatusIcon(param.status)}
                        {param.status === 'critical' ? 'Crítico' : 
                         param.status === 'warning' ? 'Atención' : 'Normal'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Tecnologías Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {rec.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{rec.technology}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
