import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, AlertTriangle } from 'lucide-react';

const ESTADOS_RFQ = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'en_evaluacion', label: 'En evaluación' },
  { value: 'adjudicado', label: 'Adjudicado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const formatCurrency = (val: number | null | undefined) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(val);
};

export default function ChemRfqs() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);

  const { data: rfqs = [] } = useQuery({
    queryKey: ['chem-rfqs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_rfqs').select('*').eq('project_id', projectId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chem_products').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: rfqProducts = [] } = useQuery({
    queryKey: ['chem-rfq-products', selectedRfq],
    queryFn: async () => {
      if (!selectedRfq) return [];
      const { data, error } = await supabase.from('chem_rfq_products').select('*').eq('rfq_id', selectedRfq);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRfq,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['chem-offers', selectedRfq],
    queryFn: async () => {
      if (!selectedRfq) return [];
      const { data, error } = await supabase.from('chem_offers').select('*, chem_suppliers(nombre)').eq('rfq_id', selectedRfq);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRfq,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('chem_rfqs').insert({ project_id: projectId!, titulo });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-rfqs', projectId] });
      toast.success('RFQ creado');
      setShowModal(false);
      setTitulo('');
    },
    onError: () => toast.error('Error'),
  });

  const updateRfqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('chem_rfqs').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-rfqs', projectId] });
      toast.success('Actualizado');
    },
    onError: () => toast.error('Error'),
  });

  const currentRfq = rfqs.find((r: any) => r.id === selectedRfq);

  if (selectedRfq && currentRfq) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedRfq(null)}>← Volver</Button>
          <h2 className="text-lg font-semibold">{currentRfq.titulo}</h2>
          <Select value={currentRfq.estado || 'borrador'} onValueChange={v => updateRfqMutation.mutate({ id: selectedRfq, data: { estado: v } })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{ESTADOS_RFQ.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Incoterm</Label>
              <Select value={currentRfq.incoterm || 'DAP'} onValueChange={v => updateRfqMutation.mutate({ id: selectedRfq, data: { incoterm: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['EXW', 'FCA', 'DAP', 'DDP'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Condiciones pago</Label>
              <Input value={currentRfq.condiciones_pago ?? ''} onChange={e => updateRfqMutation.mutate({ id: selectedRfq, data: { condiciones_pago: e.target.value } })} />
            </div>
            <div>
              <Label className="text-xs">Fecha envío</Label>
              <Input type="date" value={currentRfq.fecha_envio ?? ''} onChange={e => updateRfqMutation.mutate({ id: selectedRfq, data: { fecha_envio: e.target.value || null } })} />
            </div>
            <div>
              <Label className="text-xs">Fecha límite</Label>
              <Input type="date" value={currentRfq.fecha_limite ?? ''} onChange={e => updateRfqMutation.mutate({ id: selectedRfq, data: { fecha_limite: e.target.value || null } })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Especificaciones técnicas</Label>
              <Textarea value={currentRfq.especificaciones ?? ''} onChange={e => updateRfqMutation.mutate({ id: selectedRfq, data: { especificaciones: e.target.value } })} className="h-16" />
            </div>
          </CardContent>
        </Card>

        {/* Ofertas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Ofertas recibidas</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Registrar oferta</Button>
            </div>
          </CardHeader>
          <CardContent>
            {offers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay ofertas registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Transporte</TableHead>
                    <TableHead>Servicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>{(o.chem_suppliers as any)?.nombre || '—'}</TableCell>
                      <TableCell>{products.find((p: any) => p.id === o.product_id)?.nombre_comercial || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(o.precio)}</TableCell>
                      <TableCell>{o.incluye_transporte ? '✓' : '✕'}</TableCell>
                      <TableCell>{o.incluye_servicio ? '✓' : '✕'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lista de RFQs
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Gestión de RFQs</h2>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> Nuevo RFQ</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha envío</TableHead>
                <TableHead>Fecha límite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay RFQs. Crea uno para empezar.</TableCell></TableRow>
              ) : rfqs.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRfq(r.id)}>
                  <TableCell className="font-medium">{r.titulo}</TableCell>
                  <TableCell><Badge variant="outline">{ESTADOS_RFQ.find(e => e.value === r.estado)?.label || r.estado}</Badge></TableCell>
                  <TableCell className="text-sm">{r.fecha_envio || '—'}</TableCell>
                  <TableCell className="text-sm">{r.fecha_limite || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo RFQ</DialogTitle></DialogHeader>
          <div><Label>Título</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={() => { if (titulo.trim()) createMutation.mutate(); }}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
