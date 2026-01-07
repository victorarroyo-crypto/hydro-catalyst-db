import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ZOMBIE_THRESHOLD_MINUTES = 5;

export const ZombieJobsIndicator: React.FC = () => {
  const { data: zombieCount } = useQuery({
    queryKey: ['zombie-jobs-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouting_sessions')
        .select('id, last_heartbeat, updated_at')
        .eq('status', 'running');

      if (error) throw error;

      const zombies = (data || []).filter((job) => {
        const heartbeat = job.last_heartbeat || job.updated_at;
        return differenceInMinutes(new Date(), new Date(heartbeat)) > ZOMBIE_THRESHOLD_MINUTES;
      });

      return zombies.length;
    },
    refetchInterval: 60000, // Check every minute
  });

  if (!zombieCount || zombieCount === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/admin/scouting-jobs">
          <Badge
            variant="destructive"
            className="animate-pulse cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {zombieCount} zombie{zombieCount > 1 ? 's' : ''}
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>Hay {zombieCount} job(s) de scouting atascados. Click para ver detalles.</p>
      </TooltipContent>
    </Tooltip>
  );
};
