
# Plan: Corregir la detección de documentos pendientes y proyectos fallidos

## Problema Identificado

La alerta amarilla y el botón "Re-extraer documentos" no aparecen porque:

1. **Todos los documentos tienen `extraction_status: "completed"`** - La extracción de texto/embeddings funcionó correctamente para cada documento individual.

2. **Pero el proyecto tiene `status: "failed"`** con el error "Pipeline timeout después de 600s" - El proceso de extracción de entidades (contratos/facturas) falló a nivel de proyecto, no de documento.

3. **La lógica actual solo verifica documentos pendientes/fallidos**, pero no considera el estado del proyecto. Cuando el proyecto está en estado `failed` después del timeout, los documentos ya están procesados pero las entidades (contratos/facturas) no fueron creadas.

## Solución

Ampliar la lógica de `hasPendingDocuments` para que también considere:
- Estado `failed` del proyecto (especialmente con `current_phase: "extraction_error"`)
- Documentos con `completed` pero sin entidades extraídas asociadas

## Cambios Técnicos

### 1. Modificar la lógica en `CostConsultingDetail.tsx`

Actualmente:
```typescript
const hasPendingDocuments = documentStats.pending > 0 || documentStats.failed > 0;
```

Nueva lógica:
```typescript
// Mostrar alerta si:
// 1. Hay documentos pendientes o fallidos
// 2. O el proyecto falló durante extracción (documentos OK pero entidades no extraídas)
const hasExtractionIssues = 
  documentStats.pending > 0 || 
  documentStats.failed > 0 || 
  (project?.status === 'failed' && project?.current_phase === 'extraction_error');
```

### 2. Mejorar el mensaje de la alerta

Cuando el proyecto falló pero los documentos están "completed":
```
"La extracción de datos falló debido a un timeout. 
Los documentos están procesados pero no se generaron contratos/facturas.
Ejecuta "Re-extraer documentos" para reintentar."
```

### 3. Corregir el error 400 en `DocumentsManagementCard`

Persiste un error porque intenta seleccionar `status` en lugar de `extraction_status`. Corregir la consulta.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/cost-consulting/CostConsultingDetail.tsx` | Ampliar lógica `hasExtractionIssues` para incluir proyecto `failed` con `extraction_error` |
| `src/components/cost-consulting/DocumentsManagementCard.tsx` | Corregir consulta que usa `status` → `extraction_status` |

## Resultado Esperado

Después de la corrección:
- Cuando el proyecto tiene `status: failed` y `current_phase: extraction_error`, se mostrará:
  - Alerta amarilla explicando que la extracción de datos falló
  - Botón "Re-extraer documentos" visible
- El usuario puede pulsar el botón para reintentar el proceso completo
