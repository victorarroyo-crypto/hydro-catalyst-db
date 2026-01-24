/**
 * DuplicateCompareModal
 * 
 * Side-by-side comparison modal for duplicate technology groups.
 * Allows users to:
 * - Compare fields across duplicate technologies
 * - Select a master technology
 * - Choose which duplicates to merge
 * - Delete individual technologies
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Merge, 
  Trash2, 
  Crown, 
  AlertTriangle,
  ExternalLink,
  Calendar,
  Building2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuplicateGroup, QualityIssue } from '@/hooks/useDataQualityStats';

interface DuplicateCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DuplicateGroup | null;
  onMerge: (masterId: string, duplicateIds: string[]) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  isLoading?: boolean;
}

// Fields to compare - limited to those in QualityIssue interface
const COMPARE_FIELDS: { key: keyof QualityIssue; label: string; icon?: React.ReactNode }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'proveedor', label: 'Proveedor', icon: <Building2 className="h-3 w-3" /> },
  { key: 'pais', label: 'País', icon: <Globe className="h-3 w-3" /> },
  { key: 'web', label: 'Web', icon: <ExternalLink className="h-3 w-3" /> },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'sector', label: 'Sector' },
  { key: 'trl', label: 'TRL' },
  { key: 'status', label: 'Estado' },
];

export function DuplicateCompareModal({
  open,
  onOpenChange,
  group,
  onMerge,
  onDelete,
  isLoading = false,
}: DuplicateCompareModalProps) {
  const [masterId, setMasterId] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when group changes
  React.useEffect(() => {
    if (group?.technologies.length) {
      setMasterId(group.technologies[0].id);
      setSelectedForMerge(new Set(group.technologies.slice(1).map(t => t.id)));
    } else {
      setMasterId(null);
      setSelectedForMerge(new Set());
    }
  }, [group]);

  const technologies = group?.technologies || [];

  // Check if values differ across technologies for highlighting
  const fieldDifferences = useMemo(() => {
    const diffs: Record<string, boolean> = {};
    
    for (const field of COMPARE_FIELDS) {
      const values = technologies.map(t => {
        const val = t[field.key];
        return val === null || val === undefined || val === '' ? null : String(val);
      });
      const uniqueNonNull = new Set(values.filter(v => v !== null));
      diffs[field.key] = uniqueNonNull.size > 1;
    }
    
    return diffs;
  }, [technologies]);

  const handleToggleMerge = (id: string) => {
    if (id === masterId) return; // Can't toggle master
    
    const newSet = new Set(selectedForMerge);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForMerge(newSet);
  };

  const handleSetMaster = (id: string) => {
    // Remove from merge selection if it was selected
    const newSet = new Set(selectedForMerge);
    newSet.delete(id);
    // Add previous master to merge selection
    if (masterId && masterId !== id) {
      newSet.add(masterId);
    }
    setSelectedForMerge(newSet);
    setMasterId(id);
  };

  const handleMerge = async () => {
    if (!masterId || selectedForMerge.size === 0) return;
    
    setIsProcessing(true);
    try {
      await onMerge(masterId, Array.from(selectedForMerge));
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setIsProcessing(true);
    try {
      await onDelete(id, name);
      // Remove from selections
      if (masterId === id) {
        const remaining = technologies.filter(t => t.id !== id);
        setMasterId(remaining[0]?.id || null);
      }
      selectedForMerge.delete(id);
      setSelectedForMerge(new Set(selectedForMerge));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (Array.isArray(value)) {
      return value.join(', ') || '—';
    }
    return String(value);
  };

  const canMerge = masterId && selectedForMerge.size > 0;

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-primary" />
            Comparar y Fusionar Duplicados
          </DialogTitle>
          <DialogDescription>
            Grupo: <Badge variant="secondary">{group.similarityType}</Badge> — {technologies.length} tecnologías detectadas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Technology columns */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${technologies.length}, minmax(200px, 1fr))` }}>
            {/* Headers */}
            {technologies.map((tech) => (
              <div
                key={tech.id}
                className={cn(
                  "p-3 rounded-lg border-2 transition-colors",
                  masterId === tech.id 
                    ? "border-primary bg-primary/5" 
                    : selectedForMerge.has(tech.id)
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-muted"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={tech.nombre}>
                      {tech.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tech.proveedor || 'Sin proveedor'}
                    </p>
                  </div>
                  
                  {masterId === tech.id ? (
                    <Badge className="shrink-0 bg-primary">
                      <Crown className="h-3 w-3 mr-1" />
                      Maestra
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-6 px-2"
                      onClick={() => handleSetMaster(tech.id)}
                    >
                      <Crown className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {masterId !== tech.id && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={selectedForMerge.has(tech.id)}
                        onCheckedChange={() => handleToggleMerge(tech.id)}
                      />
                      Fusionar
                    </label>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                    onClick={() => handleDelete(tech.id, tech.nombre)}
                    disabled={isProcessing || technologies.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Field comparison table */}
          <div className="space-y-1">
            {COMPARE_FIELDS.map((field) => (
              <div
                key={field.key}
                className={cn(
                  "grid gap-4 py-2 px-2 rounded",
                  fieldDifferences[field.key] && "bg-amber-500/10"
                )}
                style={{ gridTemplateColumns: `120px repeat(${technologies.length}, minmax(200px, 1fr))` }}
              >
                {/* Field label */}
                <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  {field.icon}
                  {field.label}
                  {fieldDifferences[field.key] && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                
                {/* Values */}
                {technologies.map((tech) => {
                  const value = tech[field.key];
                  const isEmpty = value === null || value === undefined || value === '';
                  
                  return (
                    <div
                      key={tech.id}
                      className={cn(
                        "text-sm",
                        isEmpty && "text-muted-foreground italic"
                      )}
                    >
                      {field.key === 'web' && value ? (
                        <a 
                          href={String(value).startsWith('http') ? String(value) : `https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate block"
                        >
                          {formatValue(value)}
                        </a>
                      ) : field.key === 'descripcion' ? (
                        <p className="line-clamp-3 text-xs">
                          {formatValue(value)}
                        </p>
                      ) : (
                        <span className="truncate block">{formatValue(value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Created date */}
            <div
              className="grid gap-4 py-2 px-2"
              style={{ gridTemplateColumns: `120px repeat(${technologies.length}, minmax(200px, 1fr))` }}
            >
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Creado
              </div>
              {technologies.map((tech) => (
                <div key={tech.id} className="text-sm text-muted-foreground">
                  {tech.created_at ? new Date(tech.created_at).toLocaleDateString('es-ES') : '—'}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedForMerge.size > 0 ? (
              <>
                Se fusionarán <strong>{selectedForMerge.size}</strong> tecnología(s) en la maestra
              </>
            ) : (
              'Selecciona tecnologías para fusionar'
            )}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMerge}
              disabled={!canMerge || isProcessing}
              className="bg-primary"
            >
              <Merge className="h-4 w-4 mr-2" />
              {isProcessing ? 'Fusionando...' : 'Fusionar Seleccionados'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
