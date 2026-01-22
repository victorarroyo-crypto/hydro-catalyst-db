/**
 * Genera un documento Markdown completo con el schema de la base de datos
 * Incluye todas las tablas, campos, tipos, y relaciones
 */

interface FieldDefinition {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: string;
}

interface TableDefinition {
  name: string;
  description: string;
  fields: FieldDefinition[];
}

// Definición completa del schema basado en src/integrations/supabase/types.ts
const DATABASE_SCHEMA: TableDefinition[] = [
  {
    name: "advisor_callback_requests",
    description: "Solicitudes de callback del módulo AI Advisor para usuarios que requieren contacto comercial",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: true, description: "ID del usuario advisor", isForeignKey: true, references: "advisor_users.id" },
      { name: "email", type: "text", nullable: false, description: "Email del solicitante" },
      { name: "name", type: "text", nullable: false, description: "Nombre del solicitante" },
      { name: "company", type: "text", nullable: true, description: "Empresa del solicitante" },
      { name: "phone", type: "text", nullable: true, description: "Teléfono de contacto" },
      { name: "message", type: "text", nullable: true, description: "Mensaje adicional" },
      { name: "interest_area", type: "text", nullable: true, description: "Área de interés (agua, energía, etc.)" },
      { name: "status", type: "text", nullable: true, description: "Estado de la solicitud (pending, contacted, completed)" },
      { name: "notes", type: "text", nullable: true, description: "Notas internas del equipo comercial" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de última actualización" },
    ]
  },
  {
    name: "advisor_chats",
    description: "Sesiones de chat del módulo AI Advisor, agrupa mensajes por conversación",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: true, description: "ID del usuario advisor", isForeignKey: true, references: "advisor_users.id" },
      { name: "title", type: "text", nullable: true, description: "Título del chat (auto-generado o manual)" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de última actividad" },
      { name: "is_archived", type: "boolean", nullable: true, description: "Si el chat está archivado" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos adicionales del chat" },
      { name: "last_message_preview", type: "text", nullable: true, description: "Preview del último mensaje" },
    ]
  },
  {
    name: "advisor_credits",
    description: "Sistema de créditos para el módulo AI Advisor, controla el uso de la IA",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: false, description: "ID del usuario advisor", isForeignKey: true, references: "advisor_users.id" },
      { name: "total_credits", type: "integer", nullable: true, description: "Total de créditos asignados" },
      { name: "used_credits", type: "integer", nullable: true, description: "Créditos consumidos" },
      { name: "plan_type", type: "text", nullable: true, description: "Tipo de plan (free, pro, enterprise)" },
      { name: "reset_date", type: "timestamp with time zone", nullable: true, description: "Fecha de reset de créditos" },
      { name: "bonus_credits", type: "integer", nullable: true, description: "Créditos bonus adicionales" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de última actualización" },
    ]
  },
  {
    name: "advisor_messages",
    description: "Mensajes individuales dentro de las sesiones de chat del AI Advisor",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "chat_id", type: "uuid", nullable: true, description: "ID del chat padre", isForeignKey: true, references: "advisor_chats.id" },
      { name: "role", type: "text", nullable: false, description: "Rol del mensaje (user, assistant, system)" },
      { name: "content", type: "text", nullable: false, description: "Contenido del mensaje" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos (tokens, modelo, etc.)" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "tokens_used", type: "integer", nullable: true, description: "Tokens consumidos" },
      { name: "model_used", type: "text", nullable: true, description: "Modelo de IA utilizado" },
      { name: "tool_calls", type: "jsonb", nullable: true, description: "Llamadas a herramientas realizadas" },
    ]
  },
  {
    name: "advisor_users",
    description: "Usuarios del módulo AI Advisor (separados de usuarios principales)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "email", type: "text", nullable: false, description: "Email único del usuario" },
      { name: "full_name", type: "text", nullable: true, description: "Nombre completo" },
      { name: "company", type: "text", nullable: true, description: "Empresa" },
      { name: "role", type: "text", nullable: true, description: "Rol en la empresa" },
      { name: "industry", type: "text", nullable: true, description: "Industria/sector" },
      { name: "phone", type: "text", nullable: true, description: "Teléfono" },
      { name: "avatar_url", type: "text", nullable: true, description: "URL del avatar" },
      { name: "preferences", type: "jsonb", nullable: true, description: "Preferencias del usuario" },
      { name: "is_verified", type: "boolean", nullable: true, description: "Si el email está verificado" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de registro" },
      { name: "last_login", type: "timestamp with time zone", nullable: true, description: "Último inicio de sesión" },
    ]
  },
  {
    name: "ai_model_settings",
    description: "Configuración de modelos de IA para diferentes funcionalidades del sistema",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "feature_key", type: "text", nullable: false, description: "Clave de la funcionalidad (enrich, classify, search)" },
      { name: "model_name", type: "text", nullable: false, description: "Nombre del modelo a usar" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
    ]
  },
  {
    name: "ai_usage_logs",
    description: "Logs de uso de modelos de IA para tracking de costos y rendimiento",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: true, description: "ID del usuario que hizo la llamada" },
      { name: "feature_key", type: "text", nullable: false, description: "Funcionalidad que usó la IA" },
      { name: "model_name", type: "text", nullable: false, description: "Modelo utilizado" },
      { name: "input_tokens", type: "integer", nullable: true, description: "Tokens de entrada" },
      { name: "output_tokens", type: "integer", nullable: true, description: "Tokens de salida" },
      { name: "total_tokens", type: "integer", nullable: true, description: "Total de tokens" },
      { name: "cost_usd", type: "numeric", nullable: true, description: "Costo en USD" },
      { name: "latency_ms", type: "integer", nullable: true, description: "Latencia en milisegundos" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos adicionales" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de la llamada" },
    ]
  },
  {
    name: "audit_logs",
    description: "Logs de auditoría para tracking de acciones de usuarios en el sistema",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: true, description: "ID del usuario que realizó la acción" },
      { name: "action", type: "text", nullable: false, description: "Tipo de acción (CREATE, UPDATE, DELETE, etc.)" },
      { name: "entity_type", type: "text", nullable: true, description: "Tipo de entidad afectada" },
      { name: "entity_id", type: "uuid", nullable: true, description: "ID de la entidad afectada" },
      { name: "old_values", type: "jsonb", nullable: true, description: "Valores anteriores" },
      { name: "new_values", type: "jsonb", nullable: true, description: "Valores nuevos" },
      { name: "details", type: "jsonb", nullable: true, description: "Detalles adicionales" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de la acción" },
    ]
  },
  {
    name: "case_study_jobs",
    description: "Jobs de procesamiento de casos de estudio con IA (extracción, análisis)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "case_study_id", type: "uuid", nullable: true, description: "ID del caso de estudio", isForeignKey: true, references: "casos_de_estudio.id" },
      { name: "job_type", type: "text", nullable: false, description: "Tipo de job (extract, analyze, summarize)" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, running, completed, failed)" },
      { name: "progress", type: "integer", nullable: true, description: "Progreso 0-100" },
      { name: "result", type: "jsonb", nullable: true, description: "Resultado del procesamiento" },
      { name: "error_message", type: "text", nullable: true, description: "Mensaje de error si falló" },
      { name: "model_used", type: "text", nullable: true, description: "Modelo de IA usado" },
      { name: "tokens_used", type: "integer", nullable: true, description: "Tokens consumidos" },
      { name: "started_at", type: "timestamp with time zone", nullable: true, description: "Inicio del procesamiento" },
      { name: "completed_at", type: "timestamp with time zone", nullable: true, description: "Fin del procesamiento" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó el job" },
    ]
  },
  {
    name: "case_study_technologies",
    description: "Tecnologías extraídas de casos de estudio mediante procesamiento IA",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "case_study_id", type: "uuid", nullable: true, description: "ID del caso de estudio origen", isForeignKey: true, references: "casos_de_estudio.id" },
      { name: "technology_name", type: "text", nullable: false, description: "Nombre de la tecnología extraída" },
      { name: "provider", type: "text", nullable: true, description: "Proveedor/empresa" },
      { name: "description", type: "text", nullable: true, description: "Descripción técnica" },
      { name: "technology_type", type: "text", nullable: true, description: "Tipo de tecnología" },
      { name: "application", type: "text", nullable: true, description: "Aplicación principal" },
      { name: "extraction_confidence", type: "numeric", nullable: true, description: "Confianza de extracción 0-1" },
      { name: "raw_data", type: "jsonb", nullable: true, description: "Datos crudos extraídos" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de extracción" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, approved, rejected)" },
    ]
  },
  {
    name: "casos_de_estudio",
    description: "Base de conocimiento de casos de estudio del sector agua (Knowledge Base)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "titulo", type: "text", nullable: false, description: "Título del caso de estudio" },
      { name: "cliente", type: "text", nullable: true, description: "Cliente del proyecto" },
      { name: "sector", type: "text", nullable: true, description: "Sector industrial" },
      { name: "subsector", type: "text", nullable: true, description: "Subsector específico" },
      { name: "pais", type: "text", nullable: true, description: "País de implementación" },
      { name: "año", type: "integer", nullable: true, description: "Año de implementación" },
      { name: "problema", type: "text", nullable: true, description: "Problema abordado" },
      { name: "solucion", type: "text", nullable: true, description: "Solución implementada" },
      { name: "resultados", type: "text", nullable: true, description: "Resultados obtenidos" },
      { name: "tecnologias_usadas", type: "text[]", nullable: true, description: "Array de tecnologías usadas" },
      { name: "metricas", type: "jsonb", nullable: true, description: "Métricas cuantitativas" },
      { name: "lecciones_aprendidas", type: "text", nullable: true, description: "Lecciones aprendidas" },
      { name: "fuente", type: "text", nullable: true, description: "Fuente del caso" },
      { name: "url_fuente", type: "text", nullable: true, description: "URL de la fuente" },
      { name: "documento_original", type: "text", nullable: true, description: "Path al documento original" },
      { name: "resumen_ejecutivo", type: "text", nullable: true, description: "Resumen ejecutivo" },
      { name: "tags", type: "text[]", nullable: true, description: "Tags para búsqueda" },
      { name: "calidad_score", type: "integer", nullable: true, description: "Puntuación de calidad 1-10" },
      { name: "status", type: "text", nullable: true, description: "Estado (draft, review, published)" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que lo creó" },
      { name: "embedding", type: "vector", nullable: true, description: "Vector embedding para búsqueda semántica" },
      { name: "descripcion_ia", type: "text", nullable: true, description: "Descripción generada por IA" },
      { name: "processing_status", type: "text", nullable: true, description: "Estado de procesamiento IA" },
      { name: "raw_content", type: "text", nullable: true, description: "Contenido crudo del documento" },
    ]
  },
  {
    name: "knowledge_chunks",
    description: "Chunks de documentos para RAG (Retrieval Augmented Generation)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "document_id", type: "uuid", nullable: true, description: "ID del documento padre", isForeignKey: true, references: "knowledge_documents.id" },
      { name: "content", type: "text", nullable: false, description: "Contenido del chunk" },
      { name: "chunk_index", type: "integer", nullable: true, description: "Índice del chunk en el documento" },
      { name: "embedding", type: "vector", nullable: true, description: "Vector embedding 1536 dimensiones" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos del chunk (página, sección)" },
    ]
  },
  {
    name: "knowledge_documents",
    description: "Documentos de la base de conocimiento para procesamiento RAG",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "title", type: "text", nullable: false, description: "Título del documento" },
      { name: "file_path", type: "text", nullable: true, description: "Path en storage" },
      { name: "file_type", type: "text", nullable: true, description: "Tipo de archivo (pdf, docx, txt)" },
      { name: "file_size", type: "integer", nullable: true, description: "Tamaño en bytes" },
      { name: "content", type: "text", nullable: true, description: "Contenido extraído" },
      { name: "processing_status", type: "text", nullable: true, description: "Estado de procesamiento" },
      { name: "chunk_count", type: "integer", nullable: true, description: "Número de chunks generados" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos del documento" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de subida" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que subió el doc" },
    ]
  },
  {
    name: "profiles",
    description: "Perfiles de usuarios del sistema principal (vinculados a auth.users)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: false, description: "ID de auth.users", isForeignKey: true, references: "auth.users.id" },
      { name: "full_name", type: "text", nullable: true, description: "Nombre completo" },
      { name: "role", type: "app_role", nullable: true, description: "Rol en la app (admin, analyst, client, etc.)" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
    ]
  },
  {
    name: "project_technologies",
    description: "Relación many-to-many entre proyectos y tecnologías",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "project_id", type: "uuid", nullable: true, description: "ID del proyecto", isForeignKey: true, references: "projects.id" },
      { name: "technology_id", type: "uuid", nullable: true, description: "ID de la tecnología", isForeignKey: true, references: "technologies.id" },
      { name: "added_at", type: "timestamp with time zone", nullable: true, description: "Fecha de asociación" },
      { name: "notes", type: "text", nullable: true, description: "Notas sobre la relación" },
    ]
  },
  {
    name: "projects",
    description: "Proyectos de consultoría con sus fases, documentos y configuración",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "name", type: "text", nullable: false, description: "Nombre del proyecto" },
      { name: "description", type: "text", nullable: true, description: "Descripción del proyecto" },
      { name: "client_id", type: "uuid", nullable: true, description: "ID del cliente" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, in_progress, completed, cancelled)" },
      { name: "project_type", type: "text", nullable: true, description: "Tipo de proyecto" },
      { name: "start_date", type: "date", nullable: true, description: "Fecha de inicio" },
      { name: "end_date", type: "date", nullable: true, description: "Fecha de fin estimada" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos del proyecto" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que lo creó" },
    ]
  },
  {
    name: "rejected_technologies",
    description: "Tecnologías rechazadas del proceso de scouting (historico)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "original_scouting_id", type: "uuid", nullable: true, description: "ID original en scouting_queue" },
      { name: "Nombre de la tecnología", type: "text", nullable: true, description: "Nombre de la tecnología" },
      { name: "Proveedor / Empresa", type: "text", nullable: true, description: "Empresa proveedora" },
      { name: "País de origen", type: "text", nullable: true, description: "País de origen" },
      { name: "Web de la empresa", type: "text", nullable: true, description: "Sitio web" },
      { name: "Email de contacto", type: "text", nullable: true, description: "Email de contacto" },
      { name: "Tipo de tecnología", type: "text", nullable: true, description: "Tipo de tecnología" },
      { name: "Subcategoría", type: "text", nullable: true, description: "Subcategoría" },
      { name: "Sector y subsector", type: "text", nullable: true, description: "Sector y subsector" },
      { name: "Aplicación principal", type: "text", nullable: true, description: "Aplicación principal" },
      { name: "Descripción técnica breve", type: "text", nullable: true, description: "Descripción técnica" },
      { name: "Ventaja competitiva clave", type: "text", nullable: true, description: "Ventaja competitiva" },
      { name: "Porque es innovadora", type: "text", nullable: true, description: "Por qué es innovadora" },
      { name: "Casos de referencia", type: "text", nullable: true, description: "Casos de referencia" },
      { name: "Paises donde actua", type: "text", nullable: true, description: "Países donde opera" },
      { name: "Comentarios del analista", type: "text", nullable: true, description: "Comentarios del analista" },
      { name: "Fecha de scouting", type: "text", nullable: true, description: "Fecha de scouting" },
      { name: "Grado de madurez (TRL)", type: "integer", nullable: true, description: "Nivel TRL 1-9" },
      { name: "rejection_reason", type: "text", nullable: true, description: "Razón del rechazo" },
      { name: "rejection_category", type: "text", nullable: true, description: "Categoría de rechazo" },
      { name: "rejected_by", type: "uuid", nullable: true, description: "Usuario que rechazó" },
      { name: "rejected_at", type: "timestamp with time zone", nullable: true, description: "Fecha de rechazo" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "subsector_industrial", type: "text", nullable: true, description: "Subsector industrial" },
      { name: "source", type: "text", nullable: true, description: "Fuente del dato" },
      { name: "source_url", type: "text", nullable: true, description: "URL de la fuente" },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de sesión de scouting" },
    ]
  },
  {
    name: "saved_ai_searches",
    description: "Búsquedas de IA guardadas por los usuarios para referencia futura",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: true, description: "ID del usuario" },
      { name: "query", type: "text", nullable: false, description: "Query de búsqueda" },
      { name: "results", type: "jsonb", nullable: true, description: "Resultados guardados" },
      { name: "filters", type: "jsonb", nullable: true, description: "Filtros aplicados" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de guardado" },
      { name: "title", type: "text", nullable: true, description: "Título descriptivo" },
    ]
  },
  {
    name: "scouting_queue",
    description: "Cola de tecnologías pendientes de revisión del proceso de scouting",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "Nombre de la tecnología", type: "text", nullable: false, description: "Nombre de la tecnología" },
      { name: "Proveedor / Empresa", type: "text", nullable: true, description: "Empresa proveedora" },
      { name: "País de origen", type: "text", nullable: true, description: "País de origen" },
      { name: "Web de la empresa", type: "text", nullable: true, description: "Sitio web" },
      { name: "Email de contacto", type: "text", nullable: true, description: "Email de contacto" },
      { name: "Tipo de tecnología", type: "text", nullable: true, description: "Tipo de tecnología" },
      { name: "Subcategoría", type: "text", nullable: true, description: "Subcategoría" },
      { name: "Sector y subsector", type: "text", nullable: true, description: "Sector y subsector" },
      { name: "Aplicación principal", type: "text", nullable: true, description: "Aplicación principal" },
      { name: "Descripción técnica breve", type: "text", nullable: true, description: "Descripción técnica" },
      { name: "Ventaja competitiva clave", type: "text", nullable: true, description: "Ventaja competitiva" },
      { name: "Porque es innovadora", type: "text", nullable: true, description: "Por qué es innovadora" },
      { name: "Casos de referencia", type: "text", nullable: true, description: "Casos de referencia" },
      { name: "Paises donde actua", type: "text", nullable: true, description: "Países donde opera" },
      { name: "Comentarios del analista", type: "text", nullable: true, description: "Comentarios del analista" },
      { name: "Fecha de scouting", type: "text", nullable: true, description: "Fecha de scouting" },
      { name: "Grado de madurez (TRL)", type: "integer", nullable: true, description: "Nivel TRL 1-9" },
      { name: "queue_status", type: "text", nullable: true, description: "Estado en cola (pending, reviewing, approved)" },
      { name: "priority", type: "integer", nullable: true, description: "Prioridad 1-5" },
      { name: "notes", type: "text", nullable: true, description: "Notas internas" },
      { name: "source", type: "text", nullable: true, description: "Fuente del dato" },
      { name: "source_url", type: "text", nullable: true, description: "URL de la fuente" },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de sesión de scouting", isForeignKey: true, references: "scouting_sessions.id" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "subsector_industrial", type: "text", nullable: true, description: "Subsector industrial" },
      { name: "added_by", type: "uuid", nullable: true, description: "Usuario que añadió" },
      { name: "reviewed_by", type: "uuid", nullable: true, description: "Usuario que revisó" },
      { name: "reviewed_at", type: "timestamp with time zone", nullable: true, description: "Fecha de revisión" },
    ]
  },
  {
    name: "scouting_run_requests",
    description: "Solicitudes de ejecución de sesiones de scouting automatizado",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de la sesión", isForeignKey: true, references: "scouting_sessions.id" },
      { name: "requested_by", type: "uuid", nullable: true, description: "Usuario que solicitó" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, running, completed, failed)" },
      { name: "parameters", type: "jsonb", nullable: true, description: "Parámetros de ejecución" },
      { name: "result", type: "jsonb", nullable: true, description: "Resultado de la ejecución" },
      { name: "error_message", type: "text", nullable: true, description: "Mensaje de error" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de solicitud" },
      { name: "completed_at", type: "timestamp with time zone", nullable: true, description: "Fecha de completado" },
    ]
  },
  {
    name: "scouting_session_logs",
    description: "Logs de actividad de sesiones de scouting para debugging",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de la sesión", isForeignKey: true, references: "scouting_sessions.id" },
      { name: "log_type", type: "text", nullable: true, description: "Tipo de log (info, warning, error)" },
      { name: "message", type: "text", nullable: true, description: "Mensaje del log" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos adicionales" },
      { name: "source", type: "text", nullable: true, description: "Fuente del log" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha del log" },
      { name: "agent_name", type: "text", nullable: true, description: "Nombre del agente IA" },
    ]
  },
  {
    name: "scouting_sessions",
    description: "Sesiones de scouting automatizado con agentes IA",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "name", type: "text", nullable: false, description: "Nombre de la sesión" },
      { name: "description", type: "text", nullable: true, description: "Descripción" },
      { name: "search_query", type: "text", nullable: true, description: "Query de búsqueda" },
      { name: "search_parameters", type: "jsonb", nullable: true, description: "Parámetros de búsqueda" },
      { name: "target_sectors", type: "text[]", nullable: true, description: "Sectores objetivo" },
      { name: "target_technologies", type: "text[]", nullable: true, description: "Tipos de tecnología objetivo" },
      { name: "status", type: "text", nullable: true, description: "Estado (draft, running, paused, completed)" },
      { name: "technologies_found", type: "integer", nullable: true, description: "Número de tecnologías encontradas" },
      { name: "technologies_approved", type: "integer", nullable: true, description: "Tecnologías aprobadas" },
      { name: "technologies_rejected", type: "integer", nullable: true, description: "Tecnologías rechazadas" },
      { name: "sources_searched", type: "integer", nullable: true, description: "Fuentes consultadas" },
      { name: "ai_model_used", type: "text", nullable: true, description: "Modelo de IA usado" },
      { name: "started_at", type: "timestamp with time zone", nullable: true, description: "Fecha de inicio" },
      { name: "completed_at", type: "timestamp with time zone", nullable: true, description: "Fecha de fin" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
      { name: "last_activity", type: "timestamp with time zone", nullable: true, description: "Última actividad" },
      { name: "progress_percentage", type: "integer", nullable: true, description: "Progreso 0-100" },
      { name: "error_count", type: "integer", nullable: true, description: "Número de errores" },
    ]
  },
  {
    name: "scouting_sources",
    description: "Fuentes web consultadas durante el proceso de scouting",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de la sesión", isForeignKey: true, references: "scouting_sessions.id" },
      { name: "url", type: "text", nullable: false, description: "URL de la fuente" },
      { name: "title", type: "text", nullable: true, description: "Título de la página" },
      { name: "source_type", type: "text", nullable: true, description: "Tipo de fuente (news, academic, company)" },
      { name: "relevance_score", type: "numeric", nullable: true, description: "Puntuación de relevancia" },
      { name: "technologies_extracted", type: "integer", nullable: true, description: "Tecnologías extraídas" },
      { name: "content_preview", type: "text", nullable: true, description: "Preview del contenido" },
      { name: "scraped_at", type: "timestamp with time zone", nullable: true, description: "Fecha de scraping" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, scraped, failed)" },
      { name: "error_message", type: "text", nullable: true, description: "Mensaje de error" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "domain", type: "text", nullable: true, description: "Dominio de la URL" },
      { name: "language", type: "text", nullable: true, description: "Idioma detectado" },
      { name: "word_count", type: "integer", nullable: true, description: "Número de palabras" },
      { name: "is_relevant", type: "boolean", nullable: true, description: "Si es relevante" },
    ]
  },
  {
    name: "scouting_studies",
    description: "Estudios de scouting que agrupan múltiples sesiones de búsqueda",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "name", type: "text", nullable: false, description: "Nombre del estudio" },
      { name: "description", type: "text", nullable: true, description: "Descripción del estudio" },
      { name: "objective", type: "text", nullable: true, description: "Objetivo del estudio" },
      { name: "scope", type: "text", nullable: true, description: "Alcance" },
      { name: "target_sectors", type: "text[]", nullable: true, description: "Sectores objetivo" },
      { name: "target_regions", type: "text[]", nullable: true, description: "Regiones objetivo" },
      { name: "status", type: "text", nullable: true, description: "Estado (draft, active, completed)" },
      { name: "sessions_count", type: "integer", nullable: true, description: "Número de sesiones" },
      { name: "total_technologies", type: "integer", nullable: true, description: "Total de tecnologías" },
      { name: "deadline", type: "date", nullable: true, description: "Fecha límite" },
      { name: "client_name", type: "text", nullable: true, description: "Nombre del cliente" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos" },
      { name: "project_id", type: "uuid", nullable: true, description: "ID del proyecto asociado" },
    ]
  },
  {
    name: "study_evaluations",
    description: "Evaluaciones detalladas de tecnologías en la fase de shortlist",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "technology_id", type: "uuid", nullable: true, description: "ID de la tecnología" },
      { name: "evaluator_id", type: "uuid", nullable: true, description: "ID del evaluador" },
      { name: "technical_score", type: "numeric", nullable: true, description: "Puntuación técnica" },
      { name: "commercial_score", type: "numeric", nullable: true, description: "Puntuación comercial" },
      { name: "innovation_score", type: "numeric", nullable: true, description: "Puntuación innovación" },
      { name: "sustainability_score", type: "numeric", nullable: true, description: "Puntuación sostenibilidad" },
      { name: "implementation_score", type: "numeric", nullable: true, description: "Puntuación implementación" },
      { name: "overall_score", type: "numeric", nullable: true, description: "Puntuación global" },
      { name: "technical_notes", type: "text", nullable: true, description: "Notas técnicas" },
      { name: "commercial_notes", type: "text", nullable: true, description: "Notas comerciales" },
      { name: "risks", type: "text", nullable: true, description: "Riesgos identificados" },
      { name: "opportunities", type: "text", nullable: true, description: "Oportunidades" },
      { name: "recommendation", type: "text", nullable: true, description: "Recomendación (approve, reject, investigate)" },
      { name: "status", type: "text", nullable: true, description: "Estado de la evaluación" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha de actualización" },
      // Campos adicionales del schema completo
      { name: "capex_estimate", type: "numeric", nullable: true, description: "Estimación CAPEX" },
      { name: "opex_estimate", type: "numeric", nullable: true, description: "Estimación OPEX" },
      { name: "roi_estimate", type: "numeric", nullable: true, description: "ROI estimado" },
      { name: "payback_years", type: "numeric", nullable: true, description: "Payback en años" },
      { name: "implementation_timeline", type: "text", nullable: true, description: "Timeline implementación" },
      { name: "strengths", type: "text[]", nullable: true, description: "Fortalezas" },
      { name: "weaknesses", type: "text[]", nullable: true, description: "Debilidades" },
      { name: "fit_score", type: "numeric", nullable: true, description: "Puntuación de ajuste" },
      { name: "maturity_score", type: "numeric", nullable: true, description: "Puntuación de madurez" },
      { name: "scalability_score", type: "numeric", nullable: true, description: "Puntuación escalabilidad" },
      { name: "cost_score", type: "numeric", nullable: true, description: "Puntuación de costo" },
      { name: "support_score", type: "numeric", nullable: true, description: "Puntuación de soporte" },
      { name: "integration_score", type: "numeric", nullable: true, description: "Puntuación integración" },
      { name: "compliance_score", type: "numeric", nullable: true, description: "Puntuación cumplimiento" },
      { name: "vendor_stability_score", type: "numeric", nullable: true, description: "Estabilidad proveedor" },
      { name: "training_requirements", type: "text", nullable: true, description: "Requisitos de formación" },
      { name: "infrastructure_requirements", type: "text", nullable: true, description: "Requisitos infraestructura" },
      { name: "dependencies", type: "text[]", nullable: true, description: "Dependencias" },
      { name: "alternatives_considered", type: "text[]", nullable: true, description: "Alternativas consideradas" },
    ]
  },
  {
    name: "study_longlist",
    description: "Lista larga de tecnologías candidatas para un estudio",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "technology_name", type: "text", nullable: false, description: "Nombre de la tecnología" },
      { name: "provider", type: "text", nullable: true, description: "Proveedor" },
      { name: "country", type: "text", nullable: true, description: "País" },
      { name: "technology_type", type: "text", nullable: true, description: "Tipo de tecnología" },
      { name: "subcategory", type: "text", nullable: true, description: "Subcategoría" },
      { name: "description", type: "text", nullable: true, description: "Descripción" },
      { name: "application", type: "text", nullable: true, description: "Aplicación principal" },
      { name: "competitive_advantage", type: "text", nullable: true, description: "Ventaja competitiva" },
      { name: "innovation", type: "text", nullable: true, description: "Innovación" },
      { name: "trl", type: "integer", nullable: true, description: "Nivel TRL" },
      { name: "website", type: "text", nullable: true, description: "Sitio web" },
      { name: "email", type: "text", nullable: true, description: "Email" },
      { name: "source", type: "text", nullable: true, description: "Fuente" },
      { name: "source_url", type: "text", nullable: true, description: "URL fuente" },
      { name: "relevance_score", type: "numeric", nullable: true, description: "Puntuación relevancia" },
      { name: "fit_score", type: "numeric", nullable: true, description: "Puntuación ajuste" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, approved, rejected)" },
      { name: "notes", type: "text", nullable: true, description: "Notas" },
      { name: "reviewed_by", type: "uuid", nullable: true, description: "Revisado por" },
      { name: "reviewed_at", type: "timestamp with time zone", nullable: true, description: "Fecha revisión" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "reference_cases", type: "text", nullable: true, description: "Casos de referencia" },
      { name: "operating_countries", type: "text", nullable: true, description: "Países operación" },
      { name: "sector", type: "text", nullable: true, description: "Sector" },
      { name: "analyst_comments", type: "text", nullable: true, description: "Comentarios analista" },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de sesión" },
      { name: "extraction_source", type: "text", nullable: true, description: "Fuente de extracción" },
      { name: "ai_confidence", type: "numeric", nullable: true, description: "Confianza IA" },
      { name: "raw_data", type: "jsonb", nullable: true, description: "Datos crudos" },
      { name: "embedding", type: "vector", nullable: true, description: "Vector embedding" },
      { name: "shortlisted", type: "boolean", nullable: true, description: "En shortlist" },
      { name: "shortlist_reason", type: "text", nullable: true, description: "Razón shortlist" },
    ]
  },
  {
    name: "study_reports",
    description: "Informes generados para estudios de tecnología",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "report_type", type: "text", nullable: true, description: "Tipo de informe (summary, detailed, executive)" },
      { name: "title", type: "text", nullable: true, description: "Título del informe" },
      { name: "content", type: "text", nullable: true, description: "Contenido del informe" },
      { name: "sections", type: "jsonb", nullable: true, description: "Secciones estructuradas" },
      { name: "executive_summary", type: "text", nullable: true, description: "Resumen ejecutivo" },
      { name: "recommendations", type: "jsonb", nullable: true, description: "Recomendaciones" },
      { name: "conclusions", type: "text", nullable: true, description: "Conclusiones" },
      { name: "status", type: "text", nullable: true, description: "Estado (draft, review, final)" },
      { name: "version", type: "integer", nullable: true, description: "Versión" },
      { name: "file_path", type: "text", nullable: true, description: "Path al archivo" },
      { name: "generated_by", type: "text", nullable: true, description: "Generado por (ai, manual)" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
    ]
  },
  {
    name: "study_research",
    description: "Investigación y fuentes consultadas para un estudio",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de sesión de investigación" },
      { name: "topic", type: "text", nullable: true, description: "Tema de investigación" },
      { name: "query", type: "text", nullable: true, description: "Query de búsqueda" },
      { name: "sources", type: "jsonb", nullable: true, description: "Fuentes consultadas" },
      { name: "findings", type: "text", nullable: true, description: "Hallazgos" },
      { name: "summary", type: "text", nullable: true, description: "Resumen" },
      { name: "key_insights", type: "text[]", nullable: true, description: "Insights clave" },
      { name: "data_points", type: "jsonb", nullable: true, description: "Datos extraídos" },
      { name: "status", type: "text", nullable: true, description: "Estado" },
      { name: "agent_name", type: "text", nullable: true, description: "Agente IA usado" },
      { name: "tokens_used", type: "integer", nullable: true, description: "Tokens consumidos" },
      { name: "cost_usd", type: "numeric", nullable: true, description: "Costo en USD" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos" },
    ]
  },
  {
    name: "study_session_logs",
    description: "Logs de sesiones de estudio con agentes IA",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "session_id", type: "uuid", nullable: true, description: "ID de la sesión" },
      { name: "log_type", type: "text", nullable: true, description: "Tipo de log" },
      { name: "message", type: "text", nullable: true, description: "Mensaje" },
      { name: "metadata", type: "jsonb", nullable: true, description: "Metadatos" },
      { name: "source", type: "text", nullable: true, description: "Fuente" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha" },
      { name: "agent_name", type: "text", nullable: true, description: "Nombre del agente" },
    ]
  },
  {
    name: "study_sessions",
    description: "Sesiones de trabajo en estudios de tecnología",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "session_type", type: "text", nullable: true, description: "Tipo de sesión (research, analysis, review)" },
      { name: "status", type: "text", nullable: true, description: "Estado" },
      { name: "parameters", type: "jsonb", nullable: true, description: "Parámetros" },
      { name: "result", type: "jsonb", nullable: true, description: "Resultado" },
      { name: "progress", type: "integer", nullable: true, description: "Progreso 0-100" },
      { name: "error_message", type: "text", nullable: true, description: "Mensaje de error" },
      { name: "started_at", type: "timestamp with time zone", nullable: true, description: "Fecha inicio" },
      { name: "completed_at", type: "timestamp with time zone", nullable: true, description: "Fecha fin" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
      { name: "ai_model_used", type: "text", nullable: true, description: "Modelo IA usado" },
    ]
  },
  {
    name: "study_shortlist",
    description: "Lista corta de tecnologías finalistas de un estudio",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "longlist_id", type: "uuid", nullable: true, description: "ID en longlist", isForeignKey: true, references: "study_longlist.id" },
      { name: "priority", type: "integer", nullable: true, description: "Prioridad/ranking" },
      { name: "justification", type: "text", nullable: true, description: "Justificación de selección" },
      { name: "status", type: "text", nullable: true, description: "Estado" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que seleccionó" },
    ]
  },
  {
    name: "study_solutions",
    description: "Soluciones propuestas para el problema de un estudio",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "study_id", type: "uuid", nullable: true, description: "ID del estudio" },
      { name: "name", type: "text", nullable: false, description: "Nombre de la solución" },
      { name: "description", type: "text", nullable: true, description: "Descripción" },
      { name: "solution_type", type: "text", nullable: true, description: "Tipo de solución" },
      { name: "technologies_involved", type: "text[]", nullable: true, description: "Tecnologías involucradas" },
      { name: "estimated_cost", type: "numeric", nullable: true, description: "Costo estimado" },
      { name: "implementation_time", type: "text", nullable: true, description: "Tiempo implementación" },
      { name: "benefits", type: "text[]", nullable: true, description: "Beneficios" },
      { name: "risks", type: "text[]", nullable: true, description: "Riesgos" },
      { name: "requirements", type: "text[]", nullable: true, description: "Requisitos" },
      { name: "feasibility_score", type: "numeric", nullable: true, description: "Puntuación viabilidad" },
      { name: "impact_score", type: "numeric", nullable: true, description: "Puntuación impacto" },
      { name: "priority", type: "integer", nullable: true, description: "Prioridad" },
      { name: "status", type: "text", nullable: true, description: "Estado" },
      { name: "notes", type: "text", nullable: true, description: "Notas" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "created_by", type: "uuid", nullable: true, description: "Usuario que creó" },
      { name: "ai_generated", type: "boolean", nullable: true, description: "Generado por IA" },
      { name: "source_research_ids", type: "uuid[]", nullable: true, description: "IDs de research relacionados" },
    ]
  },
  {
    name: "sync_queue",
    description: "Cola de sincronización entre bases de datos local y externa",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "entity_type", type: "text", nullable: false, description: "Tipo de entidad (technology, project)" },
      { name: "entity_id", type: "uuid", nullable: false, description: "ID de la entidad" },
      { name: "operation", type: "text", nullable: false, description: "Operación (create, update, delete)" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, synced, failed)" },
      { name: "payload", type: "jsonb", nullable: true, description: "Datos a sincronizar" },
      { name: "error_message", type: "text", nullable: true, description: "Mensaje de error" },
      { name: "retry_count", type: "integer", nullable: true, description: "Intentos realizados" },
      { name: "last_attempt", type: "timestamp with time zone", nullable: true, description: "Último intento" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "synced_at", type: "timestamp with time zone", nullable: true, description: "Fecha sincronización" },
      { name: "priority", type: "integer", nullable: true, description: "Prioridad" },
    ]
  },
  {
    name: "taxonomy_sectores",
    description: "Taxonomía de sectores industriales",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "nombre", type: "text", nullable: false, description: "Nombre del sector" },
      { name: "descripcion", type: "text", nullable: true, description: "Descripción del sector" },
    ]
  },
  {
    name: "taxonomy_subcategorias",
    description: "Taxonomía de subcategorías de tecnología",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "nombre", type: "text", nullable: false, description: "Nombre de la subcategoría" },
      { name: "tipo_id", type: "uuid", nullable: true, description: "ID del tipo padre", isForeignKey: true, references: "taxonomy_tipos.id" },
      { name: "descripcion", type: "text", nullable: true, description: "Descripción" },
    ]
  },
  {
    name: "taxonomy_tipos",
    description: "Taxonomía de tipos de tecnología (nivel superior)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "nombre", type: "text", nullable: false, description: "Nombre del tipo" },
      { name: "descripcion", type: "text", nullable: true, description: "Descripción" },
      { name: "icono", type: "text", nullable: true, description: "Icono asociado" },
    ]
  },
  {
    name: "technological_trends",
    description: "Tendencias tecnológicas identificadas en el sector",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "name", type: "text", nullable: false, description: "Nombre de la tendencia" },
      { name: "description", type: "text", nullable: true, description: "Descripción" },
      { name: "category", type: "text", nullable: true, description: "Categoría" },
      { name: "impact_level", type: "text", nullable: true, description: "Nivel de impacto (high, medium, low)" },
      { name: "timeframe", type: "text", nullable: true, description: "Horizonte temporal" },
      { name: "related_technologies", type: "text[]", nullable: true, description: "Tecnologías relacionadas" },
      { name: "sources", type: "jsonb", nullable: true, description: "Fuentes" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
    ]
  },
  {
    name: "technologies",
    description: "Catálogo principal de tecnologías validadas del sistema",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "Nombre de la tecnología", type: "text", nullable: false, description: "Nombre de la tecnología" },
      { name: "Proveedor / Empresa", type: "text", nullable: true, description: "Empresa proveedora" },
      { name: "País de origen", type: "text", nullable: true, description: "País de origen" },
      { name: "Web de la empresa", type: "text", nullable: true, description: "Sitio web" },
      { name: "Email de contacto", type: "text", nullable: true, description: "Email de contacto" },
      { name: "Tipo de tecnología", type: "text", nullable: false, description: "Tipo de tecnología" },
      { name: "Subcategoría", type: "text", nullable: true, description: "Subcategoría" },
      { name: "Sector y subsector", type: "text", nullable: true, description: "Sector y subsector" },
      { name: "Aplicación principal", type: "text", nullable: true, description: "Aplicación principal" },
      { name: "Descripción técnica breve", type: "text", nullable: true, description: "Descripción técnica" },
      { name: "Ventaja competitiva clave", type: "text", nullable: true, description: "Ventaja competitiva" },
      { name: "Porque es innovadora", type: "text", nullable: true, description: "Por qué es innovadora" },
      { name: "Casos de referencia", type: "text", nullable: true, description: "Casos de referencia" },
      { name: "Paises donde actua", type: "text", nullable: true, description: "Países donde opera" },
      { name: "Comentarios del analista", type: "text", nullable: true, description: "Comentarios del analista" },
      { name: "Fecha de scouting", type: "text", nullable: true, description: "Fecha de scouting" },
      { name: "Estado del seguimiento", type: "text", nullable: true, description: "Estado del seguimiento" },
      { name: "Grado de madurez (TRL)", type: "integer", nullable: true, description: "Nivel TRL 1-9" },
      { name: "status", type: "text", nullable: true, description: "Estado (active, inactive, archived)" },
      { name: "quality_score", type: "integer", nullable: true, description: "Puntuación de calidad" },
      { name: "review_status", type: "text", nullable: true, description: "Estado de revisión" },
      { name: "reviewer_id", type: "uuid", nullable: true, description: "ID del revisor" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "updated_by", type: "uuid", nullable: true, description: "Usuario que actualizó" },
    ]
  },
  {
    name: "technology_edits",
    description: "Historial de ediciones propuestas para tecnologías",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "technology_id", type: "uuid", nullable: false, description: "ID de la tecnología", isForeignKey: true, references: "technologies.id" },
      { name: "field_name", type: "text", nullable: false, description: "Campo editado" },
      { name: "old_value", type: "text", nullable: true, description: "Valor anterior" },
      { name: "new_value", type: "text", nullable: true, description: "Valor nuevo" },
      { name: "status", type: "edit_status", nullable: true, description: "Estado (pending, approved, rejected)" },
      { name: "submitted_by", type: "uuid", nullable: true, description: "Usuario que propuso" },
      { name: "reviewed_by", type: "uuid", nullable: true, description: "Usuario que revisó" },
      { name: "review_notes", type: "text", nullable: true, description: "Notas de revisión" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha propuesta" },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, description: "Fecha actualización" },
      { name: "reviewed_at", type: "timestamp with time zone", nullable: true, description: "Fecha revisión" },
    ]
  },
  {
    name: "technology_subcategorias",
    description: "Tabla legacy de subcategorías (deprecada, usar taxonomy_subcategorias)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "nombre", type: "text", nullable: false, description: "Nombre" },
      { name: "tipo_id", type: "uuid", nullable: true, description: "ID del tipo" },
      { name: "descripcion", type: "text", nullable: true, description: "Descripción" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
    ]
  },
  {
    name: "technology_tipos",
    description: "Tabla legacy de tipos (deprecada, usar taxonomy_tipos)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "nombre", type: "text", nullable: false, description: "Nombre" },
      { name: "descripcion", type: "text", nullable: true, description: "Descripción" },
      { name: "icono", type: "text", nullable: true, description: "Icono" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
    ]
  },
  {
    name: "user_favorites",
    description: "Tecnologías marcadas como favoritas por usuarios",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: false, description: "ID del usuario" },
      { name: "technology_id", type: "uuid", nullable: false, description: "ID de la tecnología", isForeignKey: true, references: "technologies.id" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha de favorito" },
    ]
  },
  {
    name: "user_invitations",
    description: "Invitaciones pendientes para nuevos usuarios",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "email", type: "text", nullable: false, description: "Email invitado" },
      { name: "role", type: "app_role", nullable: false, description: "Rol asignado" },
      { name: "invited_by", type: "uuid", nullable: true, description: "Usuario que invitó" },
      { name: "token", type: "text", nullable: true, description: "Token de invitación" },
      { name: "status", type: "text", nullable: true, description: "Estado (pending, accepted, expired)" },
      { name: "expires_at", type: "timestamp with time zone", nullable: true, description: "Fecha expiración" },
      { name: "created_at", type: "timestamp with time zone", nullable: true, description: "Fecha creación" },
    ]
  },
  {
    name: "user_roles",
    description: "Asignación de roles a usuarios (complementa profiles)",
    fields: [
      { name: "id", type: "uuid", nullable: false, description: "Identificador único (PK)", isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: false, description: "ID del usuario" },
      { name: "role", type: "app_role", nullable: false, description: "Rol asignado" },
    ]
  },
];

