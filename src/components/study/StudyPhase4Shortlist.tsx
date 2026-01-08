import { useState } from 'react';
import {
  useStudyLonglist,
  useStudyShortlist,
  useAddToShortlist,
  useRemoveFromShortlist,
  ScoutingStudy,
} from '@/hooks/useScoutingStudies';
import { useAIStudySession } from '@/hooks/useAIStudySession';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Star,
  ArrowRight,
  Trash2,
  Loader2,
  MapPin,
  Building2,
  GripVertical,
} from 'lucide-react';
import AISessionPanel from './AISessionPanel';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

export default function StudyPhase4Shortlist({ studyId, study }: Props) {
  const { data: longlist, isLoading: loadingLonglist } = useStudyLonglist(studyId);
  const { data: shortlist, isLoading: loadingShortlist } = useStudyShortlist(studyId);
  const addToShortlist = useAddToShortlist();
  const removeFromShortlist = useRemoveFromShortlist();
  const aiSession = useAIStudySession(studyId, 'shortlist');
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const shortlistIds = new Set(shortlist?.map(s => s.longlist_id));
  const availableLonglist = longlist?.filter(item => !shortlistIds.has(item.id)) ?? [];

  const handleStartAIShortlist = () => {
    aiSession.startSession('shortlist', {
      problem_statement: study.problem_statement,
      objectives: study.objectives,
      context: study.context,
      constraints: study.constraints,
      longlist_ids: longlist?.map(l => l.id) || [],
    });
  };

  const handleAddToShortlist = async () => {
    if (!selectedItem) return;
    await addToShortlist.mutateAsync({
      study_id: studyId,
      longlist_id: selectedItem,
      selection_reason: selectionReason,
      notes,
      priority: (shortlist?.length ?? 0) + 1,
    });
    setSelectedItem(null);
    setSelectionReason('');
    setNotes('');
  };

  const handleRemove = async (id: string) => {
    await removeFromShortlist.mutateAsync({ id, studyId });
  };

  const isLoading = loadingLonglist || loadingShortlist;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        onStart={handleStartAIShortlist}
        onCancel={aiSession.cancelSession}
        isStarting={aiSession.isStarting}
        title="Enriquecer Lista"
        description="Busca más tecnologías en la web para ampliar las opciones disponibles"
      />

      <div>
        <h2 className="text-lg font-semibold">Fase 4: Lista Corta</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona las mejores tecnologías de la lista larga para evaluación detallada
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available from Longlist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Lista Larga ({availableLonglist.length})
            </h3>
          </div>
          
          {availableLonglist.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <p className="text-muted-foreground text-sm">
                {longlist?.length === 0 
                  ? 'Primero añade tecnologías a la lista larga'
                  : 'Todas las tecnologías están en la lista corta'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {availableLonglist.map((item) => (
                <Card 
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedItem(item.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.technology_name}</p>
                        {item.provider && (
                          <p className="text-xs text-muted-foreground">{item.provider}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.trl && (
                          <Badge variant="outline" className="text-xs">TRL {item.trl}</Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Shortlist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Lista Corta ({shortlist?.length ?? 0})
            </h3>
          </div>
          
          {shortlist?.length === 0 ? (
            <Card className="p-6 text-center border-dashed border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <Star className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <p className="text-muted-foreground text-sm">
                Selecciona tecnologías de la lista larga
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {shortlist?.map((item, idx) => (
                <Card key={item.id} className="border-amber-200 group">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-sm font-medium w-5">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.longlist?.technology_name ?? 'Tecnología'}
                        </p>
                        {item.longlist?.provider && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {item.longlist.provider}
                          </div>
                        )}
                        {item.selection_reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{item.selection_reason}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.longlist?.trl && (
                          <Badge variant="secondary" className="text-xs">TRL {item.longlist.trl}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemove(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add to Shortlist Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir a Lista Corta</DialogTitle>
            <DialogDescription>
              {longlist?.find(i => i.id === selectedItem)?.technology_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Razón de Selección</Label>
              <Textarea
                value={selectionReason}
                onChange={(e) => setSelectionReason(e.target.value)}
                placeholder="¿Por qué esta tecnología pasa a la lista corta?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas o consideraciones adicionales"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddToShortlist}
              disabled={addToShortlist.isPending}
            >
              {addToShortlist.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Star className="w-4 h-4 mr-2" />
              Añadir a Lista Corta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
