import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tag, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { TaxonomyTipo } from '@/hooks/useTechnologyFilters';

interface QuickClassifyButtonProps {
  technologyId: string;
  onClassified?: () => void;
}

export const QuickClassifyButton: React.FC<QuickClassifyButtonProps> = ({
  technologyId,
  onClassified,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  const handleClassify = async (tipoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('technologies')
        .update({ tipo_id: tipoId })
        .eq('id', technologyId);

      if (error) throw error;

      toast.success('Tecnología clasificada correctamente');
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-display'] });
      setOpen(false);
      onClassified?.();
    } catch (error) {
      console.error('Error classifying technology:', error);
      toast.error('Error al clasificar la tecnología');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700"
        >
          <Tag className="w-3.5 h-3.5" />
          Clasificar
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-2 bg-popover z-50" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
            Selecciona el tipo:
          </p>
          {tipos?.map((tipo) => (
            <button
              key={tipo.id}
              disabled={saving}
              onClick={(e) => handleClassify(tipo.id, e)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <span className="font-mono text-xs text-muted-foreground w-8">
                {tipo.codigo}
              </span>
              <span className="flex-1 truncate">{tipo.nombre}</span>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
