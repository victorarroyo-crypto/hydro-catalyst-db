import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ShadingType, ITableCellOptions } from 'docx';
import { saveAs } from 'file-saver';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  description?: string;
}

interface DatabaseTable {
  name: string;
  description: string;
  location: 'lovable' | 'external' | 'both';
  columns: TableColumn[];
  relationships?: string[];
  rlsPolicies?: string[];
}

interface WorkflowStep {
  step: number;
  action: string;
  source: string;
  destination: string;
  description: string;
}

// Type for document content that can be Paragraph or Table
type DocumentContent = Paragraph | Table;

// ============= DATABASE SCHEMA DEFINITIONS =============

const LOVABLE_CLOUD_TABLES: DatabaseTable[] = [
  {
    name: 'technologies',
    description: 'Tabla principal de tecnologías aprobadas y publicadas. Contiene todas las tecnologías que han pasado el proceso de revisión.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'Nombre de la tecnología', type: 'TEXT', nullable: false, description: 'Nombre oficial de la tecnología' },
      { name: 'Tipo de tecnología', type: 'TEXT', nullable: false, description: 'Categoría principal (ej: Software, Hardware)' },
      { name: 'Subcategoría', type: 'TEXT', nullable: true, description: 'Subcategoría dentro del tipo' },
      { name: 'Sector y subsector', type: 'TEXT', nullable: true, description: 'Sector industrial aplicable' },
      { name: 'Proveedor / Empresa', type: 'TEXT', nullable: true, description: 'Empresa que desarrolla/vende la tecnología' },
      { name: 'País de origen', type: 'TEXT', nullable: true, description: 'País donde se desarrolló' },
      { name: 'Paises donde actua', type: 'TEXT', nullable: true, description: 'Países donde opera' },
      { name: 'Web de la empresa', type: 'TEXT', nullable: true, description: 'URL del sitio web' },
      { name: 'Email de contacto', type: 'TEXT', nullable: true, description: 'Email para contacto comercial' },
      { name: 'Descripción técnica breve', type: 'TEXT', nullable: true, description: 'Resumen técnico de la tecnología' },
      { name: 'Aplicación principal', type: 'TEXT', nullable: true, description: 'Uso principal de la tecnología' },
      { name: 'Ventaja competitiva clave', type: 'TEXT', nullable: true, description: 'Principal diferenciador' },
      { name: 'Porque es innovadora', type: 'TEXT', nullable: true, description: 'Aspectos innovadores' },
      { name: 'Grado de madurez (TRL)', type: 'INTEGER', nullable: true, description: 'Technology Readiness Level (1-9)' },
      { name: 'Casos de referencia', type: 'TEXT', nullable: true, description: 'Casos de uso existentes' },
      { name: 'Comentarios del analista', type: 'TEXT', nullable: true, description: 'Notas internas del analista' },
      { name: 'Fecha de scouting', type: 'DATE', nullable: true, description: 'Fecha de descubrimiento' },
      { name: 'Estado del seguimiento', type: 'TEXT', nullable: true, description: 'Estado de seguimiento comercial' },
      { name: 'tipo_id', type: 'INTEGER', nullable: true, description: 'FK a taxonomy_tipos' },
      { name: 'subcategoria_id', type: 'INTEGER', nullable: true, description: 'FK a taxonomy_subcategorias' },
      { name: 'sector_id', type: 'VARCHAR', nullable: true, description: 'FK a taxonomy_sectores' },
      { name: 'subsector_industrial', type: 'VARCHAR', nullable: true, description: 'Subsector específico' },
      { name: 'status', type: 'TEXT', nullable: true, default: 'active', description: 'Estado: active, inactive, en_revision' },
      { name: 'review_status', type: 'TEXT', nullable: true, default: 'none', description: 'Estado de revisión: none, pending, in_review, completed' },
      { name: 'quality_score', type: 'INTEGER', nullable: true, default: '0', description: 'Puntuación de calidad (0-100)' },
      { name: 'reviewer_id', type: 'UUID', nullable: true, description: 'Usuario revisor asignado' },
      { name: 'review_requested_at', type: 'TIMESTAMP', nullable: true, description: 'Fecha solicitud revisión' },
      { name: 'review_requested_by', type: 'UUID', nullable: true, description: 'Usuario que solicitó revisión' },
      { name: 'reviewed_at', type: 'TIMESTAMP', nullable: true, description: 'Fecha de revisión completada' },
      { name: 'updated_by', type: 'UUID', nullable: true, description: 'Último usuario que modificó' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Última modificación' },
    ],
    relationships: [
      'tipo_id → taxonomy_tipos.id',
      'subcategoria_id → taxonomy_subcategorias.id',
      'sector_id → taxonomy_sectores.id',
    ],
    rlsPolicies: [
      'Analysts and above can insert technologies',
      'Analysts and above can update technologies',
      'Internal users can delete technologies',
      'Users can view technologies based on role (clients only see active)',
    ],
  },
  {
    name: 'scouting_queue',
    description: 'Cola de tecnologías pendientes de revisión. Las tecnologías entran aquí desde el proceso de scouting y pasan por revisión antes de ser aprobadas.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'Nombre de la tecnología', type: 'TEXT', nullable: false, description: 'Nombre de la tecnología' },
      { name: 'Tipo de tecnología', type: 'TEXT', nullable: false, default: 'Sin clasificar', description: 'Tipo sugerido' },
      { name: 'queue_status', type: 'TEXT', nullable: true, default: 'pending', description: 'Estado en cola: pending, reviewing, pending_approval, approved, rejected' },
      { name: 'priority', type: 'TEXT', nullable: true, default: 'normal', description: 'Prioridad: low, normal, high, urgent' },
      { name: 'source', type: 'TEXT', nullable: true, default: 'manual', description: 'Fuente: manual, api, scraping' },
      { name: 'source_url', type: 'TEXT', nullable: true, description: 'URL de origen' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Notas de revisión' },
      { name: 'rejection_reason', type: 'TEXT', nullable: true, description: 'Motivo de rechazo si aplica' },
      { name: 'reviewed_by', type: 'UUID', nullable: true, description: 'Usuario que revisó' },
      { name: 'reviewed_at', type: 'TIMESTAMP', nullable: true, description: 'Fecha de revisión' },
      { name: 'created_by', type: 'UUID', nullable: true, description: 'Usuario que creó' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Última modificación' },
    ],
    relationships: [
      'tipo_id → taxonomy_tipos.id',
      'subcategoria_id → taxonomy_subcategorias.id',
      'sector_id → taxonomy_sectores.id',
    ],
    rlsPolicies: [
      'Internal users can view scouting_queue',
      'Internal users can insert scouting_queue',
      'Internal users can update scouting_queue',
      'Admins and supervisors can delete scouting_queue',
    ],
  },
  {
    name: 'rejected_technologies',
    description: 'Archivo histórico de tecnologías rechazadas. Mantiene registro de por qué se rechazaron y quién las rechazó.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'original_scouting_id', type: 'UUID', nullable: true, description: 'ID original en scouting_queue' },
      { name: 'Nombre de la tecnología', type: 'TEXT', nullable: false, description: 'Nombre de la tecnología' },
      { name: 'rejection_reason', type: 'TEXT', nullable: false, description: 'Motivo del rechazo' },
      { name: 'rejection_category', type: 'TEXT', nullable: true, description: 'Categoría: duplicate, out_of_scope, low_quality, other' },
      { name: 'rejected_by', type: 'UUID', nullable: true, description: 'Usuario que rechazó' },
      { name: 'rejected_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de rechazo' },
      { name: 'original_data', type: 'JSONB', nullable: true, description: 'Datos originales completos' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    relationships: [],
    rlsPolicies: [
      'Internal users can view rejected_technologies',
      'Internal users can insert rejected_technologies',
      'Admins can update rejected_technologies',
      'Admins can delete rejected_technologies',
    ],
  },
  {
    name: 'taxonomy_tipos',
    description: 'Catálogo maestro de tipos de tecnología. Define las categorías principales.',
    location: 'both',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, default: 'SERIAL', description: 'Identificador único' },
      { name: 'codigo', type: 'VARCHAR', nullable: false, description: 'Código único (ej: SW, HW)' },
      { name: 'nombre', type: 'VARCHAR', nullable: false, description: 'Nombre del tipo' },
      { name: 'descripcion', type: 'TEXT', nullable: true, description: 'Descripción detallada' },
    ],
    rlsPolicies: [
      'Anyone can read taxonomy_tipos',
      'Admins can manage taxonomy_tipos',
    ],
  },
  {
    name: 'taxonomy_subcategorias',
    description: 'Subcategorías dentro de cada tipo de tecnología.',
    location: 'both',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, default: 'SERIAL', description: 'Identificador único' },
      { name: 'tipo_id', type: 'INTEGER', nullable: true, description: 'FK al tipo padre' },
      { name: 'codigo', type: 'VARCHAR', nullable: false, description: 'Código único' },
      { name: 'nombre', type: 'VARCHAR', nullable: false, description: 'Nombre de la subcategoría' },
    ],
    relationships: ['tipo_id → taxonomy_tipos.id'],
    rlsPolicies: [
      'Anyone can read taxonomy_subcategorias',
      'Admins can manage taxonomy_subcategorias',
    ],
  },
  {
    name: 'taxonomy_sectores',
    description: 'Catálogo de sectores industriales.',
    location: 'both',
    columns: [
      { name: 'id', type: 'VARCHAR', nullable: false, description: 'Código del sector (ej: AGR, IND)' },
      { name: 'nombre', type: 'VARCHAR', nullable: false, description: 'Nombre del sector' },
      { name: 'descripcion', type: 'TEXT', nullable: true, description: 'Descripción del sector' },
    ],
    rlsPolicies: [
      'Anyone can read taxonomy_sectores',
      'Admins can manage taxonomy_sectores',
    ],
  },
  {
    name: 'profiles',
    description: 'Perfiles de usuario con información adicional y rol.',
    location: 'lovable',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'user_id', type: 'UUID', nullable: false, description: 'FK a auth.users' },
      { name: 'full_name', type: 'TEXT', nullable: true, description: 'Nombre completo' },
      { name: 'role', type: 'app_role', nullable: false, default: 'client_basic', description: 'Rol del usuario' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Última modificación' },
    ],
    rlsPolicies: [
      'Users can view their own profile',
      'Users can update their own profile',
      'Admins can view all profiles',
    ],
  },
  {
    name: 'user_roles',
    description: 'Asignación de roles a usuarios para control de acceso.',
    location: 'lovable',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'user_id', type: 'UUID', nullable: false, description: 'FK a auth.users' },
      { name: 'role', type: 'app_role', nullable: false, description: 'Rol asignado' },
    ],
    rlsPolicies: [
      'Users can view their own roles',
      'Admins can manage roles',
    ],
  },
  {
    name: 'projects',
    description: 'Proyectos de clientes que agrupan tecnologías seleccionadas.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del proyecto' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Descripción' },
      { name: 'client_id', type: 'UUID', nullable: true, description: 'Cliente asignado' },
      { name: 'status', type: 'TEXT', nullable: true, default: 'draft', description: 'Estado del proyecto' },
      { name: 'target_date', type: 'DATE', nullable: true, description: 'Fecha objetivo' },
      { name: 'responsible_user_id', type: 'UUID', nullable: true, description: 'Usuario responsable' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Notas internas' },
      { name: 'created_by', type: 'UUID', nullable: true, description: 'Usuario creador' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Última modificación' },
    ],
    rlsPolicies: [
      'Users can view their own projects',
      'Users can create projects',
      'Users can update their own projects',
      'Users can delete their own projects',
    ],
  },
  {
    name: 'project_technologies',
    description: 'Relación N:M entre proyectos y tecnologías.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'project_id', type: 'UUID', nullable: false, description: 'FK a projects' },
      { name: 'technology_id', type: 'UUID', nullable: false, description: 'FK a technologies' },
      { name: 'added_by', type: 'UUID', nullable: true, description: 'Usuario que añadió' },
      { name: 'added_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de adición' },
    ],
    relationships: [
      'project_id → projects.id',
      'technology_id → technologies.id',
    ],
    rlsPolicies: [
      'Users can view project technologies',
      'Users can add technologies to projects',
      'Users can remove technologies from projects',
    ],
  },
  {
    name: 'casos_de_estudio',
    description: 'Casos de estudio derivados de tecnologías aprobadas.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre del caso' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Descripción' },
      { name: 'entity_type', type: 'TEXT', nullable: true, description: 'Tipo de entidad' },
      { name: 'country', type: 'TEXT', nullable: true, description: 'País' },
      { name: 'sector', type: 'TEXT', nullable: true, description: 'Sector' },
      { name: 'technology_types', type: 'TEXT[]', nullable: true, description: 'Tipos de tecnología' },
      { name: 'source_technology_id', type: 'UUID', nullable: true, description: 'Tecnología origen' },
      { name: 'original_data', type: 'JSONB', nullable: true, description: 'Datos originales' },
      { name: 'created_by', type: 'UUID', nullable: true, description: 'Usuario creador' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: true, default: 'now()', description: 'Fecha de creación' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: true, default: 'now()', description: 'Última modificación' },
    ],
    rlsPolicies: [
      'Anyone can read casos_de_estudio',
      'Internal users can insert/update casos_de_estudio',
      'Admins can delete casos_de_estudio',
    ],
  },
  {
    name: 'technological_trends',
    description: 'Tendencias tecnológicas identificadas.',
    location: 'both',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Nombre de la tendencia' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Descripción' },
      { name: 'technology_type', type: 'TEXT', nullable: false, description: 'Tipo de tecnología' },
      { name: 'subcategory', type: 'TEXT', nullable: true, description: 'Subcategoría' },
      { name: 'sector', type: 'TEXT', nullable: true, description: 'Sector' },
      { name: 'source_technology_id', type: 'UUID', nullable: true, description: 'Tecnología origen' },
      { name: 'original_data', type: 'JSONB', nullable: true, description: 'Datos originales' },
      { name: 'created_by', type: 'UUID', nullable: true, description: 'Usuario creador' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    rlsPolicies: [
      'Anyone can view trends',
      'Internal users can insert/update trends',
      'Admins can delete trends',
    ],
  },
  {
    name: 'user_favorites',
    description: 'Tecnologías marcadas como favoritas por usuarios.',
    location: 'lovable',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'user_id', type: 'UUID', nullable: false, description: 'FK a auth.users' },
      { name: 'technology_id', type: 'UUID', nullable: false, description: 'FK a technologies' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de marcado' },
    ],
    relationships: ['technology_id → technologies.id'],
    rlsPolicies: [
      'Users can view their own favorites',
      'Users can add favorites',
      'Users can remove favorites',
    ],
  },
  {
    name: 'technology_edits',
    description: 'Solicitudes de edición pendientes de aprobación.',
    location: 'lovable',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', description: 'Identificador único' },
      { name: 'technology_id', type: 'UUID', nullable: true, description: 'FK a technologies' },
      { name: 'created_by', type: 'UUID', nullable: false, description: 'Usuario que propuso' },
      { name: 'proposed_changes', type: 'JSONB', nullable: false, description: 'Cambios propuestos' },
      { name: 'original_data', type: 'JSONB', nullable: true, description: 'Datos originales' },
      { name: 'status', type: 'edit_status', nullable: false, default: 'pending', description: 'Estado: pending, approved, rejected' },
      { name: 'comments', type: 'TEXT', nullable: true, description: 'Comentarios del solicitante' },
      { name: 'review_comments', type: 'TEXT', nullable: true, description: 'Comentarios del revisor' },
      { name: 'edit_type', type: 'TEXT', nullable: true, default: 'update', description: 'Tipo de edición' },
      { name: 'reviewed_by', type: 'UUID', nullable: true, description: 'Revisor' },
      { name: 'reviewed_at', type: 'TIMESTAMP', nullable: true, description: 'Fecha de revisión' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'now()', description: 'Fecha de creación' },
    ],
    relationships: ['technology_id → technologies.id'],
    rlsPolicies: [
      'Users can view their own edits',
      'Internal users can create edits',
      'Supervisors and admins can view all edits',
      'Supervisors and admins can update edits',
    ],
  },
];

