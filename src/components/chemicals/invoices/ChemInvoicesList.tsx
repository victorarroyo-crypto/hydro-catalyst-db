import React, { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Trash2, Package, Truck, AlertTriangle, ArrowDown, Clock, Wrench, HelpCircle, Loader2, Link, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChemInvoice, ChemInvoiceLine, LineType } from './types';
import { LINE_TYPE_CONFIG, ESTADO_FACTURA_CONFIG, formatEUR } from './types';

interface Props {
  invoices: ChemInvoice[];
  loading: boolean;
  onUpdateInvoice: (args: { invoiceId: string; data: any }) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onAutoLink: () => void;
  autoLinking: boolean;
  documentUrlMap: Record<string, string>;
  onOpenPdf: (fileUrl: string) => void;
}

const LINE_ICONS: Partial<Record<LineType, React.ReactNode>> = {
  producto: <Package className="w-3.5 h-3.5" />,
  porte_transporte: <Truck className="w-3.5 h-3.5" />,
  recargo_urgencia: <AlertTriangle className="w-3.5 h-3.5" />,
  rappel_descuento: <ArrowDown className="w-3.5 h-3.5" />,
  pronto_pago: <Clock className="w-3.5 h-3.5" />,
  alquiler_equipo: <Wrench className="w-3.5 h-3.5" />,
  otro: <HelpCircle className="w-3.5 h-3.5" />,
};

