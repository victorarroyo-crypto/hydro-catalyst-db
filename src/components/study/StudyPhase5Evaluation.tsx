import { useState } from 'react';
import {
  useStudyShortlist,
  useStudyEvaluations,
  useUpsertEvaluation,
  ScoutingStudy,
  StudyEvaluation,
} from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Scale,
  Target,
  Shield,
  Trophy,
} from 'lucide-react';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

const RECOMMENDATIONS = [
  { value: 'highly_recommended', label: 'Altamente Recomendada', color: 'bg-green-500' },
  { value: 'recommended', label: 'Recomendada', color: 'bg-blue-500' },
  { value: 'conditional', label: 'Condicional', color: 'bg-amber-500' },
  { value: 'not_recommended', label: 'No Recomendada', color: 'bg-red-500' },
];

export default function StudyPhase5Evaluation({ studyId, study }: Props) {
  const { data: shortlist, isLoading: loadingShortlist } = useStudyShortlist(studyId);
  const { data: evaluations, isLoading: loadingEvaluations } = useStudyEvaluations(studyId);
  const upsertEvaluation = useUpsertEvaluation();
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [evalForm, setEvalForm] = useState<Partial<StudyEvaluation>>({});
  const [activeTab, setActiveTab] = useState('scores');

  const handleOpenEvaluation = (shortlistId: string) => {
    const existing = evaluations?.find(e => e.shortlist_id === shortlistId);
    setEvalForm(existing ?? {
      study_id: studyId,
      shortlist_id: shortlistId,
      trl_score: 5,
      cost_score: 5,
      scalability_score: 5,
      context_fit_score: 5,
      innovation_potential_score: 5,
    });
    setSelectedItem(shortlistId);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedItem) return;
    
    // Calculate overall score
    const scores = [
      evalForm.trl_score ?? 0,
      evalForm.cost_score ?? 0,
      evalForm.scalability_score ?? 0,
      evalForm.context_fit_score ?? 0,
      evalForm.innovation_potential_score ?? 0,
    ];
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    await upsertEvaluation.mutateAsync({
      ...evalForm,
      study_id: studyId,
      shortlist_id: selectedItem,
      overall_score: Math.round(overall * 100) / 100,
    });
    setSelectedItem(null);
  };

  const getEvaluationForItem = (shortlistId: string) => {
    return evaluations?.find(e => e.shortlist_id === shortlistId);
  };

  const isLoading = loadingShortlist || loadingEvaluations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ScoreSlider = ({ 
    label, 
    value, 
    onChange, 
    icon: Icon 
  }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void;
    icon: React.ElementType;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
        </Label>
        <Badge variant="outline">{value}/10</Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={10}
        min={1}
        step={1}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 5: Evaluación Comparativa</h2>
          <p className="text-sm text-muted-foreground">
            Evalúa cada tecnología de la lista corta según criterios técnicos y económicos
          </p>
        </div>
        <Button variant="outline" disabled>
          <Sparkles className="w-4 h-4 mr-2" />
          Analizar con IA
        </Button>
      </div>

      {shortlist?.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin tecnologías para evaluar</h3>
          <p className="text-muted-foreground">
            Primero añade tecnologías a la lista corta en la Fase 4
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shortlist?.map((item, idx) => {
            const evaluation = getEvaluationForItem(item.id);
            const recConfig = RECOMMENDATIONS.find(r => r.value === evaluation?.recommendation);
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {/* Left indicator */}
                  <div className={`w-1 ${recConfig?.color ?? 'bg-muted'}`} />
                  
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-medium">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{item.longlist?.technology_name}</h4>
                          {item.longlist?.provider && (
                            <p className="text-sm text-muted-foreground">{item.longlist.provider}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {evaluation ? (
                          <>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{evaluation.overall_score?.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">Puntuación</p>
                            </div>
                            {recConfig && (
                              <Badge className={`${recConfig.color} text-white`}>
                                {recConfig.label}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Sin evaluar</Badge>
                        )}
                        <Button 
                          variant={evaluation ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleOpenEvaluation(item.id)}
                        >
                          {evaluation ? 'Editar' : 'Evaluar'}
                        </Button>
                      </div>
                    </div>
                    
                    {evaluation && (
                      <div className="mt-4 grid grid-cols-5 gap-4 text-center text-sm">
                        <div>
                          <p className="font-medium">{evaluation.trl_score}/10</p>
                          <p className="text-xs text-muted-foreground">TRL</p>
                        </div>
                        <div>
                          <p className="font-medium">{evaluation.cost_score}/10</p>
                          <p className="text-xs text-muted-foreground">Coste</p>
                        </div>
                        <div>
                          <p className="font-medium">{evaluation.scalability_score}/10</p>
                          <p className="text-xs text-muted-foreground">Escalabilidad</p>
                        </div>
                        <div>
                          <p className="font-medium">{evaluation.context_fit_score}/10</p>
                          <p className="text-xs text-muted-foreground">Adecuación</p>
                        </div>
                        <div>
                          <p className="font-medium">{evaluation.innovation_potential_score}/10</p>
                          <p className="text-xs text-muted-foreground">Innovación</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Evaluation Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluación de Tecnología</DialogTitle>
            <DialogDescription>
              {shortlist?.find(s => s.id === selectedItem)?.longlist?.technology_name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scores">Puntuaciones</TabsTrigger>
              <TabsTrigger value="context">Adecuación</TabsTrigger>
              <TabsTrigger value="swot">DAFO</TabsTrigger>
              <TabsTrigger value="recommendation">Recomendación</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scores" className="space-y-6 pt-4">
              <ScoreSlider
                label="Madurez Tecnológica (TRL)"
                value={evalForm.trl_score ?? 5}
                onChange={(v) => setEvalForm({ ...evalForm, trl_score: v })}
                icon={TrendingUp}
              />
              <Textarea
                placeholder="Notas sobre TRL..."
                value={evalForm.trl_notes ?? ''}
                onChange={(e) => setEvalForm({ ...evalForm, trl_notes: e.target.value })}
                rows={2}
              />
              
              <ScoreSlider
                label="Coste (10 = muy económico)"
                value={evalForm.cost_score ?? 5}
                onChange={(v) => setEvalForm({ ...evalForm, cost_score: v })}
                icon={Scale}
              />
              <Textarea
                placeholder="Notas sobre costes..."
                value={evalForm.cost_notes ?? ''}
                onChange={(e) => setEvalForm({ ...evalForm, cost_notes: e.target.value })}
                rows={2}
              />
              
              <ScoreSlider
                label="Escalabilidad"
                value={evalForm.scalability_score ?? 5}
                onChange={(v) => setEvalForm({ ...evalForm, scalability_score: v })}
                icon={TrendingUp}
              />
              <Textarea
                placeholder="Notas sobre escalabilidad..."
                value={evalForm.scalability_notes ?? ''}
                onChange={(e) => setEvalForm({ ...evalForm, scalability_notes: e.target.value })}
                rows={2}
              />
            </TabsContent>
            
            <TabsContent value="context" className="space-y-6 pt-4">
              <ScoreSlider
                label="Adecuación al Contexto"
                value={evalForm.context_fit_score ?? 5}
                onChange={(v) => setEvalForm({ ...evalForm, context_fit_score: v })}
                icon={Target}
              />
              <Textarea
                placeholder="Notas sobre adecuación al contexto del problema..."
                value={evalForm.context_notes ?? ''}
                onChange={(e) => setEvalForm({ ...evalForm, context_notes: e.target.value })}
                rows={3}
              />
              
              <ScoreSlider
                label="Potencial de Innovación"
                value={evalForm.innovation_potential_score ?? 5}
                onChange={(v) => setEvalForm({ ...evalForm, innovation_potential_score: v })}
                icon={Sparkles}
              />
            </TabsContent>
            
            <TabsContent value="swot" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" /> Fortalezas
                  </Label>
                  <Textarea
                    placeholder="Una fortaleza por línea..."
                    value={(evalForm.strengths ?? []).join('\n')}
                    onChange={(e) => setEvalForm({ 
                      ...evalForm, 
                      strengths: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" /> Debilidades
                  </Label>
                  <Textarea
                    placeholder="Una debilidad por línea..."
                    value={(evalForm.weaknesses ?? []).join('\n')}
                    onChange={(e) => setEvalForm({ 
                      ...evalForm, 
                      weaknesses: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-blue-600">
                    <TrendingUp className="w-4 h-4" /> Oportunidades
                  </Label>
                  <Textarea
                    placeholder="Una oportunidad por línea..."
                    value={(evalForm.opportunities ?? []).join('\n')}
                    onChange={(e) => setEvalForm({ 
                      ...evalForm, 
                      opportunities: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-amber-600">
                    <Shield className="w-4 h-4" /> Amenazas
                  </Label>
                  <Textarea
                    placeholder="Una amenaza por línea..."
                    value={(evalForm.threats ?? []).join('\n')}
                    onChange={(e) => setEvalForm({ 
                      ...evalForm, 
                      threats: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Barreras de Implementación</Label>
                <Textarea
                  placeholder="Una barrera por línea..."
                  value={(evalForm.implementation_barriers ?? []).join('\n')}
                  onChange={(e) => setEvalForm({ 
                    ...evalForm, 
                    implementation_barriers: e.target.value.split('\n').filter(s => s.trim()) 
                  })}
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="recommendation" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Recomendación Final</Label>
                <Select
                  value={evalForm.recommendation ?? ''}
                  onValueChange={(v) => setEvalForm({ ...evalForm, recommendation: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar recomendación" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMMENDATIONS.map(rec => (
                      <SelectItem key={rec.value} value={rec.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${rec.color}`} />
                          {rec.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Justificación de la Recomendación</Label>
                <Textarea
                  placeholder="Explica por qué se recomienda (o no) esta tecnología..."
                  value={evalForm.recommendation_notes ?? ''}
                  onChange={(e) => setEvalForm({ ...evalForm, recommendation_notes: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notas del Benchmark Competitivo</Label>
                <Textarea
                  placeholder="Comparación con otras tecnologías de la lista corta..."
                  value={evalForm.benchmark_notes ?? ''}
                  onChange={(e) => setEvalForm({ ...evalForm, benchmark_notes: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEvaluation}
              disabled={upsertEvaluation.isPending}
            >
              {upsertEvaluation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
