/**
 * Hook para polling del progreso de extracción en Cost Consulting
 * Lee progress_pct y current_phase de la BD externa cada 10 segundos
 */
import { useState, useEffect } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';

// Mapeo de fases del backend a texto en español
export const PHASE_LABELS: Record<string, string> = {
  'loading_documents': 'Cargando documentos...',
  'preparing_documents': 'Preparando documentos...',
  'classifying_documents': 'Clasificando documentos...',
  'extracting_invoices': 'Extrayendo facturas...',
  'extracting_contracts': 'Extrayendo contratos...',
  'extraction_complete': 'Extracción completada',
  'saving_contracts': 'Guardando contratos...',
  'saving_invoices': 'Guardando facturas...',
  'detecting_suppliers': 'Detectando proveedores...',
  'extraction_finished': 'Finalizado',
  'timeout_error': 'Error: tiempo agotado',
  'extraction_error': 'Error en extracción',
};

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

    // Poll every 10 seconds (extraction phases last 30s-2min each)
    const interval = setInterval(fetchProgress, 10000);

    return () => clearInterval(interval);
  }, [projectId, enabled]);

  return progress;
}
