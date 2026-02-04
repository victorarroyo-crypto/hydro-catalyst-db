import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CostDashboard } from '@/components/cost-consulting/CostDashboard';

const CostConsultingDashboard: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();

  if (!projectId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Proyecto no encontrado
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/cost-consulting/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Analítico</h1>
            <p className="text-sm text-muted-foreground">
              Visualización del gasto y oportunidades de ahorro
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <CostDashboard projectId={projectId} />
    </div>
  );
};

export default CostConsultingDashboard;
