import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  FileText, 
  Lightbulb, 
  Target,
  Check,
  X,
  Eye,
  Loader2,
  Edit,
  Save,
  ChevronRight,
  Rocket,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TRLBadge } from '@/components/TRLBadge';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
  created_at?: string;
  description?: string;
  web?: string;
  suggestedType?: string;
  suggestedSubcategory?: string;
  competitiveAdvantage?: string;
  relevanceReason?: string;
}

interface ScoutingTechDetailModalProps {
  technology: QueueItem | null;
  onClose: () => void;
  onStatusChange?: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500/20 text-green-600 border-green-500/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
  if (score >= 40) return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
  return 'bg-red-500/20 text-red-600 border-red-500/30';
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'review': return 'En revisión';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
    case 'review': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'approved': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const phaseOrder = ['pending', 'review', 'approved'];

const getNextPhase = (current: string): string | null => {
  const idx = phaseOrder.indexOf(current);
  if (idx === -1 || idx === phaseOrder.length - 1) return null;
  return phaseOrder[idx + 1];
};

const getPrevPhase = (current: string): string | null => {
  const idx = phaseOrder.indexOf(current);
  if (idx <= 0) return null;
  return phaseOrder[idx - 1];
};

export const ScoutingTechDetailModal = ({
  technology,
  onClose,
  onStatusChange,
}: ScoutingTechDetailModalProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    label: string;
  } | null>(null);
  
  // Editable fields
  const [editedData, setEditedData] = useState<Partial<QueueItem>>({});

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('scouting-update-queue', {
        body: { id, status },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Error al actualizar');
      return data.result;
    },
    onSuccess: (_, variables) => {
      toast.success(`Tecnología movida a "${getStatusLabel(variables.status)}"`);
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      onStatusChange?.();
      onClose();
    },
    onError: (error) => {
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    },
  });

  if (!technology) return null;

  const handleStatusChange = (newStatus: string) => {
    setConfirmAction({
      status: newStatus,
      label: getStatusLabel(newStatus),
    });
  };

  const confirmStatusChange = () => {
    if (confirmAction && technology) {
      updateMutation.mutate({ id: technology.id, status: confirmAction.status });
    }
    setConfirmAction(null);
  };

  const nextPhase = getNextPhase(technology.status);
  const prevPhase = getPrevPhase(technology.status);

  // Info row component
  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value,
    editable,
    field
  }: { 
    icon: React.ElementType; 
    label: string; 
    value?: string | null;
    editable?: boolean;
    field?: keyof QueueItem;
  }) => {
    const displayValue = field && editedData[field] !== undefined 
      ? editedData[field] as string 
      : value;
      
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        {isEditing && editable && field ? (
          <Input
            value={displayValue || ''}
            onChange={(e) => setEditedData({ ...editedData, [field]: e.target.value })}
            className="mt-1"
          />
        ) : (
          <p className="text-sm pl-6">{displayValue || 'No disponible'}</p>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar estado de tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas mover <strong>"{technology.name}"</strong> a <strong>"{confirmAction?.label}"</strong>?
              {confirmAction?.status === 'approved' && (
                <span className="block mt-2 text-green-600">
                  La tecnología quedará lista para transferirse a la base de datos principal.
                </span>
              )}
              {confirmAction?.status === 'rejected' && (
                <span className="block mt-2 text-red-600">
                  La tecnología será descartada del proceso de scouting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className={
                confirmAction?.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                confirmAction?.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                ''
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Modal */}
      <Dialog open={!!technology} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl">{technology.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {technology.provider}
                </DialogDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={getStatusColor(technology.status)}>
                  {getStatusLabel(technology.status)}
                </Badge>
                <Badge className={getScoreColor(technology.score)}>
                  Score: {technology.score}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow 
                  icon={MapPin} 
                  label="País" 
                  value={technology.country}
                  editable
                  field="country"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>TRL Estimado</span>
                  </div>
                  <div className="pl-6">
                    <TRLBadge trl={technology.trl} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Web & Contact */}
              <div className="space-y-4">
                <InfoRow 
                  icon={Globe} 
                  label="Sitio web" 
                  value={technology.web}
                  editable
                  field="web"
                />
              </div>

              <Separator />

              {/* Classification */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Clasificación sugerida
                </h4>
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    {isEditing ? (
                      <Input
                        value={editedData.suggestedType ?? technology.suggestedType ?? ''}
                        onChange={(e) => setEditedData({ ...editedData, suggestedType: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm">{technology.suggestedType || 'No asignado'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                    {isEditing ? (
                      <Input
                        value={editedData.suggestedSubcategory ?? technology.suggestedSubcategory ?? ''}
                        onChange={(e) => setEditedData({ ...editedData, suggestedSubcategory: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm">{technology.suggestedSubcategory || 'No asignada'}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción
                </h4>
                {isEditing ? (
                  <Textarea
                    value={editedData.description ?? technology.description ?? ''}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    rows={4}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">
                    {technology.description || 'Sin descripción disponible'}
                  </p>
                )}
              </div>

              {/* Competitive Advantage */}
              {(technology.competitiveAdvantage || isEditing) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Ventaja competitiva
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editedData.competitiveAdvantage ?? technology.competitiveAdvantage ?? ''}
                        onChange={(e) => setEditedData({ ...editedData, competitiveAdvantage: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground pl-6">
                        {technology.competitiveAdvantage}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Relevance Reason */}
              {(technology.relevanceReason || isEditing) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Razón de relevancia
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editedData.relevanceReason ?? technology.relevanceReason ?? ''}
                        onChange={(e) => setEditedData({ ...editedData, relevanceReason: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground pl-6">
                        {technology.relevanceReason}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Timestamps */}
              {technology.created_at && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    Añadida: {new Date(technology.created_at).toLocaleString('es-ES')}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer with Actions */}
          <DialogFooter className="border-t pt-4 flex-col gap-4">
            {/* Workflow explanation */}
            <div className="w-full text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Flujo de trabajo:</strong> El analista sugiere cambios de estado → Supervisor/Admin aprueba
            </div>

            <div className="flex flex-col sm:flex-row w-full gap-2 sm:items-center sm:justify-between">
              {/* Edit toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    // TODO: Save edits to backend
                    toast.info('Guardado de ediciones en desarrollo');
                  }
                  setIsEditing(!isEditing);
                }}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar ficha
                  </>
                )}
              </Button>

              {/* Phase navigation */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Pending: Move to review */}
                {technology.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleStatusChange('rejected')}
                      disabled={updateMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleStatusChange('review')}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-1" />
                      )}
                      Pasar a Revisión
                    </Button>
                  </>
                )}

                {/* Review: Approve or reject */}
                {technology.status === 'review' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('pending')}
                      disabled={updateMutation.isPending}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Volver a Pendiente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleStatusChange('rejected')}
                      disabled={updateMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange('approved')}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Aprobar
                    </Button>
                  </>
                )}

                {/* Approved: Transfer to main DB */}
                {technology.status === 'approved' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('review')}
                      disabled={updateMutation.isPending}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Volver a Revisión
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        toast.info('Transferencia a BD principal en desarrollo');
                      }}
                    >
                      <Rocket className="w-4 h-4 mr-1" />
                      Añadir a BD Principal
                    </Button>
                  </>
                )}

                {/* Rejected: Reconsider */}
                {technology.status === 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('pending')}
                    disabled={updateMutation.isPending}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Reconsiderar
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
