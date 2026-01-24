/**
 * Data Quality Control Page
 * 
 * Comprehensive module for auditing and improving technology database quality:
 * - Dashboard with health metrics
 * - Incomplete data detection
 * - Duplicate detection with compare & merge
 * - Generic name identification
 * - Taxonomy classification management
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
  Database, 
  LayoutDashboard, 
  FileWarning, 
  Copy, 
  AlertTriangle, 
  Tag,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataQualityStats, type DuplicateGroup } from '@/hooks/useDataQualityStats';
import { QualityDashboard } from '@/components/quality/QualityDashboard';
import { IncompleteDataTab } from '@/components/quality/IncompleteDataTab';
import { GenericNamesTab } from '@/components/quality/GenericNamesTab';
import { DuplicatesTab } from '@/components/quality/DuplicatesTab';
import { ClassificationTab } from '@/components/quality/ClassificationTab';
import { DuplicateCompareModal } from '@/components/quality/DuplicateCompareModal';
import { TechnologyUnifiedModal } from '@/components/TechnologyUnifiedModal';
import { 
  computeMergedData, 
  executeMerge, 
  deleteTechnology,
  markAsNotDuplicate,
  getExcludedGroups,
} from '@/lib/mergeTechnologies';
import { toast } from 'sonner';

export default function DataQualityControl() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [issueFilter, setIssueFilter] = useState<string | undefined>();
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Duplicate management state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [techToDelete, setTechToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    technologies,
    stats,
    isLoading,
    refetch,
    getDuplicates,
  } = useDataQualityStats();

  // Check permissions - only internal users
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);
  
  if (!isInternalUser) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Esta sección es solo para usuarios internos.
          </p>
        </div>
      </div>
    );
  }

  // Get duplicates filtered by exclusions
  const allDuplicates = getDuplicates();
  const excludedGroups = getExcludedGroups();
  const duplicateGroups = allDuplicates.filter(g => !excludedGroups.has(g.key));

  const handleIssueClick = (issueType: string) => {
    if (issueType === 'duplicados') {
      setActiveTab('duplicates');
    } else if (issueType === 'nombre_generico') {
      setActiveTab('names');
    } else if (issueType === 'sin_clasificar') {
      setActiveTab('classification');
    } else {
      setIssueFilter(issueType);
      setActiveTab('incomplete');
    }
  };

  const handleOpenTechnology = (id: string) => {
    setSelectedTechId(id);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTechId(null);
  };

  const handleModalSuccess = () => {
    refetch();
    toast.success('Tecnología actualizada');
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    toast.info('Exportación en desarrollo');
  };

  // Duplicate management handlers
  const handleCompare = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setCompareModalOpen(true);
  };

  const handleQuickMerge = async (group: DuplicateGroup) => {
    if (group.technologies.length < 2) return;
    
    const master = group.technologies[0];
    const duplicates = group.technologies.slice(1);
    
    const confirm = window.confirm(
      `¿Fusionar ${duplicates.length} tecnología(s) en "${master.nombre}"?\n\n` +
      `Se eliminarán:\n${duplicates.map(d => `• ${d.nombre}`).join('\n')}`
    );
    
    if (!confirm) return;
    
    setIsProcessing(true);
    try {
      const { mergedData } = computeMergedData(master, duplicates);
      const result = await executeMerge(
        master.id,
        duplicates.map(d => d.id),
        mergedData
      );
      
      if (result.success) {
        toast.success(
          `Fusión completada: ${result.deletedIds.length} tecnología(s) eliminadas` +
          (result.mergedFields.length > 0 ? `, ${result.mergedFields.length} campo(s) actualizados` : '')
        );
        refetch();
      } else {
        toast.error(result.error || 'Error en la fusión');
      }
    } catch (error) {
      console.error('Quick merge error:', error);
      toast.error('Error al fusionar tecnologías');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeFromModal = async (masterId: string, duplicateIds: string[]) => {
    if (!selectedGroup) return;
    
    const master = selectedGroup.technologies.find(t => t.id === masterId);
    const duplicates = selectedGroup.technologies.filter(t => duplicateIds.includes(t.id));
    
    if (!master || duplicates.length === 0) return;
    
    setIsProcessing(true);
    try {
      const { mergedData } = computeMergedData(master, duplicates);
      const result = await executeMerge(masterId, duplicateIds, mergedData);
      
      if (result.success) {
        toast.success(
          `Fusión completada: ${result.deletedIds.length} tecnología(s) eliminadas` +
          (result.mergedFields.length > 0 ? `, ${result.mergedFields.length} campo(s) actualizados` : '')
        );
        setCompareModalOpen(false);
        refetch();
      } else {
        toast.error(result.error || 'Error en la fusión');
      }
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Error al fusionar tecnologías');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFromModal = async (id: string, name: string) => {
    setTechToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteTechnology = async (id: string, name: string) => {
    setTechToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!techToDelete) return;
    
    setIsProcessing(true);
    try {
      const result = await deleteTechnology(techToDelete.id);
      
      if (result.success) {
        toast.success(`"${techToDelete.name}" eliminada`);
        setDeleteConfirmOpen(false);
        setTechToDelete(null);
        refetch();
      } else {
        toast.error(result.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar tecnología');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsNotDuplicate = async (groupKey: string) => {
    const group = duplicateGroups.find(g => g.key === groupKey);
    if (!group) return;
    
    const result = await markAsNotDuplicate(
      groupKey,
      group.technologies.map(t => t.id),
      user?.id
    );
    
    if (result.success) {
      toast.success('Grupo marcado como no duplicados');
      refetch();
    } else {
      toast.error(result.error || 'Error al marcar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Control de Calidad BD
          </h1>
          <p className="text-muted-foreground">
            Audita y mejora la calidad de los datos de tecnologías
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isProcessing}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar Informe
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="incomplete" className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            <span className="hidden sm:inline">Incompletos</span>
            {stats.issues.noProvider + stats.issues.noWeb > 0 && (
              <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                {stats.issues.noProvider + stats.issues.noWeb}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Duplicados</span>
            {duplicateGroups.length > 0 && (
              <span className="ml-1 text-xs bg-amber-500 text-white rounded-full px-1.5">
                {duplicateGroups.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="names" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Nombres</span>
            {stats.issues.genericNames > 0 && (
              <span className="ml-1 text-xs bg-amber-500 text-white rounded-full px-1.5">
                {stats.issues.genericNames}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="classification" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Clasificación</span>
            {stats.issues.noClassification > 0 && (
              <span className="ml-1 text-xs bg-violet-500 text-white rounded-full px-1.5">
                {stats.issues.noClassification}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="mt-0">
            <QualityDashboard 
              stats={stats} 
              isLoading={isLoading} 
              onIssueClick={handleIssueClick}
            />
          </TabsContent>

          <TabsContent value="incomplete" className="mt-0">
            <IncompleteDataTab
              technologies={technologies || []}
              initialFilter={issueFilter}
              onOpenTechnology={handleOpenTechnology}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-0">
            <DuplicatesTab
              duplicateGroups={duplicateGroups}
              onOpenTechnology={handleOpenTechnology}
              onMarkAsNotDuplicate={handleMarkAsNotDuplicate}
              onCompare={handleCompare}
              onQuickMerge={handleQuickMerge}
              onDeleteTechnology={handleDeleteTechnology}
            />
          </TabsContent>

          <TabsContent value="names" className="mt-0">
            <GenericNamesTab
              technologies={technologies || []}
              onOpenTechnology={handleOpenTechnology}
            />
          </TabsContent>

          <TabsContent value="classification" className="mt-0">
            <ClassificationTab
              technologies={technologies || []}
              onOpenTechnology={handleOpenTechnology}
              onClassifyWithAI={() => navigate('/ai-classification')}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Technology Modal */}
      {selectedTechId && (
        <TechnologyUnifiedModal
          open={isModalOpen}
          onOpenChange={handleModalClose}
          technology={{ id: selectedTechId } as any}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Duplicate Compare Modal */}
      <DuplicateCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        group={selectedGroup}
        onMerge={handleMergeFromModal}
        onDelete={handleDeleteFromModal}
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tecnología?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{techToDelete?.name}" de la base de datos. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
