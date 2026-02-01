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
