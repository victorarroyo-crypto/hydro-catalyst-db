/**
 * ReviewSummaryCard - Shows document validation progress in Cost Consulting
 * Displays validation stats and actions for document review before analysis
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertTriangle,
  CheckCheck,
  Loader2,
  FileText,
  Receipt
} from 'lucide-react';
import { useDocumentReview, ReviewSummary } from '@/hooks/useDocumentReview';

interface ReviewSummaryCardProps {
  projectId: string;
  userId?: string;
  onAllValidated?: () => void;
}

export const ReviewSummaryCard: React.FC<ReviewSummaryCardProps> = ({
  projectId,
  userId,
  onAllValidated,
}) => {
  const {
    summary,
    loading,
    validationProgress,
    allValidated,
    hasCriticalWarnings,
    validateAll,
    pendingDocs,
  } = useDocumentReview(projectId, userId);

  const [isValidatingAll, setIsValidatingAll] = React.useState(false);

  const handleValidateAll = async () => {
    setIsValidatingAll(true);
    const success = await validateAll();
    setIsValidatingAll(false);
    if (success && onAllValidated) {
      onAllValidated();
    }
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const needsReviewCount = summary.total.needs_review;
  const hasDocumentsToReview = pendingDocs.length > 0;

  return (
    <Card className={`border-2 ${
      allValidated 
        ? 'border-green-200 bg-green-50/30 dark:bg-green-950/20' 
        : needsReviewCount > 0
          ? 'border-orange-200 bg-orange-50/30 dark:bg-orange-950/20'
          : 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/20'
    }`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3">
          {allValidated ? (
            <>
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-lg">Todos los documentos validados</span>
            </>
          ) : needsReviewCount > 0 ? (
            <>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-lg">Documentos pendientes de revisión</span>
            </>
          ) : (
            <>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-lg">Validación de documentos</span>
            </>
          )}
        </CardTitle>
        <CardDescription>
          {allValidated 
            ? 'Puedes proceder con el análisis'
            : needsReviewCount > 0
              ? `${needsReviewCount} documento${needsReviewCount > 1 ? 's' : ''} requiere${needsReviewCount > 1 ? 'n' : ''} atención`
              : 'Revisa los documentos antes de ejecutar el análisis'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        {validationProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de validación</span>
              <span className="font-medium">
                {validationProgress.validated}/{validationProgress.total} ({validationProgress.percent}%)
              </span>
            </div>
            <Progress value={validationProgress.percent} className="h-2" />
          </div>
        )}

        {/* Summary by type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <div className="font-medium">Contratos</div>
              <div className="text-muted-foreground">
                {summary.contracts.validated}/{summary.contracts.total} validados
                {summary.contracts.needs_review > 0 && (
                  <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 text-xs">
                    {summary.contracts.needs_review} pendientes
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <Receipt className="h-4 w-4 text-green-600" />
            <div className="text-sm">
              <div className="font-medium">Facturas</div>
              <div className="text-muted-foreground">
                {summary.invoices.validated}/{summary.invoices.total} validados
                {summary.invoices.needs_review > 0 && (
                  <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 text-xs">
                    {summary.invoices.needs_review} pendientes
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warning for critical items */}
        {hasCriticalWarnings && !allValidated && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-100/50 dark:bg-orange-900/20 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="text-orange-700 dark:text-orange-400">
              Algunos documentos tienen clasificación dudosa y requieren revisión manual
            </span>
          </div>
        )}

        {/* Status indicator and action button */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Status badge */}
          {hasDocumentsToReview ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300">
                {pendingDocs.length} pendiente{pendingDocs.length !== 1 ? 's' : ''} de validar
              </Badge>
              <span className="text-xs">Revisa en la lista de documentos</span>
            </div>
          ) : allValidated ? (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Todo validado
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Sin documentos pendientes</span>
          )}
          
          {/* Validate all button - only when applicable */}
          {!allValidated && !hasCriticalWarnings && pendingDocs.length > 0 && (
            <Button 
              size="sm"
              onClick={handleValidateAll} 
              disabled={isValidatingAll}
            >
              {isValidatingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Validar todos
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
