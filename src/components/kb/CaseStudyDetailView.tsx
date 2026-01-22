import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  MapPin,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  ChevronRight,
  ExternalLink,
  FileText,
  Beaker,
  Target,
  Lightbulb,
  Cpu,
  Calendar,
  Building2,
  Loader2,
  Users,
  Globe,
  Sparkles,
  SendHorizonal,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
// Local generation removed - now using backend proxy only
import { toast } from 'sonner';
import { CaseStudyFormView } from './CaseStudyFormView';
import { TechnologyDetailModal } from '@/components/TechnologyDetailModal';
import type { Technology } from '@/types/database';

// Sector options (same as in CaseStudiesSection)
const SECTOR_OPTIONS = [
  { value: 'general', label: 'General', icon: '🌐' },
  { value: 'food_beverage', label: 'Alimentación y Bebidas', icon: '🍔' },
  { value: 'pulp_paper', label: 'Celulosa y Papel', icon: '📜' },
  { value: 'textile', label: 'Textil', icon: '👕' },
  { value: 'chemical', label: 'Química', icon: '⚗️' },
  { value: 'pharma', label: 'Farmacéutica', icon: '💊' },
  { value: 'oil_gas', label: 'Oil & Gas', icon: '⛽' },
  { value: 'metal', label: 'Metal-Mecánica', icon: '🔩' },
  { value: 'mining', label: 'Minería', icon: '⛏️' },
  { value: 'power', label: 'Energía', icon: '⚡' },
  { value: 'electronics', label: 'Electrónica/Semiconductores', icon: '💻' },
  { value: 'automotive', label: 'Automoción', icon: '🚗' },
  { value: 'cosmetics', label: 'Cosmética', icon: '🧴' },
  { value: 'municipal', label: 'Municipal', icon: '🏛️' },
];

const SECTOR_COLORS: Record<string, string> = {
  'general': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  'food_beverage': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'pulp_paper': 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300',
  'textile': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'chemical': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'pharma': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'oil_gas': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300',
  'metal': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  'mining': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'power': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'electronics': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'automotive': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'cosmetics': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'municipal': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  { value: 'processing', label: 'Procesando', color: 'bg-warning/20 text-warning' },
  { value: 'approved', label: 'Aprobado', color: 'bg-accent/20 text-accent' },
  { value: 'archived', label: 'Archivado', color: 'bg-secondary/20 text-secondary' },
];

