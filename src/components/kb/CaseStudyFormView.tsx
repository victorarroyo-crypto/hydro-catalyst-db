import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
  AlertCircle,
  Eye,
  Building2,
  Globe,
  Lightbulb,
  Tag,
  MapPin,
  Mail,
  FileText,
  Trophy,
  Zap,
  DollarSign,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { toast } from 'sonner';
import { useCaseStudyFiles } from '@/hooks/useCaseStudyFiles';
import { PAISES } from '@/constants/taxonomyData';

// Sector options matching Documentos Técnicos
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
  { value: 'municipal', label: 'Municipal', icon: '🏛️' },
];

interface Parameter {
  id: string;
  name: string;
  value: string;
  unit: string;
}

// Helper function to map Spanish role to DB constraint values
const mapRoleToDb = (role: string): 'recommended' | 'evaluated' | 'mentioned' => {
  if (role === 'Recomendada') return 'recommended';
  if (role === 'Mencionada') return 'mentioned';
  return 'evaluated';
};

// Helper to safely convert any value to string (handles objects, null, undefined)
const ensureString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // For objects/arrays, return empty string (data already saved in external DB)
  return '';
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN ROBUSTA DE TECNOLOGÍAS - Soporta múltiples estructuras de Railway
// ═══════════════════════════════════════════════════════════════════════════════
interface NormalizedTech {
  id: string;
  name: string;
  provider: string;
  role: 'Recomendada' | 'Evaluada';
  status: 'new' | 'linked' | 'sent_to_scouting';
  linkedTechId?: string;
  description: string;
  trl: number | null;
  type: string;
  subcategory: string;
  sector: string;
  web: string;
  email: string;
  country: string;
  mainApplication: string;
  innovationAdvantages: string;
  references: string;
  countriesActive: string;
  capacity: string;
  removalEfficiency: string;
  footprint: string;
  powerConsumption: string;
  otherSpecs: Record<string, any> | null;
  priceRange: string;
  opexEstimate: string;
  businessModel: string;
  leadTime: string;
  rationale: string;
}

/**
 * Normaliza una tecnología desde cualquier estructura de Railway/webhook
 * Soporta: ficha anidada, campos planos, structure v12.7+, case_study_technologies
 */
const normalizeTechnology = (raw: any, index: number): NormalizedTech => {
  console.log(`[normalizeTech] Raw tech ${index}:`, JSON.stringify(raw, null, 2).slice(0, 500));
  
  const ficha = raw.ficha || {};
  
  // Nombre: múltiples fallbacks
  const name = raw.technology_name || raw.nombre || raw.name || ficha.nombre || ficha.name || '';
  
  // Proveedor: múltiples fallbacks  
  const provider = raw.provider || raw.proveedor || ficha.proveedor || ficha.provider || '';
  
  // Role: mapear inglés/español
  let role: 'Recomendada' | 'Evaluada' = 'Evaluada';
  const rawRole = (raw.role || raw.rol || ficha.role || '').toLowerCase();
  if (rawRole === 'recommended' || rawRole === 'recomendada') {
    role = 'Recomendada';
  }
  
  // Status: determinar si está vinculada
  let status: 'new' | 'linked' | 'sent_to_scouting' = 'new';
  if (raw.technology_id || raw.linkedTechId) status = 'linked';
  else if (raw.scouting_queue_id) status = 'sent_to_scouting';
  else if (raw.status) status = raw.status;
  
  // Descripción técnica
  const description = 
    raw.technical_description || 
    raw.description || 
    raw.descripcion ||
    ficha.descripcion || 
    ficha.description || 
    ficha.technical_description ||
    raw.selection_rationale ||
    '';
  
  // TRL
  const trl = raw.trl_estimated || raw.trl || ficha.trl || ficha.trl_estimated || null;
  
  // Clasificación
  const type = raw.type_suggested || raw.type || raw.tipo || ficha.tipo || ficha.type || '';
  const subcategory = raw.subcategory_suggested || raw.subcategory || raw.subcategoria || ficha.subcategoria || '';
  const sector = raw.sector_suggested || raw.sector || ficha.sector || '';
  
  // Contacto y ubicación
  const web = 
    raw.provider_url || raw.web || raw.url || raw.website ||
    ficha.web || ficha.url || ficha.provider_url || ficha.website || '';
  const email = raw.provider_email || raw.email || ficha.email || ficha.provider_email || '';
  const country = raw.provider_country || raw.country || raw.pais || ficha.pais || ficha.country || '';
  
  // Campos de aplicación
  const mainApplication = raw.main_application || raw.aplicacion_principal || ficha.aplicacion_principal || '';
  const innovationAdvantages = raw.innovation_advantages || raw.ventaja_competitiva || ficha.ventaja_competitiva || '';
  const references = raw.references || raw.referencias || ficha.referencias || '';
  
  // Campos técnicos extendidos
  const countriesActive = raw.provider_countries_active || raw.paises_activos || ficha.paises_activos || '';
  const capacity = raw.capacity || raw.capacidad || ficha.capacidad || '';
  const removalEfficiency = raw.removal_efficiency || raw.eficiencia_remocion || ficha.eficiencia_remocion || '';
  const footprint = raw.footprint || raw.huella || ficha.huella || '';
  const powerConsumption = raw.power_consumption || raw.consumo_energia || ficha.consumo_energia || '';
  const otherSpecs = raw.other_specs || raw.otras_specs || ficha.otras_specs || null;
  const priceRange = raw.price_range || raw.rango_precio || ficha.rango_precio || '';
  const opexEstimate = raw.opex_estimate || raw.opex_estimado || ficha.opex_estimado || '';
  const businessModel = raw.business_model || raw.modelo_negocio || ficha.modelo_negocio || '';
  const leadTime = raw.lead_time || raw.tiempo_entrega || ficha.tiempo_entrega || '';
  const rationale = raw.rationale || raw.selection_rationale || raw.justificacion || ficha.justificacion || '';
  
  const normalized: NormalizedTech = {
    id: raw.id || String(index + 1),
    name,
    provider,
    role,
    status,
    linkedTechId: raw.technology_id || raw.linkedTechId,
    description,
    trl,
    type,
    subcategory,
    sector,
    web,
    email,
    country,
    mainApplication,
    innovationAdvantages,
    references,
    countriesActive,
    capacity,
    removalEfficiency,
    footprint,
    powerConsumption,
    otherSpecs,
    priceRange,
    opexEstimate,
    businessModel,
    leadTime,
    rationale,
  };
  
  console.log(`[normalizeTech] Normalized ${index}: name="${name}", provider="${provider}", role="${role}"`);
  return normalized;
};

