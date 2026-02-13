import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Upload, Filter } from 'lucide-react';

const FAMILIAS = [
  'ácidos', 'bases_álcalis', 'oxidantes_desinfectantes', 'floculantes_coagulantes',
  'detergentes_desengrasantes', 'disolventes', 'nutrientes', 'antiespumantes',
  'inhibidores_corrosión', 'resinas_intercambio', 'especialidades', 'otros',
];

const FAMILIAS_LABELS: Record<string, string> = {
  'ácidos': 'Ácidos',
  'bases_álcalis': 'Bases/Álcalis',
  'oxidantes_desinfectantes': 'Oxidantes/Desinfectantes',
  'floculantes_coagulantes': 'Floculantes/Coagulantes',
  'detergentes_desengrasantes': 'Detergentes/Desengrasantes',
  'disolventes': 'Disolventes',
  'nutrientes': 'Nutrientes',
  'antiespumantes': 'Antiespumantes',
  'inhibidores_corrosión': 'Inhibidores corrosión',
  'resinas_intercambio': 'Resinas intercambio',
  'especialidades': 'Especialidades',
  'otros': 'Otros',
};

const PARETO_OPTIONS = [
  { value: 'commodity', label: 'Commodity' },
  { value: 'semi-especialidad', label: 'Semi-especialidad' },
  { value: 'especialidad', label: 'Especialidad' },
];

const TIPO_PRECIO_OPTIONS = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'indexado', label: 'Indexado' },
  { value: 'spot', label: 'Spot' },
];

const INCOTERM_OPTIONS = ['EXW', 'FCA', 'DAP', 'DDP'];

const ENVASE_OPTIONS = [
  { value: 'bidón_25kg', label: 'Bidón 25kg' },
  { value: 'bidón_200kg', label: 'Bidón 200kg' },
  { value: 'IBC_1000L', label: 'IBC 1000L' },
  { value: 'cisterna_granel', label: 'Cisterna granel' },
  { value: 'saco_25kg', label: 'Saco 25kg' },
  { value: 'saco_big_bag', label: 'Big bag' },
  { value: 'otro', label: 'Otro' },
];

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(val);
};

const formatNumber = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(val);
};

const getGapBadge = (gap: number | null) => {
  if (gap === null) return null;
  if (gap < 5) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{gap.toFixed(1)}%</Badge>;
  if (gap < 15) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{gap.toFixed(1)}%</Badge>;
  if (gap < 30) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{gap.toFixed(1)}%</Badge>;
  return <Badge variant="destructive">{gap.toFixed(1)}%</Badge>;
};

const getTipoPrecioBadge = (tipo: string | null) => {
  switch (tipo) {
    case 'fijo': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Fijo</Badge>;
    case 'indexado': return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Indexado</Badge>;
    case 'spot': return <Badge variant="secondary">Spot</Badge>;
    default: return <Badge variant="outline">{tipo || '—'}</Badge>;
  }
};

interface ProductForm {
  nombre_comercial: string;
  nombre_materia_activa: string;
  concentracion_porcentaje: number | null;
  familia_quimica: string;
  clasificacion_pareto: string;
  codigo_taric: string;
  aplicacion: string;
  proveedor_nombre_temp: string; // UI-only, not sent to DB directly
  precio_unitario_actual: number | null;
  tipo_precio: string;
  indice_referencia: string;
  prima_actual: number | null;
  incoterm_actual: string;
  coste_transporte_separado: number | null;
  formato_envase: string;
  consumo_anual_kg: number | null;
}

const emptyForm: ProductForm = {
  nombre_comercial: '', nombre_materia_activa: '', concentracion_porcentaje: null, familia_quimica: '',
  clasificacion_pareto: 'commodity', codigo_taric: '', aplicacion: '',
  proveedor_nombre_temp: '', precio_unitario_actual: null, tipo_precio: 'fijo',
  indice_referencia: '', prima_actual: null, incoterm_actual: 'DAP',
  coste_transporte_separado: null, formato_envase: '', consumo_anual_kg: null,
};

