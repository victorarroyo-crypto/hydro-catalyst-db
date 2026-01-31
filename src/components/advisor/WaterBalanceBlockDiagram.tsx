import React from 'react';
import { cn } from '@/lib/utils';
import { Droplets, ArrowDown, ArrowRight, Factory, Recycle, Trash2 } from 'lucide-react';

interface WaterBalanceEntry {
  label: string;
  value: string;
  unit?: string;
  percent?: string;
}

interface ParsedWaterBalance {
  inputs: WaterBalanceEntry[];
  consumptions: WaterBalanceEntry[];
  outputs: WaterBalanceEntry[];
  totals?: {
    input?: string;
    consumption?: string;
    output?: string;
  };
}

/**
 * Detects if content is a water balance table/data
 */
export function isWaterBalanceContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const lower = text.toLowerCase();
  
  // Must contain water balance keywords
  const hasBalanceKeyword = 
    lower.includes('balance hídrico') ||
    lower.includes('balance hidrico') ||
    lower.includes('water balance') ||
    (lower.includes('entradas') && lower.includes('salidas')) ||
    (lower.includes('captación') && lower.includes('efluente'));
  
  if (!hasBalanceKeyword) return false;
  
  // Must have flow/volume indicators (m³, L, etc.)
  const hasFlowUnits = /m[³3]|litros?|l\/|caudal/i.test(text);
  
  // Must have multiple entries (table-like structure)
  const hasMultipleLines = text.split('\n').length >= 3;
  
  // Has table structure OR list structure with values
  const hasTableStructure = text.includes('|') && (text.match(/\|/g) || []).length >= 6;
  const hasListStructure = /[-•]\s*\w+.*\d+/.test(text);
  
  return hasFlowUnits && hasMultipleLines && (hasTableStructure || hasListStructure);
}

/**
 * Parses water balance content into structured data
 */
function parseWaterBalance(text: string): ParsedWaterBalance {
  const result: ParsedWaterBalance = {
    inputs: [],
    consumptions: [],
    outputs: [],
    totals: {}
  };
  
  const lines = text.split('\n').filter(l => l.trim());
  
  let currentSection: 'inputs' | 'consumptions' | 'outputs' | null = null;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Detect section headers
    if (lower.includes('entrada') || lower.includes('captación') || lower.includes('aporte') || lower.includes('suministro')) {
      currentSection = 'inputs';
      continue;
    }
    if (lower.includes('consumo') || lower.includes('uso') || lower.includes('proceso')) {
      currentSection = 'consumptions';
      continue;
    }
    if (lower.includes('salida') || lower.includes('efluente') || lower.includes('vertido') || lower.includes('pérdida')) {
      currentSection = 'outputs';
      continue;
    }
    
    // Parse table rows: | Name | Value | Unit |
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c && !c.match(/^[-:]+$/));
      if (cells.length >= 2) {
        const label = cells[0];
        const value = cells[1];
        const unit = cells[2] || '';
        const percent = cells.find(c => c.includes('%'));
        
        // Skip header rows
        if (label.toLowerCase() === 'concepto' || label.toLowerCase() === 'fuente' || label === '---') {
          continue;
        }
        
        const entry: WaterBalanceEntry = { 
          label, 
          value,
          unit,
          percent: percent || undefined
        };
        
        // Determine section by keywords if not set
        if (!currentSection) {
          if (lower.includes('red') || lower.includes('pozo') || lower.includes('captación') || lower.includes('aporte')) {
            currentSection = 'inputs';
          } else if (lower.includes('efluente') || lower.includes('vertido') || lower.includes('pérdida') || lower.includes('evaporación')) {
            currentSection = 'outputs';
          } else {
            currentSection = 'consumptions';
          }
        }
        
        // Check for totals
        if (lower.includes('total')) {
          if (currentSection === 'inputs') result.totals!.input = value;
          else if (currentSection === 'outputs') result.totals!.output = value;
          else result.totals!.consumption = value;
        } else if (currentSection) {
          result[currentSection].push(entry);
        }
      }
    }
    
    // Parse list items: - Name: Value unit
    const listMatch = line.match(/^[-•*]\s*(.+?):\s*([\d.,]+)\s*(.*)$/);
    if (listMatch) {
      const [, label, value, rest] = listMatch;
      const percentMatch = rest.match(/([\d.,]+%)/);
      
      const entry: WaterBalanceEntry = {
        label: label.trim(),
        value: value.trim(),
        unit: rest.replace(/([\d.,]+%)/, '').trim(),
        percent: percentMatch?.[1]
      };
      
      if (!currentSection) currentSection = 'consumptions';
      result[currentSection].push(entry);
    }
  }
  
  // If no structured parsing worked, try to extract any numeric data
  if (result.inputs.length === 0 && result.consumptions.length === 0 && result.outputs.length === 0) {
    const numericMatches = text.matchAll(/([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)[:\s]+([\d.,]+)\s*(m[³3]|L|%)?/gi);
    for (const match of numericMatches) {
      result.consumptions.push({
        label: match[1].trim(),
        value: match[2],
        unit: match[3] || ''
      });
    }
  }
  
  return result;
}

