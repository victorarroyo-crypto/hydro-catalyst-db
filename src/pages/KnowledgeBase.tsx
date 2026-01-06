import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, Search, FileText, Loader2, Trash2, BookOpen, MessageSquare, 
  AlertCircle, HardDrive, Eye, Download, Pencil, Check, X, Sparkles, 
  RefreshCw, DollarSign, Info, Globe, TrendingUp, Star, MapPin, 
  Building2, ExternalLink, Calendar, Plus, RotateCcw, Edit
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { splitPdfIfNeeded } from "@/hooks/usePdfSplitter";
import { getModelPricing, formatCost, estimateCostFromTotal } from "@/lib/aiModelPricing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Types
interface KnowledgeDocument {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  status: string;
  chunk_count: number;
  created_at: string;
  description: string | null;
}

interface ScoutingSource {
  id: string;
  nombre: string;
  url: string;
  tipo: string | null;
  descripcion: string | null;
  pais: string | null;
  sector_foco: string | null;
  tecnologias_foco: string | null;
  frecuencia_escaneo: string | null;
  ultima_revision: string | null;
  proxima_revision: string | null;
  tecnologias_encontradas: number;
  calidad_score: number | null;
  activo: boolean;
  notas: string | null;
  created_at: string;
}

interface CaseStudy {
  id: string;
  name: string;
  description: string | null;
  entity_type: string | null;
  country: string | null;
  sector: string | null;
  technology_types: string[] | null;
  original_data: Record<string, unknown> | null;
  source_technology_id: string | null;
  created_at: string;
}

interface TechnologicalTrend {
  id: string;
  name: string;
  description: string | null;
  technology_type: string;
  subcategory: string | null;
  sector: string | null;
  created_at: string;
  source_technology_id: string | null;
  original_data: Record<string, unknown> | null;
}

interface QueryResult {
  answer: string;
  sources: Array<{
    documentName: string;
    documentId: string;
    preview: string;
  }>;
}

const TIPO_OPTIONS = [
  { value: 'directorio', label: 'Directorio' },
  { value: 'feria', label: 'Feria' },
  { value: 'revista', label: 'Revista' },
  { value: 'aceleradora', label: 'Aceleradora' },
  { value: 'asociacion', label: 'Asociación' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'otro', label: 'Otro' },
];

const FRECUENCIA_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
];

const SECTOR_FOCO_OPTIONS = [
  { value: 'municipal', label: 'Municipal' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'ambos', label: 'Ambos' },
];

