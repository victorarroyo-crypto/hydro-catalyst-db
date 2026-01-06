import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Database, 
  ArrowRightLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Upload,
  Loader2,
  FileText,
  Server,
  Cloud
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComparisonResult {
  table: string;
  localCount: number;
  externalCount: number;
  difference: number;
  status: 'synced' | 'out_of_sync' | 'error';
  missingInExternal?: string[];
  missingInLocal?: string[];
}

interface AuditSummary {
  totalTables: number;
  syncedTables: number;
  outOfSyncTables: number;
  errorTables: number;
  timestamp: string;
}

interface AuditResponse {
  success: boolean;
  summary: AuditSummary;
  results: ComparisonResult[];
  error?: string;
}

interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  table: string;
  recordsAffected: number;
  status: 'success' | 'error';
  details?: string;
}

export default function AdminDbAudit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Fetch comparison data
  const { data: auditData, isLoading: isLoadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: ['db-audit-comparison'],
    queryFn: async (): Promise<AuditResponse> => {
      const { data, error } = await supabase.functions.invoke('compare-databases', {
        body: { detailed: true }
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async ({ table, action }: { table: string; action: 'sync_missing' | 'update_modified' | 'sync_all' }) => {
      const { data, error } = await supabase.functions.invoke('sync-databases', {
        body: { table, action }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const log: SyncLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: variables.action,
        table: variables.table,
        recordsAffected: data.recordsAffected || 0,
        status: 'success',
        details: data.message,
      };
      setSyncLogs(prev => [log, ...prev]);
      
      toast({
        title: "Sincronización completada",
        description: `${data.recordsAffected || 0} registros sincronizados en ${variables.table}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['db-audit-comparison'] });
    },
    onError: (error, variables) => {
      const log: SyncLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: variables.action,
        table: variables.table,
        recordsAffected: 0,
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      setSyncLogs(prev => [log, ...prev]);
      
      toast({
        title: "Error de sincronización",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    },
  });

  // Sync all tables
  const handleSyncAll = async () => {
    if (!auditData?.results) return;
    
    const outOfSyncTables = auditData.results.filter(r => r.status === 'out_of_sync');
    if (outOfSyncTables.length === 0) {
      toast({
        title: "Todo sincronizado",
        description: "No hay tablas que necesiten sincronización",
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    for (let i = 0; i < outOfSyncTables.length; i++) {
      const table = outOfSyncTables[i];
      try {
        await syncMutation.mutateAsync({ table: table.table, action: 'sync_missing' });
      } catch (error) {
        console.error(`Error syncing ${table.table}:`, error);
      }
      setSyncProgress(((i + 1) / outOfSyncTables.length) * 100);
    }

    setIsSyncing(false);
    setSyncProgress(0);
    refetchAudit();
  };

  // Export differences to CSV
  const handleExportCSV = () => {
    if (!auditData?.results) return;

    const csvRows = [
      ['Tabla', 'Registros Local', 'Registros Externa', 'Diferencia', 'Estado', 'Faltan en Externa', 'Faltan en Local'],
    ];

    auditData.results.forEach(r => {
      csvRows.push([
        r.table,
        r.localCount.toString(),
        r.externalCount.toString(),
        r.difference.toString(),
        r.status,
        (r.missingInExternal || []).join('; '),
        (r.missingInLocal || []).join('; '),
      ]);
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `db-audit-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exportado",
      description: "El archivo de diferencias se ha descargado",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Sincronizado</Badge>;
      case 'out_of_sync':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Desincronizado</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Auditoría de Bases de Datos</h1>
          <p className="text-muted-foreground mt-2">
            Comparación y sincronización entre BD Interna (Master) y BD Externa (Railway)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => refetchAudit()}
            disabled={isLoadingAudit}
          >
            {isLoadingAudit ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            disabled={!auditData?.results}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={handleSyncAll}
            disabled={isSyncing || isLoadingAudit}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 mr-2" />
            )}
            Sincronizar Todo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Tablas Analizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData?.summary?.totalTables || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sincronizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{auditData?.summary?.syncedTables || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Desincronizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{auditData?.summary?.outOfSyncTables || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Con Errores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{auditData?.summary?.errorTables || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {isSyncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sincronizando tablas...</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cloud className="w-4 h-4 text-primary" />
              BD Interna (Master)
            </CardTitle>
            <CardDescription>Lovable Cloud - Fuente de verdad</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Conectada
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4 text-orange-500" />
              BD Externa (Railway)
            </CardTitle>
            <CardDescription>Backend Python - Sincronización unidireccional</CardDescription>
          </CardHeader>
          <CardContent>
            {auditData?.success ? (
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Conectada
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                <XCircle className="w-3 h-3 mr-1" /> Error de conexión
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Comparación de Tablas</TabsTrigger>
          <TabsTrigger value="details">Detalles por Tabla</TabsTrigger>
          <TabsTrigger value="logs">Logs de Sincronización</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Sincronización</CardTitle>
              <CardDescription>
                Comparación de registros entre BD Interna (Master) y BD Externa
                {auditData?.summary?.timestamp && (
                  <span className="ml-2 text-xs">
                    · Última actualización: {formatDate(auditData.summary.timestamp)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tabla</TableHead>
                      <TableHead className="text-right">BD Interna</TableHead>
                      <TableHead className="text-right">BD Externa</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData?.results?.map((result) => (
                      <TableRow key={result.table}>
                        <TableCell className="font-medium">{result.table}</TableCell>
                        <TableCell className="text-right">{result.localCount}</TableCell>
                        <TableCell className="text-right">{result.externalCount}</TableCell>
                        <TableCell className="text-right">
                          {result.difference > 0 && (
                            <span className="text-yellow-600">+{result.difference}</span>
                          )}
                          {result.difference === 0 && (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell>
                          {result.status === 'out_of_sync' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncMutation.mutate({ table: result.table, action: 'sync_missing' })}
                              disabled={syncMutation.isPending}
                            >
                              {syncMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3 mr-1" />
                              )}
                              Sincronizar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <div className="space-y-4">
            {auditData?.results?.filter(r => r.status === 'out_of_sync').map((result) => (
              <Card key={result.table}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{result.table}</span>
                    {getStatusBadge(result.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-yellow-600">
                        Faltan en BD Externa ({result.missingInExternal?.length || 0})
                      </h4>
                      {result.missingInExternal && result.missingInExternal.length > 0 ? (
                        <ScrollArea className="h-32 rounded border p-2">
                          <ul className="text-xs space-y-1">
                            {result.missingInExternal.map(id => (
                              <li key={id} className="font-mono text-muted-foreground">{id}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ninguno</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-blue-600">
                        Solo en BD Externa ({result.missingInLocal?.length || 0})
                      </h4>
                      {result.missingInLocal && result.missingInLocal.length > 0 ? (
                        <ScrollArea className="h-32 rounded border p-2">
                          <ul className="text-xs space-y-1">
                            {result.missingInLocal.map(id => (
                              <li key={id} className="font-mono text-muted-foreground">{id}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ninguno</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => syncMutation.mutate({ table: result.table, action: 'sync_missing' })}
                      disabled={syncMutation.isPending}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Copiar faltantes a Externa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {auditData?.results?.filter(r => r.status === 'out_of_sync').length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Todo sincronizado</AlertTitle>
                <AlertDescription>
                  No hay diferencias entre las bases de datos.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Historial de Sincronizaciones
              </CardTitle>
              <CardDescription>
                Registro de todas las operaciones de sincronización realizadas en esta sesión
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay logs de sincronización en esta sesión
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Tabla</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{log.table}</TableCell>
                          <TableCell className="text-right">{log.recordsAffected}</TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" /> Éxito
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                                <XCircle className="w-3 h-3 mr-1" /> Error
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>Sincronización Unidireccional</AlertTitle>
        <AlertDescription>
          La BD Interna (Lovable) es la fuente de verdad. Los datos solo se copian desde la interna hacia la externa, nunca al revés.
          Los registros que solo existen en la BD Externa se muestran para referencia pero no se importan automáticamente.
        </AlertDescription>
      </Alert>
    </div>
  );
}
