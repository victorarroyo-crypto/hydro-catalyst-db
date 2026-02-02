

# Plan: Añadir logging de diagnóstico a hooks de Cost Consulting

## Objetivo
Diagnosticar por qué `useCostContracts` y `useCostInvoices` devuelven arrays vacíos cuando el backend tiene 9 contratos y 14 facturas.

## Cambios a Implementar

### Archivo: `src/hooks/useCostConsultingData.ts`

#### 1. Modificar `useCostContracts` (líneas 207-228)

Añadir logging detallado y probar query simplificado como fallback:

```typescript
export const useCostContracts = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-contracts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostContracts] Fetching for projectId:', projectId);
      
      // Primero intentar query con JOINs
      const { data, error } = await externalSupabase
        .from('cost_project_contracts')
        .select(`
          *,
          cost_suppliers(name, tax_id),
          cost_project_documents(id, filename, file_url, file_type)
        `)
        .eq('project_id', projectId)
        .order('total_annual_value', { ascending: false });
      
      console.log('[useCostContracts] Query result - data:', data, 'error:', error);
      
      // Si hay error o vacío, intentar query simplificado
      if (error || (data && data.length === 0)) {
        console.log('[useCostContracts] Trying simplified query without JOINs...');
        const { data: simpleData, error: simpleError } = await externalSupabase
          .from('cost_project_contracts')
          .select('*')
          .eq('project_id', projectId);
        
        console.log('[useCostContracts] Simplified query - data:', simpleData, 'error:', simpleError);
        
        if (simpleError) throw simpleError;
        if (simpleData && simpleData.length > 0) {
          console.log('[useCostContracts] JOINs are the problem! Found', simpleData.length, 'contracts');
          return simpleData as CostContract[];
        }
      }
      
      if (error) throw error;
      return (data || []) as CostContract[];
    },
    enabled: !!projectId,
  });
};
```

#### 2. Modificar `useCostInvoices` (líneas 234-255)

Mismo patrón de logging y fallback:

```typescript
export const useCostInvoices = (projectId?: string) => {
  return useQuery({
    queryKey: ['cost-invoices', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[useCostInvoices] Fetching for projectId:', projectId);
      
      // Primero intentar query con JOINs
      const { data, error } = await externalSupabase
        .from('cost_project_invoices')
        .select(`
          *,
          cost_suppliers(name),
          cost_project_documents(id, filename, file_url, file_type)
        `)
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      
      console.log('[useCostInvoices] Query result - data:', data, 'error:', error);
      
      // Si hay error o vacío, intentar query simplificado
      if (error || (data && data.length === 0)) {
        console.log('[useCostInvoices] Trying simplified query without JOINs...');
        const { data: simpleData, error: simpleError } = await externalSupabase
          .from('cost_project_invoices')
          .select('*')
          .eq('project_id', projectId);
        
        console.log('[useCostInvoices] Simplified query - data:', simpleData, 'error:', simpleError);
        
        if (simpleError) throw simpleError;
        if (simpleData && simpleData.length > 0) {
          console.log('[useCostInvoices] JOINs are the problem! Found', simpleData.length, 'invoices');
          return simpleData as CostInvoice[];
        }
      }
      
      if (error) throw error;
      return (data || []) as CostInvoice[];
    },
    enabled: !!projectId,
  });
};
```

## Resultado Esperado

Al abrir la consola del navegador veremos:

1. **Si el query con JOINs funciona**:
   - `[useCostContracts] Query result - data: [9 objects] error: null`

2. **Si los JOINs fallan pero el query simple funciona**:
   - `[useCostContracts] Query result - data: [] error: null`
   - `[useCostContracts] Trying simplified query without JOINs...`
   - `[useCostContracts] JOINs are the problem! Found 9 contracts`

3. **Si ambos queries fallan**:
   - Veremos el error específico de Supabase

## Notas Técnicas
- El fallback a query simplificado es temporal para diagnóstico
- Una vez identificado el problema, se puede implementar una solución definitiva (LEFT JOINs o eliminar relaciones)
- El `projectId` actualmente es: `1899a475-24fe-4625-b239-4787afb8cf20`

