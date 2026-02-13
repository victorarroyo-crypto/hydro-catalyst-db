import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, DollarSign, Package, Building2, TrendingUp, FileWarning, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const formatCurrency = (val: number | null | undefined) => {
  if (!val) return '0 €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

const GAP_COLORS = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

const getGapColor = (gap: number) => {
  if (gap < 5) return GAP_COLORS.green;
  if (gap < 15) return GAP_COLORS.yellow;
  if (gap < 30) return GAP_COLORS.orange;
  return GAP_COLORS.red;
};

const PARETO_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))'];
const TIPO_PRECIO_COLORS = ['hsl(217, 91%, 60%)', 'hsl(270, 60%, 60%)', 'hsl(220, 10%, 60%)'];

export default function ChemDashboard() {
  const { projectId } = useParams();

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chem_products')
        .select('*')
        .eq('project_id', projectId!)
        .order('consumo_anual_kg', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['chem-audits', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chem_contract_audits')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: savings = [] } = useQuery({
    queryKey: ['chem-savings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chem_savings')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: baselines = [] } = useQuery({
    queryKey: ['chem-baselines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chem_baselines')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // KPIs
  const gastoTotal = products.reduce((sum: number, p: any) => sum + ((p.precio_kg || 0) * (p.consumo_anual_kg || 0)), 0);
  const numProductos = products.length;
  const proveedoresUnicos = new Set(products.map((p: any) => p.proveedor_nombre).filter(Boolean)).size;
  const potencialAhorro = products.reduce((sum: number, p: any) => sum + (p.potencial_ahorro || 0), 0);
  const ahorroConseguido = savings.reduce((sum: number, s: any) => sum + (s.ahorro_anual || 0), 0);
  const ahorroProgress = potencialAhorro > 0 ? (ahorroConseguido / potencialAhorro) * 100 : 0;

  // Scoring medio
  const auditsConScore = audits.filter((a: any) => a.score_media != null);
  const scoreMedio = auditsConScore.length > 0 ? auditsConScore.reduce((s: number, a: any) => s + a.score_media, 0) / auditsConScore.length : 0;
  const proveedoresRojo = audits.filter((a: any) => a.score_media != null && a.score_media < 2.5).length;

  // Donut data
  const paretoData = ['commodity', 'semi-especialidad', 'especialidad'].map(cls => ({
    name: cls.charAt(0).toUpperCase() + cls.slice(1),
    value: products.filter((p: any) => p.clasificacion_pareto === cls).reduce((s: number, p: any) => s + ((p.precio_kg || 0) * (p.consumo_anual_kg || 0)), 0),
  })).filter(d => d.value > 0);

  const tipoPrecioData = ['fijo', 'indexado', 'spot'].map(tipo => ({
    name: tipo.charAt(0).toUpperCase() + tipo.slice(1),
    value: products.filter((p: any) => p.tipo_precio === tipo).reduce((s: number, p: any) => s + ((p.precio_kg || 0) * (p.consumo_anual_kg || 0)), 0),
  })).filter(d => d.value > 0);

  // Top 10 by spend
  const top10 = products.slice(0, 10).map((p: any) => {
    const gasto = (p.precio_kg || 0) * (p.consumo_anual_kg || 0);
    const conc = p.concentracion || 100;
    const precioMA = conc > 0 ? (p.precio_kg || 0) / (conc / 100) : 0;
    const gap = p.benchmark_kg_ma && p.benchmark_kg_ma > 0 ? ((precioMA - p.benchmark_kg_ma) / p.benchmark_kg_ma) * 100 : null;
    return { ...p, gasto, precioMA, gap };
  });

  // Alertas
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const contratosVencen = audits.filter((a: any) => a.fecha_vencimiento && new Date(a.fecha_vencimiento) < in60Days && new Date(a.fecha_vencimiento) > now).length;
  const rappelsNoCobrados = audits.filter((a: any) => a.rappel_existe && !a.rappel_cobrado).length;
  const productsConGap30 = products.filter((p: any) => {
    const conc = p.concentracion || 100;
    const precioMA = conc > 0 ? (p.precio_kg || 0) / (conc / 100) : 0;
    return p.benchmark_kg_ma && p.benchmark_kg_ma > 0 && ((precioMA - p.benchmark_kg_ma) / p.benchmark_kg_ma) * 100 > 30;
  }).length;
  const baselinesSinFirmar = baselines.filter((b: any) => !b.firmado).length;

  const alertas = [
    contratosVencen > 0 && { icon: Clock, color: 'text-red-500 bg-red-50 dark:bg-red-950', text: `${contratosVencen} contratos vencen en <60 días` },
    rappelsNoCobrados > 0 && { icon: DollarSign, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950', text: `${rappelsNoCobrados} rappels no cobrados` },
    proveedoresRojo > 0 && { icon: AlertCircle, color: 'text-red-500 bg-red-50 dark:bg-red-950', text: `${proveedoresRojo} proveedores con score <2.5` },
    productsConGap30 > 0 && { icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-950', text: `${productsConGap30} productos con gap >30%` },
    baselinesSinFirmar > 0 && { icon: FileWarning, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950', text: `${baselinesSinFirmar} baselines sin firmar` },
  ].filter(Boolean) as any[];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Gasto total anual</p>
                <p className="text-2xl font-bold">{formatCurrency(gastoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Nº productos</p>
                <p className="text-2xl font-bold">{numProductos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Nº proveedores</p>
                <p className="text-2xl font-bold">{proveedoresUnicos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Potencial ahorro</p>
                <p className="text-2xl font-bold">{formatCurrency(potencialAhorro)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ahorro progress */}
      {potencialAhorro > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Ahorro conseguido vs potencial</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(ahorroConseguido)} / {formatCurrency(potencialAhorro)} ({ahorroProgress.toFixed(1)}%)
              </span>
            </div>
            <Progress value={ahorroProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Charts + Scoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pareto donut */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución Pareto (por gasto)</CardTitle></CardHeader>
          <CardContent>
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paretoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {paretoData.map((_, i) => <Cell key={i} fill={PARETO_COLORS[i % PARETO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>}
          </CardContent>
        </Card>

        {/* Tipo precio donut */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución tipo precio (por gasto)</CardTitle></CardHeader>
          <CardContent>
            {tipoPrecioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tipoPrecioData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {tipoPrecioData.map((_, i) => <Cell key={i} fill={TIPO_PRECIO_COLORS[i % TIPO_PRECIO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>}
          </CardContent>
        </Card>

        {/* Scoring salud contractual */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Salud contractual</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold">{scoreMedio > 0 ? scoreMedio.toFixed(1) : '—'}</p>
              <p className="text-sm text-muted-foreground">Scoring medio</p>
              {proveedoresRojo > 0 && (
                <Badge variant="destructive" className="mt-2">{proveedoresRojo} proveedores con score &lt;2.5</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Alertas</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {alertas.map((a, i) => (
                <div key={i} className={`flex items-center gap-2 p-3 rounded-lg ${a.color}`}>
                  <a.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{a.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 10 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 productos por gasto</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Gasto anual</TableHead>
                <TableHead className="text-right">Gap %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top10.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Añade productos en Inventario</TableCell></TableRow>
              ) : top10.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre_comercial}</TableCell>
                  <TableCell>{p.proveedor_nombre || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(p.gasto)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${p.gap != null ? getGapColor(p.gap) : ''}`}>
                    {p.gap != null ? `${p.gap.toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