// ============= EXTERNAL DATABASE FIELD MAPPINGS =============

const FIELD_MAPPINGS = {
  title: 'Mapeo de Campos entre Bases de Datos',
  description: 'La base de datos externa (Railway) usa nombres de campos en español simplificado, mientras que Lovable Cloud usa nombres descriptivos completos.',
  mappings: [
    { external: 'nombre', internal: 'Nombre de la tecnología', description: 'Nombre de la tecnología' },
    { external: 'proveedor', internal: 'Proveedor / Empresa', description: 'Empresa proveedora' },
    { external: 'pais', internal: 'País de origen', description: 'País de origen' },
    { external: 'web', internal: 'Web de la empresa', description: 'Sitio web' },
    { external: 'email', internal: 'Email de contacto', description: 'Email de contacto' },
    { external: 'descripcion', internal: 'Descripción técnica breve', description: 'Descripción' },
    { external: 'tipo_sugerido', internal: 'Tipo de tecnología', description: 'Tipo de tecnología' },
    { external: 'subcategoria', internal: 'Subcategoría', description: 'Subcategoría' },
    { external: 'trl_estimado', internal: 'Grado de madurez (TRL)', description: 'Nivel TRL' },
    { external: 'sector', internal: 'Sector y subsector', description: 'Sector' },
    { external: 'aplicacion', internal: 'Aplicación principal', description: 'Aplicación' },
    { external: 'ventaja', internal: 'Ventaja competitiva clave', description: 'Ventaja competitiva' },
    { external: 'innovacion', internal: 'Porque es innovadora', description: 'Innovación' },
    { external: 'referencias', internal: 'Casos de referencia', description: 'Referencias' },
    { external: 'paises_actua', internal: 'Paises donde actua', description: 'Países operación' },
    { external: 'notas', internal: 'Comentarios del analista', description: 'Notas' },
    { external: 'status', internal: 'queue_status', description: 'Estado en cola' },
    { external: 'fecha_scouting', internal: 'Fecha de scouting', description: 'Fecha scouting' },
    { external: 'seguimiento', internal: 'Estado del seguimiento', description: 'Seguimiento' },
  ],
  statusMappings: [
    { external: 'review', internal: 'review', description: 'Pendiente de revisión por analista' },
    { external: 'pending', internal: 'review', description: 'Nuevo, pendiente revisión' },
    { external: 'pending_approval', internal: 'pending_approval', description: 'Pendiente aprobación supervisor' },
    { external: 'approved', internal: 'approved', description: 'Aprobado y movido a technologies' },
    { external: 'rejected', internal: 'rejected', description: 'Rechazado, movido a rejected_technologies' },
  ],
};

