import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTaxonomy3Levels } from '@/hooks/useTaxonomy3Levels';
import { useTechnologyStatsByTaxonomy } from '@/hooks/useTechnologyStatsByTaxonomy';
import { TaxonomyTreeView } from '@/components/taxonomy/TaxonomyTreeView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Download, FileText, FolderTree, Layers, Tag, PieChart, BarChart3, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { generateTaxonomyDocumentation } from '@/lib/generateTaxonomyDocumentation';
import { useMemo, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const TaxonomyAdmin = () => {
  const { profile } = useAuth();
  const { taxonomyData, isLoading, error } = useTaxonomy3Levels();
  const { data: techStats, isLoading: isLoadingTechStats } = useTechnologyStatsByTaxonomy();
  const [searchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  
  const view = searchParams.get('view') || 'tree';
  const isAdmin = profile?.role === 'admin';

  // Map tech types to taxonomy categories (moved to top level)
  const techsByCategory = useMemo(() => {
    if (!taxonomyData?.taxonomy || !techStats?.typeCounts) return [];

    const categoryMap: Record<string, { nombre: string; tipos: { tipo: string; count: number }[]; totalCount: number }> = {};

    // Initialize categories from taxonomy
    Object.entries(taxonomyData.taxonomy).forEach(([codigo, categoria]) => {
      categoryMap[codigo] = {
        nombre: categoria.nombre,
        tipos: [],
        totalCount: 0,
      };
    });

    // Map each technology type to its category
    techStats.typeCounts.forEach(({ tipo, count }) => {
      // Find which category this type belongs to
      let foundCategory: string | null = null;
      Object.entries(taxonomyData.taxonomy).forEach(([codigo, categoria]) => {
        if (Object.keys(categoria.tipos).includes(tipo)) {
          foundCategory = codigo;
        }
      });

      if (foundCategory && categoryMap[foundCategory]) {
        categoryMap[foundCategory].tipos.push({ tipo, count });
        categoryMap[foundCategory].totalCount += count;
      }
    });

    // Convert to array and sort by total count
    return Object.entries(categoryMap)
      .map(([codigo, data]) => ({
        codigo,
        ...data,
      }))
      .filter(cat => cat.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [taxonomyData, techStats]);

  const uncategorizedCount = useMemo(() => {
    if (!taxonomyData?.taxonomy || !techStats?.typeCounts) return 0;
    
    let count = 0;
    techStats.typeCounts.forEach(({ tipo, count: typeCount }) => {
      let found = false;
      Object.values(taxonomyData.taxonomy).forEach((categoria) => {
        if (Object.keys(categoria.tipos).includes(tipo)) {
          found = true;
        }
      });
      if (!found) {
        count += typeCount;
      }
    });
    return count;
  }, [taxonomyData, techStats]);

  const handleDownloadWord = async () => {
    if (!taxonomyData) {
      toast.error('No hay datos de taxonomía para exportar');
      return;
    }

    setIsExporting(true);
    try {
      await generateTaxonomyDocumentation();
      toast.success('Documento Word generado correctamente');
    } catch (err) {
      console.error('Error generating Word document:', err);
      toast.error('Error al generar el documento');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a esta página. Se requiere rol de administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !taxonomyData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar la taxonomía: {error?.message || 'Error desconocido'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Export view
  if (view === 'export') {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              Exportar Documentación
            </h1>
            <p className="text-muted-foreground mt-1">
              Genera documentos con la estructura completa de taxonomía
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documento Word
              </CardTitle>
              <CardDescription>
                Exporta la taxonomía completa en formato Microsoft Word (.docx)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>El documento incluye:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>{taxonomyData.counts.categorias} categorías con descripciones</li>
                  <li>{taxonomyData.counts.tipos} tipos organizados jerárquicamente</li>
                  <li>{taxonomyData.counts.subcategorias} subcategorías detalladas</li>
                  <li>Tabla de contenidos automática</li>
                </ul>
              </div>
              <Button onClick={handleDownloadWord} disabled={isExporting} className="w-full gap-2">
                {isExporting ? (
                  <>Generando...</>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar Word
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen de Exportación
              </CardTitle>
              <CardDescription>
                Vista previa del contenido a exportar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Categorías</span>
                  <Badge variant="secondary">{taxonomyData.counts.categorias}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tipos</span>
                  <Badge variant="secondary">{taxonomyData.counts.tipos}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Subcategorías</span>
                  <Badge variant="secondary">{taxonomyData.counts.subcategorias}</Badge>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Versión: {taxonomyData.version}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Stats view - Technology statistics by Category and Type
  if (view === 'stats') {
    if (isLoadingTechStats) {
      return (
        <div className="container mx-auto py-8 px-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Estadísticas de Tecnologías
            </h1>
            <p className="text-muted-foreground mt-1">
              Distribución de tecnologías por categoría y tipo
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{techStats?.totalTechnologies || 0}</div>
              <p className="text-sm text-muted-foreground">Total Tecnologías</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{techStats?.uniqueTypes || 0}</div>
              <p className="text-sm text-muted-foreground">Tipos Únicos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{techsByCategory.length}</div>
              <p className="text-sm text-muted-foreground">Categorías con Datos</p>
            </CardContent>
          </Card>
        </div>

        {/* Technologies by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Tecnologías por Categoría
            </CardTitle>
            <CardDescription>
              Distribución de tecnologías agrupadas por categoría y tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {techsByCategory.map((cat) => {
              const percentage = techStats?.totalTechnologies 
                ? (cat.totalCount / techStats.totalTechnologies) * 100 
                : 0;
              return (
                <div key={cat.codigo} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {cat.codigo}
                      </Badge>
                      <span className="font-medium">
                        {cat.nombre}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {cat.totalCount} tecnologías ({percentage.toFixed(1)}%)
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  
                  {/* Types within this category */}
                  <div className="ml-6 space-y-2">
                    {cat.tipos.slice(0, 5).map((typeData) => (
                      <div key={typeData.tipo} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground truncate max-w-[300px]">
                          {typeData.tipo}
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {typeData.count}
                        </Badge>
                      </div>
                    ))}
                    {cat.tipos.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{cat.tipos.length - 5} tipos más...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {uncategorizedCount > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sin categoría asignada</span>
                  <Badge variant="destructive">{uncategorizedCount}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top 15 Tipos de Tecnología
            </CardTitle>
            <CardDescription>
              Los tipos con mayor cantidad de tecnologías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {techStats?.typeCounts.slice(0, 15).map((typeData, idx) => {
                const percentage = techStats.totalTechnologies 
                  ? (typeData.count / techStats.totalTechnologies) * 100 
                  : 0;
                return (
                  <div key={typeData.tipo} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{typeData.tipo}</p>
                      </div>
                      <Badge>{typeData.count}</Badge>
                    </div>
                    <div className="ml-9">
                      <Progress value={percentage} className="h-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Tree view
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            Taxonomía de 3 Niveles
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema de clasificación jerárquica (v{taxonomyData.version})
          </p>
        </div>
        <Button onClick={handleDownloadWord} variant="outline" className="gap-2" disabled={isExporting}>
          <Download className="h-4 w-4" />
          {isExporting ? 'Generando...' : 'Descargar Word'}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Categorías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {taxonomyData.counts.categorias}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivel 1 - Áreas principales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Tipos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {taxonomyData.counts.tipos}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivel 2 - Clasificaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Subcategorías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {taxonomyData.counts.subcategorias}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivel 3 - Tecnologías específicas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tree view */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura de Taxonomía</CardTitle>
          <CardDescription>
            Explora la jerarquía completa de categorías, tipos y subcategorías
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomyTreeView taxonomyData={taxonomyData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxonomyAdmin;
