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
import { toast } from 'sonner';
import { Upload, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(val);
};

export default function ChemHistorico() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_products').select('*').eq('project_id', projectId!).order('nombre_comercial');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const product = products.find((p: any) => p.id === selectedProduct);

  const { data: history = [] } = useQuery({
    queryKey: ['chem-price-history', selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const { data, error } = await externalSupabase.from('chem_price_history').select('*').eq('product_id', selectedProduct).order('mes', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProduct,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await externalSupabase.from('chem_price_history').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-price-history', selectedProduct] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const addMonthMutation = useMutation({
    mutationFn: async (mes: string) => {
      const { error } = await externalSupabase.from('chem_price_history').insert({ project_id: projectId!, product_id: selectedProduct, mes });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-price-history', selectedProduct] });
    },
    onError: () => toast.error('Error al añadir mes'),
  });

  const conc = product?.concentracion || 100;
  const isIndexado = product?.tipo_precio === 'indexado';

  // Generate last 24 months if no data
  const generateMonths = () => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().split('T')[0]);
    }
    return months;
  };

  const enriched = history.map((h: any) => {
    const precioUnit = h.cantidad_kg && h.cantidad_kg > 0 ? h.importe_facturado / h.cantidad_kg : null;
    const precioMA = precioUnit && conc > 0 ? precioUnit / (conc / 100) : null;
    const primaEfectiva = isIndexado && h.indice_icis && precioMA ? (precioMA - h.indice_icis) : null;
    return { ...h, precioUnit, precioMA, primaEfectiva };
  });

  // Chart data
  const chartData = enriched.map((h: any) => ({
    mes: h.mes?.substring(0, 7),
    precioMA: h.precioMA,
    ...(isIndexado ? { icis: h.indice_icis, prima: h.primaEfectiva } : {}),
  }));

  // Stats
  const ponderada12 = (() => {
    const last12 = enriched.slice(-12);
    const totalImporte = last12.reduce((s: number, h: any) => s + (h.importe_facturado || 0), 0);
    const totalKg = last12.reduce((s: number, h: any) => s + (h.cantidad_kg || 0), 0);
    if (totalKg === 0) return null;
    const precioMedio = totalImporte / totalKg;
    return conc > 0 ? precioMedio / (conc / 100) : null;
  })();

  const variacion = (() => {
    if (enriched.length < 2) return null;
    const first = enriched[0]?.precioMA;
    const last = enriched[enriched.length - 1]?.precioMA;
    if (!first || !last) return null;
    return ((last - first) / first) * 100;
  })();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Histórico de Precios</h2>
        <Button size="sm" variant="outline" disabled><Upload className="w-4 h-4 mr-1" /> Importar CSV</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label>Producto:</Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
          <SelectContent>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre_comercial} ({p.materia_activa || '—'})</SelectItem>)}
          </SelectContent>
        </Select>
        {product && <Badge variant="outline">{product.tipo_precio}</Badge>}
      </div>

      {selectedProduct && product && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Media ponderada 12m</p>
                <p className="text-2xl font-bold text-primary">{ponderada12 ? formatCurrency(ponderada12) : '—'}</p>
                <p className="text-xs text-muted-foreground">€/kg MA</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Variación periodo</p>
                {variacion !== null ? (
                  <div className="flex items-center justify-center gap-1">
                    {variacion > 0 ? <ArrowUp className="w-5 h-5 text-red-500" /> : <ArrowDown className="w-5 h-5 text-green-500" />}
                    <span className={`text-2xl font-bold ${variacion > 0 ? 'text-red-600' : 'text-green-600'}`}>{variacion.toFixed(1)}%</span>
                  </div>
                ) : <p className="text-2xl font-bold">—</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{history.length}</p>
                <Button size="sm" variant="link" className="text-xs mt-1" disabled>Usar como baseline</Button>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución precio €/kg MA</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="precioMA" name="€/kg MA" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    {isIndexado && <>
                      <Line type="monotone" dataKey="icis" name="Índice ICIS" stroke="hsl(270, 60%, 60%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="prima" name="Prima efectiva" stroke="hsl(30, 90%, 50%)" strokeWidth={1} dot={false} />
                    </>}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Datos mensuales</CardTitle>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                  const nextMonth = new Date();
                  nextMonth.setDate(1);
                  const mes = nextMonth.toISOString().split('T')[0];
                  addMonthMutation.mutate(mes);
                }}>+ Añadir mes</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Importe facturado €</TableHead>
                    <TableHead className="text-right">Cantidad kg</TableHead>
                    <TableHead className="text-right">€/kg prod.</TableHead>
                    <TableHead className="text-right font-bold bg-primary/5">€/kg MA</TableHead>
                    {isIndexado && <>
                      <TableHead className="text-right">Índice ICIS</TableHead>
                      <TableHead className="text-right">Prima efectiva</TableHead>
                    </>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enriched.length === 0 ? (
                    <TableRow><TableCell colSpan={isIndexado ? 7 : 5} className="text-center py-6 text-muted-foreground">Sin datos. Añade meses o importa CSV.</TableCell></TableRow>
                  ) : enriched.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">{h.mes?.substring(0, 7)}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="0.01" className="w-28 h-7 text-xs text-right" value={h.importe_facturado ?? ''} onChange={e => saveMutation.mutate({ id: h.id, data: { importe_facturado: e.target.value ? parseFloat(e.target.value) : null } })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" className="w-24 h-7 text-xs text-right" value={h.cantidad_kg ?? ''} onChange={e => saveMutation.mutate({ id: h.id, data: { cantidad_kg: e.target.value ? parseFloat(e.target.value) : null } })} />
                      </TableCell>
                      <TableCell className="text-right text-sm">{h.precioUnit ? formatCurrency(h.precioUnit) : '—'}</TableCell>
                      <TableCell className="text-right font-bold text-primary bg-primary/5 text-sm">{h.precioMA ? formatCurrency(h.precioMA) : '—'}</TableCell>
                      {isIndexado && <>
                        <TableCell className="text-right">
                          <Input type="number" step="0.01" className="w-20 h-7 text-xs text-right" value={h.indice_icis ?? ''} onChange={e => saveMutation.mutate({ id: h.id, data: { indice_icis: e.target.value ? parseFloat(e.target.value) : null } })} />
                        </TableCell>
                        <TableCell className="text-right text-sm">{h.primaEfectiva ? formatCurrency(h.primaEfectiva) : '—'}</TableCell>
                      </>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
