/**
 * Cost Consulting Types
 * Complete type definitions for suppliers and benchmarks
 */

// ============================================================
// SUPPLIER CATEGORY ENUM
// ============================================================

export type SupplierCategory = 
  | 'quimicos'
  | 'operadores_edar'
  | 'gestores_residuos'
  | 'laboratorios'
  | 'equipos_instrumentacion'
  | 'mantenimiento'
  | 'ingenieria'
  | 'energia';

export const SUPPLIER_CATEGORIES: Record<SupplierCategory, string> = {
  quimicos: 'Químicos',
  operadores_edar: 'Operadores EDAR',
  gestores_residuos: 'Gestores de Residuos',
  laboratorios: 'Laboratorios',
  equipos_instrumentacion: 'Equipos e Instrumentación',
  mantenimiento: 'Mantenimiento',
  ingenieria: 'Ingeniería',
  energia: 'Energía',
};

// ============================================================
// SUPPLIER INTERFACES
// ============================================================

export interface ProductService {
  producto: string;
  descripcion: string;
  unidad_tipica: string;
}

export interface CommercialConditions {
  plazo_pago_dias?: number;
  descuento_pronto_pago?: number;
  minimo_pedido?: string;
  formato_entrega?: string[];
  lead_time_dias?: number;
  revisiones_precio?: string;
}

export interface SupplierRating {
  calidad: number;
  servicio: number;
  precio: number;
  cumplimiento: number;
  notas?: string;
}

export interface ContactInfo {
  nombre: string;
  email: string;
  telefono: string;
}

export interface Supplier {
  id: string;
  name: string;
  trade_name?: string;
  tax_id?: string;
  vertical_id?: string;
  category_ids?: string[];
  country: string;
  region?: string;
  web?: string;
  email?: string;
  phone?: string;
  verified: boolean;
  verified_at?: string;
  source: 'manual' | 'extracted';
  categoria?: SupplierCategory;
  subcategorias?: string[];
  productos_servicios?: ProductService[];
  ambito_geografico?: string;
  condiciones_comerciales?: CommercialConditions;
  rating?: SupplierRating;
  contacto_comercial?: ContactInfo;
  activo: boolean;
  fecha_ultima_oferta?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierFilters {
  search?: string;
  categoria?: SupplierCategory;
  verified?: boolean | 'all';
  activo?: boolean | 'all';
  region?: string;
  vertical_code?: string;
}

export interface SupplierCreateData {
  name: string;
  trade_name?: string;
  tax_id?: string;
  vertical_id?: string;
  category_ids?: string[];
  country?: string;
  region?: string;
  web?: string;
  email?: string;
  phone?: string;
}

export interface SupplierVerifyData {
  name: string;
  tax_id?: string;
  category_ids: string[];
  region?: string;
  web?: string;
  company_size?: string;
  certifications?: string[];
  notes?: string;
}

// ============================================================
// BENCHMARK INTERFACES
// ============================================================

export interface BenchmarkCategory {
  code: string;
  name: string;
}

export interface BenchmarkPrice {
  id: string;
  vertical_id: string;
  category_id: string;
  product_name: string;
  unit: string;
  region?: string;
  price_p10: number;
  price_p25: number;
  price_p50: number;
  price_p75: number;
  price_p90: number;
  source: string;
  valid_from: string;
  valid_until: string;
  notes?: string;
  cost_categories?: BenchmarkCategory;
  created_at?: string;
  updated_at?: string;
}

export interface BenchmarkFilters {
  category_id?: string;
  region?: string;
  year?: number;
  search?: string;
}

export interface BenchmarkCreateData {
  category_code: string;
  product_name: string;
  unit: string;
  region?: string;
  price_p10: number;
  price_p25: number;
  price_p50: number;
  price_p75: number;
  price_p90: number;
  source: string;
  valid_from: string;
  valid_until: string;
  notes?: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
}

export interface BenchmarksResponse {
  benchmarks: BenchmarkPrice[];
  total: number;
}

// ============================================================
// VANDARUM COLORS
// ============================================================

export const VANDARUM_COLORS = {
  teal: '#307177',
  blue: '#32b4cd',
  greenLight: '#8cb63c',
  orange: '#ffa720',
} as const;
