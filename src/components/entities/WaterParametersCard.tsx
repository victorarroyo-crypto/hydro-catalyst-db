import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Beaker } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import type { WaterParameter } from '@/types/documentEntities';

interface WaterParametersCardProps {
  projectId: string;
}

export function WaterParametersCard({ projectId }: WaterParametersCardProps) {
  const [parameters, setParameters] = useState<WaterParameter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectEntitiesService.getParametersSummary(projectId)
      .then((res) => setParameters(res.parameters))
      .catch(() => setParameters([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-48" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5" />
          Parámetros de Agua
        </CardTitle>
        <CardDescription>
          {parameters.length} parámetros extraídos de análisis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {parameters.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay parámetros extraídos. Sube un informe de análisis para detectarlos.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parámetro</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Límite</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.slice(0, 10).map((param, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{param.name}</TableCell>
                  <TableCell className="text-right">
                    {param.value} <span className="text-muted-foreground">{param.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {param.limit || '-'}
                  </TableCell>
                  <TableCell>
                    {param.compliant === null ? (
                      <span className="text-muted-foreground">-</span>
                    ) : param.compliant ? (
                      <Badge className="bg-green-500">OK</Badge>
                    ) : (
                      <Badge variant="destructive">Excede</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {parameters.length > 10 && (
        <CardFooter>
          <Button variant="link" size="sm" asChild>
            <Link to={`/consultoria/${projectId}/entities?type=parameter`}>
              Ver todos ({parameters.length})
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
