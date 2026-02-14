export interface ChemInvoice {
  id: string;
  project_id: string;
  supplier_id: string | null;
  document_id: string | null;
  numero_factura: string | null;
  fecha_factura: string;
  fecha_vencimiento: string | null;
  importe_base: number | null;
  importe_iva: number | null;
  pct_iva: number | null;
  importe_total: number | null;
  condiciones_pago: string | null;
  plazo_pago_dias: number | null;
  total_productos: number | null;
  total_portes: number | null;
  total_recargos: number | null;
  total_servicios: number | null;
  total_descuentos: number | null;
  pct_costes_no_producto: number | null;
  confianza_global: number | null;
  errores_detectados: any[];
  observaciones_consultor: any[];
  estado: 'extraido' | 'revisado' | 'confirmado' | 'error';
  revisado_por_usuario: boolean;
  created_at: string;
  // Joined
  lines?: ChemInvoiceLine[];
  chem_suppliers?: { nombre: string };
}

export type LineType =
  | 'producto'
  | 'porte_transporte'
  | 'recargo_envase'
  | 'recargo_urgencia'
  | 'recargo_minimo'
  | 'alquiler_equipo'
  | 'servicio_tecnico'
  | 'gestion_envases'
  | 'rappel_descuento'
  | 'pronto_pago'
  | 'otro';

export interface ChemInvoiceLine {
  id: string;
  invoice_id: string;
  producto_nombre: string;
  product_id: string | null;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  importe_linea: number | null;
  concentracion_detectada: number | null;
  precio_kg_materia_activa: number | null;
  tipo_linea: LineType;
  formato_entrega: string | null;
  confianza_extraccion: number;
  texto_original: string | null;
  notas_ia: string | null;
  created_at: string;
}

export type AlertType =
  | 'precio_vs_contrato'
  | 'subida_no_justificada'
  | 'bajada_no_trasladada'
  | 'rappel_no_cobrado'
  | 'recargo_no_pactado'
  | 'formato_caro'
  | 'frecuencia_ineficiente'
  | 'plazo_pago_incumplido'
  | 'error_facturacion'
  | 'concentracion_cara'
  | 'porte_excesivo'
  | 'tendencia_alcista';

export type AlertSeverity = 'baja' | 'media' | 'alta' | 'critica';
export type AlertState = 'pendiente' | 'revisada' | 'descartada' | 'accionada';

export interface ChemInvoiceAlert {
  id: string;
  project_id: string;
  supplier_id: string | null;
  invoice_id: string | null;
  tipo_alerta: AlertType;
  severidad: AlertSeverity;
  descripcion: string;
  impacto_estimado_eur: number | null;
  datos_soporte: any;
  estado: AlertState;
  created_at: string;
  // Joined
  chem_suppliers?: { nombre: string };
}

export interface ProductBaseline {
  producto: string;
  precio_medio: number;
  precio_medio_ponderado?: number;
  precio_medio_ponderado_ma?: number | null;
  concentracion?: number | null;
  concentracion_media?: number | null;
  tco_kg?: number;
  tco_extra_total?: number;
  volumen_total_kg: number;
  volumen_anual_kg?: number;
  gasto_anual?: number;
  num_facturas: number;
  precio_kg_ma: number | null;
  tendencia?: 'subiendo' | 'bajando' | 'estable' | 'sin datos';
  variacion_pct?: number;
  formatos?: Record<string, number>;
}

export interface InvoiceSummary {
  project_id: string;
  total_invoices?: number;
  facturas_analizadas?: number;
  total_lines?: number;
  total_gasto?: number;
  gasto_total?: number;
  periodo?: { desde: string; hasta: string };
  periodo_inicio?: string;
  periodo_fin?: string;
  desglose_costes?: {
    productos: number;
    portes: number;
    recargos: number;
    servicios: number;
    descuentos: number;
    pct_no_producto?: number;
  };
  pct_costes_no_producto?: number;
  baselines?: ProductBaseline[];
  baseline_por_producto?: ProductBaseline[];
  alertas?: {
    total: number;
    pendientes: number;
    por_tipo: Record<string, number>;
    por_severidad?: Record<string, number>;
    ahorro_potencial_eur?: number;
    ahorro_potencial_total?: number;
  };
  suppliers?: {
    supplier_id: string;
    nombre: string;
    num_facturas: number;
    gasto_total: number;
    alertas_pendientes: number;
  }[];
}

// UI helpers
export const LINE_TYPE_CONFIG: Record<LineType, { label: string; color: string; icon: string }> = {
  producto: { label: 'Producto', color: 'bg-background text-foreground', icon: 'Package' },
  porte_transporte: { label: 'Transporte', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: 'Truck' },
  recargo_envase: { label: 'Recargo envase', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300', icon: 'Box' },
  recargo_urgencia: { label: 'Recargo urgencia', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: 'AlertTriangle' },
  recargo_minimo: { label: 'Recargo mínimo', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300', icon: 'MinusCircle' },
  alquiler_equipo: { label: 'Alquiler equipo', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300', icon: 'Wrench' },
  servicio_tecnico: { label: 'Servicio técnico', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: 'Settings' },
  gestion_envases: { label: 'Gestión envases', color: 'bg-muted text-muted-foreground', icon: 'Recycle' },
  rappel_descuento: { label: 'Rappel/Descuento', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: 'ArrowDown' },
  pronto_pago: { label: 'Pronto pago', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: 'Clock' },
  otro: { label: 'Otro', color: 'bg-muted text-muted-foreground', icon: 'HelpCircle' },
};

export const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; border: string }> = {
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', border: 'border-l-4 border-l-red-500' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', border: 'border-l-4 border-l-orange-500' },
  media: { label: 'Media', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', border: 'border-l-4 border-l-yellow-500' },
  baja: { label: 'Baja', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', border: 'border-l-4 border-l-blue-500' },
};

export const ALERT_STATE_CONFIG: Record<AlertState, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  revisada: { label: 'Revisada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  descartada: { label: 'Descartada', color: 'bg-muted text-muted-foreground' },
  accionada: { label: 'Accionada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
};

export const ESTADO_FACTURA_CONFIG: Record<string, { label: string; color: string }> = {
  extraido: { label: 'Extraído', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  revisado: { label: 'Revisado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  error: { label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function formatEUR(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatEURCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}
