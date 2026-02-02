
# Plan: Añadir Botón "Re-extraer" para Documentos

## Resumen

Añadir una nueva funcionalidad que permite volver a ejecutar la extracción LLM de contratos/facturas desde un documento cuando la extracción inicial falló o produjo resultados incorrectos. Este es un endpoint **diferente** al "Reprocesar" existente.

## Diferencia entre los dos endpoints

| Acción | Endpoint | Qué hace |
|--------|----------|----------|
| **Reprocesar** (existente) | `POST /documents/{id}/reprocess` | Solo regenera embeddings para búsqueda semántica |
| **Re-extraer** (nuevo) | `POST /documents/{id}/re-extract` | Vuelve a ejecutar el pipeline LLM para extraer contratos/facturas |

## Cambios Requeridos

### 1. Añadir función `reExtractDocument` en el servicio API

**Archivo:** `src/services/costConsultingApi.ts`

Añadir nueva función después de `reprocessDocument`:

```typescript
/**
 * Re-extract data (contracts/invoices) from a document using LLM pipeline.
 * Unlike reprocess (which only regenerates embeddings), this re-runs the full extraction.
 * Returns info about deleted records before re-extraction.
 */
export const reExtractDocument = async (projectId: string, documentId: string) => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/documents/${documentId}/re-extract`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error re-extracting document' }));
    throw new Error(error.detail || 'Error re-extracting document');
  }
  return response.json();
};
```

### 2. Actualizar componente `PendingDocumentsList`

**Archivo:** `src/components/cost-consulting/PendingDocumentsList.tsx`

#### 2.1 Importar la nueva función
```typescript
import { 
  getProjectDocuments, 
  deleteDocument, 
  reprocessDocument,
  reExtractDocument,  // Nueva importación
  ProjectDocument 
} from '@/services/costConsultingApi';
```

#### 2.2 Añadir estado para re-extracción
```typescript
const [reExtractingId, setReExtractingId] = useState<string | null>(null);
```

#### 2.3 Añadir función `handleReExtract`
```typescript
const handleReExtract = async (doc: ProjectDocument) => {
  setReExtractingId(doc.id);
  try {
    const result = await reExtractDocument(projectId, doc.id);
    
    // Mostrar información sobre registros borrados
    const deletedInfo = [];
    if (result.deleted_contracts > 0) {
      deletedInfo.push(`${result.deleted_contracts} contratos`);
    }
    if (result.deleted_invoices > 0) {
      deletedInfo.push(`${result.deleted_invoices} facturas`);
    }
    
    const deletedMsg = deletedInfo.length > 0 
      ? ` (eliminados: ${deletedInfo.join(', ')})` 
      : '';
    
    toast.success(`Re-extracción iniciada para "${doc.filename}"${deletedMsg}`);
    
    queryClient.invalidateQueries({ queryKey: ['project-documents-list', projectId] });
    queryClient.invalidateQueries({ queryKey: ['cost-contracts', projectId] });
    queryClient.invalidateQueries({ queryKey: ['cost-invoices', projectId] });
  } catch (error) {
    console.error('Error re-extracting document:', error);
    toast.error(error instanceof Error ? error.message : 'Error al re-extraer el documento');
  } finally {
    setReExtractingId(null);
  }
};
```

#### 2.4 Añadir botón "Re-extraer" en la columna de acciones

El botón aparece para documentos con `extraction_status === 'failed'` o `'completed'`:

```tsx
{/* Re-extract button - for failed or completed (to retry if data is wrong) */}
{(doc.extraction_status === 'failed' || doc.extraction_status === 'completed') && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-orange-600"
          onClick={() => handleReExtract(doc)}
          disabled={reExtractingId === doc.id}
        >
          {reExtractingId === doc.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {doc.extraction_status === 'failed' 
          ? 'Re-extraer datos (pipeline LLM)' 
          : 'Re-extraer (corregir datos)'
        }
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

### 3. Diferenciación visual de botones

Para evitar confusión entre los dos botones, usaremos:

| Botón | Color | Cuándo aparece | Tooltip |
|-------|-------|----------------|---------|
| Reprocesar | Azul/Primary | `pending` o `failed` | "Reprocesar embeddings" |
| Re-extraer | Naranja | `failed` o `completed` | "Re-extraer datos (pipeline LLM)" |

### 4. Actualizar mensaje de advertencia

Cambiar el texto en el warning box para reflejar la nueva acción:

```tsx
<p className="mt-1 text-xs opacity-80">
  Usa "Re-extraer" para volver a procesar documentos con error.
</p>
```

## Flujo Visual

```
Estado: failed
├── Botón "Reprocesar" → Solo regenera embeddings
└── Botón "Re-extraer" → Re-ejecuta extracción LLM ← NUEVO

Estado: completed
└── Botón "Re-extraer" → Re-ejecuta si los datos son incorrectos ← NUEVO

Estado: pending
└── Botón "Reprocesar" → Regenera embeddings
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/services/costConsultingApi.ts` | Añadir función `reExtractDocument` |
| `src/components/cost-consulting/PendingDocumentsList.tsx` | Añadir botón, estado y handler |

## Respuesta Esperada del Endpoint

```json
{
  "message": "Re-extracción iniciada para 'factura.pdf'",
  "document_id": "uuid",
  "deleted_contracts": 0,
  "deleted_invoices": 3
}
```

Esta información se mostrará en el toast para que el usuario sepa qué registros se borraron antes de la re-extracción.
