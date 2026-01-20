import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectBriefing } from '@/types/briefing';
import { 
  Building2, Target, AlertTriangle, DollarSign, 
  Droplets, Trash2, Play, Loader2, CheckCircle 
} from 'lucide-react';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  diagnosis: 'Diagnóstico',
  optimization: 'Optimización',
  new_plant: 'Nueva Planta',
  audit: 'Auditoría',
  feasibility: 'Estudio de Viabilidad',
  expansion: 'Ampliación',
  compliance: 'Cumplimiento Normativo',
  zld_mld: 'ZLD/MLD',
  other: 'Otro',
};

const CAPEX_LABELS: Record<string, string> = {
  zero_or_minimum: 'CAPEX Cero/Mínimo',
  limited: 'Inversión Limitada',
  flexible: 'Flexible según ROI',
  investment_ready: 'Preparado para Invertir',
};

interface Props {
  briefing: ProjectBriefing;
  onRunResearch: () => void;
  runningResearch: boolean;
}

export function BriefingSummary({ briefing, onRunResearch, runningResearch }: Props) {
  const enabledScopes = Object.entries(briefing.scope_areas)
    .filter(([_, area]) => area.enabled)
    .map(([key]) => key);

  const waterCost = (briefing.known_water_data.water_intake_m3_year ?? 0) * 
                    (briefing.known_water_data.water_cost_eur_m3 ?? 0);

  const isComplete = 
    briefing.company_info.company_name &&
    briefing.problem_statement.length >= 50 &&
    enabledScopes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Resumen del Briefing</h2>
        <p className="text-sm text-muted-foreground">
          Revisa la información antes de iniciar la investigación preliminar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo y Empresa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Proyecto y Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge variant="outline">
                {PROJECT_TYPE_LABELS[briefing.project_type] || briefing.project_type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empresa:</span>
              <span className="font-medium">{briefing.company_info.company_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sector:</span>
              <span>{briefing.company_info.industrial_sector || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ubicación:</span>
              <span>{briefing.company_info.plant_location || '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Alcance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Alcance ({enabledScopes.length} áreas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {enabledScopes.map(scope => (
                <Badge key={scope} variant="secondary" className="text-xs">
                  {scope.replace(/_/g, ' ')}
                </Badge>
              ))}
              {enabledScopes.length === 0 && (
                <span className="text-sm text-muted-foreground">Sin áreas seleccionadas</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Problema */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Planteamiento del Problema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefing.problem_statement || 
                <span className="text-muted-foreground italic">No definido</span>}
            </p>
            {briefing.expected_outcomes && (
              <div className="mt-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Resultados esperados: </span>
                <span className="text-sm">{briefing.expected_outcomes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restricciones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Restricciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CAPEX:</span>
              <Badge variant="outline">
                {CAPEX_LABELS[briefing.constraints.capex_preference]}
              </Badge>
            </div>
            {briefing.constraints.capex_max_eur && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Máximo:</span>
                <span>{briefing.constraints.capex_max_eur.toLocaleString()} €</span>
              </div>
            )}
            {briefing.constraints.timeline_months && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plazo:</span>
                <span>{briefing.constraints.timeline_months} meses</span>
              </div>
            )}
            {(briefing.constraints.operational_constraints?.length ?? 0) > 0 && (
              <div>
                <span className="text-muted-foreground">Operativas: </span>
                <span>{briefing.constraints.operational_constraints?.length}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos conocidos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Datos Conocidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {briefing.known_water_data.water_intake_m3_year && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumo agua:</span>
                <span>{briefing.known_water_data.water_intake_m3_year.toLocaleString()} m³/año</span>
              </div>
            )}
            {waterCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo agua:</span>
                <span className="text-blue-600">{waterCost.toLocaleString()} €/año</span>
              </div>
            )}
            {briefing.known_waste_data.sludge_tons_year && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lodos:</span>
                <span>{briefing.known_waste_data.sludge_tons_year} t/año</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action */}
      <Card className={isComplete ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              )}
              <div>
                <h3 className="font-medium">
                  {isComplete ? 'Briefing Completo' : 'Briefing Incompleto'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isComplete 
                    ? 'Puedes iniciar la investigación preliminar'
                    : 'Completa el nombre de empresa, problema y al menos un área de alcance'}
                </p>
              </div>
            </div>
            <Button 
              onClick={onRunResearch} 
              disabled={!isComplete || runningResearch}
              size="lg"
            >
              {runningResearch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Investigación
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
