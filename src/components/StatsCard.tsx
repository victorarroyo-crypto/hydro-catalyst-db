import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10';
      case 'secondary':
        return 'border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10';
      case 'accent':
        return 'border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10';
      default:
        return '';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-primary-foreground';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground';
      case 'accent':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn('card-hover', getVariantStyles(), className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', getIconStyles())}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
