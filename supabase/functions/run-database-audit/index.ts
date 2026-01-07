import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnInfo {
  name: string;
  type: string;
  language: 'en' | 'es' | 'mixed';
}

interface TableInfo {
  name: string;
  description: string;
  columns: ColumnInfo[];
}

interface Inconsistency {
  type: string;
  severity: 'high' | 'medium' | 'low';
  tables: string[];
  description: string;
  examples: string[];
}

interface Recommendation {
  priority: 'alta' | 'media' | 'baja';
  action: string;
  description: string;
  before: string;
  after: string;
}

interface AuditResult {
  timestamp: string;
  tables: TableInfo[];
  inconsistencies: Inconsistency[];
  recommendations: Recommendation[];
  summary: {
    totalTables: number;
    totalColumns: number;
    spanishColumns: number;
    englishColumns: number;
    mixedColumns: number;
    highSeverityIssues: number;
    mediumSeverityIssues: number;
    lowSeverityIssues: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting database audit...');

    // Get table info from information_schema
    const { data: tableColumns, error: schemaError } = await supabase
      .from('technologies')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('Error accessing database:', schemaError);
    }

    // Define the tables to audit based on the actual schema
    const tablesToAudit = [
      'technologies',
      'scouting_queue', 
      'rejected_technologies',
      'casos_de_estudio',
      'technological_trends',
      'taxonomy_tipos',
      'taxonomy_subcategorias',
      'taxonomy_sectores',
      'scouting_sources',
      'projects',
      'profiles',
    ];

    const tables: TableInfo[] = [];
    