interface CaseStudyDetailViewProps {
  caseStudyId: string;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface CaseStudyFull {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  sector: string | null;
  subsector_industrial?: string | null;
  status: string | null;
  quality_score: number | null;
  roi_percent: number | null;
  roi_rationale: string | null;
  capex: number | null;
  opex_year: number | null;
  payback_months: number | null;
  problem_parameters: Record<string, { value: number; unit: string }> | null;
  solution_applied: string | null;
  treatment_train: string[] | null;
  results_achieved: string | null;
  results_parameters: Record<string, { value: number; unit: string }> | null;
  lessons_learned: string | null;
  created_at: string;
  entity_type?: string | null;
  
  // NEW v13.0: Direct columns for document generation
  client_type?: string | null;
  situation?: string | null;
  constraints?: string[] | null;
  decision_drivers?: string[] | null;
  problem_title?: string | null;
  problem_description?: string | null;
  technical_parameters?: Record<string, { value: number; unit: string }> | null;
  methodology_approach?: string | null;
  scenarios?: any[] | null;
  evaluation_criteria?: any[] | null;
  alternatives?: any[] | null;
  final_recommendation?: string | null;
  implementation_status?: string | null;
  capex_total?: string | null;
  opex_annual?: string | null;
  lessons_what_worked?: string[] | null;
  lessons_challenges?: string[] | null;
  lessons_recommendations?: string[] | null;
  crew_version?: string | null;
  processing_time_seconds?: number | null;
  
  // original_data - supports both new nested structure (v12.7+) and legacy flat fields
  original_data?: {
    // NEW STRUCTURE (CaseStudyCrew v12.7+)
    classification?: { country?: string; sector?: string; subsector?: string };
    context?: { company?: string; industrial_context?: string };
    problem?: { title?: string; description?: string; initial_situation?: string };
    methodology?: { treatment_approach?: string; technologies_used?: string[] };
    results?: { summary?: string; improvements?: string; metrics?: any };
    economics?: { investment?: number; savings?: number; payback?: number; roi?: number };
    lessons_learned?: { key_lessons?: string; recommendations?: string };
    technologies_full?: any[];
    technologies_summary?: { total_in_case?: number; found_in_db?: number; new_for_scouting?: number };
    // LEGACY STRUCTURE (webhook flat fields)
    caso_titulo?: string;
    caso_cliente?: string;
    caso_pais?: string;
    caso_sector?: string;
    caso_descripcion_problema?: string;
    caso_solucion_aplicada?: string;
    caso_resultados?: string;
    technologies?: any[];
    quality_score?: number;
    [key: string]: any;
  } | null;
}

// Nuevo schema con columnas en español (sin application_data ni selection_rationale)
interface CaseStudyTechnology {
  id: string;
  case_study_id?: string;
  technology_id: string | null;
  scouting_queue_id?: string | null; // Opcional - puede no existir en todas las DBs
  role: string;
  // Columnas directas en español
  nombre: string;
  proveedor: string | null;
  web: string | null;
  descripcion: string | null;
  aplicacion: string | null;
  ventaja: string | null;
  trl: number | null;
  created_at?: string;
}

export const CaseStudyDetailView: React.FC<CaseStudyDetailViewProps> = ({
  caseStudyId,
  onBack,
  onEdit,
  onDelete,
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Review modal state
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  
  // State for sending to scouting queue
  const [sendingTechId, setSendingTechId] = useState<string | null>(null);
  
  // Modal states for viewing tech sheets
  const [selectedTechFromDB, setSelectedTechFromDB] = useState<Technology | null>(null);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [selectedCaseTech, setSelectedCaseTech] = useState<CaseStudyTechnology | null>(null);
  const [caseTechModalOpen, setCaseTechModalOpen] = useState(false);
  const [isLoadingTech, setIsLoadingTech] = useState(false);

  // Fetch case study
  const { data: caseStudy, isLoading } = useQuery({
    queryKey: ['case-study-detail', caseStudyId],
    queryFn: async () => {
      console.log('[CaseStudyDetail] ════════════════════════════════════════════');
      console.log('[CaseStudyDetail] Fetching case study:', caseStudyId);
      
      const { data, error } = await externalSupabase
        .from('casos_de_estudio')
        .select('*')
        .eq('id', caseStudyId)
        .single();

      if (error) {
        console.error('[CaseStudyDetail] Error fetching case study:', error);
        throw error;
      }
      
      console.log('[CaseStudyDetail] ✓ Case study loaded:', {
        id: data?.id,
        name: data?.name,
        sector: data?.sector,
        hasOriginalData: !!data?.original_data,
        originalDataKeys: data?.original_data ? Object.keys(data.original_data).slice(0, 10) : []
      });
      
      // Cast through unknown to handle JSON type conversion
      return data as unknown as CaseStudyFull;
    },
  });

  // Fetch technologies
  const { data: technologies } = useQuery({
    queryKey: ['case-study-technologies', caseStudyId],
    queryFn: async () => {
      console.log('[CaseStudyDetail] Fetching technologies for case:', caseStudyId);
      
      const { data, error } = await externalSupabase
        .from('case_study_technologies')
        .select('id, case_study_id, technology_id, role, nombre, proveedor, web, descripcion, aplicacion, ventaja, trl, created_at')
        .eq('case_study_id', caseStudyId);

      if (error) {
        console.error('[CaseStudyDetail] Error fetching technologies:', error);
        throw error;
      }
      
      console.log('[CaseStudyDetail] ✓ Technologies loaded:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[CaseStudyDetail] Sample technology:', JSON.stringify(data[0], null, 2).slice(0, 500));
      }
      
      return data as CaseStudyTechnology[];
    },
  });

  // Fetch associated job with technologies (for review button)
  const { data: associatedJob } = useQuery({
    queryKey: ['case-study-job', caseStudyId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('case_study_jobs')
        .select('id, status, result_data, technologies_new, technologies_found')
        .eq('case_study_id', caseStudyId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return null;
      
      if (data) {
        const resultData = data.result_data as any;
        const hasTechs = 
          (data.technologies_new && data.technologies_new > 0) ||
          (data.technologies_found && data.technologies_found > 0) ||
          (resultData?.technologies?.technologies_new?.length > 0) ||
          (resultData?.technologies?.technologies_found?.length > 0);
        
        if (hasTechs) {
          return { jobId: data.id };
        }
      }
      return null;
    },
    enabled: !technologies?.length, // Only fetch if no technologies
  });

  const getTechStatusBadge = (tech: CaseStudyTechnology) => {
    if (tech.technology_id) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
          🟢 Vinculada
        </Badge>
      );
    }
    if (tech.scouting_queue_id) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700">
          🟡 En revisión
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600">
        ⚪ Sin vincular
      </Badge>
    );
  };

  const getSectorLabel = (sectorValue: string | null): string => {
    if (!sectorValue) return 'Sin sector';
    const sector = SECTOR_OPTIONS.find(s => s.value === sectorValue);
    return sector?.label || sectorValue;
  };

  const getSectorBadge = (sector: string | null) => {
    if (!sector) return 'bg-muted text-muted-foreground';
    return SECTOR_COLORS[sector] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (status: string | null) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found || { color: 'bg-muted text-muted-foreground', label: status || 'Sin estado' };
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  // Download document from backend via Edge Function proxy
  const handleDownloadWord = async () => {
    if (!caseStudy) return;
    
    setIsDownloading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/case-study-document-proxy?id=${caseStudyId}`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caso_estudio_${caseStudyId}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Documento descargado');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // First delete associated technologies
      await externalSupabase
        .from('case_study_technologies')
        .delete()
        .eq('case_study_id', caseStudyId);
      
      // Then delete the case study
      const { error } = await externalSupabase
        .from('casos_de_estudio')
        .delete()
        .eq('id', caseStudyId);
      
      if (error) throw error;
      
      toast.success('Caso de estudio eliminado correctamente');
      onDelete?.();
      onBack();
    } catch (error) {
      console.error('Error deleting case study:', error);
      toast.error('Error al eliminar el caso de estudio');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Send technology to scouting queue for review
  const handleSendToScoutingQueue = async (tech: CaseStudyTechnology) => {
    if (tech.technology_id || tech.scouting_queue_id) {
      toast.error('Esta tecnología ya está vinculada o en revisión');
      return;
    }
    
    setSendingTechId(tech.id);
    
    try {
      // Insert into scouting_queue - leer columnas directas de case_study_technologies
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .insert({
          "Nombre de la tecnología": tech.nombre,
          "Tipo de tecnología": 'Sin clasificar',
          "Proveedor / Empresa": tech.proveedor || null,
          "Web de la empresa": tech.web || null,
          "Descripción técnica breve": tech.descripcion || null,
          "Aplicación principal": tech.aplicacion || null,
          "Ventaja competitiva clave": tech.ventaja || null,
          "Grado de madurez (TRL)": tech.trl || null,
          "Comentarios del analista": `Extraída del caso de estudio: ${caseStudy?.name}`,
          source: 'case_study',
          case_study_id: caseStudyId,
          queue_status: 'review',
          "Fecha de scouting": new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Update case_study_technologies with the new scouting_queue_id
      await externalSupabase
        .from('case_study_technologies')
        .update({ scouting_queue_id: data.id })
        .eq('id', tech.id);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['case-study-technologies', caseStudyId] });
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['scouting-counts'] });
      
      toast.success('Tecnología enviada a revisión', {
        description: `${tech.nombre} está ahora en la cola de scouting`
      });
    } catch (error: any) {
      console.error('Error sending to scouting queue:', error);
      toast.error('Error al enviar a revisión', { description: error.message });
    } finally {
      setSendingTechId(null);
    }
  };

  // Handle viewing technology sheet
  const handleViewTechSheet = async (tech: CaseStudyTechnology) => {
    if (tech.technology_id) {
      // LINKED: fetch full data from technologies table
      setIsLoadingTech(true);
      const { data } = await externalSupabase
        .from('technologies')
        .select('*')
        .eq('id', tech.technology_id)
        .maybeSingle();
      
      setIsLoadingTech(false);
      if (data) {
        setSelectedTechFromDB(data as Technology);
        setTechModalOpen(true);
      } else {
        toast.error('No se encontró la tecnología en la base de datos');
      }
    } else {
      // NOT LINKED: open simplified modal with application_data
      setSelectedCaseTech(tech);
      setCaseTechModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!caseStudy) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Caso no encontrado</h3>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(caseStudy.status);
  
  // Normalizar roles: soportar Railway (primary/secondary/support) y legacy (recommended/evaluated/Recomendada/Evaluada)
  const normalizeRole = (role: string): 'recommended' | 'evaluated' => {
    const lower = (role || '').toLowerCase();
    // Railway usa: primary, secondary, support
    // Legacy/Manual: recommended, evaluated, Recomendada, Evaluada
    if (lower === 'primary' || lower === 'recommended' || lower === 'recomendada') {
      return 'recommended';
    }
    // secondary, support, evaluated, evaluada -> all considered "evaluated"
    return 'evaluated';
  };
  
  console.log('[CaseStudyDetailView] Technologies raw:', technologies);
  console.log('[CaseStudyDetailView] Unique roles:', [...new Set(technologies?.map(t => t.role) || [])]);
  
  const recommendedTechs = technologies?.filter(t => normalizeRole(t.role) === 'recommended') || [];
  const evaluatedTechs = technologies?.filter(t => normalizeRole(t.role) === 'evaluated') || [];

  // ═══════════════════════════════════════════════════════════════════
  // EXTRACT DATA FROM original_data WITH FALLBACK TO DIRECT FIELDS
  // Supports both NEW structure (v12.7+) and LEGACY flat fields
  // ═══════════════════════════════════════════════════════════════════
  const od = caseStudy.original_data || {};
  
  // DEBUG LOGS - will help identify data structure
  console.log('[CaseStudyDetailView] ════════════════════════════════════════════');
  console.log('[CaseStudyDetailView] caseStudy:', caseStudy);
  console.log('[CaseStudyDetailView] original_data keys:', Object.keys(od));
  console.log('[CaseStudyDetailView] od.classification:', od.classification);
  console.log('[CaseStudyDetailView] od.problem:', od.problem);
  console.log('[CaseStudyDetailView] od.results:', od.results);
  console.log('[CaseStudyDetailView] od.economics:', od.economics);
  console.log('[CaseStudyDetailView] od.methodology:', od.methodology);
  console.log('[CaseStudyDetailView] technologies count:', technologies?.length);
  console.log('[CaseStudyDetailView] ════════════════════════════════════════════');
  
  // Title: v13.0 direct column -> NEW structure -> LEGACY structure
  const displayTitle = caseStudy.problem_title ||
                       caseStudy.name || 
                       od.problem?.title || 
                       od.caso_titulo || 
                       'Sin título';
  
  // Client/Entity: v13.0 client_type -> NEW context.company -> LEGACY
  const displayClient = caseStudy.client_type ||
                        od.context?.company || 
                        od.caso_cliente || 
                        caseStudy.entity_type || 
                        null;
  
  // Country: direct column -> NEW classification.country -> LEGACY caso_pais
  const displayCountry = caseStudy.country || 
                         od.classification?.country || 
                         od.caso_pais || 
                         null;
  
  // Sector: direct column -> NEW classification.sector -> LEGACY caso_sector
  const displaySector = caseStudy.sector || 
                        od.classification?.sector || 
                        od.caso_sector || 
                        null;
  
  // Description (Problem): v13.0 problem_description -> situation -> direct column -> NEW -> LEGACY
  const displayDescriptionRaw = caseStudy.problem_description ||
                                caseStudy.situation ||
                                caseStudy.description || 
                                od.problem?.description || 
                                od.problem?.initial_situation ||
                                od.caso_descripcion_problema || 
                                '';
  
  // Solution: v13.0 methodology_approach -> direct column -> NEW -> LEGACY
  const displaySolution = caseStudy.methodology_approach ||
                          caseStudy.solution_applied || 
                          od.methodology?.treatment_approach || 
                          od.caso_solucion_aplicada || 
                          null;
  
  // Results: v13.0 final_recommendation -> direct column -> NEW -> LEGACY
  const displayResults = caseStudy.final_recommendation ||
                         caseStudy.results_achieved || 
                         od.results?.summary || 
                         od.results?.improvements ||
                         od.caso_resultados || 
                         null;

  // Economics: v13.0 direct columns -> legacy columns -> NEW economics.* structure
  const econ = od.economics || {};
  // Handle string or number for CAPEX/OPEX (v13.0 uses string like "50.000 €")
    const rawCapex = (caseStudy.capex_total || caseStudy.capex) ?? econ.investment ?? null;
    const rawOpex = (caseStudy.opex_annual || caseStudy.opex_year) ?? econ.savings ?? null;
  const displayCapex = typeof rawCapex === 'string' ? rawCapex : rawCapex;
  const displayOpex = typeof rawOpex === 'string' ? rawOpex : rawOpex;
  const displayPayback = caseStudy.payback_months ?? econ.payback ?? null;
  const displayRoi = caseStudy.roi_percent ?? econ.roi ?? null;
  const displayQuality = caseStudy.quality_score ?? od.quality_score ?? null;

  // Get problem parameters - v13.0 uses technical_parameters
  const problemParams = caseStudy.technical_parameters || caseStudy.problem_parameters || {};
  const problemParamsList = Object.entries(problemParams)
    .filter(([, data]) => data != null && typeof data === 'object')
    .map(([name, data]: [string, any]) => ({
      name,
      value: data?.value ?? null,
      unit: data?.unit ?? '',
    }));

  // Get results parameters - with null safety
  const resultsParams = caseStudy.results_parameters || {};
  const dqoFinal = resultsParams['DQO_final'] ?? null;
  const reduction = resultsParams['Reduccion'] ?? null;

  // v13.0: Get lessons as structured arrays
  const lessonsWhatWorked = caseStudy.lessons_what_worked || [];
  const lessonsChallenges = caseStudy.lessons_challenges || [];
  const lessonsRecommendations = caseStudy.lessons_recommendations || [];
  const hasStructuredLessons = lessonsWhatWorked.length > 0 || lessonsChallenges.length > 0 || lessonsRecommendations.length > 0;

  // v13.0: Get constraints and decision drivers
  const constraints = caseStudy.constraints || [];
  const decisionDrivers = caseStudy.decision_drivers || [];

  // Truncate description
  const shouldTruncate = displayDescriptionRaw.length > 200;
  const displayedDescription = descriptionExpanded || !shouldTruncate
    ? displayDescriptionRaw
    : displayDescriptionRaw.slice(0, 200) + '...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{displayTitle}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getSectorBadge(displaySector)}>
                {getSectorLabel(displaySector)}
              </Badge>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          <Button variant="outline" onClick={handleDownloadWord} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar Word
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumen del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Cliente
              </p>
              <p className="font-medium">{displayClient || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                País
              </p>
              <p className="font-medium">{displayCountry || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Sector
              </p>
              <p className="font-medium">{getSectorLabel(displaySector)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha de Creación
              </p>
              <p className="font-medium">{new Date(caseStudy.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Puntuación de Calidad</p>
              <div className="flex items-center gap-2">
                <Progress value={displayQuality || 0} className="h-2 flex-1" />
                <span className="text-sm font-medium">{displayQuality || 0}/100</span>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                ROI
              </p>
              <p className="font-semibold text-lg text-accent">
                {displayRoi !== null ? `${displayRoi}%` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                CAPEX
              </p>
              <p className="font-semibold text-lg">
                {typeof displayCapex === 'string' ? displayCapex : formatCurrency(displayCapex)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                OPEX Anual
              </p>
              <p className="font-semibold text-lg">
                {typeof displayOpex === 'string' ? displayOpex : formatCurrency(displayOpex)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Payback
              </p>
              <p className="font-semibold text-lg">
                {displayPayback !== null ? `${displayPayback} meses` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tecnologías</p>
              <p className="font-semibold text-lg text-primary">
                {(technologies?.length || 0)} asociadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-destructive" />
              Problema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayedDescription || 'Sin descripción'}
              </p>
              {shouldTruncate && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                >
                  {descriptionExpanded ? 'Ver menos' : 'Ver más'}
                </Button>
              )}
            </div>
            
            {problemParamsList.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-4">
                  {problemParamsList.map((param, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm font-medium">{param.name}:</span>
                      <Badge variant="outline">
                        {param.value} {param.unit}
                      </Badge>
                      {i < problemParamsList.length - 1 && (
                        <span className="text-muted-foreground">|</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Solution Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Solución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displaySolution || 'Sin descripción'}
            </p>
            
            {caseStudy.treatment_train && caseStudy.treatment_train.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tren de tratamiento</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {caseStudy.treatment_train.map((stage, i) => (
                      <React.Fragment key={i}>
                        <Badge variant="secondary" className="px-3 py-1">
                          {stage}
                        </Badge>
                        {i < caseStudy.treatment_train!.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Beaker className="h-5 w-5 text-accent" />
              Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayResults || 'Sin descripción'}
            </p>
            
            {(dqoFinal?.value || reduction?.value) && (
              <>
                <Separator />
                <div className="flex gap-6">
                  {dqoFinal?.value && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">DQO final</p>
                      <p className="text-lg font-semibold">
                        {dqoFinal.value} <span className="text-sm font-normal text-muted-foreground">{dqoFinal.unit || ''}</span>
                      </p>
                    </div>
                  )}
                  {reduction?.value && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reducción</p>
                      <p className="text-lg font-semibold text-accent">
                        {reduction.value}<span className="text-sm font-normal">%</span>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Technologies Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Tecnologías
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommended */}
            {recommendedTechs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Recomendadas</p>
                <div className="space-y-2">
                  {recommendedTechs.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-2 rounded-md bg-accent/5 border border-accent/20"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium">{tech.nombre}</p>
                          {tech.proveedor && (
                            <p className="text-xs text-muted-foreground">{tech.proveedor}</p>
                          )}
                        </div>
                        {getTechStatusBadge(tech)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs gap-1"
                          onClick={() => handleViewTechSheet(tech)}
                          disabled={isLoadingTech}
                        >
                          Ver ficha
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        {/* Send to review button for unlinked technologies */}
                        {!tech.technology_id && !tech.scouting_queue_id && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => handleSendToScoutingQueue(tech)}
                            disabled={sendingTechId === tech.id}
                          >
                            {sendingTechId === tech.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SendHorizonal className="h-3 w-3" />
                            )}
                            Enviar a revisión
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluated */}
            {evaluatedTechs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Evaluadas</p>
                <div className="space-y-2">
                  {evaluatedTechs.map((tech) => (
                    <div key={tech.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="py-1">
                          {tech.nombre}
                          {tech.proveedor && ` (${tech.proveedor})`}
                        </Badge>
                        {getTechStatusBadge(tech)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs gap-1"
                          onClick={() => handleViewTechSheet(tech)}
                          disabled={isLoadingTech}
                        >
                          Ver ficha
                        </Button>
                        {/* Send to review button for unlinked technologies */}
                        {!tech.technology_id && !tech.scouting_queue_id && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs gap-1"
                            onClick={() => handleSendToScoutingQueue(tech)}
                            disabled={sendingTechId === tech.id}
                          >
                            {sendingTechId === tech.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SendHorizonal className="h-3 w-3" />
                            )}
                            Revisar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: show ALL technologies if filters don't match */}
            {recommendedTechs.length === 0 && evaluatedTechs.length === 0 && technologies && technologies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Todas las tecnologías ({technologies.length})
                </p>
                <div className="space-y-2">
                    {technologies.map((tech) => (
                      <div key={tech.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tech.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {tech.proveedor && `${tech.proveedor} • `}Rol: {tech.role || 'Sin rol'}
                            </p>
                          </div>
                        {getTechStatusBadge(tech)}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleViewTechSheet(tech)}
                        disabled={isLoadingTech}
                      >
                        Ver ficha
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      {/* Send to review button for unlinked technologies */}
                      {!tech.technology_id && !tech.scouting_queue_id && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1 ml-2"
                          onClick={() => handleSendToScoutingQueue(tech)}
                          disabled={sendingTechId === tech.id}
                        >
                          {sendingTechId === tech.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SendHorizonal className="h-3 w-3" />
                          )}
                          Enviar a revisión
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!technologies || technologies.length === 0) && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No hay tecnologías asociadas</p>
                {associatedJob?.jobId && (
                  <Button 
                    onClick={() => setReviewJobId(associatedJob.jobId)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Revisar tecnologías extraídas
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards - v13.0: Support structured lessons */}
      {(caseStudy.roi_rationale || caseStudy.lessons_learned || hasStructuredLessons) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROI Rationale */}
          {caseStudy.roi_rationale && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Justificación del ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caseStudy.roi_rationale}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Lessons Learned - v13.0: Support structured arrays */}
          {(caseStudy.lessons_learned || hasStructuredLessons) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  Lecciones Aprendidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* v13.0: Structured lessons */}
                {lessonsWhatWorked.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-2">✓ Lo que funcionó</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {lessonsWhatWorked.map((lesson, i) => (
                        <li key={i}>{lesson}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lessonsChallenges.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-600 mb-2">⚠️ Desafíos</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {lessonsChallenges.map((lesson, i) => (
                        <li key={i}>{lesson}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lessonsRecommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-2">💡 Recomendaciones</p>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                      {lessonsRecommendations.map((lesson, i) => (
                        <li key={i}>{lesson}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {/* Legacy: Plain text lessons */}
                {!hasStructuredLessons && caseStudy.lessons_learned && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {caseStudy.lessons_learned}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {/* Download CTA Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Documento completo</p>
                <p className="text-sm text-muted-foreground">
                  Para ver el caso completo con todos los detalles, descarga el documento Word.
                </p>
              </div>
            </div>
            <Button size="lg" onClick={handleDownloadWord} disabled={isDownloading} className="gap-2">
              {isDownloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Descargar Caso de Estudio Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar caso de estudio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el caso de estudio "{caseStudy.name}" y todas sus tecnologías asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Extraction Modal */}
      <Dialog 
        open={!!reviewJobId} 
        onOpenChange={(open) => !open && setReviewJobId(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Revisar Extracción
            </DialogTitle>
          </DialogHeader>
          {reviewJobId && (
            <CaseStudyFormView
              jobId={reviewJobId}
              existingCaseId={caseStudyId}
              onBack={() => setReviewJobId(null)}
              onSaved={() => {
                setReviewJobId(null);
                queryClient.invalidateQueries({ queryKey: ['case-study-technologies', caseStudyId] });
                queryClient.invalidateQueries({ queryKey: ['case-study-detail', caseStudyId] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal for LINKED technology from catalog */}
      <TechnologyDetailModal
        technology={selectedTechFromDB}
        open={techModalOpen}
        onOpenChange={setTechModalOpen}
      />

      {/* Modal for UNLINKED technology - leer columnas directas */}
      <Dialog open={caseTechModalOpen} onOpenChange={setCaseTechModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              {selectedCaseTech?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCaseTech && (
            <div className="space-y-4">
              {/* Provider and TRL */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedCaseTech.proveedor && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCaseTech.proveedor}</span>
                  </div>
                )}
                {selectedCaseTech.trl && (
                  <Badge variant="outline">TRL {selectedCaseTech.trl}</Badge>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                <p className="text-sm">{selectedCaseTech.descripcion || 'Sin información'}</p>
              </div>

              {/* Main Application */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Aplicación principal</p>
                <p className="text-sm">{selectedCaseTech.aplicacion || 'Sin información'}</p>
              </div>

              {/* Competitive Advantage */}
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs font-medium text-primary mb-1">Ventaja competitiva</p>
                <p className="text-sm">{selectedCaseTech.ventaja || 'Sin información'}</p>
              </div>

              {/* Links */}
              {selectedCaseTech.web && (
                <div className="flex items-center gap-2 pt-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={selectedCaseTech.web.startsWith('http') 
                      ? selectedCaseTech.web 
                      : `https://${selectedCaseTech.web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {selectedCaseTech.web}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Footer with status and send to review button */}
              <div className="pt-4 border-t flex justify-between items-center">
                {getTechStatusBadge(selectedCaseTech)}
                {!selectedCaseTech.technology_id && !selectedCaseTech.scouting_queue_id && (
                  <Button 
                    onClick={() => {
                      handleSendToScoutingQueue(selectedCaseTech);
                      setCaseTechModalOpen(false);
                    }}
                    disabled={sendingTechId === selectedCaseTech.id}
                    className="gap-2"
                  >
                    {sendingTechId === selectedCaseTech.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizonal className="h-4 w-4" />
                    )}
                    Enviar a revisión
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
