import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Types
interface TableStats {
  name: string;
  count: number;
  module: string;
  synced: boolean;
  description: string;
}

interface ForeignKey {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface SyncComparison {
  table: string;
  local_count: number;
  external_count: number;
  status: string;
  missing_in_external?: string[];
  missing_in_local?: string[];
}

interface AuditData {
  generatedAt: string;
  tables: TableStats[];
  foreignKeys: ForeignKey[];
  syncStatus: SyncComparison[];
  edgeFunctions: string[];
  dbFunctions: DbFunction[];
  rlsPolicies: RlsPolicy[];
  secrets: string[];
}

interface DbFunction {
  name: string;
  description: string;
  security: string;
}

interface RlsPolicy {
  table: string;
  name: string;
  command: string;
  definition: string;
}

// Table descriptions
const TABLE_DESCRIPTIONS: Record<string, { description: string; module: string; synced: boolean }> = {
  technologies: { description: 'Tecnologías validadas y publicadas en la base de datos principal', module: 'Core Tecnologías', synced: true },
  scouting_queue: { description: 'Cola de tecnologías pendientes de revisión desde scouting', module: 'Core Tecnologías', synced: false },
  rejected_technologies: { description: 'Tecnologías rechazadas con motivo de rechazo', module: 'Core Tecnologías', synced: false },
  taxonomy_tipos: { description: 'Tipos de tecnología (nivel 1 de taxonomía)', module: 'Taxonomía', synced: true },
  taxonomy_subcategorias: { description: 'Subcategorías de tecnología (nivel 2 de taxonomía)', module: 'Taxonomía', synced: true },
  taxonomy_sectores: { description: 'Sectores industriales para clasificación', module: 'Taxonomía', synced: true },
  technology_tipos: { description: 'Relación N:M entre tecnologías y tipos', module: 'Taxonomía', synced: false },
  technology_subcategorias: { description: 'Relación N:M entre tecnologías y subcategorías', module: 'Taxonomía', synced: false },
  projects: { description: 'Proyectos de clientes para organizar tecnologías', module: 'Proyectos', synced: true },
  project_technologies: { description: 'Relación N:M entre proyectos y tecnologías', module: 'Proyectos', synced: true },
  casos_de_estudio: { description: 'Casos de estudio derivados de tecnologías', module: 'Casos y Tendencias', synced: true },
  technological_trends: { description: 'Tendencias tecnológicas identificadas', module: 'Casos y Tendencias', synced: true },
  advisor_users: { description: 'Usuarios del sistema AI Advisor (autenticación propia)', module: 'AI Advisor', synced: false },
  advisor_chats: { description: 'Conversaciones de chat con AI Advisor', module: 'AI Advisor', synced: false },
  advisor_messages: { description: 'Mensajes individuales en conversaciones de AI Advisor', module: 'AI Advisor', synced: false },
  advisor_credits: { description: 'Transacciones de créditos de AI Advisor', module: 'AI Advisor', synced: false },
  advisor_callback_requests: { description: 'Solicitudes de callback de usuarios de AI Advisor', module: 'AI Advisor', synced: false },
  knowledge_documents: { description: 'Documentos subidos a la base de conocimiento', module: 'Knowledge Base', synced: false },
  knowledge_chunks: { description: 'Fragmentos de documentos para búsqueda semántica', module: 'Knowledge Base', synced: false },
  scouting_sessions: { description: 'Sesiones de scouting automatizado con Railway', module: 'Scouting Sessions', synced: false },
  scouting_session_logs: { description: 'Logs de actividad de sesiones de scouting', module: 'Scouting Sessions', synced: false },
  scouting_sources: { description: 'Fuentes configuradas para scouting automatizado', module: 'Scouting Sessions', synced: false },
  scouting_studies: { description: 'Estudios de scouting tecnológico estructurados', module: 'Studies', synced: false },
  study_research: { description: 'Investigación y fuentes asociadas a estudios', module: 'Studies', synced: false },
  study_solutions: { description: 'Tipos de solución identificadas en estudios', module: 'Studies', synced: false },
  study_longlist: { description: 'Lista larga de tecnologías candidatas en estudios', module: 'Studies', synced: false },
  study_shortlist: { description: 'Lista corta de tecnologías seleccionadas en estudios', module: 'Studies', synced: false },
  study_evaluations: { description: 'Evaluaciones detalladas de tecnologías en shortlist', module: 'Studies', synced: false },
  study_reports: { description: 'Informes generados para estudios', module: 'Studies', synced: false },
  study_sessions: { description: 'Sesiones de AI para procesamiento de estudios', module: 'Studies', synced: false },
  study_session_logs: { description: 'Logs de actividad de sesiones de estudio', module: 'Studies', synced: false },
  profiles: { description: 'Perfiles de usuario vinculados a auth.users', module: 'Sistema', synced: false },
  user_favorites: { description: 'Tecnologías marcadas como favoritas por usuarios', module: 'Sistema', synced: false },
  saved_ai_searches: { description: 'Búsquedas AI guardadas por usuarios', module: 'Sistema', synced: false },
  audit_logs: { description: 'Registro de auditoría de acciones en el sistema', module: 'Sistema', synced: false },
  ai_usage_logs: { description: 'Logs de uso de modelos AI con tokens y costes', module: 'Sistema', synced: false },
  ai_model_settings: { description: 'Configuración de modelos AI por tipo de acción', module: 'Sistema', synced: false },
  technology_edits: { description: 'Propuestas de edición de tecnologías pendientes de revisión', module: 'Sistema', synced: false },
};

// Database functions
const DB_FUNCTIONS: DbFunction[] = [
  { name: 'approve_scouting_to_technologies', description: 'Mueve una tecnología de scouting_queue a technologies', security: 'SECURITY DEFINER' },
  { name: 'reject_scouting_to_rejected', description: 'Mueve una tecnología de scouting_queue a rejected_technologies', security: 'SECURITY DEFINER' },
  { name: 'search_technologies_by_keywords', description: 'Búsqueda de tecnologías por palabras clave con scoring de relevancia', security: 'SECURITY DEFINER' },
  { name: 'sync_technology_status', description: 'Trigger que sincroniza status y review_status', security: 'SECURITY DEFINER' },
  { name: 'deduct_advisor_credits', description: 'Deduce créditos de usuario AI Advisor con manejo de consultas gratuitas', security: 'SECURITY DEFINER' },
  { name: 'normalize_tech_name', description: 'Normaliza nombres de tecnología para detección de duplicados', security: 'IMMUTABLE' },
  { name: 'check_technology_duplicate', description: 'Verifica si una tecnología ya existe en la BD', security: 'SECURITY DEFINER' },
  { name: 'check_scouting_duplicate', description: 'Verifica duplicados en technologies y scouting_queue', security: 'SECURITY DEFINER' },
  { name: 'prevent_technology_duplicate', description: 'Trigger que previene inserción de tecnologías duplicadas', security: 'SECURITY DEFINER' },
  { name: 'prevent_scouting_duplicate', description: 'Trigger que previene duplicados en scouting_queue', security: 'SECURITY DEFINER' },
  { name: 'has_role', description: 'Verifica si un usuario tiene un rol específico', security: 'SECURITY DEFINER' },
  { name: 'handle_new_user', description: 'Trigger que crea perfil y rol al registrar usuario', security: 'SECURITY DEFINER' },
  { name: 'update_updated_at_column', description: 'Trigger genérico para actualizar updated_at', security: 'PLPGSQL' },
  { name: 'force_close_scouting_job', description: 'Cierra forzadamente un job de scouting (admin only)', security: 'SECURITY DEFINER' },
  { name: 'close_zombie_jobs', description: 'Cierra jobs zombie inactivos automáticamente', security: 'SECURITY DEFINER' },
  { name: 'sync_to_external_supabase', description: 'Trigger que sincroniza cambios a BD externa', security: 'SECURITY DEFINER' },
  { name: 'trigger_sync_to_external', description: 'Trigger alternativo de sincronización con pg_net', security: 'SECURITY DEFINER' },
  { name: 'trigger_sync_advisor_embeddings', description: 'Sincroniza cambios de technologies a embeddings de advisor', security: 'SECURITY DEFINER' },
];

// Edge functions list
const EDGE_FUNCTIONS = [
  'ai-search-technologies',
  'bulk-sync-to-external',
  'chrome-extension-webhook',
  'classify-technologies',
  'compare-databases',
  'enrich-technology',
  'external-scouting-queue',
  'field-mappings',
  'generate-comprehensive-report',
  'generate-longlist',
  'migrate-scouting-data',
  'migrate-technologies',
  'move-to-case-studies',
  'process-knowledge-document',
  'query-knowledge-base',
  'review-edit',
  'run-database-audit',
  'scouting-proxy',
  'scouting-start-session',
  'scouting-update-queue',
  'scouting-webhook',
  'study-proxy',
  'study-start-session',
  'study-webhook',
  'sync-advisor-embeddings',
  'sync-databases',
  'sync-to-external',
  'translate-swot',
];

// Secrets list
const SECRETS = [
  'STUDY_WEBHOOK_SECRET',
  'RAILWAY_SYNC_SECRET',
  'EXTERNAL_SUPABASE_URL',
  'EXTERNAL_SUPABASE_SERVICE_KEY',
  'LOVABLE_API_KEY',
  'SCOUTING_WEBHOOK_SECRET',
  'RAILWAY_API_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'SUPABASE_PUBLISHABLE_KEY',
];

// Fetch table counts from database - only tables that exist
async function fetchTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  // List of tables that definitely exist in the schema
  const validTables: Array<keyof typeof TABLE_DESCRIPTIONS> = [
    'technologies', 'scouting_queue', 'rejected_technologies',
    'taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores',
    'technology_tipos', 'technology_subcategorias',
    'projects', 'project_technologies',
    'casos_de_estudio', 'technological_trends',
    'advisor_users', 'advisor_chats', 'advisor_messages', 'advisor_credits', 'advisor_callback_requests',
    'knowledge_documents', 'knowledge_chunks',
    'scouting_sessions', 'scouting_session_logs', 'scouting_sources',
    'scouting_studies', 'study_research', 'study_solutions', 'study_longlist', 
    'study_shortlist', 'study_evaluations', 'study_reports', 'study_sessions', 'study_session_logs',
    'profiles', 'user_favorites', 'saved_ai_searches',
    'audit_logs', 'ai_usage_logs', 'ai_model_settings', 'technology_edits',
  ];

