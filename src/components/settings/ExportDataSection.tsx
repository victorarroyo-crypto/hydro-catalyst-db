import React, { useState } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileJson } from 'lucide-react';

export const ExportDataSection: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      // Fetch user's data
      const [profileData, favoritesData, projectsData] = await Promise.all([
        externalSupabase.from('profiles').select('*').eq('user_id', user.id).single(),
        externalSupabase.from('user_favorites').select('*, technologies(*)').eq('user_id', user.id),
        externalSupabase.from('projects').select('*').eq('created_by', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: profileData.data,
        favorites: favoritesData.data,
        projects: projectsData.data,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vandarum-mis-datos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the action
      await externalSupabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'EXPORT_DATA',
        entity_type: 'user_data',
        details: { format: 'json' },
      });

      toast({
        title: 'Datos exportados',
        description: 'Tu archivo de datos se ha descargado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error al exportar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Exportar Mis Datos
        </CardTitle>
        <CardDescription>
          Descarga una copia de todos tus datos personales (RGPD)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
          <FileJson className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Tu paquete de datos incluye:</p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• Información de tu perfil</li>
              <li>• Tus favoritos guardados</li>
              <li>• Proyectos que has creado</li>
            </ul>
          </div>
        </div>
        
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          variant="outline"
          className="w-full"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isExporting ? 'Exportando...' : 'Descargar mis datos (JSON)'}
        </Button>
      </CardContent>
    </Card>
  );
};
