
# Plan: Espera Activa con Polling en Modal de Reclasificación

## Objetivo

Mantener el modal abierto mientras se extrae el documento, mostrando feedback visual al usuario y esperando hasta que la entidad (contrato/factura) esté creada.

## Cambios a Implementar

### 1. Archivo: `src/services/costConsultingApi.ts`

Añadir función para obtener el estado de un documento específico:

```typescript
export const getDocumentById = async (
  projectId: string, 
  documentId: string
): Promise<ProjectDocument> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${documentId}`
  );
  if (!response.ok) throw new Error('Error fetching document');
  return response.json();
};
```

### 2. Archivo: `src/components/cost-consulting/DocumentReclassifyModal.tsx`

**Cambios principales:**

1. Nuevo estado para tracking del proceso:
   - `processingState`: `'idle' | 'reclassifying' | 'extracting' | 'done' | 'error'`

2. Modificar `handleReclassify`:
   - Fase 1: Llamar al endpoint `/reclassify` → estado `'reclassifying'`
   - Fase 2: Polling cada 1.5s hasta 60 segundos → estado `'extracting'`
   - Fase 3: Detectar `completed` o `failed` → cerrar modal o mostrar error

3. Nueva UI durante extracción:
   - Ocultar botones de reclasificación
   - Mostrar indicador de progreso con mensaje informativo
   - Botón "Cancelar" cambia a "Cerrar" sin detener el proceso

4. Helper `sleep`:
   ```typescript
   const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
   ```

**Flujo visual del proceso:**

```text
┌──────────────────────────────────────────────┐
│  Reclasificar Documento                      │
├──────────────────────────────────────────────┤
│  📄 factura_001.pdf                          │
│  Tipo actual: No clasificado                 │
├──────────────────────────────────────────────┤
│  🔄 Extrayendo datos como factura...         │  ← Nuevo estado visual
│  Esto puede tardar unos segundos.            │
│  ████████░░░░░░░░░░░░  40%                   │
├──────────────────────────────────────────────┤
│                              [Cerrar]        │
└──────────────────────────────────────────────┘
```

## Lógica de Polling

```typescript
const handleReclassify = async (targetType: 'contract' | 'invoice') => {
  setProcessingState('reclassifying');
  
  // 1. Llamar endpoint de reclasificación
  const response = await fetch(`.../reclassify`, { 
    method: 'POST',
    body: JSON.stringify({ target_type: targetType })
  });
  
  if (!response.ok) { /* handle error */ }
  
  // 2. Polling hasta completar
  setProcessingState('extracting');
  toast.info(`Extrayendo datos como ${typeLabel}...`);
  
  const maxAttempts = 40; // 40 * 1.5s = 60 segundos
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(1500);
    
    const doc = await getDocumentById(projectId, document.id);
    
    if (doc.extraction_status === 'completed') {
      setProcessingState('done');
      toast.success(`Datos extraídos correctamente como ${typeLabel}`);
      onReclassified();
      onOpenChange(false);
      return;
    }
    
    if (doc.extraction_status === 'failed') {
      setProcessingState('error');
      toast.error(`Error: ${doc.extraction_error || 'Extracción fallida'}`);
      return;
    }
  }
  
  // 3. Timeout
  toast.warning('La extracción está tardando más de lo esperado');
  setProcessingState('idle');
};
```

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `src/services/costConsultingApi.ts` | Añadir `getDocumentById()` |
| `src/components/cost-consulting/DocumentReclassifyModal.tsx` | Implementar polling y UI de estados |

## Resultado

- El modal permanece abierto durante la extracción
- El usuario ve el progreso en tiempo real
- Solo se cierra cuando la entidad está creada
- La lista de facturas/contratos se actualiza automáticamente
