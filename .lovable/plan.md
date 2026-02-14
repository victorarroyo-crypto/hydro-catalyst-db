

# Fix: Resumen de facturas muestra datos de TODOS los contratos

## Problema

En `useChemInvoices.ts`, el endpoint de resumen (`/invoice-summary`) se llama sin `audit_id`, por lo que devuelve KPIs globales del proyecto (gasto total, alertas, baselines) en vez de solo los del contrato seleccionado.

Las facturas y alertas SI se filtran client-side via `auditDocIds`, pero el resumen se muestra tal cual del backend.

## Solucion

### Archivo: `src/components/chemicals/invoices/useChemInvoices.ts`

**1. Summary query - pasar `audit_id`** (lineas 37-46):
- Incluir `audit_id` en la query key para que React Query cache por contrato
- Pasar `?audit_id=` como query param al endpoint
- Asi el backend calculara el resumen solo con las facturas de ese contrato

```
Antes:  GET /projects/{id}/invoice-summary
Despues: GET /projects/{id}/invoice-summary?audit_id={auditId}
```

**2. Invoices query - pasar `audit_id`** (lineas 13-22):
- Pasar `?audit_id=` para que el backend solo devuelva facturas del contrato
- Incluir `auditId` en la query key
- Esto elimina la necesidad de filtrar client-side (mas eficiente)

**3. Alerts query - pasar `audit_id`** (lineas 25-34):
- Pasar `?audit_id=` para filtrar alertas en backend
- Incluir `auditId` en la query key

**4. Simplificar filtrado client-side** (lineas 249-258):
- Si el backend ya filtra, el filtrado por `auditDocIds` sigue como safety net pero ya no seria necesario como unica capa

## Seccion tecnica

Cambios concretos en `useChemInvoices.ts`:

```text
// Summary (linea 37-46)
queryKey: ['chem-invoice-summary', projectId, auditId]   // <-- add auditId
const params = auditId ? `?audit_id=${auditId}` : '';
fetch(`.../${projectId}/invoice-summary${params}`)

// Invoices (linea 13-22)  
queryKey: ['chem-invoices', projectId, auditId]           // <-- add auditId
const params = auditId ? `?audit_id=${auditId}` : '';
fetch(`.../${projectId}/invoices${params}`)

// Alerts (linea 25-34)
queryKey: ['chem-invoice-alerts', projectId, auditId]     // <-- add auditId
const params = auditId ? `?audit_id=${auditId}` : '';
fetch(`.../${projectId}/invoice-alerts${params}`)
```

Tambien actualizar las `invalidateQueries` calls (lineas 60-61, 97-98, 125-126, 184-185, 242-243, 279-281) para incluir `auditId` en las query keys.

## Archivos a modificar

- `src/components/chemicals/invoices/useChemInvoices.ts` -- pasar `audit_id` a los 3 endpoints GET y actualizar query keys
