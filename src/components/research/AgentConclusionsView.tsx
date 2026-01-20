import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter
} from 'lucide-react';
import { AgentConclusion } from '@/types/briefing';

interface AgentConclusionsViewProps {
  conclusions: AgentConclusion[];
  isLoading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

const priorityLabels: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};

const conclusionTypeLabels: Record<string, string> = {
  finding: 'Hallazgo',
  recommendation: 'Recomendación',
  risk: 'Riesgo',
  opportunity: 'Oportunidad',
};

const conclusionTypeIcons: Record<string, React.ElementType> = {
  finding: Info,
  recommendation: CheckCircle2,
  risk: AlertTriangle,
  opportunity: Brain,
};

export function AgentConclusionsView({ 
  conclusions, 
  isLoading,
  onApprove,
  onReject 
}: AgentConclusionsViewProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredConclusions = React.useMemo(() => {
    return conclusions.filter(c => {
      if (typeFilter !== 'all' && c.conclusion_type !== typeFilter) return false;
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
      return true;
    });
  }, [conclusions, typeFilter, priorityFilter]);

  const renderConclusionCard = (conclusion: AgentConclusion) => {
    const Icon = conclusionTypeIcons[conclusion.conclusion_type || 'finding'] || Info;
    const isApproved = conclusion.human_review?.approved === true;
    const isRejected = conclusion.human_review?.approved === false;

    return (
      <Card 
        key={conclusion.id} 
        className={`transition-all ${
          isApproved ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 
          isRejected ? 'border-destructive/50 bg-destructive/5' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              conclusion.conclusion_type === 'risk' 
                ? 'bg-destructive/10' 
                : conclusion.conclusion_type === 'opportunity'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-primary/10'
            }`}>
              <Icon className={`h-4 w-4 ${
                conclusion.conclusion_type === 'risk' 
                  ? 'text-destructive' 
                  : conclusion.conclusion_type === 'opportunity'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-primary'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {conclusionTypeLabels[conclusion.conclusion_type || 'finding']}
                </Badge>
                <Badge className={`text-xs ${priorityColors[conclusion.priority || 'medium']}`}>
                  {priorityLabels[conclusion.priority || 'medium']}
                </Badge>
                {conclusion.agent_name && (
                  <span className="text-xs text-muted-foreground">
                    por {conclusion.agent_name}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-foreground mb-3">{conclusion.content}</p>
              
              {conclusion.evidence && conclusion.evidence.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Evidencia:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                    {conclusion.evidence.slice(0, 3).map((ev, idx) => (
                      <li key={idx} className="truncate">{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Human Review Actions */}
              {!isApproved && !isRejected && (onApprove || onReject) && (
                <div className="flex items-center gap-2 pt-2 border-t">
                {onApprove && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => onApprove(conclusion.id)}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Aprobar
                    </Button>
                  )}
                  {onReject && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onReject(conclusion.id, '')}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Rechazar
                    </Button>
                  )}
                </div>
              )}

              {/* Review Status */}
              {(isApproved || isRejected) && (
                <div className="flex items-center gap-2 pt-2 border-t text-xs">
                  {isApproved ? (
                    <span className="text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Rechazado: {conclusion.human_review?.rejection_reason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-12 w-12 bg-muted rounded-full" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conclusions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay conclusiones</p>
            <p className="text-sm mt-1">Los agentes AI generarán conclusiones después de la investigación</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Conclusiones de Agentes
            </CardTitle>
            <CardDescription>
              {filteredConclusions.length} de {conclusions.length} conclusiones
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="finding">Hallazgos</SelectItem>
                <SelectItem value="recommendation">Recomendaciones</SelectItem>
                <SelectItem value="risk">Riesgos</SelectItem>
                <SelectItem value="opportunity">Oportunidades</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {filteredConclusions.map(renderConclusionCard)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