interface Technology {
  id: string;
  name: string;
  provider: string;
  role: 'Recomendada' | 'Evaluada';
  status?: 'new' | 'linked' | 'sent_to_scouting';
  linkedTechId?: string;
  
  // Campos principales de Railway → Mapean a ficha estándar
  description?: string;           // → "Descripción técnica breve"
  trl?: number;                   // → "Grado de madurez (TRL)"
  type?: string;                  // → "Tipo de tecnología"
  subcategory?: string;           // → "Subcategoría"
  sector?: string;                // → "Sector y subsector"
  web?: string;                   // → "Web de la empresa"
  email?: string;                 // → "Email de contacto"
  country?: string;               // → "País de origen"
  
  // Campos técnicos extendidos → Mapean a ficha estándar
  mainApplication?: string;       // → "Aplicación principal"
  innovationAdvantages?: string;  // → "Ventaja competitiva clave"
  references?: string;            // → "Casos de referencia"
  
  // Campos que van a application_data (JSONB)
  countriesActive?: string;       // Países donde opera
  capacity?: string;
  removalEfficiency?: string;
  footprint?: string;
  powerConsumption?: string;
  otherSpecs?: Record<string, any>;
  priceRange?: string;
  opexEstimate?: string;
  businessModel?: string;
  leadTime?: string;
  rationale?: string;
}

// Nested structure from Railway
interface ExtractedData {
  title?: string;
  sector?: string;
  country?: string;
  subsector?: string;
  problem?: {
    description?: string;
    parameters?: { name: string; value: number; unit: string }[];
  };
  solution?: {
    description?: string;
    treatment_train?: string[];
  };
  results?: {
    description?: string;
    dqo_final?: number;
    reduction?: number;
  };
  economic?: {
    capex?: number;
    opex?: number;
    payback?: number;
    roi?: number;
    roi_justification?: string;
  };
  lessons_learned?: string;
}

// Technologies structure from Railway - Complete fields
interface RailwayTechnologyItem {
  name: string;
  provider?: string;
  provider_url?: string;
  provider_email?: string;
  provider_country?: string;
  provider_countries_active?: string;
  role?: string;
  
  // Classification
  type_suggested?: string;
  subcategory_suggested?: string;
  sector_suggested?: string;
  
  // Description & Innovation
  technical_description?: string;
  main_application?: string;
  innovation_advantages?: string;
  references?: string;
  
  // Technical specs
  capacity?: string;
  removal_efficiency?: string;
  footprint?: string;
  power_consumption?: string;
  other_specs?: Record<string, any>;
  
  // Commercial
  price_range?: string;
  opex_estimate?: string;
  business_model?: string;
  lead_time?: string;
  
  // Metadata
  trl_estimated?: number;
  rationale?: string;
  
  // Legacy fields for backward compatibility
  description?: string;
  web?: string;
  url?: string;
  website?: string;
}

interface RailwayTechnologiesObject {
  summary?: { found_in_db: number; new_for_scouting: number; total_mentioned: number };
  technologies_found?: RailwayTechnologyItem[];
  technologies_new?: RailwayTechnologyItem[];
}

interface ResultData {
  // Nested structure from Railway
  extracted?: ExtractedData;
  technologies?: 
    | { name: string; provider: string; role: string }[]  // Legacy array
    | RailwayTechnologiesObject;                          // Railway object
  review?: { quality_score?: number };
  
  // Legacy flat structure (backward compatibility)
  title?: string;
  sector?: string;
  country?: string;
  subsector?: string;
  problemDescription?: string;
  problemParameters?: { name: string; value: number; unit: string }[];
  solutionDescription?: string;
  treatmentTrain?: string[];
  resultsDescription?: string;
  dqoFinal?: number;
  reduction?: number;
  capex?: number;
  opex?: number;
  payback?: number;
  roi?: number;
  roiJustification?: string;
  lessonsLearned?: string;
  qualityScore?: number;
}

// Helper component for displaying info rows with icon and optional link
const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}> = ({ icon: Icon, label, value, isLink = false }) => {
  const displayValue = value != null && String(value).trim().length > 0 ? String(value) : null;
  
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {!displayValue ? (
          <p className="text-sm text-muted-foreground/50 italic">Sin información</p>
        ) : isLink ? (
          <a 
            href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-secondary hover:underline flex items-center gap-1 break-all"
          >
            {displayValue}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-foreground">{displayValue}</p>
        )}
      </div>
    </div>
  );
};

interface CaseStudyFormViewProps {
  jobId: string;
  existingCaseId?: string;  // If provided, update this case instead of creating new
  onBack: () => void;
  onSaved: () => void;
}

