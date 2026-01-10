import React, { useState } from 'react';
import { NewCaseStudyModal } from './NewCaseStudyModal';
import { CaseStudyDetailView } from './CaseStudyDetailView';
import { CaseStudyEditView } from './CaseStudyEditView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Search,
  Plus,
  LayoutGrid,
  List,
  MapPin,
  TrendingUp,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CaseStudyFormView } from './CaseStudyFormView';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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

// Extended CaseStudy type with new fields
interface CaseStudy {
  id: string;
  name: string;
  description: string | null;
  entity_type: string | null;
  country: string | null;
  sector: string | null;
  technology_types: string[] | null;
  status: string | null;
  quality_score: number | null;
  roi_percent: number | null;
  created_at: string;
}

// Sector options (same as Documents + Municipal)
const SECTOR_OPTIONS = [
  { value: 'general', label: 'General', icon: '🌐' },
  { value: 'food_beverage', label: 'Alimentación y Bebidas', icon: '🍔' },
  { value: 'pulp_paper', label: 'Celulosa y Papel', icon: '📜' },
  { value: 'textile', label: 'Textil', icon: '👕' },
  { value: 'chemical', label: 'Química', icon: '⚗️' },
  { value: 'pharma', label: 'Farmacéutica', icon: '💊' },
  { value: 'oil_gas', label: 'Oil & Gas', icon: '⛽' },
  { value: 'metal', label: 'Metal-Mecánica', icon: '🔩' },
  { value: 'mining', label: 'Minería', icon: '⛏️' },
  { value: 'power', label: 'Energía', icon: '⚡' },
  { value: 'electronics', label: 'Electrónica/Semiconductores', icon: '💻' },
  { value: 'automotive', label: 'Automoción', icon: '🚗' },
  { value: 'cosmetics', label: 'Cosmética', icon: '🧴' },
  { value: 'municipal', label: 'Municipal', icon: '🏛️' },
];

// Sector colors mapping
const SECTOR_COLORS: Record<string, string> = {
  'general': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  'food_beverage': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'pulp_paper': 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300',
  'textile': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'chemical': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'pharma': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'oil_gas': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300',
  'metal': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  'mining': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'power': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'electronics': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'automotive': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'cosmetics': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'municipal': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

// Get sector label from value
const getSectorLabel = (sectorValue: string | null): string => {
  if (!sectorValue) return 'Sin sector';
  const sector = SECTOR_OPTIONS.find(s => s.value === sectorValue);
  return sector?.label || sectorValue;
};

// Helper to get badge color for sector
const getSectorBadge = (sector: string | null) => {
  if (!sector) return 'bg-muted text-muted-foreground';
  return SECTOR_COLORS[sector] || 'bg-muted text-muted-foreground';
};

// Status options
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  { value: 'processing', label: 'Procesando', color: 'bg-warning/20 text-warning' },
  { value: 'approved', label: 'Aprobado', color: 'bg-accent/20 text-accent' },
  { value: 'archived', label: 'Archivado', color: 'bg-secondary/20 text-secondary' },
];

// Helper to get badge color for status
const getStatusBadge = (status: string | null) => {
  const found = STATUS_OPTIONS.find(s => s.value === status);
  return found ? { color: found.color, label: found.label } : { color: 'bg-muted text-muted-foreground', label: status || 'Sin estado' };
};

