import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Download,
  Edit,
  Archive,
  MapPin,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  ChevronRight,
  ExternalLink,
  FileText,
  Beaker,
  Target,
  Lightbulb,
  Cpu,
  Calendar,
  Building2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateCaseStudyWordDocument } from '@/lib/generateCaseStudyWordDocument';
import { toast } from 'sonner';

// Sector options (same as in CaseStudiesSection)
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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  { value: 'processing', label: 'Procesando', color: 'bg-warning/20 text-warning' },
  { value: 'approved', label: 'Aprobado', color: 'bg-accent/20 text-accent' },
  { value: 'archived', label: 'Archivado', color: 'bg-secondary/20 text-secondary' },
];

interface CaseStudyDetailViewProps {
  caseStudyId: string;
  onBack: () => void;
  onEdit?: () => void;
}

interface CaseStudyFull {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  sector: string | null;
  subsector_industrial?: string | null;
  status: string | null;
  quality_score: number | null;
  roi_percent: number | null;
  roi_rationale: string | null;
  capex: number | null;
  opex_year: number | null;
  payback_months: number | null;
  problem_parameters: Record<string, { value: number; unit: string }> | null;
  solution_applied: string | null;
  treatment_train: string[] | null;
  results_achieved: string | null;
  results_parameters: Record<string, { value: number; unit: string }> | null;
  lessons_learned: string | null;
  created_at: string;
}

interface CaseStudyTechnology {
  id: string;
  technology_name: string;
  provider: string | null;
  role: string;
  technology_id: string | null;
}

