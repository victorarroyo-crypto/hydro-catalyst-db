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
import { ChevronDown, Camera, Loader2, Sparkles } from 'lucide-react';

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
  source?: 'template' | 'ai';
  contexto?: string;
  prioridad?: 'alta' | 'media' | 'baja';
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
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: visits, isLoading } = useQuery<PlantVisit[]>({
    queryKey: ['chem-plant-visits', projectId],
    queryFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits`);
      if (!res.ok) throw new Error('Error cargando visitas');
      const data = await res.json();
      return data.visits || [];
    },
    enabled: !!projectId,
  });

  const visit = visits?.[0] ?? null;

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      let checklist: ChecklistItem[] | undefined;
      try {
        const genRes = await fetch(
          `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits/generate-checklist`,
          { method: 'POST' }
        );
        if (genRes.ok) {
          const genData = await genRes.json();
          checklist = genData.checklist;
        }
      } catch (e) {
        // Fallback to static template
      }

      if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
        checklist = CHECKLIST_TEMPLATE.map(t => ({
          ...t, observado: false, nota: '', source: 'template' as const, prioridad: 'media' as const,
        }));
      }

      setIsGenerating(false);

      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/plant-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_visita: new Date().toISOString().split('T')[0],
          checklist,
        }),
      });
      if (!res.ok) throw new Error('Error al crear visita');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-plant-visits', projectId] });
      toast.success('Visita creada con checklist personalizado');
    },
    onError: () => {
      setIsGenerating(false);
      toast.error('Error al crear visita');
    },
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
            {isGenerating ? (
              <>
                <Sparkles className="w-10 h-10 text-amber-500 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Generando checklist personalizado...
                </p>
                <p className="text-xs text-muted-foreground">
                  Analizando productos, contratos y alertas del proyecto
                </p>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No hay visitas registradas para este proyecto.
                </p>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear visita con checklist inteligente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const zonaKeys = Object.keys(ZONAS);
  const observados = checklist.filter(i => i.observado).length;
  const aiItems = checklist.filter(i => i.source === 'ai');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Visita a Planta</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {observados}/{checklist.length} observados
          </span>
          {aiItems.length > 0 && (
            <span className="text-xs text-amber-600">
              ({aiItems.length} IA)
            </span>
          )}
        </div>
      </div>

      {/* AI context banner */}
      {aiItems.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-medium">Checklist personalizado:</span>{' '}
            {aiItems.length} items específicos generados a partir de los datos del proyecto
            (productos, contratos, alertas). Los items con etiqueta{' '}
            <span className="font-medium">IA</span> son específicos para esta planta.
          </div>
        </div>
      )}

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
                    const isAI = item.source === 'ai';
                    return (
                      <div
                        key={item.idx}
                        className={`border rounded-lg p-3 space-y-2 ${
                          isAI ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
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
                            <span className={item.observado ? 'font-medium' : 'text-muted-foreground'}>
                              {item.item}
                            </span>
                            {isAI && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 align-middle">
                                <Sparkles className="w-2.5 h-2.5" />
                                IA
                              </span>
                            )}
                            {isAI && item.prioridad === 'alta' && (
                              <span className="ml-1 inline-flex items-center text-[10px] font-medium text-red-600 bg-red-100 rounded px-1.5 py-0.5 align-middle">
                                ALTA
                              </span>
                            )}
                          </button>
                        </div>
                        {isAI && item.contexto && (
                          <p className="ml-7 text-xs text-amber-700 dark:text-amber-400 italic">
                            {item.contexto}
                          </p>
                        )}
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
