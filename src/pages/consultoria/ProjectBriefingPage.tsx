import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Target, AlertTriangle, DollarSign,
  Droplets, CheckCircle, ArrowRight, ArrowLeft,
  Loader2
} from 'lucide-react';
import { briefingService } from '@/services/briefingService';
import { useToast } from '@/hooks/use-toast';
import type { ProjectBriefing } from '@/types/briefing';
import {
  ProjectTypeSection,
  CompanyInfoSection,
  ScopeSection,
  ProblemStatementSection,
  ConstraintsSection,
  KnownDataSection,
  BriefingSummary,
} from '@/components/briefing';

const STEPS = [
  { id: 'type', label: 'Tipo', icon: Building2 },
  { id: 'company', label: 'Empresa', icon: Building2 },
  { id: 'scope', label: 'Alcance', icon: Target },
  { id: 'problem', label: 'Problema', icon: AlertTriangle },
  { id: 'constraints', label: 'Restricciones', icon: DollarSign },
  { id: 'data', label: 'Datos', icon: Droplets },
  { id: 'summary', label: 'Resumen', icon: CheckCircle },
];

function getDefaultBriefing(projectId: string): ProjectBriefing {
  return {
    project_id: projectId,
    project_type: 'diagnosis',
    scope_areas: {
      water_supply: { enabled: false, notes: '' },
      process_water: { enabled: false, notes: '' },
      cooling_systems: { enabled: false, notes: '' },
      boiler_steam: { enabled: false, notes: '' },
      wastewater_treatment: { enabled: false, notes: '' },
      sludge_management: { enabled: false, notes: '' },
      hazardous_waste: { enabled: false, notes: '' },
      non_hazardous_waste: { enabled: false, notes: '' },
      reuse_recycling: { enabled: false, notes: '' },
      ro_membranes: { enabled: false, notes: '' },
      energy_water_nexus: { enabled: false, notes: '' },
      other: { enabled: false, notes: '' },
    },
    problem_statement: '',
    constraints: {
      capex_preference: 'flexible',
      operational_constraints: [],
      technical_constraints: [],
    },
    known_water_data: {},
    known_waste_data: {},
    company_info: { company_name: '' },
    briefing_completed: false,
  };
}

export default function ProjectBriefingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [briefing, setBriefing] = useState<ProjectBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningResearch, setRunningResearch] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, [projectId]);

  const loadBriefing = async () => {
    try {
      const data = await briefingService.getBriefing(projectId!);
      setBriefing(data);
    } catch {
      setBriefing(getDefaultBriefing(projectId!));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!briefing) return;
    setSaving(true);
    try {
      await briefingService.updateBriefing(projectId!, briefing);
      toast({ title: 'Guardado', description: 'Briefing actualizado correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteBriefing = async () => {
    await handleSave();
    try {
      await briefingService.completeBriefing(projectId!);
      toast({ title: 'Briefing Completado', description: 'Ahora puedes ejecutar la investigación' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRunResearch = async () => {
    setRunningResearch(true);
    try {
      await briefingService.runPreliminaryResearch(projectId!);
      toast({ title: 'Investigación Iniciada', description: 'Los agentes están investigando...' });
      navigate(`/consultoria/projects/${projectId}`);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setRunningResearch(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (loading || !briefing) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Briefing del Proyecto</h1>
        <p className="text-muted-foreground">
          Define los objetivos y alcance para guiar la investigación
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{STEPS[currentStep].label}</span>
          <span>{currentStep + 1} de {STEPS.length}</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="flex justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
                ${isActive ? 'bg-primary/10 text-primary' : ''}
                ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}
                hover:bg-muted
              `}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs hidden md:block">{step.label}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && <ProjectTypeSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 1 && <CompanyInfoSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 2 && <ScopeSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 3 && <ProblemStatementSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 4 && <ConstraintsSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 5 && <KnownDataSection briefing={briefing} onChange={setBriefing} />}
          {currentStep === 6 && <BriefingSummary briefing={briefing} onRunResearch={handleRunResearch} runningResearch={runningResearch} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button onClick={handleSave} variant="ghost" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => prev + 1)}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCompleteBriefing} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completar
          </Button>
        )}
      </div>
    </div>
  );
}
