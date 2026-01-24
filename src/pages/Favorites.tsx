import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TechnologyCard } from '@/components/TechnologyCard';
import { TechnologyUnifiedModal } from '@/components/TechnologyUnifiedModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, Trash2 } from 'lucide-react';
import type { Technology } from '@/types/database';

const Favorites: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTechnology, setSelectedTechnology] = useState<Technology | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Subscribe to real-time updates
  useRealtimeSubscription({
    tables: ['user_favorites', 'technologies'],
    queryKeys: [['favorites', user?.id || '']],
  });

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('user_favorites')
        .select(`
          id,
          technology_id,
          technologies (*)
        `)
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data.map((fav: any) => ({
        favoriteId: fav.id,
        technology: fav.technologies as Technology,
      }));
    },
    enabled: !!user,
  });

  const removeFavorite = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await externalSupabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: 'Eliminado de favoritos',
        description: 'La tecnología se ha eliminado de tu lista',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar de favoritos',
        variant: 'destructive',
      });
    },
  });

  const handleTechnologyClick = (tech: Technology) => {
    setSelectedTechnology(tech);
    setModalOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Mis Favoritos
        </h1>
        <p className="text-muted-foreground">
          Tecnologías que has marcado como favoritas
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : favorites?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Star className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No tienes favoritos todavía
          </h3>
          <p className="text-muted-foreground max-w-md">
            Explora las tecnologías y marca las que más te interesen como favoritas
            para acceder rápidamente a ellas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites?.map(({ favoriteId, technology }) => (
            <div key={favoriteId} className="relative group">
              <TechnologyCard
                technology={technology}
                onClick={() => handleTechnologyClick(technology)}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite.mutate(favoriteId);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <TechnologyUnifiedModal
        technology={selectedTechnology}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default Favorites;
