import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudySolutions, useAddSolution, ScoutingStudy, StudySolution } from '@/hooks/useScoutingStudies';
import { useAIStudySession } from '@/hooks/useAIStudySession';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Clock,
  DollarSign,
  Loader2,
  Cpu,
  ExternalLink,
  Database,
  CheckCircle2,
  Link2,
  Info,
  Building2,
  FileText,
  Target,
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';
import ExtractedTechDetailModal from './ExtractedTechDetailModal';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

interface ExtractedTechnology {
  id: string;
  study_id: string;
  technology_name: string;
  provider: string | null;
  country: string | null;
  web: string | null;
  trl: number | null;
  type_suggested: string | null;
  subcategory_suggested: string | null;
  brief_description: string | null;
  applications: string[] | null;
  confidence_score: number | null;
  already_in_db: boolean | null;
  existing_technology_id: string | null;
  inclusion_reason: string | null;
  source: string | null;
  added_at: string;
}

// Tech card with detail modal
function TechCard({ 
  tech, 
  onSendToScoutingQueue 
}: { 
  tech: ExtractedTechnology; 
  onSendToScoutingQueue: (tech: ExtractedTechnology) => void;
}) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  return (
    <>
      <Card className="flex flex-col hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{tech.technology_name}</CardTitle>
              <CardDescription className="truncate">
                {tech.provider} {tech.country && `• ${tech.country}`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={(tech.confidence_score || 0) > 0.8 ? "default" : "secondary"}>
                {Math.round((tech.confidence_score || 0.8) * 100)}% conf
              </Badge>
              {tech.already_in_db && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  En BD
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {tech.brief_description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {tech.brief_description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            {tech.trl && (
              <Badge variant="outline">TRL {tech.trl}</Badge>
            )}
            {tech.type_suggested && (
              <Badge variant="secondary" className="truncate max-w-[120px]">
                {tech.type_suggested}
              </Badge>
            )}
            {tech.subcategory_suggested && (
              <Badge variant="secondary" className="truncate max-w-[120px]">
                {tech.subcategory_suggested}
              </Badge>
            )}
          </div>
          
          {tech.applications && tech.applications.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Aplicaciones:</p>
              <div className="flex flex-wrap gap-1">
                {tech.applications.slice(0, 3).map((app, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {app}
                  </Badge>
                ))}
                {tech.applications.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{tech.applications.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <div className="px-6 pb-4 pt-2 flex gap-2 mt-auto">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsDetailOpen(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver ficha
          </Button>
          {tech.already_in_db && tech.existing_technology_id ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(`/technologies?id=${tech.existing_technology_id}`, '_blank')}
            >
              <Database className="w-4 h-4 mr-1" />
              Ver en BD
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={() => onSendToScoutingQueue(tech)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Scouting Queue
            </Button>
          )}
          {tech.web && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(tech.web!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
      
      <ExtractedTechDetailModal
        technology={tech}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onSendToScoutingQueue={onSendToScoutingQueue}
      />
    </>
  );
}

// Extended solution type with new fields
interface ExtendedSolution extends StudySolution {
  source_url?: string | null;
  source_title?: string | null;
  detailed_info?: string | null;
  applicable_sectors?: string[] | null;
  key_providers?: string[] | null;
  case_studies?: string[] | null;
}

const COST_RANGES = ['Muy Bajo', 'Bajo', 'Medio', 'Alto', 'Muy Alto'];
const TIME_RANGES = ['< 3 meses', '3-6 meses', '6-12 meses', '1-2 años', '> 2 años'];

// Solution Card with expandable detail modal
function SolutionCard({ solution }: { solution: ExtendedSolution }) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const hasExtendedInfo = solution.source_url || solution.detailed_info || 
    (solution.key_providers && solution.key_providers.length > 0) ||
    (solution.case_studies && solution.case_studies.length > 0) ||
    (solution.applicable_sectors && solution.applicable_sectors.length > 0);

  return (
    <>
      <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base">{solution.name}</CardTitle>
              {solution.description && (
                <CardDescription className="line-clamp-2">{solution.description}</CardDescription>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => setIsDetailOpen(true)}
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 flex-1">
          <div className="flex flex-wrap gap-2">
            {solution.estimated_trl_range && (
              <Badge variant="outline">TRL {solution.estimated_trl_range}</Badge>
            )}
            {solution.cost_range && (
              <Badge variant="outline">
                <DollarSign className="w-3 h-3 mr-1" />
                {solution.cost_range}
              </Badge>
            )}
            {solution.implementation_time && (
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {solution.implementation_time}
              </Badge>
            )}
          </div>
          
          {solution.advantages && solution.advantages.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> Ventajas
              </h4>
              <ul className="text-sm space-y-0.5">
                {solution.advantages.slice(0, 3).map((adv, idx) => (
                  <li key={idx} className="text-muted-foreground">• {adv}</li>
                ))}
                {solution.advantages.length > 3 && (
                  <li className="text-muted-foreground text-xs">+{solution.advantages.length - 3} más...</li>
                )}
              </ul>
            </div>
          )}
          
          {solution.disadvantages && solution.disadvantages.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" /> Desventajas
              </h4>
              <ul className="text-sm space-y-0.5">
                {solution.disadvantages.slice(0, 2).map((dis, idx) => (
                  <li key={idx} className="text-muted-foreground">• {dis}</li>
                ))}
                {solution.disadvantages.length > 2 && (
                  <li className="text-muted-foreground text-xs">+{solution.disadvantages.length - 2} más...</li>
                )}
              </ul>
            </div>
          )}
          
          {/* Source link if available */}
          {solution.source_url && (
            <a 
              href={solution.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              <Link2 className="w-3 h-3" />
              {solution.source_title || 'Ver fuente'}
            </a>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              {solution.name}
            </DialogTitle>
            <DialogDescription>
              {solution.category}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Description */}
              {solution.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Descripción
                  </h4>
                  <p className="text-sm text-muted-foreground">{solution.description}</p>
                </div>
              )}
              
              {/* Detailed info */}
              {solution.detailed_info && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Información Detallada
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{solution.detailed_info}</p>
                </div>
              )}
              
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                {solution.estimated_trl_range && (
                  <Badge variant="outline">TRL {solution.estimated_trl_range}</Badge>
                )}
                {solution.cost_range && (
                  <Badge variant="outline">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {solution.cost_range}
                  </Badge>
                )}
                {solution.implementation_time && (
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {solution.implementation_time}
                  </Badge>
                )}
              </div>
              
              {/* Advantages */}
              {solution.advantages && solution.advantages.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" /> Ventajas
                  </h4>
                  <ul className="text-sm space-y-1">
                    {solution.advantages.map((adv, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span> {adv}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Disadvantages */}
              {solution.disadvantages && solution.disadvantages.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" /> Desventajas
                  </h4>
                  <ul className="text-sm space-y-1">
                    {solution.disadvantages.map((dis, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span> {dis}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Applicable Contexts */}
              {solution.applicable_contexts && solution.applicable_contexts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Contextos Aplicables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {solution.applicable_contexts.map((ctx, idx) => (
                      <Badge key={idx} variant="secondary">{ctx}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Applicable Sectors */}
              {solution.applicable_sectors && solution.applicable_sectors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Sectores Aplicables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {solution.applicable_sectors.map((sec, idx) => (
                      <Badge key={idx} variant="outline">{sec}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Key Providers */}
              {solution.key_providers && solution.key_providers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Proveedores Clave
                  </h4>
                  <ul className="text-sm space-y-1">
                    {solution.key_providers.map((prov, idx) => (
                      <li key={idx} className="text-muted-foreground">• {prov}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Case Studies */}
              {solution.case_studies && solution.case_studies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Casos de Estudio
                  </h4>
                  <ul className="text-sm space-y-1">
                    {solution.case_studies.map((cs, idx) => (
                      <li key={idx} className="text-muted-foreground">• {cs}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Source URL */}
              {solution.source_url && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Fuente
                  </h4>
                  <a 
                    href={solution.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {solution.source_title || solution.source_url}
                  </a>
                </div>
              )}
              
              {!hasExtendedInfo && (
                <div className="text-center py-4 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay información adicional disponible para esta solución.</p>
                  <p className="text-xs mt-1">Ejecuta una nueva sesión de IA para enriquecer los datos.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function StudyPhase2Solutions({ studyId, study }: Props) {
  const { data: solutions, isLoading } = useStudySolutions(studyId);
  const addSolution = useAddSolution();
  const aiSession = useAIStudySession(studyId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSolution, setNewSolution] = useState({
    category: '',
    name: '',
    description: '',
    advantages: [''],
    disadvantages: [''],
    estimated_trl_range: '',
    cost_range: '',
    implementation_time: '',
    priority: 0,
  });

  // Query for extracted technologies from study_longlist
  const { data: extractedTechnologies, isLoading: loadingTechs } = useQuery({
    queryKey: ['study-extracted-technologies', studyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_longlist')
        .select('*')
        .eq('study_id', studyId)
        .eq('source', 'ai_extracted')
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data as ExtractedTechnology[];
    },
    enabled: !!studyId,
  });

  const handleStartAISolutions = () => {
    aiSession.startSession('solutions', {
      problem_statement: study.problem_statement,
      objectives: study.objectives,
      context: study.context,
      constraints: study.constraints,
    });
  };

  const handleAddSolution = async () => {
    if (!newSolution.name.trim() || !newSolution.category.trim()) return;
    await addSolution.mutateAsync({
      study_id: studyId,
      ...newSolution,
      advantages: newSolution.advantages.filter(a => a.trim()),
      disadvantages: newSolution.disadvantages.filter(d => d.trim()),
    });
    setIsAddOpen(false);
    setNewSolution({
      category: '',
      name: '',
      description: '',
      advantages: [''],
      disadvantages: [''],
      estimated_trl_range: '',
      cost_range: '',
      implementation_time: '',
      priority: 0,
    });
  };

  const handleSendToScoutingQueue = async (tech: ExtractedTechnology) => {
    try {
      const { error } = await supabase.from('scouting_queue').insert({
        'Nombre de la tecnología': tech.technology_name,
        'Proveedor / Empresa': tech.provider || '',
        'País de origen': tech.country || '',
        'Web de la empresa': tech.web || '',
        'Descripción técnica breve': tech.brief_description || '',
        'Tipo de tecnología': tech.type_suggested || 'Por clasificar',
        'Subcategoría': tech.subcategory_suggested || '',
        'Grado de madurez (TRL)': tech.trl || 7,
        source: 'study_extraction',
        notes: `Extraída del estudio con ${Math.round((tech.confidence_score || 0.8) * 100)}% confianza`,
        queue_status: 'pending',
        priority: 'normal',
      });
      
      if (error) throw error;
      
      toast.success(`${tech.technology_name} enviada a Scouting Queue`);
    } catch (error) {
      console.error('Error sending to scouting queue:', error);
      toast.error('Error al enviar a Scouting Queue');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group solutions by category
  const solutionsByCategory = solutions?.reduce((acc, sol) => {
    const cat = sol.category || 'Sin Categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sol);
    return acc;
  }, {} as Record<string, StudySolution[]>) ?? {};

  return (
    <div className="space-y-4">
      {/* AI Session Panel */}
      <AISessionPanel
        state={{
          isActive: aiSession.isActive,
          isStarting: aiSession.isStarting,
          currentPhase: aiSession.currentPhase,
          progress: aiSession.progress,
          status: aiSession.status,
          error: aiSession.error,
          logs: aiSession.logs,
        }}
        onStart={handleStartAISolutions}
        onCancel={aiSession.cancelSession}
        isStarting={aiSession.isStarting}
        title="Sugerencia de Soluciones"
        description="La IA analiza el problema y sugiere categorías de soluciones"
      />

      {/* Tabs for Solutions and Extracted Technologies */}
      <Tabs defaultValue="solutions" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="solutions" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Soluciones Genéricas ({solutions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="technologies" className="gap-2">
              <Cpu className="w-4 h-4" />
              Tecnologías Identificadas ({extractedTechnologies?.length || 0})
            </TabsTrigger>
          </TabsList>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Solución
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Añadir Solución Genérica</DialogTitle>
                <DialogDescription>
                  Define una categoría de solución con sus ventajas y desventajas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría *</Label>
                    <Input
                      value={newSolution.category}
                      onChange={(e) => setNewSolution({ ...newSolution, category: e.target.value })}
                      placeholder="Ej: Tratamiento Biológico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={newSolution.name}
                      onChange={(e) => setNewSolution({ ...newSolution, name: e.target.value })}
                      placeholder="Ej: Reactores MBBR"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={newSolution.description}
                    onChange={(e) => setNewSolution({ ...newSolution, description: e.target.value })}
                    placeholder="Descripción de la solución y cómo aborda el problema"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Rango TRL</Label>
                    <Input
                      value={newSolution.estimated_trl_range}
                      onChange={(e) => setNewSolution({ ...newSolution, estimated_trl_range: e.target.value })}
                      placeholder="Ej: 6-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coste</Label>
                    <Select
                      value={newSolution.cost_range}
                      onValueChange={(value) => setNewSolution({ ...newSolution, cost_range: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {COST_RANGES.map(cost => (
                          <SelectItem key={cost} value={cost}>{cost}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tiempo Impl.</Label>
                    <Select
                      value={newSolution.implementation_time}
                      onValueChange={(value) => setNewSolution({ ...newSolution, implementation_time: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    Ventajas
                  </Label>
                  {newSolution.advantages.map((adv, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={adv}
                        onChange={(e) => {
                          const updated = [...newSolution.advantages];
                          updated[idx] = e.target.value;
                          setNewSolution({ ...newSolution, advantages: updated });
                        }}
                        placeholder={`Ventaja ${idx + 1}`}
                      />
                      {idx === newSolution.advantages.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setNewSolution({
                            ...newSolution,
                            advantages: [...newSolution.advantages, ''],
                          })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    Desventajas
                  </Label>
                  {newSolution.disadvantages.map((dis, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={dis}
                        onChange={(e) => {
                          const updated = [...newSolution.disadvantages];
                          updated[idx] = e.target.value;
                          setNewSolution({ ...newSolution, disadvantages: updated });
                        }}
                        placeholder={`Desventaja ${idx + 1}`}
                      />
                      {idx === newSolution.disadvantages.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setNewSolution({
                            ...newSolution,
                            disadvantages: [...newSolution.disadvantages, ''],
                          })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddSolution}
                  disabled={!newSolution.name.trim() || !newSolution.category.trim() || addSolution.isPending}
                >
                  {addSolution.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Añadir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab: Generic Solutions */}
        <TabsContent value="solutions" className="mt-0">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Soluciones Genéricas</h2>
            <p className="text-sm text-muted-foreground">
              Categorías de soluciones potenciales para el problema
            </p>
          </div>

          {solutions?.length === 0 ? (
            <Card className="p-8 text-center">
              <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin soluciones definidas</h3>
              <p className="text-muted-foreground mb-4">
                Define categorías de soluciones genéricas basadas en la investigación
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Primera Solución
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(solutionsByCategory).map(([category, categorySolutions]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categorySolutions.map((solution) => {
                      const extSol = solution as ExtendedSolution;
                      return (
                        <SolutionCard 
                          key={solution.id} 
                          solution={extSol} 
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Extracted Technologies */}
        <TabsContent value="technologies" className="mt-0">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Tecnologías Identificadas</h2>
            <p className="text-sm text-muted-foreground">
              Tecnologías específicas extraídas automáticamente por la IA durante la investigación
            </p>
          </div>

          {loadingTechs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !extractedTechnologies || extractedTechnologies.length === 0 ? (
            <Card className="p-8 text-center">
              <Cpu className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No se han extraído tecnologías aún</h3>
              <p className="text-muted-foreground">
                Ejecuta la sesión de IA en Fase 1 para identificar tecnologías automáticamente
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {extractedTechnologies.map((tech) => (
                <TechCard 
                  key={tech.id} 
                  tech={tech} 
                  onSendToScoutingQueue={handleSendToScoutingQueue}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
