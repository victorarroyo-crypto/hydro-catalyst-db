import React from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = [
  { value: 'prospeccion', label: 'Prospección' },
  { value: 'auditoria', label: 'Auditoría' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'implementacion', label: 'Implementación' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'cerrado', label: 'Cerrado' },
];

const TABS = [
  { value: 'dashboard', label: 'Dashboard', path: '' },
  { value: 'inventario', label: 'Inventario', path: '/inventario' },
  { value: 'contratos', label: 'Contratos', path: '/contratos' },
  { value: 'baseline', label: 'Baseline', path: '/baseline' },
  { value: 'alertas', label: 'Alertas', path: '/alertas' },
  { value: 'matriz', label: 'Matriz Estratégica', path: '/matriz' },
  { value: 'benchmarking', label: 'Benchmarking', path: '/benchmarking' },
  { value: 'historico', label: 'Histórico precios', path: '/historico' },
  { value: 'visita', label: 'Visita planta', path: '/visita' },
  { value: 'rfqs', label: 'RFQs', path: '/rfqs' },
  { value: 'ahorro', label: 'Ahorro', path: '/ahorro' },
  { value: 'autorizacion', label: 'Autorización', path: '/autorizacion' },
];

export default function ChemProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: project, isLoading } = useQuery({
    queryKey: ['chem-project', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_projects')
        .select('*')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const currentTab = (() => {
    const path = location.pathname.replace(`/quimicos/${projectId}`, '');
    const tab = TABS.find(t => t.path && path.startsWith(t.path));
    return tab?.value || 'dashboard';
  })();

  const handleTabChange = (value: string) => {
    const tab = TABS.find(t => t.value === value);
    if (tab) navigate(`/quimicos/${projectId}${tab.path}`);
  };

  const handleEstadoChange = async (newEstado: string) => {
    const { error } = await externalSupabase
      .from('chem_projects')
      .update({ estado: newEstado, updated_at: new Date().toISOString() })
      .eq('id', projectId!);
    if (error) toast.error('Error al cambiar estado');
    else toast.success('Estado actualizado');
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Cargando proyecto...</div>;
  }

  if (!project) {
    return <div className="p-6 text-destructive">Proyecto no encontrado</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quimicos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FlaskConical className="w-6 h-6 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{project.nombre_cliente}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {project.fecha_mandato && (
                <span>Mandato: {format(new Date(project.fecha_mandato), 'dd MMM yyyy', { locale: es })}</span>
              )}
            </div>
          </div>
          <Select value={project.estado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