    // Analyze each table by sampling a row
    for (const tableName of tablesToAudit) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`Could not access table ${tableName}:`, error.message);
          continue;
        }

        // Get column names from the sample or empty object
        const sampleRow = data?.[0] || {};
        const columns: ColumnInfo[] = Object.keys(sampleRow).map(colName => {
          const value = sampleRow[colName];
          const type = value === null ? 'unknown' : typeof value;
          
          // Detect language based on column name patterns
          const hasSpanishChars = /[áéíóúñüÁÉÍÓÚÑÜ]/.test(colName);
          const hasSpaces = /\s/.test(colName);
          const isSnakeCase = /^[a-z_]+$/.test(colName);
          const hasMixedPatterns = /[A-Z]/.test(colName) && /[a-z]/.test(colName);
          
          let language: 'en' | 'es' | 'mixed' = 'en';
          if (hasSpanishChars || hasSpaces) {
            language = 'es';
          } else if (hasMixedPatterns) {
            language = 'mixed';
          }

          return {
            name: colName,
            type: type,
            language: language,
          };
        });

        tables.push({
          name: tableName,
          description: getTableDescription(tableName),
          columns: columns,
        });
      } catch (e) {
        console.log(`Error processing table ${tableName}:`, e);
      }
    }

    console.log(`Analyzed ${tables.length} tables`);

    // Analyze inconsistencies
    const inconsistencies: Inconsistency[] = [];

    // Check for language mixing
    const tablesWithMixedLanguage = tables.filter(t => {
      const spanishCols = t.columns.filter(c => c.language === 'es');
      const englishCols = t.columns.filter(c => c.language === 'en');
      return spanishCols.length > 0 && englishCols.length > 0;
    });

    if (tablesWithMixedLanguage.length > 0) {
      const examples: string[] = [];
      tablesWithMixedLanguage.forEach(t => {
        const spanishExample = t.columns.find(c => c.language === 'es')?.name;
        const englishExample = t.columns.find(c => c.language === 'en')?.name;
        if (spanishExample && englishExample) {
          examples.push(`${t.name}: "${spanishExample}" vs "${englishExample}"`);
        }
      });

      inconsistencies.push({
        type: 'language_mix',
        severity: 'high',
        tables: tablesWithMixedLanguage.map(t => t.name),
        description: 'Mezcla de campos en español (con espacios y acentos) e inglés (snake_case)',
        examples: examples.slice(0, 5),
      });
    }

    // Check for naming convention issues
    const tablesWithNamingIssues = tables.filter(t => {
      return t.columns.some(c => 
        /[\s\/\(\)]/.test(c.name) // has spaces, slashes, or parentheses
      );
    });

    if (tablesWithNamingIssues.length > 0) {
      const examples: string[] = [];
      tablesWithNamingIssues.forEach(t => {
        t.columns.filter(c => /[\s\/\(\)]/.test(c.name)).forEach(c => {
          if (examples.length < 5) {
            examples.push(`"${c.name}" - contiene caracteres especiales`);
          }
        });
      });

      inconsistencies.push({
        type: 'naming_convention',
        severity: 'high',
        tables: tablesWithNamingIssues.map(t => t.name),
        description: 'Campos de negocio usan espacios y caracteres especiales, campos técnicos usan snake_case',
        examples: examples,
      });
    }

    // Check for semantic inconsistencies between tables
    const techTable = tables.find(t => t.name === 'technologies');
    const casosTable = tables.find(t => t.name === 'casos_de_estudio');
    const trendsTable = tables.find(t => t.name === 'technological_trends');

    if (techTable && (casosTable || trendsTable)) {
      const semanticExamples: string[] = [];
      
      if (techTable.columns.some(c => c.name === 'Nombre de la tecnología')) {
        if (casosTable?.columns.some(c => c.name === 'name')) {
          semanticExamples.push('technologies."Nombre de la tecnología" vs casos_de_estudio.name');
        }
        if (trendsTable?.columns.some(c => c.name === 'name')) {
          semanticExamples.push('technologies."Nombre de la tecnología" vs technological_trends.name');
        }
      }

      if (techTable.columns.some(c => c.name === 'País de origen') && casosTable?.columns.some(c => c.name === 'country')) {
        semanticExamples.push('technologies."País de origen" vs casos_de_estudio.country');
      }

      if (semanticExamples.length > 0) {
        inconsistencies.push({
          type: 'semantic_inconsistency',
          severity: 'medium',
          tables: ['technologies', 'casos_de_estudio', 'technological_trends'].filter(t => tables.some(tab => tab.name === t)),
          description: 'Campos que representan lo mismo tienen nombres diferentes entre tablas',
          examples: semanticExamples,
        });
      }
    }

    // Generate recommendations based on findings
    const recommendations: Recommendation[] = [];

    if (inconsistencies.some(i => i.type === 'language_mix' || i.type === 'naming_convention')) {
      recommendations.push({
        priority: 'alta',
        action: 'Estandarizar nombres de campos de negocio',
        description: 'Usar snake_case en español para todos los campos de negocio. Eliminar espacios, tildes y caracteres especiales.',
        before: '"Nombre de la tecnología", "País de origen", "Proveedor / Empresa"',
        after: 'nombre_tecnologia, pais_origen, proveedor_empresa',
      });
    }

    if (inconsistencies.some(i => i.type === 'semantic_inconsistency')) {
      recommendations.push({
        priority: 'alta',
        action: 'Unificar nomenclatura entre tablas relacionadas',
        description: 'casos_de_estudio y technological_trends deben usar los mismos nombres que technologies',
        before: 'name, country, technology_type, subcategory',
        after: 'nombre_tecnologia, pais_origen, tipo_tecnologia, subcategoria',
      });
    }

    // Check for orthographic issues
    const hasOrthographicIssues = tables.some(t => 
      t.columns.some(c => c.name.includes('Paises') || c.name.includes('actua'))
    );

    if (hasOrthographicIssues) {
      recommendations.push({
        priority: 'media',
        action: 'Corregir inconsistencias ortográficas',
        description: 'Corregir campos que tienen errores ortográficos o faltan tildes',
        before: '"Paises donde actua"',
        after: '"Países donde actúa" o paises_donde_actua',
      });
    }

    // Calculate summary
    let totalColumns = 0;
    let spanishColumns = 0;
    let englishColumns = 0;
    let mixedColumns = 0;

    tables.forEach(t => {
      t.columns.forEach(c => {
        totalColumns++;
        if (c.language === 'es') spanishColumns++;
        else if (c.language === 'en') englishColumns++;
        else mixedColumns++;
      });
    });

    const auditResult: AuditResult = {
      timestamp: new Date().toISOString(),
      tables: tables,
      inconsistencies: inconsistencies,
      recommendations: recommendations,
      summary: {
        totalTables: tables.length,
        totalColumns: totalColumns,
        spanishColumns: spanishColumns,
        englishColumns: englishColumns,
        mixedColumns: mixedColumns,
        highSeverityIssues: inconsistencies.filter(i => i.severity === 'high').length,
        mediumSeverityIssues: inconsistencies.filter(i => i.severity === 'medium').length,
        lowSeverityIssues: inconsistencies.filter(i => i.severity === 'low').length,
      },
    };

    console.log('Audit completed successfully');

    return new Response(JSON.stringify(auditResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error running database audit:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Failed to run database audit'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getTableDescription(tableName: string): string {
  const descriptions: Record<string, string> = {
    'technologies': 'Tabla principal de tecnologías',
    'scouting_queue': 'Cola de tecnologías pendientes de revisión',
    'rejected_technologies': 'Tecnologías rechazadas',
    'casos_de_estudio': 'Casos de estudio',
    'technological_trends': 'Tendencias tecnológicas',
    'taxonomy_tipos': 'Tipos de tecnología (taxonomía)',
    'taxonomy_subcategorias': 'Subcategorías (taxonomía)',
    'taxonomy_sectores': 'Sectores (taxonomía)',
    'scouting_sources': 'Fuentes de scouting',
    'projects': 'Proyectos',
    'profiles': 'Perfiles de usuario',
  };
  return descriptions[tableName] || tableName;
}
