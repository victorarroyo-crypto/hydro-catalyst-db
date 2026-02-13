import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ChevronDown, ExternalLink, Lightbulb, Save } from 'lucide-react';

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(val);
};

const getEstadoBadge = (estado: string | null) => {
  switch (estado) {
    case 'sin_investigar': return <Badge variant="destructive" className="text-[10px]">🔴 Sin investigar</Badge>;
    case 'en_curso': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">🟡 En curso</Badge>;
    case 'completado': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">🟢 Completado</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">{estado || '—'}</Badge>;
  }
};

const getGapColor = (gap: number | null) => {
  if (gap === null) return '';
  if (gap < 5) return 'text-green-600';
  if (gap < 15) return 'text-yellow-600';
  if (gap < 30) return 'text-orange-600';
  return 'text-red-600 font-bold';
};

export default function ChemBenchmarking() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_products').select('*').eq('project_id', projectId!).order('consumo_anual_kg', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['chem-benchmarks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_benchmarks').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: library = [] } = useQuery({
    queryKey: ['chem-benchmark-library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_benchmark_library').select('*').eq('vigente', true);
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: any }) => {
      const existing = benchmarks.find((b: any) => b.product_id === productId);
      if (existing) {
        const { error } = await supabase.from('chem_benchmarks').update(data).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chem_benchmarks').insert({ ...data, project_id: projectId, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-benchmarks', projectId] });
      toast.success('Benchmark actualizado');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const updateField = (productId: string, field: string, value: any) => {
    upsertMutation.mutate({ productId, data: { [field]: value } });
  };

  // Auto-calculate estado and mejor_benchmark
  const autoCalc = (productId: string, bm: any) => {
    const sources = [bm?.cotizacion_1_precio, bm?.cotizacion_2_precio, bm?.cotizacion_3_precio, bm?.taric_precio_cif, bm?.icis_precio, bm?.historico_precio].filter(v => v != null);
    const filledCount = sources.length;
    let estado = 'sin_investigar';
    if (filledCount >= 2) estado = 'completado';
    else if (filledCount >= 1) estado = 'en_curso';
    const mejor = sources.length > 0 ? Math.min(...(sources as number[])) : null;
    return { estado, mejor_benchmark: mejor };
  };

  const updateAndRecalc = (productId: string, field: string, value: any) => {
    const bm = benchmarks.find((b: any) => b.product_id === productId) || {};
    const updated = { ...bm, [field]: value };
    const { estado, mejor_benchmark } = autoCalc(productId, updated);
    upsertMutation.mutate({ productId, data: { [field]: value, estado, mejor_benchmark } });
  };

  const completados = products.filter((p: any) => {
    const bm = benchmarks.find((b: any) => b.product_id === p.id);
    return bm?.estado === 'completado';
  }).length;
  const progressPct = products.length > 0 ? (completados / products.length) * 100 : 0;

  const [filterEstado, setFilterEstado] = useState<string>('all');
  const filtered = products.filter((p: any) => {
    if (filterEstado === 'all') return true;
    const bm = benchmarks.find((b: any) => b.product_id === p.id);
    return (bm?.estado || 'sin_investigar') === filterEstado;
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Benchmarking</h2>

      {/* Progress */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{completados} de {products.length} productos benchmarkeados</span>
            <div className="flex gap-2">
              {['all', 'sin_investigar', 'en_curso', 'completado'].map(e => (
                <Button key={e} size="sm" variant={filterEstado === e ? 'default' : 'outline'} className="text-xs h-7"
                  onClick={() => setFilterEstado(e)}>
                  {e === 'all' ? 'Todos' : e === 'sin_investigar' ? '🔴 Sin investigar' : e === 'en_curso' ? '🟡 En curso' : '🟢 Completado'}
                </Button>
              ))}
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Products */}
      {filtered.map((p: any) => {
        const bm = benchmarks.find((b: any) => b.product_id === p.id);
        const conc = p.concentracion || 100;
        const precioMA = p.precio_kg && conc > 0 ? p.precio_kg / (conc / 100) : null;
        const gap = bm?.mejor_benchmark && precioMA ? ((precioMA - bm.mejor_benchmark) / bm.mejor_benchmark) * 100 : null;
        const isExpanded = expandedProduct === p.id;

        // Library match
        const libraryMatch = library.find((l: any) =>
          l.materia_activa?.toLowerCase() === p.materia_activa?.toLowerCase() &&
          l.concentracion && p.concentracion &&
          Math.abs(l.concentracion - p.concentracion) / p.concentracion <= 0.05
        );

        return (
          <Card key={p.id}>
            <div className="p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <div>
                    <span className="font-medium">{p.nombre_comercial}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.materia_activa} {p.concentracion ? `${p.concentracion}%` : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Cliente: <strong className="text-primary">{precioMA ? formatCurrency(precioMA) : '—'}</strong> €/kg MA</span>
                  {getEstadoBadge(bm?.estado || 'sin_investigar')}
                  {bm?.mejor_benchmark && <span className="text-sm">Mejor: <strong>{formatCurrency(bm.mejor_benchmark)}</strong></span>}
                  {gap !== null && <span className={`text-sm font-bold ${getGapColor(gap)}`}>Gap: {gap.toFixed(1)}%</span>}
                </div>
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Library match */}
                {libraryMatch && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800 text-sm">
                    <div className="flex items-center gap-2 mb-1"><Lightbulb className="w-4 h-4 text-blue-600" /> <strong>Referencia encontrada</strong></div>
                    <p className="text-xs">En proyecto {libraryMatch.proyecto_origen || '—'} ({libraryMatch.fecha}) se cotizó {libraryMatch.materia_activa} al {libraryMatch.concentracion}% a <strong>{formatCurrency(libraryMatch.precio_kg_ma)}</strong> €/kg MA DAP {libraryMatch.proveedor ? `(${libraryMatch.proveedor})` : ''}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => updateAndRecalc(p.id, 'historico_precio', libraryMatch.precio_kg_ma)}>
                        Usar como referencia
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cotizaciones */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="text-sm font-medium flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Cotizaciones distribuidores</CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-1">
                          <Label className="text-xs">Proveedor {i}</Label>
                          <Input className="h-7 text-xs" value={(bm as any)?.[`cotizacion_${i}_proveedor`] ?? ''} onChange={e => updateField(p.id, `cotizacion_${i}_proveedor`, e.target.value)} placeholder="Nombre" />
                          <Input type="number" step="0.01" className="h-7 text-xs" value={(bm as any)?.[`cotizacion_${i}_precio`] ?? ''} onChange={e => updateAndRecalc(p.id, `cotizacion_${i}_precio`, e.target.value ? parseFloat(e.target.value) : null)} placeholder="€/kg DAP" />
                          <Input type="date" className="h-7 text-xs" value={(bm as any)?.[`cotizacion_${i}_fecha`] ?? ''} onChange={e => updateField(p.id, `cotizacion_${i}_fecha`, e.target.value || null)} />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* DataComex */}
                <Collapsible>
                  <CollapsibleTrigger className="text-sm font-medium flex items-center gap-1"><ChevronDown className="w-3 h-3" /> DataComex (TARIC)</CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Código TARIC</Label>
                        <Input className="h-7 text-xs" value={p.codigo_taric || ''} disabled />
                      </div>
                      <div>
                        <Label className="text-xs">Precio CIF €/kg</Label>
                        <Input type="number" step="0.01" className="h-7 text-xs" value={bm?.taric_precio_cif ?? ''} onChange={e => {
                          const cif = e.target.value ? parseFloat(e.target.value) : null;
                          updateAndRecalc(p.id, 'taric_precio_cif', cif);
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">Periodo</Label>
                        <Input className="h-7 text-xs" value={bm?.taric_periodo ?? ''} onChange={e => updateField(p.id, 'taric_periodo', e.target.value)} />
                      </div>
                    </div>
                    {bm?.taric_precio_cif && (
                      <p className="text-xs text-muted-foreground mt-1">Estimación DAP: <strong>{formatCurrency(bm.taric_precio_cif * 1.20)}</strong> (CIF × 1.20)</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* ICIS */}
                <Collapsible>
                  <CollapsibleTrigger className="text-sm font-medium flex items-center gap-1"><ChevronDown className="w-3 h-3" /> ICIS / ChemAnalyst</CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Precio ref. €/kg</Label>
                        <Input type="number" step="0.01" className="h-7 text-xs" value={bm?.icis_precio ?? ''} onChange={e => updateAndRecalc(p.id, 'icis_precio', e.target.value ? parseFloat(e.target.value) : null)} />
                      </div>
                      <div>
                        <Label className="text-xs">Prima mercado €/tm</Label>
                        <Input type="number" step="0.01" className="h-7 text-xs" value={bm?.icis_prima ?? ''} onChange={e => updateField(p.id, 'icis_prima', e.target.value ? parseFloat(e.target.value) : null)} />
                      </div>
                      <div>
                        <Label className="text-xs">Fecha</Label>
                        <Input type="date" className="h-7 text-xs" value={bm?.icis_fecha ?? ''} onChange={e => updateField(p.id, 'icis_fecha', e.target.value || null)} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Histórico */}
                <Collapsible>
                  <CollapsibleTrigger className="text-sm font-medium flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Benchmark histórico</CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Precio €/kg MA</Label>
                        <Input type="number" step="0.01" className="h-7 text-xs" value={bm?.historico_precio ?? ''} onChange={e => updateAndRecalc(p.id, 'historico_precio', e.target.value ? parseFloat(e.target.value) : null)} />
                      </div>
                      <div>
                        <Label className="text-xs">Proyecto origen</Label>
                        <Input className="h-7 text-xs" value={bm?.historico_proyecto ?? ''} onChange={e => updateField(p.id, 'historico_proyecto', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Proveedor</Label>
                        <Input className="h-7 text-xs" value={bm?.historico_proveedor ?? ''} onChange={e => updateField(p.id, 'historico_proveedor', e.target.value)} />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Resultado */}
                {bm?.mejor_benchmark && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-2">Resultado</p>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">Mejor benchmark: <strong className="text-primary text-lg">{formatCurrency(bm.mejor_benchmark)}</strong> €/kg MA</span>
                      {gap !== null && <span className={`text-lg font-bold ${getGapColor(gap)}`}>Gap: {gap.toFixed(1)}%</span>}
                      <Button size="sm" variant="outline" className="text-xs ml-auto" disabled><Save className="w-3 h-3 mr-1" /> Guardar en biblioteca</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Links de referencia */}
      <Card>
        <CardHeader className="py-2"><CardTitle className="text-xs text-muted-foreground">Fuentes de referencia</CardTitle></CardHeader>
        <CardContent className="flex gap-4 pb-3">
          {[
            { label: 'DataComex', url: 'https://datacomex.comercio.es' },
            { label: 'Euro Chlor', url: 'https://www.eurochlor.org' },
            { label: 'ChemAnalyst', url: 'https://www.chemanalyst.com' },
            { label: 'ICIS', url: 'https://www.icis.com' },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              {l.label} <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
