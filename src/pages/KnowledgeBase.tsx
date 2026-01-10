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
  Building2, ExternalLink, Calendar, Plus, RotateCcw, Edit, LayoutGrid, List,
  Database, ArrowRight, Lightbulb, Send, Play
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
  const [editingDescDocId, setEditingDescDocId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
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
  
  // AI Source Search state
  const [showAISourceSearch, setShowAISourceSearch] = useState(false);
  const [aiSourcePrompt, setAiSourcePrompt] = useState('');
  const [aiSourceFilters, setAiSourceFilters] = useState({
    tipo: '',
    region: '',
    sector: '',
  });
  const [aiSourceResults, setAiSourceResults] = useState<Array<{
    nombre: string;
    url: string;
    descripcion: string;
    tipo: string;
    pais: string;
    sector_foco: string;
  }>>([]);
  const [aiSourceExplanation, setAiSourceExplanation] = useState('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  
  // Case studies state
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  
  // Trends state
  const [selectedTrend, setSelectedTrend] = useState<TechnologicalTrend | null>(null);

  // View mode state for each section
  const [viewMode, setViewMode] = useState<{
    documents: 'grid' | 'list';
    sources: 'grid' | 'list';
    cases: 'grid' | 'list';
    trends: 'grid' | 'list';
  }>({
    documents: 'list',
    sources: 'grid',
    cases: 'grid',
    trends: 'grid',
  });

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

  // AI Source Search handler
  const handleAISourceSearch = async () => {
    if (!aiSourcePrompt.trim() || aiSourcePrompt.trim().length < 5) {
      toast.error("Escribe una descripción de las fuentes que buscas (mínimo 5 caracteres)");
      return;
    }

    setIsSearchingAI(true);
    setAiSourceResults([]);
    setAiSourceExplanation('');

    try {
      const { data, error } = await supabase.functions.invoke('search-scouting-sources', {
        body: {
          prompt: aiSourcePrompt.trim(),
          filters: {
            tipo: aiSourceFilters.tipo || null,
            region: aiSourceFilters.region || null,
            sector: aiSourceFilters.sector || null,
          },
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAiSourceResults(data.sources || []);
      setAiSourceExplanation(data.explanation || '');
      
      if (data.sources?.length > 0) {
        toast.success(`Se encontraron ${data.sources.length} fuentes`);
      } else {
        toast.info("No se encontraron fuentes con esos criterios");
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error("Error al buscar fuentes con IA");
    } finally {
      setIsSearchingAI(false);
    }
  };

  // Add AI-suggested source to database
  const addAISourceToDb = async (source: typeof aiSourceResults[0]) => {
    try {
      // Map sector_foco to valid values (constraint only allows: 'municipal', 'industrial', 'ambos')
      const validSectorFoco = ['municipal', 'industrial', 'ambos'];
      let sectorFoco: string | null = null;
      if (source.sector_foco) {
        const lowerSector = source.sector_foco.toLowerCase();
        if (validSectorFoco.includes(lowerSector)) {
          sectorFoco = lowerSector;
        } else if (lowerSector.includes('municipal') && lowerSector.includes('industrial')) {
          sectorFoco = 'ambos';
        } else if (lowerSector.includes('municipal')) {
          sectorFoco = 'municipal';
        } else if (lowerSector.includes('industrial')) {
          sectorFoco = 'industrial';
        }
        // For other values like 'agrícola', 'desalación', etc., we leave it null
      }

      const { error } = await supabase
        .from("scouting_sources")
        .insert({
          nombre: source.nombre,
          url: source.url,
          descripcion: source.descripcion,
          tipo: source.tipo || 'web',
          pais: source.pais || null,
          sector_foco: sectorFoco,
          calidad_score: 3,
          activo: true,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["scouting-sources"] });
      toast.success(`"${source.nombre}" añadida a las fuentes`);
      
      // Remove from results
      setAiSourceResults(prev => prev.filter(s => s.url !== source.url));
    } catch (error) {
      console.error('Add source error:', error);
      toast.error("Error al añadir la fuente");
    }
  };

  // Move case study to technologies
  const moveCaseToTechnologies = useMutation({
    mutationFn: async (caseStudy: CaseStudy) => {
      const originalData = (caseStudy.original_data || {}) as Record<string, unknown>;
      
      // Get all fields from original_data with proper fallbacks
      const technologyData = {
        "Nombre de la tecnología": caseStudy.name,
        "Tipo de tecnología": (originalData["Tipo de tecnología"] as string) || caseStudy.technology_types?.[0] || "Sin clasificar",
        "Subcategoría": (originalData["Subcategoría"] as string) || null,
        "Descripción técnica breve": (originalData["Descripción técnica breve"] as string) || caseStudy.description || null,
        "País de origen": (originalData["País de origen"] as string) || caseStudy.country || null,
        "Sector y subsector": (originalData["Sector y subsector"] as string) || caseStudy.sector || null,
        "Proveedor / Empresa": (originalData["Proveedor / Empresa"] as string) || null,
        "Web de la empresa": (originalData["Web de la empresa"] as string) || null,
        "Email de contacto": (originalData["Email de contacto"] as string) || null,
        "Aplicación principal": (originalData["Aplicación principal"] as string) || null,
        "Ventaja competitiva clave": (originalData["Ventaja competitiva clave"] as string) || null,
        "Porque es innovadora": (originalData["Porque es innovadora"] as string) || null,
        "Casos de referencia": (originalData["Casos de referencia"] as string) || null,
        "Paises donde actua": (originalData["Paises donde actua"] as string) || null,
        "Comentarios del analista": (originalData["Comentarios del analista"] as string) || null,
        "Estado del seguimiento": (originalData["Estado del seguimiento"] as string) || null,
        "Fecha de scouting": (originalData["Fecha de scouting"] as string) || null,
        "Grado de madurez (TRL)": (originalData["Grado de madurez (TRL)"] as number) || null,
        status: "active",
      };
      
      const { data: insertedTech, error } = await supabase
        .from("technologies")
        .insert(technologyData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Delete from case studies
      const { error: deleteError } = await supabase
        .from("casos_de_estudio")
        .delete()
        .eq("id", caseStudy.id);
      if (deleteError) throw deleteError;
      
      return insertedTech;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["case-studies"] });
      queryClient.invalidateQueries({ queryKey: ["technologies"] });
      toast.success(`"${data["Nombre de la tecnología"]}" movido a Tecnologías correctamente`);
      setSelectedCase(null);
    },
    onError: (error) => {
      console.error("Error moving to technologies:", error);
      toast.error("Error al mover a Tecnologías: " + (error as Error).message);
    },
  });

  // Move case study to trends
  const moveCaseToTrends = useMutation({
    mutationFn: async (caseStudy: CaseStudy) => {
      const { error } = await supabase
        .from("technological_trends")
        .insert([{
          name: caseStudy.name,
          technology_type: caseStudy.technology_types?.[0] || "Sin clasificar",
          description: caseStudy.description,
          sector: caseStudy.sector,
          original_data: caseStudy.original_data ? JSON.parse(JSON.stringify(caseStudy.original_data)) : null,
          source_technology_id: caseStudy.source_technology_id,
        }]);
      if (error) throw error;
      
      // Delete from case studies
      const { error: deleteError } = await supabase
        .from("casos_de_estudio")
        .delete()
        .eq("id", caseStudy.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-studies"] });
      queryClient.invalidateQueries({ queryKey: ["technological-trends"] });
      toast.success("Movido a Tendencias correctamente");
      setSelectedCase(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Error al mover a Tendencias");
    },
  });

  // Delete case study
  const deleteCaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("casos_de_estudio")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-studies"] });
      toast.success("Caso de estudio eliminado");
      setSelectedCase(null);
    },
    onError: () => {
      toast.error("Error al eliminar");
    },
  });

  // Reprocess document with Railway/PyMuPDF
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.functions.invoke('process-knowledge-document', {
        body: { documentId: docId, forceReprocess: true }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento enviado a reprocesar con PyMuPDF");
    },
    onError: (error: Error) => {
      toast.error(`Error al reprocesar: ${error.message}`);
    },
  });

  // Update document description
  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ docId, description }: { docId: string; description: string }) => {
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ description, updated_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Descripción actualizada");
      setEditingDescDocId(null);
      setEditingDescription("");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Download document handler
  const handleDownloadDocument = async (doc: KnowledgeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('knowledge-documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el documento');
    }
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

  // View toggle component
  const ViewToggle = ({ section }: { section: 'documents' | 'sources' | 'cases' | 'trends' }) => (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant={viewMode[section] === 'grid' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => setViewMode(prev => ({ ...prev, [section]: 'grid' }))}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode[section] === 'list' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => setViewMode(prev => ({ ...prev, [section]: 'list' }))}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );

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
        <ViewToggle section={activeSection} />
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
              ) : viewMode.documents === 'list' ? (
                <div className="space-y-2">
                  {documents?.map((doc) => (
                    <div key={doc.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 space-y-2">
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
                          
                          {/* Editable description */}
                          {editingDescDocId === doc.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="min-h-[80px] text-sm"
                                placeholder="Descripción del documento..."
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => updateDescriptionMutation.mutate({ docId: doc.id, description: editingDescription })}
                                  disabled={updateDescriptionMutation.isPending}
                                >
                                  {updateDescriptionMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  Guardar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingDescDocId(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : doc.description ? (
                            <div 
                              className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 p-1 rounded group"
                              onClick={() => { setEditingDescDocId(doc.id); setEditingDescription(doc.description || ''); }}
                            >
                              <p className="line-clamp-2">{doc.description}</p>
                              <span className="text-[10px] text-muted-foreground/50 group-hover:text-primary">
                                Clic para editar
                              </span>
                            </div>
                          ) : canManage ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-6 px-2"
                              onClick={() => { setEditingDescDocId(doc.id); setEditingDescription(''); }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Añadir descripción
                            </Button>
                          ) : null}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>{doc.chunk_count} chunks</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusBadge(doc.status)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => handleDownloadDocument(doc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Descargar PDF</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {canManage && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => reprocessMutation.mutate(doc.id)}
                                  disabled={reprocessMutation.isPending}
                                >
                                  {doc.status === 'pending' ? (
                                    <Play className="h-4 w-4" />
                                  ) : (
                                    <RotateCcw className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {doc.status === 'pending' ? 'Procesar documento' : 
                                 doc.status === 'processing' ? 'Reintentar procesamiento' : 
                                 'Reprocesar con PyMuPDF'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {canManage && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingDocId(doc.id); setEditingName(doc.name); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Renombrar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {isAdmin && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(doc)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {documents?.map((doc) => (
                    <Card key={doc.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <CardTitle className="text-base line-clamp-2">{doc.name}</CardTitle>
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{doc.chunk_count} chunks</span>
                        </div>
                        
                        {/* Editable description */}
                        {editingDescDocId === doc.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="min-h-[60px] text-sm"
                              placeholder="Descripción del documento..."
                            />
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => updateDescriptionMutation.mutate({ docId: doc.id, description: editingDescription })}
                                disabled={updateDescriptionMutation.isPending}
                              >
                                {updateDescriptionMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                Guardar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDescDocId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : doc.description ? (
                          <div 
                            className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-1 rounded group"
                            onClick={() => { setEditingDescDocId(doc.id); setEditingDescription(doc.description || ''); }}
                          >
                            <p className="line-clamp-2">{doc.description}</p>
                            <span className="text-[10px] text-muted-foreground/50 group-hover:text-primary">
                              Clic para editar
                            </span>
                          </div>
                        ) : canManage ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-6 px-2"
                            onClick={() => { setEditingDescDocId(doc.id); setEditingDescription(''); }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Añadir descripción
                          </Button>
                        ) : null}
                        
                        <div className="flex items-center gap-1 flex-wrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleDownloadDocument(doc)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Descargar PDF</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {canManage && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => reprocessMutation.mutate(doc.id)}
                                    disabled={reprocessMutation.isPending}
                                  >
                                    {doc.status === 'pending' ? (
                                      <Play className="h-3 w-3" />
                                    ) : (
                                      <RotateCcw className={`h-3 w-3 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {doc.status === 'pending' ? 'Procesar' : 'Reprocesar'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {canManage && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingDocId(doc.id); setEditingName(doc.name); }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Renombrar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {isAdmin && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(doc)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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
              <div className="flex items-center gap-2">
                {canManage && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAISourceSearch(true);
                      setAiSourceResults([]);
                      setAiSourcePrompt('');
                      setAiSourceExplanation('');
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Buscar con IA (temporal)
                  </Button>
                )}
                {canManage && (
                  <Button onClick={() => { resetSourceForm(); setEditingSource(null); setShowAddSourceModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Fuente
                  </Button>
                )}
              </div>
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
              ) : viewMode.sources === 'grid' ? (
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
              ) : (
                <div className="space-y-2">
                  {sources?.map((source) => (
                    <div key={source.id} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 ${!source.activo ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{source.nombre}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {source.tipo && <span>{TIPO_OPTIONS.find(t => t.value === source.tipo)?.label}</span>}
                            {source.pais && <><span>•</span><span>{source.pais}</span></>}
                            {source.tecnologias_encontradas > 0 && <><span>•</span><span>{source.tecnologias_encontradas} techs</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(source.calidad_score)}
                        {!source.activo && <Badge variant="destructive" className="text-xs">Inactivo</Badge>}
                        <Button size="sm" variant="outline" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
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
                    </div>
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
              ) : viewMode.cases === 'grid' ? (
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
              ) : (
                <div className="space-y-2">
                  {filteredCases.map((caseStudy) => (
                    <div 
                      key={caseStudy.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedCase(caseStudy)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{caseStudy.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {caseStudy.country && <><MapPin className="w-3 h-3" /><span>{caseStudy.country}</span></>}
                            {caseStudy.sector && <><span>•</span><span>{caseStudy.sector}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {caseStudy.entity_type && (
                          <Badge variant="secondary" className="text-xs">{caseStudy.entity_type}</Badge>
                        )}
                        {caseStudy.technology_types && caseStudy.technology_types.length > 0 && (
                          <Badge variant="outline" className="text-xs">{caseStudy.technology_types.length} tipos</Badge>
                        )}
                      </div>
                    </div>
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
              ) : viewMode.trends === 'grid' ? (
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
              ) : (
                <div className="space-y-2">
                  {trends?.map((trend) => (
                    <div 
                      key={trend.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedTrend(trend)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{trend.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{trend.technology_type}</span>
                            {trend.subcategory && <><span>•</span><span>{trend.subcategory}</span></>}
                            {trend.sector && <><span>•</span><span>{trend.sector}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{trend.technology_type}</Badge>
                      </div>
                    </div>
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCase.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  {selectedCase.country && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedCase.country}
                    </Badge>
                  )}
                  {selectedCase.entity_type && (
                    <Badge variant="secondary">{selectedCase.entity_type}</Badge>
                  )}
                  {selectedCase.sector && (
                    <Badge variant="outline">{selectedCase.sector}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Left column - Main info */}
                <div className="space-y-4">
                  {selectedCase.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Descripción</h4>
                      <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
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

                {/* Right column - Original data if exists */}
                <div className="space-y-4">
                  {selectedCase.original_data && (
                    <>
                      {(selectedCase.original_data as Record<string, unknown>)["Proveedor / Empresa"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Proveedor / Empresa</h4>
                          <p className="text-sm text-muted-foreground">{String((selectedCase.original_data as Record<string, unknown>)["Proveedor / Empresa"])}</p>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Web de la empresa"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Web</h4>
                          <a 
                            href={String((selectedCase.original_data as Record<string, unknown>)["Web de la empresa"])} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {String((selectedCase.original_data as Record<string, unknown>)["Web de la empresa"])}
                          </a>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Aplicación principal"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Aplicación Principal</h4>
                          <p className="text-sm text-muted-foreground">{String((selectedCase.original_data as Record<string, unknown>)["Aplicación principal"])}</p>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Ventaja competitiva clave"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Ventaja Competitiva</h4>
                          <p className="text-sm text-muted-foreground">{String((selectedCase.original_data as Record<string, unknown>)["Ventaja competitiva clave"])}</p>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Porque es innovadora"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">¿Por qué es innovadora?</h4>
                          <p className="text-sm text-muted-foreground">{String((selectedCase.original_data as Record<string, unknown>)["Porque es innovadora"])}</p>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Grado de madurez (TRL)"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">TRL</h4>
                          <Badge variant="secondary">TRL {String((selectedCase.original_data as Record<string, unknown>)["Grado de madurez (TRL)"])}</Badge>
                        </div>
                      )}
                      {(selectedCase.original_data as Record<string, unknown>)["Casos de referencia"] && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Casos de Referencia</h4>
                          <p className="text-sm text-muted-foreground">{String((selectedCase.original_data as Record<string, unknown>)["Casos de referencia"])}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {canManage && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Acciones</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => moveCaseToTechnologies.mutate(selectedCase)}
                        disabled={moveCaseToTechnologies.isPending || moveCaseToTrends.isPending}
                      >
                        {moveCaseToTechnologies.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Database className="h-4 w-4 mr-2" />
                        )}
                        Enviar a Tecnologías
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => moveCaseToTrends.mutate(selectedCase)}
                        disabled={moveCaseToTechnologies.isPending || moveCaseToTrends.isPending}
                      >
                        {moveCaseToTrends.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Lightbulb className="h-4 w-4 mr-2" />
                        )}
                        Enviar a Tendencias
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteCaseMutation.mutate(selectedCase.id)}
                          disabled={deleteCaseMutation.isPending}
                        >
                          {deleteCaseMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
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

      {/* AI Source Search Modal */}
      <Dialog open={showAISourceSearch} onOpenChange={setShowAISourceSearch}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Buscar Nuevas Fuentes con IA
            </DialogTitle>
            <DialogDescription>
              Describe qué tipo de fuentes buscas y la IA te sugerirá opciones relevantes para scouting de tecnologías del agua
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Tipo de fuente</Label>
                <Select 
                  value={aiSourceFilters.tipo || "_all"} 
                  onValueChange={(v) => setAiSourceFilters(prev => ({ ...prev, tipo: v === "_all" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Cualquiera</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="directorio">Directorio</SelectItem>
                    <SelectItem value="feria">Feria/Congreso</SelectItem>
                    <SelectItem value="aceleradora">Aceleradora</SelectItem>
                    <SelectItem value="gobierno">Gobierno</SelectItem>
                    <SelectItem value="universidad">Universidad</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="asociacion">Asociación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Región</Label>
                <Select 
                  value={aiSourceFilters.region || "_all"} 
                  onValueChange={(v) => setAiSourceFilters(prev => ({ ...prev, region: v === "_all" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Global" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Global</SelectItem>
                    <SelectItem value="España">España</SelectItem>
                    <SelectItem value="Europa">Europa</SelectItem>
                    <SelectItem value="LATAM">Latinoamérica</SelectItem>
                    <SelectItem value="Norteamérica">Norteamérica</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                    <SelectItem value="MENA">MENA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Sector</Label>
                <Select 
                  value={aiSourceFilters.sector || "_all"} 
                  onValueChange={(v) => setAiSourceFilters(prev => ({ ...prev, sector: v === "_all" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agricola">Agrícola</SelectItem>
                    <SelectItem value="desalacion">Desalación</SelectItem>
                    <SelectItem value="reutilizacion">Reutilización</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <Label className="text-sm">¿Qué tipo de fuentes buscas?</Label>
              <Textarea
                value={aiSourcePrompt}
                onChange={(e) => setAiSourcePrompt(e.target.value)}
                placeholder="Ej: Ferias y congresos de tecnología del agua en Europa para 2025, especialmente enfocadas en desalación y reutilización de agua..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            {/* Search button */}
            <Button 
              onClick={handleAISourceSearch} 
              disabled={isSearchingAI || aiSourcePrompt.trim().length < 5}
              className="w-full"
            >
              {isSearchingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando fuentes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Buscar con IA
                </>
              )}
            </Button>

            {/* Results */}
            {(aiSourceResults.length > 0 || aiSourceExplanation) && (
              <div className="border-t pt-4 space-y-4">
                {aiSourceExplanation && (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {aiSourceExplanation}
                  </p>
                )}
                
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {aiSourceResults.map((source, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{source.nombre}</span>
                            {source.tipo && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {source.tipo}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                            {source.descripcion}
                          </p>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {source.url.substring(0, 50)}{source.url.length > 50 ? '...' : ''}
                          </a>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {source.pais && <span>📍 {source.pais}</span>}
                            {source.sector_foco && <span>🎯 {source.sector_foco}</span>}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => addAISourceToDb(source)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Añadir
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {aiSourceResults.length === 0 && aiSourceExplanation && (
                  <p className="text-center text-muted-foreground py-4">
                    No se encontraron fuentes con esos criterios. Intenta con otra descripción.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}