// ============= WORKFLOW DEFINITIONS =============

const SCOUTING_WORKFLOW: WorkflowStep[] = [
  {
    step: 1,
    action: 'Entrada de Tecnología',
    source: 'Railway (API/Scraping)',
    destination: 'scouting_queue (External)',
    description: 'Las tecnologías nuevas entran al sistema desde procesos de scraping o entrada manual en Railway. Se insertan en scouting_queue con status="review".',
  },
  {
    step: 2,
    action: 'Sincronización a Lovable',
    source: 'scouting_queue (External)',
    destination: 'UI Lovable Cloud',
    description: 'La edge function "external-scouting-queue" obtiene los datos de la DB externa, transforma los campos y los presenta en la interfaz de Lovable.',
  },
  {
    step: 3,
    action: 'Revisión por Analista',
    source: 'UI Lovable Cloud',
    destination: 'scouting_queue (External)',
    description: 'El analista revisa, edita y completa la información. Al finalizar, cambia el estado a "pending_approval" para que un supervisor lo revise.',
  },
  {
    step: 4,
    action: 'Aprobación por Supervisor/Admin',
    source: 'scouting_queue (External)',
    destination: 'technologies (Lovable Cloud)',
    description: 'El supervisor o admin revisa la tecnología. Si la aprueba, se copia a la tabla "technologies" de Lovable Cloud (Master) y se marca como "approved" en la externa.',
  },
  {
    step: 5,
    action: 'Rechazo (si aplica)',
    source: 'scouting_queue (External)',
    destination: 'rejected_technologies (External)',
    description: 'Si se rechaza, se mueve a "rejected_technologies" con el motivo del rechazo y se elimina de scouting_queue.',
  },
  {
    step: 6,
    action: 'Sincronización Master → External',
    source: 'technologies (Lovable Cloud)',
    destination: 'technologies (External)',
    description: 'Los triggers de sincronización mantienen la DB externa actualizada con los cambios de la Master (Lovable Cloud).',
  },
];

