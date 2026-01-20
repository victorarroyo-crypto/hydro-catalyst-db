import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ProjectBriefing } from '@/types/briefing';
import { AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function ProblemStatementSection({ briefing, onChange }: Props) {
  const charCount = briefing.problem_statement?.length || 0;
  const minChars = 100;
  const isValid = charCount >= minChars;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Planteamiento del Problema</h2>
        <p className="text-sm text-muted-foreground">
          Esta es la información más importante. Describe claramente el problema o necesidad principal.
          Los agentes de IA usarán esta descripción como guía para su investigación.
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Este es el "prompt" para los agentes.</strong> Cuanto más detallado y claro,
          mejores resultados obtendrás en la investigación y diagnóstico.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="problem_statement" className="text-base font-medium">
          ¿Cuál es el problema o necesidad principal? *
        </Label>
        <Textarea
          id="problem_statement"
          placeholder="Ejemplo: La planta está teniendo problemas para cumplir con los límites de DQO en el vertido. El efluente actual tiene 450 mg/L de DQO cuando el límite permitido es 125 mg/L. Esto está generando sanciones recurrentes de la confederación hidrográfica..."
          value={briefing.problem_statement}
          onChange={(e) => onChange({ ...briefing, problem_statement: e.target.value })}
          rows={8}
          className={!isValid && charCount > 0 ? 'border-amber-500' : ''}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className={charCount < minChars ? 'text-amber-600' : 'text-green-600'}>
            {charCount} caracteres {charCount < minChars && `(mínimo recomendado: ${minChars})`}
          </span>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
        <div className="flex gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Incluye en tu descripción:</span>
        </div>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-6 list-disc">
          <li>Síntomas del problema (valores actuales vs límites)</li>
          <li>Desde cuándo ocurre el problema</li>
          <li>Impacto económico o regulatorio</li>
          <li>Intentos previos de solución</li>
          <li>Cualquier contexto relevante</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expected_outcomes">
          ¿Qué resultados esperas obtener? (opcional)
        </Label>
        <Textarea
          id="expected_outcomes"
          placeholder="Ejemplo: Cumplir con los límites de vertido, reducir el consumo de agua un 15%, identificar fuentes de ineficiencia..."
          value={briefing.expected_outcomes || ''}
          onChange={(e) => onChange({ ...briefing, expected_outcomes: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  );
}
