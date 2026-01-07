import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';

interface TableSchema {
  name: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
    description: string;
  }>;
  foreignKeys?: Array<{
    column: string;
    references: string;
  }>;
  rlsPolicies?: string[];
}

// Database tables for Studies module
const STUDY_TABLES: TableSchema[] = [
  {
    name: 'scouting_studies',
    description: 'Tabla principal de estudios. Almacena la definición, estado y fase actual de cada estudio de scouting tecnológico.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único del estudio' },
      { name: 'name', type: 'text', nullable: false, description: 'Nombre del estudio' },
      { name: 'description', type: 'text', nullable: true, description: 'Descripción general del estudio' },
      { name: 'problem_statement', type: 'text', nullable: true, description: 'Planteamiento del problema a resolver' },
      { name: 'context', type: 'text', nullable: true, description: 'Contexto técnico/económico del problema' },
      { name: 'objectives', type: 'text[]', nullable: true, description: 'Array de objetivos del estudio' },
      { name: 'constraints', type: 'text[]', nullable: true, description: 'Array de restricciones/limitaciones' },
      { name: 'current_phase', type: 'integer', nullable: false, default: '1', description: 'Fase actual (1-6)' },
      { name: 'status', type: 'text', nullable: false, default: 'draft', description: 'Estado: draft, in_progress, completed, archived' },
      { name: 'ai_session_id', type: 'uuid', nullable: true, description: 'FK a study_sessions (sesión IA activa)' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Usuario que creó el estudio' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'Usuario asignado al estudio' },
      { name: 'started_at', type: 'timestamptz', nullable: true, description: 'Fecha de inicio' },
      { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Fecha de finalización' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Última actualización' },
    ],
    foreignKeys: [
      { column: 'ai_session_id', references: 'study_sessions(id)' }
    ],
    rlsPolicies: [
      'Authenticated users can view studies',
      'Authenticated users can create studies',
      'Authenticated users can update studies',
      'Authenticated users can delete studies'
    ]
  },
  {
    name: 'study_research',
    description: 'Almacena los hallazgos de investigación de la Fase 1. Los findings de Railway se insertan aquí via webhook.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'session_id', type: 'uuid', nullable: true, description: 'FK a la sesión IA que lo generó' },
      { name: 'title', type: 'text', nullable: false, description: 'Título del hallazgo/fuente' },
      { name: 'source_type', type: 'text', nullable: true, description: 'Tipo: paper, report, article, patent, website, other' },
      { name: 'source_url', type: 'text', nullable: true, description: 'URL de la fuente' },
      { name: 'authors', type: 'text', nullable: true, description: 'Autores del documento' },
      { name: 'publication_date', type: 'date', nullable: true, description: 'Fecha de publicación' },
      { name: 'summary', type: 'text', nullable: true, description: 'Resumen del contenido' },
      { name: 'key_findings', type: 'text[]', nullable: true, description: 'Array de hallazgos clave' },
      { name: 'relevance_score', type: 'integer', nullable: true, description: 'Puntuación de relevancia (1-5)' },
      { name: 'ai_generated', type: 'boolean', nullable: false, default: 'false', description: 'Si fue generado por IA' },
      { name: 'ai_extracted', type: 'boolean', nullable: true, default: 'false', description: 'Si fue extraído automáticamente' },
      { name: 'knowledge_doc_id', type: 'uuid', nullable: true, description: 'FK a documento subido' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Usuario que lo creó' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' },
      { column: 'session_id', references: 'study_sessions(id)' },
      { column: 'knowledge_doc_id', references: 'knowledge_documents(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage research']
  },
  {
    name: 'study_solutions',
    description: 'Almacena las soluciones genéricas identificadas en la Fase 2.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'category', type: 'text', nullable: false, description: 'Categoría de la solución' },
      { name: 'name', type: 'text', nullable: false, description: 'Nombre de la solución' },
      { name: 'description', type: 'text', nullable: true, description: 'Descripción detallada' },
      { name: 'advantages', type: 'text[]', nullable: true, description: 'Ventajas de la solución' },
      { name: 'disadvantages', type: 'text[]', nullable: true, description: 'Desventajas de la solución' },
      { name: 'applicable_contexts', type: 'text[]', nullable: true, description: 'Contextos donde aplica' },
      { name: 'estimated_trl_range', type: 'text', nullable: true, description: 'Rango TRL estimado' },
      { name: 'cost_range', type: 'text', nullable: true, description: 'Rango de costes' },
      { name: 'implementation_time', type: 'text', nullable: true, description: 'Tiempo de implementación' },
      { name: 'priority', type: 'integer', nullable: true, default: '0', description: 'Prioridad (orden)' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Usuario que lo creó' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage solutions']
  },
  {
    name: 'study_longlist',
    description: 'Lista larga de tecnologías candidatas (Fase 3). Puede incluir tecnologías de la BD o manuales.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'technology_id', type: 'uuid', nullable: true, description: 'FK a tecnología existente (opcional)' },
      { name: 'solution_id', type: 'uuid', nullable: true, description: 'FK a solución relacionada (opcional)' },
      { name: 'technology_name', type: 'text', nullable: false, description: 'Nombre de la tecnología' },
      { name: 'provider', type: 'text', nullable: true, description: 'Proveedor/empresa' },
      { name: 'country', type: 'text', nullable: true, description: 'País de origen' },
      { name: 'trl', type: 'integer', nullable: true, description: 'Nivel TRL' },
      { name: 'brief_description', type: 'text', nullable: true, description: 'Descripción breve' },
      { name: 'inclusion_reason', type: 'text', nullable: true, description: 'Razón de inclusión' },
      { name: 'source', type: 'text', nullable: true, description: 'Origen: manual, ai_session, database' },
      { name: 'added_by', type: 'uuid', nullable: true, description: 'Usuario que lo añadió' },
      { name: 'added_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de adición' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' },
      { column: 'technology_id', references: 'technologies(id)' },
      { column: 'solution_id', references: 'study_solutions(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage longlist']
  },
  {
    name: 'study_shortlist',
    description: 'Lista corta de tecnologías seleccionadas (Fase 4). Referencias a items de la longlist.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'longlist_id', type: 'uuid', nullable: false, description: 'FK al item de longlist' },
      { name: 'selection_reason', type: 'text', nullable: true, description: 'Razón de selección' },
      { name: 'priority', type: 'integer', nullable: true, default: '0', description: 'Prioridad/orden' },
      { name: 'notes', type: 'text', nullable: true, description: 'Notas adicionales' },
      { name: 'selected_by', type: 'uuid', nullable: true, description: 'Usuario que seleccionó' },
      { name: 'selected_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de selección' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' },
      { column: 'longlist_id', references: 'study_longlist(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage shortlist']
  },
  {
    name: 'study_evaluations',
    description: 'Evaluaciones detalladas de tecnologías en shortlist (Fase 5). Incluye análisis SWOT, puntuaciones y recomendaciones.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'shortlist_id', type: 'uuid', nullable: false, description: 'FK al item de shortlist' },
      { name: 'session_id', type: 'uuid', nullable: true, description: 'FK a sesión IA que lo generó' },
      { name: 'trl_score', type: 'integer', nullable: true, description: 'Puntuación TRL (1-10)' },
      { name: 'cost_score', type: 'integer', nullable: true, description: 'Puntuación coste (1-10)' },
      { name: 'scalability_score', type: 'integer', nullable: true, description: 'Puntuación escalabilidad (1-10)' },
      { name: 'context_fit_score', type: 'integer', nullable: true, description: 'Ajuste al contexto (1-10)' },
      { name: 'innovation_potential_score', type: 'integer', nullable: true, description: 'Potencial innovador (1-10)' },
      { name: 'overall_score', type: 'numeric', nullable: true, description: 'Puntuación global calculada' },
      { name: 'strengths', type: 'text[]', nullable: true, description: 'Fortalezas (SWOT)' },
      { name: 'weaknesses', type: 'text[]', nullable: true, description: 'Debilidades (SWOT)' },
      { name: 'opportunities', type: 'text[]', nullable: true, description: 'Oportunidades (SWOT)' },
      { name: 'threats', type: 'text[]', nullable: true, description: 'Amenazas (SWOT)' },
      { name: 'recommendation', type: 'text', nullable: true, description: 'Recomendación: highly_recommended, recommended, conditional, not_recommended' },
      { name: 'ai_generated', type: 'boolean', nullable: false, default: 'false', description: 'Si fue generado por IA' },
      { name: 'ai_scores', type: 'jsonb', nullable: true, description: 'Puntuaciones generadas por IA' },
      { name: 'ai_swot', type: 'jsonb', nullable: true, description: 'Análisis SWOT por IA' },
      { name: 'ai_recommendation', type: 'text', nullable: true, description: 'Recomendación textual de IA' },
      { name: 'ai_analysis_json', type: 'jsonb', nullable: true, description: 'Análisis completo de IA' },
      { name: 'evaluated_by', type: 'uuid', nullable: true, description: 'Usuario evaluador' },
      { name: 'evaluated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de evaluación' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' },
      { column: 'shortlist_id', references: 'study_shortlist(id)' },
      { column: 'session_id', references: 'study_sessions(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage evaluations']
  },
  {
    name: 'study_reports',
    description: 'Informes finales generados (Fase 6). Soporta versionado.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'version', type: 'integer', nullable: false, default: '1', description: 'Número de versión' },
      { name: 'title', type: 'text', nullable: false, description: 'Título del informe' },
      { name: 'executive_summary', type: 'text', nullable: true, description: 'Resumen ejecutivo' },
      { name: 'methodology', type: 'text', nullable: true, description: 'Metodología empleada' },
      { name: 'problem_analysis', type: 'text', nullable: true, description: 'Análisis del problema' },
      { name: 'solutions_overview', type: 'text', nullable: true, description: 'Resumen de soluciones' },
      { name: 'technology_comparison', type: 'text', nullable: true, description: 'Comparativa de tecnologías' },
      { name: 'recommendations', type: 'text', nullable: true, description: 'Recomendaciones' },
      { name: 'conclusions', type: 'text', nullable: true, description: 'Conclusiones' },
      { name: 'appendices', type: 'jsonb', nullable: true, description: 'Anexos estructurados' },
      { name: 'file_path', type: 'text', nullable: true, description: 'Ruta al archivo generado' },
      { name: 'generated_by', type: 'text', nullable: true, default: 'manual', description: 'Origen: manual, ai' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'Usuario creador' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' }
    ],
    rlsPolicies: ['Authenticated users can manage reports']
  },
  {
    name: 'study_sessions',
    description: 'Sesiones de IA para procesamiento automático. Cada sesión representa una ejecución de agente en Railway.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio padre' },
      { name: 'session_type', type: 'text', nullable: false, description: 'Tipo: research, solutions, evaluation, report' },
      { name: 'status', type: 'text', nullable: false, default: 'pending', description: 'Estado: pending, running, completed, failed' },
      { name: 'current_phase', type: 'text', nullable: true, description: 'Fase actual de ejecución' },
      { name: 'progress_percentage', type: 'integer', nullable: true, default: '0', description: 'Progreso 0-100' },
      { name: 'config', type: 'jsonb', nullable: true, description: 'Configuración de la sesión' },
      { name: 'summary', type: 'jsonb', nullable: true, description: 'Resumen de resultados' },
      { name: 'error_message', type: 'text', nullable: true, description: 'Mensaje de error si falló' },
      { name: 'started_at', type: 'timestamptz', nullable: true, description: 'Inicio de ejecución' },
      { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Fin de ejecución' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Última actualización' },
    ],
    foreignKeys: [
      { column: 'study_id', references: 'scouting_studies(id)' }
    ],
    rlsPolicies: [
      'Users can view study sessions',
      'Users can create study sessions',
      'Users can update study sessions',
      'Service role full access'
    ]
  },
  {
    name: 'study_session_logs',
    description: 'Logs de ejecución de sesiones IA. Recibe eventos del webhook de Railway.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'session_id', type: 'uuid', nullable: false, description: 'FK a la sesión' },
      { name: 'study_id', type: 'uuid', nullable: false, description: 'FK al estudio (denormalizado)' },
      { name: 'level', type: 'text', nullable: false, default: 'info', description: 'Nivel: info, warn, error' },
      { name: 'phase', type: 'text', nullable: true, description: 'Fase del log' },
      { name: 'message', type: 'text', nullable: false, description: 'Mensaje del log' },
      { name: 'details', type: 'jsonb', nullable: true, description: 'Detalles adicionales' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Fecha del log' },
    ],
    foreignKeys: [
      { column: 'session_id', references: 'study_sessions(id)' },
      { column: 'study_id', references: 'scouting_studies(id)' }
    ],
    rlsPolicies: [
      'Users can view study session logs',
      'Users can create study session logs',
      'Service role full access'
    ]
  }
];

