import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import type { EntitiesSummary, EntityType } from '@/types/documentEntities';

interface EntitiesSummaryCardProps {
  projectId: string;
}

const entityTypeIcons: Record<EntityType, string> = {
  equipment: '⚙️',
  instrument: '📊',
  valve: '🔧',
  pipeline: '📏',
  parameter: '🧪',
  limit: '⚠️',
  chemical: '🧴',
  process: '🔄',
  stream: '💧',
  specification: '📋',
  other: '📄',
};

export function EntitiesSummaryCard({ projectId }: EntitiesSummaryCardProps) {
  const [summary, setSummary] = useState<EntitiesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectEntitiesService.getEntitiesSummary(projectId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-32" />;

  if (!summary || summary.total_entities === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Entidades Extraídas
          </CardTitle>
          <CardDescription>
            No hay entidades extraídas aún
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sube documentos técnicos (P&ID, análisis de agua) para extraer entidades automáticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Entidades Extraídas
        </CardTitle>
        <CardDescription>
          {summary.total_entities} entidades · {summary.verified_count} verificadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {Object.entries(summary.by_type || {})
            .filter(([, count]) => count > 0)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-1">
                <span>{entityTypeIcons[type as EntityType] || '📄'}</span>
                <span className="capitalize truncate">{type.replace('_', ' ')}</span>
                <Badge variant="secondary" className="ml-auto">{count}</Badge>
              </div>
            ))}
        </div>

        {(summary.equipment_list?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Equipos principales:
            </p>
            <div className="flex flex-wrap gap-1">
              {summary.equipment_list.slice(0, 8).map((eq) => (
                <Badge key={eq.tag} variant="outline" className="text-xs">
                  {eq.tag}
                </Badge>
              ))}
              {summary.equipment_list.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{summary.equipment_list.length - 8} más
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/consultoria/${projectId}/entities`}>
            Ver todas las entidades
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
