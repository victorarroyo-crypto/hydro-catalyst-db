import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, AlertTriangle, TrendingDown, Percent, BrainCircuit } from 'lucide-react';
import type { InvoiceSummary } from './types';
import { formatEUR, formatEURCurrency } from './types';

interface Props {
  summary: InvoiceSummary | null | undefined;
  loading: boolean;
}

export function ChemInvoiceSummary({ summary, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Receipt className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No hay datos de resumen disponibles. Procesa facturas primero.</p>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: 'Total Facturas', value: summary.total_invoices.toString(), icon: <Receipt className="w-5 h-5" /> },
    { label: 'Gasto Total', value: formatEURCurrency(summary.total_gasto), icon: <TrendingDown className="w-5 h-5" /> },
    { label: 'Alertas Pend.', value: summary.alertas.pendientes.toString(), icon: <AlertTriangle className="w-5 h-5" />, highlight: summary.alertas.pendientes > 0 },
    { label: 'Ahorro Potencial', value: formatEURCurrency(summary.alertas.ahorro_potencial_eur), icon: <TrendingDown className="w-5 h-5" />, highlight: true, green: true },
    { label: '% No Producto', value: `${summary.desglose_costes.pct_no_producto.toFixed(1)}%`, icon: <Percent className="w-5 h-5" />, highlight: summary.desglose_costes.pct_no_producto > 15 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-1 text-muted-foreground">{kpi.icon}</div>
              <p className={`text-lg font-bold ${kpi.green ? 'text-green-600 dark:text-green-400' : kpi.highlight ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Desglose de costes</CardTitle>
        </CardHeader>
        <CardContent>
          {[
            { label: 'Productos', value: summary.desglose_costes.productos, color: 'bg-primary/60' },
            { label: 'Portes', value: summary.desglose_costes.portes, color: 'bg-blue-500' },
            { label: 'Recargos', value: summary.desglose_costes.recargos, color: 'bg-orange-500' },
            { label: 'Servicios', value: summary.desglose_costes.servicios, color: 'bg-purple-500' },
            { label: 'Descuentos', value: summary.desglose_costes.descuentos, color: 'bg-green-500' },
          ].map(item => {
            const pct = summary.total_gasto > 0 ? (Math.abs(item.value) / summary.total_gasto * 100) : 0;
            return (
              <div key={item.label} className="flex items-center gap-2 text-xs mb-1.5">
                <span className="w-24">{item.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="w-24 text-right font-mono">{formatEUR(item.value)} €</span>
                <span className="w-12 text-right font-mono text-muted-foreground">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Baselines */}
      {summary.baselines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Baseline de precios por producto</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-right">Precio medio</TableHead>
                  <TableHead className="text-xs text-right">Vol. total (kg)</TableHead>
                  <TableHead className="text-xs text-right">Gasto</TableHead>
                  <TableHead className="text-xs text-right">Precio €/kg MA</TableHead>
                  <TableHead className="text-xs text-center">Facturas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.baselines.map((bl, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{bl.producto}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatEUR(bl.precio_medio, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{bl.volumen_total_kg.toLocaleString('es-ES')}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatEUR(bl.precio_medio * bl.volumen_total_kg)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {bl.precio_kg_ma != null ? formatEUR(bl.precio_kg_ma, 3) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-center">{bl.num_facturas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Suppliers */}
      {summary.suppliers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gasto por proveedor</CardTitle>
          </CardHeader>
          <CardContent>
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
                {summary.suppliers.map(sup => (
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
    </div>
  );
}
