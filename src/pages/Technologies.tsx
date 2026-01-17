import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TechnologyFiltersPanel } from '@/components/TechnologyFiltersPanel';
import { TechnologyCard } from '@/components/TechnologyCard';
import { TechnologyTable } from '@/components/TechnologyTable';
import { TechnologyDetailModal } from '@/components/TechnologyDetailModal';
import { TechnologyFormModal } from '@/components/TechnologyFormModal';
import { AISearchBar, AISearchFilters } from '@/components/AISearchBar';
import { AIClassificationPanel } from '@/components/AIClassificationPanel';
import { useTechnologyFilters, TaxonomyFilters } from '@/hooks/useTechnologyFilters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  LayoutGrid, 
  LayoutList, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bot,
  FolderPlus,
} from 'lucide-react';
import type { Technology, TechnologyFilters } from '@/types/database';

const ITEMS_PER_PAGE = 20;
const MAX_TECHNOLOGIES_PER_PROJECT = 100;

const Technologies: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    filterOptions, 
    defaultFilters, 
    defaultTaxonomyFilters,
    taxonomyTipos,
    taxonomySubcategorias,
    taxonomySectores,
  } = useTechnologyFilters();
  const [filters, setFilters] = useState<TechnologyFilters>(defaultFilters);
  const [taxonomyFilters, setTaxonomyFilters] = useState<TaxonomyFilters>(defaultTaxonomyFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [selectedTechnology, setSelectedTechnology] = useState<Technology | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTechnology, setEditingTechnology] = useState<Technology | null>(null);
  
  // AI Search state
  const [aiSearchIds, setAiSearchIds] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showClassificationPanel, setShowClassificationPanel] = useState(false);

  // Save search as project state
  const [saveProjectModalOpen, setSaveProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'draft',
    target_date: '',
    notes: '',
  });

  // Check if user can create/edit technologies
  const canEdit = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);
  // Only admins can use AI features
  const canUseAI = profile?.role === 'admin';

  // Subscribe to real-time updates
  useRealtimeSubscription({
    tables: ['technologies', 'taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores'],
    queryKeys: [['technologies']],
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['technologies', filters, taxonomyFilters, page, aiSearchIds],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Use RPC or direct fetch with client-side filtering for complex queries
      // Fetch all technologies (bypass 1000 row limit by fetching in batches)
      const fetchAllTechnologies = async () => {
        const allRecords: Technology[] = [];
        const batchSize = 1000;
        let from = 0;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await externalSupabase
            .from('technologies')
            .select('*')
            // IMPORTANT: enforce deterministic ordering for stable pagination across batches
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, from + batchSize - 1);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allRecords.push(...(data as Technology[]));
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
        
        return allRecords;
      };
      
      const allData = await fetchAllTechnologies();

      // Apply filters client-side for reliability with Spanish column names
      let filtered = allData;

      // If AI search is active, filter by AI results first
      if (aiSearchIds && aiSearchIds.length > 0) {
        const idsSet = new Set(aiSearchIds);
        filtered = filtered.filter(t => idsSet.has(t.id));
        // Sort by AI relevance order
        filtered.sort((a, b) => aiSearchIds.indexOf(a.id) - aiSearchIds.indexOf(b.id));
      } else if (aiSearchIds && aiSearchIds.length === 0) {
        // AI search returned no results
        filtered = [];
      } else {
        // Normal filtering when no AI search is active
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(t => 
            t["Nombre de la tecnología"]?.toLowerCase().includes(searchLower) ||
            t["Proveedor / Empresa"]?.toLowerCase().includes(searchLower) ||
            t["Descripción técnica breve"]?.toLowerCase().includes(searchLower)
          );
        }

        // New taxonomy filters
        if (taxonomyFilters.tipoId) {
          if (taxonomyFilters.tipoId === -1) {
            // Filter unclassified technologies (tipo_id is null)
            filtered = filtered.filter(t => (t as any).tipo_id === null || (t as any).tipo_id === undefined);
          } else {
            filtered = filtered.filter(t => (t as any).tipo_id === taxonomyFilters.tipoId);
          }
        }

        if (taxonomyFilters.subcategoriaId) {
          filtered = filtered.filter(t => (t as any).subcategoria_id === taxonomyFilters.subcategoriaId);
        }

        if (taxonomyFilters.sectorId) {
          filtered = filtered.filter(t => (t as any).sector_id === taxonomyFilters.sectorId);
        }

        // Legacy filters
        if (filters.tipoTecnologia) {
          filtered = filtered.filter(t => t["Tipo de tecnología"] === filters.tipoTecnologia);
        }

        if (filters.subcategoria) {
          filtered = filtered.filter(t => t["Subcategoría"] === filters.subcategoria);
        }

        if (filters.pais) {
          filtered = filtered.filter(t => t["País de origen"] === filters.pais);
        }

        if (filters.sector) {
          filtered = filtered.filter(t => t["Sector y subsector"] === filters.sector);
        }

        if (filters.status) {
          filtered = filtered.filter(t => t.status === filters.status);
        }

        if (filters.trlMin > 1 || filters.trlMax < 9) {
          filtered = filtered.filter(t => {
            const trl = t["Grado de madurez (TRL)"];
            if (trl === null || trl === undefined) return false;
            return trl >= filters.trlMin && trl <= filters.trlMax;
          });
        }

        // Sort by name only when not using AI search
        filtered.sort((a, b) => 
          (a["Nombre de la tecnología"] || '').localeCompare(b["Nombre de la tecnología"] || '')
        );
      }

      // Apply pagination
      const totalCount = filtered.length;
      const paginatedData = filtered.slice(from, to + 1);

      return { technologies: paginatedData, count: totalCount };
    },
  });

  const totalPages = useMemo(() => {
    if (!data?.count) return 1;
    return Math.ceil(data.count / ITEMS_PER_PAGE);
  }, [data?.count]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setTaxonomyFilters(defaultTaxonomyFilters);
    setAiSearchIds(null);
    setPage(1);
  };

  const handleAiSearchResults = (ids: string[] | null) => {
    setAiSearchIds(ids);
    setPage(1);
    // Clear regular filters when AI search is active
    if (ids !== null) {
      setFilters(defaultFilters);
      setTaxonomyFilters(defaultTaxonomyFilters);
    }
  };

  const handleTechnologyClick = (tech: Technology) => {
    setSelectedTechnology(tech);
    setDetailModalOpen(true);
  };

  const handleEditTechnology = (tech: Technology) => {
    setEditingTechnology(tech);
    setDetailModalOpen(false);
    setFormModalOpen(true);
  };

  const handleCreateTechnology = () => {
    setEditingTechnology(null);
    setFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['technologies'] });
    setFormModalOpen(false);
    setEditingTechnology(null);
  };

  // Mutation to create project with technologies
  const createProjectMutation = useMutation({
    mutationFn: async (technologyIds: string[]) => {
      // Create the project
      const { data: projectData, error: projectError } = await externalSupabase
        .from('projects')
        .insert({
          name: newProject.name,
          description: newProject.description || null,
          status: newProject.status,
          target_date: newProject.target_date || null,
          notes: newProject.notes || null,
          created_by: user?.id,
        })
        .select('id')
        .single();
      
      if (projectError) throw projectError;

      // Add technologies to the project
      if (technologyIds.length > 0) {
        const projectTechnologies = technologyIds.map(techId => ({
          project_id: projectData.id,
          technology_id: techId,
          added_by: user?.id,
        }));

        const { error: techError } = await externalSupabase
          .from('project_technologies')
          .insert(projectTechnologies);
        
        if (techError) throw techError;
      }

      return projectData.id;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSaveProjectModalOpen(false);
      setNewProject({ name: '', description: '', status: 'draft', target_date: '', notes: '' });
      toast({ 
        title: 'Proyecto creado', 
        description: `Se añadieron las tecnologías al proyecto` 
      });
      navigate(`/projects/${projectId}`);
    },
    onError: () => {
      toast({ title: 'Error al crear proyecto', variant: 'destructive' });
    },
  });

  // Get technology IDs from current search results
  // For AI search: use all AI-matched IDs (limited to MAX_TECHNOLOGIES_PER_PROJECT)
  // For filtered search: use current page only (to avoid saving thousands)
  const getTechnologyIdsToSave = (): string[] => {
    let ids: string[] = [];
    
    // AI search returns curated, relevant results
    if (aiSearchIds && aiSearchIds.length > 0) {
      ids = aiSearchIds;
    } else if (data?.technologies) {
      // For manual filters, save only current page technologies
      ids = data.technologies.map(t => t.id);
    }
    
    // Apply security limit
    return ids.slice(0, MAX_TECHNOLOGIES_PER_PROJECT);
  };
  
  // Total technologies available before applying limit
  const totalTechsAvailable = aiSearchIds && aiSearchIds.length > 0 
    ? aiSearchIds.length 
    : (data?.technologies?.length || 0);
  
  // Check if limit will be applied
  const willApplyLimit = totalTechsAvailable > MAX_TECHNOLOGIES_PER_PROJECT;

  const handleSaveAsProject = () => {
    if (!newProject.name.trim()) return;
    const techIds = getTechnologyIdsToSave();
    if (techIds.length === 0) {
      toast({ title: 'No hay tecnologías para guardar', variant: 'destructive' });
      return;
    }
    createProjectMutation.mutate(techIds);
  };

  // Check if there are results to save
  const hasResultsToSave = !isLoading && !isAiSearching && (data?.count || 0) > 0;
  
  // Count of technologies that will be saved (respecting limit)
  const techCountToSave = Math.min(totalTechsAvailable, MAX_TECHNOLOGIES_PER_PROJECT);

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Consulta de Tecnologías
          </h1>
          <p className="text-muted-foreground">
            Explora y filtra tecnologías de tratamiento de agua industrial
          </p>
        </div>
        <div className="flex gap-2">
          {canUseAI && (
            <Button 
              variant="outline" 
              onClick={() => setShowClassificationPanel(!showClassificationPanel)}
            >
              <Bot className="w-4 h-4 mr-2" />
              Clasificar con IA
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleCreateTechnology}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tecnología
            </Button>
          )}
        </div>
      </div>

      {/* AI Classification Panel - Admin only */}
      {showClassificationPanel && canUseAI && (
        <div className="mb-6">
          <AIClassificationPanel />
        </div>
      )}

      {/* AI Search Bar - Admin only */}
      {canUseAI && (
        <div className="mb-6">
          <AISearchBar 
            onResults={handleAiSearchResults}
            isSearching={isAiSearching}
            setIsSearching={setIsAiSearching}
            activeFilters={{
              tipoId: taxonomyFilters.tipoId,
              subcategoriaId: taxonomyFilters.subcategoriaId,
              sectorId: taxonomyFilters.sectorId,
              tipoTecnologia: filters.tipoTecnologia || null,
              subcategoria: filters.subcategoria || null,
              sector: filters.sector || null,
              pais: filters.pais || null,
              trlMin: filters.trlMin || null,
              trlMax: filters.trlMax || null,
              estado: filters.status || null,
            } as AISearchFilters}
          />
        </div>
      )}

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <TechnologyFiltersPanel
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              setAiSearchIds(null); // Clear AI search when using regular filters
              setPage(1);
            }}
            filterOptions={filterOptions}
            onReset={handleResetFilters}
            taxonomyFilters={taxonomyFilters}
            onTaxonomyFiltersChange={(newTaxFilters) => {
              setTaxonomyFilters(newTaxFilters);
              setAiSearchIds(null);
              setPage(1);
            }}
            taxonomyTipos={taxonomyTipos}
            taxonomySubcategorias={taxonomySubcategorias}
            taxonomySectores={taxonomySectores}
          />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Search Bar & View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, empresa o descripción..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setAiSearchIds(null); // Clear AI search when using text search
                  setPage(1);
                }}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Results Count & Save Search Button */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading || isAiSearching ? (
                'Cargando...'
              ) : (
                <>
                  {aiSearchIds !== null && (
                    <span className="text-primary font-medium mr-2">🤖 Búsqueda IA:</span>
                  )}
                  Mostrando{' '}
                  <span className="font-medium text-foreground">
                    {data?.count ? ((page - 1) * ITEMS_PER_PAGE) + 1 : 0}-
                    {Math.min(page * ITEMS_PER_PAGE, data?.count || 0)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium text-foreground">
                    {data?.count?.toLocaleString() || 0}
                  </span>{' '}
                  tecnologías
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              {hasResultsToSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveProjectModalOpen(true)}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Guardar búsqueda
                </Button>
              )}
              {(isFetching && !isLoading) || isAiSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>

          {/* Results */}
          {isLoading || isAiSearching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.technologies?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No se encontraron tecnologías
              </h3>
              <p className="text-muted-foreground max-w-md">
                {aiSearchIds !== null 
                  ? 'Intenta reformular tu búsqueda con IA o usa los filtros tradicionales'
                  : 'Intenta ajustar los filtros o el término de búsqueda'
                }
              </p>
              <Button variant="outline" onClick={handleResetFilters} className="mt-4">
                Limpiar filtros
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.technologies.map((tech) => (
                <TechnologyCard
                  key={tech.id}
                  technology={tech}
                  onClick={() => handleTechnologyClick(tech)}
                  showQuickClassify={taxonomyFilters.tipoId === -1}
                />
              ))}
            </div>
          ) : (
            <TechnologyTable
              technologies={data?.technologies || []}
              onRowClick={handleTechnologyClick}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Technology Detail Modal */}
      <TechnologyDetailModal
        technology={selectedTechnology}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onEdit={canEdit ? () => handleEditTechnology(selectedTechnology!) : undefined}
      />

      {/* Technology Form Modal */}
      <TechnologyFormModal
        technology={editingTechnology}
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Save Search as Project Modal */}
      <Dialog open={saveProjectModalOpen} onOpenChange={setSaveProjectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Guardar búsqueda como proyecto
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se creará un nuevo proyecto con{' '}
            <span className="font-medium text-foreground">{techCountToSave} tecnologías</span>
            {aiSearchIds && aiSearchIds.length > 0 ? (
              <span className="text-primary"> (resultados de búsqueda IA)</span>
            ) : (
              <span> de la página actual</span>
            )}
            .
          </p>
          {willApplyLimit && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded-md mt-2">
              ⚠️ Se guardarán las primeras {MAX_TECHNOLOGIES_PER_PROJECT} tecnologías de {totalTechsAvailable} encontradas.
            </p>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Nombre del proyecto *</Label>
              <Input
                id="project-name"
                placeholder="Ej: Planta EDAR Valencia"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                placeholder="Describe el objetivo del proyecto..."
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-status">Estado</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">🟡 Borrador</SelectItem>
                    <SelectItem value="active">🟢 Activo</SelectItem>
                    <SelectItem value="on_hold">🔵 En espera</SelectItem>
                    <SelectItem value="closed">⚫ Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project-target-date">Fecha objetivo</Label>
                <Input
                  id="project-target-date"
                  type="date"
                  value={newProject.target_date}
                  onChange={(e) => setNewProject(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="project-notes">Notas internas</Label>
              <Textarea
                id="project-notes"
                placeholder="Notas sobre el proyecto, cliente, requisitos..."
                value={newProject.notes}
                onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveProjectModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAsProject} 
              disabled={!newProject.name.trim() || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Proyecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Technologies;
