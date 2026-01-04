import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteTechnologyButtonProps {
  technologyId: string;
  technologyName: string;
  onDeleted?: () => void;
}

export const DeleteTechnologyButton: React.FC<DeleteTechnologyButtonProps> = ({
  technologyId,
  technologyName,
  onDeleted,
}) => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = profile?.role && ['admin', 'supervisor'].includes(profile.role);
  const canSuggestDeletion = profile?.role === 'analyst';

  if (!canDelete && !canSuggestDeletion) {
    return null;
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('technologies')
        .delete()
        .eq('id', technologyId);

      if (error) throw error;

      toast.success('Tecnología eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      onDeleted?.();
    } catch (error) {
      console.error('Error deleting technology:', error);
      toast.error('Error al eliminar la tecnología');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuggestDeletion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!suggestionReason.trim()) {
      toast.error('Por favor, indica el motivo de la eliminación');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create an edit suggestion for deletion
      const { error } = await supabase
        .from('technology_edits')
        .insert({
          technology_id: technologyId,
          created_by: user?.id,
          proposed_changes: { action: 'delete', reason: suggestionReason },
          comments: `Solicitud de eliminación: ${suggestionReason}`,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Solicitud de eliminación enviada para revisión');
      setSuggestionOpen(false);
      setSuggestionReason('');
    } catch (error) {
      console.error('Error suggesting deletion:', error);
      toast.error('Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin/Supervisor: Direct delete with confirmation
  if (canDelete) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminar tecnología
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>"{technologyName}"</strong>? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Analyst: Suggest deletion
  return (
    <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
          title="Sugerir eliminación"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Sugerir eliminación
          </DialogTitle>
          <DialogDescription>
            Envía una solicitud para eliminar <strong>"{technologyName}"</strong>. 
            Un supervisor revisará tu solicitud.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Indica el motivo por el que esta tecnología debería ser eliminada..."
            value={suggestionReason}
            onChange={(e) => setSuggestionReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSuggestionOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSuggestDeletion}
            disabled={isSubmitting || !suggestionReason.trim()}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar solicitud'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
