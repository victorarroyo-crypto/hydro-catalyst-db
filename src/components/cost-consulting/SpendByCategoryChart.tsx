import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { SpendByCategory } from '@/services/costConsultingApi';

// ============================================================
// CONSTANTS
// ============================================================

const BENCHMARK_COLORS: Record<SpendByCategory['benchmark_comparison'], string> = {
  excellent: '#8cb63c',
  good: '#32b4cd',
  average: '#ffa720',
  above_market: '#ef4444',
};

const BENCHMARK_LABELS: Record<SpendByCategory['benchmark_comparison'], string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  average: 'Promedio',
  above_market: 'Por encima del mercado',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}K`;
  }
  return `€${value.toFixed(0)}`;
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

// ============================================================
// EXTENDED TYPE (with optional tooltip fields)
// ============================================================

export interface SpendByCategoryExtended extends SpendByCategory {
  invoice_count?: number;
  avg_unit_price?: number;
}

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SpendByCategoryExtended }>;
}

const CategoryTooltip: React.FC<CategoryTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  
  const item = payload[0].payload;
  
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: BENCHMARK_COLORS[item.benchmark_comparison] }}
        />
        <p className="font-semibold">{item.category_name}</p>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gasto total:</span>
          <span className="font-medium">{formatFullCurrency(item.total_spend)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">% del total:</span>
          <span className="font-medium">{formatPercent(item.pct_of_total)}</span>
        </div>
        
        {item.invoice_count !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nº facturas:</span>
            <span className="font-medium">{item.invoice_count}</span>
          </div>
        )}
        
        {item.avg_unit_price !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio medio:</span>
            <span className="font-medium">{formatFullCurrency(item.avg_unit_price)}</span>
          </div>
        )}
        
        <div className="flex justify-between pt-1.5 border-t mt-1.5">
          <span className="text-muted-foreground">Benchmark:</span>
          <span 
            className="font-medium"
            style={{ color: BENCHMARK_COLORS[item.benchmark_comparison] }}
          >
            {BENCHMARK_LABELS[item.benchmark_comparison]}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CUSTOM LABEL WITH BENCHMARK DOT
// ============================================================

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  payload?: SpendByCategoryExtended;
}

const CustomBarLabel: React.FC<CustomLabelProps> = ({ x = 0, width = 0, y = 0, height = 0, payload }) => {
  if (!payload) return null;
  
  const labelX = x + width + 8;
  const labelY = y + height / 2;
  
  return (
    <g>
      {/* Benchmark dot */}
      <circle
        cx={labelX}
        cy={labelY}
        r={5}
        fill={BENCHMARK_COLORS[payload.benchmark_comparison]}
      />
      {/* Amount and percentage */}
      <text
        x={labelX + 12}
        y={labelY}
        dy={4}
        fontSize={12}
        fill="hsl(var(--foreground))"
      >
        <tspan fontWeight={600}>{formatCurrency(payload.total_spend)}</tspan>
        <tspan fill="hsl(var(--muted-foreground))" dx={6}>
          ({formatPercent(payload.pct_of_total)})
        </tspan>
      </text>
    </g>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface SpendByCategoryChartProps {
  data: SpendByCategoryExtended[];
  height?: number;
}

export const SpendByCategoryChart: React.FC<SpendByCategoryChartProps> = ({ 
  data, 
  height = 320 
}) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos de categorías disponibles
      </div>
    );
  }

  // Sort by total_spend descending
  const sortedData = [...data].sort((a, b) => b.total_spend - a.total_spend);
  
  // Calculate dynamic height based on number of categories
  const barHeight = 40;
  const dynamicHeight = Math.max(height, sortedData.length * barHeight + 40);

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 px-2">
        {Object.entries(BENCHMARK_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: BENCHMARK_COLORS[key as SpendByCategory['benchmark_comparison']] }}
            />
            {label}
          </div>
        ))}
      </div>
      
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart 
          data={sortedData} 
          layout="vertical" 
          margin={{ left: 10, right: 140, top: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis 
            type="number" 
            tickFormatter={(v) => formatCurrency(v)} 
            fontSize={11}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="category_name"
            fontSize={12}
            width={100}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <Tooltip 
            content={<CategoryTooltip />} 
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar 
            dataKey="total_spend" 
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={index} 
                fill={BENCHMARK_COLORS[entry.benchmark_comparison]}
                fillOpacity={0.85}
              />
            ))}
            <LabelList 
              dataKey="total_spend" 
              content={<CustomBarLabel />}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendByCategoryChart;
