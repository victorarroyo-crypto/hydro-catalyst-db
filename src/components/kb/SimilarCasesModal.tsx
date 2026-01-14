import React, { useState } from 'react';
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
import { GitMerge, FilePlus, MapPin, Factory, Percent, Loader2 } from 'lucide-react';
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
}

export const SimilarCasesModal: React.FC<SimilarCasesModalProps> = ({
  open,
  onOpenChange,
  jobId,
  similarCases,
  currentProblem,
  onDecisionMade,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = async () => {
    setIsSubmitting(true);
    try {
      // Call the continue endpoint with no merge target
      const response = await supabase.functions.invoke('case-study-webhook', {
        body: {
          event: 'user_decision',
          job_id: jobId,
          data: {
            decision: 'create_new',
          },
        },
      });

      if (response.error) throw response.error;
      
      toast.success('Se creará un nuevo caso de estudio');
      onDecisionMade();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending decision:', error);
      toast.error('Error al enviar la decisión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedCaseId) {
      toast.error('Selecciona un caso para fusionar');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the continue endpoint with merge target
      const response = await supabase.functions.invoke('case-study-webhook', {
        body: {
          event: 'user_decision',
          job_id: jobId,
          data: {
            decision: 'merge',
            merge_target_id: selectedCaseId,
          },
        },
      });

      if (response.error) throw response.error;
      
      toast.success('Se fusionará con el caso seleccionado');
      onDecisionMade();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending merge decision:', error);
      toast.error('Error al enviar la decisión de fusión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (similarity >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Casos similares encontrados
          </DialogTitle>
          <DialogDescription>
            Hemos detectado casos de estudio similares en la base de datos. 
            ¿Deseas fusionar con uno existente o crear uno nuevo?
          </DialogDescription>
        </DialogHeader>

        {currentProblem && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Problema actual:</p>
            <p className="text-sm font-medium">{currentProblem}</p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medium">Casos similares ({similarCases.length}):</p>
          
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
                      <Label htmlFor={caseId} className="font-medium cursor-pointer">
                        {caseName}
                      </Label>
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
            onClick={handleCreateNew}
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus className="h-4 w-4" />
            )}
            Crear nuevo caso
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
            Fusionar con seleccionado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
