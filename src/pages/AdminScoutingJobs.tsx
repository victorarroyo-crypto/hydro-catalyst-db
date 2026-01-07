import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileText,
  Loader2,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useScoutingJobs,
  useScoutingJobStats,
  useForceCloseJob,
  useCloseZombieJobs,
  useScoutingJobLogs,
  ScoutingJob,
} from '@/hooks/useScoutingJobs';

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const StatusBadge: React.FC<{ status: string; isZombie: boolean }> = ({ status, isZombie }) => {
  if (isZombie) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        🧟 Zombie
      </Badge>
    );
  }

  switch (status) {
    case 'running':
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completado
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Fallido
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning';
}> = ({ title, value, icon, variant = 'default' }) => {
  const bgColors = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10',
    error: 'bg-destructive/10',
    warning: 'bg-yellow-500/10',
  };

  return (
    <Card className={bgColors[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

const JobDetailsModal: React.FC<{
  job: ScoutingJob | null;
  open: boolean;
  onClose: () => void;
}> = ({ job, open, onClose }) => {
  const { data: logs, isLoading: logsLoading } = useScoutingJobLogs(job?.session_id || null);

  if (!job) return null;

  const config = job.config as { config?: Record<string, unknown>; llm?: string; trigger_type?: string; triggered_by?: string } | null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Detalles del Job</DialogTitle>
          <DialogDescription>ID: {job.id}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <StatusBadge status={job.status} isZombie={job.is_zombie} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fase actual</p>
                <p className="font-medium">{job.current_phase || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Iniciado</p>
                <p className="font-medium">
                  {format(new Date(job.started_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duración</p>
                <p className="font-medium">{formatDuration(job.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tecnologías encontradas</p>
                <p className="font-medium">{job.technologies_found || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progreso</p>
                <p className="font-medium">{job.progress_percentage || 0}%</p>
              </div>
            </div>

            {job.error_message && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-sm font-medium text-destructive">Error:</p>
                <p className="text-sm">{job.error_message}</p>
              </div>
            )}

            {config && (
              <div>
                <p className="text-sm font-medium mb-2">Configuración:</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Logs ({logs?.length || 0})</p>
              {logsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : logs && logs.length > 0 ? (
                <div className="bg-muted/50 rounded-lg p-2 max-h-60 overflow-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`text-xs py-1 border-b border-border/50 last:border-0 ${
                        log.level === 'error' ? 'text-destructive' : ''
                      }`}
                    >
                      <span className="text-muted-foreground">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>{' '}
                      <span className="font-medium">[{log.phase || 'general'}]</span> {log.message}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay logs disponibles</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ForceCloseDialog: React.FC<{
  job: ScoutingJob | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}> = ({ job, open, onClose, onConfirm, isLoading }) => {
  if (!job) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Forzar cierre de este job?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Esta acción marcará el job como fallido y lo cerrará inmediatamente.</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>Job ID:</strong> {job.id.slice(0, 8)}...</p>
                <p><strong>Estado actual:</strong> {job.status}</p>
                <p>
                  <strong>Última actividad:</strong>{' '}
                  {formatDistanceToNow(new Date(job.last_heartbeat || job.updated_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Forzar Cierre
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default function AdminScoutingJobs() {
  const [selectedJob, setSelectedJob] = useState<ScoutingJob | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data: jobs, isLoading, refetch, isFetching } = useScoutingJobs(50);
  const { data: stats } = useScoutingJobStats();
  const forceCloseMutation = useForceCloseJob();
  const closeZombiesMutation = useCloseZombieJobs();

  const handleRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

  const handleViewDetails = (job: ScoutingJob) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const handleForceClose = (job: ScoutingJob) => {
    setSelectedJob(job);
    setCloseDialogOpen(true);
  };

  const confirmForceClose = () => {
    if (selectedJob) {
      forceCloseMutation.mutate(
        { jobId: selectedJob.id },
        {
          onSuccess: () => {
            setCloseDialogOpen(false);
            setSelectedJob(null);
          },
        }
      );
    }
  };

  const handleCloseAllZombies = () => {
    closeZombiesMutation.mutate(10);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin: Scouting Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Gestión y monitoreo de jobs de scouting
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Zombie Alert */}
      {stats && stats.zombies > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Hay {stats.zombies} job(s) atascado(s)</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Sin actividad por más de 5 minutos</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCloseAllZombies}
              disabled={closeZombiesMutation.isPending}
            >
              {closeZombiesMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Cerrar todos los zombies
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Hoy"
          value={stats?.total || 0}
          icon={<FileText className="w-8 h-8 text-muted-foreground" />}
        />
        <StatsCard
          title="Completados"
          value={stats?.completed || 0}
          icon={<CheckCircle2 className="w-8 h-8 text-green-500" />}
          variant="success"
        />
        <StatsCard
          title="Fallidos"
          value={stats?.failed || 0}
          icon={<XCircle className="w-8 h-8 text-destructive" />}
          variant="error"
        />
        <StatsCard
          title="Zombies"
          value={stats?.zombies || 0}
          icon={<AlertTriangle className="w-8 h-8 text-yellow-500" />}
          variant={stats?.zombies ? 'warning' : 'default'}
        />
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Iniciado</TableHead>
                  <TableHead>Heartbeat</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Techs</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={job.is_zombie ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-mono text-sm">
                      {job.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} isZombie={job.is_zombie} />
                    </TableCell>
                    <TableCell className="text-sm">{job.current_phase || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(job.started_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {job.last_heartbeat
                        ? formatDistanceToNow(new Date(job.last_heartbeat), {
                            addSuffix: true,
                            locale: es,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(job.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-sm">{job.technologies_found || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(job)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {job.status === 'running' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleForceClose(job)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay jobs de scouting registrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Last Update */}
      <p className="text-xs text-muted-foreground text-center">
        Última actualización:{' '}
        {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: es })} • Auto-refresh cada 30s
      </p>

      {/* Modals */}
      <JobDetailsModal
        job={selectedJob}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
      <ForceCloseDialog
        job={selectedJob}
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={confirmForceClose}
        isLoading={forceCloseMutation.isPending}
      />
    </div>
  );
}