export default function KnowledgeBase() {
  const { profile } = useAuth();
  const userRole = profile?.role;
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  // Get section from URL or default to 'documents'
  const sectionFromUrl = searchParams.get('section') as 'documents' | 'sources' | 'cases' | 'trends' | null;
  const [activeSection, setActiveSection] = useState<'documents' | 'sources' | 'cases' | 'trends'>(sectionFromUrl || 'documents');
  
  // Update section when URL changes
  useEffect(() => {
    if (sectionFromUrl && ['documents', 'sources', 'cases', 'trends'].includes(sectionFromUrl)) {
      setActiveSection(sectionFromUrl);
    }
  }, [sectionFromUrl]);
  
  // Documents state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [querying, setQuerying] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [generatingDescId, setGeneratingDescId] = useState<string | null>(null);
  const [lastQueryCost, setLastQueryCost] = useState<number | null>(null);
  
  // Sources state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ScoutingSource | null>(null);
  const [sourceForm, setSourceForm] = useState({
    nombre: '',
    url: '',
    tipo: '',
    descripcion: '',
    pais: '',
    sector_foco: '',
    frecuencia_escaneo: '',
    calidad_score: 3,
    activo: true,
    notas: '',
  });
  
  // Case studies state
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  
  // Trends state
  const [selectedTrend, setSelectedTrend] = useState<TechnologicalTrend | null>(null);

  const canManage = userRole === "admin" || userRole === "supervisor" || userRole === "analyst";
  const isAdmin = userRole === "admin";

  // Get current model for knowledge base
  const { data: modelConfig } = useQuery({
    queryKey: ['knowledge-base-model'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('model')
        .eq('action_type', 'knowledge_base')
        .single();
      
      if (error) return 'google/gemini-2.5-flash';
      return data?.model || 'google/gemini-2.5-flash';
    },
  });

  const pricing = getModelPricing(modelConfig || 'google/gemini-2.5-flash');
  const estimatedCostMin = (3000 * 0.6 * pricing.input + 3000 * 0.4 * pricing.output) / 1_000_000;
  const estimatedCostMax = (8000 * 0.6 * pricing.input + 8000 * 0.4 * pricing.output) / 1_000_000;

  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

  // Fetch documents
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeDocument[];
    },
  });

  // Fetch scouting sources
  const { data: sources, isLoading: loadingSources } = useQuery({
    queryKey: ["scouting-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouting_sources")
        .select("*")
        .order("calidad_score", { ascending: false });
      
      if (error) throw error;
      return data as ScoutingSource[];
    },
  });

  // Fetch case studies
  const { data: caseStudies, isLoading: loadingCases } = useQuery({
    queryKey: ['case-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos_de_estudio')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CaseStudy[];
    },
  });

  // Fetch trends
  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['technological-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technological_trends')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TechnologicalTrend[];
    },
  });

  // Document mutations
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-docs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: "pending",
        })
        .select()
        .single();

      if (docError) throw docError;

      const { error: processError } = await supabase.functions.invoke(
        "process-knowledge-document",
        { body: { documentId: doc.id } }
      );

      if (processError) {
        console.error("Processing error:", processError);
        toast.error("Documento subido pero hubo un error al procesarlo");
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento subido y en proceso");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Error al subir el documento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: KnowledgeDocument) => {
      await supabase.storage.from("knowledge-docs").remove([doc.file_path]);
      
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar el documento");
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("knowledge_documents")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Nombre actualizado");
      setEditingDocId(null);
      setEditingName("");
    },
    onError: () => {
      toast.error("Error al renombrar el documento");
    },
  });

  // Source mutations
  const saveSourceMutation = useMutation({
    mutationFn: async (data: typeof sourceForm) => {
      if (editingSource) {
        const { error } = await supabase
          .from("scouting_sources")
          .update({
            nombre: data.nombre,
            url: data.url,
            tipo: data.tipo || null,
            descripcion: data.descripcion || null,
            pais: data.pais || null,
            sector_foco: data.sector_foco || null,
            frecuencia_escaneo: data.frecuencia_escaneo || null,
            calidad_score: data.calidad_score,
            activo: data.activo,
            notas: data.notas || null,
          })
          .eq("id", editingSource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scouting_sources")
          .insert({
            nombre: data.nombre,
            url: data.url,
            tipo: data.tipo || null,
            descripcion: data.descripcion || null,
            pais: data.pais || null,
            sector_foco: data.sector_foco || null,
            frecuencia_escaneo: data.frecuencia_escaneo || null,
            calidad_score: data.calidad_score,
            activo: data.activo,
            notas: data.notas || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting-sources"] });
      toast.success(editingSource ? "Fuente actualizada" : "Fuente añadida");
      setShowAddSourceModal(false);
      setEditingSource(null);
      resetSourceForm();
    },
    onError: (error) => {
      toast.error("Error al guardar la fuente");
      console.error(error);
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scouting_sources")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting-sources"] });
      toast.success("Fuente eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar la fuente");
    },
  });

  const resetSourceForm = () => {
    setSourceForm({
      nombre: '',
      url: '',
      tipo: '',
      descripcion: '',
      pais: '',
      sector_foco: '',
      frecuencia_escaneo: '',
      calidad_score: 3,
      activo: true,
      notas: '',
    });
  };

  const handleEditSource = (source: ScoutingSource) => {
    setEditingSource(source);
    setSourceForm({
      nombre: source.nombre,
      url: source.url,
      tipo: source.tipo || '',
      descripcion: source.descripcion || '',
      pais: source.pais || '',
      sector_foco: source.sector_foco || '',
      frecuencia_escaneo: source.frecuencia_escaneo || '',
      calidad_score: source.calidad_score || 3,
      activo: source.activo,
      notas: source.notas || '',
    });
    setShowAddSourceModal(true);
  };

  const handleSaveSource = () => {
    if (!sourceForm.nombre.trim() || !sourceForm.url.trim()) {
      toast.error("Nombre y URL son obligatorios");
      return;
    }
    saveSourceMutation.mutate(sourceForm);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("El archivo no puede superar 100MB");
      return;
    }

    setUploading(true);
    setUploadProgress(null);
    
    try {
      toast.info("Analizando documento...");
      const { parts, totalPages, wasSplit } = await splitPdfIfNeeded(file);
      
      if (wasSplit) {
        toast.info(`Documento dividido en ${parts.length} partes (${totalPages} páginas total)`);
      }
      
      setUploadProgress({ current: 0, total: parts.length });
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        setUploadProgress({ current: i + 1, total: parts.length });
        const partFile = new File([part.blob], part.name, { type: "application/pdf" });
        await uploadMutation.mutateAsync(partFile);
      }
      
      if (wasSplit) {
        toast.success(`${parts.length} partes subidas correctamente`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error al procesar el documento");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // Query handler
  const handleQuery = async () => {
    if (!query.trim()) return;

    setQuerying(true);
    setQueryResult(null);
    setLastQueryCost(null);

    try {
      const { data, error } = await supabase.functions.invoke("query-knowledge-base", {
        body: { query: query.trim(), limit: 5 },
      });

      if (error) throw error;

      if (data.success) {
        setQueryResult({
          answer: data.answer,
          sources: data.sources || [],
        });
        
        if (data.usage?.tokens) {
          const queryCost = estimateCostFromTotal(
            data.usage.model || modelConfig || 'google/gemini-2.5-flash', 
            data.usage.tokens
          );
          setLastQueryCost(queryCost);
        } else {
          const estimatedTokens = Math.round(data.answer.length / 4) + 2000;
          const queryCost = estimateCostFromTotal(modelConfig || 'google/gemini-2.5-flash', estimatedTokens);
          setLastQueryCost(queryCost);
        }
      } else {
        toast.error(data.error || "Error al consultar");
      }
    } catch (error) {
      console.error("Query error:", error);
      toast.error("Error al realizar la consulta");
    } finally {
      setQuerying(false);
    }
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-500">Procesado</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500">Procesando</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStars = (score: number | null) => {
    const stars = score || 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
          />
        ))}
      </div>
    );
  };

  const totalStorageUsed = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;
  const storagePercentage = Math.min((totalStorageUsed / STORAGE_LIMIT_BYTES) * 100, 100);
  const storageRemaining = STORAGE_LIMIT_BYTES - totalStorageUsed;

  const getStorageColor = () => {
    if (storagePercentage >= 90) return "bg-destructive";
    if (storagePercentage >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  const filteredCases = caseStudies?.filter(c => 
    !caseSearchQuery || 
    c.name.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(caseSearchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            {activeSection === 'documents' && 'Documentos Técnicos'}
            {activeSection === 'sources' && 'Fuentes de Scouting'}
            {activeSection === 'cases' && 'Casos de Estudio'}
            {activeSection === 'trends' && 'Tendencias Tecnológicas'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeSection === 'documents' && 'Gestión de documentos técnicos y consultas con IA'}
            {activeSection === 'sources' && 'Fuentes de información para scouting tecnológico'}
            {activeSection === 'cases' && 'Casos de estudio y aplicaciones reales'}
            {activeSection === 'trends' && 'Tendencias y evolución tecnológica'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* DOCUMENTS SECTION */}
        {activeSection === 'documents' && (
          <>
            {/* Storage Card */}
            <Card>
              <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Almacenamiento</span>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(totalStorageUsed)} / {formatFileSize(STORAGE_LIMIT_BYTES)}
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${getStorageColor()}`}
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consulta Técnica
              </CardTitle>
              <CardDescription>
                Haz preguntas sobre tratamiento de aguas basadas en los documentos cargados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                <DollarSign className="w-3 h-3" />
                <span>Coste estimado: ~${estimatedCostMin.toFixed(4)}-${estimatedCostMax.toFixed(4)}/consulta</span>
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ej: ¿Cuál es la eficiencia típica de un reactor MBR?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-between items-center">
                <Button onClick={handleQuery} disabled={querying || !query.trim()}>
                  {querying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Consultar
                </Button>
                {lastQueryCost && (
                  <span className="text-xs text-muted-foreground">
                    Coste: ${lastQueryCost.toFixed(4)}
                  </span>
                )}
              </div>

              {queryResult && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Respuesta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{queryResult.answer}</ReactMarkdown>
                    </div>
                    {queryResult.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Fuentes:</p>
                        <div className="space-y-1">
                          {queryResult.sources.map((source, i) => (
                            <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {source.documentName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Documentos Técnicos</CardTitle>
                <CardDescription>PDFs cargados para consultas con IA</CardDescription>
              </div>
              {canManage && (
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label htmlFor="file-upload">
                    <Button asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Subir PDF
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : documents?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay documentos cargados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          {editingDocId === doc.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8"
                              />
                              <Button size="sm" variant="ghost" onClick={() => renameMutation.mutate({ id: doc.id, name: editingName })}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDocId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="font-medium truncate">{doc.name}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>{doc.chunk_count} chunks</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {canManage && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDocId(doc.id); setEditingName(doc.name); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(doc)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

        {/* SOURCES SECTION */}
        {activeSection === 'sources' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Fuentes de Scouting
                </CardTitle>
                <CardDescription>
                  Webs, ferias, directorios y fuentes para descubrir nuevas tecnologías
                </CardDescription>
              </div>
              {canManage && (
                <Button onClick={() => { resetSourceForm(); setEditingSource(null); setShowAddSourceModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Fuente
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingSources ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sources?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay fuentes configuradas</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sources?.map((source) => (
                    <Card key={source.id} className={`relative ${!source.activo ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-1">{source.nombre}</CardTitle>
                          {renderStars(source.calidad_score)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {source.tipo && (
                            <Badge variant="secondary" className="text-xs">
                              {TIPO_OPTIONS.find(t => t.value === source.tipo)?.label || source.tipo}
                            </Badge>
                          )}
                          {source.pais && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-2 h-2 mr-1" />
                              {source.pais}
                            </Badge>
                          )}
                          {!source.activo && (
                            <Badge variant="destructive" className="text-xs">Inactivo</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {source.descripcion && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {source.descripcion}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {source.frecuencia_escaneo && (
                            <span>📅 {FRECUENCIA_OPTIONS.find(f => f.value === source.frecuencia_escaneo)?.label}</span>
                          )}
                          {source.tecnologias_encontradas > 0 && (
                            <span>🔍 {source.tecnologias_encontradas} techs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" asChild>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Visitar
                            </a>
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEditSource(source)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSourceMutation.mutate(source.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CASES SECTION */}
        {activeSection === 'cases' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Casos de Estudio
              </CardTitle>
              <CardDescription>
                Proyectos municipales, corporaciones y casos de implementación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar casos..."
                    value={caseSearchQuery}
                    onChange={(e) => setCaseSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingCases ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay casos de estudio</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCases.map((caseStudy) => (
                    <Card 
                      key={caseStudy.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedCase(caseStudy)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{caseStudy.name}</CardTitle>
                          {caseStudy.entity_type && (
                            <Badge variant="secondary" className="shrink-0 text-xs">{caseStudy.entity_type}</Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          {caseStudy.country && (
                            <>
                              <MapPin className="w-3 h-3" />
                              {caseStudy.country}
                            </>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {caseStudy.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{caseStudy.description}</p>
                        )}
                        {caseStudy.technology_types && caseStudy.technology_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {caseStudy.technology_types.slice(0, 2).map((type, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TRENDS SECTION */}
        {activeSection === 'trends' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencias Tecnológicas
              </CardTitle>
              <CardDescription>
                Categorías y tendencias identificadas en el sector del tratamiento de agua
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTrends ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : trends?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay tendencias registradas</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {trends?.map((trend) => (
                    <Card 
                      key={trend.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedTrend(trend)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2">{trend.name}</CardTitle>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">{trend.technology_type}</Badge>
                          {trend.subcategory && (
                            <Badge variant="outline" className="text-xs">{trend.subcategory}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {trend.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{trend.description}</p>
                        )}
                        {trend.sector && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">Sector:</span> {trend.sector}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Source Modal */}
      <Dialog open={showAddSourceModal} onOpenChange={setShowAddSourceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSource ? 'Editar Fuente' : 'Añadir Fuente de Scouting'}</DialogTitle>
            <DialogDescription>
              Configura una nueva fuente para descubrir tecnologías
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input 
                  value={sourceForm.nombre} 
                  onChange={(e) => setSourceForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="IFAT Munich"
                />
              </div>
              <div className="col-span-2">
                <Label>URL *</Label>
                <Input 
                  value={sourceForm.url} 
                  onChange={(e) => setSourceForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://ifat.de"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={sourceForm.tipo} onValueChange={(v) => setSourceForm(prev => ({ ...prev, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>País</Label>
                <Input 
                  value={sourceForm.pais} 
                  onChange={(e) => setSourceForm(prev => ({ ...prev, pais: e.target.value }))}
                  placeholder="Alemania"
                />
              </div>
              <div>
                <Label>Sector Foco</Label>
                <Select value={sourceForm.sector_foco} onValueChange={(v) => setSourceForm(prev => ({ ...prev, sector_foco: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {SECTOR_FOCO_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frecuencia Escaneo</Label>
                <Select value={sourceForm.frecuencia_escaneo} onValueChange={(v) => setSourceForm(prev => ({ ...prev, frecuencia_escaneo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {FRECUENCIA_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Calidad (1-5)</Label>
                <Select value={String(sourceForm.calidad_score)} onValueChange={(v) => setSourceForm(prev => ({ ...prev, calidad_score: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} ⭐</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={sourceForm.activo} 
                  onCheckedChange={(c) => setSourceForm(prev => ({ ...prev, activo: c }))} 
                />
                <Label>Activo</Label>
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={sourceForm.descripcion} 
                  onChange={(e) => setSourceForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Breve descripción de la fuente..."
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Notas</Label>
                <Textarea 
                  value={sourceForm.notas} 
                  onChange={(e) => setSourceForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas internas..."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSourceModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveSource} disabled={saveSourceMutation.isPending}>
              {saveSourceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case Study Detail Modal */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCase.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {selectedCase.country && (
                    <>
                      <MapPin className="w-3 h-3" />
                      {selectedCase.country}
                    </>
                  )}
                  {selectedCase.entity_type && (
                    <Badge variant="secondary">{selectedCase.entity_type}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="space-y-4">
                {selectedCase.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                  </div>
                )}
                {selectedCase.sector && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Sector</h4>
                    <p className="text-sm text-muted-foreground">{selectedCase.sector}</p>
                  </div>
                )}
                {selectedCase.technology_types && selectedCase.technology_types.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Tipos de Tecnología</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedCase.technology_types.map((type, i) => (
                        <Badge key={i} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Trend Detail Modal */}
      <Dialog open={!!selectedTrend} onOpenChange={(open) => !open && setSelectedTrend(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTrend && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedTrend.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{selectedTrend.technology_type}</Badge>
                  {selectedTrend.subcategory && (
                    <Badge variant="outline">{selectedTrend.subcategory}</Badge>
                  )}
                </div>
              </DialogHeader>
              <Separator />
              <div className="space-y-4">
                {selectedTrend.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedTrend.description}</p>
                  </div>
                )}
                {selectedTrend.sector && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Sector</h4>
                    <p className="text-sm text-muted-foreground">{selectedTrend.sector}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}