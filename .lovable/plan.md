
# Auditoría Exhaustiva del Módulo de Consultoría de Costes

## Resumen Ejecutivo

He realizado una revisión profunda del módulo de Cost Consulting, analizando 10 páginas principales, 15+ componentes, el servicio de API, y los hooks de datos. A continuación presento un informe profesional desde la perspectiva de un asesor senior de evaluación de costes empresariales.

---

## 1. BOTONES Y FUNCIONALIDADES "ZOMBI" (No funcionan o incompletas)

### 1.1 Benchmarks (CostConsultingBenchmarks.tsx) - COMPLETAMENTE VACÍO
**Severidad: CRÍTICA**

- **Estado actual**: Página placeholder sin funcionalidad alguna
- **Botones zombi**:
  - "Importar Datos" - No hace nada
  - "Crear Categoría" - No hace nada
- **KPIs siempre en 0**: Categorías, Puntos de Datos, Última Actualización
- **Impacto**: Sin datos de benchmark, el análisis comparativo de precios pierde su base fundamental

### 1.2 Simulador de Escenarios (CostConsultingSimulator.tsx)
**Severidad: MEDIA**

- **Botones parcialmente funcionales**:
  - "Guardar Escenario" - Guarda en memoria local, pero **no persiste en base de datos**
  - "Comparar Escenarios" - El modal de comparación se abre pero los datos no se exportan
  - "Generar Informe" - No integra escenarios en el informe final
- **Datos mock**: Si no hay contratos, usa datos de ejemplo hardcodeados (líneas 76-79)

### 1.3 Proveedores (CostConsultingSuppliers.tsx)
**Severidad: ALTA**

- **Botones zombi**:
  - "Añadir Proveedor" (línea 257) - No tiene handler implementado
  - Botón "X" para rechazar proveedor pendiente - Sin funcionalidad
  - "Verificar" modal - Los datos se llenan pero no se guardan realmente
- **Campos siempre vacíos**:
  - `categories: []` - Nunca se mapean desde BD
  - `projects: 0` - Sin relación implementada
  - `invoiceCount: 0`, `totalSpend: 0` - Sin cálculo real

### 1.4 Oportunidades - Botones de acción en cards
**Severidad: MEDIA**

En `OpportunityCard` (líneas 482-491 de CostConsultingOpportunities.tsx):
- Botón "Simular" - **No navega al simulador ni pasa datos**
- Botón "En progreso" - **No cambia el estado de la oportunidad**
- Campos siempre null: `oneTimeRecovery`, `rootCause`, `identifiedBy`, `identifiedAt`, `validatedAt`, `implementedAt`, `notes`

### 1.5 Contratos - Acciones de fila
**Severidad: BAJA**

- Botón "Ver" abre el sheet correctamente
- **Pero**: Los campos `earlyPaymentDiscount`, `indexation`, `penalty` no se extraen del backend (líneas 158-160)
- Benchmark comparison: El campo existe pero raramente tiene datos

### 1.6 Generación de Informes
**Severidad: MEDIA**

- El botón "PDF (próximamente)" está deshabilitado permanentemente
- El informe Word se genera pero:
  - No incluye gráficos reales (solo texto descriptivo)
  - Los escenarios simulados no se persisten
  - Roadmap de implementación es genérico

---

## 2. FUNCIONALIDADES QUE FALTAN (Esenciales para un asesor senior)

### 2.1 Gestión del Ciclo de Vida del Ahorro
**Prioridad: CRÍTICA**

Un asesor necesita trackear:
- [ ] **Estado de implementación por oportunidad**: Identificada → Validada → En negociación → Implementada → Verificada
- [ ] **Ahorro real vs. estimado**: Comparar lo proyectado con lo conseguido
- [ ] **Fechas de implementación**: Target vs. real
- [ ] **Responsables asignados**: Quién está trabajando cada oportunidad
- [ ] **Notas de seguimiento**: Historial de acciones tomadas

### 2.2 Dashboard de Seguimiento Temporal
**Prioridad: ALTA**

- [ ] **Evolución del ahorro mes a mes**: Gráfica de tendencia
- [ ] **Pipeline de oportunidades**: Funnel visual de estados
- [ ] **Alertas proactivas**: Recordatorios de vencimientos de contratos
- [ ] **Calendario de renovaciones**: Vista mensual de eventos críticos

### 2.3 Comparativa Multi-Proyecto
**Prioridad: ALTA**

- [ ] **Benchmarking entre clientes**: ¿Este cliente gasta más o menos que otros similares?
- [ ] **Mejores prácticas identificadas**: Qué funcionó en otros proyectos
- [ ] **Templates de oportunidades**: Patrones recurrentes que aplicar

### 2.4 Gestión de Benchmarks Real
**Prioridad: CRÍTICA**

- [ ] **CRUD completo de categorías y precios**
- [ ] **Importación masiva desde Excel**
- [ ] **Rangos P10-P90 por región/sector**
- [ ] **Actualización temporal**: Precios indexados por IPC
- [ ] **Fuentes de datos**: De dónde viene cada benchmark

### 2.5 Workflow de Aprobación
**Prioridad: MEDIA**

