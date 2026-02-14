import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Upload, Filter, Edit2, TrendingUp, Clock, Loader2, Trash2 } from 'lucide-react';

const RAILWAY_URL = API_URL;

const FAMILIAS = [
  'ácidos', 'bases_álcalis', 'oxidantes_desinfectantes', 'floculantes_coagulantes',
  'detergentes_desengrasantes', 'disolventes', 'nutrientes', 'antiespumantes',
  'inhibidores_corrosión', 'resinas_intercambio', 'especialidades', 'otros',
];

const FAMILIAS_LABELS: Record<string, string> = {
  'ácidos': 'Ácidos', 'bases_álcalis': 'Bases/Álcalis',
  'oxidantes_desinfectantes': 'Oxidantes/Desinfectantes', 'floculantes_coagulantes': 'Floculantes/Coagulantes',
  'detergentes_desengrasantes': 'Detergentes/Desengrasantes', 'disolventes': 'Disolventes',
  'nutrientes': 'Nutrientes', 'antiespumantes': 'Antiespumantes',
  'inhibidores_corrosión': 'Inhibidores corrosión', 'resinas_intercambio': 'Resinas intercambio',
  'especialidades': 'Especialidades', 'otros': 'Otros',
};

const PARETO_OPTIONS = [
  { value: 'commodity', label: 'Commodity', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'semi-especialidad', label: 'Semi-especialidad', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'especialidad', label: 'Especialidad', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'sin_clasificar', label: 'Sin clasificar', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
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

const formatCurrencyRound = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

const formatNumber = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(val);
};

const getParetoBadge = (pareto: string | null) => {
  const opt = PARETO_OPTIONS.find(o => o.value === pareto);
  if (!opt) return <Badge variant="outline" className="text-[10px]">Sin clasificar</Badge>;
  return <Badge className={`${opt.color} text-[10px]`}>{opt.label}</Badge>;
};

interface ProductForm {
  nombre_comercial: string;
  nombre_materia_activa: string;
  concentracion_porcentaje: number | null;
  familia_quimica: string;
  clasificacion_pareto: string;
  codigo_taric: string;
  aplicacion: string;
  proveedor_actual_id: string;
  precio_unitario_actual: number | null;
  tipo_precio: string;
  indice_referencia: string;
  prima_actual: number | null;
  incoterm_actual: string;
  coste_transporte_separado: number | null;
  formato_envase: string;
  consumo_anual_kg: number | null;
  precio_benchmark: number | null;
}

const emptyForm: ProductForm = {
  nombre_comercial: '', nombre_materia_activa: '', concentracion_porcentaje: null, familia_quimica: '',
  clasificacion_pareto: 'commodity', codigo_taric: '', aplicacion: '',
  proveedor_actual_id: '', precio_unitario_actual: null, tipo_precio: 'fijo',
  indice_referencia: '', prima_actual: null, incoterm_actual: 'DAP',
  coste_transporte_separado: null, formato_envase: '', consumo_anual_kg: null, precio_benchmark: null,
};

export default function ChemInventario() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterFamilia, setFilterFamilia] = useState<string>('all');
  const [filterPareto, setFilterPareto] = useState<string>('all');

  // Fetch products with calculated view
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/products?view=calculated`);
      if (!res.ok) throw new Error('Error cargando productos');
      return res.json();
    },
    enabled: !!projectId,
  });

  // Fetch suppliers for the select
  const { data: suppliers = [] } = useQuery({
    queryKey: ['chem-suppliers', projectId],
    queryFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/suppliers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingId
        ? `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/products/${editingId}`
        : `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/products`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      return res.json();
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-products', projectId] });
      toast.success('Producto eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const handleSubmit = () => {
    if (!form.nombre_comercial.trim()) { toast.error('Nombre comercial requerido'); return; }
    const payload: any = {
      nombre_comercial: form.nombre_comercial,
      nombre_materia_activa: form.nombre_materia_activa || null,
      concentracion_porcentaje: form.concentracion_porcentaje,
      familia_quimica: form.familia_quimica || null,
      clasificacion_pareto: form.clasificacion_pareto,
      codigo_taric: form.codigo_taric || null,
      aplicacion: form.aplicacion || null,
      proveedor_actual_id: form.proveedor_actual_id || null,
      precio_unitario_actual: form.precio_unitario_actual,
      tipo_precio: form.tipo_precio,
      indice_referencia: form.tipo_precio === 'indexado' ? form.indice_referencia : null,
      prima_actual: form.tipo_precio === 'indexado' ? form.prima_actual : null,
      incoterm_actual: form.incoterm_actual,
      coste_transporte_separado: form.incoterm_actual !== 'DAP' ? form.coste_transporte_separado : null,
      formato_envase: form.formato_envase || null,
      consumo_anual_kg: form.consumo_anual_kg,
      precio_benchmark: form.precio_benchmark,
    };
    saveMutation.mutate(payload);
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
      proveedor_actual_id: p.proveedor_actual_id || '',
      precio_unitario_actual: p.precio_unitario_actual,
      tipo_precio: p.tipo_precio || 'fijo',
      indice_referencia: p.indice_referencia || '',
      prima_actual: p.prima_actual,
      incoterm_actual: p.incoterm_actual || 'DAP',
      coste_transporte_separado: p.coste_transporte_separado,
      formato_envase: p.formato_envase || '',
      consumo_anual_kg: p.consumo_anual_kg,
      precio_benchmark: p.precio_benchmark,
    });
    setShowModal(true);
  };

  const getProveedorNombre = (p: any) => p.proveedor_nombre || p.chem_suppliers?.nombre || '—';

  const filtered = products.filter((p: any) => {
    if (filterFamilia !== 'all' && p.familia_quimica !== filterFamilia) return false;
    if (filterPareto !== 'all' && p.clasificacion_pareto !== filterPareto) return false;
    return true;
  });

  const gastoTotal = filtered.reduce((s: number, p: any) => s + (p.gasto_anual || 0), 0);
  const ahorroTotal = filtered.reduce((s: number, p: any) => s + (p.potencial_ahorro || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      {/* Summary KPIs */}
      {products.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Gasto total anual</p>
              <p className="text-2xl font-bold">{formatCurrencyRound(gastoTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Potencial ahorro</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrencyRound(ahorroTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
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
        </CardContent>
      </Card>

      {/* Product Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No hay productos. Haz clic en "Añadir producto" para empezar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => {
            const precioMA = p.precio_kg_materia_activa;
            const puestoPlanta = p.precio_puesto_planta;
            const gasto = p.gasto_anual;
            const gap = p.gap_vs_benchmark_pct;
            const potencial = p.potencial_ahorro;
            const transporte = p.coste_transporte_separado;

            return (
              <Card key={p.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{p.nombre_comercial}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('¿Eliminar producto?')) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.nombre_materia_activa && <span className="text-xs text-muted-foreground">{p.nombre_materia_activa}</span>}
                    {p.nombre_materia_activa && <span className="text-muted-foreground">|</span>}
                    {getParetoBadge(p.clasificacion_pareto)}
                    {p.familia_quimica && <span className="text-muted-foreground">|</span>}
                    {p.familia_quimica && <span className="text-xs text-muted-foreground">{FAMILIAS_LABELS[p.familia_quimica] || p.familia_quimica}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Prices */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio:</span>
                      <span>{formatCurrency(p.precio_unitario_actual)} /kg</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-muted-foreground">€/kg MA:</span>
                      <span className="text-primary">{precioMA ? `${formatCurrency(precioMA)} /kg MA` : '—'}</span>
                    </div>
                    {puestoPlanta != null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Puesto plta:</span>
                        <span>
                          {formatCurrency(puestoPlanta)} /kg
                          {p.incoterm_actual && ` (${p.incoterm_actual}`}
                          {transporte ? ` + ${formatCurrency(transporte)} transp.)` : p.incoterm_actual ? ')' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Consumption */}
                  <div className="space-y-1 text-sm border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consumo:</span>
                      <span>{formatNumber(p.consumo_anual_kg)} kg/año</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Gasto:</span>
                      <span>{gasto ? `${formatCurrencyRound(gasto)}/año` : '—'}</span>
                    </div>
                  </div>

                  {/* Benchmark */}
                  {(p.precio_benchmark || gap != null) && (
                    <div className="space-y-1 text-sm border-t pt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Benchmark:</span>
                        <span>{p.precio_benchmark ? `${formatCurrency(p.precio_benchmark)} /kg MA` : '—'}</span>
                      </div>
                      {gap != null && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Gap:</span>
                          <div className="flex items-center gap-2">
                            <Badge className={gap > 15 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : gap > 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}>
                              {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                            </Badge>
                            {potencial > 0 && (
                              <span className="text-green-600 font-semibold text-xs">Potencial: {formatCurrencyRound(potencial)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-1 text-xs border-t pt-2 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Proveedor:</span>
                      <span className="text-foreground">{getProveedorNombre(p)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tipo precio:</span>
                      <span className="text-foreground">
                        {p.tipo_precio === 'indexado' ? `Indexado${p.indice_referencia ? ` (${p.indice_referencia})` : ''}` : p.tipo_precio || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Formato:</span>
                      <span className="text-foreground">{ENVASE_OPTIONS.find(e => e.value === p.formato_envase)?.label || p.formato_envase || '—'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => openEdit(p)}>
                      <Edit2 className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => navigate(`/quimicos/${projectId}/benchmarking`)}>
                      <TrendingUp className="w-3 h-3 mr-1" /> Benchmarks
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => navigate(`/quimicos/${projectId}/historico`)}>
                      <Clock className="w-3 h-3 mr-1" /> Historial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
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
              <Label>Formato envase</Label>
              <Select value={form.formato_envase} onValueChange={v => setForm(f => ({ ...f, formato_envase: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ENVASE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proveedor actual</Label>
              <Select value={form.proveedor_actual_id} onValueChange={v => setForm(f => ({ ...f, proveedor_actual_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin proveedor</SelectItem>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <div>
              <Label>Incoterm</Label>
              <Select value={form.incoterm_actual} onValueChange={v => setForm(f => ({ ...f, incoterm_actual: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCOTERM_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.incoterm_actual !== 'DAP' && (
              <div>
                <Label>Coste transporte €/kg</Label>
                <Input type="number" step="0.01" value={form.coste_transporte_separado ?? ''} onChange={e => setForm(f => ({ ...f, coste_transporte_separado: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            )}
            <div>
              <Label>Consumo anual kg</Label>
              <Input type="number" value={form.consumo_anual_kg ?? ''} onChange={e => setForm(f => ({ ...f, consumo_anual_kg: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <Label>Benchmark €/kg MA</Label>
              <Input type="number" step="0.01" value={form.precio_benchmark ?? ''} onChange={e => setForm(f => ({ ...f, precio_benchmark: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            {form.tipo_precio === 'indexado' && (
              <>
                <div>
                  <Label>Índice referencia</Label>
                  <Input value={form.indice_referencia} onChange={e => setForm(f => ({ ...f, indice_referencia: e.target.value }))} placeholder="Ej: ICIS NWE" />
                </div>
                <div>
                  <Label>Prima actual €/tm</Label>
                  <Input type="number" step="0.01" value={form.prima_actual ?? ''} onChange={e => setForm(f => ({ ...f, prima_actual: e.target.value ? parseFloat(e.target.value) : null }))} />
                </div>
              </>
            )}
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