export const CaseStudyDetailView: React.FC<CaseStudyDetailViewProps> = ({
  caseStudyId,
  onBack,
  onEdit,
}) => {
  const { profile } = useAuth();
  const canManage = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Fetch case study
  const { data: caseStudy, isLoading } = useQuery({
    queryKey: ['case-study-detail', caseStudyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos_de_estudio')
        .select('*')
        .eq('id', caseStudyId)
        .single();

      if (error) throw error;
      // Cast through unknown to handle JSON type conversion
      return data as unknown as CaseStudyFull;
    },
  });

  // Fetch technologies
  const { data: technologies } = useQuery({
    queryKey: ['case-study-technologies', caseStudyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_study_technologies')
        .select('id, technology_name, provider, role, technology_id')
        .eq('case_study_id', caseStudyId);

      if (error) throw error;
      return data as CaseStudyTechnology[];
    },
  });

  const getSectorLabel = (sectorValue: string | null): string => {
    if (!sectorValue) return 'Sin sector';
    const sector = SECTOR_OPTIONS.find(s => s.value === sectorValue);
    return sector?.label || sectorValue;
  };

  const getSectorBadge = (sector: string | null) => {
    if (!sector) return 'bg-muted text-muted-foreground';
    return SECTOR_COLORS[sector] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (status: string | null) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found || { color: 'bg-muted text-muted-foreground', label: status || 'Sin estado' };
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadWord = async () => {
    if (!caseStudy) return;
    
    setIsDownloading(true);
    try {
      await generateCaseStudyWordDocument(caseStudy, technologies || []);
      toast.success('Documento descargado correctamente');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Error al generar el documento');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleArchive = async () => {
    // TODO: Implement archive
    console.log('Archive case study');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!caseStudy) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Caso no encontrado</h3>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(caseStudy.status);
  const recommendedTechs = technologies?.filter(t => t.role === 'Recomendada') || [];
  const evaluatedTechs = technologies?.filter(t => t.role === 'Evaluada') || [];

  // Get problem parameters
  const problemParams = caseStudy.problem_parameters || {};
  const problemParamsList = Object.entries(problemParams).map(([name, data]) => ({
    name,
    value: data.value,
    unit: data.unit,
  }));

  // Get results parameters
  const resultsParams = caseStudy.results_parameters || {};
  const dqoFinal = resultsParams['DQO_final'];
  const reduction = resultsParams['Reduccion'];

  // Truncate description
  const descriptionText = caseStudy.description || '';
  const shouldTruncate = descriptionText.length > 200;
  const displayedDescription = descriptionExpanded || !shouldTruncate
    ? descriptionText
    : descriptionText.slice(0, 200) + '...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{caseStudy.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getSectorBadge(caseStudy.sector)}>
                {getSectorLabel(caseStudy.sector)}
              </Badge>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          <Button variant="outline" onClick={handleDownloadWord} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar Word
          </Button>
          {canManage && (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumen del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                País
              </p>
              <p className="font-medium">{caseStudy.country || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Sector
              </p>
              <p className="font-medium">{getSectorLabel(caseStudy.sector)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha de Creación
              </p>
              <p className="font-medium">{new Date(caseStudy.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Puntuación de Calidad</p>
              <div className="flex items-center gap-2">
                <Progress value={caseStudy.quality_score || 0} className="h-2 flex-1" />
                <span className="text-sm font-medium">{caseStudy.quality_score || 0}/100</span>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                ROI
              </p>
              <p className="font-semibold text-lg text-accent">
                {caseStudy.roi_percent !== null ? `${caseStudy.roi_percent}%` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                CAPEX
              </p>
              <p className="font-semibold text-lg">{formatCurrency(caseStudy.capex)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                OPEX Anual
              </p>
              <p className="font-semibold text-lg">{formatCurrency(caseStudy.opex_year)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Payback
              </p>
              <p className="font-semibold text-lg">
                {caseStudy.payback_months !== null ? `${caseStudy.payback_months} meses` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tecnologías</p>
              <p className="font-semibold text-lg text-primary">
                {(technologies?.length || 0)} asociadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-destructive" />
              Problema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayedDescription || 'Sin descripción'}
              </p>
              {shouldTruncate && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                >
                  {descriptionExpanded ? 'Ver menos' : 'Ver más'}
                </Button>
              )}
            </div>
            
            {problemParamsList.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-4">
                  {problemParamsList.map((param, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm font-medium">{param.name}:</span>
                      <Badge variant="outline">
                        {param.value} {param.unit}
                      </Badge>
                      {i < problemParamsList.length - 1 && (
                        <span className="text-muted-foreground">|</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Solution Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Solución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseStudy.solution_applied || 'Sin descripción'}
            </p>
            
            {caseStudy.treatment_train && caseStudy.treatment_train.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tren de tratamiento</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {caseStudy.treatment_train.map((stage, i) => (
                      <React.Fragment key={i}>
                        <Badge variant="secondary" className="px-3 py-1">
                          {stage}
                        </Badge>
                        {i < caseStudy.treatment_train!.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Beaker className="h-5 w-5 text-accent" />
              Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseStudy.results_achieved || 'Sin descripción'}
            </p>
            
            {(dqoFinal || reduction) && (
              <>
                <Separator />
                <div className="flex gap-6">
                  {dqoFinal && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">DQO final</p>
                      <p className="text-lg font-semibold">
                        {dqoFinal.value} <span className="text-sm font-normal text-muted-foreground">{dqoFinal.unit}</span>
                      </p>
                    </div>
                  )}
                  {reduction && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reducción</p>
                      <p className="text-lg font-semibold text-accent">
                        {reduction.value}<span className="text-sm font-normal">%</span>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Technologies Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Tecnologías
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommended */}
            {recommendedTechs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Recomendadas</p>
                <div className="space-y-2">
                  {recommendedTechs.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-2 rounded-md bg-accent/5 border border-accent/20"
                    >
                      <div>
                        <p className="text-sm font-medium">{tech.technology_name}</p>
                        {tech.provider && (
                          <p className="text-xs text-muted-foreground">{tech.provider}</p>
                        )}
                      </div>
                      {tech.technology_id && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          Ver ficha
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluated */}
            {evaluatedTechs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Evaluadas</p>
                <div className="flex flex-wrap gap-2">
                  {evaluatedTechs.map((tech) => (
                    <Badge key={tech.id} variant="outline" className="py-1">
                      {tech.technology_name}
                      {tech.provider && ` (${tech.provider})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {recommendedTechs.length === 0 && evaluatedTechs.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay tecnologías asociadas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      {(caseStudy.roi_rationale || caseStudy.lessons_learned) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROI Rationale */}
          {caseStudy.roi_rationale && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Justificación del ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caseStudy.roi_rationale}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Lessons Learned */}
          {caseStudy.lessons_learned && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  Lecciones Aprendidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caseStudy.lessons_learned}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {/* Download CTA Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Documento completo</p>
                <p className="text-sm text-muted-foreground">
                  Para ver el caso completo con todos los detalles, descarga el documento Word.
                </p>
              </div>
            </div>
            <Button size="lg" onClick={handleDownloadWord} disabled={isDownloading} className="gap-2">
              {isDownloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Descargar Caso de Estudio Completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