const WEBHOOK_EVENTS = [
  { event: 'session_start / research_start', description: 'Railway inicia la sesión de investigación', insertTable: 'study_sessions (UPDATE status=running), study_session_logs (INSERT)' },
  { event: 'research_progress / progress', description: 'Actualización de progreso durante la investigación', insertTable: 'study_sessions (UPDATE progress_percentage), study_session_logs (INSERT)' },
  { event: 'research_finding / research_found', description: 'Hallazgo de investigación encontrado por IA', insertTable: 'study_research (INSERT), study_session_logs (INSERT)' },
  { event: 'research_complete / session_complete', description: 'Finalización de la fase de investigación', insertTable: 'study_sessions (UPDATE status=completed), study_research (INSERT batch), study_session_logs (INSERT)' },
  { event: 'solution_identified', description: 'Solución identificada por IA', insertTable: 'study_solutions (INSERT), study_session_logs (INSERT)' },
  { event: 'technology_matched', description: 'Tecnología añadida a longlist por IA', insertTable: 'study_longlist (INSERT), study_session_logs (INSERT)' },
  { event: 'evaluation_completed', description: 'Evaluación de tecnología completada por IA', insertTable: 'study_evaluations (UPSERT), study_session_logs (INSERT)' },
  { event: 'error', description: 'Error en la ejecución de la sesión', insertTable: 'study_sessions (UPDATE status=failed si crítico), study_session_logs (INSERT level=error)' },
  { event: 'log', description: 'Log genérico de la sesión', insertTable: 'study_session_logs (INSERT)' },
];