export function ChemInvoicesList({ invoices, loading, onUpdateInvoice, onDeleteInvoice, onAutoLink, autoLinking, documentUrlMap, onOpenPdf }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');

  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    invoices.forEach(inv => {
      if (inv.supplier_id && inv.chem_suppliers?.nombre) {
        map.set(inv.supplier_id, inv.chem_suppliers.nombre);
      }
    });
    return Array.from(map.entries());
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (filterSupplier !== 'all' && inv.supplier_id !== filterSupplier) return false;
      if (filterEstado !== 'all' && inv.estado !== filterEstado) return false;
      return true;
    });
  }, [invoices, filterSupplier, filterEstado]);

  const unlinkedCount = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      return acc + (inv.lines?.filter(l => !l.product_id && l.tipo_linea === 'producto').length || 0);
    }, 0);
  }, [invoices]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No hay facturas extraídas. Sube documentos y procesa las facturas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {suppliers.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="extraido">Extraído</SelectItem>
            <SelectItem value="revisado">Revisado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        {unlinkedCount > 0 && (
          <Button size="sm" variant="outline" onClick={onAutoLink} disabled={autoLinking}>
            {autoLinking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link className="w-4 h-4 mr-1" />}
            Vincular productos ({unlinkedCount} sin vincular)
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nº Factura</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Líneas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Confianza</TableHead>
                <TableHead className="w-20" />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => {
                const isExpanded = expandedId === inv.id;
                const estadoConfig = ESTADO_FACTURA_CONFIG[inv.estado] || ESTADO_FACTURA_CONFIG.extraido;
                return (
                  <Fragment key={inv.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">
                        {inv.numero_factura || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{inv.chem_suppliers?.nombre || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {inv.fecha_factura ? format(new Date(inv.fecha_factura), 'dd MMM yyyy', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatEUR(inv.importe_total)} €
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{inv.lines?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${estadoConfig.color}`}>{estadoConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {inv.confianza_global != null ? (
                          <span className="text-xs font-mono">{(inv.confianza_global * 100).toFixed(0)}%</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {inv.document_id && documentUrlMap[inv.document_id] && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-[#32b4cd]"
                              title="Ver PDF"
                              onClick={e => { e.stopPropagation(); onOpenPdf(documentUrlMap[inv.document_id!]); }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); onDeleteInvoice(inv.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={10} className="p-0 bg-muted/20">
                          <InvoiceDetail
                            invoice={inv}
                            pdfUrl={inv.document_id ? documentUrlMap[inv.document_id] : undefined}
                            onOpenPdf={onOpenPdf}
                            onUpdateEstado={(estado) => onUpdateInvoice({ invoiceId: inv.id, data: { estado } })}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceDetail({ invoice, pdfUrl, onOpenPdf, onUpdateEstado }: { invoice: ChemInvoice; pdfUrl?: string; onOpenPdf: (url: string) => void; onUpdateEstado: (estado: string) => void }) {
  const lines = invoice.lines || [];

  const desglose = useMemo(() => {
    const total = lines.reduce((s, l) => s + (l.importe_linea || 0), 0);
    const byType: Record<string, number> = {};
    lines.forEach(l => {
      byType[l.tipo_linea] = (byType[l.tipo_linea] || 0) + (l.importe_linea || 0);
    });
    return { total, byType };
  }, [lines]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Fecha</span>
          <p className="font-medium">{invoice.fecha_factura ? format(new Date(invoice.fecha_factura), 'dd/MM/yyyy') : '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Vencimiento</span>
          <p className="font-medium">{invoice.fecha_vencimiento ? format(new Date(invoice.fecha_vencimiento), 'dd/MM/yyyy') : '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Base / IVA / Total</span>
          <p className="font-medium font-mono">
            {formatEUR(invoice.importe_base)} / {formatEUR(invoice.importe_iva)} / <strong>{formatEUR(invoice.importe_total)} €</strong>
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Select value={invoice.estado} onValueChange={onUpdateEstado}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="extraido">Extraído</SelectItem>
              <SelectItem value="revisado">Revisado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
            </SelectContent>
          </Select>
          {pdfUrl && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onOpenPdf(pdfUrl)}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver PDF
            </Button>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Líneas de factura</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Concepto</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs text-right">Cant.</TableHead>
              <TableHead className="text-xs text-right">Precio unit.</TableHead>
              <TableHead className="text-xs text-right">Importe</TableHead>
              <TableHead className="text-xs">Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(line => {
              const config = LINE_TYPE_CONFIG[line.tipo_linea] || LINE_TYPE_CONFIG.otro;
              return (
                <TableRow key={line.id} className={config.color}>
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      {LINE_ICONS[line.tipo_linea] || LINE_ICONS.otro}
                      {line.producto_nombre}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {line.cantidad} {line.unidad || ''}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {formatEUR(line.precio_unitario, 4)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-medium">
                    {formatEUR(line.importe_linea)} €
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {line.concentracion_detectada != null && (
                      <span>Conc: {line.concentracion_detectada}% · MA: {formatEUR(line.precio_kg_materia_activa, 3)} €/kg</span>
                    )}
                    {line.formato_entrega && (
                      <span className="ml-2">{line.formato_entrega.replace(/_/g, ' ')}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cost breakdown */}
      {Object.keys(desglose.byType).length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Desglose por tipo</p>
          <div className="space-y-1">
            {Object.entries(desglose.byType).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a)).map(([tipo, valor]) => {
              const config = LINE_TYPE_CONFIG[tipo as LineType] || LINE_TYPE_CONFIG.otro;
              const pct = desglose.total > 0 ? (valor / desglose.total * 100) : 0;
              return (
                <div key={tipo} className="flex items-center gap-2 text-xs">
                  <span className="w-32 truncate">{config.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(Math.abs(pct), 100)}%` }} />
                  </div>
                  <span className="w-20 text-right font-mono">{formatEUR(valor)} €</span>
                  <span className="w-12 text-right font-mono text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          {invoice.pct_costes_no_producto != null && invoice.pct_costes_no_producto > 15 && (
            <div className="mt-2 p-2 rounded text-xs bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              ⚠ Costes no-producto: {invoice.pct_costes_no_producto.toFixed(1)}% — por encima del benchmark (15%)
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {invoice.errores_detectados?.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">Errores detectados por IA</p>
          <ul className="space-y-1">
            {invoice.errores_detectados.map((err: any, i: number) => (
              <li key={i} className="text-xs flex items-start gap-1.5 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{typeof err === 'string' ? err : err.mensaje || JSON.stringify(err)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Observations */}
      {invoice.observaciones_consultor?.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-semibold">Observaciones</p>
          {invoice.observaciones_consultor.map((obs: any, i: number) => (
            <p key={i}>• {typeof obs === 'string' ? obs : obs.texto || JSON.stringify(obs)}</p>
          ))}
        </div>
      )}
    </div>
  );
}
