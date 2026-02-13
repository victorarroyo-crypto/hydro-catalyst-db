import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FlaskConical, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SECTORES = [
  { value: 'farmaceutico', label: 'Farmacéutico' },
  { value: 'alimentario', label: 'Alimentario' },
  { value: 'reciclaje', label: 'Reciclaje' },
  { value: 'quimico', label: 'Químico' },
  { value: 'automocion', label: 'Automoción' },
  { value: 'textil', label: 'Textil' },
  { value: 'papelero', label: 'Papelero' },
  { value: 'metalurgico', label: 'Metalúrgico' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS = [
  { value: 'prospeccion', label: 'Prospección', color: 'bg-muted text-muted-foreground' },
  { value: 'auditoria', label: 'Auditoría', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'negociacion', label: 'Negociación', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'implementacion', label: 'Implementación', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'seguimiento', label: 'Seguimiento', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'cerrado', label: 'Cerrado', color: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
];

const getEstadoBadge = (estado: string) => {
  const config = ESTADOS.find(e => e.value === estado) || ESTADOS[0];
  return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
};

const getSectorLabel = (sector: string) => {
  return SECTORES.find(s => s.value === sector)?.label || sector;
};

export default function ChemProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    nombre_cliente: '',
    sector: 'otro',
    contacto_principal: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['chem-projects'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('chem_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');
      const { data, error } = await externalSupabase
        .from('chem_projects')
        .insert({
          user_id: user.id,
          nombre_cliente: form.nombre_cliente,
          sector: form.sector,
          contacto_principal: form.contacto_principal,
          fecha_inicio: form.fecha_inicio,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chem-projects'] });
      toast.success('Proyecto creado correctamente');
      setOpen(false);
      setForm({ nombre_cliente: '', sector: 'otro', contacto_principal: '', fecha_inicio: new Date().toISOString().split('T')[0] });
      navigate(`/quimicos/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = projects.filter((p: any) => {
    if (filterEstado !== 'all' && p.estado !== filterEstado) return false;
    if (filterSector !== 'all' && p.sector !== filterSector) return false;
    if (searchTerm && !p.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (val: number | null) => {
    if (!val) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Químicos</h1>
            <p className="text-sm text-muted-foreground">Consultoría de costes de productos químicos</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuevo proyecto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo proyecto de Químicos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nombre del cliente *</Label>
                <Input value={form.nombre_cliente} onChange={e => setForm(f => ({ ...f, nombre_cliente: e.target.value }))} placeholder="Empresa S.A." />
              </div>
              <div>
                <Label>Sector</Label>
                <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTORES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contacto principal</Label>
                <Input value={form.contacto_principal} onChange={e => setForm(f => ({ ...f, contacto_principal: e.target.value }))} placeholder="Nombre del contacto" />
              </div>
              <div>
                <Label>Fecha de inicio</Label>
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <Button className="w-full" disabled={!form.nombre_cliente || createProject.isPending} onClick={() => createProject.mutate()}>
                {createProject.isPending ? 'Creando...' : 'Crear proyecto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-60" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sectores</SelectItem>
                {SECTORES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead className="text-right">Gasto total</TableHead>
                <TableHead className="text-right">Ahorro conseguido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay proyectos. Crea uno nuevo para empezar.</TableCell></TableRow>
              ) : (
                filtered.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quimicos/${p.id}`)}>
                    <TableCell className="font-medium">{p.nombre_cliente}</TableCell>
                    <TableCell>{getSectorLabel(p.sector)}</TableCell>
                    <TableCell>{getEstadoBadge(p.estado)}</TableCell>
                    <TableCell>{p.fecha_inicio ? format(new Date(p.fecha_inicio), 'dd MMM yyyy', { locale: es }) : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.gasto_total_anual)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.ahorro_conseguido)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
