import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Packer } from 'docx';
import { saveAs } from 'file-saver';

interface ModuleInfo {
  name: string;
  route: string;
  description: string;
  features: string[];
  components: string[];
  roles: string[];
}

interface EdgeFunctionInfo {
  name: string;
  description: string;
  method: string;
  integration: string;
}

interface HookInfo {
  name: string;
  description: string;
  usage: string;
}

const MODULES: ModuleInfo[] = [
  {
    name: 'Dashboard',
    route: '/dashboard',
    description: 'Panel principal con estadísticas y resumen del sistema',
    features: [
      'Estadísticas globales de tecnologías',
      'Actividad reciente',
      'Accesos rápidos a módulos principales',
      'KPIs de rendimiento'
    ],
    components: ['Dashboard.tsx', 'StatsCard.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional', 'client_basic']
  },
  {
    name: 'Tecnologías',
    route: '/technologies',
    description: 'Catálogo completo de tecnologías clasificadas',
    features: [
      'Listado paginado con tabla/tarjetas',
      'Filtros avanzados por tipo, subcategoría, sector, TRL, país',
      'Búsqueda por texto',
      'Ordenamiento múltiple',
      'Vista detallada de cada tecnología',
      'Edición y creación de tecnologías',
      'Descarga de ficha Word individual',
      'Favoritos',
      'Clasificación IA',
      'Enriquecimiento IA'
    ],
    components: ['Technologies.tsx', 'TechnologyTable.tsx', 'TechnologyCard.tsx', 'TechnologyDetailModal.tsx', 'TechnologyFormModal.tsx', 'TechnologyFiltersPanel.tsx', 'TRLBadge.tsx', 'DownloadTechnologyButton.tsx', 'DeleteTechnologyButton.tsx', 'AIEnrichmentButton.tsx', 'QuickClassifyButton.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional', 'client_basic']
  },
  {
    name: 'Scouting Automático',
    route: '/scouting',
    description: 'Sistema de scouting automatizado con IA para descubrir nuevas tecnologías',
    features: [
      'Cola de tecnologías pendientes de revisión',
      'Aprobar/Rechazar tecnologías al catálogo principal',
      'Edición antes de aprobar',
      'Filtros por estado, prioridad, fuente',
      'Integración con Railway backend para scraping'
    ],
    components: ['Scouting.tsx', 'ScoutingTechFormModal.tsx', 'ScoutingTechDetailModal.tsx'],
    roles: ['admin', 'supervisor', 'analyst']
  },
  {
    name: 'Nuevo Scouting',
    route: '/scouting/new',
    description: 'Iniciar nuevas sesiones de scouting automatizado',
    features: [
      'Configurar parámetros de búsqueda',
      'Seleccionar fuentes de scouting',
      'Monitorear progreso en tiempo real',
      'Gestión de fuentes de scouting'
    ],
    components: ['ScoutingNew.tsx', 'ScoutingReportModal.tsx'],
    roles: ['admin', 'supervisor']
  },
  {
    name: 'Monitor de Scouting',
    route: '/scouting-monitor',
    description: 'Monitoreo en tiempo real de sesiones de scouting activas',
    features: [
      'Estado de sesiones activas',
      'Logs en tiempo real',
      'Progreso y estadísticas',
      'Gestión de errores'
    ],
    components: ['ScoutingMonitor.tsx', 'SyncStatusIndicator.tsx'],
    roles: ['admin', 'supervisor']
  },
  {
    name: 'Estudios de Scouting',
    route: '/studies',
    description: 'Gestión de estudios estructurados de scouting tecnológico',
    features: [
      'Crear estudios con problema, objetivos y restricciones',
      'Flujo de 6 fases: Investigación → Soluciones → Longlist → Shortlist → Evaluación → Informe',
      'Sesiones de IA para cada fase',
      'Análisis DAFO automatizado',
      'Generación de informes finales'
    ],
    components: ['Studies.tsx', 'StudyDetail.tsx', 'StudyPhase1Research.tsx', 'StudyPhase2Solutions.tsx', 'StudyPhase3Longlist.tsx', 'StudyPhase4Shortlist.tsx', 'StudyPhase5Evaluation.tsx', 'StudyPhase6Report.tsx', 'AISessionPanel.tsx'],
    roles: ['admin', 'supervisor', 'analyst']
  },
  {
    name: 'Proyectos',
    route: '/projects',
    description: 'Gestión de proyectos de vigilancia tecnológica',
    features: [
      'Crear y gestionar proyectos',
      'Asignar tecnologías a proyectos',
      'Seguimiento de estados',
      'Notas y fechas objetivo'
    ],
    components: ['Projects.tsx', 'ProjectDetail.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional', 'client_basic']
  },
  {
    name: 'Favoritos',
    route: '/favorites',
    description: 'Tecnologías marcadas como favoritas por el usuario',
    features: [
      'Lista de favoritos personales',
      'Acceso rápido a tecnologías de interés',
      'Gestionar favoritos'
    ],
    components: ['Favorites.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional', 'client_basic']
  },
  {
    name: 'Control de Calidad',
    route: '/quality-control',
    description: 'Revisión y aprobación de ediciones propuestas',
    features: [
      'Lista de ediciones pendientes',
      'Comparar cambios propuestos vs originales',
      'Aprobar/Rechazar con comentarios',
      'Historial de revisiones'
    ],
    components: ['QualityControl.tsx'],
    roles: ['admin', 'supervisor']
  },
  {
    name: 'Tendencias Tecnológicas',
    route: '/trends',
    description: 'Catálogo de tendencias tecnológicas identificadas',
    features: [
      'Listado de tendencias',
      'Filtros por sector y tipo',
      'Crear desde tecnologías existentes',
      'Edición y gestión'
    ],
    components: ['Trends.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional']
  },
  {
    name: 'Casos de Estudio',
    route: '/case-studies',
    description: 'Casos de estudio de implementación tecnológica',
    features: [
      'Listado de casos',
      'Filtros por sector y país',
      'Crear desde tecnologías existentes',
      'Detalles completos'
    ],
    components: ['CaseStudies.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional']
  },
  {
    name: 'Estadísticas',
    route: '/statistics',
    description: 'Dashboard analítico con gráficos y métricas',
    features: [
      'Gráficos de distribución por tipo',
      'Análisis por TRL',
      'Distribución geográfica',
      'Evolución temporal',
      'Exportación de datos'
    ],
    components: ['Statistics.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise']
  },
  {
    name: 'Base de Conocimiento',
    route: '/knowledge-base',
    description: 'Repositorio de documentos para consultas IA',
    features: [
      'Subir documentos PDF/Word',
      'Procesamiento y chunking automático',
      'Consultas en lenguaje natural',
      'Respuestas contextualizadas con IA'
    ],
    components: ['KnowledgeBase.tsx'],
    roles: ['admin', 'supervisor', 'analyst']
  },
  {
    name: 'Clasificación IA',
    route: '/ai-classification',
    description: 'Clasificación automática de tecnologías con IA',
    features: [
      'Clasificación batch de múltiples tecnologías',
      'Asignación automática de tipo y subcategoría',
      'Panel de resultados y estadísticas',
      'Revisión manual post-clasificación'
    ],
    components: ['AIClassification.tsx', 'AIClassificationPanel.tsx'],
    roles: ['admin', 'supervisor', 'analyst']
  },
  {
    name: 'Búsqueda IA',
    route: '/ai-search',
    description: 'Búsqueda semántica de tecnologías con lenguaje natural',
    features: [
      'Búsqueda en lenguaje natural',
      'Resultados rankeados por relevancia',
      'Guardar búsquedas frecuentes',
      'Filtros combinados con IA'
    ],
    components: ['AISearch.tsx', 'AISearchBar.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional']
  },
  {
    name: 'Modelos IA',
    route: '/ai-models',
    description: 'Configuración de modelos de IA por acción',
    features: [
      'Seleccionar modelo LLM por tipo de acción',
      'Comparar costos y velocidades',
      'Configuración global del sistema'
    ],
    components: ['AIModels.tsx', 'AIModelSettings.tsx'],
    roles: ['admin']
  },
  {
    name: 'Dashboard Uso IA',
    route: '/ai-usage',
    description: 'Monitoreo del consumo de tokens y costos IA',
    features: [
      'Estadísticas de uso por modelo',
      'Costos acumulados',
      'Histórico de peticiones',
      'Análisis de errores'
    ],
    components: ['AIUsageDashboard.tsx'],
    roles: ['admin']
  },
  {
    name: 'Administración Taxonomía',
    route: '/taxonomy-admin',
    description: 'Gestión del catálogo de tipos, subcategorías y sectores',
    features: [
      'CRUD de tipos de tecnología',
      'CRUD de subcategorías',
      'CRUD de sectores',
      'Descargar documentación Word'
    ],
    components: ['TaxonomyAdmin.tsx'],
    roles: ['admin']
  },
  {
    name: 'Auditoría Taxonomía',
    route: '/taxonomy-audit',
    description: 'Análisis de calidad y cobertura de la taxonomía',
    features: [
      'Tecnologías sin clasificar',
      'Subcategorías huérfanas',
      'Estadísticas de cobertura',
      'Recomendaciones de mejora'
    ],
    components: ['TaxonomyAudit.tsx'],
    roles: ['admin', 'supervisor']
  },
  {
    name: 'Auditoría Base de Datos',
    route: '/database-audit',
    description: 'Análisis de calidad de datos en tecnologías',
    features: [
      'Campos vacíos o incompletos',
      'Duplicados potenciales',
      'Puntuación de calidad',
      'Acciones correctivas'
    ],
    components: ['DatabaseAudit.tsx'],
    roles: ['admin', 'supervisor']
  },
  {
    name: 'Admin Jobs Scouting',
    route: '/admin/scouting-jobs',
    description: 'Administración de trabajos de scouting zombie/atascados',
    features: [
      'Listar trabajos activos',
      'Cerrar trabajos zombie',
      'Estadísticas de sesiones',
      'Limpieza automática'
    ],
    components: ['AdminScoutingJobs.tsx', 'ZombieJobsIndicator.tsx'],
    roles: ['admin']
  },
  {
    name: 'Configuración',
    route: '/settings',
    description: 'Configuración del sistema y perfil de usuario',
    features: [
      'Perfil de usuario',
      'Cambio de contraseña',
      'Gestión de usuarios (admin)',
      'Sincronización con base externa',
      'Comparación de bases de datos',
      'Documentación técnica descargable',
      'Invitación de usuarios',
      'Exportación de datos personales',
      'Logs de auditoría',
      'Tema claro/oscuro'
    ],
    components: ['Settings.tsx', 'InviteUsersSection.tsx', 'AuditLogSection.tsx', 'ExportDataSection.tsx', 'AIModelSettings.tsx'],
    roles: ['admin', 'supervisor', 'analyst', 'client_enterprise', 'client_professional', 'client_basic']
  }
];

