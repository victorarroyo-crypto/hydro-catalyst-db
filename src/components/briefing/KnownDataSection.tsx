import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectBriefing } from '@/types/briefing';
import { Droplets, Trash2 } from 'lucide-react';

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function KnownDataSection({ briefing, onChange }: Props) {
  const updateWaterData = (field: string, value: number | boolean | undefined) => {
    onChange({
      ...briefing,
      known_water_data: {
        ...briefing.known_water_data,
        [field]: value,
      },
    });
  };

  const updateWasteData = (field: string, value: number | string | undefined) => {
    onChange({
      ...briefing,
      known_waste_data: {
        ...briefing.known_waste_data,
        [field]: value,
      },
    });
  };

  const waterCost = (briefing.known_water_data.water_intake_m3_year ?? 0) * 
                    (briefing.known_water_data.water_cost_eur_m3 ?? 0);

  const wasteCost = 
    ((briefing.known_waste_data.sludge_tons_year ?? 0) * (briefing.known_waste_data.sludge_cost_eur_ton ?? 0)) +
    ((briefing.known_waste_data.hazardous_waste_tons_year ?? 0) * (briefing.known_waste_data.hazardous_waste_cost_eur_ton ?? 0)) +
    ((briefing.known_waste_data.non_hazardous_tons_year ?? 0) * (briefing.known_waste_data.non_hazardous_cost_eur_ton ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Datos Conocidos</h2>
        <p className="text-sm text-muted-foreground">
          Introduce los datos que conozcas. Los campos vacíos serán investigados por los agentes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AGUA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Costos de Agua
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="water_intake">Consumo anual</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="water_intake"
                    type="number"
                    placeholder="50000"
                    value={briefing.known_water_data.water_intake_m3_year || ''}
                    onChange={(e) => updateWaterData('water_intake_m3_year',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">m³/año</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="water_cost">Costo unitario</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="water_cost"
                    type="number"
                    step="0.01"
                    placeholder="1.50"
                    value={briefing.known_water_data.water_cost_eur_m3 || ''}
                    onChange={(e) => updateWaterData('water_cost_eur_m3',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">€/m³</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wastewater_discharge">Vertido anual</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="wastewater_discharge"
                    type="number"
                    placeholder="40000"
                    value={briefing.known_water_data.wastewater_discharge_m3_year || ''}
                    onChange={(e) => updateWaterData('wastewater_discharge_m3_year',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">m³/año</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wastewater_cost">Canon vertido</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="wastewater_cost"
                    type="number"
                    step="0.01"
                    placeholder="2.00"
                    value={briefing.known_water_data.wastewater_cost_eur_m3 || ''}
                    onChange={(e) => updateWaterData('wastewater_cost_eur_m3',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">€/m³</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="has_water_meter"
                  checked={briefing.known_water_data.has_water_meter || false}
                  onCheckedChange={(checked) => updateWaterData('has_water_meter', checked)}
                />
                <Label htmlFor="has_water_meter" className="text-sm">Contador de agua</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="has_wastewater_meter"
                  checked={briefing.known_water_data.has_wastewater_meter || false}
                  onCheckedChange={(checked) => updateWaterData('has_wastewater_meter', checked)}
                />
                <Label htmlFor="has_wastewater_meter" className="text-sm">Caudalímetro vertido</Label>
              </div>
            </div>

            {waterCost > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-3 text-sm">
                <span className="text-muted-foreground">Costo anual agua: </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {waterCost.toLocaleString()} €/año
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RESIDUOS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-amber-600" />
              Costos de Residuos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sludge_tons">Lodos generados</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="sludge_tons"
                    type="number"
                    placeholder="120"
                    value={briefing.known_waste_data.sludge_tons_year || ''}
                    onChange={(e) => updateWasteData('sludge_tons_year',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">t/año</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sludge_cost">Costo gestión</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="sludge_cost"
                    type="number"
                    placeholder="80"
                    value={briefing.known_waste_data.sludge_cost_eur_ton || ''}
                    onChange={(e) => updateWasteData('sludge_cost_eur_ton',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">€/t</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hazardous_tons">Res. peligrosos</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="hazardous_tons"
                    type="number"
                    placeholder="5"
                    value={briefing.known_waste_data.hazardous_waste_tons_year || ''}
                    onChange={(e) => updateWasteData('hazardous_waste_tons_year',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">t/año</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hazardous_cost">Costo gestión</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="hazardous_cost"
                    type="number"
                    placeholder="500"
                    value={briefing.known_waste_data.hazardous_waste_cost_eur_ton || ''}
                    onChange={(e) => updateWasteData('hazardous_waste_cost_eur_ton',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">€/t</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="non_hazardous_tons">Res. no peligrosos</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="non_hazardous_tons"
                    type="number"
                    placeholder="50"
                    value={briefing.known_waste_data.non_hazardous_tons_year || ''}
                    onChange={(e) => updateWasteData('non_hazardous_tons_year',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">t/año</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="non_hazardous_cost">Costo gestión</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="non_hazardous_cost"
                    type="number"
                    placeholder="60"
                    value={briefing.known_waste_data.non_hazardous_cost_eur_ton || ''}
                    onChange={(e) => updateWasteData('non_hazardous_cost_eur_ton',
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">€/t</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waste_manager">Gestor de residuos</Label>
              <Input
                id="waste_manager"
                placeholder="Nombre del gestor autorizado"
                value={briefing.known_waste_data.waste_manager_name || ''}
                onChange={(e) => updateWasteData('waste_manager_name', e.target.value)}
              />
            </div>

            {wasteCost > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3 text-sm">
                <span className="text-muted-foreground">Costo anual residuos: </span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {wasteCost.toLocaleString()} €/año
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
