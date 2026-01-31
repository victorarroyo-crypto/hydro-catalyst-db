import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { externalSupabase } from "@/integrations/supabase/externalClient";
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
  Database, ArrowRight, Lightbulb, Send, Play, ChevronDown, ChevronRight, Pause,
  MoreVertical
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { splitPdfIfNeeded } from "@/hooks/usePdfSplitter";
import { compressPdf } from "@/hooks/usePdfCompressor";
import { getModelPricing, formatCost, estimateCostFromTotal } from "@/lib/aiModelPricing";
import { useLLMModels, getDefaultModel, formatModelCost } from "@/hooks/useLLMModels";
import { API_URL } from "@/lib/api";

// Railway API configuration - uses Edge Function proxy for secure access to secrets
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Proxy through Edge Function for KB operations (has access to RAILWAY_API_URL and RAILWAY_SYNC_SECRET)
const callKBRailway = async (endpoint: string, method: 'GET' | 'POST' = 'POST', payload?: any): Promise<any> => {
  console.log(`[callKBRailway] Calling proxy for ${method} ${endpoint}`, payload ? JSON.stringify(payload).substring(0, 200) : '');
  
  // Get user session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/kb-railway-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      endpoint,
      method,
      payload,
    }),
  });

  const data = await response.json();
  
  console.log(`[callKBRailway] Proxy response ${response.status}:`, data);
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || `Error ${response.status}`);
  }
  
  return data;
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { InstructionTip } from "@/components/ui/instruction-tip";
import { CaseStudiesSection } from "@/components/kb/CaseStudiesSection";
import { SourcesDashboard } from "@/components/kb/SourcesDashboard";

// Types
interface KnowledgeDocument {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  status: string;
  chunk_count: number;
  created_at: string;
  updated_at?: string;
  description: string | null;
  category: string | null;
  sector: string | null;
}

interface GroupedDocument {
  baseName: string;
  isMultiPart: boolean;
  totalParts: number;
  mainDoc: KnowledgeDocument;
  parts: KnowledgeDocument[];
  processedCount: number;
  failedCount: number;
  stuckCount: number;
  totalChunks: number;
}

// Helper to detect stuck processing documents (>30 min in processing)
function isStuckProcessing(doc: KnowledgeDocument): boolean {
  if (doc.status !== 'processing') return false;
  const updatedAt = new Date(doc.updated_at || doc.created_at);
  const now = new Date();
  const thirtyMinutes = 30 * 60 * 1000;
  return (now.getTime() - updatedAt.getTime()) > thirtyMinutes;
}

// Normalize URL for duplicate detection
function normalizeUrl(url: string): string {
  let normalized = url.toLowerCase().trim();
  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');
  // Remove www.
  normalized = normalized.replace(/^www\./, '');
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  // Remove query params and anchors
  normalized = normalized.split('?')[0].split('#')[0];
  return normalized;
}

// Function to group document parts
function groupDocumentParts(docs: KnowledgeDocument[]): GroupedDocument[] {
  // Flexible regex: supports "_parteXdeY.pdf" or " parteXdeY.pdf" (space or underscore)
  const partRegex = /^(.+?)[\s_]parte(\d+)de(\d+)\.pdf$/i;
  
  // Helper to normalize filename for deduplication (removes timestamp prefixes and part suffixes)
  const normalizeForDedup = (name: string): string => {
    // Remove common timestamp patterns from start: "1769356908635-" or similar
    let normalized = name.replace(/^\d{13,}-/, '');
    // Remove part suffix
    normalized = normalized.replace(/[\s_]parte\d+de\d+\.pdf$/i, '.pdf');
    // Lowercase and trim
    return normalized.toLowerCase().trim();
  };
  
  // Step 1: Deduplicate documents - keep the one with most chunks per normalized name + part number
  const deduplicationMap: Map<string, KnowledgeDocument> = new Map();
  docs.forEach(doc => {
    const partMatch = doc.name.match(partRegex);
    // Create unique key: normalized base name + part number (or "0" for standalone)
    const baseName = partMatch ? partMatch[1].trim() : doc.name.replace(/\.pdf$/i, '').trim();
    const partNum = partMatch ? partMatch[2] : '0';
    const normalizedBase = normalizeForDedup(baseName);
    const dedupKey = `${normalizedBase}__part${partNum}`;
    
    const existing = deduplicationMap.get(dedupKey);
    if (!existing) {
      deduplicationMap.set(dedupKey, doc);
    } else {
      // Keep the one with more chunks, or if equal, the most recent
      const existingChunks = existing.chunk_count || 0;
      const docChunks = doc.chunk_count || 0;
      if (docChunks > existingChunks || 
          (docChunks === existingChunks && new Date(doc.created_at) > new Date(existing.created_at))) {
        deduplicationMap.set(dedupKey, doc);
      }
    }
  });
  
  // Use deduplicated documents
  const dedupedDocs = Array.from(deduplicationMap.values());
  
  const groups: Map<string, KnowledgeDocument[]> = new Map();
  const standalone: KnowledgeDocument[] = [];
  
  dedupedDocs.forEach(doc => {
    const match = doc.name.match(partRegex);
    if (match) {
      const baseName = match[1].trim();
      // Normalize base name for grouping (to group same doc uploaded at different times)
      const normalizedBase = normalizeForDedup(baseName);
      if (!groups.has(normalizedBase)) {
        groups.set(normalizedBase, []);
      }
      groups.get(normalizedBase)!.push(doc);
    } else {
      standalone.push(doc);
    }
  });
  
  // Check if any standalone doc is actually the "base" of a group (without parteXdeY suffix)
  // For example: "Document.pdf" could be part 1 of "Document parteXdeY.pdf" series
  const standaloneToRemove: Set<string> = new Set();
  standalone.forEach(doc => {
    const docBaseName = doc.name.replace(/\.pdf$/i, '').trim();
    const normalizedBase = normalizeForDedup(docBaseName);
    if (groups.has(normalizedBase)) {
      // This standalone doc is the base document - add it as "part 1" to the group
      const parts = groups.get(normalizedBase)!;
      parts.unshift(doc); // Add at the beginning
      standaloneToRemove.add(doc.id);
    }
  });
  
  const result: GroupedDocument[] = [];
  
  // Add grouped documents
  groups.forEach((parts, normalizedBaseName) => {
    // Sort parts: first the base doc (no parteXdeY), then by part number
    parts.sort((a, b) => {
      const matchA = a.name.match(partRegex);
      const matchB = b.name.match(partRegex);
      // Base doc (no match) comes first
      if (!matchA && matchB) return -1;
      if (matchA && !matchB) return 1;
      if (!matchA && !matchB) return 0;
      const numA = matchA ? parseInt(matchA[2]) : 0;
      const numB = matchB ? parseInt(matchB[2]) : 0;
      return numA - numB;
    });
    
    const processedCount = parts.filter(p => p.status === 'processed').length;
    const failedCount = parts.filter(p => p.status === 'failed' || p.status === 'error').length;
    const stuckCount = parts.filter(p => isStuckProcessing(p)).length;
    const totalChunks = parts.reduce((sum, p) => sum + (p.chunk_count || 0), 0);
    
    // Use original baseName from first part for display
    const displayBaseName = parts[0].name.match(partRegex)?.[1]?.trim() || 
                            parts[0].name.replace(/\.pdf$/i, '').replace(/^\d{13,}-/, '').trim();
    
    result.push({
      baseName: displayBaseName,
      isMultiPart: true,
      totalParts: parts.length,
      mainDoc: parts[0], // First part (or base doc) has the description
      parts,
      processedCount,
      failedCount,
      stuckCount,
      totalChunks
    });
  });
  
  // Add remaining standalone documents (those not merged into groups)
  standalone.forEach(doc => {
    if (standaloneToRemove.has(doc.id)) return;
    const isFailed = doc.status === 'failed' || doc.status === 'error';
    const isStuck = isStuckProcessing(doc);
    result.push({
      baseName: doc.name.replace(/\.pdf$/i, '').replace(/^\d{13,}-/, '').trim(),
      isMultiPart: false,
      totalParts: 1,
      mainDoc: doc,
      parts: [doc],
      processedCount: doc.status === 'processed' ? 1 : 0,
      failedCount: isFailed ? 1 : 0,
      stuckCount: isStuck ? 1 : 0,
      totalChunks: doc.chunk_count || 0
    });
  });
  
  // Sort by creation date of main doc (newest first)
  result.sort((a, b) => new Date(b.mainDoc.created_at).getTime() - new Date(a.mainDoc.created_at).getTime());
  
  return result;
}

