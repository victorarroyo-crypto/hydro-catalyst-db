import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import type { EntityType } from '@/types/documentEntities';

interface AddEntityDialogProps {
  projectId: string;
  onSuccess?: () => void;
}

export function AddEntityDialog({ projectId, onSuccess }: AddEntityDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('equipment');
  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectEntitiesService.createEntity(projectId, {
        entity_type: entityType,
        tag: tag || undefined,
        name: name || undefined,
        value: value || undefined,
        unit: unit || undefined,
      });
      toast({ title: 'Entidad creada' });
      setOpen(false);
      onSuccess?.();
      // Reset form
      setTag('');
      setName('');
      setValue('');
      setUnit('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al crear entidad',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Entidad
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Entidad Manual</DialogTitle>
          <DialogDescription>
            Agrega equipos, parámetros u otras entidades que no fueron detectadas automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Entidad</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">Equipo</SelectItem>
                <SelectItem value="instrument">Instrumento</SelectItem>
                <SelectItem value="valve">Válvula</SelectItem>
                <SelectItem value="parameter">Parámetro</SelectItem>
                <SelectItem value="chemical">Químico</SelectItem>
                <SelectItem value="process">Proceso</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {['equipment', 'instrument', 'valve'].includes(entityType) && (
            <div>
              <Label>Tag (ej: P-101, FT-201)</Label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="P-101"
              />
            </div>
          )}

          <div>
            <Label>Nombre / Descripción</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bomba centrífuga de alimentación"
            />
          </div>

          {['parameter', 'limit'].includes(entityType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor</Label>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="450"
                />
              </div>
              <div>
                <Label>Unidad</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="mg/L"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Entidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
