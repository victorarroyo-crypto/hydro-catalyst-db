import React from 'react';
import { TRLBadge } from '@/components/TRLBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Tag, Layers, Grid3X3 } from 'lucide-react';
import { QuickClassifyButton } from '@/components/QuickClassifyButton';
import { DeleteTechnologyButton } from '@/components/DeleteTechnologyButton';
import { DownloadTechnologyButton } from '@/components/DownloadTechnologyButton';
import type { Technology } from '@/types/database';

interface TechnologyCardProps {
  technology: Technology;
  onClick: () => void;
  showQuickClassify?: boolean;
  showActions?: boolean;
}

export const TechnologyCard: React.FC<TechnologyCardProps> = ({ 
  technology, 
  onClick, 
  showQuickClassify = false,
  showActions = true,
}) => {
  const isInactive = technology.status === 'inactive';
  
  // Legacy text fields (primary source - always available)
  const legacyTipo = technology["Tipo de tecnología"];
  const legacySubcat = technology["Subcategoría"];
  const legacySector = technology["Sector y subsector"];
  const hasLegacyTaxonomy = !!(legacyTipo || legacySubcat || legacySector);
  
  // Check if unclassified (no tipo in any form)
  const isUnclassified = !legacyTipo && !(technology as any).tipo_id;

  return (
    <Card 
      className={`card-hover cursor-pointer group ${isInactive ? 'opacity-60 border-destructive/50 bg-destructive/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
              {technology["Nombre de la tecnología"]}
            </h3>
            {isInactive && (
              <Badge variant="destructive" className="text-[10px] mt-1">
                Inactiva
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showActions && (
              <>
                <DownloadTechnologyButton technology={technology} />
                <DeleteTechnologyButton 
                  technologyId={technology.id} 
                  technologyName={technology["Nombre de la tecnología"]} 
                />
              </>
            )}
            <TRLBadge trl={technology["Grado de madurez (TRL)"]} size="sm" />
          </div>
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

        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {/* Taxonomy badges from legacy text fields */}
          {hasLegacyTaxonomy && (
            <div className="flex flex-wrap gap-1.5">
              {legacyTipo && (
                <Badge variant="default" className="text-xs gap-1">
                  <Tag className="w-3 h-3" />
                  {legacyTipo}
                </Badge>
              )}
              {legacySubcat && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Layers className="w-3 h-3" />
                  {legacySubcat}
                </Badge>
              )}
              {legacySector && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  {legacySector}
                </Badge>
              )}
            </div>
          )}
          
          {/* Quick classify button for unclassified technologies */}
          {showQuickClassify && isUnclassified && (
            <QuickClassifyButton technologyId={technology.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
