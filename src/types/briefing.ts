// ============================================================================
// PROJECT BRIEFING TYPES
// ============================================================================

export type ProjectType =
  | 'diagnosis'
  | 'optimization'
  | 'new_plant'
  | 'audit'
  | 'feasibility'
  | 'expansion'
  | 'compliance'
  | 'zld_mld'
  | 'other';

export type CapexPreference =
  | 'zero_or_minimum'
  | 'limited'
  | 'flexible'
  | 'investment_ready';

export interface ScopeArea {
  enabled: boolean;
  notes: string;
}

export interface ProjectScope {
  water_supply: ScopeArea;
  process_water: ScopeArea;
  cooling_systems: ScopeArea;
  boiler_steam: ScopeArea;
  wastewater_treatment: ScopeArea;
  sludge_management: ScopeArea;
  hazardous_waste: ScopeArea;
  non_hazardous_waste: ScopeArea;
  reuse_recycling: ScopeArea;
  ro_membranes: ScopeArea;
  energy_water_nexus: ScopeArea;
  other: ScopeArea;
}

export interface ProjectConstraints {
  capex_preference: CapexPreference;
  capex_max_eur?: number;
  timeline_months?: number;
  operational_constraints: string[];
  technical_constraints: string[];
  other_constraints?: string;
}

export interface KnownWaterData {
  water_intake_m3_year?: number;
  water_cost_eur_m3?: number;
  wastewater_discharge_m3_year?: number;
  wastewater_cost_eur_m3?: number;
  has_water_meter?: boolean;
  has_wastewater_meter?: boolean;
}

export interface KnownWasteData {
  sludge_tons_year?: number;
  sludge_cost_eur_ton?: number;
  hazardous_waste_tons_year?: number;
  hazardous_waste_cost_eur_ton?: number;
  non_hazardous_tons_year?: number;
  non_hazardous_cost_eur_ton?: number;
  waste_manager_name?: string;
  ler_codes?: string[];
}

export interface CompanyInfo {
  company_name: string;
  company_website?: string;
  nif_cif?: string;
  cnae_code?: string;
  plant_location?: string;
  coordinates?: { lat: number; lng: number };
  autonomous_community?: string;
  river_basin?: string;
  industrial_sector?: string;
}

export interface ProjectBriefing {
  project_id: string;
  project_type: ProjectType;
  project_type_other?: string;
  scope_areas: ProjectScope;
  problem_statement: string;
  expected_outcomes?: string;
  constraints: ProjectConstraints;
  known_water_data: KnownWaterData;
  known_waste_data: KnownWasteData;
  company_info: CompanyInfo;
  briefing_completed: boolean;
  briefing_completed_at?: string;
}

// ============================================================================
// RESEARCH SOURCES TYPES
// ============================================================================

export type ResearchSourceType =
  | 'company_website'
  | 'company_news'
  | 'permit_aai'
  | 'permit_discharge'
  | 'regulation_eu'
  | 'regulation_national'
  | 'regulation_regional'
  | 'regulation_local'
  | 'bref_document'
  | 'scientific_paper'
  | 'technical_report'
  | 'case_study'
  | 'technology_datasheet'
  | 'supplier_info'
  | 'industry_benchmark'
  | 'other';

export interface ResearchSource {
  id: string;
  project_id: string;
  source_type: ResearchSourceType;
  title: string;
  url?: string;
  source_name?: string;
  publication_date?: string;
  language: string;
  summary?: string;
  key_points: string[];
  key_findings?: string[];
  extracted_data?: Record<string, unknown>;
  relevance_score?: number;
  relevance_notes?: string;
  found_by_agent?: string;
  verified: boolean;
  verified_at?: string;
  status?: 'pending' | 'verified' | 'starred';
  created_at: string;
}

export interface ResearchSourcesByType {
  source_type: ResearchSourceType;
  count: number;
  avg_relevance: number;
  sources: ResearchSource[];
}

// ============================================================================
// AGENT CONCLUSIONS TYPES
// ============================================================================

export type ConclusionType =
  | 'finding'
  | 'recommendation'
  | 'warning'
  | 'opportunity'
  | 'risk'
  | 'data_gap'
  | 'regulation_alert'
  | 'benchmark_comparison';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'info' | 'minor' | 'moderate' | 'major' | 'critical';

export interface HumanReview {
  approved?: boolean;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface AgentConclusion {
  id: string;
  project_id: string;
  agent_name: string;
  agent_role?: string;
  phase?: string;
  conclusion_type: ConclusionType;
  title: string;
  content: string;
  description: string;
  details?: Record<string, unknown>;
  evidence?: string[];
  supporting_source_ids: string[];
  priority: Priority;
  severity?: Severity;
  display_order: number;
  show_in_summary: boolean;
  consultant_reviewed: boolean;
  consultant_notes?: string;
  human_review?: HumanReview;
  dismissed: boolean;
  created_at: string;
}

export interface ConclusionsSummary {
  agent_name: string;
  phase: string;
  total_conclusions: number;
  findings: number;
  recommendations: number;
  warnings: number;
  high_priority: number;
}