// Definición de funciones de base de datos
const DATABASE_FUNCTIONS = [
  { name: "check_user_role", description: "Verifica el rol de un usuario", params: "user_id uuid, allowed_roles app_role[]", returns: "boolean" },
  { name: "get_current_user_role", description: "Obtiene el rol del usuario actual", params: "", returns: "app_role" },
  { name: "has_role", description: "Verifica si el usuario tiene un rol específico", params: "role_name app_role", returns: "boolean" },
  { name: "is_admin", description: "Verifica si el usuario actual es admin", params: "", returns: "boolean" },
  { name: "is_analyst_or_above", description: "Verifica si el usuario es analista o superior", params: "", returns: "boolean" },
  { name: "match_knowledge_chunks", description: "Búsqueda semántica en chunks de conocimiento", params: "query_embedding vector, match_threshold float, match_count int", returns: "table" },
  { name: "search_casos_similares", description: "Búsqueda de casos de estudio similares", params: "query_embedding vector, match_threshold float, match_count int", returns: "table" },
  { name: "search_technologies_semantic", description: "Búsqueda semántica de tecnologías", params: "query_embedding vector, match_threshold float, match_count int", returns: "table" },
  { name: "update_updated_at_column", description: "Trigger para actualizar timestamp updated_at", params: "", returns: "trigger" },
  { name: "handle_new_user", description: "Trigger que crea perfil al registrar usuario", params: "", returns: "trigger" },
  { name: "get_user_stats", description: "Obtiene estadísticas de un usuario", params: "user_id uuid", returns: "jsonb" },
  { name: "cleanup_expired_sessions", description: "Limpia sesiones expiradas", params: "", returns: "void" },
];

