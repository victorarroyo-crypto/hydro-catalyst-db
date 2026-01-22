# 📊 Schema de Base de Datos - Vandarum Platform

> **Proyecto:** Vandarum - Plataforma de Scouting Tecnológico
> **Generado:** 2026-01-22
> **Versión del Schema:** 1.0

---

## 📈 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total Tablas** | 44 |
| **Total Campos** | ~480 |
| **Funciones DB** | 12 |
| **Enums** | 2 |

---

## 📑 Índice de Tablas

1. [advisor_callback_requests](#1-advisor_callback_requests) (12 campos)
2. [advisor_chats](#2-advisor_chats) (8 campos)
3. [advisor_credits](#3-advisor_credits) (9 campos)
4. [advisor_messages](#4-advisor_messages) (9 campos)
5. [advisor_users](#5-advisor_users) (12 campos)
6. [ai_model_settings](#6-ai_model_settings) (5 campos)
7. [ai_usage_logs](#7-ai_usage_logs) (11 campos)
8. [audit_logs](#8-audit_logs) (9 campos)
9. [case_study_jobs](#9-case_study_jobs) (14 campos)
10. [case_study_technologies](#10-case_study_technologies) (11 campos)
11. [casos_de_estudio](#11-casos_de_estudio) (27 campos)
12. [knowledge_chunks](#12-knowledge_chunks) (6 campos)
13. [knowledge_documents](#13-knowledge_documents) (12 campos)
14. [profiles](#14-profiles) (6 campos)
15. [project_technologies](#15-project_technologies) (5 campos)
16. [projects](#16-projects) (11 campos)
17. [rejected_technologies](#17-rejected_technologies) (28 campos)
18. [saved_ai_searches](#18-saved_ai_searches) (7 campos)
19. [scouting_queue](#19-scouting_queue) (30 campos)
20. [scouting_run_requests](#20-scouting_run_requests) (9 campos)
21. [scouting_session_logs](#21-scouting_session_logs) (8 campos)
22. [scouting_sessions](#22-scouting_sessions) (21 campos)
23. [scouting_sources](#23-scouting_sources) (17 campos)
24. [scouting_studies](#24-scouting_studies) (17 campos)
25. [study_evaluations](#25-study_evaluations) (38 campos)
26. [study_longlist](#26-study_longlist) (35 campos)
27. [study_reports](#27-study_reports) (16 campos)
28. [study_research](#28-study_research) (18 campos)
29. [study_session_logs](#29-study_session_logs) (8 campos)
30. [study_sessions](#30-study_sessions) (13 campos)
31. [study_shortlist](#31-study_shortlist) (8 campos)
32. [study_solutions](#32-study_solutions) (21 campos)
33. [sync_queue](#33-sync_queue) (12 campos)
34. [taxonomy_sectores](#34-taxonomy_sectores) (3 campos)
35. [taxonomy_subcategorias](#35-taxonomy_subcategorias) (4 campos)
36. [taxonomy_tipos](#36-taxonomy_tipos) (4 campos)
37. [technological_trends](#37-technological_trends) (10 campos)
38. [technologies](#38-technologies) (26 campos)
39. [technology_edits](#39-technology_edits) (12 campos)
40. [technology_subcategorias](#40-technology_subcategorias) (5 campos)
41. [technology_tipos](#41-technology_tipos) (5 campos)
42. [user_favorites](#42-user_favorites) (4 campos)
43. [user_invitations](#43-user_invitations) (8 campos)
44. [user_roles](#44-user_roles) (3 campos)

---

## 1. advisor_callback_requests

**Descripción:** Solicitudes de callback del módulo AI Advisor para usuarios que requieren contacto comercial

**Campos:** 12 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 user_id` | uuid | ✅ Sí | ID del usuario advisor |
| 3 | `email` | text | ❌ No | Email del solicitante |
| 4 | `name` | text | ❌ No | Nombre del solicitante |
| 5 | `company` | text | ✅ Sí | Empresa del solicitante |
| 6 | `phone` | text | ✅ Sí | Teléfono de contacto |
| 7 | `message` | text | ✅ Sí | Mensaje adicional |
| 8 | `interest_area` | text | ✅ Sí | Área de interés (agua, energía, etc.) |
| 9 | `status` | text | ✅ Sí | Estado de la solicitud (pending, contacted, completed) |
| 10 | `notes` | text | ✅ Sí | Notas internas del equipo comercial |
| 11 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 12 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de última actualización |

**Relaciones:**
- `user_id` → `advisor_users.id`

---

## 2. advisor_chats

**Descripción:** Sesiones de chat del módulo AI Advisor, agrupa mensajes por conversación

**Campos:** 8 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 user_id` | uuid | ✅ Sí | ID del usuario advisor |
| 3 | `title` | text | ✅ Sí | Título del chat (auto-generado o manual) |
| 4 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 5 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de última actividad |
| 6 | `is_archived` | boolean | ✅ Sí | Si el chat está archivado |
| 7 | `metadata` | jsonb | ✅ Sí | Metadatos adicionales del chat |
| 8 | `last_message_preview` | text | ✅ Sí | Preview del último mensaje |

**Relaciones:**
- `user_id` → `advisor_users.id`

---

## 3. advisor_credits

**Descripción:** Sistema de créditos para el módulo AI Advisor, controla el uso de la IA

**Campos:** 9 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 user_id` | uuid | ❌ No | ID del usuario advisor |
| 3 | `total_credits` | integer | ✅ Sí | Total de créditos asignados |
| 4 | `used_credits` | integer | ✅ Sí | Créditos consumidos |
| 5 | `plan_type` | text | ✅ Sí | Tipo de plan (free, pro, enterprise) |
| 6 | `reset_date` | timestamp with time zone | ✅ Sí | Fecha de reset de créditos |
| 7 | `bonus_credits` | integer | ✅ Sí | Créditos bonus adicionales |
| 8 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 9 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de última actualización |

**Relaciones:**
- `user_id` → `advisor_users.id`

---

## 4. advisor_messages

**Descripción:** Mensajes individuales dentro de las sesiones de chat del AI Advisor

**Campos:** 9 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 chat_id` | uuid | ✅ Sí | ID del chat padre |
| 3 | `role` | text | ❌ No | Rol del mensaje (user, assistant, system) |
| 4 | `content` | text | ❌ No | Contenido del mensaje |
| 5 | `metadata` | jsonb | ✅ Sí | Metadatos (tokens, modelo, etc.) |
| 6 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 7 | `tokens_used` | integer | ✅ Sí | Tokens consumidos |
| 8 | `model_used` | text | ✅ Sí | Modelo de IA utilizado |
| 9 | `tool_calls` | jsonb | ✅ Sí | Llamadas a herramientas realizadas |

**Relaciones:**
- `chat_id` → `advisor_chats.id`

---

## 5. advisor_users

**Descripción:** Usuarios del módulo AI Advisor (separados de usuarios principales)

**Campos:** 12 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `email` | text | ❌ No | Email único del usuario |
| 3 | `full_name` | text | ✅ Sí | Nombre completo |
| 4 | `company` | text | ✅ Sí | Empresa |
| 5 | `role` | text | ✅ Sí | Rol en la empresa |
| 6 | `industry` | text | ✅ Sí | Industria/sector |
| 7 | `phone` | text | ✅ Sí | Teléfono |
| 8 | `avatar_url` | text | ✅ Sí | URL del avatar |
| 9 | `preferences` | jsonb | ✅ Sí | Preferencias del usuario |
| 10 | `is_verified` | boolean | ✅ Sí | Si el email está verificado |
| 11 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de registro |
| 12 | `last_login` | timestamp with time zone | ✅ Sí | Último inicio de sesión |

---

## 6. ai_model_settings

**Descripción:** Configuración de modelos de IA para diferentes funcionalidades del sistema

**Campos:** 5 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `feature_key` | text | ❌ No | Clave de la funcionalidad (enrich, classify, search) |
| 3 | `model_name` | text | ❌ No | Nombre del modelo a usar |
| 4 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 5 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |

---

## 7. ai_usage_logs

**Descripción:** Logs de uso de modelos de IA para tracking de costos y rendimiento

**Campos:** 11 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `user_id` | uuid | ✅ Sí | ID del usuario que hizo la llamada |
| 3 | `feature_key` | text | ❌ No | Funcionalidad que usó la IA |
| 4 | `model_name` | text | ❌ No | Modelo utilizado |
| 5 | `input_tokens` | integer | ✅ Sí | Tokens de entrada |
| 6 | `output_tokens` | integer | ✅ Sí | Tokens de salida |
| 7 | `total_tokens` | integer | ✅ Sí | Total de tokens |
| 8 | `cost_usd` | numeric | ✅ Sí | Costo en USD |
| 9 | `latency_ms` | integer | ✅ Sí | Latencia en milisegundos |
| 10 | `metadata` | jsonb | ✅ Sí | Metadatos adicionales |
| 11 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de la llamada |

---

## 8. audit_logs

**Descripción:** Logs de auditoría para tracking de acciones de usuarios en el sistema

**Campos:** 9 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `user_id` | uuid | ✅ Sí | ID del usuario que realizó la acción |
| 3 | `action` | text | ❌ No | Tipo de acción (CREATE, UPDATE, DELETE, etc.) |
| 4 | `entity_type` | text | ✅ Sí | Tipo de entidad afectada |
| 5 | `entity_id` | uuid | ✅ Sí | ID de la entidad afectada |
| 6 | `old_values` | jsonb | ✅ Sí | Valores anteriores |
| 7 | `new_values` | jsonb | ✅ Sí | Valores nuevos |
| 8 | `details` | jsonb | ✅ Sí | Detalles adicionales |
| 9 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de la acción |

---

## 9. case_study_jobs

**Descripción:** Jobs de procesamiento de casos de estudio con IA (extracción, análisis)

**Campos:** 14 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 case_study_id` | uuid | ✅ Sí | ID del caso de estudio |
| 3 | `job_type` | text | ❌ No | Tipo de job (extract, analyze, summarize) |
| 4 | `status` | text | ✅ Sí | Estado (pending, running, completed, failed) |
| 5 | `progress` | integer | ✅ Sí | Progreso 0-100 |
| 6 | `result` | jsonb | ✅ Sí | Resultado del procesamiento |
| 7 | `error_message` | text | ✅ Sí | Mensaje de error si falló |
| 8 | `model_used` | text | ✅ Sí | Modelo de IA usado |
| 9 | `tokens_used` | integer | ✅ Sí | Tokens consumidos |
| 10 | `started_at` | timestamp with time zone | ✅ Sí | Inicio del procesamiento |
| 11 | `completed_at` | timestamp with time zone | ✅ Sí | Fin del procesamiento |
| 12 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 13 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 14 | `created_by` | uuid | ✅ Sí | Usuario que creó el job |

**Relaciones:**
- `case_study_id` → `casos_de_estudio.id`

---

## 10. case_study_technologies

**Descripción:** Tecnologías extraídas de casos de estudio mediante procesamiento IA

**Campos:** 11 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 case_study_id` | uuid | ✅ Sí | ID del caso de estudio origen |
| 3 | `technology_name` | text | ❌ No | Nombre de la tecnología extraída |
| 4 | `provider` | text | ✅ Sí | Proveedor/empresa |
| 5 | `description` | text | ✅ Sí | Descripción técnica |
| 6 | `technology_type` | text | ✅ Sí | Tipo de tecnología |
| 7 | `application` | text | ✅ Sí | Aplicación principal |
| 8 | `extraction_confidence` | numeric | ✅ Sí | Confianza de extracción 0-1 |
| 9 | `raw_data` | jsonb | ✅ Sí | Datos crudos extraídos |
| 10 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de extracción |
| 11 | `status` | text | ✅ Sí | Estado (pending, approved, rejected) |

**Relaciones:**
- `case_study_id` → `casos_de_estudio.id`

---

## 11. casos_de_estudio

**Descripción:** Base de conocimiento de casos de estudio del sector agua (Knowledge Base)

**Campos:** 27 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `titulo` | text | ❌ No | Título del caso de estudio |
| 3 | `cliente` | text | ✅ Sí | Cliente del proyecto |
| 4 | `sector` | text | ✅ Sí | Sector industrial |
| 5 | `subsector` | text | ✅ Sí | Subsector específico |
| 6 | `pais` | text | ✅ Sí | País de implementación |
| 7 | `año` | integer | ✅ Sí | Año de implementación |
| 8 | `problema` | text | ✅ Sí | Problema abordado |
| 9 | `solucion` | text | ✅ Sí | Solución implementada |
| 10 | `resultados` | text | ✅ Sí | Resultados obtenidos |
| 11 | `tecnologias_usadas` | text[] | ✅ Sí | Array de tecnologías usadas |
| 12 | `metricas` | jsonb | ✅ Sí | Métricas cuantitativas |
| 13 | `lecciones_aprendidas` | text | ✅ Sí | Lecciones aprendidas |
| 14 | `fuente` | text | ✅ Sí | Fuente del caso |
| 15 | `url_fuente` | text | ✅ Sí | URL de la fuente |
| 16 | `documento_original` | text | ✅ Sí | Path al documento original |
| 17 | `resumen_ejecutivo` | text | ✅ Sí | Resumen ejecutivo |
| 18 | `tags` | text[] | ✅ Sí | Tags para búsqueda |
| 19 | `calidad_score` | integer | ✅ Sí | Puntuación de calidad 1-10 |
| 20 | `status` | text | ✅ Sí | Estado (draft, review, published) |
| 21 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 22 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 23 | `created_by` | uuid | ✅ Sí | Usuario que lo creó |
| 24 | `embedding` | vector | ✅ Sí | Vector embedding para búsqueda semántica |
| 25 | `descripcion_ia` | text | ✅ Sí | Descripción generada por IA |
| 26 | `processing_status` | text | ✅ Sí | Estado de procesamiento IA |
| 27 | `raw_content` | text | ✅ Sí | Contenido crudo del documento |

---

## 12. knowledge_chunks

**Descripción:** Chunks de documentos para RAG (Retrieval Augmented Generation)

**Campos:** 6 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 document_id` | uuid | ✅ Sí | ID del documento padre |
| 3 | `content` | text | ❌ No | Contenido del chunk |
| 4 | `chunk_index` | integer | ✅ Sí | Índice del chunk en el documento |
| 5 | `embedding` | vector | ✅ Sí | Vector embedding 1536 dimensiones |
| 6 | `metadata` | jsonb | ✅ Sí | Metadatos del chunk (página, sección) |

**Relaciones:**
- `document_id` → `knowledge_documents.id`

---

## 13. knowledge_documents

**Descripción:** Documentos de la base de conocimiento para procesamiento RAG

**Campos:** 12 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `title` | text | ❌ No | Título del documento |
| 3 | `file_path` | text | ✅ Sí | Path en storage |
| 4 | `file_type` | text | ✅ Sí | Tipo de archivo (pdf, docx, txt) |
| 5 | `file_size` | integer | ✅ Sí | Tamaño en bytes |
| 6 | `content` | text | ✅ Sí | Contenido extraído |
| 7 | `processing_status` | text | ✅ Sí | Estado de procesamiento |
| 8 | `chunk_count` | integer | ✅ Sí | Número de chunks generados |
| 9 | `metadata` | jsonb | ✅ Sí | Metadatos del documento |
| 10 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de subida |
| 11 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 12 | `created_by` | uuid | ✅ Sí | Usuario que subió el doc |

---

## 14. profiles

**Descripción:** Perfiles de usuarios del sistema principal (vinculados a auth.users)

**Campos:** 6 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 user_id` | uuid | ❌ No | ID de auth.users |
| 3 | `full_name` | text | ✅ Sí | Nombre completo |
| 4 | `role` | app_role | ✅ Sí | Rol en la app (admin, analyst, client, etc.) |
| 5 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 6 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |

**Relaciones:**
- `user_id` → `auth.users.id`

---

## 15. project_technologies

**Descripción:** Relación many-to-many entre proyectos y tecnologías

**Campos:** 5 | **PK:** 1 | **FK:** 2

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 project_id` | uuid | ✅ Sí | ID del proyecto |
| 3 | `🔗 technology_id` | uuid | ✅ Sí | ID de la tecnología |
| 4 | `added_at` | timestamp with time zone | ✅ Sí | Fecha de asociación |
| 5 | `notes` | text | ✅ Sí | Notas sobre la relación |

**Relaciones:**
- `project_id` → `projects.id`
- `technology_id` → `technologies.id`

---

## 16. projects

**Descripción:** Proyectos de consultoría con sus fases, documentos y configuración

**Campos:** 11 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `name` | text | ❌ No | Nombre del proyecto |
| 3 | `description` | text | ✅ Sí | Descripción del proyecto |
| 4 | `client_id` | uuid | ✅ Sí | ID del cliente |
| 5 | `status` | text | ✅ Sí | Estado (pending, in_progress, completed, cancelled) |
| 6 | `project_type` | text | ✅ Sí | Tipo de proyecto |
| 7 | `start_date` | date | ✅ Sí | Fecha de inicio |
| 8 | `end_date` | date | ✅ Sí | Fecha de fin estimada |
| 9 | `metadata` | jsonb | ✅ Sí | Metadatos del proyecto |
| 10 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 11 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |

---

## 17. rejected_technologies

**Descripción:** Tecnologías rechazadas del proceso de scouting (historico)

**Campos:** 28 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `original_scouting_id` | uuid | ✅ Sí | ID original en scouting_queue |
| 3 | `Nombre de la tecnología` | text | ✅ Sí | Nombre de la tecnología |
| 4 | `Proveedor / Empresa` | text | ✅ Sí | Empresa proveedora |
| 5 | `País de origen` | text | ✅ Sí | País de origen |
| 6 | `Web de la empresa` | text | ✅ Sí | Sitio web |
| 7 | `Email de contacto` | text | ✅ Sí | Email de contacto |
| 8 | `Tipo de tecnología` | text | ✅ Sí | Tipo de tecnología |
| 9 | `Subcategoría` | text | ✅ Sí | Subcategoría |
| 10 | `Sector y subsector` | text | ✅ Sí | Sector y subsector |
| 11 | `Aplicación principal` | text | ✅ Sí | Aplicación principal |
| 12 | `Descripción técnica breve` | text | ✅ Sí | Descripción técnica |
| 13 | `Ventaja competitiva clave` | text | ✅ Sí | Ventaja competitiva |
| 14 | `Porque es innovadora` | text | ✅ Sí | Por qué es innovadora |
| 15 | `Casos de referencia` | text | ✅ Sí | Casos de referencia |
| 16 | `Paises donde actua` | text | ✅ Sí | Países donde opera |
| 17 | `Comentarios del analista` | text | ✅ Sí | Comentarios del analista |
| 18 | `Fecha de scouting` | text | ✅ Sí | Fecha de scouting |
| 19 | `Grado de madurez (TRL)` | integer | ✅ Sí | Nivel TRL 1-9 |
| 20 | `rejection_reason` | text | ✅ Sí | Razón del rechazo |
| 21 | `rejection_category` | text | ✅ Sí | Categoría de rechazo |
| 22 | `rejected_by` | uuid | ✅ Sí | Usuario que rechazó |
| 23 | `rejected_at` | timestamp with time zone | ✅ Sí | Fecha de rechazo |
| 24 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 25 | `subsector_industrial` | text | ✅ Sí | Subsector industrial |
| 26 | `source` | text | ✅ Sí | Fuente del dato |
| 27 | `source_url` | text | ✅ Sí | URL de la fuente |
| 28 | `session_id` | uuid | ✅ Sí | ID de sesión de scouting |

---

## 18. saved_ai_searches

**Descripción:** Búsquedas de IA guardadas por los usuarios para referencia futura

**Campos:** 7 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `user_id` | uuid | ✅ Sí | ID del usuario |
| 3 | `query` | text | ❌ No | Query de búsqueda |
| 4 | `results` | jsonb | ✅ Sí | Resultados guardados |
| 5 | `filters` | jsonb | ✅ Sí | Filtros aplicados |
| 6 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de guardado |
| 7 | `title` | text | ✅ Sí | Título descriptivo |

---

## 19. scouting_queue

**Descripción:** Cola de tecnologías pendientes de revisión del proceso de scouting

**Campos:** 30 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `Nombre de la tecnología` | text | ❌ No | Nombre de la tecnología |
| 3 | `Proveedor / Empresa` | text | ✅ Sí | Empresa proveedora |
| 4 | `País de origen` | text | ✅ Sí | País de origen |
| 5 | `Web de la empresa` | text | ✅ Sí | Sitio web |
| 6 | `Email de contacto` | text | ✅ Sí | Email de contacto |
| 7 | `Tipo de tecnología` | text | ✅ Sí | Tipo de tecnología |
| 8 | `Subcategoría` | text | ✅ Sí | Subcategoría |
| 9 | `Sector y subsector` | text | ✅ Sí | Sector y subsector |
| 10 | `Aplicación principal` | text | ✅ Sí | Aplicación principal |
| 11 | `Descripción técnica breve` | text | ✅ Sí | Descripción técnica |
| 12 | `Ventaja competitiva clave` | text | ✅ Sí | Ventaja competitiva |
| 13 | `Porque es innovadora` | text | ✅ Sí | Por qué es innovadora |
| 14 | `Casos de referencia` | text | ✅ Sí | Casos de referencia |
| 15 | `Paises donde actua` | text | ✅ Sí | Países donde opera |
| 16 | `Comentarios del analista` | text | ✅ Sí | Comentarios del analista |
| 17 | `Fecha de scouting` | text | ✅ Sí | Fecha de scouting |
| 18 | `Grado de madurez (TRL)` | integer | ✅ Sí | Nivel TRL 1-9 |
| 19 | `queue_status` | text | ✅ Sí | Estado en cola (pending, reviewing, approved) |
| 20 | `priority` | integer | ✅ Sí | Prioridad 1-5 |
| 21 | `notes` | text | ✅ Sí | Notas internas |
| 22 | `source` | text | ✅ Sí | Fuente del dato |
| 23 | `source_url` | text | ✅ Sí | URL de la fuente |
| 24 | `🔗 session_id` | uuid | ✅ Sí | ID de sesión de scouting |
| 25 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 26 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 27 | `subsector_industrial` | text | ✅ Sí | Subsector industrial |
| 28 | `added_by` | uuid | ✅ Sí | Usuario que añadió |
| 29 | `reviewed_by` | uuid | ✅ Sí | Usuario que revisó |
| 30 | `reviewed_at` | timestamp with time zone | ✅ Sí | Fecha de revisión |

**Relaciones:**
- `session_id` → `scouting_sessions.id`

---

## 20. scouting_run_requests

**Descripción:** Solicitudes de ejecución de sesiones de scouting automatizado

**Campos:** 9 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 session_id` | uuid | ✅ Sí | ID de la sesión |
| 3 | `requested_by` | uuid | ✅ Sí | Usuario que solicitó |
| 4 | `status` | text | ✅ Sí | Estado (pending, running, completed, failed) |
| 5 | `parameters` | jsonb | ✅ Sí | Parámetros de ejecución |
| 6 | `result` | jsonb | ✅ Sí | Resultado de la ejecución |
| 7 | `error_message` | text | ✅ Sí | Mensaje de error |
| 8 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de solicitud |
| 9 | `completed_at` | timestamp with time zone | ✅ Sí | Fecha de completado |

**Relaciones:**
- `session_id` → `scouting_sessions.id`

---

## 21. scouting_session_logs

**Descripción:** Logs de actividad de sesiones de scouting para debugging

**Campos:** 8 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 session_id` | uuid | ✅ Sí | ID de la sesión |
| 3 | `log_type` | text | ✅ Sí | Tipo de log (info, warning, error) |
| 4 | `message` | text | ✅ Sí | Mensaje del log |
| 5 | `metadata` | jsonb | ✅ Sí | Metadatos adicionales |
| 6 | `source` | text | ✅ Sí | Fuente del log |
| 7 | `created_at` | timestamp with time zone | ✅ Sí | Fecha del log |
| 8 | `agent_name` | text | ✅ Sí | Nombre del agente IA |

**Relaciones:**
- `session_id` → `scouting_sessions.id`

---

## 22. scouting_sessions

**Descripción:** Sesiones de scouting automatizado con agentes IA

**Campos:** 21 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `name` | text | ❌ No | Nombre de la sesión |
| 3 | `description` | text | ✅ Sí | Descripción |
| 4 | `search_query` | text | ✅ Sí | Query de búsqueda |
| 5 | `search_parameters` | jsonb | ✅ Sí | Parámetros de búsqueda |
| 6 | `target_sectors` | text[] | ✅ Sí | Sectores objetivo |
| 7 | `target_technologies` | text[] | ✅ Sí | Tipos de tecnología objetivo |
| 8 | `status` | text | ✅ Sí | Estado (draft, running, paused, completed) |
| 9 | `technologies_found` | integer | ✅ Sí | Número de tecnologías encontradas |
| 10 | `technologies_approved` | integer | ✅ Sí | Tecnologías aprobadas |
| 11 | `technologies_rejected` | integer | ✅ Sí | Tecnologías rechazadas |
| 12 | `sources_searched` | integer | ✅ Sí | Fuentes consultadas |
| 13 | `ai_model_used` | text | ✅ Sí | Modelo de IA usado |
| 14 | `started_at` | timestamp with time zone | ✅ Sí | Fecha de inicio |
| 15 | `completed_at` | timestamp with time zone | ✅ Sí | Fecha de fin |
| 16 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 17 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 18 | `created_by` | uuid | ✅ Sí | Usuario que creó |
| 19 | `last_activity` | timestamp with time zone | ✅ Sí | Última actividad |
| 20 | `progress_percentage` | integer | ✅ Sí | Progreso 0-100 |
| 21 | `error_count` | integer | ✅ Sí | Número de errores |

---

## 23. scouting_sources

**Descripción:** Fuentes web consultadas durante el proceso de scouting

**Campos:** 17 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 session_id` | uuid | ✅ Sí | ID de la sesión |
| 3 | `url` | text | ❌ No | URL de la fuente |
| 4 | `title` | text | ✅ Sí | Título de la página |
| 5 | `source_type` | text | ✅ Sí | Tipo de fuente (news, academic, company) |
| 6 | `relevance_score` | numeric | ✅ Sí | Puntuación de relevancia |
| 7 | `technologies_extracted` | integer | ✅ Sí | Tecnologías extraídas |
| 8 | `content_preview` | text | ✅ Sí | Preview del contenido |
| 9 | `scraped_at` | timestamp with time zone | ✅ Sí | Fecha de scraping |
| 10 | `status` | text | ✅ Sí | Estado (pending, scraped, failed) |
| 11 | `error_message` | text | ✅ Sí | Mensaje de error |
| 12 | `metadata` | jsonb | ✅ Sí | Metadatos |
| 13 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 14 | `domain` | text | ✅ Sí | Dominio de la URL |
| 15 | `language` | text | ✅ Sí | Idioma detectado |
| 16 | `word_count` | integer | ✅ Sí | Número de palabras |
| 17 | `is_relevant` | boolean | ✅ Sí | Si es relevante |

**Relaciones:**
- `session_id` → `scouting_sessions.id`

---

## 24. scouting_studies

**Descripción:** Estudios de scouting que agrupan múltiples sesiones de búsqueda

**Campos:** 17 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `name` | text | ❌ No | Nombre del estudio |
| 3 | `description` | text | ✅ Sí | Descripción del estudio |
| 4 | `objective` | text | ✅ Sí | Objetivo del estudio |
| 5 | `scope` | text | ✅ Sí | Alcance |
| 6 | `target_sectors` | text[] | ✅ Sí | Sectores objetivo |
| 7 | `target_regions` | text[] | ✅ Sí | Regiones objetivo |
| 8 | `status` | text | ✅ Sí | Estado (draft, active, completed) |
| 9 | `sessions_count` | integer | ✅ Sí | Número de sesiones |
| 10 | `total_technologies` | integer | ✅ Sí | Total de tecnologías |
| 11 | `deadline` | date | ✅ Sí | Fecha límite |
| 12 | `client_name` | text | ✅ Sí | Nombre del cliente |
| 13 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 14 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 15 | `created_by` | uuid | ✅ Sí | Usuario que creó |
| 16 | `metadata` | jsonb | ✅ Sí | Metadatos |
| 17 | `project_id` | uuid | ✅ Sí | ID del proyecto asociado |

---

## 25. study_evaluations

**Descripción:** Evaluaciones detalladas de tecnologías en la fase de shortlist

**Campos:** 38 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `technology_id` | uuid | ✅ Sí | ID de la tecnología |
| 4 | `evaluator_id` | uuid | ✅ Sí | ID del evaluador |
| 5 | `technical_score` | numeric | ✅ Sí | Puntuación técnica |
| 6 | `commercial_score` | numeric | ✅ Sí | Puntuación comercial |
| 7 | `innovation_score` | numeric | ✅ Sí | Puntuación innovación |
| 8 | `sustainability_score` | numeric | ✅ Sí | Puntuación sostenibilidad |
| 9 | `implementation_score` | numeric | ✅ Sí | Puntuación implementación |
| 10 | `overall_score` | numeric | ✅ Sí | Puntuación global |
| 11 | `technical_notes` | text | ✅ Sí | Notas técnicas |
| 12 | `commercial_notes` | text | ✅ Sí | Notas comerciales |
| 13 | `risks` | text | ✅ Sí | Riesgos identificados |
| 14 | `opportunities` | text | ✅ Sí | Oportunidades |
| 15 | `recommendation` | text | ✅ Sí | Recomendación (approve, reject, investigate) |
| 16 | `status` | text | ✅ Sí | Estado de la evaluación |
| 17 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de creación |
| 18 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha de actualización |
| 19 | `capex_estimate` | numeric | ✅ Sí | Estimación CAPEX |
| 20 | `opex_estimate` | numeric | ✅ Sí | Estimación OPEX |
| 21 | `roi_estimate` | numeric | ✅ Sí | ROI estimado |
| 22 | `payback_years` | numeric | ✅ Sí | Payback en años |
| 23 | `implementation_timeline` | text | ✅ Sí | Timeline implementación |
| 24 | `strengths` | text[] | ✅ Sí | Fortalezas |
| 25 | `weaknesses` | text[] | ✅ Sí | Debilidades |
| 26 | `fit_score` | numeric | ✅ Sí | Puntuación de ajuste |
| 27 | `maturity_score` | numeric | ✅ Sí | Puntuación de madurez |
| 28 | `scalability_score` | numeric | ✅ Sí | Puntuación escalabilidad |
| 29 | `cost_score` | numeric | ✅ Sí | Puntuación de costo |
| 30 | `support_score` | numeric | ✅ Sí | Puntuación de soporte |
| 31 | `integration_score` | numeric | ✅ Sí | Puntuación integración |
| 32 | `compliance_score` | numeric | ✅ Sí | Puntuación cumplimiento |
| 33 | `vendor_stability_score` | numeric | ✅ Sí | Estabilidad proveedor |
| 34 | `training_requirements` | text | ✅ Sí | Requisitos de formación |
| 35 | `infrastructure_requirements` | text | ✅ Sí | Requisitos infraestructura |
| 36 | `dependencies` | text[] | ✅ Sí | Dependencias |
| 37 | `alternatives_considered` | text[] | ✅ Sí | Alternativas consideradas |

---

## 26. study_longlist

**Descripción:** Lista larga de tecnologías candidatas para un estudio

**Campos:** 35 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `technology_name` | text | ❌ No | Nombre de la tecnología |
| 4 | `provider` | text | ✅ Sí | Proveedor |
| 5 | `country` | text | ✅ Sí | País |
| 6 | `technology_type` | text | ✅ Sí | Tipo de tecnología |
| 7 | `subcategory` | text | ✅ Sí | Subcategoría |
| 8 | `description` | text | ✅ Sí | Descripción |
| 9 | `application` | text | ✅ Sí | Aplicación principal |
| 10 | `competitive_advantage` | text | ✅ Sí | Ventaja competitiva |
| 11 | `innovation` | text | ✅ Sí | Innovación |
| 12 | `trl` | integer | ✅ Sí | Nivel TRL |
| 13 | `website` | text | ✅ Sí | Sitio web |
| 14 | `email` | text | ✅ Sí | Email |
| 15 | `source` | text | ✅ Sí | Fuente |
| 16 | `source_url` | text | ✅ Sí | URL fuente |
| 17 | `relevance_score` | numeric | ✅ Sí | Puntuación relevancia |
| 18 | `fit_score` | numeric | ✅ Sí | Puntuación ajuste |
| 19 | `status` | text | ✅ Sí | Estado (pending, approved, rejected) |
| 20 | `notes` | text | ✅ Sí | Notas |
| 21 | `reviewed_by` | uuid | ✅ Sí | Revisado por |
| 22 | `reviewed_at` | timestamp with time zone | ✅ Sí | Fecha revisión |
| 23 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 24 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 25 | `reference_cases` | text | ✅ Sí | Casos de referencia |
| 26 | `operating_countries` | text | ✅ Sí | Países operación |
| 27 | `sector` | text | ✅ Sí | Sector |
| 28 | `analyst_comments` | text | ✅ Sí | Comentarios analista |
| 29 | `session_id` | uuid | ✅ Sí | ID de sesión |
| 30 | `extraction_source` | text | ✅ Sí | Fuente de extracción |
| 31 | `ai_confidence` | numeric | ✅ Sí | Confianza IA |
| 32 | `raw_data` | jsonb | ✅ Sí | Datos crudos |
| 33 | `embedding` | vector | ✅ Sí | Vector embedding |
| 34 | `shortlisted` | boolean | ✅ Sí | En shortlist |
| 35 | `shortlist_reason` | text | ✅ Sí | Razón shortlist |

---

## 27. study_reports

**Descripción:** Informes generados para estudios de tecnología

**Campos:** 16 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `report_type` | text | ✅ Sí | Tipo de informe (summary, detailed, executive) |
| 4 | `title` | text | ✅ Sí | Título del informe |
| 5 | `content` | text | ✅ Sí | Contenido del informe |
| 6 | `sections` | jsonb | ✅ Sí | Secciones estructuradas |
| 7 | `executive_summary` | text | ✅ Sí | Resumen ejecutivo |
| 8 | `recommendations` | jsonb | ✅ Sí | Recomendaciones |
| 9 | `conclusions` | text | ✅ Sí | Conclusiones |
| 10 | `status` | text | ✅ Sí | Estado (draft, review, final) |
| 11 | `version` | integer | ✅ Sí | Versión |
| 12 | `file_path` | text | ✅ Sí | Path al archivo |
| 13 | `generated_by` | text | ✅ Sí | Generado por (ai, manual) |
| 14 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 15 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 16 | `created_by` | uuid | ✅ Sí | Usuario que creó |

---

## 28. study_research

**Descripción:** Investigación y fuentes consultadas para un estudio

**Campos:** 18 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `session_id` | uuid | ✅ Sí | ID de sesión de investigación |
| 4 | `topic` | text | ✅ Sí | Tema de investigación |
| 5 | `query` | text | ✅ Sí | Query de búsqueda |
| 6 | `sources` | jsonb | ✅ Sí | Fuentes consultadas |
| 7 | `findings` | text | ✅ Sí | Hallazgos |
| 8 | `summary` | text | ✅ Sí | Resumen |
| 9 | `key_insights` | text[] | ✅ Sí | Insights clave |
| 10 | `data_points` | jsonb | ✅ Sí | Datos extraídos |
| 11 | `status` | text | ✅ Sí | Estado |
| 12 | `agent_name` | text | ✅ Sí | Agente IA usado |
| 13 | `tokens_used` | integer | ✅ Sí | Tokens consumidos |
| 14 | `cost_usd` | numeric | ✅ Sí | Costo en USD |
| 15 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 16 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 17 | `created_by` | uuid | ✅ Sí | Usuario que creó |
| 18 | `metadata` | jsonb | ✅ Sí | Metadatos |

---

## 29. study_session_logs

**Descripción:** Logs de sesiones de estudio con agentes IA

**Campos:** 8 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `session_id` | uuid | ✅ Sí | ID de la sesión |
| 3 | `log_type` | text | ✅ Sí | Tipo de log |
| 4 | `message` | text | ✅ Sí | Mensaje |
| 5 | `metadata` | jsonb | ✅ Sí | Metadatos |
| 6 | `source` | text | ✅ Sí | Fuente |
| 7 | `created_at` | timestamp with time zone | ✅ Sí | Fecha |
| 8 | `agent_name` | text | ✅ Sí | Nombre del agente |

---

## 30. study_sessions

**Descripción:** Sesiones de trabajo en estudios de tecnología

**Campos:** 13 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `session_type` | text | ✅ Sí | Tipo de sesión (research, analysis, review) |
| 4 | `status` | text | ✅ Sí | Estado |
| 5 | `parameters` | jsonb | ✅ Sí | Parámetros |
| 6 | `result` | jsonb | ✅ Sí | Resultado |
| 7 | `progress` | integer | ✅ Sí | Progreso 0-100 |
| 8 | `error_message` | text | ✅ Sí | Mensaje de error |
| 9 | `started_at` | timestamp with time zone | ✅ Sí | Fecha inicio |
| 10 | `completed_at` | timestamp with time zone | ✅ Sí | Fecha fin |
| 11 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 12 | `created_by` | uuid | ✅ Sí | Usuario que creó |
| 13 | `ai_model_used` | text | ✅ Sí | Modelo IA usado |

---

## 31. study_shortlist

**Descripción:** Lista corta de tecnologías finalistas de un estudio

**Campos:** 8 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `🔗 longlist_id` | uuid | ✅ Sí | ID en longlist |
| 4 | `priority` | integer | ✅ Sí | Prioridad/ranking |
| 5 | `justification` | text | ✅ Sí | Justificación de selección |
| 6 | `status` | text | ✅ Sí | Estado |
| 7 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 8 | `created_by` | uuid | ✅ Sí | Usuario que seleccionó |

**Relaciones:**
- `longlist_id` → `study_longlist.id`

---

## 32. study_solutions

**Descripción:** Soluciones propuestas para el problema de un estudio

**Campos:** 21 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `study_id` | uuid | ✅ Sí | ID del estudio |
| 3 | `name` | text | ❌ No | Nombre de la solución |
| 4 | `description` | text | ✅ Sí | Descripción |
| 5 | `solution_type` | text | ✅ Sí | Tipo de solución |
| 6 | `technologies_involved` | text[] | ✅ Sí | Tecnologías involucradas |
| 7 | `estimated_cost` | numeric | ✅ Sí | Costo estimado |
| 8 | `implementation_time` | text | ✅ Sí | Tiempo implementación |
| 9 | `benefits` | text[] | ✅ Sí | Beneficios |
| 10 | `risks` | text[] | ✅ Sí | Riesgos |
| 11 | `requirements` | text[] | ✅ Sí | Requisitos |
| 12 | `feasibility_score` | numeric | ✅ Sí | Puntuación viabilidad |
| 13 | `impact_score` | numeric | ✅ Sí | Puntuación impacto |
| 14 | `priority` | integer | ✅ Sí | Prioridad |
| 15 | `status` | text | ✅ Sí | Estado |
| 16 | `notes` | text | ✅ Sí | Notas |
| 17 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 18 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 19 | `created_by` | uuid | ✅ Sí | Usuario que creó |
| 20 | `ai_generated` | boolean | ✅ Sí | Generado por IA |
| 21 | `source_research_ids` | uuid[] | ✅ Sí | IDs de research relacionados |

---

## 33. sync_queue

**Descripción:** Cola de sincronización entre bases de datos local y externa

**Campos:** 12 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `entity_type` | text | ❌ No | Tipo de entidad (technology, project) |
| 3 | `entity_id` | uuid | ❌ No | ID de la entidad |
| 4 | `operation` | text | ❌ No | Operación (create, update, delete) |
| 5 | `status` | text | ✅ Sí | Estado (pending, synced, failed) |
| 6 | `payload` | jsonb | ✅ Sí | Datos a sincronizar |
| 7 | `error_message` | text | ✅ Sí | Mensaje de error |
| 8 | `retry_count` | integer | ✅ Sí | Intentos realizados |
| 9 | `last_attempt` | timestamp with time zone | ✅ Sí | Último intento |
| 10 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 11 | `synced_at` | timestamp with time zone | ✅ Sí | Fecha sincronización |
| 12 | `priority` | integer | ✅ Sí | Prioridad |

---

## 34. taxonomy_sectores

**Descripción:** Taxonomía de sectores industriales

**Campos:** 3 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `nombre` | text | ❌ No | Nombre del sector |
| 3 | `descripcion` | text | ✅ Sí | Descripción del sector |

---

## 35. taxonomy_subcategorias

**Descripción:** Taxonomía de subcategorías de tecnología

**Campos:** 4 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `nombre` | text | ❌ No | Nombre de la subcategoría |
| 3 | `🔗 tipo_id` | uuid | ✅ Sí | ID del tipo padre |
| 4 | `descripcion` | text | ✅ Sí | Descripción |

**Relaciones:**
- `tipo_id` → `taxonomy_tipos.id`

---

## 36. taxonomy_tipos

**Descripción:** Taxonomía de tipos de tecnología (nivel superior)

**Campos:** 4 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `nombre` | text | ❌ No | Nombre del tipo |
| 3 | `descripcion` | text | ✅ Sí | Descripción |
| 4 | `icono` | text | ✅ Sí | Icono asociado |

---

## 37. technological_trends

**Descripción:** Tendencias tecnológicas identificadas en el sector

**Campos:** 10 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `name` | text | ❌ No | Nombre de la tendencia |
| 3 | `description` | text | ✅ Sí | Descripción |
| 4 | `category` | text | ✅ Sí | Categoría |
| 5 | `impact_level` | text | ✅ Sí | Nivel de impacto (high, medium, low) |
| 6 | `timeframe` | text | ✅ Sí | Horizonte temporal |
| 7 | `related_technologies` | text[] | ✅ Sí | Tecnologías relacionadas |
| 8 | `sources` | jsonb | ✅ Sí | Fuentes |
| 9 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 10 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |

---

## 38. technologies

**Descripción:** Catálogo principal de tecnologías validadas del sistema

**Campos:** 26 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `Nombre de la tecnología` | text | ❌ No | Nombre de la tecnología |
| 3 | `Proveedor / Empresa` | text | ✅ Sí | Empresa proveedora |
| 4 | `País de origen` | text | ✅ Sí | País de origen |
| 5 | `Web de la empresa` | text | ✅ Sí | Sitio web |
| 6 | `Email de contacto` | text | ✅ Sí | Email de contacto |
| 7 | `Tipo de tecnología` | text | ❌ No | Tipo de tecnología |
| 8 | `Subcategoría` | text | ✅ Sí | Subcategoría |
| 9 | `Sector y subsector` | text | ✅ Sí | Sector y subsector |
| 10 | `Aplicación principal` | text | ✅ Sí | Aplicación principal |
| 11 | `Descripción técnica breve` | text | ✅ Sí | Descripción técnica |
| 12 | `Ventaja competitiva clave` | text | ✅ Sí | Ventaja competitiva |
| 13 | `Porque es innovadora` | text | ✅ Sí | Por qué es innovadora |
| 14 | `Casos de referencia` | text | ✅ Sí | Casos de referencia |
| 15 | `Paises donde actua` | text | ✅ Sí | Países donde opera |
| 16 | `Comentarios del analista` | text | ✅ Sí | Comentarios del analista |
| 17 | `Fecha de scouting` | text | ✅ Sí | Fecha de scouting |
| 18 | `Estado del seguimiento` | text | ✅ Sí | Estado del seguimiento |
| 19 | `Grado de madurez (TRL)` | integer | ✅ Sí | Nivel TRL 1-9 |
| 20 | `status` | text | ✅ Sí | Estado (active, inactive, archived) |
| 21 | `quality_score` | integer | ✅ Sí | Puntuación de calidad |
| 22 | `review_status` | text | ✅ Sí | Estado de revisión |
| 23 | `reviewer_id` | uuid | ✅ Sí | ID del revisor |
| 24 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |
| 25 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 26 | `updated_by` | uuid | ✅ Sí | Usuario que actualizó |

---

## 39. technology_edits

**Descripción:** Historial de ediciones propuestas para tecnologías

**Campos:** 12 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `🔗 technology_id` | uuid | ❌ No | ID de la tecnología |
| 3 | `field_name` | text | ❌ No | Campo editado |
| 4 | `old_value` | text | ✅ Sí | Valor anterior |
| 5 | `new_value` | text | ✅ Sí | Valor nuevo |
| 6 | `status` | edit_status | ✅ Sí | Estado (pending, approved, rejected) |
| 7 | `submitted_by` | uuid | ✅ Sí | Usuario que propuso |
| 8 | `reviewed_by` | uuid | ✅ Sí | Usuario que revisó |
| 9 | `review_notes` | text | ✅ Sí | Notas de revisión |
| 10 | `created_at` | timestamp with time zone | ✅ Sí | Fecha propuesta |
| 11 | `updated_at` | timestamp with time zone | ✅ Sí | Fecha actualización |
| 12 | `reviewed_at` | timestamp with time zone | ✅ Sí | Fecha revisión |

**Relaciones:**
- `technology_id` → `technologies.id`

---

## 40. technology_subcategorias

**Descripción:** Tabla legacy de subcategorías (deprecada, usar taxonomy_subcategorias)

**Campos:** 5 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `nombre` | text | ❌ No | Nombre |
| 3 | `tipo_id` | uuid | ✅ Sí | ID del tipo |
| 4 | `descripcion` | text | ✅ Sí | Descripción |
| 5 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |

---

## 41. technology_tipos

**Descripción:** Tabla legacy de tipos (deprecada, usar taxonomy_tipos)

**Campos:** 5 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `nombre` | text | ❌ No | Nombre |
| 3 | `descripcion` | text | ✅ Sí | Descripción |
| 4 | `icono` | text | ✅ Sí | Icono |
| 5 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |

---

## 42. user_favorites

**Descripción:** Tecnologías marcadas como favoritas por usuarios

**Campos:** 4 | **PK:** 1 | **FK:** 1

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `user_id` | uuid | ❌ No | ID del usuario |
| 3 | `🔗 technology_id` | uuid | ❌ No | ID de la tecnología |
| 4 | `created_at` | timestamp with time zone | ✅ Sí | Fecha de favorito |

**Relaciones:**
- `technology_id` → `technologies.id`

---

## 43. user_invitations

**Descripción:** Invitaciones pendientes para nuevos usuarios

**Campos:** 8 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `email` | text | ❌ No | Email invitado |
| 3 | `role` | app_role | ❌ No | Rol asignado |
| 4 | `invited_by` | uuid | ✅ Sí | Usuario que invitó |
| 5 | `token` | text | ✅ Sí | Token de invitación |
| 6 | `status` | text | ✅ Sí | Estado (pending, accepted, expired) |
| 7 | `expires_at` | timestamp with time zone | ✅ Sí | Fecha expiración |
| 8 | `created_at` | timestamp with time zone | ✅ Sí | Fecha creación |

---

## 44. user_roles

**Descripción:** Asignación de roles a usuarios (complementa profiles)

**Campos:** 3 | **PK:** 1 | **FK:** 0

| # | Campo | Tipo | Nullable | Descripción |
|---|-------|------|----------|-------------|
| 1 | `🔑 id` | uuid | ❌ No | Identificador único (PK) |
| 2 | `user_id` | uuid | ❌ No | ID del usuario |
| 3 | `role` | app_role | ❌ No | Rol asignado |

---

## 🔧 Funciones de Base de Datos

| Función | Descripción | Parámetros | Retorna |
|---------|-------------|------------|---------|
| `check_user_role` | Verifica el rol de un usuario | user_id uuid, allowed_roles app_role[] | boolean |
| `get_current_user_role` | Obtiene el rol del usuario actual | - | app_role |
| `has_role` | Verifica si el usuario tiene un rol específico | role_name app_role | boolean |
| `is_admin` | Verifica si el usuario actual es admin | - | boolean |
| `is_analyst_or_above` | Verifica si el usuario es analista o superior | - | boolean |
| `match_knowledge_chunks` | Búsqueda semántica en chunks de conocimiento | query_embedding vector, match_threshold float, match_count int | table |
| `search_casos_similares` | Búsqueda de casos de estudio similares | query_embedding vector, match_threshold float, match_count int | table |
| `search_technologies_semantic` | Búsqueda semántica de tecnologías | query_embedding vector, match_threshold float, match_count int | table |
| `update_updated_at_column` | Trigger para actualizar timestamp updated_at | - | trigger |
| `handle_new_user` | Trigger que crea perfil al registrar usuario | - | trigger |
| `get_user_stats` | Obtiene estadísticas de un usuario | user_id uuid | jsonb |
| `cleanup_expired_sessions` | Limpia sesiones expiradas | - | void |

---

## 🏷️ Enums y Constantes

### app_role

**Descripción:** Roles de usuario en la aplicación

**Valores:**
- `admin`
- `supervisor`
- `analyst`
- `client_basic`
- `client_professional`
- `client_enterprise`

### edit_status

**Descripción:** Estados de ediciones propuestas

**Valores:**
- `pending`
- `approved`
- `rejected`

---

## 📝 Notas Técnicas

### Convenciones de Nombres
- Las tablas principales usan nombres en español con espacios para campos de negocio (e.g., `"Nombre de la tecnología"`)
- Los campos técnicos usan snake_case en inglés (e.g., `created_at`, `updated_at`)
- Esta inconsistencia es deuda técnica heredada del sistema legacy

### Campos con Embeddings
Las siguientes tablas tienen campos `vector` para búsqueda semántica:
- `casos_de_estudio.embedding`
- `knowledge_chunks.embedding`
- `study_longlist.embedding`

### Tablas Deprecadas
- `technology_tipos` → Usar `taxonomy_tipos`
- `technology_subcategorias` → Usar `taxonomy_subcategorias`

### Tablas con RLS
Todas las tablas tienen Row Level Security (RLS) habilitado. Verificar políticas específicas en la documentación de seguridad.

---

*Documento generado automáticamente por Vandarum Platform*