export const CaseStudiesSection: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const canManage = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  // Modal state
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  
  // Detail view state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Edit mode state
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<CaseStudy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review modal state
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [reviewCaseId, setReviewCaseId] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch case studies with new fields
  const { data: caseStudies, isLoading } = useQuery({
    queryKey: ['case-studies-enhanced'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos_de_estudio')
        .select('id, name, description, entity_type, country, sector, technology_types, status, quality_score, roi_percent, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CaseStudy[];
    },
  });

  // Filter case studies
  const filteredCases = caseStudies?.filter(cs => {
    const matchesSearch = !searchQuery ||
      cs.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cs.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = sectorFilter === 'all' || cs.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' || cs.status === statusFilter;

    return matchesSearch && matchesSector && matchesStatus;
  }) || [];

  const hasActiveFilters = searchQuery || sectorFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSectorFilter('all');
    setStatusFilter('all');
  };

  // Fetch associated technologies count
  const { data: techCounts } = useQuery({
    queryKey: ['case-study-tech-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_study_technologies')
        .select('case_study_id, technology_name');
      
      if (error) return {};
      
      const counts: Record<string, string[]> = {};
      data?.forEach(t => {
        if (!counts[t.case_study_id]) counts[t.case_study_id] = [];
        counts[t.case_study_id].push(t.technology_name);
      });
      return counts;
    },
  });

  // Fetch jobs with result_data for review button
  const { data: jobsByCaseId } = useQuery({
    queryKey: ['case-study-jobs-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_study_jobs')
        .select('id, case_study_id, status, result_data, technologies_new, technologies_found')
        .eq('status', 'completed')
        .not('result_data', 'is', null);
      
      if (error) return {};
      
      // Map by case_study_id for quick lookup
      const map: Record<string, { jobId: string; hasTechnologies: boolean }> = {};
      data?.forEach(job => {
        if (job.case_study_id) {
          const resultData = job.result_data as any;
          const hasTechs = 
            (job.technologies_new && job.technologies_new > 0) ||
            (job.technologies_found && job.technologies_found > 0) ||
            (resultData?.technologies?.technologies_new?.length > 0) ||
            (resultData?.technologies?.technologies_found?.length > 0);
          
          map[job.case_study_id] = { 
            jobId: job.id, 
            hasTechnologies: !!hasTechs 
          };
        }
      });
      return map;
    },
  });

  const getTechnologies = (caseId: string): string[] => {
    return techCounts?.[caseId] || [];
  };

  // Check if case has review available
  const hasReviewAvailable = (caseId: string): { available: boolean; jobId?: string } => {
    const techCount = techCounts?.[caseId]?.length || 0;
    const jobInfo = jobsByCaseId?.[caseId];
    
    // Show review if: case has completed job with technologies AND no persisted technologies
    if (jobInfo?.hasTechnologies && techCount === 0) {
      return { available: true, jobId: jobInfo.jobId };
    }
    return { available: false };
  };

  // Handle delete case study
  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    
    setIsDeleting(true);
    try {
      // First delete associated technologies
      await supabase
        .from('case_study_technologies')
        .delete()
        .eq('case_study_id', caseToDelete.id);
      
      // Then delete the case study
      const { error } = await supabase
        .from('casos_de_estudio')
        .delete()
        .eq('id', caseToDelete.id);
      
      if (error) throw error;
      
      toast.success('Caso de estudio eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['case-study-tech-counts'] });
    } catch (error) {
      console.error('Error deleting case study:', error);
      toast.error('Error al eliminar el caso de estudio');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  };

  const openDeleteDialog = (caseStudy: CaseStudy) => {
    setCaseToDelete(caseStudy);
    setDeleteDialogOpen(true);
  };

  // Render quality score bar
  const renderQualityBar = (score: number | null) => {
    const value = score ?? 0;
    return (
      <div className="flex items-center gap-2">
        <Progress value={value} className="h-2 w-16" />
        <span className="text-xs text-muted-foreground font-medium">{value}</span>
      </div>
    );
  };

  // Render technologies chips
  const renderTechChips = (techs: string[], max: number = 3) => {
    if (techs.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    
    const shown = techs.slice(0, max);
    const remaining = techs.length - max;

    return (
      <div className="flex flex-wrap gap-1">
        {shown.map((tech, i) => (
          <Badge key={i} variant="outline" className="text-xs py-0 px-1.5">
            {tech.length > 15 ? tech.slice(0, 15) + '...' : tech}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="secondary" className="text-xs py-0 px-1.5">
            +{remaining} más
          </Badge>
        )}
      </div>
    );
  };

  // Actions dropdown
  const renderActions = (caseStudy: CaseStudy) => {
    const reviewInfo = hasReviewAvailable(caseStudy.id);
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Show "Revisar extracción" if job completed with technologies but none persisted */}
          {reviewInfo.available && (
            <>
              <DropdownMenuItem 
                onClick={() => {
                  setReviewJobId(reviewInfo.jobId!);
                  setReviewCaseId(caseStudy.id);
                }}
                className="text-primary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Revisar extracción
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setSelectedCaseId(caseStudy.id)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setEditingCaseId(caseStudy.id);
          }}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => openDeleteDialog(caseStudy)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // If editing a case, show edit view
  if (editingCaseId) {
    return (
      <CaseStudyEditView
        caseStudyId={editingCaseId}
        onBack={() => setEditingCaseId(null)}
        onSaved={() => {
          setEditingCaseId(null);
          queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
        }}
      />
    );
  }

  // If a case is selected, show detail view
  if (selectedCaseId) {
    return (
      <CaseStudyDetailView
        caseStudyId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
        onEdit={() => {
          setEditingCaseId(selectedCaseId);
          setSelectedCaseId(null);
        }}
        onDelete={() => {
          queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
          queryClient.invalidateQueries({ queryKey: ['case-study-tech-counts'] });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Casos de Estudio</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button onClick={() => setIsNewCaseModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Caso
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sector filter */}
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sectores</SelectItem>
                {SECTOR_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}

            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-1 ml-auto">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay casos de estudio</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {hasActiveFilters
                ? 'No se encontraron casos que coincidan con los filtros.'
                : 'Los casos de estudio aparecerán aquí cuando se creen o procesen.'
              }
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((cs) => {
            const techs = getTechnologies(cs.id);
            const statusInfo = getStatusBadge(cs.status);
            const reviewInfo = hasReviewAvailable(cs.id);
            
            return (
              <Card 
                key={cs.id} 
                className="group hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-2">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2">
                    {cs.sector && (
                      <Badge className={`text-xs ${getSectorBadge(cs.sector)}`}>
                        {getSectorLabel(cs.sector)}
                      </Badge>
                    )}
                    <Badge className={`text-xs ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                    {/* Show pending review badge */}
                    {reviewInfo.available && (
                      <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Revisión pendiente
                      </Badge>
                    )}
                  </div>
                  
                  {/* Title */}
                  <CardTitle className="text-base line-clamp-2 leading-tight">
                    {cs.name}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Country + ROI row */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{cs.country || 'Sin país'}</span>
                    </div>
                    {cs.roi_percent !== null && (
                      <div className="flex items-center gap-1 text-accent">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="font-medium">{cs.roi_percent}% ROI</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Technologies */}
                  <div>
                    {renderTechChips(techs)}
                  </div>
                  
                  {/* Quality Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Quality Score</span>
                    {renderQualityBar(cs.quality_score)}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    {reviewInfo.available ? (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setReviewJobId(reviewInfo.jobId!);
                          setReviewCaseId(cs.id);
                        }}
                        className="gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Revisar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCaseId(cs.id)}
                      >
                        Ver detalle
                      </Button>
                    )}
                    {renderActions(cs)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>País</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Tecnologías</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((cs) => {
                const techs = getTechnologies(cs.id);
                const statusInfo = getStatusBadge(cs.status);
                
                return (
                  <TableRow key={cs.id}>
                    <TableCell>
                      <button 
                        className="font-medium text-left hover:text-primary transition-colors"
                        onClick={() => setSelectedCaseId(cs.id)}
                      >
                        {cs.name.length > 40 ? cs.name.slice(0, 40) + '...' : cs.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      {cs.sector ? (
                        <Badge className={`text-xs ${getSectorBadge(cs.sector)}`}>
                          {getSectorLabel(cs.sector)}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {cs.country || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cs.roi_percent !== null ? (
                        <span className="text-accent font-medium">{cs.roi_percent}%</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {renderTechChips(techs, 2)}
                    </TableCell>
                    <TableCell>
                      {renderQualityBar(cs.quality_score)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {renderActions(cs)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Results count */}
      {!isLoading && filteredCases.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {filteredCases.length} de {caseStudies?.length || 0} casos
        </p>
      )}

      {/* New Case Study Modal */}
      <NewCaseStudyModal
        open={isNewCaseModalOpen}
        onOpenChange={setIsNewCaseModalOpen}
        onCompleted={() => {
          // Refresh case studies list after processing completes
          queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
          queryClient.invalidateQueries({ queryKey: ['case-study-tech-counts'] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar caso de estudio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el caso de estudio "{caseToDelete?.name}" y todas sus tecnologías asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Extraction Modal */}
      <Dialog 
        open={!!reviewJobId} 
        onOpenChange={(open) => {
          if (!open) {
            setReviewJobId(null);
            setReviewCaseId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="flex flex-col flex-1 min-h-0">
            {reviewJobId && (
              <CaseStudyFormView
              jobId={reviewJobId}
              existingCaseId={reviewCaseId || undefined}
              onBack={() => {
                setReviewJobId(null);
                setReviewCaseId(null);
              }}
              onSaved={() => {
                setReviewJobId(null);
                setReviewCaseId(null);
                queryClient.invalidateQueries({ queryKey: ['case-studies-enhanced'] });
                queryClient.invalidateQueries({ queryKey: ['case-study-tech-counts'] });
                queryClient.invalidateQueries({ queryKey: ['case-study-jobs-map'] });
              }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseStudiesSection;
