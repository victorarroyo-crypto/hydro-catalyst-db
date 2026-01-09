/**
 * Unified Info Row Component
 * 
 * Consistent display of field information across all technology views.
 * Always shows the field, with "Sin información" for empty values.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface UnifiedInfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  isLink?: boolean;
  showEmpty?: boolean;
}

export const UnifiedInfoRow: React.FC<UnifiedInfoRowProps> = ({
  icon: Icon,
  label,
  value,
  isLink = false,
  showEmpty = true,
}) => {
  const displayValue = value != null && String(value).trim().length > 0 ? String(value) : null;
  
  if (!displayValue && !showEmpty) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {!displayValue ? (
          <p className="text-sm text-muted-foreground/50 italic">Sin información</p>
        ) : isLink ? (
          <a 
            href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-secondary hover:underline flex items-center gap-1 break-all"
          >
            {displayValue}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-foreground">{displayValue}</p>
        )}
      </div>
    </div>
  );
};
