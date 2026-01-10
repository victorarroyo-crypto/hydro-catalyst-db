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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCaseStudyFiles } from '@/hooks/useCaseStudyFiles';

// Sector options matching Documentos Técnicos + Municipal
const SECTOR_OPTIONS = [
  { value: 'PAPEL', label: 'Papel y Celulosa' },
  { value: 'ALIMENTACION', label: 'Alimentación y Bebidas' },
  { value: 'QUIMICO', label: 'Químico y Farmacéutico' },
  { value: 'TEXTIL', label: 'Textil' },
  { value: 'ENERGIA', label: 'Energía' },
  { value: 'MINERIA', label: 'Minería y Metales' },
  { value: 'MUNICIPAL', label: 'Municipal' },
];

const COUNTRY_OPTIONS = [
  'España', 'México', 'Argentina', 'Chile', 'Colombia', 'Perú', 
  'Brasil', 'Estados Unidos', 'Alemania', 'Francia', 'Italia',
  'Reino Unido', 'China', 'India', 'Japón', 'Australia', 'Otro'
];

interface Parameter {
  id: string;
  name: string;
  value: string;
  unit: string;
}

interface Technology {
  id: string;
  name: string;
  provider: string;
  role: 'Recomendada' | 'Evaluada';
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

interface ResultData {
  // Nested structure from Railway
  extracted?: ExtractedData;
  technologies?: { name: string; provider: string; role: string }[];
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

interface CaseStudyFormViewProps {
  jobId: string;
  onBack: () => void;
  onSaved: () => void;
}

export const CaseStudyFormView: React.FC<CaseStudyFormViewProps> = ({
  jobId,
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
          
          // Technologies (at root level in both structures)
          if (data.technologies && data.technologies.length > 0) {
            setTechnologies(data.technologies.map((t, i) => ({
              id: String(i + 1),
              name: t.name,
              provider: t.provider || '',
              role: (t.role as 'Recomendada' | 'Evaluada') || 'Evaluada',
            })));
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

  const addTechnology = () => {
    if (newTechName.trim()) {
      setTechnologies([
        ...technologies,
        {
          id: String(Date.now()),
          name: newTechName.trim(),
          provider: newTechProvider.trim(),
          role: newTechRole,
        },
      ]);
      setNewTechName('');
      setNewTechProvider('');
      setNewTechRole('Evaluada');
    }
  };

  const removeTechnology = (id: string) => {
    setTechnologies(techs => techs.filter(t => t.id !== id));
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

      // Insert into casos_de_estudio
      const { data: caseStudy, error: insertError } = await supabase
        .from('casos_de_estudio')
        .insert({
          name: title.trim(),
          sector,
          country,
          subsector_industrial: subsector.trim() || null,
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
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Insert technologies if any
      if (technologies.length > 0 && caseStudy?.id) {
        const techInserts = technologies.map(t => ({
          case_study_id: caseStudy.id,
          technology_name: t.name,
          provider: t.provider || null,
          role: t.role,
        }));

        const { error: techError } = await supabase
          .from('case_study_technologies')
          .insert(techInserts);

        if (techError) {
          console.error('Error inserting technologies:', techError);
          // Don't fail the whole operation for this
        }
      }

      // Update job with case_study_id
      await supabase
        .from('case_study_jobs')
        .update({ case_study_id: caseStudy?.id })
        .eq('id', jobId);

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
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Revisar y Completar</h3>
      </div>

      {/* Scrollable Form */}
      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6 pr-4">
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
                          {opt.label}
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
                      {COUNTRY_OPTIONS.map(c => (
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
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Tecnologías Identificadas
            </h4>
            
            {technologies.length > 0 && (
              <div className="space-y-2">
                {technologies.map((tech) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{tech.name}</p>
                        {tech.provider && (
                          <p className="text-xs text-muted-foreground">{tech.provider}</p>
                        )}
                      </div>
                      <Badge variant={tech.role === 'Recomendada' ? 'default' : 'secondary'}>
                        {tech.role}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTechnology(tech.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                  disabled={!newTechName.trim()}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Añadir tecnología
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="pt-4 border-t space-y-3">
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
    </div>
  );
};
