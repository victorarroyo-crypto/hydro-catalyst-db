import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Brain, FileUp, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepModeActivatedBannerProps {
  onDismiss: () => void;
  className?: string;
}

export function DeepModeActivatedBanner({ onDismiss, className }: DeepModeActivatedBannerProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200 animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
        <Brain className="w-4.5 h-4.5 text-white" />
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-sm" style={{ color: '#307177' }}>
          Deep Advisor activado
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Análisis profundo con 4 expertos especializados.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-cyan-700">
            <FileUp className="w-3 h-3" />
            Adjunta documentos para mejores resultados
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-cyan-700">
            <MapPin className="w-3 h-3" />
            Indica ubicación exacta
          </span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="h-6 w-6 flex-shrink-0 text-cyan-500 hover:text-cyan-700 hover:bg-cyan-100"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