const EDGE_FUNCTIONS: EdgeFunctionInfo[] = [
  { name: 'ai-search-technologies', description: 'Búsqueda semántica de tecnologías con IA', method: 'POST', integration: 'Lovable AI' },
  { name: 'classify-technologies', description: 'Clasificación automática de tecnologías', method: 'POST', integration: 'Lovable AI' },
  { name: 'enrich-technology', description: 'Enriquecimiento de datos de tecnología con IA', method: 'POST', integration: 'Lovable AI' },
  { name: 'compare-databases', description: 'Comparar Lovable Cloud vs Railway', method: 'POST', integration: 'Railway API' },
  { name: 'sync-to-external', description: 'Sincronizar registro individual a Railway', method: 'POST', integration: 'Railway API' },
  { name: 'bulk-sync-to-external', description: 'Sincronización masiva a Railway', method: 'POST', integration: 'Railway API' },
  { name: 'scouting-start-session', description: 'Iniciar sesión de scouting automático', method: 'POST', integration: 'Railway Backend' },
  { name: 'scouting-webhook', description: 'Recibir resultados de scouting', method: 'POST', integration: 'Railway Backend' },
  { name: 'scouting-proxy', description: 'Proxy para comandos de scouting', method: 'POST', integration: 'Railway Backend' },
  { name: 'study-start-session', description: 'Iniciar sesión de estudio con IA', method: 'POST', integration: 'Railway Backend' },
  { name: 'study-webhook', description: 'Recibir resultados de estudio', method: 'POST', integration: 'Railway Backend' },
  { name: 'study-proxy', description: 'Proxy para comandos de estudio', method: 'POST', integration: 'Railway Backend' },
  { name: 'process-knowledge-document', description: 'Procesar documento para knowledge base', method: 'POST', integration: 'Lovable AI' },
  { name: 'query-knowledge-base', description: 'Consultar knowledge base con IA', method: 'POST', integration: 'Lovable AI' },
  { name: 'run-database-audit', description: 'Ejecutar auditoría de calidad de datos', method: 'POST', integration: 'Internal' },
  { name: 'review-edit', description: 'Procesar revisión de edición', method: 'POST', integration: 'Internal' },
  { name: 'move-to-case-studies', description: 'Mover tecnología a casos de estudio', method: 'POST', integration: 'Internal' },
  { name: 'migrate-technologies', description: 'Migrar tecnologías entre sistemas', method: 'POST', integration: 'Railway API' },
  { name: 'field-mappings', description: 'Gestión de mapeos de campos', method: 'GET/POST', integration: 'Internal' },
  { name: 'external-scouting-queue', description: 'Gestionar cola externa de scouting', method: 'POST', integration: 'Railway API' }
];

