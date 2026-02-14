import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, AlertTriangle, TrendingDown, TrendingUp, Minus, DollarSign, Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChemInvoices } from '@/components/chemicals/invoices/useChemInvoices';
import type { InvoiceSummary, ProductBaseline, ChemInvoiceAlert } from '@/components/chemicals/invoices/types';
import { formatEUR, formatEURCurrency, SEVERITY_CONFIG } from '@/components/chemicals/invoices/types';
import { API_URL } from '@/lib/api';

function getDominantFormat(formatos?: Record<string, number>): string | null {
  if (!formatos || Object.keys(formatos).length === 0) return null;
  return Object.entries(formatos).sort(([, a], [, b]) => b - a)[0][0];
}

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


export default function ChemDashboard() {
  const { projectId } = useParams();
  const { summary, summaryLoading, alerts, alertsLoading, analyzeInvoices, analyzingInvoices, refetchAll, invoices } = useChemInvoices(projectId);

  // Fetch real product data (source of truth for gasto_anual)
  const { data: productData = [] } = useQuery({
    queryKey: ['chem-products-dashboard', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/chem-consulting/projects/${projectId}/products?view=calculated`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? json.products ?? []);
    },
    enabled: !!projectId,
  });

  // Build nombre -> gasto_anual map from products (source of truth)
  const productGastoMap = useMemo(() => {
    const map: Record<string, number> = {};
    productData.forEach((p: any) => {
      if (p.nombre_comercial && p.gasto_anual != null) {
        map[p.nombre_comercial.toLowerCase().trim()] = p.gasto_anual;
      }
    });
    return map;
  }, [productData]);

  // Calculate real gasto total from products (source of truth, no duplicates)
  const realGastoTotal = useMemo(() => {
    if (productData.length > 0) {
      const sum = productData.reduce((acc: number, p: any) => acc + (p.gasto_anual ?? 0), 0);
      if (sum > 0) return sum;
    }
    return summary ? (normalizeSummary(summary).totalGasto) : 0;
  }, [productData, summary]);

  // Use deduplicated invoice count
  const realInvoiceCount = invoices.length > 0 ? invoices.length : (summary ? (normalizeSummary(summary).totalInvoices) : 0);

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
    { label: 'Gasto Total', value: compactCurrency(realGastoTotal), color: COLORS.teal, icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Facturas Analizadas', value: realInvoiceCount.toString(), color: COLORS.blue, icon: <Receipt className="w-5 h-5" /> },
    { label: 'Alertas Pendientes', value: (s.alertas.pendientes ?? pendingAlerts.length).toString(), color: (s.alertas.pendientes ?? pendingAlerts.length) > 0 ? COLORS.orange : COLORS.green, icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Ahorro Potencial', value: compactCurrency(s.ahorroPotencial), color: COLORS.green, icon: <TrendingDown className="w-5 h-5" /> },
  ];

  // Donut data — breakdown by product, using product endpoint gasto_anual as source of truth
  const donutData = s.baselines
    .map(b => {
      const key = b.producto.toLowerCase().trim();
      const realGasto = productGastoMap[key];
      const fallbackPrecio = b.precio_medio_ponderado ?? b.precio_medio;
      const fallbackVol = b.volumen_anual_kg ?? b.volumen_total_kg;
      return {
        name: b.producto,
        value: realGasto ?? b.gasto_anual ?? (fallbackPrecio * fallbackVol),
        pct: 0,
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Group small slices into "Otros" if more than 8 products
  if (donutData.length > 8) {
    const top7 = donutData.slice(0, 7);
    const rest = donutData.slice(7);
    const otrosValue = rest.reduce((sum, d) => sum + d.value, 0);
    donutData.length = 0;
    donutData.push(...top7, { name: 'Otros', value: otrosValue, pct: 0 });
  }

  const donutTotal = donutData.reduce((acc, d) => acc + d.value, 0);
  donutData.forEach(d => { d.pct = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0; });

  // Top 10 baselines — use product gasto as source of truth
  const getBaselineGasto = (b: ProductBaseline) => {
    const key = b.producto.toLowerCase().trim();
    return productGastoMap[key] ?? b.gasto_anual ?? (b.precio_medio_ponderado ?? b.precio_medio) * (b.volumen_anual_kg ?? b.volumen_total_kg);
  };
  const top10 = [...s.baselines]
    .sort((a, b) => getBaselineGasto(b) - getBaselineGasto(a))
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
            <CardTitle className="text-sm">Desglose por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatEURCurrency(v)} />
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
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right">
                      <Tooltip><TooltipTrigger asChild><span className="cursor-help">Precio Nominal</span></TooltipTrigger>
                        <TooltipContent>Media ponderada de facturas</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      <Tooltip><TooltipTrigger asChild><span className="cursor-help">Precio MA</span></TooltipTrigger>
                        <TooltipContent>Normalizado por concentración</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      <Tooltip><TooltipTrigger asChild><span className="cursor-help">Conc.</span></TooltipTrigger>
                        <TooltipContent>Concentración media detectada</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      <Tooltip><TooltipTrigger asChild><span className="cursor-help">TCO</span></TooltipTrigger>
                        <TooltipContent>Precio + portes + recargos atribuidos. Rojo si TCO {'>'} precio × 1.15</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="text-xs text-right">Volumen</TableHead>
                    <TableHead className="text-xs text-right">Gasto</TableHead>
                    <TableHead className="text-xs text-center">Tend.</TableHead>
                    <TableHead className="text-xs text-center">Formato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top10.map((bl, i) => {
                    const precioKg = bl.precio_medio_ponderado ?? bl.precio_medio;
                    const precioMA = bl.precio_medio_ponderado_ma ?? bl.precio_kg_ma;
                    const conc = bl.concentracion_media ?? bl.concentracion;
                    const vol = bl.volumen_anual_kg ?? bl.volumen_total_kg;
                    const gasto = getBaselineGasto(bl);
                    const tend = bl.tendencia ?? 'sin datos';
                    const variacion = bl.variacion_pct ?? 0;
                    const tco = bl.tco_kg;
                    const tcoHighlight = tco != null && precioKg > 0 && tco > precioKg * 1.15;
                    const dominantFormat = getDominantFormat(bl.formatos);

                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{bl.producto}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatEUR(precioKg, 4)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {precioMA != null ? (
                            <span className="font-bold">{formatEUR(precioMA, 4)}</span>
                          ) : (
                            <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">—</span></TooltipTrigger>
                              <TooltipContent>Sin datos de concentración</TooltipContent></Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{conc != null ? `${conc.toFixed(0)}%` : '—'}</TableCell>
                        <TableCell className={`text-xs text-right font-mono ${tcoHighlight ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold' : ''}`}>
                          {tco != null ? formatEUR(tco, 4) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{vol.toLocaleString('es-ES')} kg</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatEURCurrency(gasto)}</TableCell>
                        <TableCell className="text-xs text-center">
                          <span className="inline-flex items-center gap-1">
                            {tend === 'subiendo' && variacion > 5 ? (
                              <span className="text-red-600 font-bold inline-flex items-center gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" />+{variacion.toFixed(1)}%
                              </span>
                            ) : tend === 'subiendo' ? (
                              <span className="text-red-500 inline-flex items-center gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" />+{variacion.toFixed(1)}%
                              </span>
                            ) : tend === 'bajando' ? (
                              <span className="text-green-600 inline-flex items-center gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5" />{variacion.toFixed(1)}%
                              </span>
                            ) : tend === 'estable' ? (
                              <span className="text-muted-foreground inline-flex items-center gap-0.5">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {dominantFormat ? (
                            <Badge variant="outline" className="text-[10px]">{dominantFormat}</Badge>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>

            {/* TCO cost breakdown bar */}
            {s.desglose && donutTotal > 0 && (
              <div className="px-4 py-3 border-t">
                <div className="flex h-5 w-full rounded-md overflow-hidden text-[10px] font-medium">
                  {donutData.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-center text-white whitespace-nowrap overflow-hidden"
                      style={{ width: `${d.pct}%`, backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length], minWidth: d.pct > 3 ? undefined : 0 }}
                    >
                      {d.pct >= 5 && `${d.pct.toFixed(1)}% ${d.name}`}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-1.5 flex-wrap">
                  {donutData.map((d, i) => (
                    <span key={d.name} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {d.pct.toFixed(1)}% {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
