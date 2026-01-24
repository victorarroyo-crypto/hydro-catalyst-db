import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Field mappings for the external Supabase database
 * 
 * IMPORTANT: 
 * - technologies table uses snake_case columns
 * - scouting_queue and rejected_technologies use Spanish names with spaces (legacy)
 * 
 * Last updated: 2026-01-24
 */
const fieldMappings = {
  version: "2.0",
  description: "Esquema oficial de tablas en BD externa. Technologies usa snake_case, scouting_queue/rejected usan nombres con espacios.",
  last_updated: "2026-01-24",
  tables: {
    technologies: {
      description: "Tabla principal de tecnologías validadas - snake_case",
      fields: {
        id: { column: "id", type: "uuid" },
        nombre: { column: "nombre", type: "text" },
        proveedor: { column: "proveedor", type: "text" },
        pais: { column: "pais", type: "text" },
        paises_actua: { column: "paises_actua", type: "text" },
        web: { column: "web", type: "text" },
        email: { column: "email", type: "text" },
        descripcion: { column: "descripcion", type: "text" },
        aplicacion: { column: "aplicacion", type: "text" },
        ventaja: { column: "ventaja", type: "text" },
        innovacion: { column: "innovacion", type: "text" },
        trl: { column: "trl", type: "integer" },
        tipo: { column: "tipo", type: "text" },
        sector: { column: "sector", type: "text" },
        casos_referencia: { column: "casos_referencia", type: "text" },
        comentarios: { column: "comentarios", type: "text" },
        fecha_scouting: { column: "fecha_scouting", type: "text" },
        estado_seguimiento: { column: "estado_seguimiento", type: "text" },
        // 3-level taxonomy arrays
        categorias: { column: "categorias", type: "text[]", default: "'{}'::text[]" },
        tipos: { column: "tipos", type: "text[]", default: "'{}'::text[]" },
        subcategorias: { column: "subcategorias", type: "text[]", default: "'{}'::text[]" },
        // Legacy taxonomy IDs
        tipo_id: { column: "tipo_id", type: "integer", legacy: true },
        subcategoria_id: { column: "subcategoria_id", type: "integer", legacy: true },
        sector_id: { column: "sector_id", type: "varchar", legacy: true },
        subsector_industrial: { column: "subsector_industrial", type: "varchar" },
        // System fields
        status: { column: "status", type: "text" },
        quality_score: { column: "quality_score", type: "integer", default: 0 },
        review_status: { column: "review_status", type: "text", default: "'none'::text" },
        review_requested_at: { column: "review_requested_at", type: "timestamptz" },
        review_requested_by: { column: "review_requested_by", type: "uuid" },
        reviewer_id: { column: "reviewer_id", type: "uuid" },
        reviewed_at: { column: "reviewed_at", type: "timestamptz" },
        approved_at: { column: "approved_at", type: "timestamptz" },
        approved_by: { column: "approved_by", type: "uuid" },
        created_by: { column: "created_by", type: "uuid" },
        updated_by: { column: "updated_by", type: "uuid" },
        created_at: { column: "created_at", type: "timestamptz", default: "now()" },
        updated_at: { column: "updated_at", type: "timestamptz", default: "now()" },
        version: { column: "version", type: "integer", default: 1 },
        embedding: { column: "embedding", type: "vector" },
        embedding_updated_at: { column: "embedding_updated_at", type: "timestamptz" },
      }
    },
    scouting_queue: {
      description: "Cola de scouting - USA NOMBRES CON ESPACIOS (legacy)",
      fields: {
        id: "id",
        nombre_tecnologia: "Nombre de la tecnología",
        tipo_tecnologia: "Tipo de tecnología",
        subcategoria: "Subcategoría",
        sector_subsector: "Sector y subsector",
        proveedor_empresa: "Proveedor / Empresa",
        pais_origen: "País de origen",
        paises_operacion: "Paises donde actua",
        web_empresa: "Web de la empresa",
        email_contacto: "Email de contacto",
        descripcion_tecnica: "Descripción técnica breve",
        aplicacion_principal: "Aplicación principal",
        ventaja_competitiva: "Ventaja competitiva clave",
        innovacion: "Porque es innovadora",
        grado_madurez_trl: "Grado de madurez (TRL)",
        casos_referencia: "Casos de referencia",
        comentarios_analista: "Comentarios del analista",
        fecha_scouting: "Fecha de scouting",
        estado_seguimiento: "Estado del seguimiento",
        queue_status: "queue_status",
        source: "source",
        source_url: "source_url",
        priority: "priority",
        notes: "notes",
      }
    },
    rejected_technologies: {
      description: "Tecnologías rechazadas - USA NOMBRES CON ESPACIOS (legacy)",
      fields: {
        id: "id",
        original_scouting_id: "original_scouting_id",
        nombre_tecnologia: "Nombre de la tecnología",
        rejection_reason: "rejection_reason",
        rejection_category: "rejection_category",
      }
    },
    taxonomy_tipos: {
      description: "Catálogo de tipos de tecnología",
      fields: { id: "id", codigo: "codigo", nombre: "nombre", descripcion: "descripcion" }
    },
    taxonomy_subcategorias: {
      description: "Catálogo de subcategorías",
      fields: { id: "id", tipo_id: "tipo_id", codigo: "codigo", nombre: "nombre" }
    },
    taxonomy_sectores: {
      description: "Catálogo de sectores industriales",
      fields: { id: "id", nombre: "nombre", descripcion: "descripcion" }
    }
  },
  notes: {
    technologies: "La tabla technologies usa snake_case para todas las columnas",
    scouting_queue: "La tabla scouting_queue usa nombres con espacios y acentos (legacy)",
    rejected_technologies: "La tabla rejected_technologies usa nombres con espacios (legacy)",
    subcategorias: "Es un ARRAY text[], no un string. Para sistema de taxonomía 3 niveles.",
    usage_python: "import requests; mappings = requests.get('https://[tu-app].lovable.app/functions/v1/field-mappings').json()",
    usage_typescript: "import { EXTERNAL_TECH_FIELDS } from '@/constants/databaseFields';",
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(fieldMappings, null, 2),
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      } 
    }
  );
});
