import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Network, Trash2, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DiagramCanvas } from './DiagramCanvas';
import { Diagram, DiagramLevel, Scenario, DiagramChange } from './types';
import { API_URL } from '@/lib/api';

interface DiagramsSectionProps {
  projectId: string;
}

const LEVEL_LABELS: Record<DiagramLevel, string> = {
  0: 'Nivel 0 - Planta Completa',
  1: 'Nivel 1 - Subsistema',
  2: 'Nivel 2 - Equipo',
};

export function DiagramsSection({ projectId }: DiagramsSectionProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 0 as DiagramLevel,
  });

  // Fetch diagrams
  const { data: diagrams, isLoading } = useQuery<Diagram[]>({
    queryKey: ['diagrams', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/diagrams`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Error al cargar diagramas');
      }
      return response.json();
    },
  });

  // Fetch scenarios for the project
  const { data: scenarios } = useQuery<Scenario[]>({
    queryKey: ['scenarios', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/scenarios`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Error al cargar escenarios');
      }
      return response.json();
    },
  });

  // Save scenario diagram changes
  const saveScenarioChanges = async (scenarioId: string, changes: DiagramChange[]) => {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/scenarios/${scenarioId}/diagram-changes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagram_id: selectedDiagram?.id, changes }),
      }
    );
    if (!response.ok) throw new Error('Error al guardar cambios');
  };

  // Create diagram
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/diagrams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          nodes: [],
          connections: [],
          annotations: [],
        }),
      });
      if (!response.ok) throw new Error('Error al crear diagrama');
      return response.json();
    },
    onSuccess: (newDiagram) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', level: 0 });
      setSelectedDiagram(newDiagram);
      setShowEditorModal(true);
      toast.success('Diagrama creado correctamente');
    },
    onError: () => {
      toast.error('Error al crear el diagrama');
    },
  });

  // Update diagram
  const updateMutation = useMutation({
    mutationFn: async ({ diagramId, data }: { diagramId: string; data: Partial<Diagram> }) => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/diagrams/${diagramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Error al actualizar diagrama');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
    },
  });

  // Delete diagram
  const deleteMutation = useMutation({
    mutationFn: async (diagramId: string) => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/diagrams/${diagramId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar diagrama');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      toast.success('Diagrama eliminado correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar el diagrama');
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSaveDiagram = async (data: Partial<Diagram>) => {
    if (!selectedDiagram) return;
    await updateMutation.mutateAsync({ diagramId: selectedDiagram.id, data });
  };

  const openEditor = async (diagram: Diagram) => {
    // Fetch full diagram with nodes/connections
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/diagrams/${diagram.id}`);
      if (response.ok) {
        const fullDiagram = await response.json();
        setSelectedDiagram(fullDiagram);
      } else {
        setSelectedDiagram(diagram);
      }
      setShowEditorModal(true);
    } catch {
      setSelectedDiagram(diagram);
      setShowEditorModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Diagramas de Flujo</h3>
          <p className="text-sm text-muted-foreground">
            Visualiza y gestiona los flujos de agua del proyecto
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Diagrama
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando diagramas...</div>
      ) : diagrams && diagrams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {diagrams.map((diagram) => (
            <Card key={diagram.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{diagram.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditor(diagram)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(diagram.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{LEVEL_LABELS[diagram.level]}</CardDescription>
              </CardHeader>
              <CardContent>
                {diagram.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {diagram.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{diagram.nodes?.length || 0} nodos</span>
                  <span>{diagram.connections?.length || 0} conexiones</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 gap-2"
                  onClick={() => openEditor(diagram)}
                >
                  <Eye className="w-4 h-4" />
                  Abrir Editor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-1">Sin diagramas</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer diagrama de flujo de agua
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Crear Diagrama
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Diagrama</DialogTitle>
            <DialogDescription>
              Crea un nuevo diagrama de flujo de agua para el proyecto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Diagrama de Balance de Agua"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del diagrama..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select
                value={formData.level.toString()}
                onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) as DiagramLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{LEVEL_LABELS[0]}</SelectItem>
                  <SelectItem value="1">{LEVEL_LABELS[1]}</SelectItem>
                  <SelectItem value="2">{LEVEL_LABELS[2]}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Diagrama'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <Dialog open={showEditorModal} onOpenChange={setShowEditorModal}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full">
          <DialogHeader>
            <DialogTitle>{selectedDiagram?.name || 'Editor de Diagrama'}</DialogTitle>
            <DialogDescription>
              Arrastra nodos para moverlos. Conecta nodos desde los puntos de conexión.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {selectedDiagram && (
              <DiagramCanvas
                projectId={projectId}
                diagram={selectedDiagram}
                onSave={handleSaveDiagram}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
