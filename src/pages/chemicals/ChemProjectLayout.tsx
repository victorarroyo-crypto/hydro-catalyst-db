import React from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FlaskConical, LayoutDashboard, Package, FileText, Bell, FileCheck, Factory, Target, BarChart3, PiggyBank, BookOpen, TrendingUp, FolderOpen } from 'lucide-react';
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
  { value: 'dashboard', label: 'Dashboard', path: '', icon: LayoutDashboard },
  { value: 'inventario', label: 'Productos', path: '/inventario', icon: Package },
  { value: 'facturas', label: 'Facturas', path: '/facturas', icon: FileText },
  { value: 'alertas', label: 'Alertas', path: '/alertas', icon: Bell },
  { value: 'contratos', label: 'Contratos', path: '/contratos', icon: FileCheck },
  { value: 'visita', label: 'Visitas Planta', path: '/visita', icon: Factory },
  { value: 'matriz', label: 'Matriz Estratégica', path: '/matriz', icon: Target },
  { value: 'rfqs', label: 'RFQs y Ofertas', path: '/rfqs', icon: BarChart3 },
  { value: 'ahorro', label: 'Ahorros', path: '/ahorro', icon: PiggyBank },
  { value: 'benchmarking', label: 'Benchmarks', path: '/benchmarking', icon: BookOpen },
  { value: 'historico', label: 'Historial Precios', path: '/historico', icon: TrendingUp },
  { value: 'documentos', label: 'Documentos', path: '/documentos', icon: FolderOpen },
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
      <div className="border-b border-border bg-card px-6 py-2">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quimicos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FlaskConical className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{project.nombre_cliente}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {project.fecha_mandato && (
                <span>Mandato: {format(new Date(project.fecha_mandato), 'dd MMM yyyy', { locale: es })}</span>
              )}
            </div>
          </div>
          <Select value={project.estado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs whitespace-nowrap gap-1 px-2 py-1">
                <tab.icon className="w-3 h-3" />
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
