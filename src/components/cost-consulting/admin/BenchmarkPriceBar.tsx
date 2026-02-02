import { BenchmarkPrice } from '@/types/costConsulting';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BenchmarkPriceBarProps {
  benchmark: BenchmarkPrice;
  comparePrice?: number;
  showLabels?: boolean;
}

export const BenchmarkPriceBar = ({
  benchmark,
  comparePrice,
  showLabels = false,
}: BenchmarkPriceBarProps) => {
  const { price_p10, price_p25, price_p50, price_p75, price_p90 } = benchmark;
  const range = price_p90 - price_p10;

  // Calculate percentages for each segment
  const p10_25_width = ((price_p25 - price_p10) / range) * 100;
  const p25_50_width = ((price_p50 - price_p25) / range) * 100;
  const p50_75_width = ((price_p75 - price_p50) / range) * 100;
  const p75_90_width = ((price_p90 - price_p75) / range) * 100;

  // Calculate position for compare price marker
  const comparePosition = comparePrice
    ? Math.min(Math.max(((comparePrice - price_p10) / range) * 100, 0), 100)
    : null;

  const getCompareColor = () => {
    if (!comparePrice) return '';
    if (comparePrice <= price_p25) return 'bg-[#8cb63c]'; // Green - cheap
    if (comparePrice <= price_p50) return 'bg-[#8cb63c]/70';
    if (comparePrice <= price_p75) return 'bg-[#ffa720]'; // Orange - normal
    return 'bg-red-500'; // Red - expensive
  };

  const getPercentileForPrice = (price: number) => {
    if (price <= price_p10) return '< P10';
    if (price <= price_p25) return 'P10-P25';
    if (price <= price_p50) return 'P25-P50';
    if (price <= price_p75) return 'P50-P75';
    if (price <= price_p90) return 'P75-P90';
    return '> P90';
  };

  return (
    <div className="space-y-1">
      <div className="relative h-4 flex rounded-md overflow-hidden">
        {/* P10-P25: Green (cheap) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="bg-[#8cb63c] h-full"
              style={{ width: `${p10_25_width}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">P10-P25: {price_p10.toFixed(2)} - {price_p25.toFixed(2)} {benchmark.unit}</p>
            <p className="text-xs text-muted-foreground">Muy competitivo</p>
          </TooltipContent>
        </Tooltip>

        {/* P25-P50: Light green */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="bg-[#8cb63c]/60 h-full"
              style={{ width: `${p25_50_width}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">P25-P50: {price_p25.toFixed(2)} - {price_p50.toFixed(2)} {benchmark.unit}</p>
            <p className="text-xs text-muted-foreground">Competitivo</p>
          </TooltipContent>
        </Tooltip>

        {/* P50-P75: Orange */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="bg-[#ffa720]/70 h-full"
              style={{ width: `${p50_75_width}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">P50-P75: {price_p50.toFixed(2)} - {price_p75.toFixed(2)} {benchmark.unit}</p>
            <p className="text-xs text-muted-foreground">Normal</p>
          </TooltipContent>
        </Tooltip>

        {/* P75-P90: Red (expensive) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="bg-[#ffa720] h-full"
              style={{ width: `${p75_90_width}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">P75-P90: {price_p75.toFixed(2)} - {price_p90.toFixed(2)} {benchmark.unit}</p>
            <p className="text-xs text-muted-foreground">Caro</p>
          </TooltipContent>
        </Tooltip>

        {/* Compare price marker */}
        {comparePosition !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute top-0 w-1 h-full border-l-2 border-r-2 border-white shadow-lg',
                  getCompareColor()
                )}
                style={{ left: `${comparePosition}%`, transform: 'translateX(-50%)' }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{comparePrice?.toFixed(2)} {benchmark.unit}</p>
              <p className="text-xs text-muted-foreground">
                Percentil: {getPercentileForPrice(comparePrice!)}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{price_p10.toFixed(2)}</span>
          <span>{price_p25.toFixed(2)}</span>
          <span>{price_p50.toFixed(2)}</span>
          <span>{price_p75.toFixed(2)}</span>
          <span>{price_p90.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

export default BenchmarkPriceBar;
