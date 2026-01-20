import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MoreHorizontal, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import { AddEntityDialog } from '@/components/entities/AddEntityDialog';
import type { DocumentEntity, EntityType } from '@/types/documentEntities';

const entityTypeLabels: Record<EntityType, string> = {
  equipment: 'Equipo',
  instrument: 'Instrumento',
  valve: 'Válvula',
  pipeline: 'Línea',
  stream: 'Corriente',
  parameter: 'Parámetro',
  limit: 'Límite',
  chemical: 'Químico',
  process: 'Proceso',
  specification: 'Especificación',
  other: 'Otro',
};

export default function EntitiesListPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [entities, setEntities] = useState<DocumentEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const initialType = searchParams.get('type') as EntityType | null;
  const [entityType, setEntityType] = useState<EntityType | 'all'>(initialType || 'all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 25;

  const loadEntities = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await projectEntitiesService.getEntities(projectId, {
        entity_type: entityType === 'all' ? undefined : entityType,
        verified_only: verifiedOnly,
        limit,
        offset: page * limit,
      });
      setEntities(result.entities);
      setTotal(result.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar entidades',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [projectId, entityType, verifiedOnly, page]);

  const handleVerify = async (entityId: string, verified: boolean) => {
    if (!projectId) return;
    try {
      await projectEntitiesService.verifyEntity(projectId, entityId, verified);
      loadEntities();
      toast({
        title: verified ? 'Entidad verificada' : 'Verificación removida',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al verificar',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (entityId: string) => {
    if (!projectId || !confirm('¿Eliminar esta entidad?')) return;
    try {
      await projectEntitiesService.deleteEntity(projectId, entityId);
      loadEntities();
      toast({ title: 'Entidad eliminada' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/consultoria/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Entidades del Proyecto</h1>
            <p className="text-muted-foreground">
              {total} entidades extraídas de documentos
            </p>
          </div>
        </div>
        {projectId && <AddEntityDialog projectId={projectId} onSuccess={loadEntities} />}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType | 'all'); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(entityTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="verified"
            checked={verifiedOnly}
            onCheckedChange={(v) => { setVerifiedOnly(v); setPage(0); }}
          />
          <Label htmlFor="verified">Solo verificadas</Label>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nombre/Valor</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay entidades que mostrar
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-mono font-medium">
                    {entity.tag || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {entityTypeLabels[entity.entity_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span>{entity.name || entity.value || '-'}</span>
                      {entity.unit && (
                        <span className="text-muted-foreground ml-1">{entity.unit}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entity.project_documents?.filename || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Progress value={entity.confidence * 100} className="w-16 h-2" />
                      <span className="text-xs">{Math.round(entity.confidence * 100)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entity.verified ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleVerify(entity.id, !entity.verified)}>
                          {entity.verified ? 'Quitar verificación' : 'Verificar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(entity.id)}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
