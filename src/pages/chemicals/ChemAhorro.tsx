import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

export default function ChemAhorro() {
  const { projectId } = useParams();

  const { data: savings = [] } = useQuery({
    queryKey: ['chem-savings', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_savings').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_products').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Calculate ahorro from savings rows (each has ahorro_real_mes)
  const ahorroTotal = savings.reduce((s: number, sv: any) => s + (sv.ahorro_real_mes || 0), 0);
  
  // Calculate potencial from products (client-side)
  const potencial = products.reduce((s: number, p: any) => {
    const conc = p.concentracion_porcentaje || 100;
    const precioMA = p.precio_unitario_actual && conc > 0 ? p.precio_unitario_actual / (conc / 100) : 0;
    const gap = p.precio_benchmark && p.precio_benchmark > 0 ? precioMA - p.precio_benchmark : 0;
    return s + (gap > 0 ? gap * (conc / 100) * (p.consumo_anual_kg || 0) : 0);
  }, 0);
  
  const successFeeRate = 0.25;
  const successFee = ahorroTotal * successFeeRate;

  // Chart data - group savings by month
  const chartData = savings
    .filter((s: any) => s.mes)
    .sort((a: any, b: any) => (a.mes || '').localeCompare(b.mes || ''))
    .reduce((acc: any[], s: any) => {
      const mesKey = s.mes?.substring(0, 7);
      const existing = acc.find(a => a.mes === mesKey);
      if (existing) {
        existing.ahorro += s.ahorro_real_mes || 0;
      } else {
        acc.push({ mes: mesKey, ahorro: s.ahorro_real_mes || 0 });
      }
      return acc;
    }, [])
    .map((item: any, i: number, arr: any[]) => {
      const acumulado = arr.slice(0, i + 1).reduce((s: number, a: any) => s + a.ahorro, 0);
      return { ...item, acumulado };
    });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Tracking de Ahorro</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Ahorro conseguido</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(ahorroTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Potencial pendiente</p>
              <p className="text-2xl font-bold">{formatCurrency(potencial - ahorroTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Success Fee ERA ({(successFeeRate * 100)}%)</p>
              <p className="text-2xl font-bold">{formatCurrency(successFee)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro acumulado mensual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="acumulado" name="Acumulado €" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo ahorro</TableHead>
                <TableHead className="text-right">Baseline €/kg</TableHead>
                <TableHead className="text-right">Nuevo €/kg</TableHead>
                <TableHead className="text-right">Vol. real 12m</TableHead>
                <TableHead className="text-right">Mes</TableHead>
                <TableHead className="text-right font-bold">Ahorro real mes €</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savings.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay ahorros registrados aún.</TableCell></TableRow>
              ) : savings.map((s: any) => {
                const prod = products.find((p: any) => p.id === s.product_id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{prod?.nombre_comercial || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.tipo_ahorro || '—'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(s.baseline_precio)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(s.nuevo_precio)}</TableCell>
                    <TableCell className="text-right text-sm">{s.volumen_real_12m ? new Intl.NumberFormat('es-ES').format(s.volumen_real_12m) : '—'}</TableCell>
                    <TableCell className="text-right text-sm">{s.mes?.substring(0, 7) || '—'}</TableCell>
                    <TableCell className="text-right font-bold text-green-600 font-mono">{formatCurrency(s.ahorro_real_mes)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
