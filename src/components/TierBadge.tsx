import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TIER_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  gold: {
    label: 'Gold',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  silver: {
    label: 'Silver',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  },
  watch: {
    label: 'Watch',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-400',
  },
  archive: {
    label: 'Archive',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  unrated: {
    label: 'Sin tier',
    className: 'bg-gray-50 text-gray-400 border-gray-200',
    dotClass: 'bg-gray-300',
  },
};

const EVIDENCE_LABELS: Record<string, string> = {
  bref_validated: 'Validado en BREF/BAT',
  peer_reviewed: 'Publicación científica',
  pilot_proven: 'Probado en piloto',
  commercial_refs: 'Referencias comerciales',
  vendor_claim: 'Información del fabricante',
  unknown: 'Sin verificar',
};

interface TierBadgeProps {
  tier: string | null | undefined;
  evidenceLevel?: string | null;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, evidenceLevel }) => {
  const config = TIER_CONFIG[tier || 'unrated'] || TIER_CONFIG.unrated;
  const evidenceLabel = EVIDENCE_LABELS[evidenceLevel || 'unknown'] || EVIDENCE_LABELS.unknown;

  const badge = (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border leading-none ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      {config.label}
    </span>
  );

  if (!evidenceLevel || evidenceLevel === 'unknown') {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Evidencia: {evidenceLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
