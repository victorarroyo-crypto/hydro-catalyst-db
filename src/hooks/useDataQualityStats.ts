/**
 * Hook for fetching data quality statistics from the external database
 * 
 * Analyzes technologies for:
 * - Missing fields (proveedor, web, país, TRL, etc.)
 * - Short descriptions
 * - Missing taxonomy classification
 * - Generic/placeholder names
 * - Potential duplicates
 */
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

// Column names in external DB (Spanish with spaces)
const COLUMNS = {
  id: 'id',
  nombre: 'Nombre de la tecnología',
  proveedor: 'Proveedor / Empresa',
  web: 'Web de la empresa',
  pais: 'País de origen',
  descripcion: 'Descripción técnica breve',
  aplicacion: 'Aplicación principal',
  ventaja: 'Ventaja competitiva clave',
  innovacion: 'Porque es innovadora',
  trl: 'Grado de madurez (TRL)',
  tipo: 'Tipo de tecnología',
  subcategoria: 'Subcategoría',
  sector: 'Sector y subsector',
  email: 'Email de contacto',
  comentarios: 'Comentarios del analista',
  tipo_id: 'tipo_id',
  subcategoria_id: 'subcategoria_id',
  sector_id: 'sector_id',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

// Patterns that indicate generic/placeholder names
const GENERIC_PATTERNS = [
  /^tecnolog[ií]a\s*(de\s*)?/i,
  /^sistema\s*(de\s*)?/i,
  /^soluci[oó]n\s*(de\s*|para\s*)?/i,
  /^tratamiento\s*(de\s*)?/i,
  /^proceso\s*(de\s*)?/i,
  /^equipo\s*(de\s*|para\s*)?/i,
  /^planta\s*(de\s*)?/i,
  /^reactor\s*(de\s*)?/i,
  /^filtro\s*(de\s*)?/i,
  /^membrana\s*(de\s*)?/i,
  /sin\s*nombre/i,
  /^n\/a$/i,
  /^-+$/,
  /^\d+$/,
  /^test/i,
  /^prueba/i,
  /^ejemplo/i,
];

export interface QualityIssue {
  id: string;
  nombre: string;
  proveedor: string | null;
  web: string | null;
  pais: string | null;
  descripcion: string | null;
  trl: number | null;
  tipo: string | null;
  subcategoria: string | null;
  sector: string | null;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  status: string | null;
  created_at: string | null;
  issues: string[];
}

export interface DuplicateGroup {
  key: string;
  technologies: QualityIssue[];
  similarityType: 'exact' | 'normalized' | 'provider';
}

export interface QualityStats {
  total: number;
  completenessScore: number;
  issues: {
    noProvider: number;
    noWeb: number;
    noCountry: number;
    noEmail: number;
    shortDescription: number;
    noTRL: number;
    noAdvantage: number;
    noInnovation: number;
    noApplication: number;
    noClassification: number;
    genericNames: number;
    potentialDuplicates: number;
  };
}

function isGenericName(name: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length < 5) return true;
  return GENERIC_PATTERNS.some(pattern => pattern.test(trimmed));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim();
}

function mapTechnology(record: Record<string, unknown>): QualityIssue {
  const issues: string[] = [];
  
  const nombre = record[COLUMNS.nombre] as string || '';
  const proveedor = record[COLUMNS.proveedor] as string | null;
  const web = record[COLUMNS.web] as string | null;
  const pais = record[COLUMNS.pais] as string | null;
  const descripcion = record[COLUMNS.descripcion] as string | null;
  const trl = record[COLUMNS.trl] as number | null;
  const tipo = record[COLUMNS.tipo] as string | null;
  const subcategoria = record[COLUMNS.subcategoria] as string | null;
  const sector = record[COLUMNS.sector] as string | null;
  const tipo_id = record[COLUMNS.tipo_id] as number | null;
  const subcategoria_id = record[COLUMNS.subcategoria_id] as number | null;
  const sector_id = record[COLUMNS.sector_id] as string | null;
  const email = record[COLUMNS.email] as string | null;
  const ventaja = record[COLUMNS.ventaja] as string | null;
  const innovacion = record[COLUMNS.innovacion] as string | null;
  const aplicacion = record[COLUMNS.aplicacion] as string | null;

  // Check for issues
  if (!proveedor?.trim()) issues.push('sin_proveedor');
  if (!web?.trim()) issues.push('sin_web');
  if (!pais?.trim()) issues.push('sin_pais');
  if (!email?.trim()) issues.push('sin_email');
  if (!descripcion?.trim() || descripcion.length < 100) issues.push('descripcion_corta');
  if (!trl) issues.push('sin_trl');
  if (!ventaja?.trim()) issues.push('sin_ventaja');
  if (!innovacion?.trim()) issues.push('sin_innovacion');
  if (!aplicacion?.trim()) issues.push('sin_aplicacion');
  if (!tipo_id && !subcategoria_id && !sector_id) issues.push('sin_clasificar');
  if (isGenericName(nombre)) issues.push('nombre_generico');

  return {
    id: record[COLUMNS.id] as string,
    nombre,
    proveedor,
    web,
    pais,
    descripcion,
    trl,
    tipo,
    subcategoria,
    sector,
    tipo_id,
    subcategoria_id,
    sector_id,
    status: record[COLUMNS.status] as string | null,
    created_at: record[COLUMNS.created_at] as string | null,
    issues,
  };
}

