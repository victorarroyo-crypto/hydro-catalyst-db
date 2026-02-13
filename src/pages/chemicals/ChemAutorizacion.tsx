import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileDown, FileText } from 'lucide-react';

export default function ChemAutorizacion() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['chem-project', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_projects').select('*').eq('id', projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: auth } = useQuery({
    queryKey: ['chem-auth', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_authorizations').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      if (auth) {
        const { error } = await externalSupabase.from('chem_authorizations').update(data).eq('id', auth.id);
        if (error) throw error;
      } else {
        const { error } = await externalSupabase.from('chem_authorizations').insert({ ...data, project_id: projectId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-auth', projectId] });
      toast.success('Guardado');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const updateField = (field: string, value: any) => {
    const current = auth || {};
    upsertMutation.mutate({ ...current, [field]: value, project_id: undefined, id: undefined, created_at: undefined, updated_at: undefined });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Carta de Autorización</h2>
        <Button size="sm" variant="outline" disabled>
          <FileDown className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Datos de la autorización</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre empresa cliente</Label>
              <Input value={auth?.nombre_empresa ?? project?.nombre_cliente ?? ''} onChange={e => updateField('nombre_empresa', e.target.value)} />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={auth?.nif ?? ''} onChange={e => updateField('nif', e.target.value)} />
            </div>
            <div>
              <Label>Firmante</Label>
              <Input value={auth?.firmante ?? ''} onChange={e => updateField('firmante', e.target.value)} />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={auth?.cargo ?? ''} onChange={e => updateField('cargo', e.target.value)} />
            </div>
            <div>
              <Label>Vigencia desde</Label>
              <Input type="date" value={auth?.vigencia_desde ?? ''} onChange={e => updateField('vigencia_desde', e.target.value || null)} />
            </div>
            <div>
              <Label>Vigencia hasta</Label>
              <Input type="date" value={auth?.vigencia_hasta ?? ''} onChange={e => updateField('vigencia_hasta', e.target.value || null)} />
            </div>
          </div>
          <div>
            <Label>Alcance (categorías/productos autorizados)</Label>
            <Textarea value={auth?.alcance ?? ''} onChange={e => updateField('alcance', e.target.value)} className="h-24" placeholder="Describir qué categorías o productos cubre esta autorización..." />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Vista previa</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <div className="border rounded-lg p-6 bg-background">
            <h3 className="text-center text-lg font-bold mb-6">CARTA DE AUTORIZACIÓN</h3>
            <p>Por la presente, <strong>{auth?.nombre_empresa || project?.nombre_cliente || '[Nombre empresa]'}</strong>, con NIF <strong>{auth?.nif || '[NIF]'}</strong>, representada por D./Dña. <strong>{auth?.firmante || '[Firmante]'}</strong>, en calidad de <strong>{auth?.cargo || '[Cargo]'}</strong>,</p>
            <p><strong>AUTORIZA</strong> a ERA Group a actuar en su nombre y representación para la negociación y optimización de costes en las siguientes categorías:</p>
            <p className="italic">{auth?.alcance || '[Describir alcance]'}</p>
            <p>Esta autorización tiene vigencia desde el <strong>{auth?.vigencia_desde || '[fecha]'}</strong> hasta el <strong>{auth?.vigencia_hasta || '[fecha]'}</strong>.</p>
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div>
                <p className="border-t pt-2">Firma del Cliente</p>
                <p className="text-xs text-muted-foreground">{auth?.firmante || '[Nombre]'}</p>
                <p className="text-xs text-muted-foreground">{auth?.cargo || '[Cargo]'}</p>
              </div>
              <div>
                <p className="border-t pt-2">Por ERA Group</p>
                <p className="text-xs text-muted-foreground">[Nombre]</p>
                <p className="text-xs text-muted-foreground">[Cargo]</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
