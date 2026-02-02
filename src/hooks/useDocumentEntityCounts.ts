/**
 * Hook para contar entidades (contratos/facturas) por documento
 * 
 * Cruza los documentos subidos con las entidades extraídas para identificar
 * qué documentos generaron datos y cuáles no.
 */
import { useMemo } from 'react';
import { useCostContracts, useCostInvoices } from './useCostConsultingData';

export interface DocumentEntityCount {
  contracts: number;
  invoices: number;
}

export interface DocumentEntityCounts {
  [documentId: string]: DocumentEntityCount;
}

export interface EntityCountStats {
  totalDocumentsWithEntities: number;
  totalDocumentsWithoutEntities: number;
  documentsWithContracts: number;
  documentsWithInvoices: number;
}

/**
 * Hook que calcula cuántos contratos y facturas tiene cada documento
 */
export const useDocumentEntityCounts = (projectId?: string) => {
  const { data: contracts = [], isLoading: contractsLoading } = useCostContracts(projectId);
  const { data: invoices = [], isLoading: invoicesLoading } = useCostInvoices(projectId);

  const counts = useMemo(() => {
    const result: DocumentEntityCounts = {};

    contracts.forEach((contract) => {
      const docId = contract.document_id;
      if (docId) {
        if (!result[docId]) {
          result[docId] = { contracts: 0, invoices: 0 };
        }
        result[docId].contracts++;
      }
    });

    invoices.forEach((invoice) => {
      const docId = invoice.document_id;
      if (docId) {
        if (!result[docId]) {
          result[docId] = { contracts: 0, invoices: 0 };
        }
        result[docId].invoices++;
      }
    });

    return result;
  }, [contracts, invoices]);

  const isLoading = contractsLoading || invoicesLoading;

  return {
    counts,
    isLoading,
    totalContracts: contracts.length,
    totalInvoices: invoices.length,
  };
};

/**
 * Función helper para obtener el conteo de un documento específico
 */
export const getDocumentCounts = (
  counts: DocumentEntityCounts,
  documentId: string
): DocumentEntityCount => {
  return counts[documentId] || { contracts: 0, invoices: 0 };
};

/**
 * Función helper para verificar si un documento tiene entidades
 */
export const documentHasEntities = (
  counts: DocumentEntityCounts,
  documentId: string
): boolean => {
  const count = counts[documentId];
  return !!count && (count.contracts > 0 || count.invoices > 0);
};
