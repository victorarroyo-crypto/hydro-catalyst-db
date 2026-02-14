import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Check, X, Loader2 } from 'lucide-react';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

const ESTADOS_RFQ = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'en_evaluación', label: 'En evaluación' },
  { value: 'adjudicado', label: 'Adjudicado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const formatCurrency = (val: number | null | undefined, decimals = 2) => {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimals }).format(val);
};

// ─── RFQ List ────────────────────────────────────────────────────────────────

function RfqList({ rfqs, onSelect, onCreate }: { rfqs: any[]; onSelect: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Gestión de RFQs</h2>
        <Button size="sm" onClick={onCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo RFQ</Button>
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
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(r.id)}>
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
    </div>
  );
}

// ─── Offer Comparator ────────────────────────────────────────────────────────

interface OfferFormData {
  supplier_id: string;
  product_id: string;
  precio: number | '';
  incoterm: string;
  plazo_pago: number | '';
  incluye_transporte: boolean;
  incluye_servicio: boolean;
  incluye_comodato: boolean;
  certificaciones: string;
  notas: string;
}

const EMPTY_OFFER: OfferFormData = {
  supplier_id: '', product_id: '', precio: '', incoterm: 'DAP',
  plazo_pago: '', incluye_transporte: true, incluye_servicio: false,
  incluye_comodato: false, certificaciones: '', notas: '',
};

