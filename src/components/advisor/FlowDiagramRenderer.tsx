import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowDown, GitBranch } from 'lucide-react';

interface FlowStep {
  label: string;
  detail?: string;
  isNumbered?: boolean;
  number?: string;
  isBranch?: boolean;
}

interface FlowLine {
  steps: FlowStep[];
  isBranch?: boolean;
  branchSymbol?: string;
}

interface FlowDiagramRendererProps {
  content: string;
  className?: string;
}

/**
 * Normalizes arrow characters to standard →
 */
function normalizeArrows(text: string): string {
  return text
    .replace(/->|-->/g, '→')
    .replace(/<-|<--/g, '←')
    .replace(/=>/g, '→')
    .replace(/→\s*→/g, '→'); // collapse double arrows
}

/**
 * Parses flow diagram text and extracts steps.
 * Handles patterns like:
 * - [Step1] → Detail1
 * - [1. Step] → [2. Step]
 * - Step1 → Step2 → Step3
 * - C1+C3 (baja carga) → Tamizado → REUTILIZACIÓN
 */
function parseFlowSteps(text: string): FlowStep[] {
  // Normalize arrows first
  const normalized = normalizeArrows(text);
  
  // Split by arrow characters
  const parts = normalized.split(/\s*[→←]\s*/);
  
  return parts
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      
      // Remove brackets if present
      let label = trimmed.replace(/^\[|\]$/g, '').trim();
      let detail: string | undefined;
      
      // Check if label contains a detail after colon
      const colonMatch = label.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        label = colonMatch[1].trim();
        detail = colonMatch[2].trim();
      }
      
      // Extract parenthetical info as detail
      const parenMatch = label.match(/^([^(]+)\(([^)]+)\)(.*)$/);
      if (parenMatch) {
        const prefix = parenMatch[1].trim();
        const parenContent = parenMatch[2].trim();
        const suffix = parenMatch[3].trim();
        
        // If there's content after parenthesis, keep it all as label
        if (suffix) {
          label = `${prefix} (${parenContent}) ${suffix}`.trim();
        } else {
          label = prefix;
          detail = parenContent;
        }
      }
      
      // Check for numbered steps like "1. Step" or "1) Step"
      const numberedMatch = label.match(/^(\d+)[.\)]\s*(.+)$/);
      if (numberedMatch) {
        return {
          label: numberedMatch[2],
          detail,
          isNumbered: true,
          number: numberedMatch[1]
        } as FlowStep;
      }
      
      return { label, detail, isNumbered: false } as FlowStep;
    })
    .filter((step): step is FlowStep => step !== null && step.label.length > 0);
}

/**
 * Parses multi-line flow diagrams with branches
 */
function parseMultiLineFlow(lines: string[]): FlowLine[] {
  const flowLines: FlowLine[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for branch indicators
    const isBranch = /^[└├┌┐│|┬┴┤├]|^L→|^└→|^├→/.test(trimmed);
    const branchSymbol = trimmed.match(/^([└├┌┐│|┬┴┤├]|L→|└→|├→)/)?.[1];
    
    // Remove branch symbol for parsing
    const cleanLine = trimmed.replace(/^[└├┌┐│|┬┴┤├]→?\s*|^L→\s*|^└→\s*|^├→\s*/, '');
    
    const steps = parseFlowSteps(cleanLine);
    if (steps.length > 0) {
      flowLines.push({
        steps,
        isBranch,
        branchSymbol,
      });
    }
  }
  
  return flowLines;
}

/**
 * Checks if a line looks like a markdown table row
 * Tables have multiple | separators and typically have structured columns
 */
function isMarkdownTableRow(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Must start and end with | for valid table rows
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  
  // Count pipe characters - tables have multiple columns
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  if (pipeCount < 3) return false; // At least |col1|col2|
  
  // Check if it's a separator row (---|---|---)
  if (/^\|[\s\-:|]+\|$/.test(trimmed)) return true;
  
  // Table rows have relatively evenly spaced content between pipes
  // Flow diagrams don't have this pattern
  const cells = trimmed.split('|').filter(c => c.trim());
  if (cells.length >= 2) {
    // If most cells have content, it's likely a table
    const nonEmptyCells = cells.filter(c => c.trim().length > 0);
    return nonEmptyCells.length >= 2;
  }
  
  return false;
}

/**
 * Checks if a line starts with an arrow (used as bullet point, NOT a flow diagram)
 * Examples: "→ Objetivo: >80%" or "← Resultado anterior"
 */
