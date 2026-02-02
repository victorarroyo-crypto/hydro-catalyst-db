/**
 * Hook for document review API calls (Cost Consulting)
 * Handles fetching review summary, pending documents, and validation actions
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

// ============================================================
// HELPERS
// ============================================================

/**
 * Parse error response from backend (handles FastAPI/Pydantic format)
 */
const parseErrorMessage = (errorData: unknown, defaultMsg: string): string => {
  if (!errorData) return defaultMsg;
  
  if (typeof errorData === 'object' && 'detail' in errorData) {
    const detail = (errorData as { detail: unknown }).detail;
    
    // If detail is a string, return it directly
    if (typeof detail === 'string') {
      return detail;
    }
    
    // If detail is an array (Pydantic/FastAPI validation error format)
    if (Array.isArray(detail) && detail.length > 0) {
      const firstError = detail[0];
      if (firstError && typeof firstError === 'object' && 'msg' in firstError) {
        return (firstError as { msg: string }).msg;
      }
    }
  }
  
  return defaultMsg;
};

// ============================================================
// TYPES
// ============================================================

export interface ReviewSummary {
  contracts: {
    total: number;
    validated: number;
    needs_review: number;
  };
  invoices: {
    total: number;
    validated: number;
    needs_review: number;
  };
  total: {
    total: number;
    validated: number;
    needs_review: number;
  };
}

export interface PendingDocument {
  doc_type: 'contract' | 'invoice';
  doc_id: string;
  filename: string;
  needs_review: boolean;
  classification_warning: string | null;
  detected_type: string | null;
  classification_confidence: number;
  human_validated: boolean;
  human_validated_at: string | null;
  supplier_name?: string;
  document_number?: string;
}

// Phase labels for document types
export const DOC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract: { label: 'Contrato', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  invoice: { label: 'Factura', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  unknown: { label: 'Desconocido', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

// Confidence level colors
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'Alta';
  if (confidence >= 0.6) return 'Media';
  return 'Baja';
};

// ============================================================
// HOOK
// ============================================================

export function useDocumentReview(projectId: string | undefined, userId?: string, enabled: boolean = true) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [allDocs, setAllDocs] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch review summary
  const fetchSummary = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/summary`
      );
      if (!response.ok) {
        throw new Error('Error fetching review summary');
      }
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching review summary:', err);
      setError('Error al cargar el resumen de revisión');
    }
  }, [projectId]);

  // Fetch pending documents
  const fetchPending = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/pending`
      );
      if (!response.ok) {
        throw new Error('Error fetching pending documents');
      }
      const data = await response.json();
      setAllDocs(data.documents || []);
      setPendingDocs((data.documents || []).filter((d: PendingDocument) => !d.human_validated));
    } catch (err) {
      console.error('Error fetching pending documents:', err);
      setError('Error al cargar los documentos pendientes');
    }
  }, [projectId]);

  // Initial fetch and refresh
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSummary(), fetchPending()]);
    setLoading(false);
  }, [fetchSummary, fetchPending]);

  useEffect(() => {
    if (projectId && enabled) {
      refresh();
    }
  }, [projectId, enabled, refresh]);

  // Validate a single document
  const validateDocument = useCallback(async (docType: string, docId: string) => {
    if (!projectId) return false;
    
    try {
      const url = new URL(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/${docType}/${docId}/validate`
      );
      if (userId) {
        url.searchParams.set('user_id', userId);
      }
      
      const response = await fetch(url.toString(), { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(errorData, 'Error al validar el documento'));
      }
      
      toast.success('Documento validado');
      await refresh();
      return true;
    } catch (err) {
      console.error('Error validating document:', err);
      toast.error(err instanceof Error ? err.message : 'Error al validar el documento');
      return false;
    }
  }, [projectId, userId, refresh]);

  // Change document type (contract <-> invoice)
  const changeDocumentType = useCallback(async (docType: string, docId: string) => {
    if (!projectId) return false;
    
    try {
      const url = new URL(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/${docType}/${docId}/change-type`
      );
      if (userId) {
        url.searchParams.set('user_id', userId);
      }
      
      const response = await fetch(url.toString(), { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(errorData, 'Error al cambiar el tipo del documento'));
      }
      
      const result = await response.json();
      const newTypeLabel = result.new_type === 'contract' ? 'Contrato' : 'Factura';
      toast.success(`Documento convertido a ${newTypeLabel}`);
      await refresh();
      return true;
    } catch (err) {
      console.error('Error changing document type:', err);
      toast.error(err instanceof Error ? err.message : 'Error al cambiar el tipo del documento');
      return false;
    }
  }, [projectId, userId, refresh]);

  // Validate all documents
  const validateAll = useCallback(async () => {
    if (!projectId) return false;
    
    try {
      const url = new URL(
        `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/validate-all`
      );
      if (userId) {
        url.searchParams.set('user_id', userId);
      }
      
      const response = await fetch(url.toString(), { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(errorData, 'Error al validar los documentos'));
      }
      
      const result = await response.json();
      toast.success(`${result.validated_count || 'Todos los'} documentos validados`);
      await refresh();
      return true;
    } catch (err) {
      console.error('Error validating all documents:', err);
      toast.error(err instanceof Error ? err.message : 'Error al validar los documentos');
      return false;
    }
  }, [projectId, userId, refresh]);

  // Calculate progress percentage
  const validationProgress = summary ? {
    percent: summary.total.total > 0 
      ? Math.round((summary.total.validated / summary.total.total) * 100) 
      : 0,
    validated: summary.total.validated,
    total: summary.total.total,
    needsReview: summary.total.needs_review,
  } : null;

  // Check if all documents are validated
  const allValidated = summary?.total.validated === summary?.total.total && (summary?.total.total || 0) > 0;

  // Check if there are critical warnings (documents that need attention)
  const hasCriticalWarnings = pendingDocs.some(d => 
    d.classification_warning || d.classification_confidence < 0.6
  );

  return {
    summary,
    pendingDocs,
    allDocs,
    loading,
    error,
    validateDocument,
    changeDocumentType,
    validateAll,
    refresh,
    validationProgress,
    allValidated,
    hasCriticalWarnings,
  };
}
