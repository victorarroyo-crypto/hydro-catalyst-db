
# Plan: Corregir Mapeo de Campo extraction_status

## Problema Identificado

La API Railway devuelve el campo como **`extraction_status`**, pero el frontend usa **`processing_status`**:

**Respuesta API:**
```json
{
  "id": "805581af-...",
  "filename": "FKE-2024-0024_Kemira_Dec2024_Q2.pdf",
  "extraction_status": "completed",  // <-- Campo real
  ...
}
```

**Tipo TypeScript actual:**
```typescript
interface ProjectDocument {
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';  // <-- Nombre incorrecto
}
```

Esto causa que:
1. `doc.processing_status` sea siempre `undefined`
2. La condición `doc.processing_status === 'pending'` nunca sea verdadera
3. El botón de reprocesar nunca aparezca

## Solución

### 1. Actualizar Interface ProjectDocument

**Archivo:** `src/services/costConsultingApi.ts`

Cambiar el nombre del campo para que coincida con la API:

```typescript
export interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  file_url?: string;
  file_type?: string;  // También cambiar document_type -> file_type
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';  // Renombrado
  extracted_data?: any;
  extraction_error?: string;  // También existe en API
  chunk_count?: number;
  file_size?: number;
  mime_type?: string;
  uploaded_at?: string;  // API usa uploaded_at, no created_at
  processed_at?: string;
}
```

### 2. Actualizar PendingDocumentsList Component

**Archivo:** `src/components/cost-consulting/PendingDocumentsList.tsx`

Cambiar todas las referencias de `processing_status` a `extraction_status`:

- Línea 89: `doc.processing_status` → `doc.extraction_status`
- Línea 110-113: Calcular stats con `extraction_status`
- Línea 251: `getStatusConfig(doc.extraction_status)`
- Línea 305: Condición del botón reprocesar: `doc.extraction_status === 'failed' || doc.extraction_status === 'pending'`

También cambiar:
- `document_type` → `file_type`
- `processing_error` → `extraction_error`

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/services/costConsultingApi.ts` | Corregir nombres de campos en `ProjectDocument` |
| `src/components/cost-consulting/PendingDocumentsList.tsx` | Usar nombres correctos de campos |

## Resultado Esperado

Después del fix:
- Los badges de estado mostrarán correctamente "Procesado" (no "Pendiente")
- El botón de reprocesar aparecerá para documentos con `extraction_status: 'failed'` o `'pending'`
- Las estadísticas del resumen serán correctas

## Nota Adicional

Según los datos de la API que vi, todos tus documentos actuales ya tienen `extraction_status: "completed"`, por eso no verías el botón de reprocesar para ellos (es el comportamiento correcto). La UI muestra "Pendiente" incorrectamente porque el campo undefined cae al case default.
