import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChemInvoice, ChemInvoiceAlert, InvoiceSummary } from './types';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

export function useChemInvoices(projectId: string | undefined) {
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

  // Analyze invoices (batch)
  const analyzeInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/analyze-invoices`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error iniciando análisis');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Análisis de facturas iniciado en background');
      // Poll alerts after 10s
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['chem-invoice-alerts', projectId] });
        queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
      }, 10000);
    },
    onError: () => toast.error('Error al iniciar análisis'),
  });

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

  return {
    invoices: invoicesQuery.data || [],
    invoicesLoading: invoicesQuery.isLoading,
    alerts: alertsQuery.data || [],
    alertsLoading: alertsQuery.isLoading,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    updateInvoice: updateInvoiceMutation.mutate,
    updateLine: updateLineMutation.mutate,
    updateAlert: updateAlertMutation.mutate,
    analyzeInvoices: analyzeInvoicesMutation.mutate,
    analyzingInvoices: analyzeInvoicesMutation.isPending,
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
