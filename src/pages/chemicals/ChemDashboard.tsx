import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, AlertTriangle, TrendingDown, TrendingUp, Minus, DollarSign, Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useChemInvoices } from '@/components/chemicals/invoices/useChemInvoices';
import type { InvoiceSummary, ProductBaseline, ChemInvoiceAlert } from '@/components/chemicals/invoices/types';
import { formatEUR, formatEURCurrency, SEVERITY_CONFIG } from '@/components/chemicals/invoices/types';

// Corporate colors
const COLORS = {
  teal: '#307177',
  blue: '#32b4cd',
  green: '#8cb63c',
  orange: '#ffa720',
};

const DONUT_COLORS = [COLORS.teal, COLORS.blue, COLORS.orange, '#9b59b6', COLORS.green];

function compactCurrency(val: number): string {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(1)}K`;
  return `€${val.toFixed(0)}`;
}

// Helper to normalize the summary from either API format
function normalizeSummary(raw: InvoiceSummary) {
  const totalInvoices = raw.total_invoices ?? raw.facturas_analizadas ?? 0;
  const totalGasto = raw.total_gasto ?? raw.gasto_total ?? 0;
  const desglose = raw.desglose_costes ?? { productos: 0, portes: 0, recargos: 0, servicios: 0, descuentos: 0 };
  const pctNoProducto = desglose.pct_no_producto ?? raw.pct_costes_no_producto ?? 0;
  const baselines = raw.baselines ?? raw.baseline_por_producto ?? [];
  const alertas = raw.alertas ?? { total: 0, pendientes: 0, por_tipo: {}, ahorro_potencial_eur: 0 };
  const ahorroPotencial = alertas.ahorro_potencial_eur ?? alertas.ahorro_potencial_total ?? 0;

  return { totalInvoices, totalGasto, desglose, pctNoProducto, baselines, alertas, ahorroPotencial, suppliers: raw.suppliers ?? [] };
}

const TENDENCIA_ICON: Record<string, React.ReactNode> = {
  subiendo: <TrendingUp className="w-3.5 h-3.5 text-red-500" />,
  bajando: <TrendingDown className="w-3.5 h-3.5 text-green-500" />,
  estable: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
  'sin datos': <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
};

export default function ChemDashboard() {
  const { projectId } = useParams();
  const { summary, summaryLoading, alerts, alertsLoading, analyzeInvoices, analyzingInvoices, refetchAll } = useChemInvoices(projectId);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24 space-y-4">
        <Receipt className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">No hay datos de resumen disponibles.<br />Sube facturas y ejecuta el análisis para generar el dashboard.</p>
        <Button onClick={() => analyzeInvoices()} disabled={analyzingInvoices}>
          {analyzingInvoices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Ejecutar Análisis
        </Button>
      </div>
    );
  }

  const s = normalizeSummary(summary);
  const pendingAlerts = alerts.filter(a => a.estado === 'pendiente');
  const criticalAlerts = pendingAlerts.filter(a => a.severidad === 'critica' || a.severidad === 'alta').slice(0, 5);

  // KPI data
  const kpis = [
    { label: 'Gasto Total', value: compactCurrency(s.totalGasto), color: COLORS.teal, icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Facturas Analizadas', value: s.totalInvoices.toString(), color: COLORS.blue, icon: <Receipt className="w-5 h-5" /> },
    { label: 'Alertas Pendientes', value: (s.alertas.pendientes ?? pendingAlerts.length).toString(), color: (s.alertas.pendientes ?? pendingAlerts.length) > 0 ? COLORS.orange : COLORS.green, icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Ahorro Potencial', value: compactCurrency(s.ahorroPotencial), color: COLORS.green, icon: <TrendingDown className="w-5 h-5" /> },
  ];

  // Donut data
  const donutData = [
    { name: 'Productos', value: s.desglose.productos, pct: 0 },
    { name: 'Portes', value: s.desglose.portes, pct: 0 },
    { name: 'Recargos', value: s.desglose.recargos, pct: 0 },
    { name: 'Servicios', value: s.desglose.servicios, pct: 0 },
    { name: 'Descuentos', value: Math.abs(s.desglose.descuentos ?? 0), pct: 0 },
  ].filter(d => d.value > 0);
  const donutTotal = donutData.reduce((acc, d) => acc + d.value, 0);
  donutData.forEach(d => { d.pct = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0; });

  // Top 10 baselines
  const top10 = [...s.baselines]
    .sort((a, b) => ((b.gasto_anual ?? b.precio_medio * b.volumen_total_kg) - (a.gasto_anual ?? a.precio_medio * a.volumen_total_kg)))
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                  <div style={{ color: kpi.color }}>{kpi.icon}</div>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Donut + Non-product cost warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desglose de Costes</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatEURCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="flex-1">{d.name}</span>
                      <span className="font-mono text-xs">{d.pct.toFixed(1)}%</span>
                      <span className="font-mono text-xs text-muted-foreground w-20 text-right">{formatEURCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos de desglose</p>
            )}

            {/* Non-product cost warning */}
            {s.pctNoProducto > 0 && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${s.pctNoProducto > 10 ? 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300' : 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'}`}>
                {s.pctNoProducto > 10 ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
                <span>% Costes No-Producto: <strong>{s.pctNoProducto.toFixed(1)}%</strong> {s.pctNoProducto > 10 ? '(objetivo: <10%)' : '✓'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: COLORS.orange }} />
              Alertas Críticas
              {pendingAlerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] ml-auto">{pendingAlerts.length} pendientes</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin alertas críticas pendientes 🎉</p>
            ) : (
              <div className="space-y-2">
                {criticalAlerts.map(alert => {
                  const sevConfig = SEVERITY_CONFIG[alert.severidad];
                  return (
                    <div key={alert.id} className={`p-3 rounded-lg border ${sevConfig.border}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] ${sevConfig.color}`}>{sevConfig.label}</Badge>
                            {alert.chem_suppliers?.nombre && (
                              <span className="text-xs text-muted-foreground truncate">{alert.chem_suppliers.nombre}</span>
                            )}
                          </div>
                          <p className="text-xs line-clamp-2">{alert.descripcion}</p>
                        </div>
                        {alert.impacto_estimado_eur != null && alert.impacto_estimado_eur > 0 && (
                          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: COLORS.green }}>
                            {formatEURCurrency(alert.impacto_estimado_eur)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pendingAlerts.length > criticalAlerts.length && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingAlerts.length - criticalAlerts.length} alertas más en la pestaña Contratos → Facturas
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Baseline table (Top 10) */}
      {top10.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Baseline por Producto (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-right">€/kg</TableHead>
                  <TableHead className="text-xs text-right">€/kg MA</TableHead>
                  <TableHead className="text-xs text-right">Conc. %</TableHead>
                  <TableHead className="text-xs text-right">Vol. (kg)</TableHead>
                  <TableHead className="text-xs text-right">Gasto</TableHead>
                  <TableHead className="text-xs text-center">Tend.</TableHead>
                  <TableHead className="text-xs text-center">Facturas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top10.map((bl, i) => {
                  const precioKg = bl.precio_medio_ponderado ?? bl.precio_medio;
                  const precioMA = bl.precio_medio_ponderado_ma ?? bl.precio_kg_ma;
                  const conc = bl.concentracion_media ?? bl.concentracion;
                  const vol = bl.volumen_anual_kg ?? bl.volumen_total_kg;
                  const gasto = bl.gasto_anual ?? precioKg * vol;
                  const tend = bl.tendencia ?? 'sin datos';

                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">{bl.producto}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatEUR(precioKg, 4)}</TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold">{precioMA != null ? formatEUR(precioMA, 3) : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{conc != null ? `${conc.toFixed(0)}%` : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{vol.toLocaleString('es-ES')}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatEURCurrency(gasto)}</TableCell>
                      <TableCell className="text-xs text-center">{TENDENCIA_ICON[tend]}</TableCell>
                      <TableCell className="text-xs text-center">{bl.num_facturas}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Supplier breakdown */}
      {s.suppliers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gasto por Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Proveedor</TableHead>
                  <TableHead className="text-xs text-center">Facturas</TableHead>
                  <TableHead className="text-xs text-right">Gasto total</TableHead>
                  <TableHead className="text-xs text-center">Alertas pend.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.suppliers.map(sup => (
                  <TableRow key={sup.supplier_id}>
                    <TableCell className="text-xs font-medium">{sup.nombre}</TableCell>
                    <TableCell className="text-xs text-center">{sup.num_facturas}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatEURCurrency(sup.gasto_total)}</TableCell>
                    <TableCell className="text-xs text-center">
                      {sup.alertas_pendientes > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">{sup.alertas_pendientes}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={() => analyzeInvoices()} disabled={analyzingInvoices} style={{ backgroundColor: COLORS.teal }}>
          {analyzingInvoices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Ejecutar Análisis
        </Button>
        <Button variant="outline" onClick={() => refetchAll()}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Refrescar datos
        </Button>
      </div>
    </div>
  );
}
