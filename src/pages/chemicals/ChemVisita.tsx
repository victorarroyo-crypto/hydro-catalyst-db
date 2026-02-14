import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ChevronDown, Camera, Loader2 } from 'lucide-react';

const RAILWAY_URL = API_URL;

const ZONAS: Record<string, string> = {
  recepcion_descarga: 'Recepción y Descarga',
  almacen: 'Almacén de Químicos',
  dosificacion: 'Zona de Dosificación',
  proceso: 'Proceso Productivo',
  edar_residuos: 'EDAR / Residuos',
};

const CHECKLIST_TEMPLATE = [
  { zona: 'recepcion_descarga', item: 'Formato de llegada (cisterna/IBC/bidones)' },
  { zona: 'recepcion_descarga', item: 'Frecuencia de entregas y tamaño de lote' },
  { zona: 'recepcion_descarga', item: 'Proveedores múltiples para mismo producto' },
  { zona: 'almacen', item: 'Bidones a medio usar (sobredosificación)' },
  { zona: 'almacen', item: 'Productos caducados o deteriorados' },
  { zona: 'almacen', item: 'Duplicidades (2+ productos para lo mismo)' },
  { zona: 'almacen', item: 'Marcas premium vs genéricos' },
  { zona: 'almacen', item: 'Formato envase inadecuado (bidón con consumo alto)' },
  { zona: 'almacen', item: 'Estado general y segregación química' },
  { zona: 'almacen', item: 'Nivel de stock (exceso o déficit)' },
  { zona: 'dosificacion', item: 'Equipos automáticos vs manuales' },
  { zona: 'dosificacion', item: 'Calibración y caudalímetros' },
  { zona: 'dosificacion', item: 'Diluciones in situ vs producto diluido' },
  { zona: 'dosificacion', item: 'Equipos en comodato del proveedor' },
  { zona: 'dosificacion', item: 'Fugas y derrames visibles' },
  { zona: 'proceso', item: 'Puntos de inyección de químicos' },
  { zona: 'proceso', item: 'Consumos de agua asociados' },
  { zona: 'edar_residuos', item: 'Químicos que consume la EDAR' },
  { zona: 'edar_residuos', item: 'Tipo y dosis de floculante (lodos)' },
  { zona: 'edar_residuos', item: 'Envases vacíos acumulados' },
];

interface ChecklistItem {
  zona: string;
  item: string;
  observado: boolean;
  nota: string;
}

interface PlantVisit {
  id: string;
  project_id: string;
  fecha_visita: string | null;
  visitante: string | null;
  acompanante_cliente: string | null;
  checklist: ChecklistItem[];
  resumen_oportunidades: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export default function ChemVisita() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const { data: visits, isLoading } = useQuery<PlantVisit[]>({
    queryKey: ['chem-plant-visits', projectId],
    queryFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits`);
      if (!res.ok) throw new Error('Error cargando visitas');
      return res.json();
    },
    enabled: !!projectId,
  });

  const visit = visits?.[0] ?? null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const checklist = CHECKLIST_TEMPLATE.map(t => ({ ...t, observado: false, nota: '' }));
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist, fecha_visita: today }),
      });
      if (!res.ok) throw new Error('Error al crear visita');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-plant-visits', projectId] });
      toast.success('Visita creada');
    },
    onError: () => toast.error('Error al crear visita'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PlantVisit>) => {
      if (!visit) return;
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chem-plant-visits', projectId] }),
    onError: () => toast.error('Error al guardar'),
  });

  const checklist: ChecklistItem[] = visit?.checklist || [];

  const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: any) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    updateMutation.mutate({ checklist: updated });
  };

  const toggleNote = (index: number) => {
    setExpandedNotes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No hay visitas registradas para este proyecto.</p>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Crear visita a planta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const zonaKeys = Object.keys(ZONAS);
  const observados = checklist.filter(i => i.observado).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Visita a Planta</h2>
        <span className="text-xs text-muted-foreground">
          {observados}/{checklist.length} observados
        </span>
      </div>

      {/* Header fields */}
      <Card>
        <CardContent className="p-4 grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Fecha visita</Label>
            <Input type="date" value={visit.fecha_visita ?? ''} onChange={e => updateMutation.mutate({ fecha_visita: e.target.value || null })} />
          </div>
          <div>
            <Label className="text-xs">Visitante</Label>
            <Input value={visit.visitante ?? ''} onChange={e => updateMutation.mutate({ visitante: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Acompañante cliente</Label>
            <Input value={visit.acompanante_cliente ?? ''} onChange={e => updateMutation.mutate({ acompanante_cliente: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Checklist by zones */}
      {zonaKeys.map(zonaKey => {
        const items = checklist
          .map((item, idx) => ({ ...item, idx }))
          .filter(item => item.zona === zonaKey);
        if (items.length === 0) return null;
        const zonaObservados = items.filter(i => i.observado).length;

        return (
          <Collapsible key={zonaKey} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">{ZONAS[zonaKey]}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{zonaObservados}/{items.length}</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-1 pt-0">
                  {items.map(item => {
                    const isExpanded = expandedNotes[item.idx] || !!item.nota;
                    return (
                      <div key={item.idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.observado}
                            onCheckedChange={(checked) => updateChecklistItem(item.idx, 'observado', !!checked)}
                            className="mt-0.5"
                          />
                          <button
                            type="button"
                            className="flex-1 text-left text-sm cursor-pointer hover:text-primary transition-colors"
                            onClick={() => toggleNote(item.idx)}
                          >
                            <span className={item.observado ? 'font-medium' : 'text-muted-foreground'}>{item.item}</span>
                          </button>
                        </div>
                        {isExpanded && (
                          <Textarea
                            className="ml-7 h-16 min-h-[40px] text-xs"
                            placeholder="Nota de observación..."
                            value={item.nota || ''}
                            onChange={e => updateChecklistItem(item.idx, 'nota', e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Resumen de oportunidades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen de Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[120px] text-sm"
            placeholder="Describe las oportunidades detectadas durante la visita..."
            value={visit.resumen_oportunidades ?? ''}
            onChange={e => updateMutation.mutate({ resumen_oportunidades: e.target.value })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
