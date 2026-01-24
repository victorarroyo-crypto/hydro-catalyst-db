/**
 * Data Quality Control Page
 * 
 * Comprehensive module for auditing and improving technology database quality:
 * - Dashboard with health metrics
 * - Incomplete data detection
 * - Duplicate detection
 * - Generic name identification
 * - Taxonomy classification management
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import { useDataQualityStats } from '@/hooks/useDataQualityStats';
import { QualityDashboard } from '@/components/quality/QualityDashboard';
import { IncompleteDataTab } from '@/components/quality/IncompleteDataTab';
import { GenericNamesTab } from '@/components/quality/GenericNamesTab';
import { DuplicatesTab } from '@/components/quality/DuplicatesTab';
import { ClassificationTab } from '@/components/quality/ClassificationTab';
import { TechnologyUnifiedModal } from '@/components/TechnologyUnifiedModal';
import { toast } from 'sonner';

export default function DataQualityControl() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [issueFilter, setIssueFilter] = useState<string | undefined>();
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const duplicateGroups = getDuplicates();

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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
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
            />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-0">
            <DuplicatesTab
              duplicateGroups={duplicateGroups}
              onOpenTechnology={handleOpenTechnology}
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
    </div>
  );
}
