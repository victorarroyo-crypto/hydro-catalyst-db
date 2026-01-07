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
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';
import { toast } from 'sonner';

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
  source: string | null;
  added_at: string;
}

const COST_RANGES = ['Muy Bajo', 'Bajo', 'Medio', 'Alto', 'Muy Alto'];
const TIME_RANGES = ['< 3 meses', '3-6 meses', '6-12 meses', '1-2 años', '> 2 años'];

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
                    {categorySolutions.map((solution) => (
                      <Card key={solution.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{solution.name}</CardTitle>
                          {solution.description && (
                            <CardDescription>{solution.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
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
                                {solution.advantages.map((adv, idx) => (
                                  <li key={idx} className="text-muted-foreground">• {adv}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {solution.disadvantages && solution.disadvantages.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                                <ThumbsDown className="w-3 h-3" /> Desventajas
                              </h4>
                              <ul className="text-sm space-y-0.5">
                                {solution.disadvantages.map((dis, idx) => (
                                  <li key={idx} className="text-muted-foreground">• {dis}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
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
                <Card key={tech.id} className="flex flex-col">
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
                        onClick={() => handleSendToScoutingQueue(tech)}
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