function OfferComparator({ rfqId, rfq, projectId }: { rfqId: string; rfq: any; projectId: string }) {
  const queryClient = useQueryClient();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState<OfferFormData>(EMPTY_OFFER);

  // Fetch offers with supplier join
  const { data: offers = [] } = useQuery({
    queryKey: ['chem-offers', rfqId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_offers')
        .select('*, chem_suppliers(nombre)')
        .eq('rfq_id', rfqId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products for this project
  const { data: products = [] } = useQuery({
    queryKey: ['chem-products', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_products').select('*').eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch RFQ-linked products
  const { data: rfqProducts = [] } = useQuery({
    queryKey: ['chem-rfq-products', rfqId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_rfq_products').select('product_id').eq('rfq_id', rfqId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch suppliers for this project
  const { data: suppliers = [] } = useQuery({
    queryKey: ['chem-suppliers', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_suppliers').select('*').eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch signed baselines
  const { data: baselines = [] } = useQuery({
    queryKey: ['chem-baselines-signed', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_baselines')
        .select('*')
        .eq('project_id', projectId)
        .eq('firmado', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Create offer via Railway API
  const createOfferMutation = useMutation({
    mutationFn: async (form: OfferFormData) => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfq_id: rfqId,
          supplier_id: form.supplier_id,
          product_id: form.product_id,
          precio: Number(form.precio),
          incoterm: form.incoterm,
          plazo_pago: form.plazo_pago ? Number(form.plazo_pago) : null,
          incluye_transporte: form.incluye_transporte,
          incluye_servicio: form.incluye_servicio,
          incluye_comodato: form.incluye_comodato,
          certificaciones: form.certificaciones || null,
          notas: form.notas || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error creando oferta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-offers', rfqId] });
      toast.success('Oferta registrada');
      setShowOfferModal(false);
      setOfferForm(EMPTY_OFFER);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Group offers by product
  const linkedProductIds = rfqProducts.map((rp: any) => rp.product_id);
  const relevantProductIds = Array.from(new Set([
    ...linkedProductIds,
    ...offers.map((o: any) => o.product_id),
  ]));

  const hasIncoTermMix = useMemo(() => {
    const incoterms = new Set(offers.map((o: any) => o.incoterm).filter(Boolean));
    return incoterms.has('EXW') && incoterms.size > 1;
  }, [offers]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">{rfq.titulo}</h2>
          <Badge variant="outline">{ESTADOS_RFQ.find(e => e.value === rfq.estado)?.label || rfq.estado}</Badge>
          {rfq.fecha_limite && (
            <span className="text-sm text-muted-foreground">Fecha límite: {rfq.fecha_limite}</span>
          )}
        </div>

        {/* Incoterm mix warning */}
        {hasIncoTermMix && (
          <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <strong>No todas las ofertas son DAP.</strong> Las ofertas EXW no incluyen transporte
              y no son directamente comparables. Solicitar re-cotización DAP.
            </div>
          </div>
        )}

        {/* Per-product comparison tables */}
        {relevantProductIds.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay productos asociados a este RFQ. Añade ofertas para comenzar.
            </CardContent>
          </Card>
        ) : (
          relevantProductIds.map((pid: string) => (
            <ProductOfferTable
              key={pid}
              productId={pid}
              products={products}
              offers={offers.filter((o: any) => o.product_id === pid)}
              baselines={baselines}
            />
          ))
        )}

        {/* Add offer button */}
        <Button size="sm" onClick={() => setShowOfferModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Añadir Oferta
        </Button>

        {/* Add offer modal */}
        <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registrar Oferta</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Proveedor</Label>
                <Select value={offerForm.supplier_id} onValueChange={v => setOfferForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Producto</Label>
                <Select value={offerForm.product_id} onValueChange={v => setOfferForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre_comercial}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Precio (€/kg)</Label>
                  <Input type="number" step="0.0001" value={offerForm.precio} onChange={e => setOfferForm(f => ({ ...f, precio: e.target.value === '' ? '' : Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Incoterm</Label>
                  <Select value={offerForm.incoterm} onValueChange={v => setOfferForm(f => ({ ...f, incoterm: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['EXW', 'FCA', 'DAP', 'DDP'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Plazo de pago (días)</Label>
                <Input type="number" value={offerForm.plazo_pago} onChange={e => setOfferForm(f => ({ ...f, plazo_pago: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={offerForm.incluye_transporte} onCheckedChange={v => setOfferForm(f => ({ ...f, incluye_transporte: v }))} />
                  <Label className="text-xs">Transporte</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={offerForm.incluye_servicio} onCheckedChange={v => setOfferForm(f => ({ ...f, incluye_servicio: v }))} />
                  <Label className="text-xs">Serv. Técnico</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={offerForm.incluye_comodato} onCheckedChange={v => setOfferForm(f => ({ ...f, incluye_comodato: v }))} />
                  <Label className="text-xs">Comodato</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea value={offerForm.notas} onChange={e => setOfferForm(f => ({ ...f, notas: e.target.value }))} className="h-16" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOfferModal(false)}>Cancelar</Button>
              <Button
                onClick={() => { if (offerForm.supplier_id && offerForm.product_id && offerForm.precio !== '') createOfferMutation.mutate(offerForm); }}
                disabled={createOfferMutation.isPending || !offerForm.supplier_id || !offerForm.product_id || offerForm.precio === ''}
              >
                {createOfferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ─── Product Offer Table (comparative) ───────────────────────────────────────

function ProductOfferTable({ productId, products, offers, baselines }: {
  productId: string; products: any[]; offers: any[]; baselines: any[];
}) {
  const product = products.find((p: any) => p.id === productId);
  const baseline = baselines.find((b: any) => b.product_id === productId);
  const concentracion = product?.concentracion || null;
  const consumoAnual = product?.consumo_anual_kg || 0;
  const baselineMa = baseline?.precio_kg_ma || null;

  const calcMa = (precio: number | null) => {
    if (precio == null || !concentracion || concentracion === 0) return null;
    return precio / (concentracion / 100);
  };

  // Find best DAP offer (lowest €/kg MA)
  const offersMa = offers.map((o: any) => ({
    ...o,
    precioMa: calcMa(o.precio),
  }));
  const dapOffers = offersMa.filter((o: any) => o.incoterm !== 'EXW' && o.precioMa != null);
  const bestOffer = dapOffers.length > 0
    ? dapOffers.reduce((best: any, o: any) => (o.precioMa < best.precioMa ? o : best), dapOffers[0])
    : null;

  const calcAhorroPct = (precioMa: number | null) => {
    if (precioMa == null || baselineMa == null || baselineMa === 0) return null;
    return ((precioMa - baselineMa) / baselineMa) * 100;
  };

  const calcAhorroEur = (precioMa: number | null) => {
    if (precioMa == null || baselineMa == null) return null;
    return (precioMa - baselineMa) * consumoAnual;
  };

  const BoolCell = ({ value }: { value: boolean | null }) => (
    <span>{value ? <Check className="w-4 h-4 text-green-600 inline" /> : <X className="w-4 h-4 text-muted-foreground inline" />}</span>
  );

  const rows: { label: string; key: string }[] = [
    { label: 'Precio €/kg', key: 'precio' },
    { label: '€/kg MA', key: 'precioMa' },
    { label: 'Incoterm', key: 'incoterm' },
    { label: 'Plazo pago', key: 'plazo_pago' },
    { label: 'Transporte', key: 'incluye_transporte' },
    { label: 'Serv. Técnico', key: 'incluye_servicio' },
    { label: 'Comodato', key: 'incluye_comodato' },
    { label: 'Ahorro %', key: 'ahorro_pct' },
    { label: 'Ahorro €/año', key: 'ahorro_eur' },
  ];

  if (offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          {product?.nombre_comercial || 'Producto'}: Sin ofertas registradas
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm">{product?.nombre_comercial || 'Producto'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Volumen anual: {consumoAnual > 0 ? consumoAnual.toLocaleString('es-ES') + ' kg' : '—'}
              {baselineMa != null && <> · Baseline: {baselineMa.toFixed(4)} €/kg MA</>}
              {concentracion != null && <> · Conc.: {concentracion}%</>}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32 text-xs"></TableHead>
              {offersMa.map((o: any) => {
                const isBest = bestOffer && o.id === bestOffer.id;
                return (
                  <TableHead key={o.id} className={`text-xs text-center min-w-[110px] ${isBest ? 'bg-green-50' : ''}`}>
                    {(o.chem_suppliers as any)?.nombre || '—'}
                  </TableHead>
                );
              })}
              <TableHead className="text-xs text-center min-w-[110px] bg-muted/30 font-semibold">BASELINE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.key}>
                <TableCell className="text-xs font-medium text-muted-foreground">{row.label}</TableCell>
                {offersMa.map((o: any) => {
                  const isBest = bestOffer && o.id === bestOffer.id;
                  const cellClass = `text-xs text-center ${isBest ? 'bg-green-50' : ''}`;
                  const precioMa = o.precioMa;
                  const ahorroPct = calcAhorroPct(precioMa);
                  const ahorroEur = calcAhorroEur(precioMa);

                  switch (row.key) {
                    case 'precio':
                      return <TableCell key={o.id} className={`${cellClass} font-mono`}>{o.precio != null ? o.precio.toFixed(4) : '—'}</TableCell>;
                    case 'precioMa':
                      return (
                        <TableCell key={o.id} className={`${cellClass} font-mono font-semibold`}>
                          {precioMa != null ? precioMa.toFixed(4) : (
                            <Tooltip>
                              <TooltipTrigger asChild><span className="text-muted-foreground">—</span></TooltipTrigger>
                              <TooltipContent>Sin datos de concentración</TooltipContent>
                            </Tooltip>
                          )}
                          {isBest && precioMa != null && <Check className="w-3.5 h-3.5 text-green-600 inline ml-1" />}
                        </TableCell>
                      );
                    case 'incoterm':
                      return (
                        <TableCell key={o.id} className={cellClass}>
                          {o.incoterm || '—'}
                          {o.incoterm === 'EXW' && (
                            <Tooltip>
                              <TooltipTrigger asChild><AlertTriangle className="w-3.5 h-3.5 text-orange-500 inline ml-1" /></TooltipTrigger>
                              <TooltipContent>Transporte no incluido — no comparable directamente DAP</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      );
                    case 'plazo_pago':
                      return <TableCell key={o.id} className={cellClass}>{o.plazo_pago != null ? `${o.plazo_pago}d` : '—'}</TableCell>;
                    case 'incluye_transporte':
                      return <TableCell key={o.id} className={cellClass}><BoolCell value={o.incluye_transporte} /></TableCell>;
                    case 'incluye_servicio':
                      return <TableCell key={o.id} className={cellClass}><BoolCell value={o.incluye_servicio} /></TableCell>;
                    case 'incluye_comodato':
                      return <TableCell key={o.id} className={cellClass}><BoolCell value={o.incluye_comodato} /></TableCell>;
                    case 'ahorro_pct':
                      return (
                        <TableCell key={o.id} className={`${cellClass} font-mono ${isBest ? 'font-bold' : ''}`}>
                          {ahorroPct != null ? `${ahorroPct > 0 ? '+' : ''}${ahorroPct.toFixed(1)}%` : '—'}
                        </TableCell>
                      );
                    case 'ahorro_eur':
                      return (
                        <TableCell key={o.id} className={`${cellClass} font-mono ${isBest ? 'font-bold' : ''}`}>
                          {ahorroEur != null ? formatCurrency(ahorroEur) : '—'}
                        </TableCell>
                      );
                    default:
                      return <TableCell key={o.id} className={cellClass}>—</TableCell>;
                  }
                })}
                {/* Baseline column */}
                <TableCell className="text-xs text-center bg-muted/30 font-mono">
                  {row.key === 'precio' && (baseline?.precio_medio_ponderado != null ? baseline.precio_medio_ponderado.toFixed(4) : '—')}
                  {row.key === 'precioMa' && (baselineMa != null ? <span className="font-semibold">{baselineMa.toFixed(4)}</span> : '—')}
                  {row.key === 'incoterm' && (product?.incoterm || 'DAP')}
                  {row.key === 'plazo_pago' && '—'}
                  {row.key === 'incluye_transporte' && <BoolCell value={product?.incoterm !== 'EXW'} />}
                  {row.key === 'incluye_servicio' && '—'}
                  {row.key === 'incluye_comodato' && '—'}
                  {row.key === 'ahorro_pct' && '—'}
                  {row.key === 'ahorro_eur' && '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Best offer footer */}
        {bestOffer && bestOffer.precioMa != null && baselineMa != null && (
          <div className="px-4 py-3 bg-green-50 border-t text-sm text-green-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>
              <strong>Mejor oferta: {(bestOffer.chem_suppliers as any)?.nombre}</strong>
              {' '}({calcAhorroPct(bestOffer.precioMa)?.toFixed(1)}% vs baseline)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChemRfqs() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');

  const { data: rfqs = [] } = useQuery({
    queryKey: ['chem-rfqs', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase.from('chem_rfqs').select('*').eq('project_id', projectId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await externalSupabase.from('chem_rfqs').insert({ project_id: projectId!, titulo });
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

  const currentRfq = rfqs.find((r: any) => r.id === selectedRfq);

  if (selectedRfq && currentRfq) {
    return (
      <div>
        <div className="px-6 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedRfq(null)}>← Volver</Button>
        </div>
        <OfferComparator rfqId={selectedRfq} rfq={currentRfq} projectId={projectId!} />
      </div>
    );
  }

  return (
    <>
      <RfqList rfqs={rfqs} onSelect={setSelectedRfq} onCreate={() => setShowModal(true)} />
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
    </>
  );
}