const REACT_COMPONENTS = [
  { component: 'StudyDetail.tsx', path: 'src/pages/StudyDetail.tsx', description: 'Página principal de detalle de estudio. Muestra navegación por fases y tabs para cada sección.' },
  { component: 'StudyPhase1Research.tsx', path: 'src/components/study/StudyPhase1Research.tsx', description: 'Fase 1: Investigación. Muestra hallazgos, permite añadir fuentes manuales y ejecutar IA.' },
  { component: 'StudyPhase2Solutions.tsx', path: 'src/components/study/StudyPhase2Solutions.tsx', description: 'Fase 2: Soluciones. Gestión de soluciones genéricas identificadas.' },
  { component: 'StudyPhase3Longlist.tsx', path: 'src/components/study/StudyPhase3Longlist.tsx', description: 'Fase 3: Lista Larga. Añadir tecnologías desde BD o manualmente.' },
  { component: 'StudyPhase4Shortlist.tsx', path: 'src/components/study/StudyPhase4Shortlist.tsx', description: 'Fase 4: Lista Corta. Seleccionar y priorizar tecnologías de la longlist.' },
  { component: 'StudyPhase5Evaluation.tsx', path: 'src/components/study/StudyPhase5Evaluation.tsx', description: 'Fase 5: Evaluación. Análisis SWOT, puntuaciones y recomendaciones.' },
  { component: 'StudyPhase6Report.tsx', path: 'src/components/study/StudyPhase6Report.tsx', description: 'Fase 6: Informe. Generación de informe final del estudio.' },
  { component: 'AISessionPanel.tsx', path: 'src/components/study/AISessionPanel.tsx', description: 'Panel de control de sesión IA. Muestra progreso, logs y permite cancelar.' },
];