const HOOKS: HookInfo[] = [
  { name: 'useAuth', description: 'Autenticación y perfil de usuario', usage: 'Contexto global de auth' },
  { name: 'useTechnologyFilters', description: 'Filtros y taxonomías para tecnologías', usage: 'Página de tecnologías' },
  { name: 'useScoutingData', description: 'CRUD de cola de scouting', usage: 'Módulo scouting' },
  { name: 'useScoutingJobs', description: 'Gestión de trabajos de scouting', usage: 'Monitor scouting' },
  { name: 'useScoutingStudies', description: 'CRUD de estudios y fases', usage: 'Módulo estudios' },
  { name: 'useStudySessions', description: 'Sesiones de estudio con IA', usage: 'Detalle de estudio' },
  { name: 'useAIStudySession', description: 'Lógica de sesiones IA de estudio', usage: 'Panel IA estudios' },
  { name: 'useExternalScoutingData', description: 'Datos de Railway/external', usage: 'Sincronización' },
  { name: 'useLLMModels', description: 'Configuración de modelos LLM', usage: 'AI Models' },
  { name: 'usePdfSplitter', description: 'Dividir PDFs para procesamiento', usage: 'Knowledge Base' },
  { name: 'useRealtimeSubscription', description: 'Suscripción realtime Supabase', usage: 'Actualización en vivo' },
  { name: 'useTaxonomyAudit', description: 'Auditoría de taxonomía', usage: 'Taxonomy Audit' },
  { name: 'use-toast', description: 'Notificaciones toast', usage: 'Global' },
  { name: 'use-mobile', description: 'Detección de dispositivo móvil', usage: 'Responsive' }
];

