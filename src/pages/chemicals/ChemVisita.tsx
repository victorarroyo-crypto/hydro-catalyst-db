import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ChevronDown, Camera, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

const CHECKLIST_TEMPLATE = [
  {
    zona: 'Recepción y descarga',
    items: [
      'Formato llegada (cisterna/IBC/bidones)',
      'Báscula de recepción',
      'Albaranes y frecuencia entregas',
      'Múltiples proveedores mismo producto',
    ],
  },
  {
    zona: 'Almacén químicos',
    items: [
      'Bidones a medio usar',
      'Productos caducados o deteriorados',
      'Duplicidades de producto',
      'Marcas premium vs genéricos',
      'Formato envase vs consumo real',
      'Estado general y organización',
      'Nivel de stock (semanas)',
    ],
  },
  {
    zona: 'Dosificación/Preparación',
    items: [
      'Equipos automáticos vs manuales',
      'Calibración y caudalímetros',
      'Diluciones (concentrado vs prediluido)',
      'Equipos en comodato del proveedor',
      'Fugas y derrames visibles',
    ],
  },
  {
    zona: 'Proceso productivo',
    items: [
      'Puntos de inyección de químicos',
      'Consumos de agua (aclarados, CIP)',
      'Calidad agua entrada (dureza)',
    ],
  },
  {
    zona: 'EDAR/Residuos',
    items: [
      'Químicos EDAR (floculantes, coagulantes, pH)',
      'Gestión de lodos (deshidratación)',
      'Envases vacíos (acumulación, gestión)',
    ],
  },
  {
    zona: 'Operarios',
    items: [
      'Consumo por ciclo/turno declarado',
      'Cambios de producto recientes',
      'Producto que da más problemas',
      'Quién decide dosificación',
    ],
  },
];

const PREGUNTAS_CLAVE = [
  '¿Cuánto producto echáis por ciclo/turno?',
  '¿Habéis cambiado de producto últimamente?',
  '¿Alguna vez os sobra o falta producto?',
  '¿Qué producto os da más problemas?',
  '¿Quién decide cuánto se dosifica?',
];

const STATUS_OPTIONS = [
  { value: '', label: 'Sin evaluar', icon: HelpCircle, color: 'text-muted-foreground' },
  { value: 'ok', label: 'OK', icon: CheckCircle, color: 'text-green-600' },
  { value: 'oportunidad', label: 'Oportunidad', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'problema', label: 'Problema', icon: XCircle, color: 'text-red-600' },
];

const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

export default function ChemVisita() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  const { data: visit } = useQuery({
    queryKey: ['chem-visit', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_plant_visits').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const checklist = CHECKLIST_TEMPLATE.flatMap(z => z.items.map(item => ({ zona: z.zona, item, estado: '', observacion: '', impacto: 0 })));
      const { error } = await externalSupabase.from('chem_plant_visits').insert({ project_id: projectId!, checklist });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-visit', projectId] });
      toast.success('Visita creada');
    },
    onError: () => toast.error('Error al crear visita'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!visit) return;
      const { error } = await externalSupabase.from('chem_plant_visits').update(data).eq('id', visit.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chem-visit', projectId] }),
    onError: () => toast.error('Error al guardar'),
  });

  const checklist: any[] = (visit?.checklist as any[]) || [];

  const updateChecklistItem = (index: number, field: string, value: any) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    const impactoTotal = updated.reduce((s, item) => s + (item.impacto || 0), 0);
    updateMutation.mutate({ checklist: updated, impacto_total_estimado: impactoTotal });
  };

  const oportunidades = checklist.filter(item => item.estado === 'oportunidad' || item.estado === 'problema');
  const impactoTotal = checklist.reduce((s, item) => s + (item.impacto || 0), 0);

  if (!visit) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No hay visitas registradas para este proyecto.</p>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Crear visita a planta</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const zonas = CHECKLIST_TEMPLATE.map(z => z.zona);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Visita a Planta</h2>

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
      {zonas.map(zona => {
        const items = checklist.map((item, idx) => ({ ...item, idx })).filter(item => item.zona === zona);
        return (
          <Collapsible key={zona} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">{zona}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{items.filter(i => i.estado).length}/{items.length}</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 pt-0">
                  {items.map(item => (
                    <div key={item.idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.item}</span>
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isActive = item.estado === opt.value;
                            return (
                              <Button key={opt.value} size="sm" variant={isActive ? 'default' : 'ghost'} className={`h-7 px-2 ${isActive ? '' : opt.color}`}
                                onClick={() => updateChecklistItem(item.idx, 'estado', opt.value)}>
                                <Icon className="w-3 h-3 mr-1" /> <span className="text-xs">{opt.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr,auto] gap-2">
                        <Textarea className="h-8 min-h-8 text-xs" placeholder="Observación..." value={item.observacion || ''} onChange={e => updateChecklistItem(item.idx, 'observacion', e.target.value)} />
                        <Input type="number" className="w-28 h-8 text-xs" placeholder="Impacto €" value={item.impacto || ''} onChange={e => updateChecklistItem(item.idx, 'impacto', e.target.value ? parseFloat(e.target.value) : 0)} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Preguntas clave */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">💡 Preguntas clave para operarios</CardTitle>
              <ChevronDown className="w-4 h-4" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {PREGUNTAS_CLAVE.map((q, i) => <li key={i} className="text-sm text-muted-foreground">• {q}</li>)}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Resumen oportunidades */}
      {oportunidades.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen oportunidades detectadas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead className="text-right">Impacto €</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oportunidades.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{item.zona}</TableCell>
                    <TableCell className="text-xs">{item.item}</TableCell>
                    <TableCell>
                      <Badge variant={item.estado === 'problema' ? 'destructive' : 'default'} className="text-[10px]">
                        {item.estado === 'problema' ? '✕ Problema' : '⚠ Oportunidad'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{item.observacion || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.impacto ? formatCurrency(item.impacto) : '—'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={4} className="text-right">Total impacto estimado</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(impactoTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
