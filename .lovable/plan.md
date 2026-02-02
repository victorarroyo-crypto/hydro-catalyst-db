
# Plan: Mejorar Gestión de Documentos para Proyectos Grandes

## Problema Identificado

Cuando se suben documentos en múltiples bloques, no hay visibilidad de:
- Cuántos documentos están registrados en el sistema
- Cuáles están pendientes de extracción
- Si la extracción procesó todos o solo algunos

El backend Railway puede estar filtrando documentos (por status, por límites, etc.), pero el frontend no lo muestra.

## Solución Propuesta

### 1. Añadir Panel de Documentos Pendientes en Vista de Revisión

Mostrar siempre la lista de documentos registrados (tabla `cost_project_documents`) para que el usuario vea:
- Qué documentos están subidos
- Su estado de procesamiento (pending/processing/completed/failed)
- Posibilidad de eliminar antes de extraer

**Archivo:** `src/pages/cost-consulting/CostConsultingDetail.tsx`

Añadir sección colapsable "Documentos Subidos" que muestre:
- Listado de todos los documentos del proyecto
- Estado de cada uno (icono de color)
- Botón de eliminar individual
- Contador: "X de Y documentos procesados"

### 2. Mostrar DocumentsManagementCard en Estado Review (no solo Completed)

Actualmente `DocumentsManagementCard` solo se muestra en el tab "Documentos" cuando el proyecto está completado. Debería mostrarse también en `review` para dar visibilidad completa.

**Cambio:** Añadir la tarjeta de gestión de documentos en la vista de revisión, antes de las tablas de contratos/facturas.

### 3. Añadir Endpoint para Listar Documentos Pendientes

Verificar que existe `GET /api/cost-consulting/projects/{id}/documents` en Railway y usarlo para obtener la lista completa.

**Archivo:** `src/services/costConsultingApi.ts`

```typescript
export const getProjectDocuments = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents`
  );
  if (!response.ok) throw new Error('Error fetching documents');
  return response.json();
};
```

### 4. Crear Componente PendingDocumentsList

Nuevo componente ligero que muestre los documentos pendientes de forma compacta:

**Archivo:** `src/components/cost-consulting/PendingDocumentsList.tsx`

```typescript
// Componente que muestra:
// - Lista compacta de documentos con iconos de estado
// - Botón "Eliminar" por documento
// - Resumen: "12 documentos (8 procesados, 2 pendientes, 2 fallidos)"
```

### 5. Integrar en Flujo de Revisión

En `CostConsultingDetail.tsx`, cuando el estado es `review`:

```tsx
{isReview && (
  <div className="space-y-6">
    {/* Alert informativo existente */}
    
    {/* NUEVO: Lista de documentos subidos */}
    <PendingDocumentsList 
      projectId={project.id}
      onDocumentDeleted={() => queryClient.invalidateQueries(['cost-documents', id])}
    />
    
    {/* Botones de acción existentes */}
    {/* Tablas de contratos/facturas */}
  </div>
)}
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `costConsultingApi.ts` | Añadir `getProjectDocuments()` |
| `PendingDocumentsList.tsx` | Nuevo componente |
| `CostConsultingDetail.tsx` | Integrar lista en vista review |

## Beneficios

1. **Visibilidad total**: El usuario ve todos los documentos subidos, no solo los extraídos
2. **Diagnóstico fácil**: Si solo se procesaron 12 de 36, es visible inmediatamente
3. **Control granular**: Puede eliminar documentos problemáticos antes de re-extraer
4. **Mejor UX para proyectos grandes**: Sabe exactamente qué hay en el sistema

## Consideraciones Backend

Si el backend Railway tiene límites en la extracción, esto los haría visibles. El usuario podría:
- Subir en lotes más pequeños
- Identificar qué documentos no se procesaron
- Re-extraer selectivamente

## Alternativa: Subida por Lotes con Confirmación

Si el problema es que Railway no puede manejar muchos documentos a la vez, podríamos añadir:
- Subida en lotes de 10-15 documentos
- Esperar confirmación antes del siguiente lote
- Barra de progreso global

Esto sería un cambio mayor en `CostConsultingNew.tsx` y requiere más análisis del backend.
