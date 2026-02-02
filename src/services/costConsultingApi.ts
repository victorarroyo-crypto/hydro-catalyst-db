/**
 * Cost Consulting API Service
 * Centralized service for Railway backend API calls
 */

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

// ============================================================
// TYPES
// ============================================================

export interface ContractFormData {
  supplier_id?: string;
  supplier_name_raw?: string;
  category_id?: string;
  contract_number?: string;
  contract_title?: string;
  start_date?: string;
  end_date?: string;
  auto_renewal?: boolean;
  notice_period_days?: number;
  total_annual_value?: number | string;
  payment_days?: number;
  early_payment_discount?: number | string;
  indexation_clause?: string;
  penalty_clauses?: string;
  notes?: string;
}

export interface InvoiceFormData {
  supplier_id?: string;
  supplier_name_raw?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  contract_id?: string;
  notes?: string;
}

export interface InvoiceLineData {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  category_id?: string;
}

export interface SupplierFormData {
  name: string;
  trade_name?: string;
  tax_id?: string;
  country?: string;
  region?: string;
  web?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  company_size?: string;
}

export interface DocumentStatus {
  total: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  failed_documents: Array<{
    id: string;
    filename: string;
    error?: string;
  }>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

// ============================================================
// CONTRACTS API
// ============================================================

export const getContracts = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/contracts`
  );
  if (!response.ok) throw new Error('Error fetching contracts');
  return response.json();
};

export const createContract = async (projectId: string, data: ContractFormData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/contracts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error creating contract');
  return response.json();
};

export const updateContract = async (projectId: string, contractId: string, data: ContractFormData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/contracts/${contractId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error updating contract');
  return response.json();
};

export const deleteContract = async (projectId: string, contractId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/contracts/${contractId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Error deleting contract');
  return response.json();
};

// ============================================================
// INVOICES API
// ============================================================

export const getInvoices = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices`
  );
  if (!response.ok) throw new Error('Error fetching invoices');
  return response.json();
};

export const getInvoiceWithLines = async (projectId: string, invoiceId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}`
  );
  if (!response.ok) throw new Error('Error fetching invoice');
  return response.json();
};

export const createInvoice = async (projectId: string, data: InvoiceFormData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error creating invoice');
  return response.json();
};

export const updateInvoice = async (projectId: string, invoiceId: string, data: InvoiceFormData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error updating invoice');
  return response.json();
};

export const deleteInvoice = async (projectId: string, invoiceId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Error deleting invoice');
  return response.json();
};

// ============================================================
// INVOICE LINES API
// ============================================================

export const getInvoiceLines = async (projectId: string, invoiceId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}/lines`
  );
  if (!response.ok) throw new Error('Error fetching invoice lines');
  return response.json();
};

export const createInvoiceLine = async (projectId: string, invoiceId: string, data: InvoiceLineData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}/lines`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error creating invoice line');
  return response.json();
};

export const updateInvoiceLine = async (
  projectId: string, 
  invoiceId: string, 
  lineId: string, 
  data: Partial<InvoiceLineData>
) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}/lines/${lineId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error updating invoice line');
  return response.json();
};

export const deleteInvoiceLine = async (projectId: string, invoiceId: string, lineId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices/${invoiceId}/lines/${lineId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Error deleting invoice line');
  return response.json();
};

// ============================================================
// SUPPLIERS API
// ============================================================

export const getSupplier = async (supplierId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/suppliers/${supplierId}`
  );
  if (!response.ok) throw new Error('Error fetching supplier');
  return response.json();
};

export const createSupplier = async (data: SupplierFormData) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/suppliers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error creating supplier');
  return response.json();
};

export const updateSupplier = async (supplierId: string, data: Partial<SupplierFormData>) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/suppliers/${supplierId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Error updating supplier');
  return response.json();
};

