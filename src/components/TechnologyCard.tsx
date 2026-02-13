import React from 'react';
import { TRLBadge } from '@/components/TRLBadge';
import { TierBadge } from '@/components/TierBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Tag, Layers, Grid3X3, Eye, Clock, CheckCircle } from 'lucide-react';
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
  
  // Priorizar arrays de taxonomía sobre campos legacy
  const hasArrayTaxonomy = (technology.categorias && technology.categorias.length > 0) ||
                           (technology.tipos && technology.tipos.length > 0) ||
                           (technology.subcategorias && technology.subcategorias.length > 0);
  
  // Get legacy taxonomy from arrays or text field (fallback)
  const displayTipo = technology.tipos?.[0] || technology.tipo;
  const displaySubcat = technology.subcategorias?.[0] || null;
  const displaySector = technology.sector;
  const hasTaxonomy = hasArrayTaxonomy || !!(displayTipo || displaySubcat || displaySector);
  
  // Check if unclassified (no tipo in any form)
  const isUnclassified = !displayTipo && !technology.tipo_id;
  
  // Get review status badge
  const getReviewStatusBadge = () => {
    switch (technology.review_status) {
      case 'in_review':
        return (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Eye className="w-3 h-3" />
            En revisión
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge variant="outline" className="text-[10px] gap-1 border-orange-500 text-orange-600">
            <Clock className="w-3 h-3" />
            En aprobación
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="text-[10px] gap-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Revisada
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card 
      className={`card-hover cursor-pointer group ${isInactive ? 'opacity-60 border-destructive/50 bg-destructive/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
              {technology.nombre}
            </h3>
            {isInactive && (
              <Badge variant="destructive" className="text-[10px] mt-1">
                Inactiva
              </Badge>
            )}
            {getReviewStatusBadge()}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showActions && (
              <>
                <DownloadTechnologyButton technology={technology} />
                <DeleteTechnologyButton 
                  technologyId={technology.id} 
                  technologyName={technology.nombre} 
                />
              </>
            )}
            <TierBadge tier={technology.tier} evidenceLevel={technology.evidence_level} />
            <TRLBadge trl={technology.trl} size="sm" />
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          {technology.proveedor && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{technology.proveedor}</span>
            </div>
          )}
          {technology.pais && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{technology.pais}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {/* Taxonomy badges - priorizar arrays de 3 niveles */}
          {hasTaxonomy && (
            <div className="flex flex-wrap gap-1.5">
              {/* Mostrar categorías si hay arrays */}
              {technology.categorias && technology.categorias.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Tag className="w-3 h-3" />
                  {technology.categorias[0]}
                  {technology.categorias.length > 1 && ` +${technology.categorias.length - 1}`}
                </Badge>
              )}
              
              {/* Mostrar tipos (priorizar array, fallback a legacy) */}
              {technology.tipos && technology.tipos.length > 0 ? (
                <Badge variant="default" className="text-xs gap-1">
                  <Layers className="w-3 h-3" />
                  {technology.tipos[0]}
                  {technology.tipos.length > 1 && ` +${technology.tipos.length - 1}`}
                </Badge>
              ) : displayTipo && !technology.categorias?.length && (
                <Badge variant="default" className="text-xs gap-1">
                  <Tag className="w-3 h-3" />
                  {displayTipo}
                </Badge>
              )}
              
              {/* Mostrar subcategorías (priorizar array, fallback a legacy) */}
              {technology.subcategorias && technology.subcategorias.length > 0 ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  {technology.subcategorias[0]}
                  {technology.subcategorias.length > 1 && ` +${technology.subcategorias.length - 1}`}
                </Badge>
              ) : displaySubcat && !hasArrayTaxonomy && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Layers className="w-3 h-3" />
                  {displaySubcat}
                </Badge>
              )}
              
              {/* Sector solo si no hay arrays y hay valor */}
              {!hasArrayTaxonomy && displaySector && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  {displaySector}
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
