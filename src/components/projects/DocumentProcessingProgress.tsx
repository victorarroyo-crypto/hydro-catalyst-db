import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  Scissors,
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock
} from 'lucide-react';
import type { DocumentProcessingState, DocumentProcessingStatus } from '@/types/documentProcessing';
import { PROCESSING_STAGES } from '@/types/documentProcessing';

interface DocumentProcessingProgressProps {
  status: DocumentProcessingState;
  showDetails?: boolean;
  compact?: boolean;
}

const STAGE_ICONS: Record<DocumentProcessingStatus, React.ReactNode> = {
  pending: <Clock className="h-5 w-5" />,
  processing: <FileText className="h-5 w-5" />,
  chunking: <Scissors className="h-5 w-5" />,
  embedding: <Sparkles className="h-5 w-5" />,
  extracting_entities: <Brain className="h-5 w-5" />,
  completed: <CheckCircle2 className="h-5 w-5" />,
  failed: <XCircle className="h-5 w-5" />,
};

const STAGE_COLORS: Record<DocumentProcessingStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chunking: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  embedding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  extracting_entities: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function DocumentProcessingProgress({
  status,
  showDetails = true,
  compact = false
}: DocumentProcessingProgressProps) {
  const stageInfo = PROCESSING_STAGES[status.stage] || PROCESSING_STAGES.pending;
  const isProcessing = !['completed', 'failed', 'pending'].includes(status.status);

  // Use the API progress if available, otherwise use stage-based percentage
  const progressValue = status.progress > 0 ? status.progress : stageInfo.percentage;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-full ${STAGE_COLORS[status.stage]}`}>
          {isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="h-3 w-3">{STAGE_ICONS[status.stage]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Progress value={progressValue} className="h-1.5" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {stageInfo.label}
        </span>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        {/* Header con icono y estado */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${STAGE_COLORS[status.stage]}`}>
              {STAGE_ICONS[status.stage]}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium truncate" title={status.filename}>
                {status.filename}
              </h4>
              <p className="text-sm text-muted-foreground">
                {stageInfo.description}
              </p>
            </div>
          </div>

          <Badge className={STAGE_COLORS[status.stage]} variant="secondary">
            {isProcessing && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            {stageInfo.label}
          </Badge>
        </div>

        {/* Barra de progreso */}
        <Progress value={progressValue} className="h-2" />

        {/* Métricas (si showDetails) */}
        {showDetails && status.status !== 'pending' && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {status.chunks_created > 0 && (
              <div className="flex items-center gap-1.5">
                <Scissors className="h-4 w-4" />
                <span>{status.chunks_created} chunks</span>
              </div>
            )}
            {status.embeddings_generated > 0 && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span>{status.embeddings_generated} embeddings</span>
              </div>
            )}
            {status.entities_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Brain className="h-4 w-4" />
                <span>{status.entities_count} entidades</span>
              </div>
            )}
          </div>
        )}

        {/* Error si falló */}
        {status.status === 'failed' && status.error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {status.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
