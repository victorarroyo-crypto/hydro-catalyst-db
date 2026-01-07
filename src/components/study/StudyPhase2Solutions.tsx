import { useState } from 'react';
import { useStudySolutions, useAddSolution, ScoutingStudy, StudySolution } from '@/hooks/useScoutingStudies';
import { useAIStudySession } from '@/hooks/useAIStudySession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Sparkles,
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';

interface Props {
  studyId: string;
  study: ScoutingStudy;
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 2: Soluciones Genéricas</h2>
          <p className="text-sm text-muted-foreground">
            Define categorías de soluciones potenciales para el problema
          </p>
        </div>
        <div className="flex gap-2">
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
    </div>
  );
}
