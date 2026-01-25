import React, { useEffect, useState } from 'react';
import { Brain, Info, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'advisor_deep_mode';

interface DeepModeToggleProps {
  isProcessing?: boolean;
  onChange?: (enabled: boolean) => void;
  className?: string;
}

export const DeepModeToggle: React.FC<DeepModeToggleProps> = ({
  isProcessing = false,
  onChange,
  className,
}) => {
  const [deepMode, setDeepMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(deepMode));
    onChange?.(deepMode);
  }, [deepMode, onChange]);

  const handleChange = (checked: boolean) => {
    setDeepMode(checked);
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Switch
          id="deep-mode"
          checked={deepMode}
          onCheckedChange={handleChange}
          disabled={isProcessing}
          className={cn(
            "data-[state=checked]:bg-[#32b4cd]",
            isProcessing && "opacity-50"
          )}
        />
        
        {/* Desktop label */}
        <Label 
          htmlFor="deep-mode" 
          className="hidden sm:flex items-center gap-1.5 cursor-pointer text-white/90 text-sm"
        >
          <span>Deep</span>
          {deepMode && !isProcessing && (
            <Badge 
              variant="secondary" 
              className="px-1.5 py-0 text-[10px] bg-[#32b4cd]/20 text-[#32b4cd] border-[#32b4cd]/30"
            >
              🧠
            </Badge>
          )}
          {isProcessing && (
            <Badge 
              variant="secondary" 
              className="px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
            >
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Analizando
            </Badge>
          )}
        </Label>

        {/* Mobile icon only */}
        <Label 
          htmlFor="deep-mode" 
          className="flex sm:hidden items-center cursor-pointer"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
          ) : (
            <Brain className={cn(
              "h-4 w-4",
              deepMode ? "text-[#32b4cd]" : "text-white/50"
            )} />
          )}
        </Label>

        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-white/50 hover:text-white/80 cursor-help hidden sm:block" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-sm">
            <p className="font-medium mb-1">Deep Mode</p>
            <p className="text-muted-foreground">
              Activa 4 expertos especializados (Técnico, Operativo, Económico, Regulatorio) 
              que analizan tu pregunta en paralelo y sintetizan una respuesta profesional completa.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

// Hook to get deep mode state
export function useDeepMode() {
  const [deepMode, setDeepMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const toggleDeepMode = (value: boolean) => {
    setDeepMode(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return { deepMode, setDeepMode: toggleDeepMode };
}

export default DeepModeToggle;
