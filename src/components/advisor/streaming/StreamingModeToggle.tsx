import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const STORAGE_KEY = 'advisor_streaming_mode';

export function useStreamingMode() {
  const [enabled, setEnabled] = React.useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const toggle = React.useCallback((value: boolean) => {
    setEnabled(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { streamingMode: enabled, setStreamingMode: toggle };
}

export function StreamingModeToggle({
  enabled,
  onChange,
  disabled,
  className,
}: StreamingModeToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch
        id="streaming-mode"
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[#32b4cd]"
      />
      <Label
        htmlFor="streaming-mode"
        className={cn(
          'flex items-center gap-1.5 text-xs cursor-pointer select-none',
          enabled ? 'text-[#32b4cd]' : 'text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Radio className="h-3 w-3" />
        Progreso en tiempo real
      </Label>
    </div>
  );
}
