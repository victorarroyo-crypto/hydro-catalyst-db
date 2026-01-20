import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  Globe, 
  Search, 
  Settings2,
  ArrowRight,
  AlertTriangle,
  Database,
  Copy,
  FileText
} from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import { extractSessionMetrics } from '@/lib/scoutingMetrics';

interface ScoutingSession {
  id: string;
  session_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  current_phase: string | null;
  progress_percentage: number;
  sites_examined: number;
  technologies_found: number;
  technologies_discarded: number;
  technologies_approved: number;
  config: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  error_message: string | null;
}

interface ScoutingSummaryCardProps {
  session: ScoutingSession;
  realTechCount?: number; // Actual count from scouting_queue by scouting_job_id
}

export const ScoutingSummaryCard: React.FC<ScoutingSummaryCardProps> = ({ 
  session, 
  realTechCount 
}) => {
  const config = session.config as Record<string, unknown> | null;

  // Use unified metrics extraction
  const metrics = extractSessionMetrics(session, realTechCount);

  const modelUsed = ((session.summary as Record<string, unknown>)?.model as string) ?? 
    (config?.model as string) ?? 
    'No especificado';

  // Calculate duration
  const getDuration = () => {
    if (!session.completed_at) return null;
    const start = new Date(session.started_at);
    const end = new Date(session.completed_at);
    const totalSeconds = differenceInSeconds(end, start);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} minutos ${seconds} segundos`;
  };

  // Extract config info
  const keywords = (config?.keywords as string) ?? 
    (config?.search_keywords as string) ?? 
    (config?.query as string) ?? '';
  
  const searchType = (config?.type as string) ?? 
    (config?.search_type as string) ?? '';

  const isCompleted = session.status === 'completed';
  const isFailed = session.status === 'failed';
  const duration = getDuration();

  return (
    <div className="space-y-4">
      {/* Main Summary Card */}
      <Card className={`border-2 ${
        isCompleted ? 'border-green-200 bg-green-50/30 dark:bg-green-950/10' : 
        isFailed ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10' : 
        'border-muted'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-700 dark:text-green-400">Scouting Completado</span>
              </>
            ) : isFailed ? (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 dark:text-red-400">Scouting Fallido</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Sesión en Curso</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background rounded-lg border">
              <Search className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold">{metrics.sitesExamined}</div>
              <div className="text-xs text-muted-foreground">Fuentes visitadas</div>
            </div>
            
            <div className="text-center p-3 bg-background rounded-lg border">
              <Cpu className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{metrics.technologiesFound}</div>
              <div className="text-xs text-muted-foreground">En cola de revisión</div>
            </div>
            
            <div className="text-center p-3 bg-background rounded-lg border">
              <Copy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{metrics.duplicatesSkipped}</div>
              <div className="text-xs text-muted-foreground">Duplicadas omitidas</div>
            </div>
            
            <div className="text-center p-3 bg-background rounded-lg border">
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${metrics.errorsCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <div className={`text-2xl font-bold ${metrics.errorsCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.errorsCount}
              </div>
              <div className="text-xs text-muted-foreground">Errores</div>
            </div>
          </div>

          {/* Duration and Model */}
          <div className="flex flex-wrap gap-4 text-sm">
            {duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium">{duration}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Modelo:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {modelUsed}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Action Link */}
          {metrics.technologiesFound > 0 && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span className="text-sm">
                  <strong>{metrics.technologiesFound}</strong> tecnología{metrics.technologiesFound !== 1 ? 's' : ''} disponible{metrics.technologiesFound !== 1 ? 's' : ''} para revisar
                </span>
              </div>
              <Button asChild size="sm" className="gap-1">
                <Link to={`/scouting?session=${session.session_id}`}>
                  Ver en cola
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}

          {/* No results message */}
          {metrics.technologiesFound === 0 && isCompleted && (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron nuevas tecnologías en esta sesión</p>
            </div>
          )}

          {/* Error message */}
          {isFailed && session.error_message && (
            <div className="bg-red-100 dark:bg-red-950/30 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700 dark:text-red-400">Error</div>
                  <div className="text-sm text-red-600 dark:text-red-300">
                    {session.error_message}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Card */}
      {keywords && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configuración de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Keywords</div>
              <div className="text-sm font-medium bg-muted px-3 py-2 rounded">
                "{keywords}"
              </div>
            </div>
            {searchType && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Tipo de búsqueda</div>
                <Badge variant="secondary">{searchType}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Raw Summary (collapsible for debugging) */}
      {session.summary && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver datos completos (JSON)
          </summary>
          <pre className="mt-2 bg-muted p-3 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(session.summary, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
