import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TRLBadge } from '@/components/TRLBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const isUnclassified = (technology as any).tipo_id === null || (technology as any).tipo_id === undefined;
  const isInactive = technology.status === 'inactive';
  
  // Fetch taxonomy data for display
  const { data: taxonomyData } = useQuery({
    queryKey: ['taxonomy-display', (technology as any).tipo_id, (technology as any).subcategoria_id, (technology as any).sector_id],
    queryFn: async () => {
      const tipoId = (technology as any).tipo_id;
      const subcategoriaId = (technology as any).subcategoria_id;
      const sectorId = (technology as any).sector_id;
      
      let tipo = null;
      let subcategoria = null;
      let sector = null;
      
      if (tipoId) {
        const { data } = await supabase
          .from('taxonomy_tipos')
          .select('codigo, nombre')
          .eq('id', tipoId)
          .maybeSingle();
        tipo = data;
      }
      
      if (subcategoriaId) {
        const { data } = await supabase
          .from('taxonomy_subcategorias')
          .select('codigo, nombre')
          .eq('id', subcategoriaId)
          .maybeSingle();
        subcategoria = data;
      }

      if (sectorId) {
        const { data } = await supabase
          .from('taxonomy_sectores')
          .select('id, nombre')
          .eq('id', sectorId)
          .maybeSingle();
        sector = data;
      }
      
      return { tipo, subcategoria, sector };
    },
    enabled: !!(technology as any).tipo_id || !!(technology as any).subcategoria_id || !!(technology as any).sector_id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const hasTaxonomy = taxonomyData?.tipo || taxonomyData?.subcategoria || taxonomyData?.sector;

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
          {/* New Taxonomy badges */}
          {hasTaxonomy && (
            <div className="flex flex-wrap gap-1.5">
              {taxonomyData?.tipo && (
                <Badge variant="default" className="text-xs gap-1">
                  <Tag className="w-3 h-3" />
                  <span className="font-mono text-[10px] opacity-70">{taxonomyData.tipo.codigo}</span>
                  {taxonomyData.tipo.nombre}
                </Badge>
              )}
              {taxonomyData?.subcategoria && (
                <Badge variant="secondary" className="text-xs">
                  <span className="font-mono text-[10px] opacity-70 mr-1">{taxonomyData.subcategoria.codigo}</span>
                  {taxonomyData.subcategoria.nombre}
                </Badge>
              )}
              {taxonomyData?.sector && (
                <Badge variant="outline" className="text-xs">
                  <span className="font-mono text-[10px] opacity-70 mr-1">{taxonomyData.sector.id}</span>
                  {taxonomyData.sector.nombre}
                </Badge>
              )}
            </div>
          )}
          
          {/* Fallback to legacy type if no taxonomy */}
          {!hasTaxonomy && technology["Tipo de tecnología"] && !showQuickClassify && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {technology["Tipo de tecnología"]}
            </Badge>
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
