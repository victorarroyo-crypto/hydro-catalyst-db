import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BenchmarkPrice } from '@/types/costConsulting';
import { BenchmarkPriceBar } from './BenchmarkPriceBar';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, Calculator } from 'lucide-react';

interface PriceComparatorProps {
  benchmarks: BenchmarkPrice[];
}

export const PriceComparator = ({ benchmarks }: PriceComparatorProps) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [inputPrice, setInputPrice] = useState<string>('');

  const selectedBenchmark = useMemo(
    () => benchmarks.find(b => b.id === selectedProduct),
    [benchmarks, selectedProduct]
  );

  const price = parseFloat(inputPrice) || 0;

  const analysis = useMemo(() => {
    if (!selectedBenchmark || price <= 0) return null;

    const { price_p10, price_p25, price_p50, price_p75, price_p90 } = selectedBenchmark;

    let percentile: string;
    let status: 'excellent' | 'good' | 'normal' | 'high' | 'very_high';
    let deviation: number;

    if (price <= price_p10) {
      percentile = '< P10';
      status = 'excellent';
      deviation = ((price - price_p50) / price_p50) * 100;
    } else if (price <= price_p25) {
      percentile = 'P10-P25';
      status = 'excellent';
      deviation = ((price - price_p50) / price_p50) * 100;
    } else if (price <= price_p50) {
      percentile = 'P25-P50';
      status = 'good';
      deviation = ((price - price_p50) / price_p50) * 100;
    } else if (price <= price_p75) {
      percentile = 'P50-P75';
      status = 'normal';
      deviation = ((price - price_p50) / price_p50) * 100;
    } else if (price <= price_p90) {
      percentile = 'P75-P90';
      status = 'high';
      deviation = ((price - price_p50) / price_p50) * 100;
    } else {
      percentile = '> P90';
      status = 'very_high';
      deviation = ((price - price_p50) / price_p50) * 100;
    }

    const potentialSavings = price > price_p50 ? (price - price_p50) : 0;

    return {
      percentile,
      status,
      deviation,
      potentialSavings,
    };
  }, [selectedBenchmark, price]);

  const getStatusBadge = () => {
    if (!analysis) return null;

    const config = {
      excellent: { label: 'Excelente', class: 'bg-[#8cb63c] text-white', icon: TrendingDown },
      good: { label: 'Bueno', class: 'bg-[#8cb63c]/70 text-white', icon: TrendingDown },
      normal: { label: 'Normal', class: 'bg-[#ffa720]/70 text-white', icon: Minus },
      high: { label: 'Alto', class: 'bg-[#ffa720] text-white', icon: TrendingUp },
      very_high: { label: 'Muy alto', class: 'bg-red-500 text-white', icon: TrendingUp },
    };

    const { label, class: className, icon: Icon } = config[analysis.status];

    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  // Group benchmarks by category for the selector
  const groupedBenchmarks = useMemo(() => {
    const groups: Record<string, BenchmarkPrice[]> = {};
    benchmarks.forEach(b => {
      const category = b.cost_categories?.name || 'Sin categoría';
      if (!groups[category]) groups[category] = [];
      groups[category].push(b);
    });
    return groups;
  }, [benchmarks]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-[#32b4cd]" />
          Comparador de Precios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(groupedBenchmarks).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {items.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.product_name} ({b.unit})
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tu precio</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={inputPrice}
                onChange={e => setInputPrice(e.target.value)}
              />
              {selectedBenchmark && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {selectedBenchmark.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        {selectedBenchmark && price > 0 && (
          <>
            <div className="pt-2">
              <BenchmarkPriceBar
                benchmark={selectedBenchmark}
                comparePrice={price}
                showLabels
              />
            </div>

            {analysis && (
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  {getStatusBadge()}
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Percentil</p>
                  <p className="font-semibold">{analysis.percentile}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">vs. Mediana</p>
                  <p className={`font-semibold ${analysis.deviation < 0 ? 'text-[#8cb63c]' : analysis.deviation > 0 ? 'text-[#ffa720]' : ''}`}>
                    {analysis.deviation > 0 ? '+' : ''}{analysis.deviation.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {analysis && analysis.potentialSavings > 0 && (
              <div className="p-3 bg-[#8cb63c]/10 border border-[#8cb63c]/30 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Ahorro potencial:</span>{' '}
                  Si negocias hasta la mediana (P50), podrías ahorrar{' '}
                  <span className="font-bold text-[#8cb63c]">
                    {analysis.potentialSavings.toFixed(2)} {selectedBenchmark.unit}
                  </span>{' '}
                  por unidad.
                </p>
              </div>
            )}
          </>
        )}

        {!selectedProduct && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecciona un producto y introduce tu precio para comparar
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceComparator;
