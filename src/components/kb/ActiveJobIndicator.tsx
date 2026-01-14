import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertCircle, GitMerge } from 'lucide-react';
import type { ActiveCaseStudyJob } from '@/hooks/useCaseStudyActiveJob';

// Phase labels for display
const PHASE_LABELS: Record<string, string> = {
  uploading: 'Subiendo archivos',
  classifying: 'Clasificando',
  extracting_context: 'Extrayendo contexto',
  extracting_methodology: 'Extrayendo metodología',
  extracting_analysis: 'Analizando',
  extracting_results: 'Procesando resultados',
  extracting_lessons: 'Extrayendo lecciones',
  listing_technologies: 'Listando tecnologías',
  enriching_technologies: 'Enriqueciendo fichas',
  matching_technologies: 'Matching con BD',
  saving: 'Guardando',
  accumulating: 'Acumulando documentos',
  similar_found: 'Casos similares encontrados',
};

interface ActiveJobIndicatorProps {
  job: ActiveCaseStudyJob;
  onReconnect: () => void;
}

export const ActiveJobIndicator: React.FC<ActiveJobIndicatorProps> = ({
  job,
  onReconnect,
}) => {
  const isAwaitingDecision = job.status === 'awaiting_user_decision';
  
  const phaseLabel = job.current_phase 
    ? PHASE_LABELS[job.current_phase] || job.current_phase 
    : 'Procesando...';
  
  const timeSinceUpdate = Date.now() - new Date(job.updated_at).getTime();
  const minutesSinceUpdate = Math.floor(timeSinceUpdate / 60000);
  const isStale = minutesSinceUpdate >= 5 && !isAwaitingDecision; // Don't show stale for awaiting decision

  return (
    <Card className={`border-primary/30 ${isAwaitingDecision ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300' : 'bg-primary/5 dark:bg-primary/10'}`}>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              {isAwaitingDecision ? (
                <GitMerge className="h-6 w-6 text-amber-600" />
              ) : (
                <>
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
                </>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {isAwaitingDecision ? 'Acción requerida' : 'Procesamiento en curso'}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {job.progress_percentage}%
                </Badge>
                {isAwaitingDecision && (
                  <Badge className="text-xs bg-amber-500">
                    Decisión pendiente
                  </Badge>
                )}
                {isStale && (
                  <Badge variant="outline" className="text-xs text-warning border-warning/50 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Sin actualización {minutesSinceUpdate}m
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {isAwaitingDecision ? 'Casos similares encontrados - decide si crear nuevo o fusionar' : phaseLabel}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full sm:w-32">
            <Progress value={job.progress_percentage} className="h-2" />
          </div>

          {/* Reconnect button */}
          <Button 
            size="sm" 
            onClick={onReconnect}
            className={`gap-2 shrink-0 ${isAwaitingDecision ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            {isAwaitingDecision ? (
              <>
                <GitMerge className="h-4 w-4" />
                Decidir
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ver progreso
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