function isArrowBullet(text: string): boolean {
  const trimmed = text.trim();
  // Arrow at start of line followed by space = bullet point, not flow
  return /^[→←]\s/.test(trimmed);
}

/**
 * Checks if text contains a flow diagram pattern
 * EXCLUDES markdown tables which use | for columns
 * EXCLUDES arrow bullets (→ text) which are just list items
 */
export function containsFlowDiagram(text: string): boolean {
  if (!text) return false;
  
  // FIRST: Exclude markdown table rows - they are NOT flow diagrams
  if (isMarkdownTableRow(text)) {
    return false;
  }
  
  // SECOND: Exclude arrow bullets - arrows at start of line are NOT flow diagrams
  if (isArrowBullet(text)) {
    return false;
  }
  
  // Normalize first to catch ASCII arrows
  const normalized = normalizeArrows(text);
  
  // Must contain arrows to be a flow diagram
  const hasArrows = normalized.includes('→') || normalized.includes('←');
  if (!hasArrows) return false;
  
  // Check for bracketed steps like [Step1] → [Step2]
  const hasBrackets = normalized.includes('[') && normalized.includes(']');
  
  // Flow diagrams need arrows BETWEEN elements, not just arrows present
  // Pattern: "Word → Word" or "[Step] → [Step]" 
  // NOT: "→ Objetivo: value" (arrow at start = bullet)
  const hasFlowPattern = /\S\s*→\s*\S/.test(normalized) || /\S\s*←\s*\S/.test(normalized);
  
  if (!hasFlowPattern) return false;
  
  // Count arrows - flow diagrams typically have sequence
  const arrowCount = (normalized.match(/[→←]/g) || []).length;
  
  // Also check for branch patterns (but not if it looks like a table)
  const hasBranchPattern = /[└├┌┐│┬┴┤]/.test(text) && !text.includes('|');
  
  // Flow diagram: has flow pattern AND (brackets OR multiple arrows OR branch pattern)
  return hasFlowPattern && (hasBrackets || arrowCount >= 2 || hasBranchPattern);
}

/**
 * Checks if a block of lines forms a multi-line flow diagram
 * Excludes blocks that look like markdown tables
 */
export function isMultiLineFlowBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  
  // If most lines look like table rows, it's a table not a flow diagram
  const tableRowCount = lines.filter(l => isMarkdownTableRow(l)).length;
  if (tableRowCount >= lines.length * 0.5) {
    return false;
  }
  
  let flowLineCount = 0;
  for (const line of lines) {
    if (containsFlowDiagram(line)) {
      flowLineCount++;
    }
  }
  
  // At least 2 flow lines or has branch patterns (excluding |)
  const hasBranches = lines.some(l => /[└├┌┐│┬┴┤]/.test(l) && !isMarkdownTableRow(l));
  return flowLineCount >= 2 || hasBranches;
}

/**
 * Horizontal arrow between flow steps
 */
function FlowArrowHorizontal() {
  return (
    <div className="flex items-center px-1 flex-shrink-0">
      <ArrowRight className="w-4 h-4 text-primary/50" />
    </div>
  );
}

/**
 * Branch indicator
 */
function BranchIndicator({ symbol }: { symbol?: string }) {
  return (
    <div className="flex items-center gap-1 px-2 text-muted-foreground">
      <GitBranch className="w-3 h-3" />
    </div>
  );
}

/**
 * Individual flow step chip - clean, minimal style
 */
function FlowChip({ step, index }: { step: FlowStep; index: number }) {
  // Determine if this is a highlight step (all caps or contains percentages)
  const isHighlight = /^[A-ZÁÉÍÓÚÑ\s]+$/.test(step.label) || 
                      step.label.includes('%') || 
                      step.detail?.includes('%');
  
  return (
    <div 
      className={cn(
        "flex-shrink-0 px-2.5 py-1.5 rounded-md text-sm",
        "border border-border/60",
        isHighlight 
          ? "bg-primary/5 text-primary font-medium"
          : "bg-background"
      )}
    >
      <div className="flex items-center gap-2">
        {step.isNumbered && step.number ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
            {step.number}
          </span>
        ) : null}
        <span className={cn(
          "text-sm font-medium whitespace-nowrap",
          isHighlight ? "text-primary font-semibold" : "text-foreground"
        )}>
          {step.label}
        </span>
      </div>
      {step.detail && (
        <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
          {step.detail}
        </p>
      )}
    </div>
  );
}

