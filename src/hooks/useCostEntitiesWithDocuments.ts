/**
 * Hook para enriquecer contratos y facturas con URLs de documentos PDF
 * Workaround mientras Railway API no incluye la relación cost_project_documents
 */
import { useMemo } from 'react';
import { useCostContracts, useCostInvoices, useCostDocuments, CostContract, CostInvoice, CostDocument } from './useCostConsultingData';

// Redefinimos la interfaz para el enriquecimiento (sin conflicto con el tipo base)
export interface EnrichedContract extends Omit<CostContract, 'cost_project_documents'> {
  cost_project_documents?: {
    file_url?: string | null;
    filename?: string;
  } | null;
}

export interface EnrichedInvoice extends Omit<CostInvoice, 'cost_project_documents'> {
  cost_project_documents?: {
    file_url?: string | null;
    filename?: string;
  } | null;
}

/**
 * Hook que obtiene contratos enriquecidos con URLs de documentos
 */
export const useContractsWithDocuments = (projectId?: string) => {
  const contractsQuery = useCostContracts(projectId);
  const documentsQuery = useCostDocuments(projectId);

  const enrichedContracts = useMemo<EnrichedContract[]>(() => {
    if (!contractsQuery.data) return [];
    
    const documentsMap = new Map<string, CostDocument>();
    documentsQuery.data?.forEach(doc => {
      documentsMap.set(doc.id, doc);
    });

    return contractsQuery.data.map(contract => {
      const document = contract.document_id 
        ? documentsMap.get(contract.document_id) 
        : null;
      
      return {
        ...contract,
        cost_project_documents: document 
          ? { file_url: document.file_url, filename: document.filename }
          : null,
      };
    });
  }, [contractsQuery.data, documentsQuery.data]);

  return {
    data: enrichedContracts,
    isLoading: contractsQuery.isLoading || documentsQuery.isLoading,
    isError: contractsQuery.isError || documentsQuery.isError,
    error: contractsQuery.error || documentsQuery.error,
    refetch: () => {
      contractsQuery.refetch();
      documentsQuery.refetch();
    },
  };
};

/**
 * Hook que obtiene facturas enriquecidas con URLs de documentos
 */
export const useInvoicesWithDocuments = (projectId?: string) => {
  const invoicesQuery = useCostInvoices(projectId);
  const documentsQuery = useCostDocuments(projectId);

  const enrichedInvoices = useMemo<EnrichedInvoice[]>(() => {
    if (!invoicesQuery.data) return [];
    
    const documentsMap = new Map<string, CostDocument>();
    documentsQuery.data?.forEach(doc => {
      documentsMap.set(doc.id, doc);
    });

    return invoicesQuery.data.map(invoice => {
      const document = invoice.document_id 
        ? documentsMap.get(invoice.document_id) 
        : null;
      
      return {
        ...invoice,
        cost_project_documents: document 
          ? { file_url: document.file_url, filename: document.filename }
          : null,
      };
    });
  }, [invoicesQuery.data, documentsQuery.data]);

  return {
    data: enrichedInvoices,
    isLoading: invoicesQuery.isLoading || documentsQuery.isLoading,
    isError: invoicesQuery.isError || documentsQuery.isError,
    error: invoicesQuery.error || documentsQuery.error,
    refetch: () => {
      invoicesQuery.refetch();
      documentsQuery.refetch();
    },
  };
};
