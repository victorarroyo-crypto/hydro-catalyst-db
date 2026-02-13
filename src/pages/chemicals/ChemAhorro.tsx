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

  const { data: monthly = [] } = useQuery({
    queryKey: ['chem-savings-monthly', projectId],
    queryFn: async () => {
      const savingIds = savings.map((s: any) => s.id);
      if (savingIds.length === 0) return [];
      const { data, error } = await externalSupabase.from('chem_savings_monthly').select('*').in('saving_id', savingIds).order('mes');
      if (error) throw error;
      return data || [];
    },
    enabled: savings.length > 0,
  });

  const ahorroTotal = savings.reduce((s: number, sv: any) => s + (sv.ahorro_anual || 0), 0);
  const potencial = products.reduce((s: number, p: any) => s + (p.potencial_ahorro || 0), 0);
  const successFeeRate = 0.25; // 25% default
  const successFee = ahorroTotal * successFeeRate;

  // Chart data
  const chartData = monthly.reduce((acc: any[], m: any) => {
    const existing = acc.find(a => a.mes === m.mes);
    if (existing) {
      existing.ahorro += m.ahorro_real || 0;
    } else {
      acc.push({ mes: m.mes?.substring(0, 7), ahorro: m.ahorro_real || 0 });
    }
    return acc;
  }, []).map((item: any, i: number, arr: any[]) => {
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
                <TableHead className="text-right">Baseline €/kg MA</TableHead>
                <TableHead className="text-right">Nuevo €/kg MA</TableHead>
                <TableHead className="text-right">Vol. real 12m</TableHead>
                <TableHead className="text-right font-bold">Ahorro anual €</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savings.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay ahorros registrados aún.</TableCell></TableRow>
              ) : savings.map((s: any) => {
                const prod = products.find((p: any) => p.id === s.product_id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{prod?.nombre_comercial || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.tipo_ahorro || '—'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(s.baseline_kg_ma)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(s.nuevo_precio_kg_ma)}</TableCell>
                    <TableCell className="text-right text-sm">{s.volumen_real_12m ? new Intl.NumberFormat('es-ES').format(s.volumen_real_12m) : '—'}</TableCell>
                    <TableCell className="text-right font-bold text-green-600 font-mono">{formatCurrency(s.ahorro_anual)}</TableCell>
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
