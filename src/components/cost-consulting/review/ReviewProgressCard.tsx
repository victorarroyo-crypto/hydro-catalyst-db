import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileSearch, Loader2 } from 'lucide-react';

interface ReviewProgressCardProps {
  summary: {
    contracts: { total: number; validated: number; needs_review: number };
    invoices: { total: number; validated: number; needs_review: number };
    total: { total: number; validated: number; needs_review: number };
  } | null;
  loading?: boolean;
  onValidateAll?: () => void;
  isValidatingAll?: boolean;
}

export function ReviewProgressCard({
  summary,
  loading,
  onValidateAll,
  isValidatingAll,
}: ReviewProgressCardProps) {
  if (loading || !summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { total } = summary;
  const progressPercent = total.total > 0 
    ? Math.round((total.validated / total.total) * 100) 
    : 0;
  const allValidated = total.validated === total.total && total.total > 0;

  return (
    <Card className={allValidated ? 'border-green-200 bg-green-50/30 dark:bg-green-950/20' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {allValidated ? (
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <FileSearch className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">
                {allValidated ? 'Revisión completada' : 'Progreso de revisión'}
              </CardTitle>
              <CardDescription>
                {allValidated
                  ? 'Todos los documentos han sido validados'
                  : `${total.validated} de ${total.total} documentos validados`}
              </CardDescription>
            </div>
          </div>

          {!allValidated && onValidateAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onValidateAll}
              disabled={isValidatingAll}
            >
              {isValidatingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar todos'
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats by type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Contratos</span>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {summary.contracts.validated}/{summary.contracts.total}
              </Badge>
            </div>
            {summary.contracts.needs_review > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="h-3 w-3" />
                {summary.contracts.needs_review} pendientes
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Facturas</span>
              <Badge variant="outline" className="text-green-600 border-green-300">
                {summary.invoices.validated}/{summary.invoices.total}
              </Badge>
            </div>
            {summary.invoices.needs_review > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="h-3 w-3" />
                {summary.invoices.needs_review} pendientes
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
