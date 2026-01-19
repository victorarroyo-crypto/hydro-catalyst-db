import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, BarChart3, Layers } from 'lucide-react';
import { ScenarioCard, Scenario } from './ScenarioCard';
import { ScenarioFormModal } from './ScenarioFormModal';
import { ScenarioCompareModal } from './ScenarioCompareModal';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ScenariosSectionProps {
  projectId: string;
}

export const ScenariosSection: React.FC<ScenariosSectionProps> = ({ projectId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Fetch scenarios
  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['project-scenarios', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scenarios`);
      if (!res.ok) throw new Error('Error fetching scenarios');
      return res.json() as Promise<Scenario[]>;
    },
    enabled: !!projectId,
  });

  // Create scenario
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Scenario>) => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error creating scenario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios', projectId] });
      setFormModalOpen(false);
      setEditingScenario(null);
      toast({ title: 'Escenario creado' });
    },
    onError: () => {
      toast({ title: 'Error al crear escenario', variant: 'destructive' });
    },
  });

  // Update scenario
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Scenario> }) => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scenarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error updating scenario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios', projectId] });
      setFormModalOpen(false);
      setEditingScenario(null);
      toast({ title: 'Escenario actualizado' });
    },
    onError: () => {
      toast({ title: 'Error al actualizar escenario', variant: 'destructive' });
    },
  });

  // Delete scenario
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scenarios/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error deleting scenario');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-scenarios', projectId] });
      toast({ title: 'Escenario eliminado' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar escenario', variant: 'destructive' });
    },
  });

  // Compare scenarios
  const compareMutation = useMutation({
    mutationFn: async (scenarioIds: string[]) => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/scenarios/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_ids: scenarioIds }),
      });
      if (!res.ok) throw new Error('Error comparing scenarios');
      return res.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data);
      toast({ title: 'Comparación completada' });
    },
    onError: () => {
      toast({ title: 'Error al comparar escenarios', variant: 'destructive' });
    },
  });

  const handleSave = (data: Partial<Scenario>) => {
    if (editingScenario) {
      updateMutation.mutate({ id: editingScenario.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setFormModalOpen(true);
  };

  const handleSetRecommended = (id: string, recommended: boolean) => {
    updateMutation.mutate({ id, data: { is_recommended: recommended } });
  };

  const openCreateModal = () => {
    setEditingScenario(null);
    setFormModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Escenarios ({scenarios?.length || 0})
        </h3>
        <div className="flex gap-2">
          {(scenarios?.length || 0) >= 2 && (
            <Button variant="outline" onClick={() => setCompareModalOpen(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparar
            </Button>
          )}
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Escenario
          </Button>
        </div>
      </div>

      {!scenarios?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium text-foreground mb-2">Sin escenarios</h4>
            <p className="text-muted-foreground text-center mb-4">
              Crea escenarios para evaluar diferentes estrategias de mejora
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primer escenario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSetRecommended={handleSetRecommended}
            />
          ))}
        </div>
      )}

      <ScenarioFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        scenario={editingScenario}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <ScenarioCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        scenarios={scenarios || []}
        isComparing={compareMutation.isPending}
        comparisonResult={comparisonResult}
        onCompare={(ids) => compareMutation.mutate(ids)}
      />
    </div>
  );
};