const DATABASE_TABLES = [
  'technologies', 'scouting_queue', 'rejected_technologies', 
  'taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores',
  'technology_tipos', 'technology_subcategorias',
  'projects', 'project_technologies',
  'casos_de_estudio', 'technological_trends',
  'scouting_studies', 'study_sessions', 'study_session_logs',
  'study_research', 'study_solutions', 'study_longlist', 'study_shortlist', 'study_evaluations', 'study_reports',
  'scouting_sessions', 'scouting_session_logs', 'scouting_sources',
  'knowledge_documents', 'knowledge_chunks',
  'profiles', 'user_roles', 'user_favorites', 'user_invitations',
  'ai_model_settings', 'ai_usage_logs', 'audit_logs',
  'technology_edits', 'saved_ai_searches'
];

function createBorderedCell(text: string, options?: { bold?: boolean; width?: number; fill?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: options?.bold, size: 20 })]
    })],
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options?.fill ? { fill: options.fill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    }
  });
}

export async function generateModulesDocumentation(): Promise<void> {
  const sections = [];

  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'INFORME DE MÓDULOS Y PANTALLAS', bold: true, size: 48, color: '2C5282' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Sistema Vandarum - Gestión de Tecnologías', size: 28, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generado: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    })
  );

  // Index
  sections.push(
    new Paragraph({ text: 'ÍNDICE', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: '1. Resumen Ejecutivo', spacing: { after: 80 } }),
    new Paragraph({ text: '2. Módulos del Sistema', spacing: { after: 80 } }),
    new Paragraph({ text: '3. Edge Functions (Backend)', spacing: { after: 80 } }),
    new Paragraph({ text: '4. Hooks Personalizados', spacing: { after: 80 } }),
    new Paragraph({ text: '5. Tablas de Base de Datos', spacing: { after: 80 } }),
    new Paragraph({ text: '6. Roles y Permisos', spacing: { after: 300 } })
  );

  // Summary
  sections.push(
    new Paragraph({ text: '1. RESUMEN EJECUTIVO', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `El sistema Vandarum cuenta con ${MODULES.length} módulos principales, ${EDGE_FUNCTIONS.length} edge functions, ${HOOKS.length} hooks personalizados y ${DATABASE_TABLES.length} tablas de base de datos.`, size: 22 })], spacing: { after: 200 } })
  );

  // Stats table
  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          createBorderedCell('Métrica', { bold: true, width: 50, fill: 'E8F4FD' }),
          createBorderedCell('Cantidad', { bold: true, width: 50, fill: 'E8F4FD' })
        ]}),
        new TableRow({ children: [createBorderedCell('Módulos/Pantallas'), createBorderedCell(String(MODULES.length))] }),
        new TableRow({ children: [createBorderedCell('Edge Functions'), createBorderedCell(String(EDGE_FUNCTIONS.length))] }),
        new TableRow({ children: [createBorderedCell('Hooks Personalizados'), createBorderedCell(String(HOOKS.length))] }),
        new TableRow({ children: [createBorderedCell('Tablas de Base de Datos'), createBorderedCell(String(DATABASE_TABLES.length))] }),
        new TableRow({ children: [createBorderedCell('Roles de Usuario'), createBorderedCell('6')] })
      ]
    })
  );

  // Modules section
  sections.push(
    new Paragraph({ text: '2. MÓDULOS DEL SISTEMA', heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 300 } })
  );

  MODULES.forEach((module, index) => {
    sections.push(
      new Paragraph({ text: `2.${index + 1} ${module.name}`, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: `Ruta: `, bold: true, size: 20 }), new TextRun({ text: module.route, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: module.description, italics: true, size: 20 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: 'Funcionalidades:', bold: true, size: 20 })], spacing: { after: 50 } })
    );
    module.features.forEach(feature => {
      sections.push(new Paragraph({ children: [new TextRun({ text: `  • ${feature}`, size: 20 })], spacing: { after: 30 } }));
    });
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Componentes: ', bold: true, size: 20 }), new TextRun({ text: module.components.join(', '), size: 18 })], spacing: { after: 50 } }),
      new Paragraph({ children: [new TextRun({ text: 'Roles con acceso: ', bold: true, size: 20 }), new TextRun({ text: module.roles.join(', '), size: 18 })], spacing: { after: 100 } })
    );
  });

  // Edge Functions section
  sections.push(
    new Paragraph({ text: '3. EDGE FUNCTIONS (BACKEND)', heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Funciones serverless desplegadas en Lovable Cloud para lógica de backend:', size: 20 })], spacing: { after: 200 } })
  );

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          createBorderedCell('Función', { bold: true, width: 30, fill: 'E8F4FD' }),
          createBorderedCell('Descripción', { bold: true, width: 45, fill: 'E8F4FD' }),
          createBorderedCell('Integración', { bold: true, width: 25, fill: 'E8F4FD' })
        ]}),
        ...EDGE_FUNCTIONS.map(fn => new TableRow({ children: [
          createBorderedCell(fn.name),
          createBorderedCell(fn.description),
          createBorderedCell(fn.integration)
        ]}))
      ]
    })
  );

  // Hooks section
  sections.push(
    new Paragraph({ text: '4. HOOKS PERSONALIZADOS', heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Hooks React reutilizables para lógica de negocio:', size: 20 })], spacing: { after: 200 } })
  );

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          createBorderedCell('Hook', { bold: true, width: 30, fill: 'E8F4FD' }),
          createBorderedCell('Descripción', { bold: true, width: 40, fill: 'E8F4FD' }),
          createBorderedCell('Uso Principal', { bold: true, width: 30, fill: 'E8F4FD' })
        ]}),
        ...HOOKS.map(hook => new TableRow({ children: [
          createBorderedCell(hook.name),
          createBorderedCell(hook.description),
          createBorderedCell(hook.usage)
        ]}))
      ]
    })
  );

  // Database tables section
  sections.push(
    new Paragraph({ text: '5. TABLAS DE BASE DE DATOS', heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Total: ${DATABASE_TABLES.length} tablas en Lovable Cloud (PostgreSQL)`, size: 20 })], spacing: { after: 200 } })
  );

  const tableGroups = [
    { title: 'Tecnologías', tables: ['technologies', 'scouting_queue', 'rejected_technologies', 'technology_tipos', 'technology_subcategorias'] },
    { title: 'Taxonomía', tables: ['taxonomy_tipos', 'taxonomy_subcategorias', 'taxonomy_sectores'] },
    { title: 'Proyectos', tables: ['projects', 'project_technologies'] },
    { title: 'Casos y Tendencias', tables: ['casos_de_estudio', 'technological_trends'] },
    { title: 'Estudios', tables: ['scouting_studies', 'study_sessions', 'study_session_logs', 'study_research', 'study_solutions', 'study_longlist', 'study_shortlist', 'study_evaluations', 'study_reports'] },
    { title: 'Scouting', tables: ['scouting_sessions', 'scouting_session_logs', 'scouting_sources'] },
    { title: 'Knowledge Base', tables: ['knowledge_documents', 'knowledge_chunks'] },
    { title: 'Usuarios', tables: ['profiles', 'user_roles', 'user_favorites', 'user_invitations'] },
    { title: 'Sistema', tables: ['ai_model_settings', 'ai_usage_logs', 'audit_logs', 'technology_edits', 'saved_ai_searches'] }
  ];

  tableGroups.forEach(group => {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: group.title, bold: true, size: 22 })], spacing: { before: 200, after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: group.tables.join(', '), size: 18 })], spacing: { after: 100 } })
    );
  });

  // Roles section
  sections.push(
    new Paragraph({ text: '6. ROLES Y PERMISOS', heading: HeadingLevel.HEADING_1, spacing: { before: 600, after: 200 } })
  );

  const roles = [
    { name: 'admin', desc: 'Control total del sistema', access: 'Todos los módulos' },
    { name: 'supervisor', desc: 'Supervisión y aprobación', access: 'Mayoría de módulos excepto admin' },
    { name: 'analyst', desc: 'Creación y edición de contenido', access: 'Tecnologías, Scouting, Estudios, IA' },
    { name: 'client_enterprise', desc: 'Acceso empresarial completo', access: 'Lectura completa, proyectos ilimitados' },
    { name: 'client_professional', desc: 'Acceso profesional', access: 'Lectura, hasta 10 proyectos' },
    { name: 'client_basic', desc: 'Acceso básico', access: 'Lectura limitada, 3 proyectos' }
  ];

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          createBorderedCell('Rol', { bold: true, width: 25, fill: 'E8F4FD' }),
          createBorderedCell('Descripción', { bold: true, width: 35, fill: 'E8F4FD' }),
          createBorderedCell('Acceso', { bold: true, width: 40, fill: 'E8F4FD' })
        ]}),
        ...roles.map(role => new TableRow({ children: [
          createBorderedCell(role.name),
          createBorderedCell(role.desc),
          createBorderedCell(role.access)
        ]}))
      ]
    })
  );

  // Footer
  sections.push(
    new Paragraph({ text: '', spacing: { before: 600 } }),
    new Paragraph({
      children: [new TextRun({ text: '--- Fin del documento ---', italics: true, size: 18, color: '888888' })],
      alignment: AlignmentType.CENTER
    })
  );

  const doc = new Document({
    sections: [{ children: sections }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Vandarum_Modulos_Pantallas_${new Date().toISOString().split('T')[0]}.docx`);
}
