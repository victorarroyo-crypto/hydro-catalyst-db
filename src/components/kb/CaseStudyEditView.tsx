import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  Loader2,
  MapPin,
  Building2,
  DollarSign,
  TrendingUp,
  Beaker,
  Target,
  Lightbulb,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { PAISES } from '@/constants/taxonomyData';

// Sector options
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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'archived', label: 'Archivado' },
];

interface CaseStudyEditViewProps {
  caseStudyId: string;
  onBack: () => void;
  onSaved: () => void;
}

export const CaseStudyEditView: React.FC<CaseStudyEditViewProps> = ({
  caseStudyId,
  onBack,
  onSaved,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('draft');
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [solutionApplied, setSolutionApplied] = useState('');
  const [treatmentTrain, setTreatmentTrain] = useState<string[]>([]);
  const [resultsAchieved, setResultsAchieved] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [capex, setCapex] = useState<number | null>(null);
  const [opexYear, setOpexYear] = useState<number | null>(null);
  const [paybackMonths, setPaybackMonths] = useState<number | null>(null);
  const [roiPercent, setRoiPercent] = useState<number | null>(null);
  const [roiRationale, setRoiRationale] = useState('');

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    solution: true,
    economic: false,
    results: false,
  });

  // Fetch case study data
  const { data: caseStudy, isLoading } = useQuery({
    queryKey: ['case-study-edit', caseStudyId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('casos_de_estudio')
        .select('*')
        .eq('id', caseStudyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Load data into form when fetched
  useEffect(() => {
    if (caseStudy) {
      setName(caseStudy.name || '');
      setDescription(caseStudy.description || '');
      setCountry(caseStudy.country || '');
      setSector(caseStudy.sector || '');
      setStatus(caseStudy.status || 'draft');
      setOriginalStatus(caseStudy.status || 'draft');
      setSolutionApplied(caseStudy.solution_applied || '');
      setTreatmentTrain(caseStudy.treatment_train || []);
      setResultsAchieved(caseStudy.results_achieved || '');
      setLessonsLearned(caseStudy.lessons_learned || '');
      setCapex(caseStudy.capex);
      setOpexYear(caseStudy.opex_year);
      setPaybackMonths(caseStudy.payback_months);
      setRoiPercent(caseStudy.roi_percent);
      setRoiRationale(caseStudy.roi_rationale || '');
    }
  }, [caseStudy]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await externalSupabase
        .from('casos_de_estudio')
        .update({
          name,
          description: description || null,
          country: country || null,
          sector: sector || null,
          status,
          solution_applied: solutionApplied || null,
          treatment_train: treatmentTrain.length > 0 ? treatmentTrain : null,
          results_achieved: resultsAchieved || null,
          lessons_learned: lessonsLearned || null,
          capex,
          opex_year: opexYear,
          payback_months: paybackMonths,
          roi_percent: roiPercent,
          roi_rationale: roiRationale || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseStudyId);

      if (error) throw error;

      // If status changed from draft to approved, send technologies to external scouting
      if (originalStatus === 'draft' && status === 'approved') {
        console.log('[CaseStudyEditView] Publishing case study, checking for technologies to send to scouting');
        
        // Fetch associated technologies that don't have a scouting_queue_id yet
        const { data: techs, error: techError } = await externalSupabase
          .from('case_study_technologies')
          .select('*')
          .eq('case_study_id', caseStudyId)
          .is('scouting_queue_id', null);

        if (techError) {
          console.error('[CaseStudyEditView] Error fetching technologies:', techError);
        } else if (techs && techs.length > 0) {
          console.log(`[CaseStudyEditView] Sending ${techs.length} technologies to external scouting`);
          
          for (const tech of techs) {
            const appData = (tech.application_data as Record<string, unknown>) || {};
            
            try {
              // Insertar en BD Externa directamente (campos snake_case)
              const { data: insertedRecord, error: scoutingError } = await externalSupabase
                .from('scouting_queue')
                .insert({
                  nombre: tech.technology_name,
                  proveedor: tech.provider || null,
                  pais: (appData.country as string) || country || null,
                  web: (appData.web as string) || null,
                  email: (appData.email as string) || null,
                  descripcion: (appData.description as string) || null,
                  tipo_sugerido: (appData.type as string) || 'Por clasificar',
                  subcategoria: (appData.subcategory as string) || null,
                  trl_estimado: (appData.trl as number) || null,
                  ventaja_competitiva: (appData.innovationAdvantages as string) || null,
                  aplicacion_principal: (appData.mainApplication as string) || null,
                  sector: sector || null,
                  source: 'case_study',
                  case_study_id: caseStudyId,
                  status: 'review'
                })
                .select()
                .single();

              if (scoutingError) {
                console.error('[CaseStudyEditView] Error sending tech to scouting:', tech.technology_name, scoutingError);
              } else if (insertedRecord?.id) {
                // Successfully inserted - update scouting_queue_id to mark as sent
                await externalSupabase
                  .from('case_study_technologies')
                  .update({ scouting_queue_id: insertedRecord.id })
                  .eq('id', tech.id);
                
                console.log('[CaseStudyEditView] Successfully sent and linked:', tech.technology_name, insertedRecord.id);
              }
            } catch (err) {
              console.error('[CaseStudyEditView] Exception sending tech to scouting:', tech.technology_name, err);
            }
          }
        } else {
          console.log('[CaseStudyEditView] No new technologies to send to scouting');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['case-study', caseStudyId] });
      
      const wasPublished = originalStatus === 'draft' && status === 'approved';
      toast.success(
        wasPublished 
          ? 'Caso publicado y tecnologías enviadas a scouting' 
          : 'Caso de estudio guardado correctamente'
      );
      onSaved();
    },
    onError: (error) => {
      console.error('Error saving case study:', error);
      toast.error('Error al guardar el caso de estudio');
    },
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddTreatment = () => {
    setTreatmentTrain(prev => [...prev, '']);
  };

  const handleRemoveTreatment = (index: number) => {
    setTreatmentTrain(prev => prev.filter((_, i) => i !== index));
  };

  const handleTreatmentChange = (index: number, value: string) => {
    setTreatmentTrain(prev => prev.map((t, i) => i === index ? value : t));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Caso de Estudio</h1>
            <p className="text-sm text-muted-foreground">Modifica los datos del caso</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'draft' ? (
            <>
              <Button 
                variant="outline"
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending || !name}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Borrador
              </Button>
              <Button 
                onClick={() => {
                  setStatus('approved');
                  setTimeout(() => saveMutation.mutate(), 50);
                }} 
                disabled={saveMutation.isPending || !name}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending || !name}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4 pr-4">
          {/* Basic Information */}
          <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Información Básica</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.basic ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Proyecto *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Planta de tratamiento EDAR Ejemplo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción del Problema</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe el problema o contexto inicial..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>País</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAISES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Sector</Label>
                      <Select value={sector} onValueChange={setSector}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTOR_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.icon} {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Solution */}
          <Collapsible open={openSections.solution} onOpenChange={() => toggleSection('solution')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Beaker className="h-5 w-5 text-accent" />
                      <CardTitle className="text-lg">Solución Aplicada</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.solution ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descripción de la Solución</Label>
                    <Textarea
                      value={solutionApplied}
                      onChange={(e) => setSolutionApplied(e.target.value)}
                      placeholder="Describe la solución implementada..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tren de Tratamiento</Label>
                      <Button variant="outline" size="sm" onClick={handleAddTreatment}>
                        + Añadir etapa
                      </Button>
                    </div>
                    {treatmentTrain.length > 0 ? (
                      <div className="space-y-2">
                        {treatmentTrain.map((treatment, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="outline" className="shrink-0">
                              Etapa {index + 1}
                            </Badge>
                            <Input
                              value={treatment}
                              onChange={(e) => handleTreatmentChange(index, e.target.value)}
                              placeholder="Ej: Filtración, DAF, MBR..."
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTreatment(index)}
                              className="text-destructive"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay etapas definidas</p>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Economic Data */}
          <Collapsible open={openSections.economic} onOpenChange={() => toggleSection('economic')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-success" />
                      <CardTitle className="text-lg">Datos Económicos</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.economic ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>CAPEX (€)</Label>
                      <Input
                        type="number"
                        value={capex ?? ''}
                        onChange={(e) => setCapex(e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>OPEX Anual (€/año)</Label>
                      <Input
                        type="number"
                        value={opexYear ?? ''}
                        onChange={(e) => setOpexYear(e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payback (meses)</Label>
                      <Input
                        type="number"
                        value={paybackMonths ?? ''}
                        onChange={(e) => setPaybackMonths(e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ROI (%)</Label>
                      <Input
                        type="number"
                        value={roiPercent ?? ''}
                        onChange={(e) => setRoiPercent(e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Justificación del ROI</Label>
                    <Textarea
                      value={roiRationale}
                      onChange={(e) => setRoiRationale(e.target.value)}
                      placeholder="Explica cómo se calculó el ROI..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Results */}
          <Collapsible open={openSections.results} onOpenChange={() => toggleSection('results')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-warning" />
                      <CardTitle className="text-lg">Resultados y Lecciones</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.results ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Resultados Conseguidos</Label>
                    <Textarea
                      value={resultsAchieved}
                      onChange={(e) => setResultsAchieved(e.target.value)}
                      placeholder="Describe los resultados obtenidos..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lecciones Aprendidas</Label>
                    <Textarea
                      value={lessonsLearned}
                      onChange={(e) => setLessonsLearned(e.target.value)}
                      placeholder="¿Qué lecciones se extrajeron del proyecto?"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CaseStudyEditView;
