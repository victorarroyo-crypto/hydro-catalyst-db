

# Plan: Añadir URLs de documentos PDF a las facturas y contratos

## Problema Identificado

El botón de descarga de PDF ya existe en las tablas `InvoicesReviewTable` y `ContractsReviewTable` (líneas 182-196), pero está oculto porque la condición `invoice.cost_project_documents?.file_url` es `undefined`.

**Causa raíz**: La API de Railway (`GET /api/cost-consulting/projects/{id}/invoices`) no incluye la relación `cost_project_documents` con el `file_url` del documento PDF original.

## Solución

Hay dos opciones para resolver esto:

### Opción A: Modificar el backend de Railway (recomendado)
El endpoint de Railway debería incluir un JOIN a `cost_project_documents` y devolver:
```json
{
  "invoices": [
    {
      "id": "...",
      "invoice_number": "...",
      ...
      "cost_project_documents": {
        "file_url": "https://storage.supabase.co/...",
        "filename": "factura_001.pdf"
      }
    }
  ]
}
```

### Opción B: Enriquecer datos en el frontend (workaround temporal)
Si no puedes modificar Railway inmediatamente, podemos:

1. **Consultar documentos por separado**: Añadir una query paralela que obtenga los documentos del proyecto
2. **Mapear file_url a cada factura/contrato**: Usar el `document_id` de cada factura para encontrar su `file_url` correspondiente

## Implementación Propuesta (Opción B - Frontend)

### Archivo: `src/hooks/useCostConsultingData.ts`

Modificar los hooks `useCostContracts` y `useCostInvoices` para enriquecer los datos con la información del documento:

```typescript
export const useCostContracts = (projectId?: string) => {
  // Query para obtener documentos del proyecto
  const { data: documents } = useCostDocuments(projectId);
  
  return useQuery({
    queryKey: ['cost-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await getContracts(projectId);
      const contracts = response?.contracts || [];
      
      // Enriquecer con file_url del documento
      return contracts.map((contract: CostContract) => ({
        ...contract,
        cost_project_documents: contract.document_id 
          ? documents?.find(d => d.id === contract.document_id)
          : null
      }));
    },
    enabled: !!projectId && !!documents,
  });
};
```

### Problema potencial
El hook `useCostDocuments` ya existe pero también usa `externalSupabase`, que tiene los mismos problemas de acceso. Necesitaríamos:
1. Verificar que `useCostDocuments` funciona correctamente
2. O crear un endpoint en Railway para obtener documentos

## Verificación Necesaria

Antes de implementar, necesito confirmar:

1. **¿El endpoint de Railway puede modificarse?** Si es así, la Opción A es mejor.
2. **¿Qué estructura exacta devuelve la API?** Necesitamos ver si ya incluye `document_id` o algún campo similar.
3. **¿Los documentos se almacenan en Supabase Storage?** Para confirmar que `file_url` apunta a URLs accesibles.

## Recomendación

**Solicitar al equipo de Railway** que modifique los endpoints `/contracts` y `/invoices` para incluir la relación `cost_project_documents` con `file_url` y `filename`. Esto es más eficiente que hacer queries adicionales desde el frontend.

Si no es posible modificar Railway a corto plazo, puedo implementar la Opción B como workaround temporal.

