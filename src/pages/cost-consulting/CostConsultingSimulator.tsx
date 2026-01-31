import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Calculator, 
  AlertTriangle,
  CheckCircle2,
  Star,
  Save,
  FileText,
  GitCompare,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

// Mock data
const categories = [
  { id: 'quimicos-coagulantes', name: 'Químicos - Coagulantes', supplier: 'Química Industrial SL', spend: 45000, price: 0.38, benchmarkMin: 0.28, benchmarkMax: 0.35, volume: 118421 },
  { id: 'quimicos-floculantes', name: 'Químicos - Floculantes', supplier: 'Química Industrial SL', spend: 28000, price: 2.80, benchmarkMin: 2.20, benchmarkMax: 3.00, volume: 10000 },
  { id: 'residuos-lodos', name: 'Residuos - Lodos', supplier: 'Residuos del Norte SL', spend: 35000, price: 45, benchmarkMin: 38, benchmarkMax: 48, volume: 778 },
  { id: 'om-mantenimiento', name: 'O&M - Mantenimiento', supplier: 'Servicios Técnicos SA', spend: 36000, price: 3000, benchmarkMin: 2500, benchmarkMax: 3200, volume: 12 },
];

const existingSuppliers = [
  { id: 'quimicas-norte', name: 'Químicas Norte SL', discount: 12 },
  { id: 'suministros-agua', name: 'Suministros de Agua SA', discount: 8 },
  { id: 'provquim', name: 'ProvQuim SL', discount: 15 },
];

interface Scenario {
  id: string;
  name: string;
  type: string;
  savings: number;
  newPrice: number;
  risk: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  rating: number;
  advantages: string[];
  risks: string[];
}

