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

interface Props {
  projectId: string;
  supplierId?: string;
}

export function ChemInvoicesTab({ projectId, supplierId }: Props) {
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
  } = useChemInvoices(projectId, supplierId);

  const pendingAlerts = alerts.filter(a => a.estado === 'pendiente').length;

  // Build document_id -> file_url map for PDF buttons
  const documentIds = useMemo(() => invoices.filter(inv => inv.document_id).map(inv => inv.document_id!), [invoices]);

  const { data: docUrls = [] } = useQuery({
    queryKey: ['chem-doc-urls', projectId, documentIds],
    queryFn: async () => {
      if (documentIds.length === 0) return [];
      const { data, error } = await externalSupabase
        .from('chem_contract_documents')
        .select('id, file_url')
        .in('id', documentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && documentIds.length > 0,
  });

  const documentUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    docUrls.forEach((d: any) => {
      if (d.file_url) map[d.id] = d.file_url;
    });
    return map;
  }, [docUrls]);

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

        <TabsContent value="facturas">
          <ChemInvoicesList
            invoices={invoices}
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
            summary={summary}
            loading={summaryLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
