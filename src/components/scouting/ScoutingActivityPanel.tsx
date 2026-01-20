import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Search,
  FileText,
  Sparkles,
  ChevronDown,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { extractSessionMetrics } from '@/lib/scoutingMetrics';

interface ActivityTimelineItem {
  timestamp: string;
  message: string;
  type?: string;
  site?: string;
  tech_name?: string;
}

interface ScoutingSession {
  id: string;
  session_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  current_phase: string | null;
  current_activity?: string | null;
  current_site?: string | null;
  phase_details?: Record<string, unknown> | null;
  activity_timeline?: ActivityTimelineItem[] | null;
  progress_percentage: number;
  sites_examined: number;
  technologies_found: number;
  technologies_discarded: number;
  technologies_approved: number;
  config: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  error_message: string | null;
  updated_at: string;
}

interface ScoutingLog {
  id: string;
  session_id: string;
  timestamp: string;
  level: string;
  phase: string | null;
  message: string;
  details: Record<string, unknown> | null;
}

interface ScoutingActivityPanelProps {
  session: ScoutingSession;
  logs: ScoutingLog[];
  showLogs?: boolean;
  realTechCount?: number;
}

const phaseConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  init: { label: 'Inicializando', icon: Zap, color: 'text-gray-500' },
  initialization: { label: 'Inicializando', icon: Zap, color: 'text-gray-500' },
  analyzing: { label: 'Analizando BD', icon: Search, color: 'text-blue-500' },
  researching: { label: 'Investigando', icon: Globe, color: 'text-cyan-500' },
  validating: { label: 'Validando', icon: Target, color: 'text-purple-500' },
  extracting: { label: 'Extrayendo', icon: FileText, color: 'text-orange-500' },
  evaluating: { label: 'Evaluando', icon: Sparkles, color: 'text-yellow-500' },
  completing: { label: 'Finalizando', icon: CheckCircle2, color: 'text-green-500' },
  completed: { label: 'Completado', icon: CheckCircle2, color: 'text-green-600' },
  failed: { label: 'Fallido', icon: XCircle, color: 'text-red-500' },
};

const getActivityIcon = (message: string) => {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('🔍') || lowerMsg.includes('busca') || lowerMsg.includes('google')) return Search;
  if (lowerMsg.includes('📄') || lowerMsg.includes('analiza') || lowerMsg.includes('sitio')) return Globe;
  if (lowerMsg.includes('✅') || lowerMsg.includes('encontr') || lowerMsg.includes('guard')) return CheckCircle2;
  if (lowerMsg.includes('❌') || lowerMsg.includes('descar')) return XCircle;
  if (lowerMsg.includes('🤖') || lowerMsg.includes('ia') || lowerMsg.includes('extrae')) return Sparkles;
  return Activity;
};

const getActivityColor = (message: string) => {
  if (message.includes('✅') || message.includes('encontr') || message.includes('guard')) return 'text-green-600';
  if (message.includes('❌') || message.includes('descar') || message.includes('error')) return 'text-red-500';
  if (message.includes('⚠') || message.includes('warning')) return 'text-yellow-600';
  return 'text-foreground';
};

