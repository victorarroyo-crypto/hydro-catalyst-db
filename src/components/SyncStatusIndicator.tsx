import React, { useEffect, useState } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncEvent {
  table: string;
  action: string;
  timestamp: Date;
}

export const SyncStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<SyncEvent | null>(null);
  const [recentSyncs, setRecentSyncs] = useState<number>(0);

  useEffect(() => {
    // Listen to real-time changes on synced tables
    const channel = externalSupabase
      .channel('sync-status-indicator')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'technologies' },
        (payload) => handleSyncEvent('technologies', payload.eventType)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casos_de_estudio' },
        (payload) => handleSyncEvent('casos_de_estudio', payload.eventType)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'technological_trends' },
        (payload) => handleSyncEvent('technological_trends', payload.eventType)
      )
      .subscribe();

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, []);

  const handleSyncEvent = (table: string, action: string) => {
    setStatus('syncing');
    setLastSync({ table, action, timestamp: new Date() });
    setRecentSyncs(prev => prev + 1);

    // After 2 seconds, show success
    setTimeout(() => {
      setStatus('success');
      // After another 3 seconds, go back to idle
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }, 2000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <CloudOff className="w-4 h-4 text-destructive" />;
      default:
        return <Cloud className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return 'Sincronizado';
      case 'error':
        return 'Error de sincronización';
      default:
        return 'Sincronización activa';
    }
  };

  const getTableName = (table: string) => {
    const names: Record<string, string> = {
      technologies: 'Tecnologías',
      casos_de_estudio: 'Casos de Estudio',
      technological_trends: 'Tendencias',
    };
    return names[table] || table;
  };

  const getActionName = (action: string) => {
    const names: Record<string, string> = {
      INSERT: 'agregado',
      UPDATE: 'actualizado',
      DELETE: 'eliminado',
    };
    return names[action] || action;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300',
              status === 'syncing' && 'bg-primary/10 text-primary',
              status === 'success' && 'bg-green-500/10 text-green-600',
              status === 'error' && 'bg-destructive/10 text-destructive',
              status === 'idle' && 'bg-muted text-muted-foreground'
            )}
          >
            {getStatusIcon()}
            <span className="hidden sm:inline">{getStatusText()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Sincronización con BD Externa</p>
            {lastSync ? (
              <p className="text-xs text-muted-foreground">
                Último: {getTableName(lastSync.table)} {getActionName(lastSync.action)}
                <br />
                {lastSync.timestamp.toLocaleTimeString('es-ES')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Los cambios se sincronizan automáticamente
              </p>
            )}
            {recentSyncs > 0 && (
              <p className="text-xs text-muted-foreground">
                {recentSyncs} sincronizaciones en esta sesión
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