/**
 * Single flow line (horizontal pipeline)
 */
function FlowLineRenderer({ flowLine, index }: { flowLine: FlowLine; index: number }) {
  return (
    <div className={cn(
      "flex items-center gap-0",
      flowLine.isBranch && "ml-6 relative before:absolute before:left-[-16px] before:top-1/2 before:w-3 before:h-px before:bg-border"
    )}>
      {flowLine.isBranch && <BranchIndicator symbol={flowLine.branchSymbol} />}
      {flowLine.steps.map((step, stepIndex) => (
        <React.Fragment key={stepIndex}>
          <FlowChip step={step} index={stepIndex} />
          {stepIndex < flowLine.steps.length - 1 && <FlowArrowHorizontal />}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Renders a single-line flow diagram as horizontal pipeline
 */
export function FlowDiagramRenderer({ content, className }: FlowDiagramRendererProps) {
  const steps = parseFlowSteps(content);
  
  if (steps.length === 0) {
    return <span className="font-mono text-sm">{content}</span>;
  }
  
  return (
    <div className={cn("my-3 overflow-x-auto max-w-full", className)}>
      <div className="inline-flex items-center gap-0 p-2.5 rounded-lg min-w-0">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <FlowChip step={step} index={index} />
            {index < steps.length - 1 && <FlowArrowHorizontal />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a multi-line flow diagram with possible branches
 */
export function MultiLineFlowRenderer({ lines, className }: { lines: string[]; className?: string }) {
  const flowLines = parseMultiLineFlow(lines);
  
  if (flowLines.length === 0) {
    return (
      <div className="font-mono text-sm whitespace-pre">
        {lines.join('\n')}
      </div>
    );
  }
  
  return (
    <div className={cn("my-3 overflow-x-auto max-w-full", className)}>
      <div className="flex flex-col gap-2 p-3 rounded-lg">
        {flowLines.map((flowLine, index) => (
          <FlowLineRenderer key={index} flowLine={flowLine} index={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Extracts and renders flow diagrams from markdown content.
 * Returns the content with flow diagrams replaced by React components.
 * Now handles multi-line flow blocks.
 */
export function extractFlowDiagrams(text: string): { 
  segments: Array<{ type: 'text' | 'flow' | 'multiflow'; content: string; lines?: string[] }> 
} {
  if (!text) return { segments: [{ type: 'text', content: '' }] };
  
  const lines = text.split('\n');
  const segments: Array<{ type: 'text' | 'flow' | 'multiflow'; content: string; lines?: string[] }> = [];
  let currentText: string[] = [];
  let currentFlowBlock: string[] = [];
  let inCodeBlock = false;
  
  const flushText = () => {
    if (currentText.length > 0) {
      segments.push({ type: 'text', content: currentText.join('\n') });
      currentText = [];
    }
  };
  
  const flushFlowBlock = () => {
    if (currentFlowBlock.length > 0) {
      if (currentFlowBlock.length === 1) {
        segments.push({ type: 'flow', content: currentFlowBlock[0] });
      } else {
        segments.push({ 
          type: 'multiflow', 
          content: currentFlowBlock.join('\n'),
          lines: [...currentFlowBlock]
        });
      }
      currentFlowBlock = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track code blocks to avoid processing content inside them
    if (line.trim().startsWith('```')) {
      flushFlowBlock();
      inCodeBlock = !inCodeBlock;
      currentText.push(line);
      continue;
    }
    
    // Skip if inside code block
    if (inCodeBlock) {
      currentText.push(line);
      continue;
    }
    
    // Check if this line is a flow diagram
    const isFlowLine = containsFlowDiagram(line);
    const isBranchLine = /^[\s]*[└├┌┐│|┬┴┤├]/.test(line) || /^\s*L→|^\s*└→|^\s*├→/.test(line);
    
    if (isFlowLine || isBranchLine) {
      flushText();
      currentFlowBlock.push(line);
    } else {
      // Check if we were accumulating flow lines
      if (currentFlowBlock.length > 0) {
        // Empty line might separate flow blocks - check next line
        if (line.trim() === '' && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (containsFlowDiagram(nextLine) || /^[\s]*[└├┌┐│|]/.test(nextLine)) {
            // Keep empty line as separator within flow block
            currentFlowBlock.push(line);
            continue;
          }
        }
        flushFlowBlock();
      }
      currentText.push(line);
    }
  }
  
  // Flush remaining
  flushFlowBlock();
  flushText();
  
  return { segments };
}
