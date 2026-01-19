import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Scenario } from './ScenarioCard';

interface ScenarioFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario | null;
  onSave: (data: Partial<Scenario>) => void;
  isPending: boolean;
}

type ScenarioType = 'baseline' | 'conservative' | 'moderate' | 'transformational' | 'alternative';

interface FormState {
  name: string;
  description: string;
  scenario_type: ScenarioType;
  is_baseline: boolean;
  is_recommended: boolean;
  included_improvements: string;
  water_savings_m3: string;
  cost_savings_eur: string;
  capex_total: string;
  payback_years: string;
  roi_percent: string;
}

const defaultForm: FormState = {
  name: '',
  description: '',
  scenario_type: 'moderate',
  is_baseline: false,
  is_recommended: false,
  included_improvements: '',
  water_savings_m3: '',
  cost_savings_eur: '',
  capex_total: '',
  payback_years: '',
  roi_percent: '',
};

export const ScenarioFormModal: React.FC<ScenarioFormModalProps> = ({
  open,
  onOpenChange,
  scenario,
  onSave,
  isPending,
}) => {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (scenario) {
      setForm({
        name: scenario.name,
        description: scenario.description || '',
        scenario_type: scenario.scenario_type,
        is_baseline: scenario.is_baseline,
        is_recommended: scenario.is_recommended,
        included_improvements: scenario.included_improvements?.join(', ') || '',
        water_savings_m3: scenario.water_savings_m3?.toString() || '',
        cost_savings_eur: scenario.cost_savings_eur?.toString() || '',
        capex_total: scenario.capex_total?.toString() || '',
        payback_years: scenario.payback_years?.toString() || '',
        roi_percent: scenario.roi_percent?.toString() || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [scenario, open]);

  const handleSubmit = () => {
    const improvements = form.included_improvements
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    onSave({
      name: form.name,
      description: form.description || null,
      scenario_type: form.scenario_type,
      is_baseline: form.is_baseline,
      is_recommended: form.is_recommended,
      included_improvements: improvements.length > 0 ? improvements : null,
      water_savings_m3: form.water_savings_m3 ? parseFloat(form.water_savings_m3) : null,
      cost_savings_eur: form.cost_savings_eur ? parseFloat(form.cost_savings_eur) : null,
      capex_total: form.capex_total ? parseFloat(form.capex_total) : null,
      payback_years: form.payback_years ? parseFloat(form.payback_years) : null,
      roi_percent: form.roi_percent ? parseFloat(form.roi_percent) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {scenario ? 'Editar Escenario' : 'Crear Escenario'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Escenario optimista"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Descripción del escenario..."
            />
          </div>

          <div>
            <Label htmlFor="scenario_type">Tipo de escenario</Label>
            <Select
              value={form.scenario_type}
              onValueChange={(value: any) => setForm(prev => ({ ...prev, scenario_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">🔵 Baseline</SelectItem>
                <SelectItem value="conservative">🟢 Conservador</SelectItem>
                <SelectItem value="moderate">🟡 Moderado</SelectItem>
                <SelectItem value="transformational">🟣 Transformacional</SelectItem>
                <SelectItem value="alternative">⚪ Alternativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_baseline"
                checked={form.is_baseline}
                onCheckedChange={(checked) => 
                  setForm(prev => ({ ...prev, is_baseline: !!checked }))
                }
              />
              <Label htmlFor="is_baseline" className="text-sm cursor-pointer">
                Es línea base
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_recommended"
                checked={form.is_recommended}
                onCheckedChange={(checked) => 
                  setForm(prev => ({ ...prev, is_recommended: !!checked }))
                }
              />
              <Label htmlFor="is_recommended" className="text-sm cursor-pointer">
                Recomendado
              </Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Métricas
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label htmlFor="water_savings_m3" className="text-sm">Ahorro agua (m³)</Label>
                <Input
                  id="water_savings_m3"
                  type="number"
                  value={form.water_savings_m3}
                  onChange={(e) => setForm(prev => ({ ...prev, water_savings_m3: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="cost_savings_eur" className="text-sm">Ahorro costes (€)</Label>
                <Input
                  id="cost_savings_eur"
                  type="number"
                  value={form.cost_savings_eur}
                  onChange={(e) => setForm(prev => ({ ...prev, cost_savings_eur: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="capex_total" className="text-sm">CAPEX total (€)</Label>
                <Input
                  id="capex_total"
                  type="number"
                  value={form.capex_total}
                  onChange={(e) => setForm(prev => ({ ...prev, capex_total: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="payback_years" className="text-sm">Payback (años)</Label>
                <Input
                  id="payback_years"
                  type="number"
                  step="0.1"
                  value={form.payback_years}
                  onChange={(e) => setForm(prev => ({ ...prev, payback_years: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="roi_percent" className="text-sm">ROI (%)</Label>
                <Input
                  id="roi_percent"
                  type="number"
                  step="0.1"
                  value={form.roi_percent}
                  onChange={(e) => setForm(prev => ({ ...prev, roi_percent: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="included_improvements">
              IDs de mejoras incluidas (separados por coma)
            </Label>
            <Textarea
              id="included_improvements"
              value={form.included_improvements}
              onChange={(e) => setForm(prev => ({ ...prev, included_improvements: e.target.value }))}
              rows={2}
              placeholder="uuid1, uuid2, uuid3..."
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name || isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {scenario ? 'Guardar cambios' : 'Crear escenario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