const HOOKS = [
  { hook: 'useScoutingStudies', file: 'useScoutingStudies.ts', description: 'Lista de estudios con filtro opcional por estado' },
  { hook: 'useScoutingStudy', file: 'useScoutingStudies.ts', description: 'Obtener un estudio por ID' },
  { hook: 'useCreateStudy', file: 'useScoutingStudies.ts', description: 'Crear nuevo estudio' },
  { hook: 'useUpdateStudy', file: 'useScoutingStudies.ts', description: 'Actualizar estudio existente' },
  { hook: 'useDeleteStudy', file: 'useScoutingStudies.ts', description: 'Eliminar estudio' },
  { hook: 'useStudyResearch', file: 'useScoutingStudies.ts', description: 'Obtener hallazgos de investigación de un estudio. Lee de study_research.' },
  { hook: 'useAddResearch', file: 'useScoutingStudies.ts', description: 'Añadir hallazgo de investigación' },
  { hook: 'useStudySolutions', file: 'useScoutingStudies.ts', description: 'Obtener soluciones de un estudio' },
  { hook: 'useStudyLonglist', file: 'useScoutingStudies.ts', description: 'Obtener longlist de un estudio' },
  { hook: 'useStudyShortlist', file: 'useScoutingStudies.ts', description: 'Obtener shortlist de un estudio' },
  { hook: 'useStudyEvaluations', file: 'useScoutingStudies.ts', description: 'Obtener evaluaciones de un estudio' },
  { hook: 'useStudyReports', file: 'useScoutingStudies.ts', description: 'Obtener informes de un estudio' },
  { hook: 'useStudySessions', file: 'useStudySessions.ts', description: 'Obtener sesiones IA de un estudio' },
  { hook: 'useActiveStudySession', file: 'useStudySessions.ts', description: 'Obtener sesión activa (polling cada 5s)' },
  { hook: 'useStudySessionLogs', file: 'useStudySessions.ts', description: 'Obtener logs de una sesión (polling cada 3s)' },
  { hook: 'useStartStudySession', file: 'useStudySessions.ts', description: 'Iniciar nueva sesión IA via edge function' },
  { hook: 'useAIStudySession', file: 'useAIStudySession.ts', description: 'Hook compuesto que gestiona estado completo de sesión IA' },
];

