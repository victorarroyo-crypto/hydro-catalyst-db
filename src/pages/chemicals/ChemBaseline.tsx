import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { FileDown, AlertTriangle } from 'lucide-react';

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(val);
};

const FUENTE_OPTIONS = [
  { value: 'facturas_12m', label: 'Facturas 12 meses' },
  { value: 'facturas_24m', label: 'Facturas 24 meses' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'albaranes', label: 'Albaranes' },
  { value: 'otra', label: 'Otra' },
];

export default function ChemBaseline() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_products').select('*').eq('project_id', projectId!).order('consumo_anual_kg', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: baselines = [] } = useQuery({
    queryKey: ['chem-baselines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_baselines').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ['chem-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_projects').select('*').eq('id', projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: any }) => {
      const existing = baselines.find((b: any) => b.product_id === productId);
      if (existing) {
        const { error } = await supabase.from('chem_baselines').update(data).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chem_baselines').insert({ ...data, project_id: projectId, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-baselines', projectId] });
      toast.success('Baseline actualizado');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const updateField = (productId: string, field: string, value: any) => {
    const existing = baselines.find((b: any) => b.product_id === productId);
    const data = existing ? { [field]: value } : { [field]: value };
    upsertMutation.mutate({ productId, data });
  };

  const sinFirmar = baselines.filter((b: any) => !b.firmado).length;
  const postAuditoria = project && ['negociacion', 'implementacion', 'seguimiento', 'cerrado'].includes(project.estado);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Baseline / Acta de Precios</h2>
        <Button size="sm" variant="outline" disabled>
          <FileDown className="w-4 h-4 mr-1" /> Exportar Acta PDF
        </Button>
      </div>

      {postAuditoria && sinFirmar > 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">⚠ {sinFirmar} baselines sin firmar. No se pueden lanzar RFQs.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Producto</TableHead>
                  <TableHead>MA / Conc.</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo precio</TableHead>
                  <TableHead className="text-right">Vol. ref. kg</TableHead>
                  <TableHead className="text-right font-bold bg-primary/5">Precio medio pond.</TableHead>
                  <TableHead className="text-right font-bold bg-primary/5">€/kg MA</TableHead>
                  <TableHead>Prima baseline</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Firmado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Añade productos en Inventario primero.</TableCell></TableRow>
                ) : products.map((p: any) => {
                  const bl = baselines.find((b: any) => b.product_id === p.id);
                  const conc = p.concentracion || 100;
                  const precioMedio = bl?.precio_medio_ponderado || p.precio_kg;
                  const precioMA = precioMedio && conc > 0 ? precioMedio / (conc / 100) : null;
                  const formula = p.tipo_precio === 'fijo' ? '(Baseline − Nuevo) × Vol' : '(Prima ant. − Prima nueva) × Vol';

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.nombre_comercial}</TableCell>
                      <TableCell className="text-xs">{p.materia_activa || '—'} / {conc}%</TableCell>
                      <TableCell className="text-xs">{p.proveedor_nombre || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{p.tipo_precio}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" className="w-24 h-7 text-xs text-right" value={bl?.volumen_referencia_kg ?? p.consumo_anual_kg ?? ''} 
                          onChange={e => updateField(p.id, 'volumen_referencia_kg', e.target.value ? parseFloat(e.target.value) : null)} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary bg-primary/5">
                        <Input type="number" step="0.0001" className="w-24 h-7 text-xs text-right font-bold" value={bl?.precio_medio_ponderado ?? ''} 
                          onChange={e => updateField(p.id, 'precio_medio_ponderado', e.target.value ? parseFloat(e.target.value) : null)} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary bg-primary/5 text-sm">
                        {precioMA ? formatCurrency(precioMA) : '—'}
                      </TableCell>
                      <TableCell>
                        {p.tipo_precio === 'indexado' && (
                          <Input type="number" step="0.01" className="w-20 h-7 text-xs" value={bl?.prima_baseline ?? ''} 
                            onChange={e => updateField(p.id, 'prima_baseline', e.target.value ? parseFloat(e.target.value) : null)} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Select value={bl?.fuente_verificacion ?? ''} onValueChange={v => updateField(p.id, 'fuente_verificacion', v)}>
                          <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{FUENTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[120px]">{formula}</TableCell>
                      <TableCell>
                        <Switch checked={!!bl?.firmado} onCheckedChange={v => {
                          updateField(p.id, 'firmado', v);
                          if (v) updateField(p.id, 'fecha_firma', new Date().toISOString().split('T')[0]);
                        }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
