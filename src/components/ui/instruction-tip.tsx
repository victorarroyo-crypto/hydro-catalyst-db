import { Lightbulb, Info, AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InstructionTipProps {
  children: React.ReactNode;
  variant?: 'orange' | 'green' | 'blue' | 'amber';
  dismissible?: boolean;
  icon?: 'lightbulb' | 'info' | 'warning';
  className?: string;
  /** Optional ID for localStorage persistence when dismissed */
  persistKey?: string;
}

export function InstructionTip({ 
  children, 
  variant = 'orange',
  dismissible = true,
  icon = 'lightbulb',
  className,
  persistKey 
}: InstructionTipProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible || !persistKey) return false;
    try {
      return localStorage.getItem(`tip-dismissed-${persistKey}`) === 'true';
    } catch {
      return false;
    }
  });
  
  const handleDismiss = () => {
    setDismissed(true);
    if (persistKey) {
      try {
        localStorage.setItem(`tip-dismissed-${persistKey}`, 'true');
      } catch {
        // localStorage not available
      }
    }
  };
  
  if (dismissed) return null;
  
  const variantClasses = {
    orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-200',
    green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200',
    blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200',
    amber: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200',
  };
  
  const IconComponent = icon === 'lightbulb' ? Lightbulb : icon === 'info' ? Info : AlertTriangle;
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border animate-in fade-in-0 slide-in-from-top-1 duration-300",
      variantClasses[variant],
      className
    )}>
      <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium">{children}</div>
      {dismissible && (
        <button 
          onClick={handleDismiss} 
          className="hover:opacity-70 transition-opacity p-0.5 rounded"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
