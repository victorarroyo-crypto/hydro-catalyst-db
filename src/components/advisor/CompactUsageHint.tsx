import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactUsageHintProps {
  onOpenGuide: () => void;
  isDeepMode: boolean;
  className?: string;
}

const STORAGE_KEY = 'advisor_guide_dismissed';

export function CompactUsageHint({ onOpenGuide, isDeepMode, className }: CompactUsageHintProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // If dismissed, show only a small help button
  if (isDismissed) {
    return (
      <div className={cn("flex justify-end", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenGuide}
          className="text-xs text-muted-foreground hover:text-primary gap-1.5 h-7 px-2"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Ayuda</span>
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
        isDeepMode 
          ? "bg-cyan-50/80 border-cyan-200" 
          : "bg-amber-50/80 border-amber-200",
        className
      )}
    >
      <div 
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isDeepMode ? "bg-cyan-100" : "bg-amber-100"
        )}
      >
        <Lightbulb 
          className={cn(
            "w-4 h-4",
            isDeepMode ? "text-cyan-600" : "text-amber-600"
          )} 
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm",
          isDeepMode ? "text-cyan-800" : "text-amber-800"
        )}>
          <span className="font-medium">Incluye:</span>{" "}
          <span className="text-foreground/70">
            sector, ubicación, datos técnicos y objetivo claro
          </span>
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenGuide}
        className={cn(
          "gap-1 h-7 px-2 text-xs font-medium flex-shrink-0",
          isDeepMode 
            ? "text-cyan-700 hover:text-cyan-900 hover:bg-cyan-100" 
            : "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        )}
      >
        Ver guía
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className={cn(
          "h-6 w-6 flex-shrink-0",
          isDeepMode 
            ? "text-cyan-500 hover:text-cyan-700 hover:bg-cyan-100" 
            : "text-amber-500 hover:text-amber-700 hover:bg-amber-100"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
