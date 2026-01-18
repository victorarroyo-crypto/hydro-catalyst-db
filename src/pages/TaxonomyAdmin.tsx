import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTaxonomy3Levels } from '@/hooks/useTaxonomy3Levels';
import { TaxonomyTreeView } from '@/components/taxonomy/TaxonomyTreeView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Download, FileText, FolderTree, Layers, Tag, PieChart, BarChart3, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { generateTaxonomyDocumentation } from '@/lib/generateTaxonomyDocumentation';
import { useMemo, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const TaxonomyAdmin = () => {
  const { profile } = useAuth();
  const { taxonomyData, isLoading, error } = useTaxonomy3Levels();
  const [searchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  
  const view = searchParams.get('view') || 'tree';
  const isAdmin = profile?.role === 'admin';

  // Calculate detailed statistics
  const stats = useMemo(() => {
    if (!taxonomyData?.taxonomy) return null;

    const categoryStats = Object.entries(taxonomyData.taxonomy).map(([codigo, categoria]) => {
      const tiposCount = Object.keys(categoria.tipos).length;
      const subcatsCount = Object.values(categoria.tipos).flat().length;
      return {
        codigo,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        tiposCount,
        subcatsCount,
      };
    });

    // Sort by subcategories count
    const topCategories = [...categoryStats].sort((a, b) => b.subcatsCount - a.subcatsCount);

    // Get all types with their subcategory counts
    const typeStats: { nombre: string; categoria: string; subcatsCount: number }[] = [];
    Object.entries(taxonomyData.taxonomy).forEach(([codigo, categoria]) => {
      Object.entries(categoria.tipos).forEach(([tipo, subcats]) => {
        typeStats.push({
          nombre: tipo,
          categoria: codigo,
          subcatsCount: subcats.length,
        });
      });
    });
    const topTypes = [...typeStats].sort((a, b) => b.subcatsCount - a.subcatsCount).slice(0, 10);

    return {
      categoryStats,
      topCategories,
      topTypes,
      totalCategorias: taxonomyData.counts.categorias,
      totalTipos: taxonomyData.counts.tipos,
      totalSubcategorias: taxonomyData.counts.subcategorias,
      avgTiposPorCategoria: (taxonomyData.counts.tipos / taxonomyData.counts.categorias).toFixed(1),
      avgSubcatsPorTipo: (taxonomyData.counts.subcategorias / taxonomyData.counts.tipos).toFixed(1),
    };
  }, [taxonomyData]);

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

  // Stats view
  if (view === 'stats' && stats) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChart className="h-6 w-6 text-primary" />
              Estadísticas de Taxonomía
            </h1>
            <p className="text-muted-foreground mt-1">
              Análisis detallado de la estructura de clasificación (v{taxonomyData.version})
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.totalCategorias}</div>
              <p className="text-sm text-muted-foreground">Categorías</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.totalTipos}</div>
              <p className="text-sm text-muted-foreground">Tipos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.totalSubcategorias}</div>
              <p className="text-sm text-muted-foreground">Subcategorías</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.avgTiposPorCategoria}</div>
              <p className="text-sm text-muted-foreground">Tipos/Categoría</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.avgSubcatsPorTipo}</div>
              <p className="text-sm text-muted-foreground">Subcats/Tipo</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Distribución por Categoría
              </CardTitle>
              <CardDescription>
                Tipos y subcategorías por categoría principal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.topCategories.map((cat) => {
                const percentage = (cat.subcatsCount / stats.totalSubcategorias) * 100;
                return (
                  <div key={cat.codigo} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {cat.codigo}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {cat.nombre}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {cat.tiposCount} tipos • {cat.subcatsCount} subcats
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 10 Tipos
              </CardTitle>
              <CardDescription>
                Tipos con más subcategorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topTypes.map((type, idx) => (
                  <div key={`${type.categoria}-${type.nombre}`} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{type.nombre}</p>
                      <p className="text-xs text-muted-foreground">{type.categoria}</p>
                    </div>
                    <Badge>{type.subcatsCount} subcats</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