// Definición de enums
const DATABASE_ENUMS = [
  {
    name: "app_role",
    description: "Roles de usuario en la aplicación",
    values: ["admin", "supervisor", "analyst", "client_basic", "client_professional", "client_enterprise"]
  },
  {
    name: "edit_status",
    description: "Estados de ediciones propuestas",
    values: ["pending", "approved", "rejected"]
  }
];

function generateMarkdownDocument(): string {
  const now = new Date().toISOString();
  const totalFields = DATABASE_SCHEMA.reduce((acc, table) => acc + table.fields.length, 0);
  
  let md = `# 📊 Schema de Base de Datos - Vandarum Platform

> **Proyecto:** Vandarum - Plataforma de Scouting Tecnológico
> **Generado:** ${now}
> **Versión del Schema:** 1.0

---

## 📈 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total Tablas** | ${DATABASE_SCHEMA.length} |
| **Total Campos** | ${totalFields} |
| **Funciones DB** | ${DATABASE_FUNCTIONS.length} |
| **Enums** | ${DATABASE_ENUMS.length} |

---

## 📑 Índice de Tablas

`;

  // Generar índice
  DATABASE_SCHEMA.forEach((table, index) => {
    md += `${index + 1}. [${table.name}](#${index + 1}-${table.name.replace(/_/g, '-')}) (${table.fields.length} campos)\n`;
  });

  md += `\n---\n\n`;

  // Generar capítulos por tabla
  DATABASE_SCHEMA.forEach((table, index) => {
    const pkFields = table.fields.filter(f => f.isPrimaryKey);
    const fkFields = table.fields.filter(f => f.isForeignKey);
    
    md += `## ${index + 1}. ${table.name}

**Descripción:** ${table.description}

**Campos:** ${table.fields.length} | **PK:** ${pkFields.length} | **FK:** ${fkFields.length}

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
`;

    table.fields.forEach((field, fieldIndex) => {
      const nullable = field.nullable ? "✅ Sí" : "❌ No";
      const fieldName = field.isPrimaryKey ? `🔑 ${field.name}` : (field.isForeignKey ? `🔗 ${field.name}` : field.name);
      md += `| ${fieldIndex + 1} | \`${fieldName}\` | ${field.type} | ${nullable} | ${field.description} |\n`;
    });

    // Añadir relaciones si existen
    if (fkFields.length > 0) {
      md += `\n**Relaciones:**\n`;
      fkFields.forEach(fk => {
        md += `- \`${fk.name}\` → \`${fk.references}\`\n`;
      });
    }

    md += `\n---\n\n`;
  });

  // Añadir funciones
  md += `## 🔧 Funciones de Base de Datos

| Función | Descripción | Parámetros | Retorna |
|---------|-------------|------------|---------|
`;

  DATABASE_FUNCTIONS.forEach(func => {
    md += `| \`${func.name}\` | ${func.description} | ${func.params || '-'} | ${func.returns} |\n`;
  });

  md += `\n---\n\n`;

  // Añadir enums
  md += `## 🏷️ Enums y Constantes

`;

  DATABASE_ENUMS.forEach(enumDef => {
    md += `### ${enumDef.name}

**Descripción:** ${enumDef.description}

**Valores:**
`;
    enumDef.values.forEach(val => {
      md += `- \`${val}\`\n`;
    });
    md += `\n`;
  });

  md += `---\n\n`;

  // Añadir notas técnicas
  md += `## 📝 Notas Técnicas

### Convenciones de Nombres
- Las tablas principales usan nombres en español con espacios para campos de negocio (e.g., \`"Nombre de la tecnología"\`)
- Los campos técnicos usan snake_case en inglés (e.g., \`created_at\`, \`updated_at\`)
- Esta inconsistencia es deuda técnica heredada del sistema legacy

### Campos con Embeddings
Las siguientes tablas tienen campos \`vector\` para búsqueda semántica:
- \`casos_de_estudio.embedding\`
- \`knowledge_chunks.embedding\`
- \`study_longlist.embedding\`

### Tablas Deprecadas
- \`technology_tipos\` → Usar \`taxonomy_tipos\`
- \`technology_subcategorias\` → Usar \`taxonomy_subcategorias\`

### Tablas con RLS
Todas las tablas tienen Row Level Security (RLS) habilitado. Verificar políticas específicas en la documentación de seguridad.

---

*Documento generado automáticamente por Vandarum Platform*
`;

  return md;
}

export async function downloadDatabaseSchemaMarkdown(): Promise<void> {
  const markdownContent = generateMarkdownDocument();
  
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vandarum-database-schema-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { DATABASE_SCHEMA, DATABASE_FUNCTIONS, DATABASE_ENUMS, generateMarkdownDocument };
