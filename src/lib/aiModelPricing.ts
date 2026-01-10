// Precios estimados por millón de tokens (en USD)
// Basados en precios públicos de Google y OpenAI
// NOTA: Los costes reales de Lovable AI pueden variar

export interface ModelPricing {
  input: number;  // USD por millón de tokens de entrada
  output: number; // USD por millón de tokens de salida
}

export interface AIModel {
  id: string;
  name: string;
  tier: 'económico' | 'estándar' | 'premium';
  speed: 'muy rápido' | 'rápido' | 'moderado';
}

// Modelos disponibles en Lovable AI
export const AI_MODELS: AIModel[] = [
  // Google Gemini - Premium
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'premium', speed: 'moderado' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', tier: 'premium', speed: 'moderado' },
  
  // Google Gemini - Estándar
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'estándar', speed: 'rápido' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'estándar', speed: 'rápido' },
  
  // Google Gemini - Económico
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tier: 'económico', speed: 'muy rápido' },
  
  // OpenAI GPT - Premium
  { id: 'openai/gpt-5', name: 'GPT-5', tier: 'premium', speed: 'moderado' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', tier: 'premium', speed: 'moderado' },
  
  // OpenAI GPT - Estándar
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', tier: 'estándar', speed: 'rápido' },
  
  // OpenAI GPT - Económico
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', tier: 'económico', speed: 'muy rápido' },
];

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'google/gemini-2.5-flash-lite': { input: 0.075, output: 0.30 },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'google/gemini-3-flash-preview': { input: 0.15, output: 0.60 },
  'google/gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'google/gemini-3-pro-preview': { input: 1.50, output: 6.00 },
  'google/gemini-3-pro-image-preview': { input: 1.50, output: 6.00 },
  
  // OpenAI GPT
  'openai/gpt-5': { input: 5.00, output: 15.00 },
  'openai/gpt-5.2': { input: 6.00, output: 18.00 },
  'openai/gpt-5-mini': { input: 0.40, output: 1.60 },
  'openai/gpt-5-nano': { input: 0.10, output: 0.40 },
};

// Precio por defecto si no se encuentra el modelo
const DEFAULT_PRICING: ModelPricing = { input: 0.15, output: 0.60 };

/**
 * Calcula el coste estimado de una petición de IA
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Calcula el coste estimado usando tokens totales (asume ratio 1:1 input:output)
 */
export function estimateCostFromTotal(model: string, totalTokens: number): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  // Asumimos 60% input, 40% output como ratio típico
  const inputTokens = totalTokens * 0.6;
  const outputTokens = totalTokens * 0.4;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Formatea un coste en USD
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Obtiene los precios de un modelo (por millón de tokens)
 */
export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || DEFAULT_PRICING;
}

/**
 * Formatea el precio para mostrar en UI (por millón de tokens)
 */
export function formatPricePerMillion(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}
