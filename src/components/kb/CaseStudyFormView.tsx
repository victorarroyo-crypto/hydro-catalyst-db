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
import { supabase } from '@/integrations/supabase/client';
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
const mapRoleToDb = (role: string): 'recommended' | 'evaluated' => {
  return role === 'Recomendada' ? 'recommended' : 'evaluated';
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

  // Load data from job
  useEffect(() => {
    const loadJobData = async () => {
      try {
        const { data: job, error } = await supabase
          .from('case_study_jobs')
          .select('result_data, quality_score')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (job?.quality_score) {
          setQualityScore(job.quality_score);
        }

        if (job?.result_data) {
          const data = job.result_data as ResultData;
          const extracted = data.extracted;
          
          // Try nested Railway structure first
          if (extracted) {
            console.log('Loading from nested Railway structure:', extracted);
            
            if (extracted.title) setTitle(extracted.title);
            if (extracted.sector) setSector(extracted.sector);
            if (extracted.country) setCountry(extracted.country);
            if (extracted.subsector) setSubsector(extracted.subsector);
            
            // Problem
            if (extracted.problem?.description) {
              setProblemDescription(extracted.problem.description);
            }
            if (extracted.problem?.parameters && extracted.problem.parameters.length > 0) {
              setProblemParameters(extracted.problem.parameters.map((p, i) => ({
                id: String(i + 1),
                name: p.name,
                value: String(p.value),
                unit: p.unit,
              })));
            }
            
            // Solution
            if (extracted.solution?.description) {
              setSolutionDescription(extracted.solution.description);
            }
            if (extracted.solution?.treatment_train) {
              setTreatmentTrain(extracted.solution.treatment_train);
            }
            
            // Results
            if (extracted.results?.description) {
              setResultsDescription(extracted.results.description);
            }
            if (extracted.results?.dqo_final) {
              setDqoFinal(String(extracted.results.dqo_final));
            }
            if (extracted.results?.reduction) {
              setReduction(String(extracted.results.reduction));
            }
            
            // Economic
            if (extracted.economic) {
              if (extracted.economic.capex) setCapex(String(extracted.economic.capex));
              if (extracted.economic.opex) setOpex(String(extracted.economic.opex));
              if (extracted.economic.payback) setPayback(String(extracted.economic.payback));
              if (extracted.economic.roi) setRoi(String(extracted.economic.roi));
              if (extracted.economic.roi_justification) setRoiJustification(extracted.economic.roi_justification);
              setEconomicOpen(true);
            }
            
            // Lessons learned
            if (extracted.lessons_learned) {
              setLessonsLearned(extracted.lessons_learned);
              setLessonsOpen(true);
            }
          } else {
            // Fallback to legacy flat structure
            console.log('Loading from flat legacy structure:', data);
            
            if (data.title) setTitle(data.title);
            if (data.sector) setSector(data.sector);
            if (data.country) setCountry(data.country);
            if (data.subsector) setSubsector(data.subsector);
            if (data.problemDescription) setProblemDescription(data.problemDescription);
            if (data.solutionDescription) setSolutionDescription(data.solutionDescription);
            if (data.resultsDescription) setResultsDescription(data.resultsDescription);
            if (data.dqoFinal) setDqoFinal(String(data.dqoFinal));
            if (data.reduction) setReduction(String(data.reduction));
            if (data.capex) setCapex(String(data.capex));
            if (data.opex) setOpex(String(data.opex));
            if (data.payback) setPayback(String(data.payback));
            if (data.roi) setRoi(String(data.roi));
            if (data.roiJustification) setRoiJustification(data.roiJustification);
            if (data.lessonsLearned) setLessonsLearned(data.lessonsLearned);
            if (data.treatmentTrain) setTreatmentTrain(data.treatmentTrain);
            
            if (data.problemParameters && data.problemParameters.length > 0) {
              setProblemParameters(data.problemParameters.map((p, i) => ({
                id: String(i + 1),
                name: p.name,
                value: String(p.value),
                unit: p.unit,
              })));
            }
            
            // Auto-expand sections if they have data
            if (data.capex || data.opex || data.payback || data.roi) {
              setEconomicOpen(true);
            }
            if (data.lessonsLearned) {
              setLessonsOpen(true);
            }
          }
          
          // Technologies handling - supports both Railway object and legacy array
          if (data.technologies) {
            let techArray: { name: string; provider?: string; role?: string; description?: string; trl_estimated?: number; type_suggested?: string }[] = [];
            
            // Check if it's Railway's object structure (has technologies_found or technologies_new)
            if (typeof data.technologies === 'object' && !Array.isArray(data.technologies)) {
              const techData = data.technologies as RailwayTechnologiesObject;
              console.log('[CaseStudyForm] Railway technologies object:', techData);
              
              // Combine technologies_found and technologies_new
              if (techData.technologies_found?.length) {
                console.log('[CaseStudyForm] Found technologies_found:', techData.technologies_found.length);
                techArray = [...techArray, ...techData.technologies_found.map(t => ({ ...t, status: 'linked' as const }))];
              }
              if (techData.technologies_new?.length) {
                console.log('[CaseStudyForm] Found technologies_new:', techData.technologies_new.length);
                techArray = [...techArray, ...techData.technologies_new];
              }
            } 
            // Legacy array structure
            else if (Array.isArray(data.technologies) && data.technologies.length > 0) {
              console.log('[CaseStudyForm] Legacy technologies array:', data.technologies.length);
              techArray = data.technologies;
            }
            
            // Map to form format with full Railway fields
            if (techArray.length > 0) {
              console.log('[CaseStudyForm] Setting technologies:', techArray.length);
              setTechnologies(techArray.map((t: any, i) => {
                // Map English roles to Spanish
                let mappedRole: 'Recomendada' | 'Evaluada' = 'Evaluada';
                if (t.role) {
                  const roleLower = t.role.toLowerCase();
                  if (roleLower === 'recommended' || roleLower === 'recomendada') {
                    mappedRole = 'Recomendada';
                  }
                }
                
                return {
                  id: String(i + 1),
                  name: t.name,
                  provider: t.provider || '',
                  role: mappedRole,
                  status: t.status || 'new',
                  
                  // Classification → Ficha estándar
                  type: t.type_suggested || t.type || '',
                  subcategory: t.subcategory_suggested || '',
                  sector: t.sector_suggested || '',
                  
                  // Description & Innovation → Ficha estándar
                  description: t.technical_description || t.description || '',
                  mainApplication: t.main_application || '',
                  innovationAdvantages: t.innovation_advantages || '',
                  references: t.references || '',
                  
                  // Contact & Location → Ficha estándar
                  web: t.provider_url || t.web || t.url || t.website || '',
                  email: t.provider_email || '',
                  country: t.provider_country || '',
                  
                  // TRL → Ficha estándar
                  trl: t.trl_estimated || t.trl || null,
                  
                  // Campos para application_data (no van a ficha estándar)
                  countriesActive: t.provider_countries_active || '',
                  capacity: t.capacity || '',
                  removalEfficiency: t.removal_efficiency || '',
                  footprint: t.footprint || '',
                  powerConsumption: t.power_consumption || '',
                  otherSpecs: t.other_specs || null,
                  priceRange: t.price_range || '',
                  opexEstimate: t.opex_estimate || '',
                  businessModel: t.business_model || '',
                  leadTime: t.lead_time || '',
                  rationale: t.rationale || '',
                };
              }));
            }
          }
          
          // Quality score from review or legacy
          if (data.review?.quality_score) {
            setQualityScore(data.review.quality_score);
          } else if (data.qualityScore) {
            setQualityScore(data.qualityScore);
          }
        }
      } catch (error) {
        console.error('Error loading job data:', error);
        toast.error('Error al cargar los datos del procesamiento');
      } finally {
        setIsLoading(false);
      }
    };

    loadJobData();
  }, [jobId]);

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
        const { data: match } = await supabase
          .from('technologies')
          .select('id, "Nombre de la tecnología"')
          .ilike('"Nombre de la tecnología"', `%${newTechName.trim()}%`)
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
    
    // Datos que NO van a la ficha estándar
    if (tech.countriesActive) data.provider_countries_active = tech.countriesActive;
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
      // Verificar si ya existe en scouting_queue
      const { data: existingInQueue } = await supabase
        .from('scouting_queue')
        .select('id')
        .ilike('Nombre de la tecnología', tech.name)
        .limit(1)
        .maybeSingle();

      if (existingInQueue) {
        toast.warning(`"${tech.name}" ya está en la cola de scouting`);
        // Marcar como enviada
        setTechnologies(techs =>
          techs.map(t => t.id === tech.id ? { ...t, status: 'sent_to_scouting' as const } : t)
        );
        return;
      }

      // Insertar en scouting_queue con mapeo a ficha estándar
      const { error } = await supabase
        .from('scouting_queue')
        .insert({
          // Mapeo a ficha estándar de technologies
          'Nombre de la tecnología': tech.name,
          'Proveedor / Empresa': tech.provider || null,
          'Web de la empresa': tech.web || null,
          'Email de contacto': tech.email || null,
          'País de origen': tech.country || null,
          'Tipo de tecnología': tech.type || 'Por clasificar',
          Subcategoría: tech.subcategory || null,
          'Sector y subsector': tech.sector || null,
          'Descripción técnica breve': tech.description || null,
          'Aplicación principal': tech.mainApplication || null,
          'Ventaja competitiva clave': tech.innovationAdvantages || null,
          'Grado de madurez (TRL)': tech.trl || null,
          'Casos de referencia': tech.references || null,
          // Campos adicionales de scouting
          source: 'case_study',
          queue_status: 'pending',
          priority: tech.role === 'Recomendada' ? 'high' : 'medium',
          notes: buildScoutingNotes(tech, title),
        });

      if (error) throw error;

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
    // Validation
    if (!title.trim()) {
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
    if (!problemDescription.trim()) {
      toast.error('La descripción del problema es obligatoria');
      return;
    }
    if (!solutionDescription.trim()) {
      toast.error('La descripción de la solución es obligatoria');
      return;
    }
    if (!resultsDescription.trim()) {
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
        name: title.trim(),
        sector,
        country,
        description: problemDescription.trim(),
        problem_parameters: problemParamsJson,
        solution_applied: solutionDescription.trim(),
        treatment_train: treatmentTrain.length > 0 ? treatmentTrain : null,
        results_achieved: resultsDescription.trim(),
        results_parameters: Object.keys(resultsParamsJson).length > 0 ? resultsParamsJson : null,
        capex: capex ? parseFloat(capex) : null,
        opex_year: opex ? parseFloat(opex) : null,
        payback_months: payback ? parseFloat(payback) : null,
        roi_percent: roi ? parseFloat(roi) : null,
        roi_rationale: roiJustification.trim() || null,
        lessons_learned: lessonsLearned.trim() || null,
        quality_score: qualityScore || null,
        status,
        original_data: subsector.trim() ? { subsector: subsector.trim() } : null,
      };

      let caseStudyId: string;

      // If we have an existing case ID, UPDATE it instead of inserting
      if (existingCaseId) {
        const { error: updateError } = await supabase
          .from('casos_de_estudio')
          .update(caseData)
          .eq('id', existingCaseId);

        if (updateError) throw updateError;
        caseStudyId = existingCaseId;
        console.log('[CaseStudyForm] Updated existing case:', existingCaseId);
      } else {
        // Create new case
        const { data: newCase, error: insertError } = await supabase
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
            const { error: techError } = await supabase
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
            const { data: existingScouting } = await supabase
              .from('scouting_queue')
              .select('id')
              .ilike('Nombre de la tecnología', tech.name)
              .limit(1)
              .maybeSingle();

            const { error: techError } = await supabase
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
            // CASO C: Tecnología nueva → enviar a scouting_queue para revisión
            const { data: scoutingItem, error: scoutingError } = await supabase
              .from('scouting_queue')
              .insert({
                // Mapeo a ficha estándar
                'Nombre de la tecnología': tech.name,
                'Proveedor / Empresa': tech.provider || null,
                'Web de la empresa': tech.web || null,
                'Email de contacto': tech.email || null,
                'País de origen': tech.country || null,
                'Tipo de tecnología': tech.type || 'Por clasificar',
                Subcategoría: tech.subcategory || null,
                'Sector y subsector': tech.sector || sector,
                'Descripción técnica breve': tech.description || null,
                'Aplicación principal': tech.mainApplication || null,
                'Ventaja competitiva clave': tech.innovationAdvantages || null,
                'Grado de madurez (TRL)': tech.trl || null,
                'Casos de referencia': tech.references || null,
                // Campos de scouting
                source: 'case_study',
                case_study_id: caseStudyId,
                queue_status: 'pending',
                priority: tech.role === 'Recomendada' ? 'high' : 'medium',
                notes: buildScoutingNotes(tech, title),
              })
              .select('id')
              .single();

            if (scoutingError) {
              console.error('Error inserting to scouting_queue:', scoutingError);
              // Aún así insertar en case_study_technologies sin referencia
              await supabase.from('case_study_technologies').insert({
                case_study_id: caseStudyId,
                technology_name: tech.name,
                provider: tech.provider || null,
                role: mapRoleToDb(tech.role),
                application_data: applicationData,
              });
            } else {
              // Insertar en case_study_technologies con referencia a scouting_queue
              const { error: techError } = await supabase
                .from('case_study_technologies')
                .insert({
                  case_study_id: caseStudyId,
                  technology_name: tech.name,
                  provider: tech.provider || null,
                  role: mapRoleToDb(tech.role),
                  scouting_queue_id: scoutingItem?.id,
                  application_data: applicationData,
                });

              if (techError) {
                console.error('Error inserting technology with scouting_queue_id:', techError);
              }
            }
          }
        }
      }

      // Update job with case_study_id (only if creating new case)
      if (!existingCaseId) {
        await supabase
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
