import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { ScenariosSection } from '@/components/scenarios/ScenariosSection';

interface ScenariosTabProps {
  projectId: string;
}

export const ScenariosTab: React.FC<ScenariosTabProps> = ({ projectId }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Designer Link */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => navigate(`/consultoria/${projectId}/scenarios/designer`)}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Abrir Diseñador Avanzado
        </Button>
      </div>

      {/* Scenarios Section */}
      <ScenariosSection projectId={projectId} />
    </div>
  );
};
