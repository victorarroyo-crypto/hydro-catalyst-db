import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Shield, Calendar, Tag, ArrowRight, Settings as SettingsIcon, CloudUpload, Loader2, Database, GitCompare, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ComparisonResult {
  table: string;
  localCount: number;
  externalCount: number;
  difference: number;
  status: 'synced' | 'out_of_sync' | 'error';
  missingInExternal?: string[];
  missingInLocal?: string[];
}

interface ComparisonResponse {
  success: boolean;
  summary: {
    totalTables: number;
    syncedTables: number;
    outOfSyncTables: number;
    errorTables: number;
    timestamp: string;
  };
  results: ComparisonResult[];
}

const Settings: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResponse | null>(null);

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-sync-to-external', {
        body: {},
      });

      if (error) throw error;

      const results = data.results || {};
      const totalSynced = Object.values(results).reduce((sum: number, r: any) => sum + (r.synced || 0), 0);
      const hasErrors = Object.values(results).some((r: any) => r.errors?.length > 0);

      toast({
        title: hasErrors ? 'Sincronización con advertencias' : 'Sincronización completada',
        description: `Total sincronizado: ${totalSynced} registros
• Tecnologías: ${results.technologies?.synced || 0}
• Casos de Estudio: ${results.casos_de_estudio?.synced || 0}
• Tendencias: ${results.technological_trends?.synced || 0}
• Proyectos: ${results.projects?.synced || 0}
• Taxonomías: ${(results.taxonomy_tipos?.synced || 0) + (results.taxonomy_subcategorias?.synced || 0) + (results.taxonomy_sectores?.synced || 0)}`,
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Error de sincronización',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleCompareDBs = async () => {
    setIsComparing(true);
    setComparisonResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('compare-databases', {
        body: { detailed: true },
      });

      if (error) throw error;

      setComparisonResults(data as ComparisonResponse);

      const allSynced = data.summary.outOfSyncTables === 0 && data.summary.errorTables === 0;

      toast({
        title: allSynced ? 'Bases de datos sincronizadas' : 'Diferencias encontradas',
        description: `${data.summary.syncedTables}/${data.summary.totalTables} tablas sincronizadas`,
        variant: allSynced ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Error al comparar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu perfil y preferencias
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del perfil
            </CardTitle>
            <CardDescription>
              Tu información personal en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={profile?.full_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize">
                  {profile?.role?.replace('_', ' ') || 'Usuario'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Miembro desde</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '—'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sincronización Externa
                </CardTitle>
                <CardDescription>
                  Sincroniza todos los datos con la base de datos externa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleBulkSync}
                  disabled={isBulkSyncing}
                  className="w-full"
                >
                  {isBulkSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4 mr-2" />
                  )}
                  {isBulkSyncing ? 'Sincronizando todo...' : 'Sincronizar TODO a Supabase externo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Sincroniza tecnologías, casos de estudio, tendencias, proyectos y taxonomías
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Comparar Bases de Datos
                </CardTitle>
                <CardDescription>
                  Verifica que los datos estén sincronizados entre ambas bases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCompareDBs}
                  disabled={isComparing}
                  variant="outline"
                  className="w-full"
                >
                  {isComparing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitCompare className="w-4 h-4 mr-2" />
                  )}
                  {isComparing ? 'Comparando...' : 'Comparar bases de datos'}
                </Button>

                {comparisonResults && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Última comparación:</span>
                      <span className="text-xs">
                        {new Date(comparisonResults.summary.timestamp).toLocaleString('es-ES')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {comparisonResults.results.map((result) => (
                        <div 
                          key={result.table} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'synced' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {result.status === 'out_of_sync' && (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            {result.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-sm">{result.table}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Local: {result.localCount}</span>
                            <span>Externa: {result.externalCount}</span>
                            {result.difference > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Δ {result.difference}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {comparisonResults.summary.outOfSyncTables > 0 && (
                      <p className="text-xs text-yellow-600">
                        Hay tablas desincronizadas. Considera ejecutar una sincronización completa.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Administración
                </CardTitle>
                <CardDescription>
                  Herramientas de administración del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/taxonomy-admin">
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Gestión de Taxonomía
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
