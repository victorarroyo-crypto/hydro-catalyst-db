import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ChevronDown, Plus, Upload, AlertTriangle, DollarSign, Building2, Trash2, FileText, ExternalLink, Loader2, ClipboardList, Receipt, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

export default function ChemContratos() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProveedorNombre, setNewProveedorNombre] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTipo, setUploadTipo] = useState('contrato_formal');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractingContracts, setExtractingContracts] = useState(false);
  const [extractingInvoices, setExtractingInvoices] = useState(false);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocName, setActiveDocName] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Query audits with JOIN to get supplier name
  const { data: audits = [] } = useQuery({
    queryKey: ['chem-audits', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_contract_audits')
        .select('*, chem_suppliers(nombre)')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['chem-contract-docs', projectId, selectedAudit],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await externalSupabase
        .from('chem_contract_documents')
        .select('id, nombre_archivo, tipo_documento, estado_extraccion, confianza_extraccion, datos_extraidos, created_at, file_url')
        .eq('audit_id', selectedAudit)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedAudit,
  });

  // Creating an audit: first create supplier, then audit referencing supplier_id
  const createAuditMutation = useMutation({
    mutationFn: async (nombre: string) => {
      // First create the supplier
      const { data: supplier, error: supplierError } = await externalSupabase
        .from('chem_suppliers')
        .insert({ nombre, project_id: projectId! })
        .select()
        .single();
      if (supplierError) throw supplierError;

      // Then create the audit referencing the supplier
      const { error } = await externalSupabase.from('chem_contract_audits').insert({
        project_id: projectId!,
        supplier_id: supplier.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-audits', projectId] });
      toast.success('Proveedor añadido');
      setShowNewModal(false);
      setNewProveedorNombre('');
    },
    onError: (err: any) => {
      console.error('Error creating audit:', err);
      toast.error(`Error al crear proveedor: ${err?.message || 'Error desconocido'}`);
    },
  });

  const updateAuditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await externalSupabase.from('chem_contract_audits').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-audits', projectId] });
      toast.success('Actualizado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await fetch(
        `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/documents/${docId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Error eliminando documento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chem-contract-docs', projectId, selectedAudit] });
      toast.success('Documento eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const { data } = await externalSupabase
        .from('chem_contract_documents')
        .select('id, datos_extraidos, confianza_extraccion, estado_extraccion')
        .eq('project_id', projectId!);
      const hasStructured = data?.some((d: any) => d.datos_extraidos?.supplier_name);
      if (hasStructured) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        queryClient.invalidateQueries({ queryKey: ['chem-contract-docs', projectId, selectedAudit] });
        toast.success('Extracción completada — las cláusulas del contrato han sido extraídas.');
      }
    }, 5000);
    setTimeout(() => { if (pollingRef.current) clearInterval(pollingRef.current); }, 180000);
  }, [projectId, selectedAudit, queryClient]);

  const handleExtractContracts = async () => {
    setExtractingContracts(true);
    try {
      const response = await supabase.functions.invoke('extract-contract-clauses', {
        body: { project_id: projectId },
      });
      if (response.error) throw response.error;
      const result = response.data;
      toast.success(`Extracción iniciada — procesando ${result.processed || 'los'} documentos.`);
      startPolling();
    } catch {
      toast.error('No se pudo iniciar la extracción de contratos');
    } finally {
      setExtractingContracts(false);
    }
  };

  const handleExtractSingleDoc = async (docId: string) => {
    setExtractingDocId(docId);
    try {
      const response = await supabase.functions.invoke('extract-contract-clauses', {
        body: { project_id: projectId, document_id: docId },
      });
      if (response.error) throw response.error;
      toast.success('Extracción iniciada para este documento.');
      startPolling();
    } catch {
      toast.error('No se pudo iniciar la extracción');
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleExtractInvoices = async () => {
    setExtractingInvoices(true);
    try {
      const response = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/extract-invoices`, { method: 'POST' });
      const result = await response.json();
      toast.success(`Extracción de facturas iniciada — procesando ${result.documents_to_process || 'los'} documentos.`);
      startPolling();
    } catch {
      toast.error('No se pudo iniciar la extracción de facturas');
    } finally {
      setExtractingInvoices(false);
    }
  };

  // Helpers for document status
  const isPhase1Complete = (doc: any) => doc.estado_extraccion === 'completado' && doc.datos_extraidos?.raw_text;
  const isPhase2Complete = (doc: any) => doc.datos_extraidos?.supplier_name;
  const hasDocsReadyForExtraction = documents.some((d: any) => isPhase1Complete(d) && !isPhase2Complete(d));


  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedAudit || !projectId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tipo_documento', uploadTipo);
      formData.append('audit_id', selectedAudit);

      const response = await fetch(
        `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/documents`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error subiendo documento');
      }

      queryClient.invalidateQueries({ queryKey: ['chem-contract-docs', projectId, selectedAudit] });
      toast.success('Documento subido correctamente');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTipo('contrato_formal');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const currentAudit = audits.find((a: any) => a.id === selectedAudit);

  // Helper to get supplier name from joined data
  const getSupplierName = (audit: any) => audit?.chem_suppliers?.nombre || '—';

  const getScoreBar = (score: number | null, label: string) => {
    const val = score || 0;
    const pct = (val / 4) * 100;
    const color = val < 2.5 ? 'bg-red-500' : val < 3 ? 'bg-yellow-500' : 'bg-green-500';
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-20 text-muted-foreground">{label}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 text-right font-mono">{val > 0 ? val.toFixed(1) : '—'}</span>
      </div>
    );
  };

  const updateField = (field: string, value: any) => {
    if (!selectedAudit) return;
    updateAuditMutation.mutate({ id: selectedAudit, data: { [field]: value } });
  };

  // Calculate completion using external schema column names
  const getCompletion = (audit: any) => {
    if (!audit) return { completed: 0, total: 0 };
    const fields = ['plazo_pago_dias', 'duracion_contrato_meses', 'fecha_vencimiento', 'volumen_comprometido_anual',
      'score_precio', 'score_condiciones', 'score_servicio', 'score_logistica'];
    const completed = fields.filter(f => audit[f] != null).length;
    return { completed, total: fields.length };
  };

  // Calculate score_media client-side (not stored in external DB)
  const calcScoreMedia = (audit: any) => {
    if (!audit) return null;
    const scores = [audit.score_precio, audit.score_condiciones, audit.score_servicio, audit.score_logistica].filter(v => v != null) as number[];
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  };

  const venceSoon = (fecha: string | null) => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    return d < in60 && d > new Date();
  };

  const calcTAE = (descuento: number | null, plazoNormal: number | null, plazoProonto: number | null) => {
    if (!descuento || !plazoNormal || !plazoProonto || plazoNormal <= plazoProonto) return null;
    const desc = descuento / 100;
    const tae = (desc / (1 - desc)) * (365 / (plazoNormal - plazoProonto)) * 100;
    return tae;
  };

  if (selectedAudit && currentAudit) {
    const completion = getCompletion(currentAudit);
    const completionPct = completion.total > 0 ? (completion.completed / completion.total) * 100 : 0;
    const scoreMedia = calcScoreMedia(currentAudit);

    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAudit(null)}>← Volver</Button>
          <h2 className="text-lg font-semibold">{getSupplierName(currentAudit)}</h2>
          {scoreMedia != null && scoreMedia < 2.5 && (
            <Badge variant="destructive">PRIORIDAD RENEGOCIACIÓN</Badge>
          )}
          {currentAudit.rappel_existe && !currentAudit.rappel_cobrado && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">RAPPEL NO COBRADO</Badge>
          )}
        </div>

        <Tabs defaultValue="condiciones">
          <TabsList>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="condiciones">Condiciones</TabsTrigger>
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
          </TabsList>

          {/* Documentos */}
          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Documentos del contrato</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-4 h-4 mr-1" /> Subir documento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No hay documentos subidos.</p>
                    <Button size="sm" variant="ghost" onClick={() => setShowUploadModal(true)}>
                      <Upload className="w-4 h-4 mr-1" /> Subir primer documento
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado extracción</TableHead>
                        <TableHead>Datos extraídos</TableHead>
                        <TableHead>Confianza</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="w-16">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((d: any) => {
                        const phase2Done = isPhase2Complete(d);
                        const phase1Done = isPhase1Complete(d);
                        return (
                          <React.Fragment key={d.id}>
                            <TableRow
                              className={`cursor-pointer hover:bg-muted/50`}
                              onClick={() => (phase2Done || phase1Done) && setExpandedDocId(expandedDocId === d.id ? null : d.id)}
                            >
                              <TableCell className="font-medium">
                                {d.file_url ? (
                                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={e => e.stopPropagation()}>
                                    {d.nombre_archivo} <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : d.nombre_archivo}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{d.tipo_documento}</Badge>
                              </TableCell>
                              <TableCell>
                                {d.estado_extraccion === 'completado' && (
                                  <Badge className="bg-[#8cb63c]/15 text-[#8cb63c] border-[#8cb63c]/30 text-[10px]">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Completado
                                  </Badge>
                                )}
                                {d.estado_extraccion === 'error' && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    <XCircle className="w-3 h-3 mr-1" /> Error
                                  </Badge>
                                )}
                                {d.estado_extraccion === 'procesando' && (
                                  <Badge className="bg-[#32b4cd]/15 text-[#32b4cd] border-[#32b4cd]/30 text-[10px]">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Procesando
                                  </Badge>
                                )}
                                {d.estado_extraccion === 'pendiente' && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {phase2Done ? (
                                  <Badge className="bg-[#8cb63c]/15 text-[#8cb63c] border-[#8cb63c]/30 text-[10px]">
                                    <ClipboardList className="w-3 h-3 mr-1" /> Cláusulas extraídas
                                  </Badge>
                                ) : phase1Done ? (
                                  <Badge className="bg-[#32b4cd]/15 text-[#32b4cd] border-[#32b4cd]/30 text-[10px]">
                                    <FileText className="w-3 h-3 mr-1" /> Texto extraído
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {d.confianza_extraccion != null ? (
                                  <span className="text-xs font-mono">{(d.confianza_extraccion * 100).toFixed(0)}%</span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {d.created_at ? format(new Date(d.created_at), 'dd MMM yyyy', { locale: es }) : '—'}
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(d.id); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Expanded: Phase 1 only - show raw text */}
                            {expandedDocId === d.id && phase1Done && !phase2Done && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-muted/30 p-4 space-y-3 border-t">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold" style={{ color: '#307177' }}>📄 Texto extraído del documento</h4>
                                      <Button
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleExtractSingleDoc(d.id); }}
                                        disabled={extractingDocId === d.id}
                                        className="bg-[#307177] hover:bg-[#307177]/90 text-white"
                                      >
                                        {extractingDocId === d.id ? (
                                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extrayendo cláusulas…</>
                                        ) : (
                                          <><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Extraer cláusulas con IA</>
                                        )}
                                      </Button>
                                    </div>
                                    <pre className="text-xs whitespace-pre-wrap font-mono bg-background border rounded-lg p-3 max-h-[400px] overflow-y-auto">
                                      {d.datos_extraidos?.raw_text || 'Sin texto disponible'}
                                    </pre>
                                    <p className="text-[10px] text-muted-foreground">
                                      {d.datos_extraidos?.chars ? `${d.datos_extraidos.chars} caracteres` : ''} 
                                      {d.datos_extraidos?.pages ? ` · ${d.datos_extraidos.pages} páginas` : ''}
                                      {' · Phase 2 (extracción estructurada) pendiente'}
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}

                            {/* Expanded: Phase 2 complete - structured data */}
                            {expandedDocId === d.id && phase2Done && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-muted/30 p-4 space-y-4 border-t">
                                    {/* Contract data */}
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2" style={{ color: '#307177' }}>📋 Datos del contrato</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                                        {[
                                          ['Proveedor', d.datos_extraidos?.supplier_name],
                                          ['Plazo de pago', d.datos_extraidos?.plazo_pago_dias ? `${d.datos_extraidos.plazo_pago_dias} días` : null],
                                          ['Pronto pago', d.datos_extraidos?.pronto_pago_descuento_pct ? `${d.datos_extraidos.pronto_pago_descuento_pct}% en ${d.datos_extraidos.pronto_pago_dias || '?'} días` : null],
                                          ['Duración', d.datos_extraidos?.duracion_contrato_meses ? `${d.datos_extraidos.duracion_contrato_meses} meses` : null],
                                          ['Vencimiento', d.datos_extraidos?.fecha_vencimiento],
                                          ['Renovación automática', d.datos_extraidos?.renovacion_automatica != null ? (d.datos_extraidos.renovacion_automatica ? 'Sí' : 'No') : null],
                                          ['Preaviso', d.datos_extraidos?.preaviso_no_renovacion_dias ? `${d.datos_extraidos.preaviso_no_renovacion_dias} días` : null],
                                          ['Take or Pay', d.datos_extraidos?.take_or_pay != null ? (d.datos_extraidos.take_or_pay ? 'Sí' : 'No') : null],
                                          ['Vol. comprometido', d.datos_extraidos?.volumen_comprometido_anual ? `${d.datos_extraidos.volumen_comprometido_anual} kg/año` : null],
                                          ['Fórmula revisión', d.datos_extraidos?.formula_revision_detalle],
                                          ['Índice vinculado', d.datos_extraidos?.indice_vinculado],
                                          ['Frecuencia revisión', d.datos_extraidos?.frecuencia_revision],
                                          ['Rappels', d.datos_extraidos?.rappel_detalle],
                                          ['Servicio técnico', d.datos_extraidos?.detalle_servicio_tecnico],
                                          ['Equipos comodato', d.datos_extraidos?.detalle_comodato],
                                        ].filter(([, v]) => v != null).map(([label, value]) => (
                                          <div key={label as string}>
                                            <span className="text-muted-foreground">{label}: </span>
                                            <span className="font-medium">{value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Products */}
                                    {d.datos_extraidos?.productos_mencionados?.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold mb-2" style={{ color: '#307177' }}>📦 Productos</h4>
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs">Producto</TableHead>
                                              <TableHead className="text-xs">Precio (€/kg)</TableHead>
                                              <TableHead className="text-xs">Formato</TableHead>
                                              <TableHead className="text-xs">Incoterm</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {d.datos_extraidos.productos_mencionados.map((p: any, i: number) => (
                                              <TableRow key={i}>
                                                <TableCell className="text-xs">{p.nombre || '—'}</TableCell>
                                                <TableCell className="text-xs font-mono">{p.precio_kg != null ? `${p.precio_kg} €` : '—'}</TableCell>
                                                <TableCell className="text-xs">{p.formato || '—'}</TableCell>
                                                <TableCell className="text-xs">{p.incoterm || '—'}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}

                                    {/* Auditor alerts */}
                                    {d.datos_extraidos?.alertas_auditor?.length > 0 && (
                                      <div className="bg-[#ffa720]/10 border border-[#ffa720]/30 rounded-lg p-3">
                                        <h4 className="text-sm font-semibold mb-2 text-[#ffa720]">⚠️ Alertas del auditor</h4>
                                        <ul className="space-y-1">
                                          {d.datos_extraidos.alertas_auditor.map((a: string, i: number) => (
                                            <li key={i} className="text-xs flex items-start gap-1.5">
                                              <AlertTriangle className="w-3 h-3 mt-0.5 text-[#ffa720] shrink-0" />
                                              <span>{a}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Confidence per field */}
                                    {d.datos_extraidos?.confianza_por_campo && (
                                      <Collapsible>
                                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                          <ChevronDown className="w-3 h-3" /> Confianza por campo
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 space-y-1.5">
                                          {Object.entries(d.datos_extraidos.confianza_por_campo).map(([campo, valor]: [string, any]) => (
                                            <div key={campo} className="flex items-center gap-2 text-xs">
                                              <span className="w-40 text-muted-foreground truncate">{campo}</span>
                                              <Progress value={(valor as number) * 100} className="flex-1 h-1.5" />
                                              <span className="w-10 text-right font-mono">{((valor as number) * 100).toFixed(0)}%</span>
                                            </div>
                                          ))}
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )}

                                    {/* Raw text collapsible */}
                                    <Collapsible>
                                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                        <ChevronDown className="w-3 h-3" /> Ver texto original
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-2">
                                        <pre className="text-xs whitespace-pre-wrap font-mono bg-background border rounded-lg p-3 max-h-[300px] overflow-y-auto">
                                          {d.datos_extraidos?.raw_text || 'Sin texto'}
                                        </pre>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Extraction buttons */}
            {documents.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={handleExtractContracts}
                  disabled={extractingContracts || !hasDocsReadyForExtraction}
                  className="bg-[#307177] hover:bg-[#307177]/90 text-white"
                >
                  {extractingContracts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                  Extraer cláusulas de contratos
                </Button>
                <Button
                  onClick={handleExtractInvoices}
                  disabled={extractingInvoices || !hasDocsReadyForExtraction}
                  variant="outline"
                  className="border-[#32b4cd] text-[#32b4cd] hover:bg-[#32b4cd]/10"
                >
                  {extractingInvoices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                  Extraer datos de facturas
                </Button>
              </div>
            )}

            {/* Upload Modal */}
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de documento</Label>
                    <Select value={uploadTipo} onValueChange={setUploadTipo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrato_formal">Contrato formal</SelectItem>
                        <SelectItem value="condiciones_generales">Condiciones generales</SelectItem>
                        <SelectItem value="email_tarifa">Email tarifa</SelectItem>
                        <SelectItem value="oferta_aceptada">Oferta aceptada</SelectItem>
                        <SelectItem value="adenda">Adenda</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Archivo</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel o imágenes</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowUploadModal(false); setUploadFile(null); }}>Cancelar</Button>
                  <Button onClick={handleUploadDocument} disabled={!uploadFile || uploading}>
                    {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4 mr-1" /> Subir</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Condiciones */}
          <TabsContent value="condiciones" className="space-y-4">
            {/* Per-document extracted sections */}
            {(() => {
              const docsWithData = documents.filter((d: any) => d.datos_extraidos?.supplier_name);
              if (docsWithData.length === 0) return (
                <Card>
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    No hay contratos con datos extraídos. Sube documentos y extrae cláusulas desde la pestaña Documentos.
                  </CardContent>
                </Card>
              );

              const renderValue = (val: any, suffix?: string) => {
                if (val == null || val === '') return <span className="text-muted-foreground">—</span>;
                if (typeof val === 'boolean') return val ? '✓ Sí' : '✕ No';
                return `${val}${suffix || ''}`;
              };

              return docsWithData.map((docWithData: any) => {
                const ext = docWithData.datos_extraidos;
                const auditEmpty = !currentAudit.plazo_pago_dias && !currentAudit.duracion_contrato_meses && !currentAudit.fecha_vencimiento;

                const handleAutoFill = async () => {
                  const fieldsToUpdate: Record<string, any> = {};
                  const mapping: Record<string, any> = {
                    plazo_pago_dias: ext.plazo_pago_dias,
                    pronto_pago_descuento_pct: ext.pronto_pago_descuento_pct,
                    pronto_pago_dias: ext.pronto_pago_dias,
                    duracion_contrato_meses: ext.duracion_contrato_meses,
                    fecha_vencimiento: ext.fecha_vencimiento,
                    renovacion_automatica: ext.renovacion_automatica,
                    preaviso_no_renovacion_dias: ext.preaviso_no_renovacion_dias,
                    volumen_comprometido_anual: ext.volumen_comprometido_anual,
                    take_or_pay: ext.take_or_pay,
                    penalizacion_take_or_pay: ext.penalizacion_take_or_pay,
                    formula_revision_existe: ext.formula_revision_existe ?? !!ext.formula_revision_detalle,
                    formula_revision_detalle: ext.formula_revision_detalle,
                    indice_vinculado: ext.indice_vinculado,
                    frecuencia_revision: ext.frecuencia_revision,
                    simetria_subida_bajada: ext.simetria_subida_bajada,
                    cap_subida_pct: ext.cap_subida_pct,
                    floor_bajada_pct: ext.floor_bajada_pct,
                    rappel_existe: ext.rappel_existe ?? !!ext.rappel_detalle,
                    rappel_detalle: ext.rappel_detalle,
                    stock_consigna: ext.stock_consigna,
                    gestion_envases_vacios: ext.gestion_envases_vacios,
                    coste_envases_incluido: ext.coste_envases_incluido,
                    servicio_tecnico_incluido: ext.servicio_tecnico_incluido,
                    detalle_servicio_tecnico: ext.detalle_servicio_tecnico,
                    equipos_comodato: ext.equipos_comodato,
                    detalle_comodato: ext.detalle_comodato,
                    clausula_mfn: ext.clausula_mfn,
                    clausula_salida: ext.clausula_salida ? true : false,
                    banda_volumen_min: ext.banda_volumen_min,
                    banda_volumen_max: ext.banda_volumen_max,
                  };
                  for (const [k, v] of Object.entries(mapping)) {
                    if (v != null) fieldsToUpdate[k] = v;
                  }
                  if (Object.keys(fieldsToUpdate).length > 0) {
                    updateAuditMutation.mutate({ id: selectedAudit!, data: fieldsToUpdate });
                    setActiveDocId(docWithData.id);
                    setActiveDocName(docWithData.nombre_archivo || docWithData.nombre || ext.supplier_name);
                    toast.success(`${Object.keys(fieldsToUpdate).length} campos rellenados desde ${ext.supplier_name}`);
                  }
                };

                const filledCount = [
                  ext.plazo_pago_dias, ext.pronto_pago_descuento_pct, ext.pronto_pago_dias,
                  ext.duracion_contrato_meses, ext.fecha_vencimiento, ext.renovacion_automatica,
                  ext.volumen_comprometido_anual, ext.formula_revision_existe,
                  ext.rappel_existe, ext.stock_consigna, ext.servicio_tecnico_incluido, ext.equipos_comodato,
                  ext.clausula_mfn, ext.clausula_salida
                ].filter(v => v != null).length;

                return (
                  <Collapsible key={docWithData.id} defaultOpen>
                    <Card className={`transition-colors ${activeDocId === docWithData.id ? 'border-green-500 border-2 ring-1 ring-green-500/20' : 'border-[#32b4cd]/30'}`}>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="py-3 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#32b4cd]" />
                            <CardTitle className="text-sm">
                              {ext.supplier_name} — {docWithData.nombre_archivo || docWithData.nombre}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px]">{filledCount} campos</Badge>
                            {activeDocId === docWithData.id && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
                                <CheckCircle className="w-3 h-3 mr-1" /> Datos en uso
                              </Badge>
                            )}
                          </div>
                          <ChevronDown className="w-4 h-4" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4 pt-0">
                          {/* Pago */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">💰 Pago</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Plazo pago días</Label>
                                <p className="text-sm font-medium">{renderValue(ext.plazo_pago_dias)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Pronto pago %</Label>
                                <p className="text-sm font-medium">{renderValue(ext.pronto_pago_descuento_pct, '%')}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Pronto pago días</Label>
                                <p className="text-sm font-medium">{renderValue(ext.pronto_pago_dias)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Duración */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">📅 Duración</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Duración meses</Label>
                                <p className="text-sm font-medium">{renderValue(ext.duracion_contrato_meses)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Fecha vencimiento</Label>
                                <p className="text-sm font-medium">{renderValue(ext.fecha_vencimiento)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Preaviso días</Label>
                                <p className="text-sm font-medium">{renderValue(ext.preaviso_no_renovacion_dias)}</p>
                              </div>
                            </div>
                            <div className="flex gap-4 mt-2">
                              <p className="text-xs">Renovación auto: {renderValue(ext.renovacion_automatica)}</p>
                              <p className="text-xs">Cláusula salida: {renderValue(ext.clausula_salida)}</p>
                            </div>
                          </div>

                          {/* Volúmenes */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">📦 Volúmenes</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Vol. comprometido</Label>
                                <p className="text-sm font-medium">{renderValue(ext.volumen_comprometido_anual)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Banda mín</Label>
                                <p className="text-sm font-medium">{renderValue(ext.banda_volumen_min)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Banda máx</Label>
                                <p className="text-sm font-medium">{renderValue(ext.banda_volumen_max)}</p>
                              </div>
                            </div>
                            <p className="text-xs mt-2">Take-or-pay: {renderValue(ext.take_or_pay)}</p>
                          </div>

                          {/* Revisión precios */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">📊 Revisión de precios</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Fórmula revisión</Label>
                                <p className="text-sm font-medium">{renderValue(ext.formula_revision_existe)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Índice</Label>
                                <p className="text-sm font-medium">{renderValue(ext.indice_vinculado)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Frecuencia</Label>
                                <p className="text-sm font-medium">{renderValue(ext.frecuencia_revision)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Simetría</Label>
                                <p className="text-sm font-medium">{renderValue(ext.simetria_subida_bajada)}</p>
                              </div>
                            </div>
                            {ext.formula_revision_detalle && (
                              <p className="text-xs mt-1 text-muted-foreground italic">{ext.formula_revision_detalle}</p>
                            )}
                          </div>

                          {/* Servicio y logística */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">🔧 Servicio y logística</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <p>Rappel: {renderValue(ext.rappel_existe)}</p>
                              <p>Stock consigna: {renderValue(ext.stock_consigna)}</p>
                              <p>Envases incl.: {renderValue(ext.coste_envases_incluido)}</p>
                              <p>Serv. técnico: {renderValue(ext.servicio_tecnico_incluido)}</p>
                              <p>Comodato: {renderValue(ext.equipos_comodato)}</p>
                              <p>MFN: {renderValue(ext.clausula_mfn)}</p>
                            </div>
                          </div>

                          {/* Apply button */}
                          <div className="flex justify-end pt-2 border-t">
                            <Button size="sm" onClick={handleAutoFill} className="bg-[#307177] hover:bg-[#307177]/90 text-white">
                              <ClipboardList className="w-3 h-3 mr-1" />
                              {auditEmpty ? 'Rellenar campos del proveedor' : 'Actualizar campos del proveedor'}
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              });
            })()}

            {/* Datos consolidados del proveedor (editables) */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Ficha de condiciones del proveedor
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Estos son los datos oficiales del proveedor que se usarán en el análisis. Puedes rellenarlos automáticamente desde cualquier contrato o editarlos manualmente.
              </p>

              {/* Context bar: which contract data comes from */}
              {activeDocId && activeDocName && (
                <div className="mb-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200">
                      Datos cargados desde: <strong>{activeDocName}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-green-700 dark:text-green-300 h-7"
                    onClick={() => { setActiveDocId(null); setActiveDocName(null); }}
                  >
                    Desmarcar
                  </Button>
                </div>
              )}

              <Card className="mb-3">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{completion.completed} de {completion.total} campos completados</span>
                    <Progress value={completionPct} className="flex-1 h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Sección Pago */}
              <Collapsible defaultOpen>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">💰 Pago</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Plazo pago días</Label>
                          <Input type="number" value={currentAudit.plazo_pago_dias ?? ''} onChange={e => updateField('plazo_pago_dias', e.target.value ? parseInt(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-xs">Pronto pago descuento %</Label>
                          <Input type="number" step="0.1" value={currentAudit.pronto_pago_descuento_pct ?? ''} onChange={e => updateField('pronto_pago_descuento_pct', e.target.value ? parseFloat(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-xs">Pronto pago días</Label>
                          <Input type="number" value={currentAudit.pronto_pago_dias ?? ''} onChange={e => updateField('pronto_pago_dias', e.target.value ? parseInt(e.target.value) : null)} />
                        </div>
                      </div>
                      {currentAudit.pronto_pago_descuento_pct && currentAudit.pronto_pago_dias && (
                        (() => {
                          const tae = calcTAE(currentAudit.pronto_pago_descuento_pct, currentAudit.plazo_pago_dias, currentAudit.pronto_pago_dias);
                          if (tae === null) return null;
                          const compensa = tae < 7;
                          return (
                            <div className={`p-2 rounded text-xs ${compensa ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'}`}>
                              TAE anualizada: {tae.toFixed(1)}% → {compensa ? '✓ Compensa' : '✕ No compensa'}
                            </div>
                          );
                        })()
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Duración */}
              <Collapsible defaultOpen>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">📅 Duración</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Duración meses</Label>
                          <Input type="number" value={currentAudit.duracion_contrato_meses ?? ''} onChange={e => updateField('duracion_contrato_meses', e.target.value ? parseInt(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-xs">Fecha vencimiento</Label>
                          <Input type="date" value={currentAudit.fecha_vencimiento ?? ''} onChange={e => updateField('fecha_vencimiento', e.target.value || null)} />
                          {venceSoon(currentAudit.fecha_vencimiento) && <Badge variant="destructive" className="mt-1 text-[10px]">VENCE PRONTO</Badge>}
                        </div>
                        <div>
                          <Label className="text-xs">Preaviso días</Label>
                          <Input type="number" value={currentAudit.preaviso_no_renovacion_dias ?? ''} onChange={e => updateField('preaviso_no_renovacion_dias', e.target.value ? parseInt(e.target.value) : null)} />
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Switch checked={!!currentAudit.renovacion_automatica} onCheckedChange={v => updateField('renovacion_automatica', v)} />
                          <Label className="text-xs">Renovación automática</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={!!currentAudit.clausula_salida} onCheckedChange={v => updateField('clausula_salida', v)} />
                          <Label className="text-xs">Cláusula salida</Label>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Volúmenes */}
              <Collapsible>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">📦 Volúmenes</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Vol. comprometido anual</Label>
                          <Input type="number" value={currentAudit.volumen_comprometido_anual ?? ''} onChange={e => updateField('volumen_comprometido_anual', e.target.value ? parseFloat(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-xs">Banda mín</Label>
                          <Input type="number" value={currentAudit.banda_volumen_min ?? ''} onChange={e => updateField('banda_volumen_min', e.target.value ? parseFloat(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-xs">Banda máx</Label>
                          <Input type="number" value={currentAudit.banda_volumen_max ?? ''} onChange={e => updateField('banda_volumen_max', e.target.value ? parseFloat(e.target.value) : null)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.take_or_pay} onCheckedChange={v => updateField('take_or_pay', v)} />
                        <Label className="text-xs">Take-or-pay</Label>
                      </div>
                      {currentAudit.take_or_pay && (
                        <div>
                          <Label className="text-xs">Detalle penalización</Label>
                          <Textarea value={currentAudit.penalizacion_take_or_pay ?? ''} onChange={e => updateField('penalizacion_take_or_pay', e.target.value)} className="h-16" />
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Revisión de precios */}
              <Collapsible>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">📊 Revisión de precios</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.formula_revision_existe} onCheckedChange={v => updateField('formula_revision_existe', v)} />
                        <Label className="text-xs">Existe fórmula de revisión</Label>
                      </div>
                      {currentAudit.formula_revision_existe && (
                        <>
                          <div>
                            <Label className="text-xs">Detalle fórmula</Label>
                            <Textarea value={currentAudit.formula_revision_detalle ?? ''} onChange={e => updateField('formula_revision_detalle', e.target.value)} className="h-16" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Índice vinculado</Label>
                              <Input value={currentAudit.indice_vinculado ?? ''} onChange={e => updateField('indice_vinculado', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Frecuencia revisión</Label>
                              <Select value={currentAudit.frecuencia_revision ?? ''} onValueChange={v => updateField('frecuencia_revision', v)}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mensual">Mensual</SelectItem>
                                  <SelectItem value="trimestral">Trimestral</SelectItem>
                                  <SelectItem value="semestral">Semestral</SelectItem>
                                  <SelectItem value="anual">Anual</SelectItem>
                                  <SelectItem value="ninguna">Ninguna</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!currentAudit.simetria_subida_bajada} onCheckedChange={v => updateField('simetria_subida_bajada', v)} />
                            <Label className="text-xs">Simetría subida/bajada</Label>
                          </div>
                          {!currentAudit.simetria_subida_bajada && currentAudit.formula_revision_existe && (
                            <div className="p-2 rounded text-xs bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                              ⚠ Fórmula asimétrica: las subidas se aplican diferente que las bajadas
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Cap subida %</Label>
                              <Input type="number" step="0.1" value={currentAudit.cap_subida_pct ?? ''} onChange={e => updateField('cap_subida_pct', e.target.value ? parseFloat(e.target.value) : null)} />
                            </div>
                            <div>
                              <Label className="text-xs">Floor bajada %</Label>
                              <Input type="number" step="0.1" value={currentAudit.floor_bajada_pct ?? ''} onChange={e => updateField('floor_bajada_pct', e.target.value ? parseFloat(e.target.value) : null)} />
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Rappels */}
              <Collapsible>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">💸 Rappels</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.rappel_existe} onCheckedChange={v => updateField('rappel_existe', v)} />
                        <Label className="text-xs">Existe rappel</Label>
                      </div>
                      {currentAudit.rappel_existe && (
                        <>
                          <div>
                            <Label className="text-xs">Detalle rappel</Label>
                            <Textarea value={currentAudit.rappel_detalle ?? ''} onChange={e => updateField('rappel_detalle', e.target.value)} className="h-16" />
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <Switch checked={!!currentAudit.rappel_cobrado} onCheckedChange={v => updateField('rappel_cobrado', v)} />
                                  <Label className="text-xs">¿Se cobra realmente?</Label>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Muchos clientes tienen rappels pactados que nunca facturan</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {currentAudit.rappel_existe && !currentAudit.rappel_cobrado && (
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="text-sm font-medium">RAPPEL PACTADO NO COBRADO — Ahorro inmediato</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Logística y envases */}
              <Collapsible>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">🚛 Logística y envases</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.stock_consigna} onCheckedChange={v => updateField('stock_consigna', v)} />
                        <Label className="text-xs">Stock en consigna</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Gestión envases vacíos</Label>
                        <Select value={currentAudit.gestion_envases_vacios ?? ''} onValueChange={v => updateField('gestion_envases_vacios', v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="devolucion_proveedor">Devolución proveedor</SelectItem>
                            <SelectItem value="gestion_cliente_residuo">Gestión cliente como residuo</SelectItem>
                            <SelectItem value="sin_definir">Sin definir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.coste_envases_incluido} onCheckedChange={v => updateField('coste_envases_incluido', v)} />
                        <Label className="text-xs">Coste envases incluido</Label>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Servicio */}
              <Collapsible>
                <Card className="mb-3">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">🔧 Servicio</CardTitle>
                      <ChevronDown className="w-4 h-4" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.servicio_tecnico_incluido} onCheckedChange={v => updateField('servicio_tecnico_incluido', v)} />
                        <Label className="text-xs">Servicio técnico incluido</Label>
                      </div>
                      {currentAudit.servicio_tecnico_incluido && (
                        <div>
                          <Label className="text-xs">Detalle servicio</Label>
                          <Input value={currentAudit.detalle_servicio_tecnico ?? ''} onChange={e => updateField('detalle_servicio_tecnico', e.target.value)} />
                        </div>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Switch checked={!!currentAudit.equipos_comodato} onCheckedChange={v => updateField('equipos_comodato', v)} />
                              <Label className="text-xs">Equipos en comodato</Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Bombas, dosificadores cedidos. Atan al cliente al proveedor.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {currentAudit.equipos_comodato && (
                        <div>
                          <Label className="text-xs">Detalle comodato</Label>
                          <Input value={currentAudit.detalle_comodato ?? ''} onChange={e => updateField('detalle_comodato', e.target.value)} />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch checked={!!currentAudit.clausula_mfn} onCheckedChange={v => updateField('clausula_mfn', v)} />
                        <Label className="text-xs">Cláusula MFN</Label>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Sección Scoring */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">⭐ Scoring</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {(['score_precio', 'score_condiciones', 'score_servicio', 'score_logistica'] as const).map(field => (
                      <div key={field}>
                        <Label className="text-xs capitalize">{field.replace('score_', '')}</Label>
                        <Select value={currentAudit[field]?.toString() ?? ''} onValueChange={v => {
                          updateField(field, parseFloat(v));
                        }}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-2">
                    <span className="text-2xl font-bold">{scoreMedia ? scoreMedia.toFixed(1) : '—'}</span>
                    <span className="text-sm text-muted-foreground ml-2">media</span>
                    {scoreMedia != null && scoreMedia < 2.5 && (
                      <p className="text-red-600 text-sm font-semibold mt-1">PRIORIDAD RENEGOCIACIÓN</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Facturas */}
          <TabsContent value="facturas">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Facturas</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-4 h-4 mr-1" /> Subir facturas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Suba PDFs de facturas en la pestaña Documentos y luego lance la extracción con el botón inferior.
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={handleExtractInvoices}
                    disabled={extractingInvoices || !hasDocsReadyForExtraction}
                    className="border-[#32b4cd] text-[#32b4cd] hover:bg-[#32b4cd]/10"
                    variant="outline"
                  >
                    {extractingInvoices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                    Extraer datos de facturas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Vista principal: cards de proveedores
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Auditoría Contractual</h2>
        <Button size="sm" onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Añadir proveedor
        </Button>
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay auditorías de proveedores. Añade uno para empezar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audits.map((audit: any) => {
            const auditScoreMedia = calcScoreMedia(audit);
            return (
              <Card key={audit.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedAudit(audit.id)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{getSupplierName(audit)}</h3>
                    {auditScoreMedia != null && (
                      <span className={`text-lg font-bold ${auditScoreMedia < 2.5 ? 'text-red-600' : auditScoreMedia < 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {auditScoreMedia.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {getScoreBar(audit.score_precio, 'Precio')}
                    {getScoreBar(audit.score_condiciones, 'Condiciones')}
                    {getScoreBar(audit.score_servicio, 'Servicio')}
                    {getScoreBar(audit.score_logistica, 'Logística')}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {auditScoreMedia != null && auditScoreMedia < 2.5 && (
                      <Badge variant="destructive" className="text-[10px]">PRIORIDAD RENEGOCIACIÓN</Badge>
                    )}
                    {audit.rappel_existe && !audit.rappel_cobrado && (
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-[10px]">RAPPEL NO COBRADO</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nuevo proveedor */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir proveedor</DialogTitle></DialogHeader>
          <div>
            <Label>Nombre del proveedor</Label>
            <Input value={newProveedorNombre} onChange={e => setNewProveedorNombre(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
            <Button onClick={() => { if (newProveedorNombre.trim()) createAuditMutation.mutate(newProveedorNombre); }} disabled={createAuditMutation.isPending}>
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