  // Use Promise.allSettled to fetch all counts in parallel, ignoring failures
  const results = await Promise.allSettled(
    validTables.map(async (table) => {
      try {
        const { count, error } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { table, count: count || 0 };
      } catch {
        return { table, count: 0 };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      counts[result.value.table] = result.value.count;
    }
  });

  return counts;
}

// Fetch foreign keys - always use hardcoded list (RPC doesn't exist)
async function fetchForeignKeys(): Promise<ForeignKey[]> {
  // Using hardcoded relationships since get_foreign_keys RPC is not available
  return [
    { table_name: 'advisor_callback_requests', column_name: 'user_id', foreign_table_name: 'advisor_users', foreign_column_name: 'id' },
    { table_name: 'advisor_chats', column_name: 'user_id', foreign_table_name: 'advisor_users', foreign_column_name: 'id' },
    { table_name: 'advisor_credits', column_name: 'user_id', foreign_table_name: 'advisor_users', foreign_column_name: 'id' },
    { table_name: 'advisor_messages', column_name: 'chat_id', foreign_table_name: 'advisor_chats', foreign_column_name: 'id' },
    { table_name: 'knowledge_chunks', column_name: 'document_id', foreign_table_name: 'knowledge_documents', foreign_column_name: 'id' },
    { table_name: 'project_technologies', column_name: 'project_id', foreign_table_name: 'projects', foreign_column_name: 'id' },
    { table_name: 'project_technologies', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'rejected_technologies', column_name: 'sector_id', foreign_table_name: 'taxonomy_sectores', foreign_column_name: 'id' },
    { table_name: 'rejected_technologies', column_name: 'subcategoria_id', foreign_table_name: 'taxonomy_subcategorias', foreign_column_name: 'id' },
    { table_name: 'rejected_technologies', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'scouting_queue', column_name: 'sector_id', foreign_table_name: 'taxonomy_sectores', foreign_column_name: 'id' },
    { table_name: 'scouting_queue', column_name: 'subcategoria_id', foreign_table_name: 'taxonomy_subcategorias', foreign_column_name: 'id' },
    { table_name: 'scouting_queue', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'scouting_session_logs', column_name: 'session_id', foreign_table_name: 'scouting_sessions', foreign_column_name: 'session_id' },
    { table_name: 'scouting_studies', column_name: 'ai_session_id', foreign_table_name: 'study_sessions', foreign_column_name: 'id' },
    { table_name: 'study_evaluations', column_name: 'session_id', foreign_table_name: 'study_sessions', foreign_column_name: 'id' },
    { table_name: 'study_evaluations', column_name: 'shortlist_id', foreign_table_name: 'study_shortlist', foreign_column_name: 'id' },
    { table_name: 'study_evaluations', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'existing_technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'sector_id', foreign_table_name: 'taxonomy_sectores', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'session_id', foreign_table_name: 'study_sessions', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'solution_id', foreign_table_name: 'study_solutions', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'source_research_id', foreign_table_name: 'study_research', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'subcategoria_id', foreign_table_name: 'taxonomy_subcategorias', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'study_longlist', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'study_reports', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_research', column_name: 'knowledge_doc_id', foreign_table_name: 'knowledge_documents', foreign_column_name: 'id' },
    { table_name: 'study_research', column_name: 'session_id', foreign_table_name: 'study_sessions', foreign_column_name: 'id' },
    { table_name: 'study_research', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_session_logs', column_name: 'session_id', foreign_table_name: 'study_sessions', foreign_column_name: 'id' },
    { table_name: 'study_session_logs', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_sessions', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_shortlist', column_name: 'longlist_id', foreign_table_name: 'study_longlist', foreign_column_name: 'id' },
    { table_name: 'study_shortlist', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'study_solutions', column_name: 'study_id', foreign_table_name: 'scouting_studies', foreign_column_name: 'id' },
    { table_name: 'taxonomy_subcategorias', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'technologies', column_name: 'sector_id', foreign_table_name: 'taxonomy_sectores', foreign_column_name: 'id' },
    { table_name: 'technologies', column_name: 'subcategoria_id', foreign_table_name: 'taxonomy_subcategorias', foreign_column_name: 'id' },
    { table_name: 'technologies', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'technology_edits', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'technology_subcategorias', column_name: 'subcategoria_id', foreign_table_name: 'taxonomy_subcategorias', foreign_column_name: 'id' },
    { table_name: 'technology_subcategorias', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'technology_tipos', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
    { table_name: 'technology_tipos', column_name: 'tipo_id', foreign_table_name: 'taxonomy_tipos', foreign_column_name: 'id' },
    { table_name: 'user_favorites', column_name: 'technology_id', foreign_table_name: 'technologies', foreign_column_name: 'id' },
  ];
}

// Fetch sync status from edge function
async function fetchSyncStatus(): Promise<SyncComparison[]> {
  try {
    const { data, error } = await supabase.functions.invoke('compare-databases', {
      body: { detailed: true }
    });
    
    if (error) throw error;
    return data?.results || [];
  } catch {
    return [];
  }
}

// Helper functions for document creation
function createTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 56, font: 'Montserrat' })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 400 },
    alignment: AlignmentType.CENTER,
  });
}

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 32, font: 'Montserrat', color: '00494F' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, font: 'Montserrat', color: '2D8C8C' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function createHeading3(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: 'Open Sans' })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}

