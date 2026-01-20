import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import type { EquipmentItem } from '@/types/documentEntities';

interface EquipmentListCardProps {
  projectId: string;
}

export function EquipmentListCard({ projectId }: EquipmentListCardProps) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectEntitiesService.getEquipmentList(projectId)
      .then((res) => setEquipment(res.equipment))
      .catch(() => setEquipment([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-48" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Lista de Equipos
        </CardTitle>
        <CardDescription>
          {equipment.length} equipos identificados en documentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay equipos extraídos. Sube un P&ID para detectar equipos automáticamente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.slice(0, 10).map((eq) => (
                <TableRow key={eq.tag}>
                  <TableCell className="font-mono font-medium">{eq.tag}</TableCell>
                  <TableCell>{eq.type || eq.name}</TableCell>
                  <TableCell>{eq.capacity || '-'}</TableCell>
                  <TableCell>
                    {eq.verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {equipment.length > 10 && (
        <CardFooter>
          <Button variant="link" size="sm" asChild>
            <Link to={`/consultoria/${projectId}/entities?type=equipment`}>
              Ver todos ({equipment.length})
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
