import React from 'react';
import { cn } from '@/lib/utils';

interface FlowStep {
  label: string;
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
 * - [Step1] → [Step2] → [Step3]
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
      
      // Check for numbered steps like "1. Step" or "1) Step"
      const numberedMatch = label.match(/^(\d+)[.\)]\s*(.+)$/);
      if (numberedMatch) {
        return {
          label: numberedMatch[2],
          isNumbered: true,
          number: numberedMatch[1]
        } as FlowStep;
      }
      
      return { label, isNumbered: false } as FlowStep;
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
 * Arrow component between flow steps
 */
function FlowArrow() {
  return (
    <div className="flex items-center px-1 flex-shrink-0">
      <svg 
        width="24" 
        height="12" 
        viewBox="0 0 24 12" 
        className="text-primary"
        fill="none"
      >
        <path 
          d="M0 6h20m0 0l-4-4m4 4l-4 4" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Individual flow step box
 */
function FlowStepBox({ step, index }: { step: FlowStep; index: number }) {
  // Alternate between teal shades for visual interest
  const isEven = index % 2 === 0;
  
  return (
    <div 
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-lg",
        "border-2 border-primary/30",
        "bg-gradient-to-br from-primary/10 to-primary/5",
        "shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:border-primary/50",
        "min-w-[80px] max-w-[200px]"
      )}
    >
      {step.isNumbered && step.number && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
          {step.number}
        </span>
      )}
      <span className="text-sm font-medium text-foreground truncate">
        {step.label}
      </span>
    </div>
  );
}

/**
 * Renders a flow diagram as styled HTML boxes with arrows
 */
export function FlowDiagramRenderer({ content, className }: FlowDiagramRendererProps) {
  const steps = parseFlowSteps(content);
  
  if (steps.length === 0) {
    return <span className="font-mono text-sm">{content}</span>;
  }
  
  return (
    <div className={cn("my-4", className)}>
      <div className="flex flex-wrap items-center gap-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <FlowStepBox step={step} index={index} />
            {index < steps.length - 1 && <FlowArrow />}
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