export const deleteSupplier = async (supplierId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/suppliers/${supplierId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Error deleting supplier');
  return response.json();
};

// ============================================================
// DOCUMENTS API
// ============================================================

export const getDocumentsStatus = async (projectId: string): Promise<DocumentStatus> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/status`
  );
  if (!response.ok) throw new Error('Error fetching documents status');
  return response.json();
};

export const reprocessDocument = async (projectId: string, documentId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${documentId}/reprocess`,
    { method: 'POST' }
  );
  if (!response.ok) throw new Error('Error reprocessing document');
  return response.json();
};

/**
 * Delete a document and its associated data (chunks, storage file)
 */
export const deleteDocument = async (projectId: string, documentId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${documentId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error deleting document' }));
    throw new Error(error.detail || 'Error deleting document');
  }
  return response.json();
};

// ============================================================
// EXTRACTION & ANALYSIS API
// ============================================================

/**
 * Start the extraction process for a project.
 * This will extract contracts, invoices, and suppliers from uploaded documents.
 * After extraction, the project will be in 'review' status.
 */
export const startExtraction = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/extract`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error starting extraction' }));
    throw new Error(error.detail || 'Error starting extraction');
  }
  return response.json();
};

/**
 * Start the analysis process for a project (after review).
 * This runs the multi-agent AI analysis to identify opportunities.
 * After analysis, the project will be in 'completed' status.
 */
export const startAnalysis = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/analyze`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error starting analysis' }));
    throw new Error(error.detail || 'Error starting analysis');
  }
  return response.json();
};

// ============================================================
// CATEGORIES API (mock for now - extend when backend supports)
// ============================================================

export const getCategories = async (): Promise<Category[]> => {
  // Default categories for cost consulting
  return [
    { id: 'chemicals', name: 'Químicos' },
    { id: 'energy', name: 'Energía' },
    { id: 'sludge', name: 'Lodos y residuos' },
    { id: 'maintenance', name: 'Mantenimiento' },
    { id: 'analytics', name: 'Analíticas' },
    { id: 'om', name: 'O&M' },
    { id: 'fees', name: 'Tasas e impuestos' },
    { id: 'other', name: 'Otros' },
  ];
};

// ============================================================
// REVIEW API
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

export interface ChangeTypeResult {
  success: boolean;
  new_type: string;
  new_id: string;
}

/**
 * Get summary of documents needing review
 */
export const getReviewSummary = async (projectId: string): Promise<ReviewSummary> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/summary`
  );
  if (!response.ok) throw new Error('Error al obtener resumen de revisión');
  return response.json();
};

/**
 * Get list of pending documents for review
 */
export const getPendingDocuments = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/pending`
  );
  if (!response.ok) throw new Error('Error al obtener documentos pendientes');
  return response.json();
};

/**
 * Validate a single document after human review
 */
export const validateDocument = async (
  projectId: string,
  docType: 'contract' | 'invoice',
  docId: string,
  userId: string
): Promise<{ success: boolean }> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/${docType}/${docId}/validate?user_id=${userId}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error al validar documento' }));
    throw new Error(error.detail || 'Error al validar documento');
  }
  return response.json();
};

/**
 * Change document type (contract <-> invoice)
 * The backend moves the record between tables
 */
export const changeDocumentType = async (
  projectId: string,
  currentType: 'contract' | 'invoice',
  docId: string,
  userId: string
): Promise<ChangeTypeResult> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/${currentType}/${docId}/change-type?user_id=${userId}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error al cambiar tipo' }));
    throw new Error(error.detail || 'Error al cambiar tipo de documento');
  }
  return response.json();
};

/**
 * Validate all pending documents at once
 */
export const validateAllDocuments = async (
  projectId: string,
  userId: string
): Promise<{ validated_count: number }> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/review/validate-all?user_id=${userId}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error al validar documentos' }));
    throw new Error(error.detail || 'Error al validar documentos');
  }
  return response.json();
};

// ============================================================
// PROJECT DOCUMENTS API - List all uploaded documents
// ============================================================

export interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  file_url?: string;
  document_type?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count?: number;
  file_size?: number;
  mime_type?: string;
  processing_error?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Get all documents uploaded to a project (regardless of extraction status)
 */
export const getProjectDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error fetching documents' }));
    throw new Error(error.detail || 'Error fetching documents');
  }
  return response.json();
};
