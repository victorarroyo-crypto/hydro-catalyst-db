

# Plan: Asegurar que TODOS los procesos de extraccion y analisis esten correctamente scoped al contrato activo

## Problema identificado

Aunque los endpoints de extraccion y analisis ya envian `audit_id` correctamente, el **polling posterior** sigue siendo global:

1. **`startInvoicePolling` en ChemContratos.tsx (linea 219)**: Hace fetch de TODAS las facturas del proyecto (`/projects/${projectId}/invoices`), no solo las del contrato. El conteo inicial y la comparacion para detectar "completado" usan datos globales, lo que provoca:
   - Senales falsas de "completado" si otro contrato tiene facturas procesandose
   - Conteos incorrectos en el toast de finalizacion

2. **`startPolling` (contratos)**: Este SI esta scoped correctamente al `auditId` via metadata del processTracker. No requiere cambios.

3. **`processTracker` para facturas**: Almacena solo `projectId` como `entityId`, sin `auditId`. Si hay dos contratos procesando facturas simultaneamente, colisionan.

## Cambios propuestos

### 1. Archivo: `src/pages/chemicals/ChemContratos.tsx`

**`startInvoicePolling`** - Scope el polling al contrato activo:

- Cambiar el entity ID del processTracker de `projectId` a `${projectId}:${selectedAudit}` para evitar colisiones entre contratos
- Almacenar `auditId` en metadata del processTracker
- En el polling, filtrar las facturas consultadas contra los `document_id` del contrato actual (ya disponibles en la query `documents`), en lugar de consultar todas las facturas del proyecto
- Alternativa mas simple: en vez de contar todas las facturas, invalidar queries y verificar si los documentos de factura del contrato actual cambiaron su `estado_extraccion`

Implementacion concreta:
```text
startInvoicePolling():
  1. processTracker.start('chem-invoice-extraction', `${projectId}:${selectedAudit}`, ...)
  2. En el setInterval, en vez de fetch global de invoices:
     - Consultar chem_contract_documents del audit actual
     - Verificar si los docs tipo factura pasaron a estado 'completado'
     - Si todos completaron -> parar polling y notificar
```

### 2. Archivo: `src/pages/chemicals/ChemContratos.tsx`

**Auto-resume polling en mount** (lineas 194-208):
- Ajustar la busqueda del processTracker para usar la clave compuesta `${projectId}:${auditId}` en lugar de solo `projectId`
- Solo reanudar el polling si el `selectedAudit` coincide con el que inicio el proceso

### 3. Archivo: `src/components/chemicals/invoices/useChemInvoices.ts`

**Revisar consistencia del hook**:
- Ya esta correcto: `analyzeInvoicesMutation` y `autoLinkMutation` pasan `auditId` cuando esta disponible
- No requiere cambios adicionales

## Resumen de impacto

| Componente | Estado actual | Accion |
|---|---|---|
| `handleExtractContracts` | Scoped con `audit_id` | Sin cambios |
| `handleExtractInvoices` | Scoped con `audit_id` | Sin cambios |
| `handleExtractSingleDoc` | Scoped por `document_id` | Sin cambios |
| `analyzeInvoicesMutation` | Scoped con `audit_id` | Sin cambios |
| `autoLinkMutation` | Scoped con `audit_id` | Sin cambios |
| **`startInvoicePolling`** | **GLOBAL - BUG** | **Scopear al audit** |
| **processTracker invoice** | **Colisiona entre audits** | **Clave compuesta** |
| **Auto-resume mount** | **No verifica audit** | **Verificar audit** |

## Archivos a modificar

- `src/pages/chemicals/ChemContratos.tsx` — refactorizar `startInvoicePolling` y auto-resume
