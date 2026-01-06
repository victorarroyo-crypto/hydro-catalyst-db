import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Globe, 
  Cpu, 
  AlertTriangle,
  RefreshCw,
  Play,
  Eye,
  Bell,
  BellRing,
  Zap,
  Ban,
  Timer,
  RotateCcw,
  X
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';

// Alert thresholds
const HEARTBEAT_WARNING_MS = 2 * 60 * 1000; // 2 minutes
const HEARTBEAT_CRITICAL_MS = 4 * 60 * 1000; // 4 minutes

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
  created_at: string;
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
  created_at: string;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'stuck_job' | 'rate_limit' | 'model_change' | 'repeated_errors' | 'api_error' | 'quota_warning';
  title: string;
  message: string;
  sessionId?: string;
  timestamp: Date;
  dismissed?: boolean;
}

const statusConfig = {
  running: { label: 'En Ejecución', color: 'bg-blue-500', icon: Activity },
  completed: { label: 'Completado', color: 'bg-green-500', icon: CheckCircle2 },
  failed: { label: 'Fallido', color: 'bg-red-500', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-500', icon: Clock },
};

const logLevelConfig = {
  debug: { color: 'text-gray-400', bg: 'bg-gray-100' },
  info: { color: 'text-blue-600', bg: 'bg-blue-50' },
  warning: { color: 'text-yellow-600', bg: 'bg-yellow-50' },
  error: { color: 'text-red-600', bg: 'bg-red-50' },
};

const alertIcons = {
  stuck_job: Timer,
  rate_limit: Ban,
  model_change: RotateCcw,
  repeated_errors: AlertTriangle,
  api_error: Zap,
  quota_warning: Bell,
};

export default function ScoutingMonitor() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 10 seconds for heartbeat checking
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch sessions
  const { data: sessions, isLoading: loadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['scouting-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouting_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ScoutingSession[];
    },
  });

  // Fetch scouting queue counts
  const { data: queueCounts } = useQuery({
    queryKey: ['scouting-queue-counts-monitor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouting_queue')
        .select('queue_status');
      
      if (error) throw error;
      
      const counts = {
        total: data?.length || 0,
        pending: data?.filter(d => d.queue_status === 'pending').length || 0,
        review: data?.filter(d => d.queue_status === 'review').length || 0,
        pending_approval: data?.filter(d => d.queue_status === 'pending_approval').length || 0,
      };
      return counts;
    },
    refetchInterval: 30000,
  });

  // Fetch all recent logs for alert detection
  const { data: allRecentLogs } = useQuery({
    queryKey: ['scouting-logs-all-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouting_session_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as ScoutingLog[];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch logs for selected session
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['scouting-logs', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from('scouting_session_logs')
        .select('*')
        .eq('session_id', selectedSession)
        .order('timestamp', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as ScoutingLog[];
    },
    enabled: !!selectedSession,
  });

  // Generate system alerts based on sessions and logs
  const systemAlerts = useMemo((): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    
    // Check for stuck jobs (no heartbeat)
    sessions?.filter(s => s.status === 'running').forEach(session => {
      const lastUpdate = new Date(session.updated_at);
      const timeSinceUpdate = currentTime.getTime() - lastUpdate.getTime();
      
      if (timeSinceUpdate > HEARTBEAT_CRITICAL_MS) {
        alerts.push({
          id: `stuck-critical-${session.session_id}`,
          type: 'critical',
          category: 'stuck_job',
          title: 'Job probablemente atascado',
          message: `Sesión ${session.session_id.slice(0, 8)} sin actividad por ${Math.floor(timeSinceUpdate / 60000)} minutos. Fase: ${session.current_phase || 'desconocida'}`,
          sessionId: session.session_id,
          timestamp: new Date(),
        });
      } else if (timeSinceUpdate > HEARTBEAT_WARNING_MS) {
        alerts.push({
          id: `stuck-warning-${session.session_id}`,
          type: 'warning',
          category: 'stuck_job',
          title: 'Posible retraso detectado',
          message: `Sesión ${session.session_id.slice(0, 8)} sin actualización por ${Math.floor(timeSinceUpdate / 60000)} minutos`,
          sessionId: session.session_id,
          timestamp: new Date(),
        });
      }
    });

    // Analyze logs for patterns
    if (allRecentLogs) {
      // Check for rate limiting
      const rateLimitLogs = allRecentLogs.filter(log => 
        log.message.toLowerCase().includes('rate limit') ||
        log.message.toLowerCase().includes('429') ||
        log.message.toLowerCase().includes('too many requests') ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes('rate limit'))
      );
      
      if (rateLimitLogs.length > 0) {
        const recentRateLimit = rateLimitLogs[0];
        alerts.push({
          id: `rate-limit-${recentRateLimit.id}`,
          type: 'warning',
          category: 'rate_limit',
          title: 'Rate limiting detectado',
          message: `API reportó límite de velocidad. Última ocurrencia: ${format(new Date(recentRateLimit.timestamp), 'HH:mm:ss')}`,
          sessionId: recentRateLimit.session_id,
          timestamp: new Date(recentRateLimit.timestamp),
        });
      }

      // Check for model changes
      const modelChangeLogs = allRecentLogs.filter(log =>
        log.message.toLowerCase().includes('model change') ||
        log.message.toLowerCase().includes('fallback model') ||
        log.message.toLowerCase().includes('switching model') ||
        log.message.toLowerCase().includes('cambio de modelo') ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes('model_fallback'))
      );

      if (modelChangeLogs.length > 0) {
        const recentModelChange = modelChangeLogs[0];
        alerts.push({
          id: `model-change-${recentModelChange.id}`,
          type: 'info',
          category: 'model_change',
          title: 'Cambio de modelo LLM',
          message: recentModelChange.message,
          sessionId: recentModelChange.session_id,
          timestamp: new Date(recentModelChange.timestamp),
        });
      }

      // Check for repeated errors (3+ errors in last 5 minutes from same session)
      const recentErrors = allRecentLogs.filter(log => 
        log.level === 'error' &&
        differenceInMinutes(currentTime, new Date(log.timestamp)) <= 5
      );

      const errorsBySession = recentErrors.reduce((acc, log) => {
        acc[log.session_id] = (acc[log.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(errorsBySession).forEach(([sessionId, count]) => {
        if (count >= 3) {
          alerts.push({
            id: `repeated-errors-${sessionId}`,
            type: 'critical',
            category: 'repeated_errors',
            title: 'Errores repetidos',
            message: `${count} errores en los últimos 5 minutos para sesión ${sessionId.slice(0, 8)}`,
            sessionId,
            timestamp: new Date(),
          });
        }
      });

      // Check for API errors
      const apiErrorLogs = allRecentLogs.filter(log =>
        log.level === 'error' && (
          log.message.toLowerCase().includes('api error') ||
          log.message.toLowerCase().includes('openai') ||
          log.message.toLowerCase().includes('anthropic') ||
          log.message.toLowerCase().includes('quota') ||
          log.message.toLowerCase().includes('insufficient_quota')
        )
      );

      if (apiErrorLogs.length > 0) {
        const recentApiError = apiErrorLogs[0];
        const isQuotaError = recentApiError.message.toLowerCase().includes('quota');
        
        alerts.push({
          id: `api-error-${recentApiError.id}`,
          type: isQuotaError ? 'critical' : 'warning',
          category: isQuotaError ? 'quota_warning' : 'api_error',
          title: isQuotaError ? 'Cuota de API agotada' : 'Error de API externa',
          message: recentApiError.message,
          sessionId: recentApiError.session_id,
          timestamp: new Date(recentApiError.timestamp),
        });
      }
    }

    // Filter out dismissed alerts and sort by severity
    return alerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .sort((a, b) => {
        const severity = { critical: 0, warning: 1, info: 2 };
        return severity[a.type] - severity[b.type];
      });
  }, [sessions, allRecentLogs, currentTime, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  // Real-time subscription for sessions
  useEffect(() => {
    const channel = supabase
      .channel('scouting-sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scouting_sessions' },
        () => {
          refetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSessions]);

  // Real-time subscription for logs
  useEffect(() => {
    if (!selectedSession) return;

    const channel = supabase
      .channel('scouting-logs-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'scouting_session_logs',
          filter: `session_id=eq.${selectedSession}`
        },
        () => {
          refetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession, refetchLogs]);

  const activeSessions = sessions?.filter(s => s.status === 'running') || [];
  const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
  const failedSessions = sessions?.filter(s => s.status === 'failed') || [];

  const selectedSessionData = sessions?.find(s => s.session_id === selectedSession);

  const criticalAlerts = systemAlerts.filter(a => a.type === 'critical');
  const warningAlerts = systemAlerts.filter(a => a.type === 'warning');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitor de Scouting</h1>
          <p className="text-muted-foreground">
            Seguimiento en tiempo real de las sesiones de scouting automático
          </p>
        </div>
        <div className="flex items-center gap-2">
          {systemAlerts.length > 0 && (
            <Badge variant={criticalAlerts.length > 0 ? "destructive" : "secondary"} className="gap-1">
              <BellRing className="w-3 h-3" />
              {systemAlerts.length} alerta{systemAlerts.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button onClick={() => refetchSessions()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* System Alerts Panel */}
      {systemAlerts.length > 0 && (
        <div className="space-y-2">
          {systemAlerts.map(alert => {
            const AlertIcon = alertIcons[alert.category];
            return (
              <Alert 
                key={alert.id} 
                variant={alert.type === 'critical' ? 'destructive' : 'default'}
                className={`${
                  alert.type === 'critical' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
                    : alert.type === 'warning'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                <AlertIcon className={`h-4 w-4 ${
                  alert.type === 'critical' ? 'text-red-600' :
                  alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                }`} />
                <AlertTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {alert.title}
                    <Badge variant="outline" className="text-xs font-normal">
                      {format(alert.timestamp, 'HH:mm:ss')}
                    </Badge>
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  {alert.sessionId && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs p-0 h-auto"
                      onClick={() => setSelectedSession(alert.sessionId!)}
                    >
                      Ver sesión
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sesiones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{activeSessions.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completadas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">
                {completedSessions.filter(s => 
                  new Date(s.completed_at || '').toDateString() === new Date().toDateString()
                ).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tecnologías Reportadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold">
                {sessions?.reduce((acc, s) => acc + (s.technologies_found || 0), 0) || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Según webhooks recibidos</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              En Cola de Revisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {queueCounts?.total || 0}
              </span>
            </div>
            <a 
              href="/scouting" 
              className="text-xs text-primary underline hover:no-underline mt-1 inline-block"
            >
              Ver cola completa →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sitios Examinados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold">
                {sessions?.reduce((acc, s) => acc + (s.sites_examined || 0), 0) || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Sesiones</CardTitle>
            <CardDescription>
              {sessions?.length || 0} sesiones registradas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loadingSessions ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando sesiones...
                </div>
              ) : sessions?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay sesiones registradas</p>
                  <p className="text-sm mt-2">
                    Las sesiones aparecerán aquí cuando Railway envíe webhooks
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {sessions?.map((session) => {
                    const config = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.running;
                    const StatusIcon = config.icon;
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session.session_id)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedSession === session.session_id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusIcon className={`w-4 h-4 ${
                                session.status === 'running' ? 'text-blue-500 animate-pulse' :
                                session.status === 'completed' ? 'text-green-500' :
                                session.status === 'failed' ? 'text-red-500' : 'text-gray-500'
                              }`} />
                              <span className="font-medium text-sm truncate">
                                {session.session_id.slice(0, 8)}...
                              </span>
                            </div>
                            
                            {session.status === 'running' && (
                              <div className="mb-2">
                                <Progress value={session.progress_percentage} className="h-1.5" />
                                <span className="text-xs text-muted-foreground">
                                  {session.progress_percentage}% - {session.current_phase}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3 h-3" />
                                {session.technologies_found || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {session.sites_examined || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs mb-1">
                              {config.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(session.started_at), { 
                                addSuffix: true, 
                                locale: es 
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details & Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {selectedSession ? `Sesión ${selectedSession.slice(0, 8)}...` : 'Detalles de Sesión'}
            </CardTitle>
            {selectedSessionData && (
              <CardDescription>
                Iniciada {format(new Date(selectedSessionData.started_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedSession ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una sesión para ver los detalles</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="logs" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="logs">Logs en Vivo</TabsTrigger>
                  <TabsTrigger value="metrics">Métricas</TabsTrigger>
                  <TabsTrigger value="summary">Resumen</TabsTrigger>
                </TabsList>

                <TabsContent value="logs">
                  <ScrollArea className="h-[400px] border rounded-lg">
                    {loadingLogs ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Cargando logs...
                      </div>
                    ) : logs?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No hay logs para esta sesión
                      </div>
                    ) : (
                      <div className="divide-y">
                        {logs?.map((log) => {
                          const levelConfig = logLevelConfig[log.level as keyof typeof logLevelConfig] || logLevelConfig.info;
                          
                          return (
                            <div key={log.id} className={`p-3 ${levelConfig.bg}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {log.level === 'error' ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  ) : log.level === 'warning' ? (
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  ) : (
                                    <Activity className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {log.phase || 'general'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${levelConfig.color}`}>
                                    {log.message}
                                  </p>
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <pre className="mt-2 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="metrics">
                  {selectedSessionData && (
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Sitios Examinados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-3xl font-bold">
                            {selectedSessionData.sites_examined || 0}
                          </span>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Tecnologías Encontradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-3xl font-bold text-green-600">
                            {selectedSessionData.technologies_found || 0}
                          </span>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Tecnologías Descartadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-3xl font-bold text-orange-600">
                            {selectedSessionData.technologies_discarded || 0}
                          </span>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Aprobadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-3xl font-bold text-blue-600">
                            {selectedSessionData.technologies_approved || 0}
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="col-span-2">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Progreso</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Progress 
                            value={selectedSessionData.progress_percentage} 
                            className="h-3 mb-2"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Fase: {selectedSessionData.current_phase || 'N/A'}</span>
                            <span>{selectedSessionData.progress_percentage}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="summary">
                  {selectedSessionData?.summary ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Resumen de Ejecución</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                            {JSON.stringify(selectedSessionData.summary, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                      
                      {selectedSessionData.config && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Configuración Utilizada</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                              {JSON.stringify(selectedSessionData.config, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>El resumen estará disponible cuando la sesión complete</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
