import React from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, User, FileText, Settings, Trash2, UserPlus, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from '@tanstack/react-query';

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  INVITE_USER: { label: 'Invitación enviada', icon: UserPlus, color: 'text-blue-500' },
  DELETE_USER: { label: 'Usuario eliminado', icon: Trash2, color: 'text-red-500' },
  CHANGE_ROLE: { label: 'Rol cambiado', icon: Shield, color: 'text-orange-500' },
  UPDATE_PROFILE: { label: 'Perfil actualizado', icon: User, color: 'text-green-500' },
  EXPORT_DATA: { label: 'Datos exportados', icon: FileText, color: 'text-purple-500' },
  SYNC_EXTERNAL: { label: 'Sincronización externa', icon: Settings, color: 'text-cyan-500' },
};

export const AuditLogSection: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action,
          entity_type,
          entity_id,
          details,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      // Get user profiles for the logs
      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))];
      const { data: profiles } = await externalSupabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      return (data || []).map(log => ({
        ...log,
        user_name: profilesMap.get(log.user_id) || 'Usuario desconocido',
      }));
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionInfo = (action: string) => {
    return ACTION_LABELS[action] || { label: action, icon: History, color: 'text-muted-foreground' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Log de Auditoría
        </CardTitle>
        <CardDescription>
          Historial de acciones importantes del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const actionInfo = getActionInfo(log.action);
                  const ActionIcon = actionInfo.icon;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {log.user_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ActionIcon className={`w-4 h-4 ${actionInfo.color}`} />
                          <span className="text-sm">{actionInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay registros de auditoría
          </p>
        )}
      </CardContent>
    </Card>
  );
};
