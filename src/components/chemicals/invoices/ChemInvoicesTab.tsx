import React, { useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, AlertTriangle, Receipt, FileText, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { extractChemDocumentPath } from '@/utils/storageUrlHelper';
import { useChemInvoices } from './useChemInvoices';
import { ChemInvoicesList } from './ChemInvoicesList';
import { ChemInvoiceAlerts } from './ChemInvoiceAlerts';
import { ChemInvoiceSummary } from './ChemInvoiceSummary';
import { toast } from 'sonner';
import type { InvoiceSummary } from './types';

interface Props {
  projectId: string;
  auditId?: string;
}

export function ChemInvoicesTab({ projectId, auditId }: Props) {
  const {
    invoices,
    invoicesLoading,
    alerts,
    alertsLoading,
    summary,
    summaryLoading,
    updateInvoice,
    updateAlert,
    analyzeInvoices,
    analyzingInvoices,
    autoLinkProducts,
    autoLinking,
    deleteInvoice,
    duplicatesRemoved,
  } = useChemInvoices(projectId, auditId);

  const pendingAlerts = alerts.filter(a => a.estado === 'pendiente').length;

  // Build document_id -> file_url map for PDF buttons
  const documentIds = useMemo(() => invoices.filter(inv => inv.document_id).map(inv => inv.document_id!), [invoices]);

  // Fetch document URLs and audit_id for supplier name resolution
  const { data: docData = [] } = useQuery({
    queryKey: ['chem-doc-urls', projectId, documentIds],
    queryFn: async () => {
      if (documentIds.length === 0) return [];
      const { data, error } = await externalSupabase
        .from('chem_contract_documents')
        .select('id, file_url, audit_id')
        .in('id', documentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && documentIds.length > 0,
  });

  // Fetch audit proveedor_nombre for supplier resolution
  const auditIds = useMemo(() => {
    const ids = new Set<string>();
    docData.forEach((d: any) => { if (d.audit_id) ids.add(d.audit_id); });
    return Array.from(ids);
  }, [docData]);

  const { data: auditSuppliers = [] } = useQuery({
    queryKey: ['chem-audit-suppliers', projectId, auditIds],
    queryFn: async () => {
      if (auditIds.length === 0) return [];
      const { data, error } = await externalSupabase
        .from('chem_contract_audits')
        .select('id, chem_suppliers(nombre)')
        .in('id', auditIds);
      if (error) throw error;
      return data || [];
    },
    enabled: auditIds.length > 0,
  });

  const documentUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    docData.forEach((d: any) => {
      if (d.file_url) map[d.id] = d.file_url;
    });
    return map;
  }, [docData]);

  // Build document_id -> proveedor_nombre map
  const docSupplierMap = useMemo(() => {
    const auditMap = new Map<string, string>();
    auditSuppliers.forEach((a: any) => {
      const nombre = a.chem_suppliers?.nombre;
      if (nombre) auditMap.set(a.id, nombre);
    });
    const map: Record<string, string> = {};
    docData.forEach((d: any) => {
      if (d.audit_id && auditMap.has(d.audit_id)) {
        map[d.id] = auditMap.get(d.audit_id)!;
      }
    });
    return map;
  }, [docData, auditSuppliers]);

  // Enrich invoices with supplier name from audit when chem_suppliers is null
  const enrichedInvoices = useMemo(() => {
    return invoices.map(inv => {
      if (inv.chem_suppliers?.nombre || !inv.document_id) return inv;
      const nombre = docSupplierMap[inv.document_id];
      if (!nombre) return inv;
      return { ...inv, chem_suppliers: { nombre } };
    });
  }, [invoices, docSupplierMap]);

  // Compute client-side summary from filtered invoices & alerts when inside a contract
  const computedSummary: InvoiceSummary | null = useMemo(() => {
    if (!auditId) return null; // Use backend summary when no contract filter
    if (invoicesLoading || alertsLoading) return null;

    const totalGasto = enrichedInvoices.reduce((s, inv) => s + (inv.importe_total ?? 0), 0);
    const totalProductos = enrichedInvoices.reduce((s, inv) => s + (inv.total_productos ?? 0), 0);
    const totalPortes = enrichedInvoices.reduce((s, inv) => s + (inv.total_portes ?? 0), 0);
    const totalRecargos = enrichedInvoices.reduce((s, inv) => s + (inv.total_recargos ?? 0), 0);
    const totalServicios = enrichedInvoices.reduce((s, inv) => s + (inv.total_servicios ?? 0), 0);
    const totalDescuentos = enrichedInvoices.reduce((s, inv) => s + (inv.total_descuentos ?? 0), 0);
    const noProd = totalGasto > 0
      ? ((totalPortes + totalRecargos + totalServicios - totalDescuentos) / totalGasto) * 100
      : 0;

    const pendientes = alerts.filter(a => a.estado === 'pendiente').length;
    const ahorroPotencial = alerts.reduce((s, a) => s + (a.impacto_estimado_eur ?? 0), 0);
    const porTipo: Record<string, number> = {};
    alerts.forEach(a => { porTipo[a.tipo_alerta] = (porTipo[a.tipo_alerta] || 0) + 1; });

    // Build baselines from invoice lines
    const lineMap = new Map<string, { total: number; vol: number; count: Set<string>; maTotal: number; maVol: number }>();
    enrichedInvoices.forEach(inv => {
      (inv.lines || []).filter(l => l.tipo_linea === 'producto').forEach(line => {
        const name = line.producto_nombre || 'Desconocido';
        if (!lineMap.has(name)) lineMap.set(name, { total: 0, vol: 0, count: new Set(), maTotal: 0, maVol: 0 });
        const entry = lineMap.get(name)!;
        entry.total += line.importe_linea ?? 0;
        entry.vol += line.cantidad ?? 0;
        entry.count.add(inv.id);
        if (line.precio_kg_materia_activa != null && line.cantidad > 0) {
          entry.maTotal += line.precio_kg_materia_activa * line.cantidad;
          entry.maVol += line.cantidad;
        }
      });
    });

    const baselines = Array.from(lineMap.entries()).map(([producto, d]) => ({
      producto,
      precio_medio: d.vol > 0 ? d.total / d.vol : 0,
      volumen_total_kg: d.vol,
      num_facturas: d.count.size,
      precio_kg_ma: d.maVol > 0 ? d.maTotal / d.maVol : null,
    }));

    return {
      project_id: projectId,
      total_invoices: enrichedInvoices.length,
      total_gasto: totalGasto,
      desglose_costes: {
        productos: totalProductos,
        portes: totalPortes,
        recargos: totalRecargos,
        servicios: totalServicios,
        descuentos: totalDescuentos,
        pct_no_producto: noProd,
      },
      alertas: {
        total: alerts.length,
        pendientes,
        por_tipo: porTipo,
        ahorro_potencial_eur: ahorroPotencial,
      },
      baselines,
    };
  }, [auditId, enrichedInvoices, alerts, invoicesLoading, alertsLoading, projectId]);

  // Use client-side summary when in contract view, otherwise backend summary
  const effectiveSummary = auditId ? computedSummary : summary;
  const effectiveSummaryLoading = auditId ? (invoicesLoading || alertsLoading) : summaryLoading;

  const openChemPdf = useCallback(async (fileUrl: string) => {
    // For http(s) URLs, open directly
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      window.open(fileUrl, '_blank');
      return;
    }

    // Extract path within chem-documents bucket
    const filePath = extractChemDocumentPath(fileUrl);
    if (!filePath) {
      toast.error('URL de documento no válida');
      return;
    }

    const { data, error } = await externalSupabase.storage
      .from('chem-documents')
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL:', error);
      toast.error('No se pudo abrir el PDF');
      return;
    }

    window.open(data.signedUrl, '_blank');
  }, []);

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Análisis de Facturas
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={() => analyzeInvoices()}
                  disabled={analyzingInvoices || invoices.length === 0}
                  className="bg-[#307177] hover:bg-[#307177]/90 text-white"
                  size="sm"
                >
                  {analyzingInvoices ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analizando…</>
                  ) : (
                    <><BarChart3 className="w-4 h-4 mr-1" /> Analizar Facturas</>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {invoices.length === 0 && !analyzingInvoices && (
              <TooltipContent>
                <p>Primero extrae los datos de las facturas subidas</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Empty state message */}
      {!invoicesLoading && invoices.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>No hay facturas procesadas. Sube PDFs de facturas y pulsa <strong>"Extraer datos"</strong> para comenzar.</span>
        </div>
      )}

      {/* Sub-tabs */}
      <Tabs defaultValue="facturas">
        <TabsList>
          <TabsTrigger value="facturas" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Facturas
            {invoices.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{invoices.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Alertas
            {pendingAlerts > 0 && <Badge variant="destructive" className="text-[10px] ml-1">{pendingAlerts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resumen" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Resumen
          </TabsTrigger>
        </TabsList>

        {duplicatesRemoved > 0 && (
          <div className="mb-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              Se han filtrado <strong>{duplicatesRemoved}</strong> factura{duplicatesRemoved > 1 ? 's' : ''} duplicada{duplicatesRemoved > 1 ? 's' : ''} (mismo nº factura, fecha e importe).
            </span>
          </div>
        )}

        <TabsContent value="facturas">
          <ChemInvoicesList
            invoices={enrichedInvoices}
            loading={invoicesLoading}
            onUpdateInvoice={updateInvoice}
            onDeleteInvoice={deleteInvoice}
            onAutoLink={() => autoLinkProducts()}
            autoLinking={autoLinking}
            documentUrlMap={documentUrlMap}
            onOpenPdf={openChemPdf}
          />
        </TabsContent>

        <TabsContent value="alertas">
          <ChemInvoiceAlerts
            alerts={alerts}
            loading={alertsLoading}
            onUpdateAlert={updateAlert}
          />
        </TabsContent>

        <TabsContent value="resumen">
          <ChemInvoiceSummary
            summary={effectiveSummary}
            loading={effectiveSummaryLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
