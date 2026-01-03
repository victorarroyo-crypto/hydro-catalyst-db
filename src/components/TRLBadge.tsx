import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TRLBadgeProps {
  trl: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const TRLBadge: React.FC<TRLBadgeProps> = ({ trl, size = 'md' }) => {
  if (trl === null || trl === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        N/A
      </Badge>
    );
  }

  const getColorClass = () => {
    if (trl >= 1 && trl <= 3) return 'trl-badge-low';
    if (trl >= 4 && trl <= 6) return 'trl-badge-medium';
    return 'trl-badge-high';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-base px-4 py-1.5';
      default:
        return 'text-sm px-3 py-1';
    }
  };

  return (
    <Badge className={cn(getColorClass(), getSizeClass(), 'font-semibold')}>
      TRL {trl}
    </Badge>
  );
};
