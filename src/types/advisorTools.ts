// Tipos para herramientas especiales del AI Advisor

export interface TechnologyFicha {
  nombre: string;
  proveedor: string;
  pais: string;
  trl: number;
  descripcion: string;
  aplicacion: string;
  ventajas: string;
  limitaciones: string;
  web: string;
  contacto: string;
}

export interface FichaTecnicaMetadata {
  type: "ficha_tecnica";
  title: string;
  generated_at: string;
  technologies: TechnologyFicha[];
  export_formats: string[];
}

export interface CriterioOferta {
  nombre: string;
  peso: number;
  tipo: "menor_mejor" | "mayor_mejor";
}

export interface ComparadorOfertasMetadata {
  type: "comparador_ofertas";
  title: string;
  instructions: string;
  criterios: CriterioOferta[];
  ofertas_template: Array<{ proveedor: string; valores: Record<string, number> }>;
  export_formats: string[];
}

export interface ParametroAnalisis {
  parametro: string;
  unidad: string;
  metodo: string;
  frecuencia: string;
  obligatorio: boolean;
}

export interface ChecklistAnalisisMetadata {
  type: "checklist_analisis";
  title: string;
  sector: string;
  parametros_basicos: ParametroAnalisis[];
  parametros_especificos: ParametroAnalisis[];
  recomendaciones: string[];
  laboratorios_acreditados: Array<{ nombre: string; nota: string }>;
  export_formats: string[];
}

export interface ServicioVandarum {
  codigo: string;
  nombre: string;
  descripcion: string;
  duracion: string;
  entregables: string[];
}

export interface FormField {
  campo: string;
  label: string;
  tipo: "text" | "email" | "tel" | "number" | "select" | "multiselect" | "textarea" | "boolean";
  options?: string[];
  required: boolean;
}

export interface PresupuestoVandarumMetadata {
  type: "presupuesto_vandarum";
  title: string;
  empresa: {
    nombre: string;
    especialidad: string;
    web: string;
    email: string;
    telefono: string;
  };
  servicios: ServicioVandarum[];
  formulario: {
    datos_empresa: FormField[];
    datos_tecnicos: FormField[];
    servicios_solicitados: FormField[];
    informacion_adicional: FormField[];
  };
  contexto_consulta: string;
  next_steps: string[];
}

export type ToolMetadata = 
  | FichaTecnicaMetadata 
  | ComparadorOfertasMetadata 
  | ChecklistAnalisisMetadata 
  | PresupuestoVandarumMetadata;

// Actualizar ChatResponse para incluir metadata
export interface AdvisorChatResponse {
  response: string;
  chat_id: string;
  credits_used: number;
  credits_remaining: number;
  is_free: boolean;
  sources: Array<{
    name: string;
    type: string;
    provider?: string;
    similarity?: number;
    trl?: number;
    url?: string;
  }>;
  metadata?: ToolMetadata;
}