/**
 * Block component for a water balance section
 */
function BalanceBlock({ 
  title, 
  icon: Icon, 
  entries, 
  color,
  total 
}: { 
  title: string;
  icon: React.ElementType;
  entries: WaterBalanceEntry[];
  color: 'blue' | 'amber' | 'green';
  total?: string;
}) {
  if (entries.length === 0 && !total) return null;
  
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  };
  
  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
  };
  
  return (
    <div className={cn(
      "rounded-lg border p-3 flex-1 min-w-0",
      colorClasses[color]
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4 flex-shrink-0", iconColors[color])} />
        <span className="font-semibold text-sm text-foreground">{title}</span>
      </div>
      
      <div className="space-y-1.5">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground truncate">{entry.label}</span>
            <span className="font-medium text-foreground whitespace-nowrap">
              {entry.value} {entry.unit}
              {entry.percent && <span className="text-xs text-muted-foreground ml-1">({entry.percent})</span>}
            </span>
          </div>
        ))}
        
        {total && (
          <div className="flex items-baseline justify-between gap-2 text-sm pt-1 border-t border-current/10 mt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-foreground">{total}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Arrow connector between blocks
 */
function BlockArrow({ direction = 'down' }: { direction?: 'down' | 'right' }) {
  if (direction === 'right') {
    return (
      <div className="flex items-center justify-center px-2 flex-shrink-0">
        <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center py-1">
      <ArrowDown className="w-5 h-5 text-muted-foreground/50" />
    </div>
  );
}

/**
 * Renders water balance content as a visual block diagram
 */
export function WaterBalanceBlockDiagram({ content }: { content: string }) {
  const parsed = parseWaterBalance(content);
  
  // If parsing didn't yield useful data, fall back to simple display
  const hasData = parsed.inputs.length > 0 || parsed.consumptions.length > 0 || parsed.outputs.length > 0;
  
  if (!hasData) {
    return (
      <div className="my-4 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Balance Hídrico</span>
        </div>
        <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {content}
        </pre>
      </div>
    );
  }
  
  return (
    <div className="my-4 p-4 bg-background rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-5 h-5 text-primary" />
        <span className="font-semibold text-base text-foreground">Balance Hídrico</span>
      </div>
      
      {/* Vertical layout for mobile-friendly display */}
      <div className="flex flex-col gap-2">
        {/* Inputs */}
        {(parsed.inputs.length > 0 || parsed.totals?.input) && (
          <>
            <BalanceBlock
              title="Entradas"
              icon={Droplets}
              entries={parsed.inputs}
              color="blue"
              total={parsed.totals?.input}
            />
            <BlockArrow direction="down" />
          </>
        )}
        
        {/* Process/Consumption */}
        {(parsed.consumptions.length > 0 || parsed.totals?.consumption) && (
          <>
            <BalanceBlock
              title="Consumo / Proceso"
              icon={Factory}
              entries={parsed.consumptions}
              color="amber"
              total={parsed.totals?.consumption}
            />
            <BlockArrow direction="down" />
          </>
        )}
        
        {/* Outputs */}
        {(parsed.outputs.length > 0 || parsed.totals?.output) && (
          <BalanceBlock
            title="Salidas / Efluentes"
            icon={Recycle}
            entries={parsed.outputs}
            color="green"
            total={parsed.totals?.output}
          />
        )}
      </div>
    </div>
  );
}