export function useDataQualityStats() {
  // Fetch all technologies for analysis
  const { data: technologies, isLoading, refetch } = useQuery({
    queryKey: ['data-quality-technologies'],
    queryFn: async () => {
      const selectFields = [
        COLUMNS.id,
        COLUMNS.nombre,
        COLUMNS.proveedor,
        COLUMNS.web,
        COLUMNS.pais,
        COLUMNS.descripcion,
        COLUMNS.aplicacion,
        COLUMNS.ventaja,
        COLUMNS.innovacion,
        COLUMNS.trl,
        COLUMNS.tipo,
        COLUMNS.subcategoria,
        COLUMNS.sector,
        COLUMNS.email,
        COLUMNS.tipo_id,
        COLUMNS.subcategoria_id,
        COLUMNS.sector_id,
        COLUMNS.status,
        COLUMNS.created_at,
        COLUMNS.updated_at,
      ].map(col => `"${col}"`).join(',');

      const { data, error } = await externalSupabase
        .from('technologies')
        .select(selectFields)
        .order(COLUMNS.nombre);

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data as any[]) || []).map((record) => mapTechnology(record as Record<string, unknown>));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate statistics
  const stats: QualityStats = {
    total: technologies?.length || 0,
    completenessScore: 0,
    issues: {
      noProvider: 0,
      noWeb: 0,
      noCountry: 0,
      noEmail: 0,
      shortDescription: 0,
      noTRL: 0,
      noAdvantage: 0,
      noInnovation: 0,
      noApplication: 0,
      noClassification: 0,
      genericNames: 0,
      potentialDuplicates: 0,
    },
  };

  if (technologies) {
    technologies.forEach(tech => {
      if (tech.issues.includes('sin_proveedor')) stats.issues.noProvider++;
      if (tech.issues.includes('sin_web')) stats.issues.noWeb++;
      if (tech.issues.includes('sin_pais')) stats.issues.noCountry++;
      if (tech.issues.includes('sin_email')) stats.issues.noEmail++;
      if (tech.issues.includes('descripcion_corta')) stats.issues.shortDescription++;
      if (tech.issues.includes('sin_trl')) stats.issues.noTRL++;
      if (tech.issues.includes('sin_ventaja')) stats.issues.noAdvantage++;
      if (tech.issues.includes('sin_innovacion')) stats.issues.noInnovation++;
      if (tech.issues.includes('sin_aplicacion')) stats.issues.noApplication++;
      if (tech.issues.includes('sin_clasificar')) stats.issues.noClassification++;
      if (tech.issues.includes('nombre_generico')) stats.issues.genericNames++;
    });

    // Calculate completeness score (% of technologies with no critical issues)
    const criticalIssues = ['sin_proveedor', 'sin_clasificar', 'nombre_generico'];
    const completeCount = technologies.filter(
      tech => !tech.issues.some(issue => criticalIssues.includes(issue))
    ).length;
    stats.completenessScore = technologies.length > 0 
      ? Math.round((completeCount / technologies.length) * 100) 
      : 0;
  }

  // Filter functions for different issue types
  const getByIssue = (issueType: string): QualityIssue[] => {
    return technologies?.filter(tech => tech.issues.includes(issueType)) || [];
  };

  // Get potential duplicates (grouped by normalized name)
  const getDuplicates = (): DuplicateGroup[] => {
    if (!technologies) return [];

    const groups: Record<string, QualityIssue[]> = {};
    
    technologies.forEach(tech => {
      const normalizedName = normalizeName(tech.nombre);
      if (normalizedName.length >= 5) {
        if (!groups[normalizedName]) {
          groups[normalizedName] = [];
        }
        groups[normalizedName].push(tech);
      }
    });

    // Also group by same provider + similar name
    const providerGroups: Record<string, QualityIssue[]> = {};
    technologies.forEach(tech => {
      if (tech.proveedor) {
        const key = normalizeName(tech.proveedor);
        if (!providerGroups[key]) {
          providerGroups[key] = [];
        }
        providerGroups[key].push(tech);
      }
    });

    const duplicates: DuplicateGroup[] = [];

    // Name-based duplicates
    Object.entries(groups).forEach(([key, techs]) => {
      if (techs.length > 1) {
        duplicates.push({
          key,
          technologies: techs,
          similarityType: 'normalized',
        });
      }
    });

    // Provider-based duplicates (same provider with 3+ technologies)
    Object.entries(providerGroups).forEach(([key, techs]) => {
      if (techs.length >= 3) {
        duplicates.push({
          key: `provider_${key}`,
          technologies: techs,
          similarityType: 'provider',
        });
      }
    });

    // Update stats
    stats.issues.potentialDuplicates = duplicates.reduce((sum, g) => sum + g.technologies.length, 0);

    return duplicates;
  };

  return {
    technologies,
    stats,
    isLoading,
    refetch,
    // Filter helpers
    getNoProvider: () => getByIssue('sin_proveedor'),
    getNoWeb: () => getByIssue('sin_web'),
    getNoCountry: () => getByIssue('sin_pais'),
    getNoEmail: () => getByIssue('sin_email'),
    getShortDescription: () => getByIssue('descripcion_corta'),
    getNoTRL: () => getByIssue('sin_trl'),
    getNoAdvantage: () => getByIssue('sin_ventaja'),
    getNoInnovation: () => getByIssue('sin_innovacion'),
    getNoApplication: () => getByIssue('sin_aplicacion'),
    getNoClassification: () => getByIssue('sin_clasificar'),
    getGenericNames: () => getByIssue('nombre_generico'),
    getDuplicates,
    getByIssue,
  };
}
