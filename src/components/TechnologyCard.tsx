import React from 'react';
import { TRLBadge } from '@/components/TRLBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';
import type { Technology } from '@/types/database';

interface TechnologyCardProps {
  technology: Technology;
  onClick: () => void;
}

export const TechnologyCard: React.FC<TechnologyCardProps> = ({ technology, onClick }) => {
  return (
    <Card 
      className="card-hover cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {technology["Nombre de la tecnología"]}
          </h3>
          <TRLBadge trl={technology["Grado de madurez (TRL)"]} size="sm" />
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          {technology["Proveedor / Empresa"] && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{technology["Proveedor / Empresa"]}</span>
            </div>
          )}
          {technology["País de origen"] && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{technology["País de origen"]}</span>
            </div>
          )}
        </div>

        {technology["Tipo de tecnología"] && (
          <div className="mt-3 pt-3 border-t border-border">
            <Badge variant="secondary" className="text-xs">
              {technology["Tipo de tecnología"]}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
