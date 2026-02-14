import React, { useState, useMemo, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Trash2, Package, Loader2, Link, ExternalLink } from 'lucide-react';
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

// Emoji icons per tipo_linea as specified
const LINE_EMOJI: Record<LineType, string> = {
  producto: '●',
  porte_transporte: '🚛',
  recargo_envase: '📦',
  recargo_urgencia: '⚡',
  recargo_minimo: '📏',
  alquiler_equipo: '🔧',
  servicio_tecnico: '🛠️',
  gestion_envases: '♻️',
  rappel_descuento: '💰',
  pronto_pago: '⏰',
  otro: '❓',
};

const LINE_LABEL: Record<LineType, string> = {
  producto: 'Prod.',
  porte_transporte: 'Porte',
  recargo_envase: 'Recarg.',
  recargo_urgencia: 'Urgencia',
  recargo_minimo: 'Mínimo',
  alquiler_equipo: 'Alquiler',
  servicio_tecnico: 'Serv.Téc',
  gestion_envases: 'Envases',
  rappel_descuento: 'Rappel',
  pronto_pago: 'Pronto pago',
  otro: 'Otro',
};

function ConfianzaBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (value * 100).toFixed(0);
  if (value >= 0.8) return <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{pct}%</Badge>;
  if (value >= 0.5) return <Badge className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{pct}%</Badge>;
  return <Badge className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{pct}%</Badge>;
}

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
                <TableHead className="text-xs">Nº Factura</TableHead>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Proveedor</TableHead>
                <TableHead className="text-xs text-right">Importe</TableHead>
                <TableHead className="text-xs text-right">Productos</TableHead>
                <TableHead className="text-xs text-right">% No-Prod</TableHead>
                <TableHead className="text-xs text-center">Confianza</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => {
                const isExpanded = expandedId === inv.id;
                const estadoConfig = ESTADO_FACTURA_CONFIG[inv.estado] || ESTADO_FACTURA_CONFIG.extraido;
                const pctNoProd = inv.pct_costes_no_producto;
                return (
                  <Fragment key={inv.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono text-xs">
                        {inv.numero_factura || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {inv.fecha_factura ? format(new Date(inv.fecha_factura), 'dd MMM yyyy', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{inv.chem_suppliers?.nombre || '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium">
                        {formatEUR(inv.importe_total)} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {inv.total_productos != null ? formatEUR(inv.total_productos) + ' €' : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${pctNoProd != null && pctNoProd > 10 ? 'text-red-600 font-semibold' : ''}`}>
                        {pctNoProd != null ? `${pctNoProd.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <ConfianzaBadge value={inv.confianza_global} />
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${estadoConfig.color}`}>{estadoConfig.label}</Badge>
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

// ─── Invoice Detail (expanded) ───────────────────────────────────────────────

function InvoiceDetail({ invoice, pdfUrl, onOpenPdf, onUpdateEstado }: { invoice: ChemInvoice; pdfUrl?: string; onOpenPdf: (url: string) => void; onUpdateEstado: (estado: string) => void }) {
  const lines = invoice.lines || [];
  const productLines = lines.filter(l => l.tipo_linea === 'producto');

  // Compute aggregate concentración / MA / formato from product lines
  const firstProductLine = productLines[0];
  const concentracion = firstProductLine?.concentracion_detectada;
  const precioMA = firstProductLine?.precio_kg_materia_activa;
  const formato = firstProductLine?.formato_entrega;

  return (
    <div className="p-4 space-y-4">
      {/* Header bar */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-sm font-semibold">
            Factura {invoice.numero_factura || '—'} — {invoice.chem_suppliers?.nombre || 'Proveedor desconocido'}
          </h4>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>Fecha: {invoice.fecha_factura ? format(new Date(invoice.fecha_factura), 'dd/MM/yyyy') : '—'}</span>
            <span>Vencimiento: {invoice.fecha_vencimiento ? format(new Date(invoice.fecha_vencimiento), 'dd/MM/yyyy') : '—'}</span>
            {invoice.plazo_pago_dias != null && <span>Plazo: {invoice.plazo_pago_dias} días</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs font-mono">
            <span>Base: {formatEUR(invoice.importe_base)} €</span>
            {invoice.pct_iva != null && <span>IVA {invoice.pct_iva}%: {formatEUR(invoice.importe_iva)} €</span>}
            <span className="font-semibold">Total: {formatEUR(invoice.importe_total)} €</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs w-16">Tipo</TableHead>
              <TableHead className="text-xs">Producto</TableHead>
              <TableHead className="text-xs text-right">Cant.</TableHead>
              <TableHead className="text-xs text-right">€/kg</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(line => {
              const emoji = LINE_EMOJI[line.tipo_linea] || '❓';
              const label = LINE_LABEL[line.tipo_linea] || 'Otro';
              const config = LINE_TYPE_CONFIG[line.tipo_linea] || LINE_TYPE_CONFIG.otro;
              return (
                <TableRow key={line.id} className={config.color}>
                  <TableCell className="text-xs">
                    <span className="mr-1">{emoji}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{line.producto_nombre}</TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {line.cantidad != null ? line.cantidad.toLocaleString('es-ES') : '—'} {line.unidad || ''}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {formatEUR(line.precio_unitario, 4)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-medium">
                    {formatEUR(line.importe_linea)} €
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer: concentration, MA price, format */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        {concentracion != null && <span>Concentración detectada: <strong className="text-foreground">{concentracion}%</strong></span>}
        {precioMA != null && <span>Precio materia activa: <strong className="text-foreground">{precioMA.toFixed(4)} €/kg MA</strong></span>}
        {formato && <span>Formato: <strong className="text-foreground">{formato.replace(/_/g, ' ')}</strong></span>}
      </div>

      {/* Pct no-prod warning */}
      {invoice.pct_costes_no_producto != null && invoice.pct_costes_no_producto > 10 && (
        <div className="p-2 rounded text-xs bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
          ⚠ Costes no-producto: {invoice.pct_costes_no_producto.toFixed(1)}% del total
        </div>
      )}

      {/* Errors */}
      {invoice.errores_detectados?.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">Errores detectados</p>
          <ul className="space-y-1">
            {invoice.errores_detectados.map((err: any, i: number) => (
              <li key={i} className="text-xs text-red-700 dark:text-red-300">
                • {typeof err === 'string' ? err : err.mensaje || JSON.stringify(err)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
