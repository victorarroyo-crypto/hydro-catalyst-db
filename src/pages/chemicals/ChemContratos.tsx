import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { API_URL } from '@/lib/api';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
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
import { ChemInvoicesTab } from '@/components/chemicals/invoices';
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
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTipo, setUploadTipo] = useState('contrato_formal');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_BATCH_FILES = 10;
  const [extractingContracts, setExtractingContracts] = useState(false);
  const [extractingInvoices, setExtractingInvoices] = useState(false);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocName, setActiveDocName] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const invoicePollingRef = useRef<NodeJS.Timeout | null>(null);
  const [invoicePollingActive, setInvoicePollingActive] = useState(false);

  // Query audits via Railway API
  const { data: audits = [] } = useQuery({
    queryKey: ['chem-audits', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/chem-consulting/projects/${projectId}/audits`);
      if (!res.ok) throw new Error('Error cargando auditorías');
      const json = await res.json();
      return Array.isArray(json) ? json : (json.audits ?? json.data ?? []);
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

  // All project documents (for Facturas tab - project-wide view)
  const { data: allProjectDocs = [] } = useQuery({
    queryKey: ['chem-all-project-docs', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_contract_documents')
        .select('id, nombre_archivo, tipo_documento, estado_extraccion, datos_extraidos, created_at, audit_id, chem_contract_audits(supplier_id, chem_suppliers(nombre))')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Products for this project (needed to filter price history)
  const { data: projectProducts = [] } = useQuery({
    queryKey: ['chem-products-for-history', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_products')
        .select('id, nombre_comercial')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const productIds = projectProducts.map((p: any) => p.id);

  // Price history (extracted invoice data) - filtered by product IDs
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['chem-price-history', projectId, productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await externalSupabase
        .from('chem_price_history')
        .select('*, chem_products(nombre_comercial)')
        .in('product_id', productIds)
        .order('mes', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  // Creating an audit: first create supplier, then audit referencing supplier_id
  const createAuditMutation = useMutation({
    mutationFn: async (nombre: string) => {
      const res = await fetch(`${API_URL}/api/chem-consulting/projects/${projectId}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proveedor_nombre: nombre }),
      });
      if (!res.ok) throw new Error('Error al crear auditoría');
      return res.json();
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
      const res = await fetch(`${API_URL}/api/chem-consulting/projects/${projectId}/audits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      return res.json();
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
      if (invoicePollingRef.current) clearInterval(invoicePollingRef.current);
    };
  }, []);

  // Dedicated invoice polling: invalidates chem-invoices queries until data appears
  const startInvoicePolling = useCallback(() => {
    if (invoicePollingRef.current) clearInterval(invoicePollingRef.current);
    setInvoicePollingActive(true);
    invoicePollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/invoices`);
        if (res.ok) {
          const data = await res.json();
          const invoices = data.invoices || data || [];
          // Invalidate to refresh UI
          queryClient.invalidateQueries({ queryKey: ['chem-invoices', projectId] });
          queryClient.invalidateQueries({ queryKey: ['chem-invoice-alerts', projectId] });
          queryClient.invalidateQueries({ queryKey: ['chem-invoice-summary', projectId] });
          queryClient.invalidateQueries({ queryKey: ['chem-all-project-docs', projectId] });
          if (invoices.length > 0) {
            if (invoicePollingRef.current) clearInterval(invoicePollingRef.current);
            setInvoicePollingActive(false);
            toast.success(`${invoices.length} factura${invoices.length > 1 ? 's' : ''} procesada${invoices.length > 1 ? 's' : ''} correctamente`);
          }
        }
      } catch { /* ignore fetch errors during polling */ }
    }, 5000);
    // Max 3 minutes
    setTimeout(() => {
      if (invoicePollingRef.current) {
        clearInterval(invoicePollingRef.current);
        setInvoicePollingActive(false);
        toast.info('Tiempo de espera agotado. Recarga la página para ver si hay facturas procesadas.');
      }
    }, 180000);
  }, [projectId, queryClient]);

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
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/extract-contracts`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al iniciar extracción');
      const result = await res.json();
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
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/extract-contracts?document_id=${docId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al iniciar extracción');
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
      queryClient.invalidateQueries({ queryKey: ['chem-all-project-docs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chem-price-history', projectId] });
      startInvoicePolling();
    } catch {
      toast.error('No se pudo iniciar la extracción de facturas');
    } finally {
      setExtractingInvoices(false);
    }
  };

  // Robust helper to distinguish invoices from contracts
  const isInvoiceDoc = (doc: any): boolean => {
    const nombre = (doc.nombre_archivo || doc.nombre || '').toLowerCase();
    // 1. tipo_documento === 'otro' with invoice-like name
    if (doc.tipo_documento === 'otro' && nombre.includes('factura')) return true;
    // 2. raw_text contains invoice indicators
    const rawText = (doc.datos_extraidos?.raw_text || '').toUpperCase();
    if (rawText.includes('FACTURA') && (rawText.includes('IVA') || rawText.includes('BASE IMPONIBLE'))) {
      // But exclude if it also has contract-specific fields
      const hasContractFields = doc.datos_extraidos?.duracion_contrato_meses || doc.datos_extraidos?.clausula_salida;
      if (!hasContractFields) return true;
    }
    // 3. Known contract types are never invoices
    const contractTypes = ['contrato_formal', 'condiciones_generales', 'email_tarifa', 'oferta_aceptada', 'adenda'];
    if (contractTypes.includes(doc.tipo_documento)) return false;
    // 4. tipo_documento === 'otro' without invoice indicators → not invoice
    return false;
  };

  // Helpers for document status
  const isPhase1Complete = (doc: any) => doc.estado_extraccion === 'completado' && doc.datos_extraidos?.raw_text;
  const isPhase2Complete = (doc: any) => doc.datos_extraidos?.supplier_name;
  const hasDocsReadyForExtraction = documents.some((d: any) => isPhase1Complete(d) && !isPhase2Complete(d));
  const hasDocsForInvoiceExtraction = documents.some((d: any) => isPhase1Complete(d));
  const hasProjectDocsForExtraction = allProjectDocs.some((d: any) => d.estado_extraccion === 'completado' && d.datos_extraidos);

  const openUploadForInvoices = () => {
    setUploadTipo('otro');
    setShowUploadModal(true);
  };


  const uploadSingleFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_documento', uploadTipo);
    if (selectedAudit) {
      formData.append('audit_id', selectedAudit);
    }
    const response = await fetch(
      `${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/documents`,
      { method: 'POST', body: formData }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error subiendo ${file.name}`);
    }
  };

  const handleUploadDocument = async () => {
    if (!projectId) return;
    const isInvoiceBatch = uploadTipo === 'otro' && uploadFiles.length > 0;
    const filesToUpload = isInvoiceBatch ? uploadFiles : (uploadFile ? [uploadFile] : []);
    if (filesToUpload.length === 0) return;
    if (uploadTipo !== 'otro' && !selectedAudit) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadProgress({ current: i + 1, total: filesToUpload.length });
      try {
        await uploadSingleFile(filesToUpload[i]);
        successCount++;
      } catch (err: any) {
        errorCount++;
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          toast.error(`${filesToUpload[i].name}: No se pudo conectar con el servidor.`);
        } else {
          toast.error(`${filesToUpload[i].name}: ${err.message}`);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['chem-contract-docs', projectId, selectedAudit] });
    if (successCount > 0) {
      toast.success(`${successCount} factura${successCount > 1 ? 's' : ''} subida${successCount > 1 ? 's' : ''} correctamente${errorCount > 0 ? ` (${errorCount} con error)` : ''}`);
    }
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadFiles([]);
    setUploadTipo('otro');
    setUploadProgress({ current: 0, total: 0 });
    setUploading(false);
  };

  const currentAudit = audits.find((a: any) => a.id === selectedAudit);

  // Helper to get supplier name from joined data
  const getSupplierName = (audit: any) => audit?.chem_suppliers?.nombre || audit?.proveedor_nombre || audit?.supplier_name || '—';

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

          {/* Documentos (solo contratos, sin facturas) */}
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
                {(() => {
                  const contractDocs = documents.filter((d: any) => !isInvoiceDoc(d));
                  if (contractDocs.length === 0) return (
                    <div className="text-center py-8 space-y-2">
                      <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No hay documentos de contrato subidos.</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowUploadModal(true)}>
                        <Upload className="w-4 h-4 mr-1" /> Subir primer documento
                      </Button>
                    </div>
                  );
                  return (
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
                        {contractDocs.map((d: any) => {
                          const hasPhase2 = d.datos_extraidos?.supplier_name;
                          return (
                            <React.Fragment key={d.id}>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setExpandedDocId(expandedDocId === d.id ? null : d.id)}
                              >
                                <TableCell className="text-xs font-medium">{d.nombre_archivo || d.nombre}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {d.tipo_documento === 'contrato_formal' ? 'Contrato' :
                                     d.tipo_documento === 'condiciones_generales' ? 'Condiciones' :
                                     d.tipo_documento === 'email_tarifa' ? 'Email' :
                                     d.tipo_documento === 'oferta_aceptada' ? 'Oferta' :
                                     d.tipo_documento === 'adenda' ? 'Adenda' : 'Otro'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {d.estado_extraccion === 'completado' ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                    ) : d.estado_extraccion === 'error' ? (
                                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <span className="text-xs">{d.estado_extraccion || 'pendiente'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {hasPhase2 ? (
                                    <Badge className="bg-[#307177]/10 text-[#307177] border-[#307177]/30 text-[10px]">
                                      Cláusulas extraídas
                                    </Badge>
                                  ) : d.datos_extraidos?.raw_text ? (
                                    <Badge variant="secondary" className="text-[10px]">Solo texto</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {d.confianza_extraccion != null ? (
                                    <span className="text-xs font-mono">{(d.confianza_extraccion * 100).toFixed(0)}%</span>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy', { locale: es }) : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {d.file_url && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                        <a href={d.file_url.replace('storage://', `${RAILWAY_URL}/api/chem-consulting/storage/`)} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </Button>
                                    )}
                                    {d.datos_extraidos?.raw_text && !hasPhase2 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-[#307177]"
                                        onClick={(e) => { e.stopPropagation(); handleExtractSingleDoc(d.id); }}
                                        disabled={extractingDocId === d.id}
                                      >
                                        {extractingDocId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(d.id); }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {expandedDocId === d.id && d.datos_extraidos && (
                                <TableRow>
                                  <TableCell colSpan={7} className="bg-muted/30 p-4">
                                    <div className="space-y-3">
                                      {hasPhase2 && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                          <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{d.datos_extraidos.supplier_name}</span></div>
                                          <div><span className="text-muted-foreground">Plazo pago:</span> <span className="font-medium">{d.datos_extraidos.plazo_pago_dias ?? '—'} días</span></div>
                                          <div><span className="text-muted-foreground">Duración:</span> <span className="font-medium">{d.datos_extraidos.duracion_contrato_meses ?? '—'} meses</span></div>
                                          <div><span className="text-muted-foreground">Vencimiento:</span> <span className="font-medium">{d.datos_extraidos.fecha_vencimiento ?? '—'}</span></div>
                                        </div>
                                      )}

                                      {d.datos_extraidos?.productos_mencionados?.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-semibold mb-1">Productos mencionados</h4>
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
                  );
                })()}
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
              </div>
            )}

          </TabsContent>

          {/* Condiciones */}
          <TabsContent value="condiciones" className="space-y-4">
            {/* Per-document extracted sections */}
            {(() => {
              const docsWithData = documents.filter((d: any) => d.datos_extraidos?.supplier_name && !isInvoiceDoc(d));
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
                  <Collapsible
                    key={docWithData.id}
                    open={activeDocId === docWithData.id}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setActiveDocId(docWithData.id);
                        setActiveDocName(docWithData.nombre_archivo || docWithData.nombre || ext.supplier_name);
                      } else {
                        setActiveDocId(null);
                        setActiveDocName(null);
                      }
                    }}
                  >
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
                {activeDocName
                  ? `Ficha de condiciones de ${documents.find((d: any) => d.id === activeDocId)?.datos_extraidos?.supplier_name || activeDocName}`
                  : 'Ficha de condiciones del proveedor'}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Estos son los datos oficiales del proveedor que se usarán en el análisis. Puedes rellenarlos automáticamente desde cualquier contrato o editarlos manualmente.
              </p>

              {/* Context bar: which contract data comes from */}
              {activeDocId && activeDocName && (
                <div className="mb-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    Proveedor: <strong>{documents.find((d: any) => d.id === activeDocId)?.datos_extraidos?.supplier_name || '—'}</strong>
                    {' | '}Documento: <strong>{activeDocName}</strong>
                  </span>
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
                        <>
                          <div>
                            <Label className="text-xs">Detalle penalización</Label>
                            <Textarea value={currentAudit.penalizacion_take_or_pay ?? ''} onChange={e => updateField('penalizacion_take_or_pay', e.target.value)} className="h-16" />
                          </div>
                          {!currentAudit.banda_volumen_min && (
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200 text-xs">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              ⚠️ Take-or-Pay sin banda de flexibilidad. Riesgo de penalización si baja el consumo. Ver Manual Cap. 6.3
                            </div>
                          )}
                        </>
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
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200 text-xs">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              ⚠️ Cláusula de revisión asimétrica. El precio sube con el índice pero no baja. Negociar simetría.
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
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200 text-xs">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              ⚠️ Rappel no cobrado. Verificar con proveedor si se ha emitido nota de abono.
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
                  <CardTitle className="text-sm">⭐ Scoring (1-4)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { field: 'score_precio', label: 'Precio', low: 'Caro', high: 'Competitivo' },
                      { field: 'score_condiciones', label: 'Condiciones', low: 'Rígidas', high: 'Flexibles' },
                      { field: 'score_servicio', label: 'Servicio', low: 'Básico', high: 'Excelente' },
                      { field: 'score_logistica', label: 'Logística', low: 'Deficiente', high: 'Óptima' },
                    ] as const).map(({ field, label, low, high }) => (
                      <div key={field}>
                        <Label className="text-xs">{label} <span className="text-muted-foreground">({low} → {high})</span></Label>
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

                  {/* Radar Chart */}
                  {scoreMedia != null && (
                    <div className="flex flex-col items-center pt-2">
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={[
                          { axis: 'Precio', value: currentAudit.score_precio || 0, fullMark: 4 },
                          { axis: 'Condiciones', value: currentAudit.score_condiciones || 0, fullMark: 4 },
                          { axis: 'Servicio', value: currentAudit.score_servicio || 0, fullMark: 4 },
                          { axis: 'Logística', value: currentAudit.score_logistica || 0, fullMark: 4 },
                        ]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="axis" className="text-xs" />
                          <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} className="text-xs" />
                          <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <span className="text-2xl font-bold">{scoreMedia ? scoreMedia.toFixed(1) : '—'}</span>
                    <span className="text-sm text-muted-foreground ml-2">media</span>
                    {scoreMedia != null && scoreMedia < 2.5 && (
                      <p className="text-destructive text-sm font-semibold mt-1">PRIORIDAD RENEGOCIACIÓN</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Facturas — nuevo sistema v2 */}
          <TabsContent value="facturas" className="space-y-4">
            {/* Documentos de factura subidos */}
            {/* Compact invoice PDFs + upload + extract buttons */}
            {(() => {
              const invoiceDocs = documents.filter((d: any) => isInvoiceDoc(d));
              const hasExtractable = invoiceDocs.some((d: any) => d.estado_extraccion === 'completado');
              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          PDFs de facturas ({invoiceDocs.length})
                        </CardTitle>
                        <div className="flex gap-2">
                          {hasExtractable && (
                            <Button
                              size="sm"
                              onClick={handleExtractInvoices}
                              disabled={extractingInvoices}
                              className="bg-[#32b4cd] hover:bg-[#32b4cd]/90 text-white"
                            >
                              {extractingInvoices ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Receipt className="w-4 h-4 mr-1" />}
                              Extraer datos
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={openUploadForInvoices}>
                            <Upload className="w-4 h-4 mr-1" /> Subir factura
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {invoiceDocs.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {invoiceDocs.map((d: any) => (
                            <div key={d.id} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="max-w-[200px] truncate">{d.nombre_archivo || d.nombre}</span>
                              {d.estado_extraccion === 'completado' ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <Clock className="w-3 h-3 text-muted-foreground" />
                              )}
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteDocMutation.mutate(d.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </>
              );
            })()}

            {/* Banner de procesamiento de facturas */}
            {(invoicePollingActive || extractingInvoices) && (
              <Card className="border-[#32b4cd]/30 bg-[#32b4cd]/5">
                <CardContent className="py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#32b4cd]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Extrayendo datos de facturas…</p>
                    <p className="text-xs text-muted-foreground">Railway está procesando los PDFs. Los resultados aparecerán automáticamente.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultados procesados por Railway */}
            <ChemInvoicesTab projectId={projectId!} supplierId={currentAudit?.proveedor_id ?? undefined} />
          </TabsContent>
        </Tabs>

        {/* Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={(open) => { if (!uploading) { setShowUploadModal(open); if (!open) { setUploadFile(null); setUploadFiles([]); } } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{uploadTipo === 'otro' ? 'Subir facturas' : 'Subir documento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {uploadTipo === 'otro' ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Selecciona hasta <strong>{MAX_BATCH_FILES} facturas</strong> a la vez. Se clasificarán automáticamente.
                  </p>
                  <div>
                    <Label>Archivos</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > MAX_BATCH_FILES) {
                          toast.error(`Máximo ${MAX_BATCH_FILES} archivos por lote`);
                          setUploadFiles(files.slice(0, MAX_BATCH_FILES));
                        } else {
                          setUploadFiles(files);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel o imágenes · Máx. {MAX_BATCH_FILES} archivos</p>
                  </div>
                  {uploadFiles.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">{uploadFiles.length} archivo{uploadFiles.length > 1 ? 's' : ''} seleccionado{uploadFiles.length > 1 ? 's' : ''}</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {uploadFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                            <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{f.name}</span>
                            <span className="text-muted-foreground ml-auto flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploading && uploadProgress.total > 1 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subiendo {uploadProgress.current} de {uploadProgress.total}</span>
                        <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                      </div>
                      <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadFiles([]); }} disabled={uploading}>Cancelar</Button>
              <Button 
                onClick={handleUploadDocument} 
                disabled={uploading || (uploadTipo === 'otro' ? uploadFiles.length === 0 : !uploadFile)}
              >
                {uploading 
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Subiendo{uploadProgress.total > 1 ? ` ${uploadProgress.current}/${uploadProgress.total}` : ''}...</>
                  : <><Upload className="w-4 h-4 mr-1" /> Subir{uploadTipo === 'otro' && uploadFiles.length > 1 ? ` ${uploadFiles.length} facturas` : ''}</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
