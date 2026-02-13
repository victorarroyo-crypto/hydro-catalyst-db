/**
 * Unified Tech Header Component
 * 
 * Consistent header with technology name, TRL badge, and contextual badges.
 * Uses canonical field names from technologies table.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TRLBadge } from '@/components/TRLBadge';
import { TierBadge } from '@/components/TierBadge';
import { 
  CheckCircle2, 
  Database, 
  FileText, 
  Search, 
  Sparkles,
  Clock 
} from 'lucide-react';
import type { UnifiedTechData, TechMetadata } from '@/types/unifiedTech';

interface UnifiedTechHeaderProps {
  data: UnifiedTechData;
  metadata: TechMetadata;
}

export const UnifiedTechHeader: React.FC<UnifiedTechHeaderProps> = ({
  data,
  metadata,
}) => {
  // Don't show source badge for database items (it's obvious)
  const showSourceBadge = metadata.source !== 'database';
  
  const getSourceIcon = () => {
    if (metadata.isLinkedToDB) return Database;
    switch (metadata.source) {
      case 'database': return Database;
      case 'longlist': return FileText;
      case 'scouting': return Search;
      case 'extracted': return Sparkles;
      case 'case_study': return FileText;
      default: return FileText;
    }
  };
  
  const getSourceLabel = (): string => {
    if (metadata.isLinkedToDB && metadata.source !== 'database') return 'Vinculada a BD';
    switch (metadata.source) {
      case 'database': return 'Base de Datos';
      case 'longlist': return 'Lista Larga';
      case 'scouting': return 'Scouting';
      case 'extracted': return 'Extracción IA';
      case 'case_study': return 'Caso de Estudio';
      default: return metadata.source;
    }
  };

  const SourceIcon = getSourceIcon();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-display font-semibold mb-2">
          {data.nombre}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <TRLBadge trl={data.trl} />
          <TierBadge tier={(data as any).tier} evidenceLevel={(data as any).evidence_level} />
          
          {/* Source Badge - hidden for database items */}
          {showSourceBadge && (
            <Badge 
              variant="outline" 
              className={`gap-1 ${
                metadata.isLinkedToDB 
                  ? 'text-green-600 border-green-600' 
                  : 'text-muted-foreground'
              }`}
            >
              {metadata.isLinkedToDB ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <SourceIcon className="w-3 h-3" />
              )}
              {getSourceLabel()}
            </Badge>
          )}
          
          {/* Phase Badge (if applicable) */}
          {metadata.phase && !metadata.isLinkedToDB && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              {metadata.phase}
            </Badge>
          )}
          
          {/* Status Badge */}
          {data.status && (
            <Badge variant="secondary">{data.status}</Badge>
          )}
          
          {/* Review Status Badge */}
          {data.review_status && data.review_status !== 'none' && (
            <Badge 
              variant="outline"
              className={
                data.review_status === 'pending' ? 'text-amber-600 border-amber-500' :
                data.review_status === 'approved' ? 'text-green-600 border-green-500' :
                data.review_status === 'rejected' ? 'text-red-600 border-red-500' :
                ''
              }
            >
              {data.review_status === 'pending' ? 'Pendiente revisión' :
               data.review_status === 'approved' ? 'Aprobada' :
               data.review_status === 'rejected' ? 'Rechazada' :
               data.review_status}
            </Badge>
          )}
          
          {/* Confidence Score (for AI extracted) */}
          {metadata.confidenceScore && metadata.confidenceScore > 0 && (
            <Badge variant="secondary">
              {Math.round(metadata.confidenceScore * 100)}% confianza
            </Badge>
          )}
          
          {/* Quality Score */}
          {data.quality_score && data.quality_score > 0 && (
            <Badge variant="secondary">
              Calidad: {data.quality_score}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
