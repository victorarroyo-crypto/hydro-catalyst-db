import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';
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

interface ReanalyzeButtonProps {
  projectId: string;
  projectName: string;
  onReanalyzeComplete: () => void;
}

export const ReanalyzeButton: React.FC<ReanalyzeButtonProps> = ({
  projectId,
  projectName,
  onReanalyzeComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReanalyze = async () => {
    setIsLoading(true);
    try {
      // Step 1: Reset project for re-analysis
      const resetResponse = await fetch(
        `${API_URL}/api/cost-consulting/projects/${projectId}/reanalyze`,
        { method: 'POST' }
      );

      if (!resetResponse.ok) {
        const error = await resetResponse.json().catch(() => ({}));
        throw new Error(error.detail || 'Error reseteando proyecto');
      }

      // Step 2: Execute new analysis
      const analysisResponse = await fetch(
        `${API_URL}/api/cost-consulting/projects/${projectId}/run-analysis`,
        { method: 'POST' }
      );

      if (!analysisResponse.ok) {
        const error = await analysisResponse.json().catch(() => ({}));
        throw new Error(error.detail || 'Error iniciando análisis');
      }

      toast.success('Análisis iniciado', {
        description: 'El proyecto está siendo re-analizado. Esto puede tardar unos minutos.',
      });

      onReanalyzeComplete();

    } catch (error) {
      console.error('Error re-analyzing:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'No se pudo iniciar el re-análisis',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-analizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-analizar
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Re-ejecutar análisis?</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Re-ejecutar análisis de "{projectName}"?
            <br /><br />
            Esto eliminará las oportunidades actuales y volverá a analizar los datos.
            El proceso puede tardar unos minutos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReanalyze}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReanalyzeButton;
