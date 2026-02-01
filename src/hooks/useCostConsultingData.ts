/**
 * Hooks para el módulo de Cost Consulting
 * Lee de la base de datos externa usando externalSupabase
 */
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

// ============================================================
// TIPOS
// ============================================================

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
  total_spend_analyzed: number | null;
  total_savings_identified: number | null;
  savings_pct: number | null;
  opportunities_count: number | null;
  quick_wins_count: number | null;
  created_at: string;
  cost_verticals?: { name: string; icon: string } | null;
}

export interface CostContract {
  id: string;
  project_id: string;
  supplier_name_raw: string | null;
  contract_number: string | null;
  total_annual_value: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_renewal: boolean | null;
  risk_score: number | null;
  risk_flags: string[] | null;
  benchmark_comparison: Record<string, unknown> | null;
  cost_suppliers?: { name: string; tax_id: string } | null;
}

export interface CostInvoice {
  id: string;
  project_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total: number | null;
  compliance_status: string | null;
  compliance_issues: Record<string, unknown>[] | null;
  cost_suppliers?: { name: string } | null;
}

export interface CostOpportunity {
  id: string;
  project_id: string;
  opportunity_type: string;
  title: string;
  description: string | null;
  current_annual_cost: number | null;
  savings_annual: number | null;
  savings_pct: number | null;
  impact_score: number | null;
  effort_score: number | null;
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
        .select('*, cost_verticals(name, icon)')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as CostProject;
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - CONTRATOS
// ============================================================

export const useCostContracts = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await externalSupabase
        .from('cost_project_contracts')
        .select('*, cost_suppliers(name, tax_id)')
        .eq('project_id', projectId)
        .order('total_annual_value', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CostContract[];
    },
    enabled: !!projectId,
  });
};

// ============================================================
// HOOKS - FACTURAS
// ============================================================

export const useCostInvoices = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-invoices', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await externalSupabase
        .from('cost_project_invoices')
        .select('*, cost_suppliers(name)')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CostInvoice[];
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

// ============================================================
// HOOKS - ESTADÍSTICAS
// ============================================================

export const useCostStats = (userId?: string) => {
  return useQuery({
    queryKey: ['cost-stats', userId],
    queryFn: async () => {
      if (!userId) return { projects: 0, savings: 0, suppliers: 0 };
      
      const { data: projects } = await externalSupabase
        .from('cost_consulting_projects')
        .select('total_savings_identified')
        .eq('user_id', userId);
      
      const { count: suppliersCount } = await externalSupabase
        .from('cost_suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);
      
      const totalSavings = (projects || []).reduce(
        (sum, p) => sum + (p.total_savings_identified || 0), 0
      );
      
      return {
        projects: projects?.length || 0,
        savings: totalSavings,
        suppliers: suppliersCount || 0,
      };
    },
    enabled: !!userId,
  });
};
