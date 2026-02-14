import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, AlertTriangle, Receipt, FileText } from 'lucide-react';
import { useChemInvoices } from './useChemInvoices';
import { ChemInvoicesList } from './ChemInvoicesList';
import { ChemInvoiceAlerts } from './ChemInvoiceAlerts';
import { ChemInvoiceSummary } from './ChemInvoiceSummary';

interface Props {
  projectId: string;
}

export function ChemInvoicesTab({ projectId }: Props) {
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
  } = useChemInvoices(projectId);

  const pendingAlerts = alerts.filter(a => a.estado === 'pendiente').length;

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Análisis de Facturas
        </h3>
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
      </div>

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