const USER_ROLES = [
  {
    role: 'admin',
    description: 'Administrador del sistema',
    permissions: [
      'Gestión completa de usuarios y roles',
      'Aprobar/rechazar tecnologías en cualquier etapa',
      'Eliminar tecnologías y registros',
      'Acceso a auditoría y configuración',
      'Gestión de taxonomías',
    ],
  },
  {
    role: 'supervisor',
    description: 'Supervisor de equipo',
    permissions: [
      'Aprobar/rechazar tecnologías pendientes',
      'Ver todas las tecnologías en cola',
      'Gestionar proyectos',
      'Ver registros de auditoría',
    ],
  },
  {
    role: 'analyst',
    description: 'Analista de tecnologías',
    permissions: [
      'Revisar y editar tecnologías en scouting',
      'Enviar tecnologías a aprobación',
      'Rechazar tecnologías durante revisión',
      'Crear nuevas entradas de scouting',
    ],
  },
  {
    role: 'client_basic',
    description: 'Cliente básico',
    permissions: [
      'Ver tecnologías publicadas (status=active)',
      'Marcar favoritos',
      'Ver proyectos asignados',
    ],
  },
  {
    role: 'client_professional',
    description: 'Cliente profesional',
    permissions: [
      'Todo lo de client_basic',
      'Crear proyectos propios',
      'Exportar datos',
    ],
  },
  {
    role: 'client_enterprise',
    description: 'Cliente enterprise',
    permissions: [
      'Todo lo de client_professional',
      'Acceso a API',
      'Búsqueda avanzada con IA',
    ],
  },
];

