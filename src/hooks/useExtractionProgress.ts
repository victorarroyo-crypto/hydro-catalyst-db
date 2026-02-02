/**
 * Hook para polling del progreso de extracción en Cost Consulting
 * Lee progress_pct y current_phase de la BD externa cada 10 segundos
 */
import { useState, useEffect } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';

// Mapeo de fases del backend a información de paso y etiqueta
export const EXTRACTION_PHASES: Record<string, { step: number; label: string }> = {
  // Cargando documentos
  'document_extraction': { step: 0, label: 'Cargando documentos' },
  'loading_documents': { step: 0, label: 'Cargando documentos' },
  'preparing_documents': { step: 0, label: 'Preparando documentos' },
  
  // Clasificando
  'classifying_documents': { step: 1, label: 'Clasificando documentos' },
  
  // Extrayendo
  'extracting_invoices': { step: 2, label: 'Extrayendo facturas' },
  'extracting_contracts': { step: 3, label: 'Extrayendo contratos' },
  
  // Validando/Guardando
  'validating_data': { step: 4, label: 'Validando datos' },
  'saving_contracts': { step: 4, label: 'Guardando contratos' },
  'saving_invoices': { step: 4, label: 'Guardando facturas' },
  
  // Detectando proveedores
  'detecting_suppliers': { step: 5, label: 'Detectando proveedores' },
  
  // Finalizado
  'extraction_finished': { step: 6, label: 'Finalizado' },
  'extraction_complete': { step: 6, label: 'Finalizado' },
  
  // Errores
  'timeout_error': { step: -1, label: 'Error: tiempo agotado' },
  'extraction_error': { step: -1, label: 'Error en extracción' },
};

// Lista ordenada de pasos para mostrar en UI
export const EXTRACTION_STEPS = [
  'Cargando documentos',
  'Clasificando documentos',
  'Extrayendo facturas',
  'Extrayendo contratos',
  'Validando datos',
  'Detectando proveedores',
  'Finalizado',
];

// Mantener compatibilidad con PHASE_LABELS antiguo
export const PHASE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(EXTRACTION_PHASES).map(([key, value]) => [key, value.label])
);

export interface ExtractionProgress {
  progress_pct: number;
  current_phase: string | null;
  status: string;
}

export function useExtractionProgress(
  projectId: string | undefined,
  enabled: boolean = true
): ExtractionProgress {
  const [progress, setProgress] = useState<ExtractionProgress>({
    progress_pct: 0,
    current_phase: null,
    status: 'draft'
  });

  useEffect(() => {
    if (!projectId || !enabled) return;

    const fetchProgress = async () => {
      const { data, error } = await externalSupabase
        .from('cost_consulting_projects')
        .select('progress_pct, current_phase, status')
        .eq('id', projectId)
        .single();

      if (data && !error) {
        setProgress({
          progress_pct: data.progress_pct || 0,
          current_phase: data.current_phase,
          status: data.status
        });
      }
    };

    // Fetch immediately
    fetchProgress();

    // Poll every 2 seconds for more responsive UI during extraction
    const interval = setInterval(fetchProgress, 2000);

    return () => clearInterval(interval);
  }, [projectId, enabled]);

  return progress;
}

// Helper para obtener información del paso actual
export function getPhaseInfo(phase: string | null): { step: number; label: string } {
  if (!phase) return { step: 0, label: 'Procesando...' };
  return EXTRACTION_PHASES[phase] || { step: 0, label: 'Procesando...' };
}