// Document category and sector options
const DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'technical_guide', label: 'Guía Técnica', icon: '📖' },
  { value: 'regulation', label: 'Normativa', icon: '📋' },
];

const DOCUMENT_SECTOR_OPTIONS = [
  { value: 'general', label: 'General', icon: '🌐' },
  { value: 'food_beverage', label: 'Alimentación y Bebidas', icon: '🍔' },
  { value: 'pulp_paper', label: 'Celulosa y Papel', icon: '📜' },
  { value: 'textile', label: 'Textil', icon: '👕' },
  { value: 'plastics', label: 'Plásticos', icon: '♻️' },
  { value: 'chemical', label: 'Química', icon: '⚗️' },
  { value: 'pharma', label: 'Farmacéutica', icon: '💊' },
  { value: 'oil_gas', label: 'Oil & Gas', icon: '⛽' },
  { value: 'metal', label: 'Metal-Mecánica', icon: '🔩' },
  { value: 'mining', label: 'Minería', icon: '⛏️' },
  { value: 'power', label: 'Energía', icon: '⚡' },
  { value: 'electronics', label: 'Electrónica/Semiconductores', icon: '💻' },
  { value: 'automotive', label: 'Automoción', icon: '🚗' },
  { value: 'cosmetics', label: 'Cosmética', icon: '🧴' },
  { value: 'cooling_towers', label: 'Torres de Refrigeración', icon: '❄️' },
  { value: 'desalination', label: 'Desalación', icon: '🌊' },
];

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
  
  // Multi-part upload progress state with pause/continue
  const [isProcessingMultiPart, setIsProcessingMultiPart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef<boolean>(false);
  const [multiPartStats, setMultiPartStats] = useState({ processed: 0, failed: 0, pending: 0 });
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [querying, setQuerying] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescDocId, setEditingDescDocId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [generatingDescId, setGeneratingDescId] = useState<string | null>(null);
  const [lastQueryCost, setLastQueryCost] = useState<number | null>(null);
  const [editingGroupBaseName, setEditingGroupBaseName] = useState<string | null>(null);
  const [editingGroupNewName, setEditingGroupNewName] = useState("");
  
  // Document filters state
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');
  const [docSectorFilter, setDocSectorFilter] = useState<string>('all');
  
  // Document upload form state
  const [uploadCategory, setUploadCategory] = useState<string>('technical_guide');
  const [uploadSector, setUploadSector] = useState<string>('general');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  // Edit category modal state
  const [editingCategoryDocId, setEditingCategoryDocId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [editSector, setEditSector] = useState<string>('');
  
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
    alreadyExists?: boolean;
  }>>([]);
  const [aiSourceExplanation, setAiSourceExplanation] = useState('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('');
  
  // Case studies state
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  
  // Sources filter state
  const [sourceFilters, setSourceFilters] = useState<{
    tipo: string;
    pais: string;
    sector: string;
    search: string;
  }>({ tipo: '', pais: '', sector: '', search: '' });
  
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

  // Real-time subscription for document status updates (Lovable Cloud)
  // Track documents being processed to detect duplicates when deleted
  const processingDocsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const channel = supabase
      .channel('doc-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'knowledge_documents',
        },
        (payload) => {
          const newDoc = payload.new as KnowledgeDocument;
          const oldDoc = payload.old as Partial<KnowledgeDocument>;
          
          // Show toast when a document finishes processing
          if (oldDoc.status !== 'processed' && newDoc.status === 'processed') {
            toast.success(`"${newDoc.name}" procesado correctamente`, { duration: 4000 });
            queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
          } else if (oldDoc.status !== 'failed' && newDoc.status === 'failed') {
            toast.error(`"${newDoc.name}" falló al procesar`, { duration: 4000 });
            queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'knowledge_documents',
        },
        (payload) => {
          const oldDoc = payload.old as Partial<KnowledgeDocument>;
          
          // Check if this was a document being processed (likely duplicate)
          if (oldDoc.id && processingDocsRef.current.has(oldDoc.id)) {
            const docName = processingDocsRef.current.get(oldDoc.id);
            toast.warning(
              `Documento duplicado: "${docName}" ya existe en la base de conocimiento`,
              { duration: 6000 }
            );
            processingDocsRef.current.delete(oldDoc.id);
          }
          
          // Refresh the list
          queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [queryClient]);

  // Fetch LLM models from Railway backend
  const { data: llmModelsData, isLoading: loadingLLMModels } = useLLMModels();

  // Set default AI model when models are loaded
  useEffect(() => {
    if (llmModelsData && !selectedAIModel) {
      const defaultModel = getDefaultModel(llmModelsData);
      if (defaultModel) {
        setSelectedAIModel(defaultModel.key);
      }
    }
  }, [llmModelsData, selectedAIModel]);

  // Get current model for knowledge base
  const { data: modelConfig } = useQuery({
    queryKey: ['knowledge-base-model'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
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

  const STORAGE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB Pro plan limit

  // Fetch documents from Lovable Cloud (source of truth for KB documents)
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

  // Update tracking when documents change - for duplicate detection
  useEffect(() => {
    if (documents) {
      const newMap = new Map<string, string>();
      documents.forEach(doc => {
        if (doc.status === 'pending' || doc.status === 'processing') {
          newMap.set(doc.id, doc.name);
        }
      });
      processingDocsRef.current = newMap;
    }
  }, [documents]);

  // Polling fallback: refresh document list while any are processing
  // This catches cases where Realtime events are missed (e.g., tab was inactive)
  useEffect(() => {
    const hasProcessingDocs = documents?.some(
      doc => doc.status === 'pending' || doc.status === 'processing'
    );
    
    if (!hasProcessingDocs) return;
    
    const interval = setInterval(() => {
      console.log("[KB] Polling fallback: refreshing document list");
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    }, 10000); // Refresh every 10 seconds while documents are processing
    
    return () => clearInterval(interval);
  }, [documents, queryClient]);

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
      const { data, error } = await externalSupabase
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
      const { data, error } = await externalSupabase
        .from('technological_trends')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TechnologicalTrend[];
    },
  });

  // Document mutations
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      console.log("[KB-UPLOAD] Starting upload for:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
      
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("[KB-UPLOAD] Auth error:", authError);
        throw new Error(`Error de autenticación: ${authError.message}`);
      }
      if (!authData.user) {
        console.error("[KB-UPLOAD] No user found");
        throw new Error('Usuario no autenticado');
      }
      console.log("[KB-UPLOAD] User authenticated:", authData.user.id);

      // Comprimir PDF antes de subir
      let fileToUpload: Blob | File = file;
      let finalSize = file.size;
      
      if (file.type === 'application/pdf') {
        try {
          const { compressedBlob, originalSize, compressedSize, compressionRatio } = 
            await compressPdf(file, { removeMetadata: true });
          
          // Solo usar comprimido si realmente es más pequeño
          if (compressedSize < originalSize) {
            fileToUpload = compressedBlob;
            finalSize = compressedSize;
            toast.info(`PDF comprimido: ${compressionRatio.toFixed(0)}% reducción`);
          }
        } catch (compressError) {
          console.warn("[KB-UPLOAD] Compression failed, using original:", compressError);
          // Continuar con archivo original si falla compresión
        }
      }

      // Store under user folder so paths are unique and consistent
      const filePath = `${authData.user.id}/${Date.now()}-${file.name}`;
      console.log("[KB-UPLOAD] Uploading to path:", filePath, "Size:", (finalSize / 1024 / 1024).toFixed(2), "MB");

      // Upload to Lovable Cloud storage (where edge function reads from)
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error("[KB-UPLOAD] Storage upload error:", uploadError);
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }
      console.log("[KB-UPLOAD] File uploaded to storage successfully");

      // Insert into Lovable Cloud database (where edge function queries)
      // Guardar tamaño comprimido real
      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_size: finalSize, // Usar tamaño comprimido
          mime_type: file.type,
          status: "pending",
          category: uploadCategory,
          sector: uploadSector,
          description: description || null,
          uploaded_by: authData.user.id,
        })
        .select()
        .single();

      if (docError) {
        console.error("[KB-UPLOAD] DB insert error:", docError);
        throw new Error(`Error al registrar documento: ${docError.message}`);
      }
      console.log("[KB-UPLOAD] Document registered in DB:", doc.id);

      console.log("[KB-UPLOAD] Triggering document processing via Edge Function...");
      try {
        // Use the process-knowledge-document edge function which has correct Railway endpoint
        const { error: fnError } = await supabase.functions.invoke('process-knowledge-document', {
          body: { documentId: doc.id },
        });
        if (fnError) {
          console.error("[KB-UPLOAD] Edge function error:", fnError);
          toast.error("Documento subido pero hubo un error al procesarlo");
        } else {
          console.log("[KB-UPLOAD] Processing initiated successfully");
        }
      } catch (processError) {
        console.error("[KB-UPLOAD] Processing error:", processError);
        toast.error("Documento subido pero hubo un error al procesarlo");
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento subido y en proceso");
    },
    onError: (error) => {
      console.error("[KB-UPLOAD] Upload mutation error:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error: ${message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: KnowledgeDocument) => {
      // Delete associated chunks first (from Lovable Cloud)
      await supabase.from("knowledge_chunks").delete().eq("document_id", doc.id);
      
      // Delete from storage (Lovable Cloud)
      await supabase.storage.from("knowledge-documents").remove([doc.file_path]);

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

  // Mutation to delete all parts of a multi-part document group
  const deleteGroupMutation = useMutation({
    mutationFn: async (parts: KnowledgeDocument[]) => {
      for (const part of parts) {
        // Delete associated chunks (Lovable Cloud)
        await supabase.from("knowledge_chunks").delete().eq("document_id", part.id);
        
        // Delete from storage (Lovable Cloud)
        await supabase.storage.from("knowledge-documents").remove([part.file_path]);

        // Delete document record (Lovable Cloud)
        const { error } = await supabase
          .from("knowledge_documents")
          .delete()
          .eq("id", part.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Grupo de documentos eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar el grupo de documentos");
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

  // Mutation to rename all parts of a multi-part document group
  const renameGroupMutation = useMutation({
    mutationFn: async ({ parts, oldBaseName, newBaseName }: { parts: KnowledgeDocument[]; oldBaseName: string; newBaseName: string }) => {
      const partRegex = /^(.+?)[\s_]parte(\d+)de(\d+)\.pdf$/i;
      
      for (const part of parts) {
        const match = part.name.match(partRegex);
        let newName: string;
        
        if (match) {
          // This is a parteXdeY file - replace base name
          const partNum = match[2];
          const totalParts = match[3];
          newName = `${newBaseName}_parte${partNum}de${totalParts}.pdf`;
        } else {
          // This is the base document (no parte suffix)
          newName = `${newBaseName}.pdf`;
        }
        
        const { error } = await supabase
          .from("knowledge_documents")
          .update({ name: newName })
          .eq("id", part.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Nombre del grupo actualizado");
      setEditingGroupBaseName(null);
      setEditingGroupNewName("");
    },
    onError: () => {
      toast.error("Error al renombrar el grupo");
    },
  });

  // Source mutations (dual-write: Lovable Cloud DB + External DB for scouting agents)
  const saveSourceMutation = useMutation({
    mutationFn: async (data: typeof sourceForm) => {
      // Normalize URL to prevent duplicates
      const normalizedUrl = normalizeUrl(data.url);
      
      // Check for existing source with same normalized URL (when creating new)
      if (!editingSource) {
        const { data: existingSources } = await supabase
          .from("scouting_sources")
          .select("id, url, nombre");
        
        const duplicate = existingSources?.find(s => normalizeUrl(s.url) === normalizedUrl);
        if (duplicate) {
          throw new Error(`Ya existe una fuente con URL similar: "${duplicate.nombre}"`);
        }
      }
      
      const sourceData = {
        nombre: data.nombre,
        url: data.url.trim(), // Keep original URL but trimmed
        tipo: data.tipo || null,
        descripcion: data.descripcion || null,
        pais: data.pais || null,
        sector_foco: data.sector_foco || null,
        frecuencia_escaneo: data.frecuencia_escaneo || null,
        calidad_score: data.calidad_score,
        activo: data.activo,
        notas: data.notas || null,
      };

      if (editingSource) {
        // Update in Lovable Cloud DB
        const { error } = await supabase
          .from("scouting_sources")
          .update(sourceData)
          .eq("id", editingSource.id);
        if (error) throw error;

        // Sync to External DB (for scouting agents)
        const { error: externalError } = await externalSupabase
          .from("scouting_sources")
          .upsert({ id: editingSource.id, ...sourceData }, { onConflict: 'id' });
        if (externalError) {
          console.error('[scouting_sources] Error syncing UPDATE to external DB:', externalError);
        }
      } else {
        // Insert in Lovable Cloud DB and get the new ID
        const { data: inserted, error } = await supabase
          .from("scouting_sources")
          .insert(sourceData)
          .select('id')
          .single();
        if (error) throw error;

        // Sync to External DB (for scouting agents)
        const { error: externalError } = await externalSupabase
          .from("scouting_sources")
          .upsert({ id: inserted.id, ...sourceData }, { onConflict: 'id' });
        if (externalError) {
          console.error('[scouting_sources] Error syncing INSERT to external DB:', externalError);
        }
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
      // Delete from Lovable Cloud DB
      const { error } = await supabase
        .from("scouting_sources")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Sync delete to External DB (for scouting agents)
      const { error: externalError } = await externalSupabase
        .from("scouting_sources")
        .delete()
        .eq("id", id);
      if (externalError) {
        console.error('[scouting_sources] Error syncing DELETE to external DB:', externalError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting-sources"] });
      toast.success("Fuente eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar la fuente");
    },
  });

  // Bulk sync all sources to External DB
  const syncAllSourcesMutation = useMutation({
    mutationFn: async () => {
      // Fetch all sources from Lovable Cloud DB
      const { data: allSources, error: fetchError } = await supabase
        .from("scouting_sources")
        .select("*");
      
      if (fetchError) throw fetchError;
      if (!allSources || allSources.length === 0) {
        return { synced: 0 };
      }

      // Map sources to external DB schema (excluding fields that don't exist in external)
      const sourcesToSync = allSources.map(s => ({
        id: s.id,
        nombre: s.nombre,
        url: s.url,
        tipo: s.tipo || null,
        descripcion: s.descripcion || null,
        pais: s.pais || null,
        sector_foco: s.sector_foco || null,
        tecnologias_foco: s.tecnologias_foco || null,
        frecuencia_escaneo: s.frecuencia_escaneo || null,
        calidad_score: s.calidad_score ?? null,
        activo: s.activo ?? true,
        notas: s.notas || null,
        ultima_revision: s.ultima_revision || null,
        proxima_revision: s.proxima_revision || null,
        tecnologias_encontradas: s.tecnologias_encontradas ?? 0,
        created_at: s.created_at,
        updated_at: s.updated_at,
        // Explicitly NOT including created_by as it doesn't exist in external DB
      }));

      console.log('[syncAllSources] Syncing', sourcesToSync.length, 'sources to external DB');

      // Upsert all sources to External DB using URL as unique key
      // Remove 'id' from sources to let the external DB generate its own IDs
      const sourcesWithoutId = sourcesToSync.map(({ id, ...rest }) => rest);
      
      console.log('[syncAllSources] Upserting to external DB with onConflict: url');
      
      const { error: syncError } = await externalSupabase
        .from("scouting_sources")
        .upsert(sourcesWithoutId, { 
          onConflict: 'url'
        });

      if (syncError) {
        // Handle unique constraint violation on URL gracefully
        if (syncError.code === '23505' && syncError.message.includes('unique_source_url')) {
          console.warn('[syncAllSources] Some sources already exist by URL, skipping duplicates');
          // Still consider it a success since the data is already there
          return { synced: allSources.length };
        }
        
        console.error('[syncAllSources] Sync error details:', {
          message: syncError.message,
          details: syncError.details,
          hint: syncError.hint,
          code: syncError.code
        });
        throw new Error(`Error sincronizando: ${syncError.message}`);
      }
      
      return { synced: allSources.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.synced} fuentes sincronizadas a BD Externa`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al sincronizar fuentes");
      console.error('[syncAllSources] Error:', error);
    },
  });

  // Pull sources from External DB to Lovable (External is source of truth)
  const pullFromExternalMutation = useMutation({
    mutationFn: async () => {
      // Fetch all sources from External DB (source of truth)
      const { data: externalSources, error: fetchError } = await externalSupabase
        .from("scouting_sources")
        .select("*");
      
      if (fetchError) throw fetchError;
      if (!externalSources || externalSources.length === 0) {
        return { pulled: 0, new: 0 };
      }

      // Get existing sources in Lovable to check for duplicates
      const { data: localSources } = await supabase
        .from("scouting_sources")
        .select("url");
      
      const localNormalizedUrls = new Set(localSources?.map(s => normalizeUrl(s.url)) || []);

      // Filter to only new sources (not in Lovable yet)
      const newSources = externalSources.filter(s => !localNormalizedUrls.has(normalizeUrl(s.url)));

      if (newSources.length === 0) {
        return { pulled: externalSources.length, new: 0 };
      }

      // Map external sources to local schema
      const sourcesToInsert = newSources.map(s => ({
        nombre: s.nombre,
        url: s.url,
        tipo: s.tipo || null,
        descripcion: s.descripcion || null,
        pais: s.pais || null,
        sector_foco: s.sector_foco || null,
        tecnologias_foco: s.tecnologias_foco || null,
        frecuencia_escaneo: s.frecuencia_escaneo || null,
        calidad_score: s.calidad_score ?? 3,
        activo: s.activo ?? true,
        notas: s.notas || null,
        ultima_revision: s.ultima_revision || null,
        proxima_revision: s.proxima_revision || null,
        tecnologias_encontradas: s.tecnologias_encontradas ?? 0,
      }));

      console.log('[pullFromExternal] Inserting', sourcesToInsert.length, 'new sources to Lovable');

      const { error: insertError } = await supabase
        .from("scouting_sources")
        .insert(sourcesToInsert);

      if (insertError) {
        console.error('[pullFromExternal] Insert error:', insertError);
        throw new Error(`Error insertando: ${insertError.message}`);
      }
      
      return { pulled: externalSources.length, new: newSources.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scouting-sources"] });
      if (data.new > 0) {
        toast.success(`${data.new} fuentes nuevas importadas de BD Externa`);
      } else {
        toast.info(`BD sincronizada (${data.pulled} fuentes, ninguna nueva)`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al importar fuentes");
      console.error('[pullFromExternal] Error:', error);
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

  // AI Source Search handler - calls Railway backend
  const handleAISourceSearch = async () => {
    if (!aiSourcePrompt.trim() || aiSourcePrompt.trim().length < 5) {
      toast.error("Escribe una descripción de las fuentes que buscas (mínimo 5 caracteres)");
      return;
    }

    if (!selectedAIModel) {
      toast.error("Selecciona un modelo AI");
      return;
    }

    setIsSearchingAI(true);
    setAiSourceResults([]);
    setAiSourceExplanation('');

    try {
      // Fetch existing sources to avoid duplicates (both names and normalized URLs)
      const { data: existingSources } = await supabase
        .from("scouting_sources")
        .select("nombre, url");
      
      const existingNames = existingSources?.map(s => s.nombre) || [];
      const existingNormalizedUrls = existingSources?.map(s => normalizeUrl(s.url)) || [];

      // Call Railway backend endpoint
      const response = await fetch(`${API_URL}/api/sources/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiSourcePrompt.trim(),
          model: selectedAIModel,
          filters: {
            tipo: aiSourceFilters.tipo || null,
            region: aiSourceFilters.region || null,
            sector: aiSourceFilters.sector || null,
          },
          existing_sources: existingNames,
          existing_urls: existingNormalizedUrls, // Send normalized URLs for better duplicate detection
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Error en la búsqueda");
        return;
      }

      setAiSourceResults(data.sources || []);
      setAiSourceExplanation(data.explanation || '');
      
      const newCount = data.newCount ?? 0;
      const existingCount = data.existingCount ?? 0;
      
      if (data.sources?.length > 0) {
        if (existingCount > 0) {
          toast.success(`Se encontraron ${newCount} fuentes nuevas (${existingCount} ya en tu lista)`);
        } else {
          toast.success(`Se encontraron ${newCount} fuentes nuevas`);
        }
      } else {
        toast.info("No se encontraron fuentes con esos criterios");
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error(error instanceof Error ? error.message : "Error al buscar fuentes con IA");
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


      // Map tipo to valid values (constraint only allows: directorio, feria, revista, aceleradora, asociacion, empresa, otro)
      const validTipo = ['directorio', 'feria', 'revista', 'aceleradora', 'asociacion', 'empresa', 'otro'];
      let tipoDb = 'otro';
      if (source.tipo) {
        const t = source.tipo.toLowerCase();
        if (validTipo.includes(t)) {
          tipoDb = t;
        } else if (t === 'web') {
          // generic website  treat as directory/website source
          tipoDb = 'directorio';
        } else if (t === 'newsletter') {
          tipoDb = 'revista';
        } else {
          tipoDb = 'otro';
        }
      }

      // Check if already exists (based on alreadyExists flag or normalized URL check)
      if (source.alreadyExists) {
        toast.info(`"${source.nombre}" ya está en tu lista de fuentes`);
        return;
      }
      
      // Additional check: verify normalized URL doesn't exist in Lovable DB
      const normalizedUrl = normalizeUrl(source.url);
      const { data: existingSources } = await supabase
        .from("scouting_sources")
        .select("id, url, nombre");
      
      const duplicate = existingSources?.find(s => normalizeUrl(s.url) === normalizedUrl);
      if (duplicate) {
        toast.info(`"${source.nombre}" ya existe (URL similar a "${duplicate.nombre}")`);
        setAiSourceResults(prev => prev.filter(s => s.url !== source.url));
        return;
      }

      const sourceData = {
        nombre: source.nombre,
        url: source.url.trim(),
        descripcion: source.descripcion,
        tipo: tipoDb,
        pais: source.pais || null,
        sector_foco: sectorFoco,
        calidad_score: 3,
        activo: true,
      };

      // 1. Insert in Lovable Cloud DB first and get the new ID
      const { data: inserted, error: localError } = await supabase
        .from("scouting_sources")
        .insert(sourceData)
        .select('id')
        .single();

      if (localError) {
        // Handle unique constraint violation
        if (localError.code === '23505') {
          toast.info(`"${source.nombre}" ya existe en tu lista (URL duplicada)`);
          setAiSourceResults(prev => prev.filter(s => s.url !== source.url));
          return;
        }
        throw localError;
      }

      // 2. Sync to External DB (for scouting agents)
      const { error: externalError } = await externalSupabase
        .from("scouting_sources")
        .upsert({ id: inserted.id, ...sourceData }, { onConflict: 'id' });
      
      if (externalError) {
        console.error('[addAISourceToDb] Error syncing to external DB:', externalError);
        // Don't fail - the source is saved locally, just log the sync error
      }

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
      
      const { data: insertedTech, error } = await externalSupabase
        .from("technologies")
        .insert(technologyData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Delete from case studies
      const { error: deleteError } = await externalSupabase
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
      const { error } = await externalSupabase
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
      const { error: deleteError } = await externalSupabase
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
      const { error } = await externalSupabase
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

  // Track recently sent parts for visual feedback (shows "Enviado" badge for 10s)
  const [recentlySentParts, setRecentlySentParts] = useState<Set<string>>(new Set());

  // Reprocess document with Railway/PyMuPDF - now with granular state and better feedback
  const handleSingleReprocess = async (docId: string, docName: string) => {
    console.log('[KB] Reprocess single', docId, docName);
    console.log(`[KB] ✅ Solo "${docName}" enviado. Otras partes NO afectadas.`);
    setReprocessingDocId(docId);
    
    // Toast inicial más informativo
    toast.info(`Enviando "${docName}" a procesar...`, { duration: 2000 });
    
    try {
      await callKBRailway(`/api/kb/reprocess/${docId}`);
      
      // Mark as recently sent for visual feedback
      setRecentlySentParts(prev => new Set(prev).add(docId));
      setTimeout(() => {
        setRecentlySentParts(prev => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      }, 10000); // Mantener indicador 10 segundos
      
      // Silent refetch to avoid visual confusion
      queryClient.refetchQueries({ queryKey: ["knowledge-documents"], type: 'active' });
      
      toast.success(
        `✓ "${docName}" enviado a procesar. El estado se actualizará automáticamente.`,
        { duration: 4000 }
      );
    } catch (error) {
      toast.error(`Error al reprocesar: ${(error as Error).message}`);
    } finally {
      setReprocessingDocId(null);
    }
  };

  // Legacy mutation for compatibility (uses granular state now)
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      await callKBRailway(`/api/kb/reprocess/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento enviado a reprocesar con PyMuPDF");
    },
    onError: (error: Error) => {
      toast.error(`Error al reprocesar: ${error.message}`);
    },
  });

  // Update document description (Lovable Cloud)
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

  // Update document category/sector mutation (Lovable Cloud)
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ docId, category, sector }: { docId: string; category: string | null; sector: string | null }) => {
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ category, sector, updated_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Categoría actualizada");
      setEditingCategoryDocId(null);
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Download document handler - fetches as blob to avoid ad-blocker issues
  const handleDownloadDocument = async (doc: KnowledgeDocument) => {
    try {
      console.log('Download document via Railway:', doc.id);
      const data = await callKBRailway(`/api/kb/document/${doc.id}/download`, 'GET');
      
      if (data.download_url) {
        // Fetch the file as blob to avoid browser/extension blocking
        const response = await fetch(data.download_url);
        
        if (!response.ok) {
          throw new Error(`Error al descargar: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Create a local blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.name || 'documento.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        
        toast.success('Documento descargado correctamente');
      } else {
        throw new Error('No se recibió URL de descarga');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      // Check if it's a document without stored URL (processed before fix)
      const errorMsg = error?.message || '';
      if (errorMsg.includes('500') || errorMsg.includes('not found') || errorMsg.includes('no file_url')) {
        toast.error('Este documento fue procesado antes del fix de URLs. Reprocésalo para habilitar la descarga.');
      } else if (errorMsg.includes('blocked') || errorMsg.includes('CORS')) {
        toast.error('Descarga bloqueada. Desactiva tu ad-blocker temporalmente.');
      } else {
        toast.error(errorMsg || 'Error al descargar el documento');
      }
    }
  };

  // File select handler - opens modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      e.target.value = "";
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("El archivo no puede superar 100MB");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setUploadDescription("");
    setShowUploadModal(true);
    e.target.value = "";
  };

  // Generate description with AI using Railway backend
  const handleGenerateDescription = async () => {
    if (!selectedFile) return;
    
    setGeneratingDescription(true);
    try {
      const response = await fetch(`${API_URL}/api/kb/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          category: uploadCategory,
          sector: uploadSector,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error generando descripción');
      }

      const data = await response.json();
      setUploadDescription(data.description || '');
      toast.success("Descripción generada");
    } catch (error) {
      console.error('Generate description error:', error);
      toast.error(error instanceof Error ? error.message : "Error al generar descripción");
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Generate AI description for an existing document via Railway API (through proxy)
  const handleGenerateDescriptionForDoc = async (doc: KnowledgeDocument) => {
    // Validate document status before calling API
    if (doc.status === 'failed') {
      toast.error("No se puede generar descripción para un documento con error. Reprocésalo primero.");
      return;
    }
    if (doc.status === 'processing' || doc.status === 'pending') {
      toast.warning("El documento aún se está procesando. Espera a que termine.");
      return;
    }
    
    setGeneratingDescId(doc.id);
    try {
      console.log('Generate description via Railway:', doc.id);
      
      const data = await callKBRailway(`/api/kb/document/${doc.id}/generate-description`);
      
      // data.ai_analysis contiene: suggested_title, description, keywords, suggested_category
      const aiAnalysis = data.ai_analysis;
      
      if (aiAnalysis?.description) {
        setEditingDescription(aiAnalysis.description);
        toast.success("Descripción generada con IA");
      } else {
        toast.warning("No se pudo generar descripción");
      }
    } catch (error) {
      console.error('Generate description error:', error);
      toast.error(error instanceof Error ? error.message : "Error al generar descripción");
    } finally {
      setGeneratingDescId(null);
    }
  };

  // Confirm upload from modal
  // Process parts with concurrency limit to avoid overwhelming Railway
  // Supports pause/resume functionality
  const processWithConcurrencyLimit = async (
    parts: Array<{ blob: Blob; name: string; pageRange: string }>,
    concurrencyLimit: number = 3
  ): Promise<{ processed: number; failed: number; wasCancelled: boolean }> => {
    const queue = [...parts];
    let processed = 0;
    let failed = 0;
    const inProgress: Promise<void>[] = [];

    const processOne = async (part: typeof parts[0], index: number) => {
      try {
        console.log(`[KB-UPLOAD-HANDLER] Processing part ${index + 1}/${parts.length}: ${part.name}`);
        const partFile = new File([part.blob], part.name, { type: "application/pdf" });
        await uploadMutation.mutateAsync({ 
          file: partFile, 
          description: index === 0 ? uploadDescription : undefined 
        });
        processed++;
        setMultiPartStats(prev => ({ ...prev, processed: prev.processed + 1, pending: prev.pending - 1 }));
        console.log(`[KB-UPLOAD-HANDLER] Part ${index + 1} completed successfully`);
      } catch (error) {
        failed++;
        setMultiPartStats(prev => ({ ...prev, failed: prev.failed + 1, pending: prev.pending - 1 }));
        console.error(`[KB-UPLOAD-HANDLER] Part ${index + 1} failed:`, error);
      }
      setUploadProgress({ current: processed + failed, total: parts.length });
    };

    // Helper to wait while paused
    const waitWhilePaused = async () => {
      while (pauseRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };

    let partIndex = 0;

    while (queue.length > 0 || inProgress.length > 0) {
      // Check for pause before starting new parts
      if (pauseRef.current && queue.length > 0) {
        await waitWhilePaused();
      }

      // Fill up to concurrency limit
      while (inProgress.length < concurrencyLimit && queue.length > 0) {
        const part = queue.shift()!;
        const currentIndex = partIndex++;
        const promise = processOne(part, currentIndex).finally(() => {
          const idx = inProgress.indexOf(promise);
          if (idx !== -1) inProgress.splice(idx, 1);
        });
        inProgress.push(promise);
      }

      // Wait for at least one to finish before continuing
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return { processed, failed, wasCancelled: false };
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setShowUploadModal(false);
    setUploading(true);
    setUploadProgress(null);
    
    // Reset pause state
    pauseRef.current = false;
    setIsPaused(false);
    
    try {
      console.log("[KB-UPLOAD-HANDLER] Starting file upload process:", selectedFile.name);
      toast.info("Analizando documento...");
      const { parts, totalPages, wasSplit } = await splitPdfIfNeeded(selectedFile);
      console.log("[KB-UPLOAD-HANDLER] Split result:", { parts: parts.length, totalPages, wasSplit });
      
      if (wasSplit) {
        toast.info(`Documento dividido en ${parts.length} partes (${totalPages} páginas total). Procesando con límite de 3 concurrentes...`);
        setIsProcessingMultiPart(true);
        setMultiPartStats({ processed: 0, failed: 0, pending: parts.length });
      }
      
      setUploadProgress({ current: 0, total: parts.length });
      
      // Use concurrency-limited processing for multi-part documents
      const { processed, failed } = await processWithConcurrencyLimit(parts, 3);
      
      if (wasSplit) {
        if (failed > 0) {
          toast.warning(`${processed} partes procesadas, ${failed} fallidas. Puedes reintentar las fallidas más tarde.`);
        } else {
          toast.success(`${parts.length} partes subidas y en proceso correctamente`);
        }
      }
      console.log("[KB-UPLOAD-HANDLER] All parts uploaded:", { processed, failed });
    } catch (error) {
      console.error("[KB-UPLOAD-HANDLER] Upload error:", error);
      const message = error instanceof Error ? error.message : "Error desconocido al procesar el documento";
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setIsProcessingMultiPart(false);
      setSelectedFile(null);
      setUploadDescription("");
      pauseRef.current = false;
      setIsPaused(false);
    }
  };

  // Query handler
  const handleQuery = async () => {
    if (!query.trim()) return;

    setQuerying(true);
    setQueryResult(null);
    setLastQueryCost(null);

    try {
      const { data, error } = await externalSupabase.functions.invoke("query-knowledge-base", {
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
  // State for batch reprocessing
  const [batchReprocessing, setBatchReprocessing] = useState<string | null>(null);
  // State for individual reprocessing (granular spinner)
  const [reprocessingDocId, setReprocessingDocId] = useState<string | null>(null);
  // State for batch reprocess confirmation dialog
  const [batchConfirmDialog, setBatchConfirmDialog] = useState<{ open: boolean; group: GroupedDocument | null; count: number }>({
    open: false,
    group: null,
    count: 0,
  });

  const getStatusBadge = (status: string, doc?: KnowledgeDocument) => {
    // Check for stuck processing first
    if (status === 'processing' && doc && isStuckProcessing(doc)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="cursor-help">
                <AlertCircle className="h-3 w-3 mr-1" />
                Atascado
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Procesando por más de 30 min. Clic en reprocesar.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    switch (status) {
      case "processed":
        return <Badge className="bg-green-500">Procesado</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500">Procesando</Badge>;
      case "failed":
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  // Open batch reprocess confirmation dialog
  const handleBatchReprocess = (group: GroupedDocument) => {
    const toReprocess = group.parts.filter(p => 
      p.status === 'failed' || 
      p.status === 'error' || 
      p.status === 'pending' ||
      isStuckProcessing(p)
    );
    
    if (toReprocess.length === 0) {
      toast.info("No hay partes para reprocesar");
      return;
    }
    
    console.log('[KB] Batch reprocess requested', group.baseName, toReprocess.length);
    setBatchConfirmDialog({ open: true, group, count: toReprocess.length });
  };

  // Execute batch reprocess after confirmation
  const confirmBatchReprocess = async () => {
    const group = batchConfirmDialog.group;
    if (!group) return;
    
    setBatchConfirmDialog({ open: false, group: null, count: 0 });
    
    const toReprocess = group.parts.filter(p => 
      p.status === 'failed' || 
      p.status === 'error' || 
      p.status === 'pending' ||
      isStuckProcessing(p)
    );
    
    setBatchReprocessing(group.baseName);
    toast.info(`Reprocesando ${toReprocess.length} partes...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of toReprocess) {
      try {
        await callKBRailway(`/api/kb/reprocess/${doc.id}`);
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Error reprocessing ${doc.name}:`, err);
      }
    }
    
    setBatchReprocessing(null);
    queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    
    if (errorCount === 0) {
      toast.success(`${successCount} partes enviadas a reprocesar`);
    } else {
      toast.warning(`${successCount} enviadas, ${errorCount} errores`);
    }
  };

  // Preview document in new tab
  const handlePreviewDocument = async (doc: KnowledgeDocument) => {
    try {
      const { data, error } = await externalSupabase.storage
        .from('knowledge-documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
      // Note: We don't revoke immediately as the new tab needs the URL
      // Browser will clean up when tab is closed
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Error al previsualizar el documento');
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


          {/* Documents List */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Documentos Técnicos</CardTitle>
                  <CardDescription>PDFs cargados para consultas con IA</CardDescription>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    {/* Upload selectors */}
                    <div className="flex items-center gap-2">
                      <Select value={uploadCategory} onValueChange={setUploadCategory}>
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={uploadSector} onValueChange={setUploadSector}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Industria" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_SECTOR_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf"
                      onChange={handleFileSelect}
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
              </div>
              
              {/* Tabs and filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Category tabs */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={docCategoryFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDocCategoryFilter('all')}
                  >
                    📚 Todos
                  </Button>
                  <Button
                    variant={docCategoryFilter === 'regulation' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDocCategoryFilter('regulation')}
                  >
                    📋 Normativa
                  </Button>
                  <Button
                    variant={docCategoryFilter === 'technical_guide' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDocCategoryFilter('technical_guide')}
                  >
                    📖 Guías Técnicas
                  </Button>
                </div>
                
                {/* Industry filter dropdown */}
                <Select value={docSectorFilter} onValueChange={setDocSectorFilter}>
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue placeholder="Filtrar por industria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las industrias</SelectItem>
                    {DOCUMENT_SECTOR_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* View mode toggle */}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant={viewMode.documents === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7"
                    onClick={() => setViewMode(prev => ({ ...prev, documents: 'list' }))}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode.documents === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7"
                    onClick={() => setViewMode(prev => ({ ...prev, documents: 'grid' }))}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tip for stuck documents */}
              {(() => {
                const groupedDocs = groupDocumentParts(documents || []);
                const hasStuck = groupedDocs.some(g => g.stuckCount > 0);
                const hasFailed = groupedDocs.some(g => g.failedCount > 0);
                
                if (hasStuck || hasFailed) {
                  return (
                    <InstructionTip 
                      variant="amber" 
                      icon="warning"
                      dismissible={false}
                      className="mb-4"
                    >
                      <strong>Atención:</strong> Hay documentos {hasStuck ? 'atascados (+30 min procesando)' : ''}{hasStuck && hasFailed ? ' o ' : ''}{hasFailed ? 'con errores' : ''}. 
                      Expande el grupo (▶) y usa el menú de 3 puntos (⋮) para <strong>"Reprocesar solo esta parte"</strong>.
                    </InstructionTip>
                  );
                }
                return null;
              })()}
              
              {/* Tip for how to use individual reprocessing */}
              <InstructionTip 
                variant="orange" 
                icon="lightbulb" 
                dismissible={true}
                persistKey="kb-reprocess-tip"
                className="mb-4"
              >
                <strong>Tip:</strong> Expande un grupo de partes (▶) para ver cada trozo. 
                Usa el menú de 3 puntos (⋮) para reprocesar solo esa parte sin afectar las demás.
              </InstructionTip>
              
              {/* Multi-part upload progress card with pause/continue */}
              {isProcessingMultiPart && uploadProgress && uploadProgress.total > 1 && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="font-medium text-sm">
                          Procesando parte {uploadProgress.current + 1} de {uploadProgress.total}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          pauseRef.current = !pauseRef.current;
                          setIsPaused(!isPaused);
                          if (!isPaused) {
                            toast.info("Procesamiento pausado. Las partes en curso terminarán.");
                          } else {
                            toast.info("Reanudando procesamiento...");
                          }
                        }}
                      >
                        {isPaused ? (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Continuar
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <Progress 
                      value={(uploadProgress.current / uploadProgress.total) * 100} 
                      className="h-2 mb-2"
                    />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% completado
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {multiPartStats.processed} procesadas
                        </span>
                        {multiPartStats.failed > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {multiPartStats.failed} fallidas
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          ⏳ {multiPartStats.pending} pendientes
                        </span>
                      </div>
                    </div>
                    
                    {isPaused && (
                      <InstructionTip variant="amber" icon="info" dismissible={false} className="mt-2">
                        Pausado - Presiona "Continuar" para reanudar. Las partes en curso terminarán.
                      </InstructionTip>
                    )}
                    
                    {!isPaused && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        💡 Se procesan máximo 3 partes a la vez para evitar saturar el servidor.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (() => {
                // Filter documents
                const filteredDocs = documents?.filter(doc => {
                  if (docCategoryFilter !== 'all' && doc.category !== docCategoryFilter) return false;
                  if (docSectorFilter !== 'all' && doc.sector !== docSectorFilter) return false;
                  return true;
                }) || [];
                
                if (filteredDocs.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{documents?.length === 0 ? 'No hay documentos cargados' : 'No hay documentos con estos filtros'}</p>
                    </div>
                  );
                }
                
                // Group document parts
                const groupedDocs = groupDocumentParts(filteredDocs);
                
                // Helper to render a single document row (for parts inside collapsible) with dropdown menu
                const renderDocumentPartRow = (doc: KnowledgeDocument, partNumber?: number, totalParts?: number) => {
                  const isThisReprocessing = reprocessingDocId === doc.id;
                  
                  return (
                    <div key={doc.id} className="flex items-center justify-between py-2 px-3 ml-6 border-l-2 border-muted hover:bg-muted/30">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground shrink-0">
                          └─ Parte {partNumber} de {totalParts}
                        </span>
                        {getStatusBadge(doc.status, doc)}
                        <span className="text-xs text-muted-foreground">
                          {doc.chunk_count || 0} chunks
                        </span>
                        {/* Show error message if available */}
                        {(doc.status === 'failed' || doc.status === 'error') && doc.description?.startsWith('Error:') && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3 w-3 text-destructive cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{doc.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Loading indicator for this specific part */}
                        {isThisReprocessing && (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        )}
                        {/* Recently sent badge */}
                        {recentlySentParts.has(doc.id) && !isThisReprocessing && (
                          <Badge className="bg-blue-500 animate-pulse text-xs">
                            ⏳ Enviado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Dropdown menu with all actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewDocument(doc);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver/Previsualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleReprocess(doc.id, doc.name);
                                  }}
                                  disabled={isThisReprocessing}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  {isThisReprocessing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : doc.status === 'pending' ? (
                                    <Play className="h-4 w-4 mr-2" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                  )}
                                  {doc.status === 'pending' ? 'Procesar solo esta parte' : 'Reprocesar solo esta parte'}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                };
                
                // Helper to render document group actions
                const renderGroupActions = (group: GroupedDocument, doc: KnowledgeDocument) => {
                  const hasFailedOrStuck = group.failedCount > 0 || group.stuckCount > 0;
                  const toReprocessCount = group.parts.filter(p => 
                    p.status === 'failed' || 
                    p.status === 'error' || 
                    p.status === 'pending' ||
                    isStuckProcessing(p)
                  ).length;
                  
                  return (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status badges */}
                    {group.isMultiPart ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {group.processedCount}/{group.totalParts}
                        </Badge>
                        {hasFailedOrStuck && (
                          <Badge variant="destructive" className="text-xs">
                            {group.failedCount + group.stuckCount}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      getStatusBadge(doc.status, doc)
                    )}
                    
                    {/* Primary actions - always visible */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{group.isMultiPart ? 'Descargar parte 1' : 'Descargar PDF'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Batch reprocess for multi-part with failures */}
                    {canManage && group.isMultiPart && toReprocessCount > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => handleBatchReprocess(group)}
                              disabled={batchReprocessing === group.baseName}
                            >
                              {batchReprocessing === group.baseName ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  {toReprocessCount}
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Reprocesar {toReprocessCount} partes (fallidas, atascadas o pendientes)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Reprocess for single document */}
                    {canManage && !group.isMultiPart && (
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
                            {doc.status === 'pending' ? 'Procesar documento' : 'Reprocesar'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Secondary actions in dropdown menu */}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => { 
                              setEditingDocId(doc.id); 
                              setEditingName(doc.name); 
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Renombrar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => { 
                              setEditingCategoryDocId(doc.id); 
                              setEditCategory(doc.category || ''); 
                              setEditSector(doc.sector || ''); 
                            }}
                          >
                            <span className="mr-2">📁</span>
                            Categorizar
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (group.isMultiPart) {
                                    if (window.confirm(`¿Eliminar "${group.baseName}" y sus ${group.totalParts} partes? Esta acción no se puede deshacer.`)) {
                                      deleteGroupMutation.mutate(group.parts);
                                    }
                                  } else {
                                    if (window.confirm(`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`)) {
                                      deleteMutation.mutate(doc);
                                    }
                                  }
                                }}
                                disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
                              >
                                {(deleteMutation.isPending || deleteGroupMutation.isPending) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                {group.isMultiPart ? `Eliminar ${group.totalParts} partes` : 'Eliminar'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );};
                
                return viewMode.documents === 'list' ? (
                <div className="space-y-2">
                  {groupedDocs.map((group) => {
                    const doc = group.mainDoc;
                    const partRegex = /^(.+)_parte(\d+)de(\d+)\.pdf$/i;
                    
                    if (group.isMultiPart) {
                      // Multi-part document - render as collapsible
                      return (
                        <Collapsible key={group.baseName} className="border rounded-lg">
                          <div className="flex items-start justify-between p-3 hover:bg-muted/50 overflow-hidden gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 mt-0.5">
                                  <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                                </Button>
                              </CollapsibleTrigger>
                              <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1 space-y-2">
                                {/* Editable title for multi-part group */}
                                {editingGroupBaseName === group.baseName ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingGroupNewName}
                                      onChange={(e) => setEditingGroupNewName(e.target.value)}
                                      className="h-8 flex-1"
                                      placeholder="Nuevo nombre del documento..."
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => renameGroupMutation.mutate({ 
                                        parts: group.parts, 
                                        oldBaseName: group.baseName, 
                                        newBaseName: editingGroupNewName 
                                      })}
                                      disabled={renameGroupMutation.isPending || !editingGroupNewName.trim()}
                                    >
                                      {renameGroupMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingGroupBaseName(null); setEditingGroupNewName(""); }}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                  <p 
                                      className="font-medium line-clamp-2 break-all cursor-pointer hover:text-primary"
                                      onClick={() => { setEditingGroupBaseName(group.baseName); setEditingGroupNewName(group.baseName); }}
                                      title="Clic para editar"
                                    >
                                      {group.baseName}.pdf
                                    </p>
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      {group.totalParts} partes
                                    </Badge>
                                    {canManage && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-6 w-6 p-0"
                                              onClick={() => { setEditingGroupBaseName(group.baseName); setEditingGroupNewName(group.baseName); }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Renombrar grupo</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                )}
                                
                                {/* Editable description for multi-part */}
                                {editingDescDocId === doc.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingDescription}
                                      onChange={(e) => setEditingDescription(e.target.value)}
                                      className="min-h-[80px] text-sm"
                                      placeholder="Descripción del documento..."
                                    />
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleGenerateDescriptionForDoc(doc)}
                                        disabled={generatingDescId === doc.id}
                                      >
                                        {generatingDescId === doc.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        Generar con IA
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
                                  <span>{group.totalChunks} chunks total</span>
                                  <span>•</span>
                                  <span>{group.processedCount}/{group.totalParts} procesados</span>
                                </div>
                                
                                {/* Category/Sector badges */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {doc.category ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.icon || '📄'}{' '}
                                      {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.label || doc.category}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">Sin tipo</Badge>
                                  )}
                                  {doc.sector ? (
                                    <Badge variant="outline" className="text-xs">
                                      {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.icon || '🌐'}{' '}
                                      {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.label || doc.sector}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {renderGroupActions(group, doc)}
                          </div>
                          <CollapsibleContent>
                            <div className="border-t bg-muted/20 py-1">
                              {group.parts.map((part, idx) => {
                                const match = part.name.match(partRegex);
                                const partNum = match ? parseInt(match[2]) : idx + 1;
                                return renderDocumentPartRow(part, partNum, group.totalParts);
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }
                    
                    // Single document - render normally
                    return (
                      <div key={doc.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 overflow-hidden gap-2">
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
                              <div className="flex items-center gap-2">
                                <p 
                                  className={`font-medium line-clamp-2 break-all ${canManage ? 'cursor-pointer hover:text-primary' : ''}`}
                                  onClick={canManage ? () => { setEditingDocId(doc.id); setEditingName(doc.name); } : undefined}
                                  title={canManage ? "Clic para editar" : undefined}
                                >
                                  {doc.name}
                                </p>
                                {canManage && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-6 w-6 p-0 shrink-0"
                                          onClick={() => { setEditingDocId(doc.id); setEditingName(doc.name); }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Renombrar documento</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
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
                                <div className="flex items-center gap-2 flex-wrap">
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
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleGenerateDescriptionForDoc(doc)}
                                    disabled={generatingDescId === doc.id}
                                  >
                                    {generatingDescId === doc.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <Sparkles className="h-3 w-3 mr-1" />
                                    )}
                                    Generar con IA
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
                            
                            {/* Category/Sector badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {doc.category ? (
                                <Badge variant="secondary" className="text-xs">
                                  {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.icon || '📄'}{' '}
                                  {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.label || doc.category}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Sin tipo</Badge>
                              )}
                              {doc.sector ? (
                                <Badge variant="outline" className="text-xs">
                                  {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.icon || '🌐'}{' '}
                                  {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.label || doc.sector}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {renderGroupActions(group, doc)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedDocs.map((group) => {
                    const doc = group.mainDoc;
                    
                    return (
                      <Card key={group.baseName} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                              <CardTitle className="text-base line-clamp-2">
                                {group.isMultiPart ? `${group.baseName}.pdf` : doc.name}
                              </CardTitle>
                            </div>
                            {group.isMultiPart ? (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {group.totalParts} partes
                              </Badge>
                            ) : (
                              getStatusBadge(doc.status, doc)
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {group.isMultiPart ? (
                              <>
                                <span>{group.totalChunks} chunks</span>
                                <span>•</span>
                                <span>{group.processedCount}/{group.totalParts} procesados</span>
                              </>
                            ) : (
                              <>
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span>•</span>
                                <span>{doc.chunk_count} chunks</span>
                              </>
                            )}
                          </div>
                          
                          {/* Category/Sector badges */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {doc.category ? (
                              <Badge variant="secondary" className="text-xs">
                                {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.icon || '📄'}{' '}
                                {DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === doc.category)?.label || doc.category}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Sin tipo</Badge>
                            )}
                            {doc.sector ? (
                              <Badge variant="outline" className="text-xs">
                                {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.icon || '🌐'}{' '}
                                {DOCUMENT_SECTOR_OPTIONS.find(s => s.value === doc.sector)?.label || doc.sector}
                              </Badge>
                            ) : null}
                          </div>
                          
                          {/* Description */}
                          {doc.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
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
                                <TooltipContent>{group.isMultiPart ? 'Descargar parte 1' : 'Descargar PDF'}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {canManage && !group.isMultiPart && (
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
                            {canManage && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => { 
                                        setEditingCategoryDocId(doc.id); 
                                        setEditCategory(doc.category || ''); 
                                        setEditSector(doc.sector || ''); 
                                      }}
                                    >
                                      📁
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Categorizar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {isAdmin && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-destructive" 
                                      onClick={() => {
                                        if (group.isMultiPart) {
                                          if (window.confirm(`¿Eliminar "${group.baseName}" y sus ${group.totalParts} partes?`)) {
                                            deleteGroupMutation.mutate(group.parts);
                                          }
                                        } else {
                                          if (window.confirm(`¿Eliminar "${doc.name}"?`)) {
                                            deleteMutation.mutate(doc);
                                          }
                                        }
                                      }}
                                      disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
                                    >
                                      {(deleteMutation.isPending || deleteGroupMutation.isPending) ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {group.isMultiPart ? `Eliminar ${group.totalParts} partes` : 'Eliminar'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
              })()}
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
                    size="sm"
                    onClick={() => pullFromExternalMutation.mutate()}
                    disabled={pullFromExternalMutation.isPending}
                    title="Importar fuentes desde BD Externa (fuente de verdad)"
                  >
                    {pullFromExternalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Pull Externa
                  </Button>
                )}
                {canManage && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => syncAllSourcesMutation.mutate()}
                    disabled={syncAllSourcesMutation.isPending}
                    title="Enviar fuentes locales a BD Externa"
                  >
                    {syncAllSourcesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Push Externa
                  </Button>
                )}
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
              {/* Sources Dashboard with Filters */}
              {sources && sources.length > 0 && (
                <SourcesDashboard 
                  sources={sources} 
                  filters={sourceFilters}
                  onFiltersChange={setSourceFilters}
                />
              )}
              
              {(() => {
                // Apply filters to sources
                const filteredSources = sources?.filter(s => {
                  if (sourceFilters.search) {
                    const searchLower = sourceFilters.search.toLowerCase();
                    const matchesSearch = 
                      s.nombre.toLowerCase().includes(searchLower) ||
                      s.url.toLowerCase().includes(searchLower) ||
                      s.descripcion?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return false;
                  }
                  if (sourceFilters.tipo && (s.tipo || 'Sin clasificar') !== sourceFilters.tipo) return false;
                  if (sourceFilters.pais && (s.pais || 'Sin región') !== sourceFilters.pais) return false;
                  if (sourceFilters.sector && (s.sector_foco || 'Sin sector') !== sourceFilters.sector) return false;
                  return true;
                }) || [];

                if (loadingSources) {
                  return (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  );
                }
                
                if (sources?.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay fuentes configuradas</p>
                    </div>
                  );
                }
                
                if (filteredSources.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay fuentes que coincidan con los filtros</p>
                    </div>
                  );
                }

                return viewMode.sources === 'grid' ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSources.map((source) => (
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
                    {filteredSources.map((source) => (
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
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* CASES SECTION */}
        {activeSection === 'cases' && (
          <CaseStudiesSection />
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

            {/* AI Model Selector */}
            <div>
              <Label className="text-sm flex items-center gap-2">
                Modelo AI
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Los modelos premium son más precisos pero más lentos y costosos. Los económicos son rápidos y baratos pero menos precisos.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select 
                value={selectedAIModel} 
                onValueChange={setSelectedAIModel}
                disabled={loadingLLMModels}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingLLMModels ? "Cargando modelos..." : "Seleccionar modelo"} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {llmModelsData?.models.map((model) => (
                    <SelectItem key={model.key} value={model.key}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.is_recommended && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Recomendado
                          </Badge>
                        )}
                        {model.is_free && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">
                            Gratis
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatModelCost(model.cost_per_query)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAIModel && llmModelsData && (
                <p className="text-xs text-muted-foreground mt-1">
                  Modelo: {llmModelsData.models.find(m => m.key === selectedAIModel)?.name}
                </p>
              )}
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
                
                <ScrollArea className="max-h-[500px]">
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
                            {source.alreadyExists && (
                              <Badge variant="outline" className="text-xs shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                                Ya en tu lista
                              </Badge>
                            )}
                            {source.tipo && !source.alreadyExists && (
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
                        {source.alreadyExists ? (
                          <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                            <Check className="h-3 w-3 mr-1" />
                            Guardada
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => addAISourceToDb(source)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Añadir
                          </Button>
                        )}
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

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (!open) {
          setShowUploadModal(false);
          setSelectedFile(null);
          setUploadDescription("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Documento
            </DialogTitle>
            <DialogDescription>
              Añade una descripción antes de subir el documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File info */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Description field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Descripción</Label>
                <span className="text-xs text-muted-foreground">
                  {uploadDescription.length}/300
                </span>
              </div>
              <Textarea
                placeholder="Describe brevemente el contenido del documento..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value.slice(0, 300))}
                className="min-h-[100px] resize-none"
                maxLength={300}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleGenerateDescription}
                disabled={generatingDescription || !selectedFile}
              >
                {generatingDescription ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generar con IA
              </Button>
            </div>

            {/* Category selector */}
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector selector */}
            <div className="space-y-2">
              <Label>Industria</Label>
              <Select value={uploadSector} onValueChange={setUploadSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una industria" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_SECTOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadModal(false);
              setSelectedFile(null);
              setUploadDescription("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={!!editingCategoryDocId} onOpenChange={(open) => !open && setEditingCategoryDocId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📁 Categorizar Documento
            </DialogTitle>
            <DialogDescription>
              Asigna un tipo y sector al documento para facilitar su consulta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={editCategory || "_none"} onValueChange={(v) => setEditCategory(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin categorizar</SelectItem>
                  {DOCUMENT_CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Industria</Label>
              <Select value={editSector || "_none"} onValueChange={(v) => setEditSector(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {DOCUMENT_SECTOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategoryDocId(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (editingCategoryDocId) {
                  updateCategoryMutation.mutate({
                    docId: editingCategoryDocId,
                    category: editCategory || null,
                    sector: editSector || null
                  });
                }
              }}
              disabled={updateCategoryMutation.isPending}
            >
              {updateCategoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Reprocess Confirmation Dialog */}
      <Dialog open={batchConfirmDialog.open} onOpenChange={(open) => !open && setBatchConfirmDialog({ open: false, group: null, count: 0 })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Confirmar reprocesado en lote
            </DialogTitle>
            <DialogDescription className="pt-2">
              Vas a reprocesar <strong>{batchConfirmDialog.count} partes</strong> del documento 
              <strong> "{batchConfirmDialog.group?.baseName}"</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <InstructionTip variant="amber" icon="warning" dismissible={false} className="my-2">
            Esto puede tardar varios minutos y consumir recursos del servidor. 
            Las partes en proceso no se pueden cancelar una vez iniciadas.
          </InstructionTip>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchConfirmDialog({ open: false, group: null, count: 0 })}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmBatchReprocess}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reprocesar {batchConfirmDialog.count} partes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}