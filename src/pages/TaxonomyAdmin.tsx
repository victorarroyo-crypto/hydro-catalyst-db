import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import {
  syncTipoInsert,
  syncTipoUpdate,
  syncTipoDelete,
  syncSubcategoriaInsert,
  syncSubcategoriaUpdate,
  syncSubcategoriaDelete,
  syncSectorInsert,
  syncSectorUpdate,
  syncSectorDelete,
} from '@/lib/syncToExternal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Tag, 
  Layers, 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface TaxonomySubcategoria {
  id: number;
  tipo_id: number | null;
  codigo: string;
  nombre: string;
}

interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

const TaxonomyAdmin: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only admins can access this page
  const isAdmin = profile?.role === 'admin';

  // Real-time subscriptions
  useRealtimeSubscription({
    tables: ['taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores'],
    queryKeys: [['taxonomy-tipos'], ['taxonomy-subcategorias'], ['taxonomy-sectores']],
  });

  // Modal states
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [subcategoriaModalOpen, setSubcategoriaModalOpen] = useState(false);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string | number; name: string } | null>(null);
  

  // Form states
  const [editingTipo, setEditingTipo] = useState<TaxonomyTipo | null>(null);
  const [editingSubcategoria, setEditingSubcategoria] = useState<TaxonomySubcategoria | null>(null);
  const [editingSector, setEditingSector] = useState<TaxonomySector | null>(null);

  // Fetch data
  const { data: tipos, isLoading: loadingTipos } = useQuery({
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

  const { data: subcategorias, isLoading: loadingSubcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_subcategorias')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

  const { data: sectores, isLoading: loadingSectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  // Mutations for Tipos
  const tipoMutation = useMutation({
    mutationFn: async (data: { tipo: Partial<TaxonomyTipo>; isEdit: boolean }) => {
      if (data.isEdit && editingTipo) {
        const { error } = await supabase
          .from('taxonomy_tipos')
          .update({
            codigo: data.tipo.codigo,
            nombre: data.tipo.nombre,
            descripcion: data.tipo.descripcion,
          })
          .eq('id', editingTipo.id);
        if (error) throw error;
        await syncTipoUpdate(editingTipo.id, data.tipo);
      } else {
        const { data: inserted, error } = await supabase
          .from('taxonomy_tipos')
          .insert({
            codigo: data.tipo.codigo!,
            nombre: data.tipo.nombre!,
            descripcion: data.tipo.descripcion,
          })
          .select()
          .single();
        if (error) throw error;
        await syncTipoInsert({ ...data.tipo, id: inserted.id });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy-tipos'] });
      setTipoModalOpen(false);
      setEditingTipo(null);
      toast({
        title: variables.isEdit ? 'Tipo actualizado' : 'Tipo creado',
        description: 'Los cambios se han sincronizado con Supabase externo',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for Subcategorias
  const subcategoriaMutation = useMutation({
    mutationFn: async (data: { subcategoria: Partial<TaxonomySubcategoria>; isEdit: boolean }) => {
      if (data.isEdit && editingSubcategoria) {
        const { error } = await supabase
          .from('taxonomy_subcategorias')
          .update({
            codigo: data.subcategoria.codigo,
            nombre: data.subcategoria.nombre,
            tipo_id: data.subcategoria.tipo_id,
          })
          .eq('id', editingSubcategoria.id);
        if (error) throw error;
        await syncSubcategoriaUpdate(editingSubcategoria.id, data.subcategoria);
      } else {
        const { data: inserted, error } = await supabase
          .from('taxonomy_subcategorias')
          .insert({
            codigo: data.subcategoria.codigo!,
            nombre: data.subcategoria.nombre!,
            tipo_id: data.subcategoria.tipo_id,
          })
          .select()
          .single();
        if (error) throw error;
        await syncSubcategoriaInsert({ ...data.subcategoria, id: inserted.id });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy-subcategorias'] });
      setSubcategoriaModalOpen(false);
      setEditingSubcategoria(null);
      toast({
        title: variables.isEdit ? 'Subcategoría actualizada' : 'Subcategoría creada',
        description: 'Los cambios se han sincronizado con Supabase externo',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for Sectores
  const sectorMutation = useMutation({
    mutationFn: async (data: { sector: Partial<TaxonomySector>; isEdit: boolean }) => {
      if (data.isEdit && editingSector) {
        const { error } = await supabase
          .from('taxonomy_sectores')
          .update({
            nombre: data.sector.nombre,
            descripcion: data.sector.descripcion,
          })
          .eq('id', editingSector.id);
        if (error) throw error;
        await syncSectorUpdate(editingSector.id, data.sector);
      } else {
        const { error } = await supabase
          .from('taxonomy_sectores')
          .insert({
            id: data.sector.id!,
            nombre: data.sector.nombre!,
            descripcion: data.sector.descripcion,
          });
        if (error) throw error;
        await syncSectorInsert(data.sector);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy-sectores'] });
      setSectorModalOpen(false);
      setEditingSector(null);
      toast({
        title: variables.isEdit ? 'Sector actualizado' : 'Sector creado',
        description: 'Los cambios se han sincronizado con Supabase externo',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!itemToDelete) return;
      
      switch (itemToDelete.type) {
        case 'tipo':
          const { error: tipoError } = await supabase
            .from('taxonomy_tipos')
            .delete()
            .eq('id', Number(itemToDelete.id));
          if (tipoError) throw tipoError;
          await syncTipoDelete(Number(itemToDelete.id));
          break;
        case 'subcategoria':
          const { error: subError } = await supabase
            .from('taxonomy_subcategorias')
            .delete()
            .eq('id', Number(itemToDelete.id));
          if (subError) throw subError;
          await syncSubcategoriaDelete(Number(itemToDelete.id));
          break;
        case 'sector':
          const { error: sectorError } = await supabase
            .from('taxonomy_sectores')
            .delete()
            .eq('id', String(itemToDelete.id));
          if (sectorError) throw sectorError;
          await syncSectorDelete(String(itemToDelete.id));
          break;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy-tipos'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['taxonomy-sectores'] });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      toast({
        title: 'Eliminado',
        description: 'El elemento se ha eliminado y sincronizado',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Settings className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
        <p className="text-muted-foreground">Solo los administradores pueden gestionar la taxonomía</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Administración de Taxonomía</h1>
            <p className="text-muted-foreground">
              Gestiona tipos, subcategorías y sectores
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/settings" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tipos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tipos" className="gap-2">
            <Tag className="w-4 h-4" />
            Tipos ({tipos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="subcategorias" className="gap-2">
            <Layers className="w-4 h-4" />
            Subcategorías ({subcategorias?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sectores" className="gap-2">
            <Building2 className="w-4 h-4" />
            Sectores ({sectores?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tipos Tab */}
        <TabsContent value="tipos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tipos de Tecnología</CardTitle>
                <CardDescription>Categorías principales de clasificación</CardDescription>
              </div>
              <Button onClick={() => { setEditingTipo(null); setTipoModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTipos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {tipos?.map((tipo) => (
                    <div
                      key={tipo.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{tipo.codigo}</Badge>
                        <div>
                          <p className="font-medium">{tipo.nombre}</p>
                          {tipo.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {tipo.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingTipo(tipo); setTipoModalOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setItemToDelete({ type: 'tipo', id: tipo.id, name: tipo.nombre });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subcategorias Tab */}
        <TabsContent value="subcategorias">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subcategorías</CardTitle>
                <CardDescription>Subcategorías agrupadas por tipo</CardDescription>
              </div>
              <Button onClick={() => { setEditingSubcategoria(null); setSubcategoriaModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Subcategoría
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSubcategorias ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tipos?.map((tipo) => {
                    const tipoSubs = subcategorias?.filter(s => s.tipo_id === tipo.id) || [];
                    if (tipoSubs.length === 0) return null;
                    return (
                      <div key={tipo.id}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          {tipo.codigo} - {tipo.nombre}
                        </h4>
                        <div className="space-y-1 ml-4">
                          {tipoSubs.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{sub.codigo}</Badge>
                                <span className="text-sm">{sub.nombre}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => { setEditingSubcategoria(sub); setSubcategoriaModalOpen(true); }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setItemToDelete({ type: 'subcategoria', id: sub.id, name: sub.nombre });
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sectores Tab */}
        <TabsContent value="sectores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sectores</CardTitle>
                <CardDescription>Sectores industriales de aplicación</CardDescription>
              </div>
              <Button onClick={() => { setEditingSector(null); setSectorModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Sector
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSectores ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {sectores?.map((sector) => (
                    <div
                      key={sector.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{sector.id}</Badge>
                        <div>
                          <p className="font-medium">{sector.nombre}</p>
                          {sector.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {sector.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingSector(sector); setSectorModalOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setItemToDelete({ type: 'sector', id: sector.id, name: sector.nombre });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tipo Modal */}
      <Dialog open={tipoModalOpen} onOpenChange={setTipoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTipo ? 'Editar Tipo' : 'Nuevo Tipo'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              tipoMutation.mutate({
                tipo: {
                  codigo: formData.get('codigo') as string,
                  nombre: formData.get('nombre') as string,
                  descripcion: formData.get('descripcion') as string || null,
                },
                isEdit: !!editingTipo,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                name="codigo"
                defaultValue={editingTipo?.codigo || ''}
                placeholder="TAP"
                required
              />
            </div>
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={editingTipo?.nombre || ''}
                placeholder="Tratamiento de Agua Potable"
                required
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                defaultValue={editingTipo?.descripcion || ''}
                placeholder="Descripción opcional..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTipoModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={tipoMutation.isPending}>
                {tipoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subcategoria Modal */}
      <Dialog open={subcategoriaModalOpen} onOpenChange={setSubcategoriaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubcategoria ? 'Editar Subcategoría' : 'Nueva Subcategoría'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              subcategoriaMutation.mutate({
                subcategoria: {
                  codigo: formData.get('codigo') as string,
                  nombre: formData.get('nombre') as string,
                  tipo_id: parseInt(formData.get('tipo_id') as string) || null,
                },
                isEdit: !!editingSubcategoria,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="tipo_id">Tipo</Label>
              <Select name="tipo_id" defaultValue={editingSubcategoria?.tipo_id?.toString() || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos?.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id.toString()}>
                      {tipo.codigo} - {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                name="codigo"
                defaultValue={editingSubcategoria?.codigo || ''}
                placeholder="TAP-01"
                required
              />
            </div>
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={editingSubcategoria?.nombre || ''}
                placeholder="Filtración"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubcategoriaModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={subcategoriaMutation.isPending}>
                {subcategoriaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sector Modal */}
      <Dialog open={sectorModalOpen} onOpenChange={setSectorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSector ? 'Editar Sector' : 'Nuevo Sector'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              sectorMutation.mutate({
                sector: {
                  id: formData.get('id') as string,
                  nombre: formData.get('nombre') as string,
                  descripcion: formData.get('descripcion') as string || null,
                },
                isEdit: !!editingSector,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="id">ID/Código</Label>
              <Input
                id="id"
                name="id"
                defaultValue={editingSector?.id || ''}
                placeholder="IND"
                required
                disabled={!!editingSector}
              />
            </div>
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={editingSector?.nombre || ''}
                placeholder="Industrial"
                required
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                defaultValue={editingSector?.descripcion || ''}
                placeholder="Descripción opcional..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSectorModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={sectorMutation.isPending}>
                {sectorMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{itemToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El elemento se eliminará de la base de datos local y del Supabase externo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaxonomyAdmin;
