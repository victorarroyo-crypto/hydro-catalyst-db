

# Simplificar Rechazo: Solo Borrar, Sin Guardar

## Cambio

Modificar el hook `useMoveToRejected` en `src/hooks/useScoutingData.ts` para que al rechazar una tecnologia de la cola de scouting, simplemente se borre el registro de `scouting_queue` sin insertar nada en `rejected_technologies`.

## Detalle Tecnico

### Archivo: `src/hooks/useScoutingData.ts` (lineas ~295-370)

Simplificar la funcion `mutationFn` del hook `useMoveToRejected`:

- **Eliminar** el paso 1 (fetch del registro completo) - ya no se necesita copiar datos
- **Eliminar** el paso 2 (insert en `rejected_technologies`) - no se guarda informacion
- **Mantener** solo el paso 3 (delete de `scouting_queue`)

La funcion quedaria asi:

```typescript
mutationFn: async ({ scoutingId }: { 
  scoutingId: string; 
  rejectionReason: string; 
  rejectedBy?: string; 
  rejectionStage: 'analyst' | 'supervisor' | 'admin';
}) => {
  const { error: deleteError } = await externalSupabase
    .from('scouting_queue')
    .delete()
    .eq('id', scoutingId);
  
  if (deleteError) throw new Error(`Error al eliminar: ${deleteError.message}`);
  
  return { success: true };
},
```

Los parametros `rejectionReason`, `rejectedBy` y `rejectionStage` se mantienen en la firma para no romper las llamadas existentes desde `Scouting.tsx`, pero simplemente se ignoran.

## Resumen

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useScoutingData.ts` | Simplificar `useMoveToRejected` para solo hacer DELETE |

