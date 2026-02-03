
# Plan: Documentación Completa del Schema de Base de Datos Interna

## Resumen del Análisis

He analizado exhaustivamente la base de datos interna de Supabase y encontré:

| Métrica | Valor Actual |
|---------|--------------|
| Total Tablas | 46 |
| Funciones RPC | 12 |
| Enums | 2 |
| Filas totales (aprox) | ~8,000 |

### Tablas Nuevas (vs documentación anterior)
- `cost_consulting_projects` - Proyectos de consultoría de costos
- `cost_verticals` - Verticales/categorías de costos

---

## Archivo a Crear

**`docs/SUPABASE_INTERNAL_SCHEMA.md`**

Contendrá una versión actualizada y estructurada de la documentación con:

### 1. Resumen Ejecutivo
- Estadísticas generales
- Fecha de actualización
- Distribución de filas por módulo

### 2. Diagrama de Relaciones (Mermaid)
```text
erDiagram
    advisor_users ||--o{ advisor_chats : "has"
    advisor_users ||--o{ advisor_credits : "has"
    advisor_chats ||--o{ advisor_messages : "contains"
    ...etc
```

### 3. Tablas por Módulo Funcional

| Módulo | Tablas |
|--------|--------|
| **Advisor (AI Chat)** | advisor_users, advisor_chats, advisor_messages, advisor_credits, advisor_callback_requests |
| **Auth/Usuarios** | profiles, user_roles, user_invitations, user_favorites |
| **Tecnologías** | technologies, technology_edits, technology_tipos, technology_subcategorias |
| **Taxonomía** | taxonomy_tipos, taxonomy_subcategorias, taxonomy_sectores |
| **Scouting** | scouting_queue, scouting_sessions, scouting_session_logs, scouting_sources, scouting_run_requests |
| **Estudios** | scouting_studies, study_sessions, study_longlist, study_shortlist, study_evaluations, study_solutions, study_research, study_reports, study_session_logs |
| **Casos de Estudio** | casos_de_estudio, case_study_jobs, case_study_technologies |
| **Knowledge Base** | knowledge_documents, knowledge_chunks |
| **Proyectos** | projects, project_technologies |
| **Cost Consulting** | cost_consulting_projects, cost_verticals |
| **Sistema** | ai_model_settings, ai_usage_logs, audit_logs, sync_queue, technological_trends, rejected_technologies, saved_ai_searches |

### 4. Detalle por Tabla
Para cada tabla:
- Descripción y propósito
- Columnas con tipos y nullability
- Primary keys y Foreign keys
- Índices
- Conteo de filas actual

### 5. Funciones RPC
| Función | Args | Returns | Descripción |
|---------|------|---------|-------------|
| `approve_scouting_to_technologies` | scouting_id | uuid | Aprueba tecnología de cola a tabla principal |
| `check_scouting_duplicate` | p_name, p_provider | table | Verifica duplicados en scouting |
| `check_technology_duplicate` | p_name, p_provider | table | Verifica duplicados en technologies |
| `close_zombie_jobs` | max_age_minutes | integer | Cierra jobs zombie de scouting |
| `close_zombie_case_study_jobs` | max_age_minutes | integer | Cierra jobs zombie de case studies |
| `deduct_advisor_credits` | p_user_id, p_amount, p_model, p_description | json | Deduce créditos del advisor |
| `force_close_scouting_job` | job_id, close_reason | boolean | Fuerza cierre de job |
| `has_role` | _user_id, _role | boolean | Verifica si usuario tiene rol |
| `normalize_source_url` | url | text | Normaliza URLs de fuentes |
| `normalize_tech_name` | input_text | text | Normaliza nombres de tecnologías |
| `reject_scouting_to_rejected` | scouting_id, reason, category | uuid | Rechaza tecnología a tabla rejected |
| `search_technologies_by_keywords` | p_keywords, p_min_trl, p_max_results | table | Búsqueda por keywords |
| `search_technologies_by_keywords_v2` | p_keywords, filters... | table | Búsqueda avanzada con filtros |

### 6. Enums
```sql
app_role: admin | supervisor | analyst | client_basic | client_professional | client_enterprise
edit_status: pending | approved | rejected
```

### 7. Notas de Seguridad
- Linter warnings detectados (19 issues)
- RLS policies permisivas identificadas
- Recomendaciones de mejora

---

## Datos de Filas por Tabla (snapshot actual)

| Tabla | Filas |
|-------|-------|
| technologies | 2,551 |
| sync_queue | 1,774 |
| knowledge_documents | 915 |
| scouting_session_logs | 703 |
| study_session_logs | 578 |
| knowledge_chunks | 386 |
| scouting_sources | 210 |
| scouting_queue | 149 |
| taxonomy_subcategorias | 142 |
| project_technologies | 125 |
| ai_usage_logs | 118 |
| advisor_messages | 94 |
| case_study_jobs | 77 |
| study_sessions | 62 |
| advisor_credits | 47 |
| study_research | 40 |
| study_longlist | 31 |
| scouting_sessions | 27 |
| advisor_chats | 23 |
| case_study_technologies | 22 |
| technology_tipos | 19 |
| study_solutions | 15 |
| scouting_run_requests | 14 |
| technology_subcategorias | 11 |
| study_evaluations | 10 |
| study_shortlist | 10 |
| taxonomy_tipos | 9 |
| cost_verticals | 7 |
| study_reports | 7 |
| audit_logs | 5 |
| ai_model_settings | 4 |
| casos_de_estudio | 3 |
| projects | 3 |
| taxonomy_sectores | 3 |
| technological_trends | 2 |
| advisor_users | 1 |
| profiles | 1 |
| scouting_studies | 1 |
| user_roles | 1 |
| (8 tablas vacías) | 0 |

---

## Sección Técnica

### Estructura del archivo de salida

```markdown
# Supabase Internal Schema - Vandarum Platform

> Generado: 2026-02-03
> Total Tablas: 46
> Proyecto Supabase: bdmpshiqspkxcisnnlyr

## Resumen por Módulo
[Tabla con módulos y sus tablas]

## Diagrama ER
[Diagrama Mermaid de relaciones]

## Tablas

### 1. advisor_callback_requests
**Módulo:** Advisor
**Filas:** 0
**Descripción:** Solicitudes de callback comercial

| Columna | Tipo | Nullable | Default | FK |
|---------|------|----------|---------|-----|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | YES | - | advisor_users.id |
...

### 2. advisor_chats
[etc...]

## Funciones RPC
[Lista detallada de funciones]

## Enums
[Definiciones de enums]

## Índices
[Lista de índices por tabla]

## Notas de Seguridad
[Warnings del linter y recomendaciones]
```

### Diferencias con archivo existente
El archivo actual `docs/DATABASE_SCHEMA.md`:
- Fecha: 2026-01-22 (12 días atrás)
- 44 tablas documentadas
- Faltan: cost_consulting_projects, cost_verticals
- Algunos campos desactualizados

El nuevo archivo será una versión completamente actualizada con:
- 46 tablas
- Conteos de filas actuales
- Módulos funcionales claramente identificados
- Diagrama ER actualizado
- Funciones RPC completas