// ============= DOCUMENT GENERATION =============

function createStyledCell(text: string, isHeader: boolean = false, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: isHeader ? 22 : 20,
            color: isHeader ? 'FFFFFF' : '000000',
          }),
        ],
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: isHeader ? { fill: '2C5282', type: ShadingType.SOLID, color: '2C5282' } : undefined,
  });
}

function createTableFromData(headers: string[], rows: string[][], widths?: number[]): Table {
  const tableRows: TableRow[] = [];
  
  // Header row
  tableRows.push(
    new TableRow({
      children: headers.map((h, i) => createStyledCell(h, true, widths?.[i])),
      tableHeader: true,
    })
  );
  
  // Data rows
  rows.forEach(row => {
    tableRows.push(
      new TableRow({
        children: row.map((cell, i) => createStyledCell(cell, false, widths?.[i])),
      })
    );
  });
  
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

export async function generateDatabaseDocumentation(): Promise<void> {
  const sections: DocumentContent[] = [];
  
  // ============= TITLE PAGE =============
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'DOCUMENTACIÓN DE ARQUITECTURA',
          bold: true,
          size: 48,
          color: '2C5282',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Sistema de Gestión de Tecnologías Vandarum',
          size: 32,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generado: ${new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    })
  );
  
  // ============= TABLE OF CONTENTS =============
  sections.push(
    new Paragraph({
      text: 'ÍNDICE',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({ text: '1. Arquitectura General', spacing: { after: 100 } }),
    new Paragraph({ text: '2. Bases de Datos', spacing: { after: 100 } }),
    new Paragraph({ text: '   2.1 Lovable Cloud (Master)', spacing: { after: 100 } }),
    new Paragraph({ text: '   2.2 Railway (External)', spacing: { after: 100 } }),
    new Paragraph({ text: '3. Esquema de Tablas', spacing: { after: 100 } }),
    new Paragraph({ text: '4. Mapeo de Campos', spacing: { after: 100 } }),
    new Paragraph({ text: '5. Flujo de Trabajo (Workflow)', spacing: { after: 100 } }),
    new Paragraph({ text: '6. Roles y Permisos', spacing: { after: 100 } }),
    new Paragraph({ text: '7. Sincronización entre Bases de Datos', spacing: { after: 100 } }),
    new Paragraph({ text: '8. Edge Functions', spacing: { after: 100 } }),
    new Paragraph({ text: '9. Políticas de Seguridad (RLS)', spacing: { after: 400 } })
  );
  
  // ============= SECTION 1: ARCHITECTURE =============
  sections.push(
    new Paragraph({
      text: '1. ARQUITECTURA GENERAL',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      text: 'El sistema utiliza una arquitectura de doble base de datos con sincronización bidireccional:',
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Lovable Cloud (Master): ', bold: true }),
        new TextRun({ text: 'Base de datos principal que contiene los datos definitivos y controla la autenticación.' }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Railway (External): ', bold: true }),
        new TextRun({ text: 'Base de datos secundaria conectada a procesos de scraping y APIs externas. Los datos nuevos entran aquí primero.' }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Flujo de Datos Principal:', bold: true }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: 'Railway → scouting_queue → Revisión → Aprobación → technologies (Master) → Sync → Railway',
      spacing: { after: 400 },
    })
  );
  
  // ============= SECTION 2: DATABASES =============
  sections.push(
    new Paragraph({
      text: '2. BASES DE DATOS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: '2.1 Lovable Cloud (Master)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: 'URL: Gestionado automáticamente por Lovable',
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Funciones:', bold: true }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Almacenamiento definitivo de tecnologías aprobadas',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Gestión de usuarios y autenticación',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Proyectos y favoritos de clientes',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Logs de auditoría y uso de IA',
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: '2.2 Railway (External)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: 'URL: Configurado via EXTERNAL_SUPABASE_URL',
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Funciones:', bold: true }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Recepción de datos de scraping/APIs',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Cola de scouting para revisión',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Almacenamiento de tecnologías rechazadas',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: '• Réplica sincronizada de datos master',
      spacing: { after: 400 },
    })
  );
  
  // ============= SECTION 3: TABLES =============
  sections.push(
    new Paragraph({
      text: '3. ESQUEMA DE TABLAS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );
  
  for (const table of LOVABLE_CLOUD_TABLES) {
    sections.push(
      new Paragraph({
        text: `Tabla: ${table.name}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: table.description,
            italics: true,
          }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Ubicación: ', bold: true }),
          new TextRun({ 
            text: table.location === 'both' ? 'Lovable Cloud + Railway' : 
                  table.location === 'lovable' ? 'Solo Lovable Cloud' : 'Solo Railway' 
          }),
        ],
        spacing: { after: 100 },
      })
    );
    
    // Column table
    const columnRows = table.columns.slice(0, 15).map(col => [
      col.name,
      col.type,
      col.nullable ? 'Sí' : 'No',
      col.default || '-',
      col.description || '-',
    ]);
    
    sections.push(
      createTableFromData(
        ['Campo', 'Tipo', 'Nullable', 'Default', 'Descripción'],
        columnRows,
        [25, 15, 10, 15, 35]
      )
    );
    
    if (table.columns.length > 15) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `... y ${table.columns.length - 15} campos adicionales con los mismos campos de negocio.`,
              italics: true,
            }),
          ],
          spacing: { before: 50, after: 100 },
        })
      );
    }
    
    // Relationships
    if (table.relationships && table.relationships.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Relaciones: ', bold: true }),
            new TextRun({ text: table.relationships.join(', ') }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    }
    
    // RLS Policies
    if (table.rlsPolicies && table.rlsPolicies.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Políticas RLS:', bold: true }),
          ],
          spacing: { before: 50, after: 50 },
        })
      );
      for (const policy of table.rlsPolicies) {
        sections.push(
          new Paragraph({
            text: `• ${policy}`,
            spacing: { after: 30 },
          })
        );
      }
    }
  }
  
  // ============= SECTION 4: FIELD MAPPINGS =============
  sections.push(
    new Paragraph({
      text: '4. MAPEO DE CAMPOS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      text: FIELD_MAPPINGS.description,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: '4.1 Mapeo de Campos de Datos',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  
  sections.push(
    createTableFromData(
      ['Campo External (Railway)', 'Campo Internal (Lovable)', 'Descripción'],
      FIELD_MAPPINGS.mappings.map(m => [m.external, m.internal, m.description]),
      [30, 40, 30]
    )
  );
  
  sections.push(
    new Paragraph({
      text: '4.2 Mapeo de Estados (Status)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );
  
  sections.push(
    createTableFromData(
      ['Estado External', 'Estado Internal', 'Significado'],
      FIELD_MAPPINGS.statusMappings.map(m => [m.external, m.internal, m.description]),
      [25, 25, 50]
    )
  );
  
  // ============= SECTION 5: WORKFLOW =============
  sections.push(
    new Paragraph({
      text: '5. FLUJO DE TRABAJO (WORKFLOW)',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      text: 'Proceso de Scouting y Aprobación de Tecnologías',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  
  for (const step of SCOUTING_WORKFLOW) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Paso ${step.step}: `, bold: true, color: '2C5282' }),
          new TextRun({ text: step.action, bold: true }),
        ],
        spacing: { before: 200, after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Origen: ', bold: true }),
          new TextRun({ text: step.source }),
          new TextRun({ text: ' → Destino: ', bold: true }),
          new TextRun({ text: step.destination }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: step.description,
        spacing: { after: 100 },
      })
    );
  }
  
  // ============= SECTION 6: ROLES =============
  sections.push(
    new Paragraph({
      text: '6. ROLES Y PERMISOS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    })
  );
  
  for (const role of USER_ROLES) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: role.role, bold: true, color: '2C5282' }),
          new TextRun({ text: ` - ${role.description}` }),
        ],
        spacing: { before: 200, after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Permisos:', bold: true }),
        ],
        spacing: { after: 30 },
      })
    );
    
    for (const permission of role.permissions) {
      sections.push(
        new Paragraph({
          text: `  • ${permission}`,
          spacing: { after: 20 },
        })
      );
    }
  }
  
  // ============= SECTION 7: SYNCHRONIZATION =============
  sections.push(
    new Paragraph({
      text: '7. SINCRONIZACIÓN ENTRE BASES DE DATOS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      text: '7.1 Dirección de Sincronización',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Master → External: ', bold: true }),
        new TextRun({ text: 'Automática via triggers. Cualquier cambio en Lovable Cloud se replica a Railway.' }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'External → Master: ', bold: true }),
        new TextRun({ text: 'Solo mediante aprobación. Los datos de scouting se copian a technologies solo cuando un supervisor aprueba.' }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: '7.2 Tablas Sincronizadas',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({ text: '• technologies', spacing: { after: 30 } }),
    new Paragraph({ text: '• scouting_queue', spacing: { after: 30 } }),
    new Paragraph({ text: '• rejected_technologies', spacing: { after: 30 } }),
    new Paragraph({ text: '• taxonomy_tipos', spacing: { after: 30 } }),
    new Paragraph({ text: '• taxonomy_subcategorias', spacing: { after: 30 } }),
    new Paragraph({ text: '• taxonomy_sectores', spacing: { after: 30 } }),
    new Paragraph({ text: '• casos_de_estudio', spacing: { after: 30 } }),
    new Paragraph({ text: '• technological_trends', spacing: { after: 30 } }),
    new Paragraph({ text: '• projects', spacing: { after: 30 } }),
    new Paragraph({ text: '• project_technologies', spacing: { after: 200 } }),
    new Paragraph({
      text: '7.3 Triggers de Sincronización',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: 'Los triggers ejecutan la función trigger_sync_to_external() que llama a una Edge Function para replicar los cambios:',
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: 'CREATE TRIGGER sync_technologies_to_external',
      spacing: { after: 30 },
    }),
    new Paragraph({
      text: '  AFTER INSERT OR UPDATE OR DELETE ON public.technologies',
      spacing: { after: 30 },
    }),
    new Paragraph({
      text: '  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_to_external();',
      spacing: { after: 200 },
    })
  );
  
  // ============= SECTION 8: EDGE FUNCTIONS =============
  sections.push(
    new Paragraph({
      text: '8. EDGE FUNCTIONS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    })
  );
  
  const edgeFunctions = [
    {
      name: 'external-scouting-queue',
      description: 'Gestiona todas las operaciones con la cola de scouting en la DB externa.',
      actions: ['list', 'get', 'count', 'update', 'delete'],
    },
    {
      name: 'sync-to-external',
      description: 'Recibe webhooks de los triggers y replica cambios a Railway.',
      actions: ['INSERT', 'UPDATE', 'DELETE'],
    },
    {
      name: 'compare-databases',
      description: 'Compara el contenido de ambas DBs para identificar discrepancias.',
      actions: ['compare'],
    },
    {
      name: 'sync-databases',
      description: 'Sincronización manual de tablas específicas.',
      actions: ['sync_missing', 'sync_all'],
    },
    {
      name: 'classify-technologies',
      description: 'Clasificación automática usando IA.',
      actions: ['classify'],
    },
    {
      name: 'ai-search-technologies',
      description: 'Búsqueda semántica de tecnologías usando IA.',
      actions: ['search'],
    },
  ];
  
  for (const fn of edgeFunctions) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: fn.name, bold: true, color: '2C5282' }),
        ],
        spacing: { before: 150, after: 50 },
      }),
      new Paragraph({
        text: fn.description,
        spacing: { after: 30 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Acciones: ', bold: true }),
          new TextRun({ text: fn.actions.join(', ') }),
        ],
        spacing: { after: 100 },
      })
    );
  }
  
  // ============= SECTION 9: RLS =============
  sections.push(
    new Paragraph({
      text: '9. POLÍTICAS DE SEGURIDAD (RLS)',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      text: 'Row Level Security (RLS) está habilitado en todas las tablas. Las políticas controlan el acceso basándose en el rol del usuario autenticado.',
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: '9.1 Función de Verificación de Rol',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: 'has_role(user_id UUID, role app_role) → boolean',
      spacing: { after: 50 },
    }),
    new Paragraph({
      text: 'Verifica si un usuario tiene un rol específico consultando la tabla user_roles.',
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: '9.2 Patrones de Políticas Comunes',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Lectura pública: ', bold: true }),
        new TextRun({ text: 'USING (true) - Cualquiera puede leer' }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Solo propietario: ', bold: true }),
        new TextRun({ text: 'USING (auth.uid() = user_id) - Solo el dueño puede acceder' }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Usuarios internos: ', bold: true }),
        new TextRun({ text: 'USING (has_role(auth.uid(), \'admin\') OR has_role(auth.uid(), \'supervisor\') OR has_role(auth.uid(), \'analyst\'))' }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Solo admin: ', bold: true }),
        new TextRun({ text: 'USING (has_role(auth.uid(), \'admin\'))' }),
      ],
      spacing: { after: 200 },
    })
  );
  
  // ============= FOOTER =============
  sections.push(
    new Paragraph({
      text: '─'.repeat(50),
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Documento generado automáticamente por el Sistema Vandarum',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Para consultas técnicas, contactar al equipo de desarrollo.',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const filename = `Arquitectura_Base_Datos_Vandarum_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
}