export default function ScoutingActivityPanel({ 
  session, 
  logs,
  showLogs = true,
  realTechCount
}: ScoutingActivityPanelProps) {
  const [logsExpanded, setLogsExpanded] = React.useState(false);
  
  // Use unified metrics extraction
  const metrics = extractSessionMetrics(session, realTechCount);
  
  const currentPhaseConfig = phaseConfig[session.current_phase || 'init'] || phaseConfig.init;
  const PhaseIcon = currentPhaseConfig.icon;
  
  // Extract phase details from session
  const phaseDetails = session.phase_details as Record<string, unknown> | null;
  const phaseIndex = (phaseDetails?.phase_index as number) ?? 0;
  const totalPhases = (phaseDetails?.total_phases as number) ?? 7;
  const currentAgent = (phaseDetails?.current_agent as string) || '';
  const elapsedSeconds = (phaseDetails?.elapsed_seconds as number) ?? 0;
  
  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Generate timeline from logs or activity_timeline
  const timeline = useMemo(() => {
    // Prefer activity_timeline if available
    if (session.activity_timeline && session.activity_timeline.length > 0) {
      return session.activity_timeline.slice(0, 15);
    }
    
    // Fall back to extracting from logs
    const activityLogs = logs
      .filter(log => {
        // Filter to meaningful activities
        const msg = log.message.toLowerCase();
        return (
          msg.includes('tecnología') ||
          msg.includes('sitio') ||
          msg.includes('busca') ||
          msg.includes('analiz') ||
          msg.includes('encontr') ||
          msg.includes('descar') ||
          msg.includes('guard') ||
          msg.includes('🔍') ||
          msg.includes('📄') ||
          msg.includes('✅') ||
          msg.includes('❌') ||
          log.phase === 'technology_found' ||
          log.phase === 'technology_discarded'
        );
      })
      .slice(0, 15)
      .map(log => ({
        timestamp: log.timestamp,
        message: log.message,
        type: log.phase || undefined,
        site: log.details?.site as string | undefined,
        tech_name: log.details?.technology_name as string | undefined,
      }));
    
    return activityLogs;
  }, [session.activity_timeline, logs]);
  
  // Current activity from session or latest log
  const currentActivity = session.current_activity || 
    (logs[0]?.message && session.status === 'running' ? logs[0].message : null);
  
  const isRunning = session.status === 'running';
  
  return (
    <div className="space-y-4">
      {/* Current Phase & Progress */}
      <Card className={`border-2 ${isRunning ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
        <CardContent className="pt-4">
          {/* Agent & Phase Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PhaseIcon className={`w-5 h-5 ${currentPhaseConfig.color} ${isRunning ? 'animate-pulse' : ''}`} />
              <div>
                <span className="font-medium">{currentPhaseConfig.label}</span>
                {currentAgent && isRunning && (
                  <p className="text-xs text-muted-foreground">
                    Agente: <span className="font-medium text-primary">{currentAgent}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge variant={isRunning ? 'default' : 'secondary'}>
                {session.progress_percentage}%
              </Badge>
              {isRunning && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fase {phaseIndex + 1}/{totalPhases}
                </p>
              )}
            </div>
          </div>
          
          {/* Progress Bar with Phase Markers */}
          <div className="relative mb-3">
            <Progress 
              value={session.progress_percentage} 
              className="h-2" 
            />
            {isRunning && (
              <div className="flex justify-between mt-1">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < phaseIndex ? 'bg-primary' : 
                      i === phaseIndex ? 'bg-primary animate-pulse' : 
                      'bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Elapsed Time */}
          {isRunning && elapsedSeconds > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              <span>Tiempo: {formatElapsed(elapsedSeconds)}</span>
            </div>
          )}
          
          {/* Current Activity */}
          {currentActivity && isRunning && (
            <div className="p-3 bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Actividad actual:</p>
              <p className={`text-sm font-medium ${getActivityColor(currentActivity)}`}>
                {currentActivity}
              </p>
              {session.current_site && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {session.current_site}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid - Using unified metrics */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {metrics.sitesExamined}
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Sitios</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-600" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                {metrics.technologiesFound}
              </span>
              {metrics.isVerifiedCount && (
                <span className="text-xs text-green-500" title="Conteo verificado en cola">✓</span>
              )}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {metrics.isVerifiedCount ? 'En cola' : 'Encontradas'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                {metrics.technologiesDiscarded}
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Descartadas</p>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {metrics.technologiesApproved}
              </span>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Aprobadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Timeline de Actividad
          </CardTitle>
          <CardDescription>Últimas acciones del bot</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            {timeline.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Esperando actividad...</p>
                <p className="text-xs mt-1">Las actividades aparecerán aquí en tiempo real</p>
              </div>
            ) : (
              <div className="divide-y">
                {timeline.map((item, index) => {
                  const ActivityIcon = getActivityIcon(item.message);
                  return (
                    <div key={index} className="px-4 py-2 flex items-start gap-3 hover:bg-muted/30">
                      <div className="flex-shrink-0 mt-0.5">
                        <ActivityIcon className={`w-4 h-4 ${getActivityColor(item.message)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${getActivityColor(item.message)}`}>
                          {item.message}
                        </p>
                        {item.tech_name && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.tech_name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(item.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Collapsible Raw Logs */}
      {showLogs && (
        <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Ver logs técnicos ({logs.length})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${logsExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <ScrollArea className="h-[200px]">
                <div className="divide-y text-xs font-mono">
                  {logs.slice(0, 50).map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-2 ${
                        log.level === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
                        log.level === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                        ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`uppercase font-bold ${
                          log.level === 'error' ? 'text-red-600' :
                          log.level === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          [{log.level}]
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1">
                          {log.phase || 'general'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{log.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Session Info Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Iniciada: {format(new Date(session.started_at), "d MMM HH:mm", { locale: es })}
        </span>
        <span>
          Última actualización: {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  );
}
