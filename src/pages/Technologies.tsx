import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TechnologyFiltersPanel } from '@/components/TechnologyFiltersPanel';
import { TechnologyCard } from '@/components/TechnologyCard';
import { TechnologyTable } from '@/components/TechnologyTable';
import { TechnologyDetailModal } from '@/components/TechnologyDetailModal';
import { TechnologyFormModal } from '@/components/TechnologyFormModal';
import { useTechnologyFilters } from '@/hooks/useTechnologyFilters';
import { 
  Search, 
  LayoutGrid, 
  LayoutList, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { Technology, TechnologyFilters } from '@/types/database';

const ITEMS_PER_PAGE = 20;

const Technologies: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { filterOptions, defaultFilters } = useTechnologyFilters();
  const [filters, setFilters] = useState<TechnologyFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [selectedTechnology, setSelectedTechnology] = useState<Technology | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTechnology, setEditingTechnology] = useState<Technology | null>(null);

  // Check if user can create/edit technologies
  const canEdit = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['technologies', filters, page],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Build filter conditions
      const conditions: string[] = [];
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        conditions.push(
          `or("Nombre de la tecnología".ilike.%${searchTerm}%,"Proveedor / Empresa".ilike.%${searchTerm}%)`
        );
      }

      // Use RPC or direct fetch with client-side filtering for complex queries
      const { data: allData, error, count } = await supabase
        .from('technologies')
        .select('*', { count: 'exact' });

      if (error) throw error;

      // Apply filters client-side for reliability with Spanish column names
      let filtered = (allData || []) as Technology[];

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(t => 
          t["Nombre de la tecnología"]?.toLowerCase().includes(searchLower) ||
          t["Proveedor / Empresa"]?.toLowerCase().includes(searchLower) ||
          t["Descripción técnica breve"]?.toLowerCase().includes(searchLower)
        );
      }

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

      // Sort by name
      filtered.sort((a, b) => 
        (a["Nombre de la tecnología"] || '').localeCompare(b["Nombre de la tecnología"] || '')
      );

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
    setPage(1);
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
        {canEdit && (
          <Button onClick={handleCreateTechnology}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tecnología
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <TechnologyFiltersPanel
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1);
            }}
            filterOptions={filterOptions}
            onReset={handleResetFilters}
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

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                'Cargando...'
              ) : (
                <>
                  Mostrando{' '}
                  <span className="font-medium text-foreground">
                    {((page - 1) * ITEMS_PER_PAGE) + 1}-
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
            {isFetching && !isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results */}
          {isLoading ? (
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
                Intenta ajustar los filtros o el término de búsqueda
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
    </div>
  );
};

export default Technologies;
