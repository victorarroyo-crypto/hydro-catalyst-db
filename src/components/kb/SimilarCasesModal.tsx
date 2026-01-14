import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { GitMerge, FilePlus, MapPin, Factory, Percent, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SimilarCase {
  id?: string;
  case_id?: string;
  name?: string;
  case_name?: string;
  similarity?: number;
  similarity_percent?: number;
  sector?: string;
  country?: string;
}

interface SimilarCasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  similarCases: SimilarCase[];
  currentProblem?: string;
  onDecisionMade: () => void;
  sourceCaseId?: string; // The newly created case ID (to be deleted on merge)
}

export const SimilarCasesModal: React.FC<SimilarCasesModalProps> = ({
  open,
  onOpenChange,
  jobId,
  similarCases,
  currentProblem,
  onDecisionMade,
  sourceCaseId,
}) => {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // "Mantener ambos" - just close the modal, case already exists
  const handleKeepBoth = () => {
    toast.success('El caso se mantiene como nuevo en la base de datos');
    onDecisionMade();
    onOpenChange(false);
  };

  // Merge: move technologies to target, delete source case
  const handleMerge = async () => {
    if (!selectedCaseId) {
      toast.error('Selecciona un caso para fusionar');
      return;
    }

    if (!sourceCaseId) {
      toast.error('No se encontró el ID del caso fuente');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('merge-case-studies', {
        body: {
          source_case_id: sourceCaseId,
          target_case_id: selectedCaseId,
          job_id: jobId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error en la fusión');
      }

      const data = response.data;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido en la fusión');
      }

      toast.success(
        `Caso fusionado exitosamente con "${data.data?.target_case_name}". ` +
        `${data.data?.technologies_moved || 0} tecnologías movidas. Duplicado eliminado.`
      );
      
      onDecisionMade();
      onOpenChange(false);
      
      // Navigate to the target case
      navigate(`/knowledge-base?section=cases&view=${selectedCaseId}`);
      
    } catch (error) {
      console.error('Error merging cases:', error);
      toast.error(error instanceof Error ? error.message : 'Error al fusionar los casos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (similarity >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const selectedCase = similarCases.find(c => (c.case_id || c.id) === selectedCaseId);
  const selectedCaseName = selectedCase?.case_name || selectedCase?.name || 'el caso seleccionado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Casos similares encontrados
          </DialogTitle>
          <DialogDescription>
            El caso ha sido creado. Se detectaron casos similares en la base de datos.
            Puedes fusionarlo con uno existente (el nuevo se eliminará) o mantener ambos.
          </DialogDescription>
        </DialogHeader>

        {currentProblem && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Problema del caso nuevo:</p>
            <p className="text-sm font-medium">{currentProblem}</p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medium">Selecciona un caso para fusionar ({similarCases.length}):</p>
          
          <RadioGroup 
            value={selectedCaseId || ''} 
            onValueChange={setSelectedCaseId}
            className="space-y-3"
          >
            {similarCases.map((caseItem) => {
              const caseId = caseItem.case_id || caseItem.id || '';
              const caseName = caseItem.case_name || caseItem.name || 'Sin nombre';
              const similarity = caseItem.similarity_percent || caseItem.similarity || 0;
              
              return (
                <Card 
                  key={caseId}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedCaseId === caseId 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedCaseId(caseId)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={caseId} id={caseId} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={caseId} className="font-medium cursor-pointer">
                          {caseName}
                        </Label>
                        <a
                          href={`/knowledge-base?section=cases&view=${caseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getSimilarityColor(similarity)}>
                          <Percent className="h-3 w-3 mr-1" />
                          {similarity.toFixed(1)}% similar
                        </Badge>
                        {caseItem.sector && (
                          <Badge variant="outline" className="gap-1">
                            <Factory className="h-3 w-3" />
                            {caseItem.sector}
                          </Badge>
                        )}
                        {caseItem.country && (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {caseItem.country}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleKeepBoth}
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-2"
          >
            <FilePlus className="h-4 w-4" />
            Mantener ambos
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isSubmitting || !selectedCaseId}
            className="w-full sm:w-auto gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            Fusionar con {selectedCaseId ? `"${selectedCaseName}"` : 'seleccionado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};