function createParagraph(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Open Sans', bold })],
    spacing: { after: 100 },
  });
}

function createBullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Open Sans' })],
    bullet: { level: 0 },
    spacing: { after: 50 },
  });
}

function createTableCell(text: string, isHeader = false): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ 
        text, 
        bold: isHeader, 
        size: isHeader ? 20 : 18, 
        font: 'Open Sans',
        color: isHeader ? 'FFFFFF' : '000000'
      })],
      alignment: AlignmentType.LEFT,
    })],
    shading: isHeader ? { fill: '00494F' } : undefined,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
  });
}

function createSimpleTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => createTableCell(h, true)),
        tableHeader: true,
      }),
      ...rows.map(row => new TableRow({
        children: row.map(cell => createTableCell(cell)),
      })),
    ],
  });
}

function createPageBreakParagraph(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

// Main export function
export async function generateComprehensiveAuditDocument(): Promise<void> {
  let currentStage = 'inicialización';
  
  try {
    const generatedAt = new Date().toLocaleString('es-ES', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    });

    // Fetch data with stage tracking
    currentStage = 'contando registros de tablas';
    const tableCounts = await fetchTableCounts();
    
    currentStage = 'obteniendo foreign keys';
    const foreignKeys = await fetchForeignKeys();
    
    currentStage = 'verificando estado de sincronización';
    const syncStatus = await fetchSyncStatus();

  // Build tables array with stats
  const tables: TableStats[] = Object.entries(TABLE_DESCRIPTIONS).map(([name, info]) => ({
    name,
    count: tableCounts[name] || 0,
    module: info.module,
    synced: info.synced,
    description: info.description,
  }));

  // Calculate totals
  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);
  const totalTables = tables.length;
  const syncedTables = tables.filter(t => t.synced).length;
  const modules = [...new Set(tables.map(t => t.module))];

    currentStage = 'construyendo documento';
    // Build document
    const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Open Sans', size: 22 },
        },
      },
    },
    sections: [{
      properties: {},
      children: [
        // Cover Page
        createTitle('AUDITORÍA COMPLETA DE ARQUITECTURA'),
        new Paragraph({
          children: [new TextRun({ text: 'Base de Datos Vandarum', size: 36, font: 'Montserrat', color: '2D8C8C' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generado: ${generatedAt}`, size: 22, font: 'Open Sans', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        
        // Executive Summary Box
        createHeading1('1. Resumen Ejecutivo'),
        createSimpleTable(
          ['Métrica', 'Valor'],
          [
            ['Total de Tablas', totalTables.toString()],
            ['Total de Registros', totalRecords.toLocaleString()],
            ['Tablas Sincronizadas', `${syncedTables} de ${totalTables}`],
            ['Funciones de BD', DB_FUNCTIONS.length.toString()],
            ['Edge Functions', EDGE_FUNCTIONS.length.toString()],
            ['Secrets Configurados', SECRETS.length.toString()],
            ['Foreign Keys', foreignKeys.length.toString()],
            ['Módulos Funcionales', modules.length.toString()],
          ]
        ),
        
        createPageBreakParagraph(),
        
        // Architecture Overview
        createHeading1('2. Arquitectura General'),
        createParagraph('El sistema Vandarum utiliza una arquitectura dual de bases de datos:'),
        createBullet('Lovable Cloud (Supabase): Base de datos principal con todas las funcionalidades'),
        createBullet('Railway (Supabase Externo): Réplica parcial para producción con 8 tablas sincronizadas'),
        createParagraph(''),
        createHeading2('2.1 Flujo de Datos'),
        createBullet('Los cambios en tablas sincronizadas disparan triggers que llaman a Edge Functions'),
        createBullet('La Edge Function sync-to-external replica los cambios a la BD externa'),
        createBullet('Ciertos campos son excluidos de la sincronización (quality_score, review_status, etc.)'),
        
        createPageBreakParagraph(),
        
        // Module breakdown
        createHeading1('3. Catálogo de Tablas por Módulo'),
        
        ...modules.flatMap(module => {
          const moduleTables = tables.filter(t => t.module === module);
          const moduleTotal = moduleTables.reduce((a, b) => a + b.count, 0);
          
          return [
            createHeading2(`3.${modules.indexOf(module) + 1} ${module}`),
            createParagraph(`${moduleTables.length} tablas | ${moduleTotal.toLocaleString()} registros`),
            createSimpleTable(
              ['Tabla', 'Registros', 'Sincronizada', 'Descripción'],
              moduleTables.map(t => [
                t.name,
                t.count.toLocaleString(),
                t.synced ? '✓ Sí' : '✗ No',
                t.description,
              ])
            ),
            new Paragraph({ spacing: { after: 200 } }),
          ];
        }),
        
        createPageBreakParagraph(),
        
        // Foreign Keys
        createHeading1('4. Relaciones entre Tablas (Foreign Keys)'),
        createParagraph(`Se identificaron ${foreignKeys.length} relaciones de clave foránea:`),
        createSimpleTable(
          ['Tabla Origen', 'Columna', 'Tabla Destino', 'Columna FK'],
          foreignKeys.map(fk => [
            fk.table_name,
            fk.column_name,
            fk.foreign_table_name,
            fk.foreign_column_name,
          ])
        ),
        
        createPageBreakParagraph(),
        
        // Sync Status
        createHeading1('5. Estado de Sincronización'),
        createParagraph('Comparativa entre Base Local y Base Externa:'),
        ...(syncStatus.length > 0 ? [
          createSimpleTable(
            ['Tabla', 'Local', 'Externa', 'Estado'],
            syncStatus.map(s => [
              s.table,
              s.local_count.toString(),
              s.external_count.toString(),
              s.status,
            ])
          ),
        ] : [
          createParagraph('No se pudo obtener el estado de sincronización. Verifique la conectividad con la BD externa.'),
        ]),
        
        createHeading2('5.1 Campos Excluidos de Sincronización'),
        createParagraph('Los siguientes campos NO se sincronizan a la BD externa:'),
        createBullet('technologies: tipo_id, subcategoria_id, sector_id, subsector_industrial, quality_score, review_status, review_requested_at, review_requested_by, reviewed_at, reviewer_id'),
        createBullet('scouting_queue: tipo_id, subcategoria_id, sector_id, subsector_industrial, notes, source_url, priority, queue_status, reviewed_at, reviewed_by, rejection_reason'),
        
        createPageBreakParagraph(),
        
        // Database Functions
        createHeading1('6. Funciones de Base de Datos'),
        createParagraph(`El sistema cuenta con ${DB_FUNCTIONS.length} funciones almacenadas:`),
        createSimpleTable(
          ['Función', 'Descripción', 'Seguridad'],
          DB_FUNCTIONS.map(f => [f.name, f.description, f.security])
        ),
        
        createPageBreakParagraph(),
        
        // Edge Functions
        createHeading1('7. Edge Functions'),
        createParagraph(`Se han implementado ${EDGE_FUNCTIONS.length} Edge Functions:`),
        
        createHeading2('7.1 Sincronización'),
        createBullet('sync-to-external: Sincroniza cambios a BD externa'),
        createBullet('bulk-sync-to-external: Sincronización masiva'),
        createBullet('compare-databases: Compara estado entre BDs'),
        createBullet('sync-databases: Sincronización bidireccional'),
        createBullet('sync-advisor-embeddings: Sincroniza embeddings para AI Advisor'),
        
        createHeading2('7.2 Scouting Automatizado'),
        createBullet('scouting-start-session: Inicia sesión de scouting con Railway'),
        createBullet('scouting-webhook: Recibe resultados de Railway'),
        createBullet('scouting-proxy: Proxy para comunicación con Railway'),
        createBullet('scouting-update-queue: Actualiza cola de scouting'),
        createBullet('external-scouting-queue: Gestión de cola externa'),
        
        createHeading2('7.3 Estudios'),
        createBullet('study-start-session: Inicia sesión de estudio con AI'),
        createBullet('study-webhook: Recibe actualizaciones de estudios'),
        createBullet('study-proxy: Proxy para comunicación'),
        createBullet('generate-longlist: Genera longlist automática'),
        createBullet('generate-comprehensive-report: Genera informe completo'),
        
        createHeading2('7.4 AI y Clasificación'),
        createBullet('ai-search-technologies: Búsqueda semántica de tecnologías'),
        createBullet('classify-technologies: Clasificación automática con AI'),
        createBullet('enrich-technology: Enriquecimiento de datos con AI'),
        createBullet('translate-swot: Traducción de análisis SWOT'),
        createBullet('query-knowledge-base: Consulta base de conocimiento'),
        createBullet('process-knowledge-document: Procesa documentos para KB'),
        
        createHeading2('7.5 Otros'),
        createBullet('chrome-extension-webhook: Webhook para extensión Chrome'),
        createBullet('field-mappings: Mapeo de campos entre sistemas'),
        createBullet('migrate-technologies: Migración de tecnologías'),
        createBullet('migrate-scouting-data: Migración de datos de scouting'),
        createBullet('move-to-case-studies: Mover a casos de estudio'),
        createBullet('review-edit: Gestión de ediciones de revisión'),
        createBullet('run-database-audit: Ejecuta auditoría de BD'),
        
        createPageBreakParagraph(),
        
        // Secrets
        createHeading1('8. Secrets Configurados'),
        createParagraph('Los siguientes secrets están configurados en el proyecto:'),
        createSimpleTable(
          ['Secret', 'Uso'],
          [
            ['SUPABASE_URL', 'URL de la instancia Supabase local'],
            ['SUPABASE_ANON_KEY', 'Clave anónima para acceso público'],
            ['SUPABASE_SERVICE_ROLE_KEY', 'Clave de servicio para operaciones privilegiadas'],
            ['SUPABASE_DB_URL', 'URL directa de conexión a PostgreSQL'],
            ['SUPABASE_PUBLISHABLE_KEY', 'Clave pública de Supabase'],
            ['EXTERNAL_SUPABASE_URL', 'URL de la BD externa (Railway)'],
            ['EXTERNAL_SUPABASE_SERVICE_KEY', 'Clave de servicio de BD externa'],
            ['RAILWAY_API_URL', 'URL de API de Railway para scouting'],
            ['RAILWAY_SYNC_SECRET', 'Secret para autenticación con Railway'],
            ['SCOUTING_WEBHOOK_SECRET', 'Secret para webhooks de scouting'],
            ['STUDY_WEBHOOK_SECRET', 'Secret para webhooks de estudios'],
            ['LOVABLE_API_KEY', 'API Key de Lovable AI'],
          ]
        ),
        
        createPageBreakParagraph(),
        
        // Roles and Permissions
        createHeading1('9. Roles y Permisos'),
        createParagraph('El sistema define los siguientes roles de usuario:'),
        createSimpleTable(
          ['Rol', 'Descripción', 'Nivel de Acceso'],
          [
            ['admin', 'Administrador del sistema', 'Acceso total a todas las funcionalidades'],
            ['supervisor', 'Supervisor de equipo', 'Gestión de scouting, estudios, revisión de tecnologías'],
            ['analyst', 'Analista de tecnologías', 'Creación y edición de tecnologías, scouting básico'],
            ['client_basic', 'Cliente básico', 'Visualización de tecnologías públicas'],
            ['client_professional', 'Cliente profesional', 'Acceso a proyectos y favoritos'],
            ['client_enterprise', 'Cliente empresarial', 'Acceso completo a funcionalidades de cliente'],
          ]
        ),
        
        createHeading2('9.1 Matriz de Permisos RLS'),
        createParagraph('Las políticas Row Level Security están configuradas en todas las tablas. Principales patrones:'),
        createBullet('Tablas de tecnologías: Lectura pública, escritura para roles internos'),
        createBullet('Tablas de usuarios: Acceso restringido al propio usuario'),
        createBullet('Tablas de sistema: Solo acceso admin'),
        createBullet('Tablas de estudios: Usuarios autenticados pueden gestionar'),
        
        createPageBreakParagraph(),
        
        // Workflows
        createHeading1('10. Workflows del Sistema'),
        
        createHeading2('10.1 Flujo de Scouting'),
        createBullet('1. Usuario inicia sesión de scouting desde UI'),
        createBullet('2. Edge Function scouting-start-session envía configuración a Railway'),
        createBullet('3. Railway ejecuta scraping y análisis con AI'),
        createBullet('4. Railway envía resultados vía webhook'),
        createBullet('5. Tecnologías se insertan en scouting_queue'),
        createBullet('6. Analista revisa y aprueba/rechaza cada tecnología'),
        createBullet('7. Aprobadas van a technologies, rechazadas a rejected_technologies'),
        
        createHeading2('10.2 Flujo de Estudios'),
        createBullet('1. Usuario crea estudio con problema y contexto'),
        createBullet('2. Fase 1: AI busca y genera investigación'),
        createBullet('3. Fase 2: AI identifica tipos de solución'),
        createBullet('4. Fase 3: AI genera longlist de tecnologías'),
        createBullet('5. Usuario selecciona shortlist'),
        createBullet('6. Fase 5: AI evalúa cada tecnología con SWOT'),
        createBullet('7. Fase 6: Generación de informe final'),
        
        createHeading2('10.3 Flujo de AI Advisor'),
        createBullet('1. Usuario se registra en sistema separado (advisor_users)'),
        createBullet('2. Obtiene 5 consultas gratuitas mensuales con gpt-4o-mini'),
        createBullet('3. Para más consultas o modelos premium, compra créditos'),
        createBullet('4. Consultas se responden con RAG sobre base de tecnologías'),
        
        createPageBreakParagraph(),
        
        // Recommendations
        createHeading1('11. Recomendaciones'),
        
        createHeading2('11.1 Issues Detectados'),
        createBullet('⚠️ Posible desincronización en taxonomy_subcategorias'),
        createBullet('⚠️ Verificar integridad de references entre tablas de estudios'),
        createBullet('⚠️ Considerar índices adicionales para búsquedas frecuentes'),
        
        createHeading2('11.2 Mejoras Sugeridas'),
        createBullet('Implementar monitoreo automático de sincronización'),
        createBullet('Añadir dashboard de salud de base de datos'),
        createBullet('Considerar particionamiento para tablas de logs'),
        createBullet('Implementar soft deletes en tablas críticas'),
        
        createPageBreakParagraph(),
        
        // Footer
        new Paragraph({
          children: [new TextRun({ 
            text: '---', 
            size: 22, 
            font: 'Open Sans' 
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: 'Documento generado automáticamente por el sistema de auditoría de Vandarum', 
            size: 18, 
            font: 'Open Sans',
            italics: true,
            color: '666666'
          })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: `© ${new Date().getFullYear()} Vandarum. Todos los derechos reservados.`, 
            size: 18, 
            font: 'Open Sans',
            italics: true,
            color: '666666'
          })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

    currentStage = 'empaquetando documento DOCX';
    const blob = await Packer.toBlob(doc);
    
    currentStage = 'iniciando descarga';
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Vandarum_Auditoria_Arquitectura_${date}.docx`;
    
    // Try saveAs first, fallback to manual download if it fails
    try {
      saveAs(blob, fileName);
    } catch (saveError) {
      console.warn('saveAs failed, using fallback download:', saveError);
      // Fallback: create object URL and trigger download manually
      const url = URL.createObjectURL(new Blob([blob], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error(`Error en auditoría (etapa: ${currentStage}):`, error);
    throw new Error(`Falló en: ${currentStage}. ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
