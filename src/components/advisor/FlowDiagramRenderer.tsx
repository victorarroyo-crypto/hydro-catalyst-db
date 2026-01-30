import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown } from 'lucide-react';

interface FlowStep {
  label: string;
  detail?: string;
  isNumbered?: boolean;
  number?: string;
}

interface FlowDiagramRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses flow diagram text and extracts steps.
 * Handles patterns like:
 * - [Step1] → Detail1
 * - [1. Step] → [2. Step]
 * - Step1 → Step2 → Step3
 */
function parseFlowSteps(text: string): FlowStep[] {
  // Split by arrow characters
  const parts = text.split(/\s*[→←]\s*/);
  
  return parts
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      
      // Remove brackets if present
      let label = trimmed.replace(/^\[|\]$/g, '').trim();
      let detail: string | undefined;
      
      // Check if label contains a detail after colon or parenthesis
      const colonMatch = label.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        label = colonMatch[1].trim();
        detail = colonMatch[2].trim();
      }
      
      const parenMatch = label.match(/^([^(]+)\(([^)]+)\)$/);
      if (parenMatch) {
        label = parenMatch[1].trim();
        detail = parenMatch[2].trim();
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
 * Checks if text contains a flow diagram pattern
 */
export function containsFlowDiagram(text: string): boolean {
  if (!text) return false;
  
  // Must contain arrows and have multiple steps
  const hasArrows = text.includes('→') || text.includes('←');
  const hasBrackets = text.includes('[') && text.includes(']');
  const hasMultipleArrows = (text.match(/[→←]/g) || []).length >= 1;
  
  return hasArrows && (hasBrackets || hasMultipleArrows);
}

/**
 * Vertical arrow between flow steps
 */
function FlowArrowVertical() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-4 bg-primary/40" />
        <ArrowDown className="w-4 h-4 text-primary/60 -mt-1" />
      </div>
    </div>
  );
}

/**
 * Individual flow step box - professional card style
 */
function FlowStepBox({ step, index }: { step: FlowStep; index: number }) {
  return (
    <div 
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 rounded-lg",
        "border border-border bg-card",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        "w-full"
      )}
    >
      {step.isNumbered && step.number ? (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
          {step.number}
        </span>
      ) : (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground leading-relaxed">
          {step.label}
        </span>
        {step.detail && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {step.detail}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a flow diagram as styled vertical cards
 */
export function FlowDiagramRenderer({ content, className }: FlowDiagramRendererProps) {
  const steps = parseFlowSteps(content);
  
  if (steps.length === 0) {
    return <span className="font-mono text-sm">{content}</span>;
  }
  
  return (
    <div className={cn("my-6", className)}>
      <div className="flex flex-col gap-0 p-5 rounded-xl bg-muted/20 border border-border/50">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <FlowStepBox step={step} index={index} />
            {index < steps.length - 1 && <FlowArrowVertical />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Extracts and renders flow diagrams from markdown content.
 * Returns the content with flow diagrams replaced by React components.
 */
export function extractFlowDiagrams(text: string): { 
  segments: Array<{ type: 'text' | 'flow'; content: string }> 
} {
  if (!text) return { segments: [{ type: 'text', content: '' }] };
  
  const lines = text.split('\n');
  const segments: Array<{ type: 'text' | 'flow'; content: string }> = [];
  let currentText: string[] = [];
  let inCodeBlock = false;
  
  for (const line of lines) {
    // Track code blocks to avoid processing content inside them
    if (line.trim().startsWith('```')) {
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
    if (containsFlowDiagram(line)) {
      // Save accumulated text
      if (currentText.length > 0) {
        segments.push({ type: 'text', content: currentText.join('\n') });
        currentText = [];
      }
      // Add flow diagram
      segments.push({ type: 'flow', content: line });
    } else {
      currentText.push(line);
    }
  }
  
  // Add remaining text
  if (currentText.length > 0) {
    segments.push({ type: 'text', content: currentText.join('\n') });
  }
  
  return { segments };
}