- [ ] **Roles diferenciados**: Analista, Supervisor, Cliente
- [ ] **Aprobación de oportunidades**: El cliente valida antes de implementar
- [ ] **Firmas digitales**: Registro de quién aprobó qué
- [ ] **Comentarios y rechazos**: Flujo de revisión

### 2.6 Exportación Profesional
**Prioridad: ALTA**

- [ ] **Informe PDF con gráficos**
- [ ] **Presentación PowerPoint automática**
- [ ] **Excel con detalle de líneas de factura**
- [ ] **Anexos de contratos con resaltado de cláusulas críticas**

### 2.7 Integración con Proveedor
**Prioridad: MEDIA**

- [ ] **Portal del proveedor**: Que puedan ver sus contratos/facturas
- [ ] **Solicitud de oferta automatizada**: Generar RFQ desde oportunidades
- [ ] **Comparador de ofertas**: Evaluar propuestas recibidas

---

## 3. FUNCIONALIDADES QUE SOBRAN O GENERAN CONFUSIÓN

### 3.1 Duplicación de Vistas
- **CostConsultingSuppliers.tsx** (página global) vs. **Tab Proveedores en CostConsultingDetail** - Solapamiento
- **CostConsultingBenchmarks.tsx** (placeholder) vs. **CostBenchmarksAdmin.tsx** (también placeholder)

### 3.2 Campos no utilizados en tipos
En `useCostConsultingData.ts`:
- `benchmark_comparison` en contratos - Rara vez tiene datos
- `prices` array en contratos - Estructura inconsistente
- `line_items` en facturas - El parsing es heurístico, no estructurado

### 3.3 Estados de proyecto redundantes
- `processing` y `analyzing` hacen lo mismo visualmente
- `extracting` vs `uploading` - Confusión en el timeline

### 3.4 Componentes de review duplicados
- `DocumentReviewTable.tsx` vs `ContractsReviewTable.tsx` + `InvoicesReviewTable.tsx`
- `ReviewSummaryCard.tsx` vs `ExtractionStatsCard.tsx` - Información similar

---

## 4. MEJORAS RECOMENDADAS (Roadmap)

### Fase 1: Corrección de Zombis (1-2 semanas)
| Acción | Impacto |
|--------|---------|
| Implementar handlers faltantes en Proveedores | Alto |
| Conectar botones de oportunidades a acciones reales | Alto |
| Persistir escenarios del simulador | Medio |
| Completar mapeo de campos de contratos | Medio |

### Fase 2: Benchmarks Funcional (2-3 semanas)
| Acción | Impacto |
|--------|---------|
| CRUD de categorías de benchmark | Crítico |
| Importación Excel con validación | Alto |
| UI de rangos P10-P25-P50-P75-P90 | Alto |
| Vinculación automática con contratos | Crítico |

### Fase 3: Tracking de Implementación (3-4 semanas)
| Acción | Impacto |
|--------|---------|
| Estados expandidos para oportunidades | Crítico |
| Campos de ahorro real vs. estimado | Crítico |
| Timeline de acciones por oportunidad | Alto |
| Dashboard de progreso global | Alto |

### Fase 4: Reporting Profesional (2-3 semanas)
| Acción | Impacto |
|--------|---------|
| Generación PDF con charts | Alto |
| Exportación PowerPoint | Medio |
| Excel detallado de facturas | Medio |
| Templates personalizables | Bajo |

---

## 5. MODELO DE DATOS SUGERIDO

### Nuevas Tablas Necesarias

```text
cost_opportunity_tracking
├── opportunity_id (FK)
├── status (identified|validated|negotiating|implementing|verified|rejected)
├── estimated_savings
├── actual_savings
├── target_date
├── implementation_date
├── assigned_to (user_id)
├── approved_by (user_id)
├── approved_at
└── notes (jsonb[])

cost_benchmarks
├── category_id
├── subcategory
├── region
├── sector
├── price_p10
├── price_p25
├── price_p50
├── price_p75
├── price_p90
├── unit
├── valid_from
├── valid_to
└── source

cost_project_timeline
├── project_id (FK)
├── event_type (contract_renewal|savings_verified|document_added|...)
├── event_date
├── description
└── metadata (jsonb)
```

---

## 6. RESUMEN DE PRIORIDADES

| Prioridad | Descripción | Esfuerzo |
|-----------|-------------|----------|
| P0 | Benchmarks funcional (sin esto el análisis pierde valor) | 2-3 sem |
| P0 | Tracking de implementación de oportunidades | 3-4 sem |
| P1 | Corregir botones zombi existentes | 1-2 sem |
| P1 | Dashboard temporal de ahorro | 2 sem |
| P2 | Exportación PDF profesional | 2 sem |
| P2 | Comparativa multi-proyecto | 3 sem |
| P3 | Workflow de aprobación | 4 sem |
| P3 | Portal de proveedor | 6+ sem |

---

## 7. CONCLUSIÓN

El módulo tiene una arquitectura sólida para la **fase de extracción y revisión**, pero carece de herramientas para la **fase post-análisis** que es donde un consultor senior genera valor real:

1. **Antes** (bien cubierto): Subir docs → Extraer → Revisar → Analizar
2. **Después** (muy débil): Trackear → Implementar → Verificar → Reportar

**Recomendación**: Priorizar la funcionalidad de benchmarks y el tracking de implementación antes de añadir nuevas funcionalidades de análisis.