export default function ChemInventario() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterFamilia, setFilterFamilia] = useState<string>('all');
  const [filterPareto, setFilterPareto] = useState<string>('all');
  const [filterTipoPrecio, setFilterTipoPrecio] = useState<string>('all');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [cellValue, setCellValue] = useState('');

  // Use the calculated view for products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_products')
        .select('*, chem_suppliers!proveedor_actual_id(nombre)')
        .eq('project_id', projectId!)
        .order('consumo_anual_kg', { ascending: false });
      if (error) {
        // Fallback without join if FK doesn't work
        const { data: fallbackData, error: fallbackError } = await externalSupabase
          .from('chem_products')
          .select('*')
          .eq('project_id', projectId!)
          .order('consumo_anual_kg', { ascending: false });
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      return data || [];
    },
    enabled: !!projectId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        const { error } = await externalSupabase.from('chem_products').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await externalSupabase.from('chem_products').insert({ ...data, project_id: projectId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-products', projectId] });
      toast.success(editingId ? 'Producto actualizado' : 'Producto añadido');
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`),
  });

  const inlineSaveMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: number }) => {
      const { error } = await externalSupabase.from('chem_products').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-products', projectId] });
      setEditingCell(null);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const handleSubmit = () => {
    if (!form.nombre_comercial.trim()) { toast.error('Nombre comercial requerido'); return; }
    saveMutation.mutate({
      nombre_comercial: form.nombre_comercial,
      nombre_materia_activa: form.nombre_materia_activa || null,
      concentracion_porcentaje: form.concentracion_porcentaje,
      familia_quimica: form.familia_quimica || null,
      clasificacion_pareto: form.clasificacion_pareto,
      codigo_taric: form.codigo_taric || null,
      aplicacion: form.aplicacion || null,
      precio_unitario_actual: form.precio_unitario_actual,
      tipo_precio: form.tipo_precio,
      indice_referencia: form.tipo_precio === 'indexado' ? form.indice_referencia : null,
      prima_actual: form.tipo_precio === 'indexado' ? form.prima_actual : null,
      incoterm_actual: form.incoterm_actual,
      coste_transporte_separado: form.incoterm_actual !== 'DAP' ? form.coste_transporte_separado : null,
      formato_envase: form.formato_envase || null,
      consumo_anual_kg: form.consumo_anual_kg,
    });
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      nombre_comercial: p.nombre_comercial || '',
      nombre_materia_activa: p.nombre_materia_activa || '',
      concentracion_porcentaje: p.concentracion_porcentaje,
      familia_quimica: p.familia_quimica || '',
      clasificacion_pareto: p.clasificacion_pareto || 'commodity',
      codigo_taric: p.codigo_taric || '',
      aplicacion: p.aplicacion || '',
      proveedor_nombre_temp: p.chem_suppliers?.nombre || '',
      precio_unitario_actual: p.precio_unitario_actual,
      tipo_precio: p.tipo_precio || 'fijo',
      indice_referencia: p.indice_referencia || '',
      prima_actual: p.prima_actual,
      incoterm_actual: p.incoterm_actual || 'DAP',
      coste_transporte_separado: p.coste_transporte_separado,
      formato_envase: p.formato_envase || '',
      consumo_anual_kg: p.consumo_anual_kg,
    });
    setShowModal(true);
  };

  const startInlineEdit = (id: string, field: string, currentValue: number | null) => {
    setEditingCell({ id, field });
    setCellValue(currentValue?.toString() || '');
  };

  const commitInlineEdit = () => {
    if (!editingCell) return;
    const num = parseFloat(cellValue);
    if (isNaN(num)) { setEditingCell(null); return; }
    inlineSaveMutation.mutate({ id: editingCell.id, field: editingCell.field, value: num });
  };

  // Helper to get supplier name
  const getProveedorNombre = (p: any) => p.chem_suppliers?.nombre || '—';

  // Filtrar productos
  const filtered = products.filter((p: any) => {
    if (filterFamilia !== 'all' && p.familia_quimica !== filterFamilia) return false;
    if (filterPareto !== 'all' && p.clasificacion_pareto !== filterPareto) return false;
    if (filterTipoPrecio !== 'all' && p.tipo_precio !== filterTipoPrecio) return false;
    return true;
  });

  // Totales + Pareto
  const gastoTotal = filtered.reduce((s: number, p: any) => s + ((p.precio_unitario_actual || 0) * (p.consumo_anual_kg || 0)), 0);

  // Calcular gasto acumulado para badge PRIORIDAD (80%)
  const sortedByGasto = [...products].sort((a: any, b: any) =>
    ((b.precio_unitario_actual || 0) * (b.consumo_anual_kg || 0)) - ((a.precio_unitario_actual || 0) * (a.consumo_anual_kg || 0))
  );
  const gastoTotalAll = sortedByGasto.reduce((s: number, p: any) => s + ((p.precio_unitario_actual || 0) * (p.consumo_anual_kg || 0)), 0);
  let acum = 0;
  const paretoIds = new Set<string>();
  for (const p of sortedByGasto) {
    acum += (p.precio_unitario_actual || 0) * (p.consumo_anual_kg || 0);
    paretoIds.add(p.id);
    if (gastoTotalAll > 0 && acum / gastoTotalAll >= 0.8) break;
  }

  const enriched = filtered.map((p: any) => {
    const gasto = (p.precio_unitario_actual || 0) * (p.consumo_anual_kg || 0);
    const conc = p.concentracion_porcentaje || 100;
    const precioMA = conc > 0 ? (p.precio_unitario_actual || 0) / (conc / 100) : 0;
    const gap = p.precio_benchmark && p.precio_benchmark > 0 ? ((precioMA - p.precio_benchmark) / p.precio_benchmark) * 100 : null;
    const potencialAhorro = gap !== null && gap > 0 && p.precio_benchmark ? (precioMA - p.precio_benchmark) * (conc / 100) * (p.consumo_anual_kg || 0) : 0;
    const isPrioridad = paretoIds.has(p.id);
    return { ...p, gasto, precioMA, gap, potencialAhorroCalc: potencialAhorro, isPrioridad };
  });

  const ahorroTotal = enriched.reduce((s: number, p: any) => s + (p.potencialAhorroCalc || 0), 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Inventario de Químicos</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Upload className="w-4 h-4 mr-1" /> Importar CSV
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Añadir producto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterFamilia} onValueChange={setFilterFamilia}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Familia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias</SelectItem>
              {FAMILIAS.map(f => <SelectItem key={f} value={f}>{FAMILIAS_LABELS[f] || f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPareto} onValueChange={setFilterPareto}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Pareto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda clasificación</SelectItem>
              {PARETO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipoPrecio} onValueChange={setFilterTipoPrecio}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tipo precio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {TIPO_PRECIO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Producto</TableHead>
                  <TableHead>Materia activa</TableHead>
                  <TableHead className="text-right">Conc. %</TableHead>
                  <TableHead>Familia</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">€/kg prod.</TableHead>
                  <TableHead className="text-right font-bold bg-primary/5">€/kg MA</TableHead>
                  <TableHead>Tipo precio</TableHead>
                  <TableHead>Envase</TableHead>
                  <TableHead className="text-right">Consumo kg/año</TableHead>
                  <TableHead className="text-right">Gasto anual</TableHead>
                  <TableHead className="text-right">Benchmark</TableHead>
                  <TableHead className="text-right">Gap %</TableHead>
                  <TableHead className="text-right">Pot. ahorro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.length === 0 ? (
                  <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">No hay productos. Haz clic en "Añadir producto" para empezar.</TableCell></TableRow>
                ) : enriched.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(p)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {p.nombre_comercial}
                        {p.isPrioridad && <Badge variant="default" className="text-[10px] px-1 py-0 ml-1">PRIORIDAD</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.nombre_materia_activa || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{p.concentracion_porcentaje ? `${p.concentracion_porcentaje}%` : '—'}</TableCell>
                    <TableCell className="text-sm">{FAMILIAS_LABELS[p.familia_quimica] || p.familia_quimica || '—'}</TableCell>
                    <TableCell className="text-sm">{getProveedorNombre(p)}</TableCell>
                    <TableCell className="text-right" onClick={e => { e.stopPropagation(); startInlineEdit(p.id, 'precio_unitario_actual', p.precio_unitario_actual); }}>
                      {editingCell?.id === p.id && editingCell.field === 'precio_unitario_actual' ? (
                        <Input className="w-20 h-7 text-xs text-right" autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={commitInlineEdit} onKeyDown={e => e.key === 'Enter' && commitInlineEdit()} />
                      ) : <span className="text-sm">{formatCurrency(p.precio_unitario_actual)}</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary bg-primary/5">
                      {p.precioMA > 0 ? formatCurrency(p.precioMA) : '—'}
                    </TableCell>
                    <TableCell>{getTipoPrecioBadge(p.tipo_precio)}</TableCell>
                    <TableCell className="text-xs">{p.formato_envase || '—'}</TableCell>
                    <TableCell className="text-right" onClick={e => { e.stopPropagation(); startInlineEdit(p.id, 'consumo_anual_kg', p.consumo_anual_kg); }}>
                      {editingCell?.id === p.id && editingCell.field === 'consumo_anual_kg' ? (
                        <Input className="w-24 h-7 text-xs text-right" autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={commitInlineEdit} onKeyDown={e => e.key === 'Enter' && commitInlineEdit()} />
                      ) : <span className="text-sm">{formatNumber(p.consumo_anual_kg)}</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(p.gasto)}</TableCell>
                    <TableCell className="text-right text-sm">{p.precio_benchmark ? formatCurrency(p.precio_benchmark) : '—'}</TableCell>
                    <TableCell className="text-right">{getGapBadge(p.gap)}</TableCell>
                    <TableCell className="text-right text-sm">{p.potencialAhorroCalc > 0 ? formatCurrency(p.potencialAhorroCalc) : '—'}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {enriched.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={10} className="text-right">Totales</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(gastoTotal)}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-mono">{formatCurrency(ahorroTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar producto' : 'Añadir producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre comercial *</Label>
              <Input value={form.nombre_comercial} onChange={e => setForm(f => ({ ...f, nombre_comercial: e.target.value }))} />
            </div>
            <div>
              <Label>Materia activa</Label>
              <Input value={form.nombre_materia_activa} onChange={e => setForm(f => ({ ...f, nombre_materia_activa: e.target.value }))} />
            </div>
            <div>
              <Label>Concentración %</Label>
              <Input type="number" value={form.concentracion_porcentaje ?? ''} onChange={e => setForm(f => ({ ...f, concentracion_porcentaje: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <Label>Familia química</Label>
              <Select value={form.familia_quimica} onValueChange={v => setForm(f => ({ ...f, familia_quimica: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{FAMILIAS.map(f => <SelectItem key={f} value={f}>{FAMILIAS_LABELS[f] || f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clasificación Pareto</Label>
              <Select value={form.clasificacion_pareto} onValueChange={v => setForm(f => ({ ...f, clasificacion_pareto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PARETO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código TARIC</Label>
              <Input value={form.codigo_taric} onChange={e => setForm(f => ({ ...f, codigo_taric: e.target.value }))} placeholder="8 dígitos" maxLength={8} />
            </div>
            <div>
              <Label>Aplicación</Label>
              <Input value={form.aplicacion} onChange={e => setForm(f => ({ ...f, aplicacion: e.target.value }))} placeholder="Uso en planta" />
            </div>
            <div>
              <Label>Precio €/kg producto</Label>
              <Input type="number" step="0.01" value={form.precio_unitario_actual ?? ''} onChange={e => setForm(f => ({ ...f, precio_unitario_actual: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <Label>Tipo precio</Label>
              <Select value={form.tipo_precio} onValueChange={v => setForm(f => ({ ...f, tipo_precio: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_PRECIO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.tipo_precio === 'indexado' && (
              <>
                <div>
                  <Label>Índice referencia</Label>
                  <Input value={form.indice_referencia} onChange={e => setForm(f => ({ ...f, indice_referencia: e.target.value }))} />
                </div>
                <div>
                  <Label>Prima actual €/tm</Label>
                  <Input type="number" step="0.01" value={form.prima_actual ?? ''} onChange={e => setForm(f => ({ ...f, prima_actual: e.target.value ? parseFloat(e.target.value) : null }))} />
                </div>
              </>
            )}
            <div>
              <Label>Incoterm</Label>
              <Select value={form.incoterm_actual} onValueChange={v => setForm(f => ({ ...f, incoterm_actual: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCOTERM_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.incoterm_actual !== 'DAP' && (
              <div>
                <Label>Coste transporte €</Label>
                <Input type="number" step="0.01" value={form.coste_transporte_separado ?? ''} onChange={e => setForm(f => ({ ...f, coste_transporte_separado: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            )}
            <div>
              <Label>Formato envase</Label>
              <Select value={form.formato_envase} onValueChange={v => setForm(f => ({ ...f, formato_envase: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ENVASE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consumo anual kg</Label>
              <Input type="number" value={form.consumo_anual_kg ?? ''} onChange={e => setForm(f => ({ ...f, consumo_anual_kg: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {editingId ? 'Guardar cambios' : 'Añadir producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
