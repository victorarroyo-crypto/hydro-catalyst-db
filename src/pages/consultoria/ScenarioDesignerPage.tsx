import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Layers, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api';
import { ScenarioDesign } from '@/types/scenarioDesigner';
import ScenarioList from '@/components/scenarios/designer/ScenarioList';
import ScenarioEditor from '@/components/scenarios/designer/ScenarioEditor';
import ScenarioBalanceCard from '@/components/scenarios/designer/ScenarioBalanceCard';
import ScenarioFinancialsCard from '@/components/scenarios/designer/ScenarioFinancialsCard';
import ScenarioDiagramEditor from '@/components/scenarios/designer/ScenarioDiagramEditor';

const ScenarioDesignerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [localScenario, setLocalScenario] = useState<ScenarioDesign | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch project info
  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${id}`);
      if (!res.ok) throw new Error('Error loading project');
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch scenarios
  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['project-scenarios-designer', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${id}/scenarios`);
      if (!res.ok) throw new Error('Error loading scenarios');
      return res.json();
    },
    enabled: !!id,
  });

  const scenarios: ScenarioDesign[] = scenariosData?.scenarios || [];

  // Set initial selected scenario
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenarioId]);

  // Sync local scenario when selection changes
  useEffect(() => {
    if (selectedScenarioId) {
      const found = scenarios.find(s => s.id === selectedScenarioId);
      if (found) {
        setLocalScenario(found);
        setIsDirty(false);
      }
    }
  }, [selectedScenarioId, scenarios]);

  // Create scenario mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Escenario ${scenarios.length + 1}`,
          scenario_type: 'moderate',
          description: '',
        }),
      });
      if (!res.ok) throw new Error('Error creating scenario');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios-designer', id] });
      setSelectedScenarioId(data.scenario?.id || data.id);
      toast({ title: 'Escenario creado' });
    },
    onError: () => {
      toast({ title: 'Error al crear escenario', variant: 'destructive' });
    },
  });

  // Save scenario mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ScenarioDesign>) => {
      const res = await fetch(`${API_URL}/api/projects/${id}/scenarios/${selectedScenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error saving scenario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios-designer', id] });
      setIsDirty(false);
      toast({ title: 'Escenario guardado' });
    },
    onError: () => {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    },
  });

  // Delete scenario mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${id}/scenarios/${selectedScenarioId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error deleting scenario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios-designer', id] });
      setSelectedScenarioId(null);
      toast({ title: 'Escenario eliminado' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    },
  });

  // Handle local scenario changes
  const handleScenarioChange = useCallback((updates: Partial<ScenarioDesign>) => {
    if (!localScenario) return;
    setLocalScenario({ ...localScenario, ...updates });
    setIsDirty(true);
  }, [localScenario]);

  // Handle save
  const handleSave = () => {
    if (!localScenario) return;
    saveMutation.mutate(localScenario);
  };

  // Handle recalculate
  const handleRecalculate = async () => {
    if (!selectedScenarioId) return;
    
    setIsRecalculating(true);
    try {
      // First save current changes
      if (isDirty && localScenario) {
        await saveMutation.mutateAsync(localScenario);
      }
      
      // Recalculate balance
      await fetch(`${API_URL}/api/projects/${id}/scenarios/${selectedScenarioId}/recalculate-balance`, {
        method: 'POST',
      });
      
      // Recalculate financials
      await fetch(`${API_URL}/api/projects/${id}/scenarios/${selectedScenarioId}/recalculate-financials`, {
        method: 'POST',
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['project-scenarios-designer', id] });
      toast({ title: 'Cálculos actualizados' });
    } catch {
      toast({ title: 'Error al recalcular', variant: 'destructive' });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este escenario?')) {
      deleteMutation.mutate();
    }
  };

  // Handle diagram change
  const handleDiagramChange = (diagramData: Record<string, unknown>) => {
    handleScenarioChange({ diagram_data: diagramData });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/consultoria/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Diseñador de Escenarios
            </h1>
            {projectData?.project && (
              <p className="text-sm text-muted-foreground">
                {projectData.project.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {scenarios.length}/6 escenarios
          </Badge>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Scenario List */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <ScenarioList
            scenarios={scenarios}
            selectedId={selectedScenarioId}
            onSelect={setSelectedScenarioId}
            onCreateNew={() => createMutation.mutate()}
            maxScenarios={6}
          />
        </div>

        {/* Center Column - Editor */}
        <div className="flex-1 border-r overflow-hidden">
          {localScenario ? (
            <ScenarioEditor
              scenario={localScenario}
              onChange={handleScenarioChange}
              onSave={handleSave}
              onRecalculate={handleRecalculate}
              onDelete={handleDelete}
              isDirty={isDirty}
              isSaving={saveMutation.isPending}
              isRecalculating={isRecalculating}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Selecciona o crea un escenario</p>
            </div>
          )}
        </div>

        {/* Right Column - Summary & Diagram */}
        <div className="w-96 flex-shrink-0 overflow-auto p-4 space-y-4">
          <ScenarioBalanceCard
            balance={localScenario?.water_balance || null}
            isCalculating={isRecalculating}
          />
          <ScenarioFinancialsCard
            financials={localScenario?.financials || null}
            isCalculating={isRecalculating}
          />
          {localScenario && (
            <ScenarioDiagramEditor
              scenario={localScenario}
              onDiagramChange={handleDiagramChange}
              isReadOnly={localScenario.is_baseline}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioDesignerPage;
