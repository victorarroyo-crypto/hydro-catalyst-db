/**
 * Hooks para el módulo de Cost Consulting
 * Usa API de Railway para contratos/facturas, externalSupabase para el resto
 */
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { getContracts, getInvoices } from '@/services/costConsultingApi';

// ============================================================
// TIPOS
// ============================================================

export interface CostDocument {
  id: string;
  project_id: string;
  filename: string;
  file_type: 'contrato' | 'factura' | 'listado_proveedores' | 'otro';
  document_type?: string; // 'contract' | 'invoice' | 'other'
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  uploaded_at: string;
}

export interface CostProjectExtractionStatus {
  contracts_found: number;
  invoices_found: number;
  suppliers_found: number;
  errors: string[];
}

export interface CostProject {
  id: string;
  user_id: string;
  name: string;
  client_name: string | null;
  vertical_id: string;
  sector: string | null;
  status: string;
  current_phase: string | null;
  progress_pct: number;
  total_spend: number | null; // alias for total_spend_analyzed
  total_spend_analyzed: number | null;
  total_savings_identified: number | null;
  savings_pct: number | null;
  opportunities_count: number | null;
  quick_wins_count: number | null;
  extraction_status: CostProjectExtractionStatus | null;
  created_at: string;
  cost_verticals?: { name: string; icon: string } | null;
}

export interface CostContract {
  id: string;
  project_id: string;
  document_id: string | null;
  supplier_name_raw: string | null;
  supplier_tax_id: string | null;
  contract_number: string | null;
  total_annual_value: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_renewal: boolean | null;
  notice_period_days: number | null;
  payment_days: number | null;
  risk_score: number | null;
  risk_flags: string[] | null;
  benchmark_comparison: Record<string, unknown> | null;
  prices: Record<string, unknown>[] | null;
  cost_suppliers?: { name: string; tax_id: string } | null;
  cost_project_documents?: CostDocument | null;
}

export interface CostInvoice {
  id: string;
  project_id: string;
  document_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  category: string | null;
  supplier_name_raw: string | null;
  compliance_status: string | null;
  compliance_issues: Record<string, unknown>[] | null;
  line_items: Record<string, unknown>[] | null;
  cost_suppliers?: { name: string } | null;
  cost_project_documents?: CostDocument | null;
}

export interface CostOpportunity {
  id: string;
  project_id: string;
  opportunity_type: string;
  title: string;
  description: string | null;
  current_annual_cost: number | null;
  target_annual_cost: number | null;
  savings_annual: number | null;
  savings_pct: number | null;
  confidence: string | null;
  impact_score: number | null;
  effort_score: number | null;
  effort_level: string | null; // 'low' | 'medium' | 'high'
  risk_score: number | null;
  priority_score: number | null;
  implementation_horizon: string | null;
  status: string;
  recommended_actions: Record<string, unknown>[] | null;
}

export interface CostSupplier {
  id: string;
  name: string;
  trade_name: string | null;
  tax_id: string | null;
  region: string | null;
  company_size: string | null;
  reputation_score: number | null;
  price_competitiveness: string | null;
  verified: boolean;
  certifications: string[] | null;
}

// ============================================================
// HOOKS - PROYECTOS
// ============================================================

export const useCostProjects = (userId?: string) => {
  return useQuery({
    queryKey: ['cost-projects', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await externalSupabase
        .from('cost_consulting_projects')
        .select('*, cost_verticals(name, icon)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CostProject[];
    },
    enabled: !!userId,
  });
};

export const useCostProject = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await externalSupabase
        .from('cost_consulting_projects')
        .select(`
          *,
          cost_verticals (name, icon)
        `)
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as CostProject;
    },
    enabled: !!projectId,
    // Polling activo si está en proceso
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'extracting' || status === 'processing' || status === 'analyzing' || status === 'uploading') {
        return 3000; // Poll cada 3 segundos
      }
      return false;
    }
  });
};

// ============================================================
// HOOKS - DOCUMENTOS (PDFs)
// ============================================================

export const useCostDocuments = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-documents', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await externalSupabase
        .from('cost_project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CostDocument[];
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - CONTRATOS (con PDF)
// ============================================================

export const useCostContracts = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostContracts] Fetching via Railway API for projectId:', projectId);
      const response = await getContracts(projectId);
      console.log('[useCostContracts] API response:', response);
      
      // API returns { contracts: [...] }, extract the array
      return (response?.contracts || []) as CostContract[];
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - FACTURAS (con PDF)
// ============================================================

export const useCostInvoices = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-invoices', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostInvoices] Fetching via Railway API for projectId:', projectId);
      const response = await getInvoices(projectId);
      console.log('[useCostInvoices] API response:', response);
      
      // API returns { invoices: [...] }, extract the array
      return (response?.invoices || []) as CostInvoice[];
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - OPORTUNIDADES
// ============================================================

export const useCostOpportunities = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-opportunities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await externalSupabase
        .from('cost_project_opportunities')
        .select('*')
        .eq('project_id', projectId)
        .order('priority_score', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CostOpportunity[];
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - PROVEEDORES
// ============================================================

export const useCostSuppliers = () => {
  return useQuery({
    queryKey: ['cost-suppliers'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('cost_suppliers')
        .select('*')
        .eq('verified', true)
        .order('name');
      
      if (error) throw error;
      return (data || []) as CostSupplier[];
    },
  });
};

export const useCostAllSuppliers = () => {
  return useQuery({
    queryKey: ['cost-all-suppliers'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('cost_suppliers')
        .select('*')
        .order('verified', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return (data || []) as CostSupplier[];
    },
  });
};

// ============================================================
// HOOKS - ESTADÍSTICAS
// ============================================================

export const useCostStats = (userId?: string) => {
  return useQuery({
    queryKey: ['cost-stats', userId],
    queryFn: async () => {
      if (!userId) return { projects: 0, savings: 0, suppliers: 0, quickWins: 0 };
      
      const { data: projects } = await externalSupabase
        .from('cost_consulting_projects')
        .select('total_savings_identified, quick_wins_count')
        .eq('user_id', userId);
      
      const { count: suppliersCount } = await externalSupabase
        .from('cost_suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);
      
      const totalSavings = (projects || []).reduce(
        (sum, p) => sum + (p.total_savings_identified || 0), 0
      );
      
      const totalQuickWins = (projects || []).reduce(
        (sum, p) => sum + (p.quick_wins_count || 0), 0
      );
      
      return {
        projects: projects?.length || 0,
        savings: totalSavings,
        suppliers: suppliersCount || 0,
        quickWins: totalQuickWins,
      };
    },
    enabled: !!userId,
  });
};