export const CaseStudyFormView: React.FC<CaseStudyFormViewProps> = ({
  jobId,
  existingCaseId,
  onBack,
  onSaved,
}) => {
  const { clearFiles } = useCaseStudyFiles();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [qualityScore, setQualityScore] = useState(0);
  
  // Form state
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [subsector, setSubsector] = useState('');
  
  const [problemDescription, setProblemDescription] = useState('');
  const [problemParameters, setProblemParameters] = useState<Parameter[]>([
    { id: '1', name: 'DQO', value: '', unit: 'mg/L' },
    { id: '2', name: 'DBO', value: '', unit: 'mg/L' },
    { id: '3', name: 'Caudal', value: '', unit: 'm³/d' },
  ]);
  
  const [solutionDescription, setSolutionDescription] = useState('');
  const [treatmentTrain, setTreatmentTrain] = useState<string[]>([]);
  const [newTreatment, setNewTreatment] = useState('');
  
  const [resultsDescription, setResultsDescription] = useState('');
  const [dqoFinal, setDqoFinal] = useState('');
  const [reduction, setReduction] = useState('');
  
  const [capex, setCapex] = useState('');
  const [opex, setOpex] = useState('');
  const [payback, setPayback] = useState('');
  const [roi, setRoi] = useState('');
  const [roiJustification, setRoiJustification] = useState('');
  
  const [lessonsLearned, setLessonsLearned] = useState('');
  
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [newTechName, setNewTechName] = useState('');
  const [newTechProvider, setNewTechProvider] = useState('');
  const [newTechRole, setNewTechRole] = useState<'Recomendada' | 'Evaluada'>('Evaluada');
  
  const [economicOpen, setEconomicOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  
  // Technology detail modal state
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS: Prioriza caso existente → luego job → con fallbacks v12.7+
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadData = async () => {
      console.log('[CaseStudyForm] ════════════════════════════════════════════');
      console.log('[CaseStudyForm] Loading data for jobId:', jobId);
      console.log('[CaseStudyForm] existingCaseId:', existingCaseId);
      
      try {
        // ───────────────────────────────────────────────────────────────────────
        // PASO 1: Si hay caso existente, cargar desde casos_de_estudio
        // ───────────────────────────────────────────────────────────────────────
        let caseData: any = null;
        let caseStudyId: string | null = existingCaseId || null;
        
        // First, check if job has case_study_id
        const { data: job, error: jobError } = await externalSupabase
          .from('case_study_jobs')
          .select('result_data, quality_score, case_study_id')
          .eq('id', jobId)
          .single();
          
        if (jobError) {
          console.error('[CaseStudyForm] Error loading job:', jobError);
        } else {
          console.log('[CaseStudyForm] Job loaded:', {
            hasResultData: !!job?.result_data,
            qualityScore: job?.quality_score,
            caseStudyId: job?.case_study_id
          });
          
          if (job?.quality_score) {
            setQualityScore(job.quality_score);
          }
          
          // Use case_study_id from job if not provided
          if (!caseStudyId && job?.case_study_id) {
            caseStudyId = job.case_study_id;
            console.log('[CaseStudyForm] Using case_study_id from job:', caseStudyId);
          }
        }
        
        // Load case study if we have an ID
        if (caseStudyId) {
          const { data: existingCase, error: caseError } = await externalSupabase
            .from('casos_de_estudio')
            .select('*')
            .eq('id', caseStudyId)
            .single();
            
          if (caseError) {
            console.error('[CaseStudyForm] Error loading existing case:', caseError);
          } else if (existingCase) {
            caseData = existingCase;
            console.log('[CaseStudyForm] ✓ Existing case loaded:', {
              id: caseData.id,
              name: caseData.name,
              hasOriginalData: !!caseData.original_data,
              originalDataKeys: caseData.original_data ? Object.keys(caseData.original_data) : []
            });
          }
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // PASO 2: Extraer datos con fallbacks
        // Prioridad: columnas DB → original_data → job.result_data
        // ───────────────────────────────────────────────────────────────────────
        const od = caseData?.original_data || {};
        const resultData = job?.result_data as ResultData || {};
        const extracted = resultData.extracted || {};
        
        console.log('[CaseStudyForm] Data sources:', {
          hasDbColumns: !!caseData?.name,
          hasOriginalData: Object.keys(od).length > 0,
          originalDataSample: Object.keys(od).slice(0, 10),
          hasResultData: Object.keys(resultData).length > 0,
          hasExtracted: Object.keys(extracted).length > 0
        });
        
        // Title: DB column → original_data.caso_titulo → extracted.title
        const loadedTitle = 
          caseData?.name || 
          od.caso_titulo || 
          extracted.title || 
          resultData.title || 
          '';
        setTitle(ensureString(loadedTitle));
        console.log('[CaseStudyForm] Title:', loadedTitle);
        
        // Sector
        const loadedSector = 
          caseData?.sector || 
          od.caso_sector ||
          extracted.sector || 
          resultData.sector || 
          '';
        setSector(ensureString(loadedSector));
        
        // Country
        const loadedCountry = 
          caseData?.country || 
          od.caso_pais || 
          extracted.country || 
          resultData.country || 
          '';
        setCountry(ensureString(loadedCountry));
        
        // Subsector
        const loadedSubsector = 
          caseData?.subsector_industrial ||
          od.caso_subsector ||
          extracted.subsector || 
          resultData.subsector || 
          '';
        setSubsector(ensureString(loadedSubsector));
        
        // Problem description
        const loadedProblem = 
          caseData?.description ||
          od.caso_descripcion_problema ||
          extracted.problem?.description ||
          resultData.problemDescription ||
          '';
        setProblemDescription(ensureString(loadedProblem));
        console.log('[CaseStudyForm] Problem loaded:', loadedProblem?.slice?.(0, 100));
        
        // Solution description
        const loadedSolution = 
          caseData?.solution_applied ||
          od.caso_solucion_aplicada ||
          extracted.solution?.description ||
          resultData.solutionDescription ||
          '';
        setSolutionDescription(ensureString(loadedSolution));
        console.log('[CaseStudyForm] Solution loaded:', loadedSolution?.slice?.(0, 100));
        
        // Results description
        const loadedResults = 
          caseData?.results_achieved ||
          od.caso_resultados ||
          extracted.results?.description ||
          resultData.resultsDescription ||
          '';
        setResultsDescription(ensureString(loadedResults));
        console.log('[CaseStudyForm] Results loaded:', loadedResults?.slice?.(0, 100));
        
        // Treatment train
        const loadedTrain = 
          caseData?.treatment_train ||
          od.tren_tratamiento ||
          extracted.solution?.treatment_train ||
          resultData.treatmentTrain ||
          [];
        if (Array.isArray(loadedTrain) && loadedTrain.length > 0) {
          setTreatmentTrain(loadedTrain);
        }
        
        // Problem parameters
        const loadedParams = caseData?.problem_parameters || od.parametros_problema || extracted.problem?.parameters;
        if (loadedParams) {
          if (Array.isArray(loadedParams) && loadedParams.length > 0) {
            setProblemParameters(loadedParams.map((p: any, i: number) => ({
              id: String(i + 1),
              name: p.name || p.nombre || '',
              value: String(p.value || p.valor || ''),
              unit: p.unit || p.unidad || '',
            })));
          } else if (typeof loadedParams === 'object') {
            // Handle JSONB format: { "DQO": { value: 1000, unit: "mg/L" } }
            const paramsArray = Object.entries(loadedParams).map(([name, data]: [string, any], i) => ({
              id: String(i + 1),
              name,
              value: String(data.value || ''),
              unit: data.unit || '',
            }));
            if (paramsArray.length > 0) {
              setProblemParameters(paramsArray);
            }
          }
        }
        
        // Economic data
        const loadedCapex = caseData?.capex || od.capex || extracted.economic?.capex || resultData.capex;
        const loadedOpex = caseData?.opex_year || od.opex || extracted.economic?.opex || resultData.opex;
        const loadedPayback = caseData?.payback_months || od.payback || extracted.economic?.payback || resultData.payback;
        const loadedRoi = caseData?.roi_percent || od.roi_percent || extracted.economic?.roi || resultData.roi;
        const loadedRoiRationale = caseData?.roi_rationale || od.roi_justificacion || extracted.economic?.roi_justification || resultData.roiJustification;
        
        if (loadedCapex) setCapex(String(loadedCapex));
        if (loadedOpex) setOpex(String(loadedOpex));
        if (loadedPayback) setPayback(String(loadedPayback));
        if (loadedRoi) setRoi(String(loadedRoi));
        if (loadedRoiRationale) setRoiJustification(ensureString(loadedRoiRationale));
        if (loadedCapex || loadedOpex || loadedPayback || loadedRoi) {
          setEconomicOpen(true);
        }
        
        // Lessons learned
        const loadedLessons = 
          caseData?.lessons_learned ||
          od.lecciones_aprendidas ||
          extracted.lessons_learned ||
          resultData.lessonsLearned ||
          '';
        if (loadedLessons) {
          setLessonsLearned(ensureString(loadedLessons));
          setLessonsOpen(true);
        }
        
        // Results parameters
        const resultsParams = caseData?.results_parameters || od.parametros_resultados;
        if (resultsParams) {
          if (resultsParams.DQO_final || resultsParams['DQO final']) {
            setDqoFinal(String(resultsParams.DQO_final?.value || resultsParams['DQO final']?.value || ''));
          }
          if (resultsParams.Reduccion || resultsParams.reduccion) {
            setReduction(String(resultsParams.Reduccion?.value || resultsParams.reduccion?.value || ''));
          }
        } else if (extracted.results) {
          if (extracted.results.dqo_final) setDqoFinal(String(extracted.results.dqo_final));
          if (extracted.results.reduction) setReduction(String(extracted.results.reduction));
        }
        
        // Quality score
        const loadedQuality = caseData?.quality_score || od.quality_score || resultData.review?.quality_score || resultData.qualityScore;
        if (loadedQuality) {
          setQualityScore(loadedQuality);
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // PASO 3: Cargar tecnologías - Prioridad: case_study_technologies → original_data → job
        // ───────────────────────────────────────────────────────────────────────
        console.log('[CaseStudyForm] ────────────────────────────────────────────');
        console.log('[CaseStudyForm] Loading technologies...');
        
        let loadedTechnologies: Technology[] = [];
        
        // OPCIÓN A: Cargar desde case_study_technologies (fuente principal)
        if (caseStudyId) {
          const { data: dbTechs, error: techError } = await externalSupabase
            .from('case_study_technologies')
            .select('*')
            .eq('case_study_id', caseStudyId);
            
          if (techError) {
            console.error('[CaseStudyForm] Error loading technologies from DB:', techError);
          } else if (dbTechs && dbTechs.length > 0) {
            console.log('[CaseStudyForm] ✓ Loaded', dbTechs.length, 'technologies from case_study_technologies');
            console.log('[CaseStudyForm] Sample tech:', JSON.stringify(dbTechs[0], null, 2).slice(0, 500));
            
            loadedTechnologies = dbTechs.map((t, i) => normalizeTechnology(t, i) as Technology);
          }
        }
        
        // OPCIÓN B: Fallback a original_data.technologies
        if (loadedTechnologies.length === 0 && od.technologies) {
          console.log('[CaseStudyForm] Fallback: Loading from original_data.technologies');
          console.log('[CaseStudyForm] original_data.technologies type:', typeof od.technologies);
          
          let rawTechs: any[] = [];
          
          if (Array.isArray(od.technologies)) {
            rawTechs = od.technologies;
          } else if (typeof od.technologies === 'object') {
            // Railway object structure
            const techObj = od.technologies as RailwayTechnologiesObject;
            console.log('[CaseStudyForm] Technologies object keys:', Object.keys(techObj));
            rawTechs = [
              ...(techObj.technologies_found || []),
              ...(techObj.technologies_new || [])
            ];
          }
          
          if (rawTechs.length > 0) {
            console.log('[CaseStudyForm] ✓ Found', rawTechs.length, 'technologies in original_data');
            loadedTechnologies = rawTechs.map((t, i) => normalizeTechnology(t, i) as Technology);
          }
        }
        
        // OPCIÓN C: Fallback a job.result_data.technologies
        if (loadedTechnologies.length === 0 && resultData.technologies) {
          console.log('[CaseStudyForm] Fallback: Loading from job.result_data.technologies');
          
          let rawTechs: any[] = [];
          
          if (Array.isArray(resultData.technologies)) {
            rawTechs = resultData.technologies;
          } else if (typeof resultData.technologies === 'object') {
            const techObj = resultData.technologies as RailwayTechnologiesObject;
            rawTechs = [
              ...(techObj.technologies_found || []),
              ...(techObj.technologies_new || [])
            ];
          }
          
          if (rawTechs.length > 0) {
            console.log('[CaseStudyForm] ✓ Found', rawTechs.length, 'technologies in result_data');
            loadedTechnologies = rawTechs.map((t, i) => normalizeTechnology(t, i) as Technology);
          }
        }
        
        // Set technologies
        if (loadedTechnologies.length > 0) {
          console.log('[CaseStudyForm] ════════════════════════════════════════════');
          console.log('[CaseStudyForm] ✓ TOTAL TECHNOLOGIES LOADED:', loadedTechnologies.length);
          console.log('[CaseStudyForm] First 3 tech names:', loadedTechnologies.slice(0, 3).map(t => t.name));
          setTechnologies(loadedTechnologies);
        } else {
          console.warn('[CaseStudyForm] ⚠ NO TECHNOLOGIES FOUND');
          console.log('[CaseStudyForm] Debug info:', {
            caseStudyId,
            hasOriginalData: !!od,
            odTechnologiesType: typeof od.technologies,
            hasResultData: !!resultData,
            resultDataTechnologiesType: typeof resultData.technologies
          });
        }
        
      } catch (error) {
        console.error('[CaseStudyForm] Error loading data:', error);
        toast.error('Error al cargar los datos del procesamiento');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [jobId, existingCaseId]);

  const addParameter = () => {
    setProblemParameters([
      ...problemParameters,
      { id: String(Date.now()), name: '', value: '', unit: '' },
    ]);
  };

  const updateParameter = (id: string, field: keyof Parameter, value: string) => {
    setProblemParameters(params =>
      params.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeParameter = (id: string) => {
    setProblemParameters(params => params.filter(p => p.id !== id));
  };

  const addTreatment = () => {
    if (newTreatment.trim()) {
      setTreatmentTrain([...treatmentTrain, newTreatment.trim()]);
      setNewTreatment('');
    }
  };

  const removeTreatment = (index: number) => {
    setTreatmentTrain(train => train.filter((_, i) => i !== index));
  };

  const [isSearchingTech, setIsSearchingTech] = useState(false);

  const addTechnology = async () => {
    if (newTechName.trim()) {
      setIsSearchingTech(true);
      try {
        // Buscar match en technologies por nombre similar
        const { data: match } = await externalSupabase
          .from('technologies')
          .select('id, "Nombre de la tecnología"')
          .ilike('Nombre de la tecnología', `%${newTechName.trim()}%`)
          .limit(1)
          .maybeSingle();

        setTechnologies([
          ...technologies,
          {
            id: String(Date.now()),
            name: newTechName.trim(),
            provider: newTechProvider.trim(),
            role: newTechRole,
            status: match ? 'linked' : 'new',
            linkedTechId: match?.id,
          },
        ]);
        setNewTechName('');
        setNewTechProvider('');
        setNewTechRole('Evaluada');
      } catch (error) {
        console.error('Error searching for technology:', error);
        // En caso de error, añadir como nueva
        setTechnologies([
          ...technologies,
          {
            id: String(Date.now()),
            name: newTechName.trim(),
            provider: newTechProvider.trim(),
            role: newTechRole,
            status: 'new',
          },
        ]);
        setNewTechName('');
        setNewTechProvider('');
        setNewTechRole('Evaluada');
      } finally {
        setIsSearchingTech(false);
      }
    }
  };

  const removeTechnology = (id: string) => {
    setTechnologies(techs => techs.filter(t => t.id !== id));
  };

  // Helper: Construir application_data JSONB para case_study_technologies
  const buildApplicationData = (tech: Technology): Record<string, any> | null => {
    const data: Record<string, any> = {};
    
    // ═══════════════════════════════════════════════════════════════════
    // CAMPOS PRINCIPALES DE LA FICHA (obligatorios para ver en el modal)
    // ═══════════════════════════════════════════════════════════════════
    if (tech.description) data.descripcion = tech.description;
    if (tech.trl) data.trl = tech.trl;
    if (tech.type) data.tipo = tech.type;
    if (tech.subcategory) data.subcategoria = tech.subcategory;
    if (tech.sector) data.sector = tech.sector;
    if (tech.web) data.web = tech.web;
    if (tech.email) data.email = tech.email;
    if (tech.country) data.pais = tech.country;
    if (tech.mainApplication) data.aplicacion_principal = tech.mainApplication;
    if (tech.innovationAdvantages) data.ventaja_competitiva = tech.innovationAdvantages;
    if (tech.references) data.casos_referencia = tech.references;
    
    // ═══════════════════════════════════════════════════════════════════
    // CAMPOS SECUNDARIOS/TÉCNICOS (información adicional)
    // ═══════════════════════════════════════════════════════════════════
    if (tech.countriesActive) data.paises_actua = tech.countriesActive;
    if (tech.capacity) data.capacity = tech.capacity;
    if (tech.removalEfficiency) data.removal_efficiency = tech.removalEfficiency;
    if (tech.footprint) data.footprint = tech.footprint;
    if (tech.powerConsumption) data.power_consumption = tech.powerConsumption;
    if (tech.otherSpecs) data.other_specs = tech.otherSpecs;
    if (tech.priceRange) data.price_range = tech.priceRange;
    if (tech.opexEstimate) data.opex_estimate = tech.opexEstimate;
    if (tech.businessModel) data.business_model = tech.businessModel;
    if (tech.leadTime) data.lead_time = tech.leadTime;
    if (tech.rationale) data.rationale = tech.rationale;
    
    return Object.keys(data).length > 0 ? data : null;
  };

  // Helper: Construir notas para scouting_queue
  const buildScoutingNotes = (tech: Technology, caseTitle: string): string => {
    const parts = [`Extraída de caso de estudio: ${caseTitle}`];
    if (tech.rationale) parts.push(`Justificación IA: ${tech.rationale}`);
    if (tech.priceRange) parts.push(`Rango de precio: ${tech.priceRange}`);
    if (tech.businessModel) parts.push(`Modelo de negocio: ${tech.businessModel}`);
    return parts.join('. ');
  };

  const [sendingToScouting, setSendingToScouting] = useState<string | null>(null);

  const sendToScouting = async (tech: Technology) => {
    if (tech.status === 'linked' || tech.status === 'sent_to_scouting') {
      toast.info('Esta tecnología ya está vinculada o enviada a scouting');
      return;
    }

    setSendingToScouting(tech.id);
    try {
      // Verificar duplicados en BD Externa directamente
      const { data: existingItems, error: listError } = await externalSupabase
        .from('scouting_queue')
        .select('id, nombre')
        .ilike('nombre', tech.name);

      if (listError) {
        console.error('Error checking duplicates:', listError);
      }

      const existingInQueue = existingItems?.find(
        (item: { nombre: string }) => item.nombre?.toLowerCase() === tech.name.toLowerCase()
      );

      if (existingInQueue) {
        toast.warning(`"${tech.name}" ya está en la cola de scouting`);
        setTechnologies(techs =>
          techs.map(t => t.id === tech.id ? { ...t, status: 'sent_to_scouting' as const } : t)
        );
        return;
      }

      // Insertar en BD Externa directamente (campos snake_case)
      const { data: insertedRecord, error: insertError } = await externalSupabase
        .from('scouting_queue')
        .insert({
          nombre: tech.name,
          proveedor: tech.provider || null,
          pais: tech.country || null,
          web: tech.web || null,
          email: tech.email || null,
          descripcion: tech.description || null,
          tipo_sugerido: tech.type || 'Por clasificar',
          subcategoria: tech.subcategory || null,
          trl_estimado: tech.trl || null,
          ventaja_competitiva: tech.innovationAdvantages || null,
          aplicacion_principal: tech.mainApplication || null,
          sector: tech.sector || null,
          source: 'case_study',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Error insertando tecnología');
      }

      // Actualizar estado local
      setTechnologies(techs =>
        techs.map(t => t.id === tech.id ? { ...t, status: 'sent_to_scouting' as const } : t)
      );

      toast.success(`"${tech.name}" enviada a scouting para revisión`);
    } catch (error) {
      console.error('Error sending to scouting:', error);
      toast.error('Error al enviar a scouting');
    } finally {
      setSendingToScouting(null);
    }
  };

  const sendAllNewToScouting = async () => {
    const newTechs = technologies.filter(t => t.status === 'new');
    if (newTechs.length === 0) {
      toast.info('No hay tecnologías nuevas para enviar');
      return;
    }

    for (const tech of newTechs) {
      await sendToScouting(tech);
    }
  };

  const handleSave = async (status: 'draft' | 'approved') => {
    // Validation - use String() for safety in case value is not a string
    if (!String(title || '').trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!sector) {
      toast.error('El sector es obligatorio');
      return;
    }
    if (!country) {
      toast.error('El país es obligatorio');
      return;
    }
    if (!String(problemDescription || '').trim()) {
      toast.error('La descripción del problema es obligatoria');
      return;
    }
    if (!String(solutionDescription || '').trim()) {
      toast.error('La descripción de la solución es obligatoria');
      return;
    }
    if (!String(resultsDescription || '').trim()) {
      toast.error('La descripción de resultados es obligatoria');
      return;
    }

    setIsSaving(true);

    try {
      // Build problem_parameters JSON
      const problemParamsJson = problemParameters
        .filter(p => p.name && p.value)
        .reduce((acc, p) => {
          acc[p.name] = { value: parseFloat(p.value) || 0, unit: p.unit };
          return acc;
        }, {} as Record<string, { value: number; unit: string }>);

      // Build results_parameters JSON
      const resultsParamsJson: Record<string, { value: number; unit: string }> = {};
      if (dqoFinal) {
        resultsParamsJson['DQO_final'] = { value: parseFloat(dqoFinal) || 0, unit: 'mg/L' };
      }
      if (reduction) {
        resultsParamsJson['Reduccion'] = { value: parseFloat(reduction) || 0, unit: '%' };
      }

      const caseData = {
        name: String(title || '').trim(),
        sector,
        country,
        description: String(problemDescription || '').trim(),
        problem_parameters: problemParamsJson,
        solution_applied: String(solutionDescription || '').trim(),
        treatment_train: treatmentTrain.length > 0 ? treatmentTrain : null,
        results_achieved: String(resultsDescription || '').trim(),
        results_parameters: Object.keys(resultsParamsJson).length > 0 ? resultsParamsJson : null,
        capex: capex ? parseFloat(capex) : null,
        opex_year: opex ? parseFloat(opex) : null,
        payback_months: payback ? parseFloat(payback) : null,
        roi_percent: roi ? parseFloat(roi) : null,
        roi_rationale: String(roiJustification || '').trim() || null,
        lessons_learned: String(lessonsLearned || '').trim() || null,
        quality_score: qualityScore || null,
        status,
        original_data: String(subsector || '').trim() ? { subsector: String(subsector || '').trim() } : null,
      };

      let caseStudyId: string;

      // If we have an existing case ID, UPDATE it instead of inserting
      if (existingCaseId) {
        const { error: updateError } = await externalSupabase
          .from('casos_de_estudio')
          .update(caseData)
          .eq('id', existingCaseId);

        if (updateError) throw updateError;
        caseStudyId = existingCaseId;
        console.log('[CaseStudyForm] Updated existing case:', existingCaseId);
      } else {
        // Create new case
        const { data: newCase, error: insertError } = await externalSupabase
          .from('casos_de_estudio')
          .insert(caseData)
          .select('id')
          .single();

        if (insertError) throw insertError;
        caseStudyId = newCase.id;
        console.log('[CaseStudyForm] Created new case:', caseStudyId);
      }

      // Insert technologies with hybrid logic + application_data
      if (technologies.length > 0 && caseStudyId) {
        for (const tech of technologies) {
          const applicationData = buildApplicationData(tech);
          
          if (tech.linkedTechId || tech.status === 'linked') {
            // CASO A: Tecnología ya existe en DB → vincular directamente
            const { error: techError } = await externalSupabase
              .from('case_study_technologies')
              .insert({
                case_study_id: caseStudyId,
                technology_name: tech.name,
                provider: tech.provider || null,
                role: mapRoleToDb(tech.role),
                technology_id: tech.linkedTechId || null,
                application_data: applicationData,
              });

            if (techError) {
              console.error('Error inserting linked technology:', techError);
            }
          } else if (tech.status === 'sent_to_scouting') {
            // CASO B: Ya fue enviada a scouting → solo crear link sin duplicar en scouting
            const { data: existingScouting } = await externalSupabase
              .from('scouting_queue')
              .select('id')
              .ilike('Nombre de la tecnología', tech.name)
              .limit(1)
              .maybeSingle();

            const { error: techError } = await externalSupabase
              .from('case_study_technologies')
              .insert({
                case_study_id: caseStudyId,
                technology_name: tech.name,
                provider: tech.provider || null,
                role: mapRoleToDb(tech.role),
                scouting_queue_id: existingScouting?.id || null,
                application_data: applicationData,
              });

            if (techError) {
              console.error('Error inserting sent_to_scouting technology:', techError);
            }
          } else {
            // CASO C: Tecnología nueva
            // Solo enviar a scouting_queue si se está PUBLICANDO (status === 'approved')
            // Para borradores, solo guardar en case_study_technologies sin crear entrada en scouting
            
            if (status === 'approved') {
              // Publicando → insertar en BD Externa directamente (campos snake_case)
              const { data: insertedRecord, error: scoutingError } = await externalSupabase
                .from('scouting_queue')
                .insert({
                  nombre: tech.name,
                  proveedor: tech.provider || null,
                  pais: tech.country || null,
                  web: tech.web || null,
                  email: tech.email || null,
                  descripcion: tech.description || null,
                  tipo_sugerido: tech.type || 'Por clasificar',
                  subcategoria: tech.subcategory || null,
                  trl_estimado: tech.trl || null,
                  ventaja_competitiva: tech.innovationAdvantages || null,
                  aplicacion_principal: tech.mainApplication || null,
                  sector: tech.sector || sector,
                  source: 'case_study',
                  status: 'pending'
                })
                .select()
                .single();

              if (scoutingError) {
                console.error('Error inserting to external scouting_queue:', scoutingError);
              }

              // Insertar en case_study_technologies local (tracking interno)
              const { error: techError } = await externalSupabase
                .from('case_study_technologies')
                .insert({
                  case_study_id: caseStudyId,
                  technology_name: tech.name,
                  provider: tech.provider || null,
                  role: mapRoleToDb(tech.role),
                  application_data: applicationData,
                });

              if (techError) {
                console.error('Error inserting to case_study_technologies:', techError);
              }
            } else {
              // Borrador → solo guardar en case_study_technologies sin enviar a scouting
              // Esto evita crear tecnologías huérfanas si el borrador se elimina
              const { error: techError } = await externalSupabase
                .from('case_study_technologies')
                .insert({
                  case_study_id: caseStudyId,
                  technology_name: tech.name,
                  provider: tech.provider || null,
                  role: mapRoleToDb(tech.role),
                  application_data: applicationData,
                  // No scouting_queue_id - se creará cuando se publique
                });

              if (techError) {
                console.error('Error inserting draft technology:', techError);
              }
            }
          }
        }
      }

      // Update job with case_study_id (only if creating new case)
      if (!existingCaseId) {
        await externalSupabase
          .from('case_study_jobs')
          .update({ case_study_id: caseStudyId })
          .eq('id', jobId);
      }

      // Clear IndexedDB
      await clearFiles();

      toast.success(
        status === 'approved' 
          ? 'Caso de estudio publicado correctamente' 
          : 'Borrador guardado correctamente'
      );

      onSaved();
    } catch (error) {
      console.error('Error saving case study:', error);
      toast.error('Error al guardar el caso de estudio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header - Fixed */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Revisar y Completar</h3>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {/* SECCIÓN: Información General */}
          <section className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Información General
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre del caso de estudio"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sector">Sector *</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar país" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAISES.map(c => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="subsector">Subsector (opcional)</Label>
                <Input
                  id="subsector"
                  value={subsector}
                  onChange={(e) => setSubsector(e.target.value)}
                  placeholder="Ej: Lácteos, Cervecería..."
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Problema */}
          <section className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Problema
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="problemDesc">Descripción *</Label>
                <Textarea
                  id="problemDesc"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Describe el problema que se abordó..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label className="mb-2 block">Parámetros del problema</Label>
                <div className="space-y-2">
                  {problemParameters.map((param) => (
                    <div key={param.id} className="flex items-center gap-2">
                      <Input
                        value={param.name}
                        onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                        placeholder="Parámetro"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={param.value}
                        onChange={(e) => updateParameter(param.id, 'value', e.target.value)}
                        placeholder="Valor"
                        className="w-24"
                      />
                      <Input
                        value={param.unit}
                        onChange={(e) => updateParameter(param.id, 'unit', e.target.value)}
                        placeholder="Unidad"
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParameter(param.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addParameter}
                  className="mt-2 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Añadir parámetro
                </Button>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Solución */}
          <section className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Solución
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="solutionDesc">Descripción *</Label>
                <Textarea
                  id="solutionDesc"
                  value={solutionDescription}
                  onChange={(e) => setSolutionDescription(e.target.value)}
                  placeholder="Describe la solución implementada..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label className="mb-2 block">Tren de tratamiento</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {treatmentTrain.map((treatment, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {treatment}
                      <button
                        onClick={() => removeTreatment(index)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTreatment}
                    onChange={(e) => setNewTreatment(e.target.value)}
                    placeholder="Ej: DAF, UASB, MBR..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTreatment())}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={addTreatment}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Resultados */}
          <section className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Resultados
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="resultsDesc">Descripción *</Label>
                <Textarea
                  id="resultsDesc"
                  value={resultsDescription}
                  onChange={(e) => setResultsDescription(e.target.value)}
                  placeholder="Describe los resultados obtenidos..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dqoFinal">DQO final (mg/L)</Label>
                  <Input
                    id="dqoFinal"
                    type="number"
                    value={dqoFinal}
                    onChange={(e) => setDqoFinal(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="reduction">Reducción (%)</Label>
                  <Input
                    id="reduction"
                    type="number"
                    value={reduction}
                    onChange={(e) => setReduction(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Datos Económicos (Colapsable) */}
          <Collapsible open={economicOpen} onOpenChange={setEconomicOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                <span>Datos Económicos (opcional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${economicOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="capex">CAPEX (€)</Label>
                  <Input
                    id="capex"
                    type="number"
                    value={capex}
                    onChange={(e) => setCapex(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="opex">OPEX/año (€)</Label>
                  <Input
                    id="opex"
                    type="number"
                    value={opex}
                    onChange={(e) => setOpex(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="payback">Payback (meses)</Label>
                  <Input
                    id="payback"
                    type="number"
                    value={payback}
                    onChange={(e) => setPayback(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="roi">ROI (%)</Label>
                  <Input
                    id="roi"
                    type="number"
                    value={roi}
                    onChange={(e) => setRoi(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="roiJustification">Justificación ROI</Label>
                <Textarea
                  id="roiJustification"
                  value={roiJustification}
                  onChange={(e) => setRoiJustification(e.target.value)}
                  placeholder="Explica cómo se calculó el ROI..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* SECCIÓN: Lecciones Aprendidas (Colapsable) */}
          <Collapsible open={lessonsOpen} onOpenChange={setLessonsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                <span>Lecciones Aprendidas (opcional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${lessonsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                placeholder="¿Qué lecciones se aprendieron de este proyecto?"
                rows={3}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* SECCIÓN: Tecnologías Identificadas */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Tecnologías Identificadas ({technologies.length})
              </h4>
              {technologies.filter(t => t.status === 'new').length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendAllNewToScouting}
                  className="text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Enviar todas a Scouting ({technologies.filter(t => t.status === 'new').length})
                </Button>
              )}
            </div>
            
            {technologies.length > 0 && (
              <div className="space-y-2">
                {technologies.map((tech) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{tech.name}</p>
                        {/* Badge de estado */}
                        <Badge 
                          variant="outline"
                          className={
                            tech.status === 'linked' 
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                              : tech.status === 'sent_to_scouting'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                              : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
                          }
                        >
                          {tech.status === 'linked' ? '🟢 En DB' : tech.status === 'sent_to_scouting' ? '📤 En Scouting' : '🆕 Nueva'}
                        </Badge>
                        <Badge variant={tech.role === 'Recomendada' ? 'default' : 'secondary'}>
                          {tech.role}
                        </Badge>
                        {tech.trl && (
                          <Badge variant="outline" className="text-xs">TRL {tech.trl}</Badge>
                        )}
                      </div>
                      {tech.provider && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tech.provider}</p>
                      )}
                      {tech.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tech.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {/* View details button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTech(tech)}
                        className="h-8 w-8"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {tech.status === 'new' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendToScouting(tech)}
                          disabled={sendingToScouting === tech.id}
                          className="text-xs text-primary hover:text-primary"
                        >
                          {sendingToScouting === tech.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-1" />
                              A Scouting
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTechnology(tech.id)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {technologies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se identificaron tecnologías en este caso de estudio
              </p>
            )}
            
            <div className="p-3 border border-dashed rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="Nombre tecnología"
                />
                <Input
                  value={newTechProvider}
                  onChange={(e) => setNewTechProvider(e.target.value)}
                  placeholder="Proveedor (opcional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={newTechRole} onValueChange={(v: 'Recomendada' | 'Evaluada') => setNewTechRole(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recomendada">Recomendada</SelectItem>
                    <SelectItem value="Evaluada">Evaluada</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTechnology}
                  disabled={!newTechName.trim() || isSearchingTech}
                  className="gap-1"
                >
                  {isSearchingTech ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {isSearchingTech ? 'Buscando...' : 'Añadir tecnología'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="shrink-0 px-6 py-4 border-t bg-background space-y-3">
        {/* Quality Score */}
        {qualityScore > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Quality Score:</span>
            <div className="flex-1">
              <Progress value={qualityScore} className="h-2" />
            </div>
            <span className="text-sm font-medium">{qualityScore}%</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} disabled={isSaving}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar borrador
            </Button>
            <Button onClick={() => handleSave('approved')} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      </div>

      {/* Technology Detail Modal - Full Information */}
      <Dialog open={!!selectedTech} onOpenChange={(open) => !open && setSelectedTech(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {selectedTech?.name || 'Detalle de Tecnología'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTech && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
              {/* Status & Role Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline"
                  className={
                    selectedTech.status === 'linked' 
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                      : selectedTech.status === 'sent_to_scouting'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
                  }
                >
                  {selectedTech.status === 'linked' ? '🟢 En Base de Datos' : selectedTech.status === 'sent_to_scouting' ? '📤 Enviada a Scouting' : '🆕 Nueva'}
                </Badge>
                <Badge variant={selectedTech.role === 'Recomendada' ? 'default' : 'secondary'}>
                  {selectedTech.role}
                </Badge>
                {selectedTech.trl && (
                  <Badge variant="outline">TRL {selectedTech.trl}</Badge>
                )}
              </div>

              {/* INFORMACIÓN GENERAL */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  INFORMACIÓN GENERAL
                </h3>
                
                <InfoRow icon={Building2} label="Proveedor / Empresa" value={selectedTech.provider} />
                <InfoRow icon={MapPin} label="País de origen" value={selectedTech.country} />
                <InfoRow icon={Globe} label="Web de la empresa" value={selectedTech.web} isLink />
                <InfoRow icon={Mail} label="Email de contacto" value={selectedTech.email} />
              </div>

              {/* CLASIFICACIÓN */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  CLASIFICACIÓN
                </h3>
                
                <InfoRow icon={Tag} label="Tipo de tecnología" value={selectedTech.type} />
                <InfoRow icon={Tag} label="Subcategoría" value={selectedTech.subcategory} />
                <InfoRow icon={Tag} label="Sector" value={selectedTech.sector} />
                <InfoRow icon={FileText} label="Aplicación principal" value={selectedTech.mainApplication} />
              </div>

              {/* DESCRIPCIÓN TÉCNICA */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  DESCRIPCIÓN TÉCNICA
                </h3>
                <p className={`text-sm ${selectedTech.description ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}>
                  {selectedTech.description || 'Sin información'}
                </p>
              </div>

              {/* INNOVACIÓN Y VENTAJAS */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  INNOVACIÓN Y VENTAJAS
                </h3>
                
                <InfoRow icon={Trophy} label="Ventaja competitiva clave" value={selectedTech.innovationAdvantages} />
              </div>

              {/* ESPECIFICACIONES TÉCNICAS */}
              {(selectedTech.capacity || selectedTech.removalEfficiency || selectedTech.footprint || selectedTech.powerConsumption) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    ESPECIFICACIONES TÉCNICAS
                  </h3>
                  
                  <InfoRow icon={Zap} label="Capacidad" value={selectedTech.capacity} />
                  <InfoRow icon={Zap} label="Eficiencia de eliminación" value={selectedTech.removalEfficiency} />
                  <InfoRow icon={Zap} label="Huella / Footprint" value={selectedTech.footprint} />
                  <InfoRow icon={Zap} label="Consumo energético" value={selectedTech.powerConsumption} />
                </div>
              )}

              {/* INFORMACIÓN COMERCIAL */}
              {(selectedTech.priceRange || selectedTech.businessModel || selectedTech.leadTime) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    INFORMACIÓN COMERCIAL
                  </h3>
                  
                  <InfoRow icon={DollarSign} label="Rango de precios" value={selectedTech.priceRange} />
                  <InfoRow icon={DollarSign} label="Modelo de negocio" value={selectedTech.businessModel} />
                  <InfoRow icon={Clock} label="Tiempo de entrega" value={selectedTech.leadTime} />
                </div>
              )}

              {/* REFERENCIAS */}
              {selectedTech.references && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    REFERENCIAS
                  </h3>
                  <p className="text-sm text-foreground">{selectedTech.references}</p>
                </div>
              )}

              {/* JUSTIFICACIÓN IA */}
              {selectedTech.rationale && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    JUSTIFICACIÓN IA
                  </h3>
                  <p className="text-sm text-foreground italic">{selectedTech.rationale}</p>
                </div>
              )}

              {/* Linked Tech ID - Only if linked */}
              {selectedTech.linkedTechId && (
                <div className="pt-2 border-t">
                  <InfoRow icon={Tag} label="ID en Base de Datos" value={selectedTech.linkedTechId} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