const CostConsultingSimulator = () => {
  const { id } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
  const [scenarioType, setScenarioType] = useState('consolidate');
  const [targetSupplier, setTargetSupplier] = useState('quimicas-norte');
  const [discountPercent, setDiscountPercent] = useState([12]);
  const [customPrice, setCustomPrice] = useState('');
  const [calculatedResult, setCalculatedResult] = useState<Scenario | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [showComparator, setShowComparator] = useState(false);

  const currentCategory = categories.find(c => c.id === selectedCategory) || categories[0];
  const currentSupplier = existingSuppliers.find(s => s.id === targetSupplier);

  const calculateScenario = () => {
    let newPrice: number;
    let savings: number;
    let advantages: string[] = [];
    let risks: string[] = [];
    let risk: 'low' | 'medium' | 'high' = 'low';
    let effort: 'low' | 'medium' | 'high' = 'low';
    let rating = 3;
    let name = '';

    switch (scenarioType) {
      case 'renegotiate':
        newPrice = currentCategory.price * 0.92;
        savings = (currentCategory.price - newPrice) * currentCategory.volume;
        name = 'Renegociar con proveedor actual';
        advantages = [
          'Sin costes de cambio de proveedor',
          'Relación comercial ya establecida',
          'Sin riesgo de interrupción de suministro'
        ];
        risks = [
          'Margen de negociación limitado',
          'Proveedor puede no aceptar'
        ];
        risk = 'low';
        effort = 'low';
        rating = 3;
        break;

      case 'change':
        newPrice = (currentCategory.benchmarkMin + currentCategory.benchmarkMax) / 2;
        savings = (currentCategory.price - newPrice) * currentCategory.volume;
        name = 'Cambiar a nuevo proveedor';
        advantages = [
          'Mejor precio de mercado',
          'Nuevas condiciones comerciales',
          'Posible mejora de servicio'
        ];
        risks = [
          'Proceso de homologación requerido',
          'Riesgo de calidad desconocida',
          'Costes de transición',
          'Posibles penalizaciones en contrato actual'
        ];
        risk = 'medium';
        effort = 'high';
        rating = 4;
        break;

      case 'consolidate':
        const discount = discountPercent[0] / 100;
        newPrice = currentCategory.price * (1 - discount);
        savings = (currentCategory.price - newPrice) * currentCategory.volume;
        name = `Consolidar con ${currentSupplier?.name || 'proveedor'}`;
        advantages = [
          'Proveedor ya homologado - sin costes de cambio',
          'Una factura menos al mes',
          'Mayor poder de negociación',
          'Simplificación administrativa'
        ];
        risks = [
          'Mayor dependencia de un proveedor',
          'Necesita verificar capacidad de suministro'
        ];
        risk = 'low';
        effort = 'low';
        rating = 5;
        break;

      case 'custom':
        newPrice = parseFloat(customPrice) || currentCategory.price;
        savings = (currentCategory.price - newPrice) * currentCategory.volume;
        name = 'Escenario personalizado';
        advantages = ['Configuración a medida'];
        risks = ['Requiere validación manual'];
        risk = 'medium';
        effort = 'medium';
        rating = 3;
        break;

      default:
        return;
    }

    const result: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      type: scenarioType,
      savings: Math.round(savings),
      newPrice: Math.round(newPrice * 100) / 100,
      risk,
      effort,
      rating,
      advantages,
      risks
    };

    setCalculatedResult(result);
  };

  const saveScenario = () => {
    if (calculatedResult) {
      setSavedScenarios(prev => [...prev, calculatedResult]);
    }
  };

  const deleteScenario = (scenarioId: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== scenarioId));
  };

  const renderStars = (rating: number) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
          }`}
        />
      ))}
    </div>
  );

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Bajo</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medio</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Alto</Badge>;
      default:
        return <Badge variant="outline">{riskLevel}</Badge>;
    }
  };

  const getEffortBadge = (effortLevel: string) => {
    switch (effortLevel) {
      case 'low':
        return <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">Bajo</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">Medio</Badge>;
      case 'high':
        return <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">Alto</Badge>;
      default:
        return <Badge variant="outline">{effortLevel}</Badge>;
    }
  };

  const priceChangePercent = calculatedResult 
    ? Math.round(((calculatedResult.newPrice - currentCategory.price) / currentCategory.price) * 100) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/cost-consulting/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Simulador de Escenarios</h1>
          <p className="text-muted-foreground mt-1">Análisis #{id}</p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configuración del Escenario
            </CardTitle>
            <CardDescription>Define los parámetros de simulación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Situation */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Situación Actual</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Proveedor:</span>
                  <p className="font-medium">{currentCategory.supplier}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gasto anual:</span>
                  <p className="font-medium">{currentCategory.spend.toLocaleString()}€</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio actual:</span>
                  <p className="font-medium">{currentCategory.price}€/kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Benchmark mercado:</span>
                  <p className="font-medium">{currentCategory.benchmarkMin} - {currentCategory.benchmarkMax}€/kg</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Scenario Type */}
            <div className="space-y-3">
              <Label>Tipo de Escenario</Label>
              <RadioGroup value={scenarioType} onValueChange={setScenarioType} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="renegotiate" id="renegotiate" />
                  <Label htmlFor="renegotiate" className="font-normal cursor-pointer">
                    Renegociar con proveedor actual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="change" id="change" />
                  <Label htmlFor="change" className="font-normal cursor-pointer">
                    Cambiar a otro proveedor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consolidate" id="consolidate" />
                  <Label htmlFor="consolidate" className="font-normal cursor-pointer">
                    Consolidar con proveedor existente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                    Escenario personalizado
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Parameters based on type */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Parámetros</h4>
              
              {scenarioType === 'consolidate' && (
                <>
                  <div className="space-y-2">
                    <Label>Proveedor destino</Label>
                    <Select value={targetSupplier} onValueChange={setTargetSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingSuppliers.map(sup => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.name} (existente)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Volumen adicional</Label>
                    <Input value={`${currentCategory.volume.toLocaleString()} kg/año`} disabled />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Descuento por volumen</Label>
                      <span className="text-sm font-medium">{discountPercent[0]}%</span>
                    </div>
                    <Slider
                      value={discountPercent}
                      onValueChange={setDiscountPercent}
                      max={25}
                      min={5}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Basado en historial: {currentSupplier?.name} ofrece ~{currentSupplier?.discount}% por volumen
                    </p>
                  </div>
                </>
              )}

              {scenarioType === 'renegotiate' && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Se asume una reducción del 8% basada en el margen típico de negociación 
                    y la diferencia con el benchmark de mercado.
                  </p>
                </div>
              )}

              {scenarioType === 'change' && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Se calcula el precio medio de mercado ({((currentCategory.benchmarkMin + currentCategory.benchmarkMax) / 2).toFixed(2)}€/kg) 
                    basado en los benchmarks disponibles.
                  </p>
                </div>
              )}

              {scenarioType === 'custom' && (
                <div className="space-y-2">
                  <Label>Precio objetivo (€/kg)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder={`Actual: ${currentCategory.price}€/kg`}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button onClick={calculateScenario} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular escenario
            </Button>
          </CardContent>
        </Card>

        {/* Right Panel - Results */}
        <div className="space-y-6">
          {calculatedResult ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resultado: {calculatedResult.name}</CardTitle>
                    <CardDescription>Análisis de impacto del escenario</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getRiskBadge(calculatedResult.risk)}
                    {getEffortBadge(calculatedResult.effort)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comparison Card */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Comparativa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="font-medium text-muted-foreground"></div>
                      <div className="font-medium text-center">ACTUAL</div>
                      <div className="font-medium text-center">PROPUESTO</div>
                      <div className="font-medium text-center">AHORRO</div>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-4 text-sm items-center">
                        <div className="text-muted-foreground">Precio:</div>
                        <div className="text-center font-medium">{currentCategory.price}€/kg</div>
                        <div className="text-center flex items-center justify-center gap-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{calculatedResult.newPrice}€/kg</span>
                        </div>
                        <div className={`text-center font-medium ${priceChangePercent < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                          {priceChangePercent}%
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm items-center">
                        <div className="text-muted-foreground">Anual:</div>
                        <div className="text-center font-medium">{currentCategory.spend.toLocaleString()}€</div>
                        <div className="text-center flex items-center justify-center gap-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{(currentCategory.spend - calculatedResult.savings).toLocaleString()}€</span>
                        </div>
                        <div className="text-center font-bold text-green-600 dark:text-green-400">
                          {calculatedResult.savings.toLocaleString()}€
                        </div>
                      </div>
                      {scenarioType === 'consolidate' && (
                        <div className="grid grid-cols-4 gap-4 text-sm items-center">
                          <div className="text-muted-foreground">Proveed.:</div>
                          <div className="text-center font-medium">2</div>
                          <div className="text-center flex items-center justify-center gap-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">1</span>
                          </div>
                          <div className="text-center font-medium text-green-600 dark:text-green-400">-1</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis */}
                <div className="space-y-4">
                  <h4 className="font-medium">Análisis</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium text-sm">Ventajas:</span>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {calculatedResult.advantages.map((adv, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          {adv}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium text-sm">Riesgos:</span>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {calculatedResult.risks.map((riskItem, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          {riskItem}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">RECOMENDACIÓN:</span>
                          {renderStars(calculatedResult.rating)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {calculatedResult.rating >= 4 
                            ? 'Mejor ratio ahorro/riesgo/esfuerzo de las opciones'
                            : calculatedResult.rating >= 3
                            ? 'Opción viable con balance aceptable'
                            : 'Considerar otras alternativas'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={saveScenario} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar escenario
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Añadir al informe
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowComparator(!showComparator)}
                    disabled={savedScenarios.length === 0}
                  >
                    <GitCompare className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">Sin resultados</CardTitle>
                <CardDescription className="text-center">
                  Configura los parámetros y pulsa "Calcular escenario" para ver los resultados
                </CardDescription>
              </CardContent>
            </Card>
          )}

          {/* Scenario Comparator */}
          {showComparator && savedScenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  Comparar Escenarios
                </CardTitle>
                <CardDescription>
                  {savedScenarios.length} escenarios guardados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escenario</TableHead>
                      <TableHead className="text-right">Ahorro</TableHead>
                      <TableHead className="text-center">Riesgo</TableHead>
                      <TableHead className="text-center">Esfuerzo</TableHead>
                      <TableHead className="text-center">Recom.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedScenarios.map((scenario) => {
                      const isBest = scenario.rating === Math.max(...savedScenarios.map(s => s.rating));
                      return (
                        <TableRow key={scenario.id} className={isBest ? 'bg-green-50 dark:bg-green-950/30' : ''}>
                          <TableCell className="font-medium">
                            {scenario.name}
                            {isBest && (
                              <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Mejor
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {scenario.savings.toLocaleString()}€
                          </TableCell>
                          <TableCell className="text-center">{getRiskBadge(scenario.risk)}</TableCell>
                          <TableCell className="text-center">{getEffortBadge(scenario.effort)}</TableCell>
                          <TableCell className="text-center">{renderStars(scenario.rating)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteScenario(scenario.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostConsultingSimulator;
