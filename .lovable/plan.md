

# Plan: Migrar hooks de Cost Consulting para usar API de Railway

## Problema Identificado

El frontend usa queries directos a `externalSupabase` para obtener contratos y facturas, pero estos devuelven arrays vacíos. Sin embargo, los endpoints de la API de Railway (`GET /api/cost-consulting/projects/{id}/contracts`) devuelven los 9 contratos correctamente.

Esto indica un problema de acceso a la base de datos externa que solo afecta al cliente frontend (posiblemente RLS, permisos de schema, o configuración del service_role key).

## Solución

Cambiar los hooks para usar los endpoints de la API de Railway en lugar de queries directos.

## Archivos a Modificar

### 1. `src/services/costConsultingApi.ts`

Añadir funciones GET para contratos y facturas:

```typescript
// CONTRACTS - GET
export const getContracts = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/contracts`
  );
  if (!response.ok) throw new Error('Error fetching contracts');
  return response.json();
};

// INVOICES - GET
export const getInvoices = async (projectId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/invoices`
  );
  if (!response.ok) throw new Error('Error fetching invoices');
  return response.json();
};
```

### 2. `src/hooks/useCostConsultingData.ts`

Modificar `useCostContracts` y `useCostInvoices` para usar la API:

```typescript
import { getContracts, getInvoices } from '@/services/costConsultingApi';

export const useCostContracts = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostContracts] Fetching via API for projectId:', projectId);
      const data = await getContracts(projectId);
      console.log('[useCostContracts] API response:', data);
      
      return (data || []) as CostContract[];
    },
    enabled: !!projectId,
  });
};

export const useCostInvoices = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-invoices', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostInvoices] Fetching via API for projectId:', projectId);
      const data = await getInvoices(projectId);
      console.log('[useCostInvoices] API response:', data);
      
      return (data || []) as CostInvoice[];
    },
    enabled: !!projectId,
  });
};
```

## Beneficios

1. **Consistencia**: Usa la misma fuente de datos que ya funciona (API Railway)
2. **Simplificación**: Elimina dependencia de queries directos a BD externa
3. **Mantenibilidad**: Centraliza todas las operaciones de cost-consulting en un solo servicio

## Consideración Futura

Una vez que esto funcione, se podría investigar por qué los queries directos a `externalSupabase` no funcionan, para optimizar y reducir latencia si es necesario.

