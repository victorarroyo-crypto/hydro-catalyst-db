import { useState } from 'react';
import { useStudySolutions, useAddSolution, ScoutingStudy, StudySolution } from '@/hooks/useScoutingStudies';
import { useAIStudySession } from '@/hooks/useAIStudySession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ExternalLink,
  Link2,
  Info,
  Building2,
  FileText,
  Target,
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';

interface Props {
  studyId: string;
  study: ScoutingStudy;
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
  const aiSession = useAIStudySession(studyId, 'solutions');
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

  // Technologies are now managed exclusively in Phase 3 (Longlist)
  // Removed extracted technologies query from Phase 2 to avoid confusion

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

  // Technology management functions moved to Phase 3 (StudyPhase3Longlist)

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

      {/* Solutions Section - No tabs needed now */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Soluciones Genéricas</h2>
          <p className="text-sm text-muted-foreground">
            Categorías de soluciones potenciales para el problema
          </p>
        </div>

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

      {/* Solutions List */}
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
    </div>
  );
}
