import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { ChemInvoice, ChemInvoiceAlert, InvoiceSummary } from './types';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

export function useChemInvoices(projectId: string | undefined, auditId?: string) {
  const queryClient = useQueryClient();

  // List invoices
  const invoicesQuery = useQuery({
    queryKey: ['chem-invoices', projectId],
    queryFn: async (): Promise<ChemInvoice[]> => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices`);
      if (!res.ok) throw new Error('Error cargando facturas');
      const data = await res.json();
      return data.invoices || data || [];
    },
    enabled: !!projectId,
  });

  // Alerts
  const alertsQuery = useQuery({
    queryKey: ['chem-invoice-alerts', projectId],
    queryFn: async (): Promise<ChemInvoiceAlert[]> => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoice-alerts`);
      if (!res.ok) throw new Error('Error cargando alertas');
      const data = await res.json();
      return data.alerts || data || [];
    },
    enabled: !!projectId,
  });

  // Summary
  const summaryQuery = useQuery({
    queryKey: ['chem-invoice-summary', projectId],
    queryFn: async (): Promise<InvoiceSummary | null> => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoice-summary`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.summary || null;
    },
    enabled: !!projectId,
  });

  // Update invoice
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string; data: any }) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error actualizando factura');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
      toast.success('Factura actualizada');
    },
    onError: () => toast.error('Error al actualizar factura'),
  });

  // Update line
  const updateLineMutation = useMutation({
    mutationFn: async ({ invoiceId, lineId, data }: { invoiceId: string; lineId: string; data: any }) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices/${invoiceId}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error actualizando línea');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
      toast.success('Línea actualizada');
    },
    onError: () => toast.error('Error al actualizar línea'),
  });

  // Update alert state
  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, estado }: { alertId: string; estado: string }) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoice-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error('Error actualizando alerta');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
      toast.success('Alerta actualizada');
    },
    onError: () => toast.error('Error al actualizar alerta'),
  });

  // Analyze invoices (batch) with polling
  const [analyzingPolling, setAnalyzingPolling] = useState(false);
  const analyzePollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialAlertCountRef = useRef<number>(0);

  const analyzeInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/analyze-invoices`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error iniciando análisis');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Análisis de facturas iniciado — esperando resultados…');
      initialAlertCountRef.current = alertsQuery.data?.length || 0;
      setAnalyzingPolling(true);
      if (analyzePollingRef.current) clearInterval(analyzePollingRef.current);
      analyzePollingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['chem-invoice-alerts', projectId] });
        queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
      }, 5000);
      // Stop after 2 minutes max
      setTimeout(() => {
        if (analyzePollingRef.current) {
          clearInterval(analyzePollingRef.current);
          setAnalyzingPolling(false);
        }
      }, 120000);
    },
    onError: () => toast.error('Error al iniciar análisis'),
  });

  // Stop analyze polling when NEW alerts are detected (count exceeds initial)
  useEffect(() => {
    if (analyzingPolling && alertsQuery.data && alertsQuery.data.length > initialAlertCountRef.current) {
      if (analyzePollingRef.current) clearInterval(analyzePollingRef.current);
      setAnalyzingPolling(false);
      const newCount = alertsQuery.data.length - initialAlertCountRef.current;
      toast.success(`Análisis completado — ${newCount} nueva${newCount > 1 ? 's' : ''} alerta${newCount > 1 ? 's' : ''} detectada${newCount > 1 ? 's' : ''}`);
    }
  }, [alertsQuery.data, analyzingPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzePollingRef.current) clearInterval(analyzePollingRef.current);
    };
  }, []);

  // Auto-link products
  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices/auto-link-products`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error vinculando productos');
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
      toast.success(`${data.linked || 0} líneas vinculadas, ${data.unlinked || 0} sin match`);
    },
    onError: () => toast.error('Error al vincular productos'),
  });

  // Delete invoice
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error eliminando factura');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
      toast.success('Factura eliminada');
    },
    onError: () => toast.error('Error al eliminar factura'),
  });

  // When filtering by audit, fetch document IDs belonging to that audit
  const auditDocsQuery = useQuery({
    queryKey: ['chem-audit-doc-ids', auditId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await externalSupabase
        .from('chem_contract_documents')
        .select('id')
        .eq('audit_id', auditId!);
      if (error) throw error;
      return (data || []).map((d: any) => d.id);
    },
    enabled: !!auditId,
  });

  const auditDocIds = useMemo(() => new Set(auditDocsQuery.data || []), [auditDocsQuery.data]);

  // Deduplicate invoices by numero_factura + fecha_factura + importe_total
  const deduplicatedInvoices = useMemo(() => {
    const raw = invoicesQuery.data || [];
    const seen = new Map<string, ChemInvoice>();
    for (const inv of raw) {
      const key = `${(inv.numero_factura || '').trim().toLowerCase()}|${inv.fecha_factura || ''}|${inv.importe_total ?? ''}`;
      // If key is fully empty (no identifying data), keep all
      if (key === '||') {
        seen.set(inv.id, inv);
      } else if (!seen.has(key)) {
        seen.set(key, inv);
      }
      // else: duplicate — skip
    }
    return Array.from(seen.values());
  }, [invoicesQuery.data]);

  const filteredInvoices = auditId
    ? deduplicatedInvoices.filter(i => i.document_id && auditDocIds.has(i.document_id))
    : deduplicatedInvoices;

  // Filter alerts by matching invoice_ids from filtered invoices
  const filteredInvoiceIds = useMemo(() => new Set(filteredInvoices.map(i => i.id)), [filteredInvoices]);

  const filteredAlerts = auditId
    ? (alertsQuery.data || []).filter(a => a.invoice_id && filteredInvoiceIds.has(a.invoice_id))
    : (alertsQuery.data || []);

  const duplicatesRemoved = (invoicesQuery.data?.length || 0) - deduplicatedInvoices.length;

  return {
    invoices: filteredInvoices,
    duplicatesRemoved,
    invoicesLoading: invoicesQuery.isLoading || (!!auditId && auditDocsQuery.isLoading),
    alerts: filteredAlerts,
    alertsLoading: alertsQuery.isLoading,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    updateInvoice: updateInvoiceMutation.mutate,
    updateLine: updateLineMutation.mutate,
    updateAlert: updateAlertMutation.mutate,
    analyzeInvoices: analyzeInvoicesMutation.mutate,
    analyzingInvoices: analyzeInvoicesMutation.isPending || analyzingPolling,
    autoLinkProducts: autoLinkMutation.mutate,
    autoLinking: autoLinkMutation.isPending,
    deleteInvoice: deleteInvoiceMutation.mutate,
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
    },
  };
}