const EDGE_FUNCTIONS = [
  { 
    name: 'study-webhook', 
    path: 'supabase/functions/study-webhook/index.ts', 
    description: 'Recibe eventos de Railway y actualiza la base de datos. Punto de entrada para todos los datos generados por IA.',
    events: WEBHOOK_EVENTS
  },
  { 
    name: 'study-start-session', 
    path: 'supabase/functions/study-start-session/index.ts', 
    description: 'Inicia una sesión de IA en Railway. Crea registro en study_sessions y llama al endpoint de Railway.',
    events: []
  },
  { 
    name: 'study-proxy', 
    path: 'supabase/functions/study-proxy/index.ts', 
    description: 'Proxy para comunicación con Railway. Permite hacer llamadas autenticadas desde el frontend.',
    events: []
  },
];

type DocumentChild = Paragraph | Table;

function createBorderedCell(content: string, isHeader = false, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: content, bold: isHeader, size: isHeader ? 20 : 18 })],
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: isHeader ? { type: ShadingType.SOLID, color: 'E8E8E8' } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });
}

export async function generateStudyArchitectureDoc(): Promise<void> {
  const sections: DocumentChild[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'ARQUITECTURA TÉCNICA', bold: true, size: 48 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Módulo de Estudios de Scouting Tecnológico', size: 32, color: '666666' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Executive Summary
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '1. RESUMEN EJECUTIVO', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({
      children: [new TextRun({ 
        text: 'El módulo de Estudios permite gestionar proyectos de scouting tecnológico estructurados en 6 fases: Investigación, Soluciones, Lista Larga, Lista Corta, Evaluación e Informe. Cada fase tiene su tabla dedicada en la base de datos y puede ser asistida por IA mediante sesiones que se ejecutan en Railway y envían resultados via webhook.',
        size: 22 
      })],
      spacing: { after: 200 },
    })
  );

  // Database Architecture
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '2. ARQUITECTURA DE BASE DE DATOS', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: 'El módulo utiliza 9 tablas principales interconectadas:', size: 22 })],
      spacing: { after: 200 },
    })
  );

  // Table for each schema
  for (const table of STUDY_TABLES) {
    sections.push(
      new Paragraph({ 
        children: [new TextRun({ text: `2.${STUDY_TABLES.indexOf(table) + 1}. ${table.name}`, bold: true, size: 24 })], 
        heading: HeadingLevel.HEADING_2, 
        spacing: { before: 300, after: 100 } 
      }),
      new Paragraph({ children: [new TextRun({ text: table.description, size: 20, italics: true })], spacing: { after: 150 } })
    );

    // Columns table
    const rows = [
      new TableRow({
        children: [
          createBorderedCell('Columna', true, 20),
          createBorderedCell('Tipo', true, 15),
          createBorderedCell('Null', true, 8),
          createBorderedCell('Default', true, 15),
          createBorderedCell('Descripción', true, 42),
        ],
      }),
      ...table.columns.map(col => new TableRow({
        children: [
          createBorderedCell(col.name, false, 20),
          createBorderedCell(col.type, false, 15),
          createBorderedCell(col.nullable ? 'Sí' : 'No', false, 8),
          createBorderedCell(col.default || '-', false, 15),
          createBorderedCell(col.description, false, 42),
        ],
      })),
    ];

    sections.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));

    // Foreign keys
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      sections.push(
        new Paragraph({ 
          children: [new TextRun({ text: 'Foreign Keys:', bold: true, size: 18 })], 
          spacing: { before: 100, after: 50 } 
        })
      );
      for (const fk of table.foreignKeys) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `  • ${fk.column} → ${fk.references}`, size: 18 })],
        }));
      }
    }

    // RLS Policies
    if (table.rlsPolicies && table.rlsPolicies.length > 0) {
      sections.push(
        new Paragraph({ 
          children: [new TextRun({ text: 'RLS Policies:', bold: true, size: 18 })], 
          spacing: { before: 100, after: 50 } 
        })
      );
      for (const policy of table.rlsPolicies) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `  • ${policy}`, size: 18 })],
        }));
      }
    }
  }

  // Data Flow Section
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '3. FLUJO DE DATOS', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '3.1. Creación de Estudio', bold: true, size: 24 })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: '1. Usuario crea estudio desde /studies → INSERT en scouting_studies', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '2. useCreateStudy() ejecuta supabase.from("scouting_studies").insert()', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '3. Estudio se guarda con status="draft" y current_phase=1', size: 20 })], spacing: { after: 150 } }),

    new Paragraph({ children: [new TextRun({ text: '3.2. Flujo de Research Findings (Railway → BD)', bold: true, size: 24 })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: '1. Usuario inicia sesión IA en StudyPhase1Research', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '2. useStartStudySession() llama a study-start-session edge function', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '3. Edge function crea registro en study_sessions y llama a Railway', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '4. Railway procesa y envía eventos a study-webhook', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '5. Webhook inserta hallazgos en study_research con ai_generated=true', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '6. StudyPhase1Research usa useStudyResearch() que lee de study_research', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '7. Los datos PERSISTEN en BD - no dependen del estado React', size: 20, bold: true })], spacing: { after: 150 } }),

    new Paragraph({ children: [new TextRun({ text: '3.3. Persistencia de Datos', bold: true, size: 24 })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: '• Todos los hallazgos se guardan en study_research (tabla real, no estado)', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '• Al refrescar la página, useStudyResearch() vuelve a leer de Supabase', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '• React Query cachea temporalmente pero siempre sincroniza con BD', size: 20 })], spacing: { after: 150 } })
  );

  // Webhook Section
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '4. EDGE FUNCTION: study-webhook', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Ubicación: supabase/functions/study-webhook/index.ts', size: 20, italics: true })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: 'Eventos manejados:', bold: true, size: 22 })], spacing: { after: 100 } })
  );

  const webhookRows = [
    new TableRow({
      children: [
        createBorderedCell('Evento', true, 25),
        createBorderedCell('Descripción', true, 35),
        createBorderedCell('Tablas Afectadas', true, 40),
      ],
    }),
    ...WEBHOOK_EVENTS.map(evt => new TableRow({
      children: [
        createBorderedCell(evt.event, false, 25),
        createBorderedCell(evt.description, false, 35),
        createBorderedCell(evt.insertTable, false, 40),
      ],
    })),
  ];

  sections.push(new Table({ rows: webhookRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

  // Phases Implementation Status
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '5. ESTADO DE IMPLEMENTACIÓN POR FASE', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
  );

  const phaseStatus = [
    { phase: 'Fase 1: Investigación', table: 'study_research', status: '✅ Completa', notes: 'Tabla creada, webhook funcional, UI implementada' },
    { phase: 'Fase 2: Soluciones', table: 'study_solutions', status: '✅ Completa', notes: 'Tabla creada, UI implementada' },
    { phase: 'Fase 3: Lista Larga', table: 'study_longlist', status: '✅ Completa', notes: 'Tabla creada, UI implementada, soporta BD y manual' },
    { phase: 'Fase 4: Lista Corta', table: 'study_shortlist', status: '✅ Completa', notes: 'Tabla creada, UI implementada' },
    { phase: 'Fase 5: Evaluación', table: 'study_evaluations', status: '✅ Completa', notes: 'Tabla creada, soporta SWOT y scores IA' },
    { phase: 'Fase 6: Informe', table: 'study_reports', status: '✅ Completa', notes: 'Tabla creada, soporta versionado' },
  ];

  const phaseRows = [
    new TableRow({
      children: [
        createBorderedCell('Fase', true, 20),
        createBorderedCell('Tabla', true, 20),
        createBorderedCell('Estado', true, 15),
        createBorderedCell('Notas', true, 45),
      ],
    }),
    ...phaseStatus.map(p => new TableRow({
      children: [
        createBorderedCell(p.phase, false, 20),
        createBorderedCell(p.table, false, 20),
        createBorderedCell(p.status, false, 15),
        createBorderedCell(p.notes, false, 45),
      ],
    })),
  ];

  sections.push(new Table({ rows: phaseRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

  // React Components Section
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '6. COMPONENTES REACT', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
  );

  const componentRows = [
    new TableRow({
      children: [
        createBorderedCell('Componente', true, 25),
        createBorderedCell('Ruta', true, 35),
        createBorderedCell('Descripción', true, 40),
      ],
    }),
    ...REACT_COMPONENTS.map(c => new TableRow({
      children: [
        createBorderedCell(c.component, false, 25),
        createBorderedCell(c.path, false, 35),
        createBorderedCell(c.description, false, 40),
      ],
    })),
  ];

  sections.push(new Table({ rows: componentRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

  // Hooks Section
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '7. HOOKS PERSONALIZADOS', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
  );

  const hookRows = [
    new TableRow({
      children: [
        createBorderedCell('Hook', true, 25),
        createBorderedCell('Archivo', true, 25),
        createBorderedCell('Descripción', true, 50),
      ],
    }),
    ...HOOKS.map(h => new TableRow({
      children: [
        createBorderedCell(h.hook, false, 25),
        createBorderedCell(h.file, false, 25),
        createBorderedCell(h.description, false, 50),
      ],
    })),
  ];

  sections.push(new Table({ rows: hookRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

  // Diagram placeholder
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '8. DIAGRAMA DE ARQUITECTURA', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Flujo de datos Research Finding → Base de Datos:', bold: true, size: 22 })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: '┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '│   Usuario    │───▶│ study-start-    │───▶│    Railway      │', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '│  (Frontend)  │    │ session         │    │  (IA Agent)     │', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '└──────────────┘    └──────────────────┘    └────────┬────────┘', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '       ▲                                            │        ', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '       │                                            ▼        ', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '┌──────┴───────┐    ┌──────────────────┐    ┌─────────────────┐', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '│ useStudy     │◀───│  study_research  │◀───│  study-webhook  │', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '│ Research()   │    │  (Supabase)      │    │  (Edge Func)    │', size: 18, font: 'Courier New' })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: '└──────────────┘    └──────────────────┘    └─────────────────┘', size: 18, font: 'Courier New' })], spacing: { after: 200 } })
  );

  // Integration flow section
  sections.push(
    new Paragraph({ children: [new TextRun({ text: '9. FLUJO DE INTEGRACIÓN PROPUESTO', bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Research Finding → Preparar Ficha → Lista Larga → Evaluación → Base de Datos:', bold: true, size: 22 })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: '1. Hallazgo en study_research puede convertirse en entrada de longlist', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '2. Desde longlist, se puede crear ficha en technologies (tabla principal)', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '3. La evaluación en study_evaluations puede generar quality_score', size: 20 })], spacing: { after: 50 } }),
    new Paragraph({ children: [new TextRun({ text: '4. El informe final puede exportar tecnologías evaluadas a la BD principal', size: 20 })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: 'Tablas involucradas en el flujo completo:', size: 20 })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: 'study_research → study_longlist → study_shortlist → study_evaluations → technologies', size: 18, font: 'Courier New' })], spacing: { after: 200 } })
  );

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Arquitectura_Modulo_Estudios_${new Date().toISOString().split('T')[0]}.docx`);
}
