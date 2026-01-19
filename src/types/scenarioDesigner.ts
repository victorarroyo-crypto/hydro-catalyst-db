// Types for Scenario Designer

export type ScenarioType = 'baseline' | 'conservative' | 'moderate' | 'transformational' | 'alternative';

export interface TechnologyConfig {
  id: string;
  technology_type: string;
  name: string;
  // Performance parameters
  recovery_rate: number; // %
  removal_efficiency: Record<string, number>; // e.g., { "TSS": 95, "BOD": 90 }
  energy_consumption: number; // kWh/m³
  chemical_consumption: Record<string, number>; // kg/m³ per chemical
  // Design parameters
  design_flow: number; // m³/day
  peak_factor: number;
  hydraulic_retention_time: number; // hours
  // Costs
  capex: number; // €
  opex_per_m3: number; // €/m³
  maintenance_percent: number; // % of CAPEX per year
  lifespan_years: number;
  // Metadata
  is_default: boolean;
  notes: string;
}

export interface TreatmentTrain {
  id: string;
  name: string;
  description?: string;
  order?: number;
  capacity_m3_day?: number;
  design_capacity_m3_day?: number; // Alias for capacity
  source_type?: 'raw_water' | 'wastewater' | 'recycled' | 'rainwater';
  target_use?: string;
  technologies?: TechnologyConfig[];
  // Visual builder fields
  stages?: string[]; // ['MBR', 'RO', 'UV'] - simplified stage list
  inlet_stream?: string;
  outlet_quality?: string;
}

export interface ScenarioObjectives {
  main_objective: string;
  secondary_objectives: string[];
  constraints: string[];
  target_water_savings: number; // %
  target_cost_savings: number; // %
  max_capex: number; // €
  max_payback_years: number;
}

export interface WaterBalance {
  total_input_m3_day: number;
  total_output_m3_day: number;
  total_recycled_m3_day: number;
  total_losses_m3_day: number;
  recycling_rate: number; // %
  efficiency: number; // %
  comparison_vs_baseline: {
    water_savings_m3: number;
    water_savings_percent: number;
  };
}

export interface FinancialSummary {
  total_capex: number;
  annual_opex: number;
  annual_savings: number;
  payback_years: number;
  roi_percent: number;
  npv_10y: number;
  irr_percent: number;
  comparison_vs_baseline: {
    additional_capex: number;
    additional_savings: number;
    incremental_roi: number;
  };
}

export interface ScenarioDesign {
  id: string;
  project_id: string;
  name: string;
  description: string;
  scenario_type: ScenarioType;
  is_baseline: boolean;
  is_recommended: boolean;
  is_ai_generated: boolean;
  methodology: string;
  objectives: ScenarioObjectives;
  treatment_trains: TreatmentTrain[];
  water_balance: WaterBalance | null;
  financials: FinancialSummary | null;
  diagram_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TechnologyDefault {
  type: string;
  label: string;
  category: string;
  default_recovery_rate: number;
  default_removal_efficiency: Record<string, number>;
  default_energy_consumption: number;
  capex_range: { min: number; max: number };
  opex_range: { min: number; max: number };
}

export const SCENARIO_TYPE_CONFIG: Record<ScenarioType, { label: string; color: string; icon: string }> = {
  baseline: { label: 'Baseline', color: 'blue', icon: 'Flag' },
  conservative: { label: 'Conservador', color: 'green', icon: 'Shield' },
  moderate: { label: 'Moderado', color: 'amber', icon: 'TrendingUp' },
  transformational: { label: 'Transformacional', color: 'purple', icon: 'Rocket' },
  alternative: { label: 'Alternativo', color: 'gray', icon: 'Shuffle' },
};

export const TECHNOLOGY_TYPES = [
  { type: 'MBR', label: 'Biorreactor de Membrana (MBR)', category: 'biological' },
  { type: 'RO', label: 'Ósmosis Inversa (RO)', category: 'membrane' },
  { type: 'UF', label: 'Ultrafiltración (UF)', category: 'membrane' },
  { type: 'MF', label: 'Microfiltración (MF)', category: 'membrane' },
  { type: 'NF', label: 'Nanofiltración (NF)', category: 'membrane' },
  { type: 'UV', label: 'Desinfección UV', category: 'disinfection' },
  { type: 'OZONE', label: 'Ozonización', category: 'disinfection' },
  { type: 'CHLOR', label: 'Cloración', category: 'disinfection' },
  { type: 'ACTIVATED_SLUDGE', label: 'Lodos Activados', category: 'biological' },
  { type: 'SBR', label: 'Reactor Secuencial (SBR)', category: 'biological' },
  { type: 'MBBR', label: 'Lecho Móvil (MBBR)', category: 'biological' },
  { type: 'DAF', label: 'Flotación por Aire Disuelto (DAF)', category: 'physical' },
  { type: 'SETTLING', label: 'Sedimentación', category: 'physical' },
  { type: 'FLOCCULATION', label: 'Floculación', category: 'chemical' },
  { type: 'COAGULATION', label: 'Coagulación', category: 'chemical' },
  { type: 'ION_EXCHANGE', label: 'Intercambio Iónico', category: 'chemical' },
  { type: 'ACTIVATED_CARBON', label: 'Carbón Activado', category: 'adsorption' },
  { type: 'EVAPORATOR', label: 'Evaporador', category: 'thermal' },
  { type: 'CRYSTALLIZER', label: 'Cristalizador', category: 'thermal' },
] as const;
