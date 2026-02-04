
# Plan: Agregar enlace para ver PDF/Excel en la página de Facturas y Contratos

## Problema Identificado

La página de análisis de facturas (`/cost-consulting/{id}/invoices`) no muestra el botón para ver/descargar el PDF original de cada factura. Esto ocurre porque:

1. **Página de Revisión** (`CostConsultingDetail.tsx`): Usa el hook `useInvoicesWithDocuments()` que enriquece cada factura con `cost_project_documents.file_url`
2. **Página de Análisis** (`CostConsultingInvoices.tsx`): Usa el hook `useCostInvoices()` directamente, **sin** acceso a las URLs de documentos

## Solución Propuesta

### Cambio 1: Actualizar `CostConsultingInvoices.tsx`

Reemplazar el hook `useCostInvoices()` por `useInvoicesWithDocuments()` para tener acceso a la URL del documento PDF.

```typescript
// Antes
import { useCostInvoices, useCostContracts, ... } from '@/hooks/useCostConsultingData';
const { data: rawInvoices = [], isLoading, refetch } = useCostInvoices(id);

// Después
import { useInvoicesWithDocuments, EnrichedInvoice } from '@/hooks/useCostEntitiesWithDocuments';
import { useCostContracts, ... } from '@/hooks/useCostConsultingData';
const { data: rawInvoices = [], isLoading, refetch } = useInvoicesWithDocuments(id);
```

### Cambio 2: Agregar columna "Documento" a la tabla de facturas

Añadir una columna con un botón para descargar/ver el PDF:

```typescript
// En la tabla de facturas
<TableHead>PDF</TableHead>

// En cada fila
<TableCell>
  {invoice.cost_project_documents?.file_url && (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        openDocumentUrl(invoice.cost_project_documents?.file_url);
      }}
    >
      <FileDown className="h-4 w-4" />
    </Button>
  )}
</TableCell>
```

### Cambio 3: Actualizar el tipo DisplayInvoice

Extender la interfaz para incluir la información del documento:

```typescript
interface DisplayInvoice {
  // ... campos existentes
  documentUrl?: string | null;
  documentFilename?: string;
}
```

### Cambio 4: Agregar link en el panel de detalle (Sheet)

En el panel lateral que muestra el detalle de la factura, agregar un botón prominente para ver el documento original:

```typescript
{selectedInvoice.documentUrl && (
  <Button 
    onClick={() => openDocumentUrl(selectedInvoice.documentUrl)}
    className="w-full"
  >
    <FileDown className="h-4 w-4 mr-2" />
    Ver documento original
  </Button>
)}
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/cost-consulting/CostConsultingInvoices.tsx` | Cambiar hook, agregar columna PDF, actualizar tipos, agregar botón en Sheet |

## Beneficios

- Trazabilidad completa: cada factura muestra el documento original del que se extrajo
- Verificación fácil: el usuario puede comparar los datos extraídos con el PDF original
- Consistencia: mismo comportamiento que en la página de revisión

## Notas Técnicas

- El hook `useInvoicesWithDocuments` ya existe y hace un JOIN entre facturas y documentos usando `document_id`
- La función `openDocumentUrl` ya maneja la conversión de URLs `storage://` a URLs públicas de Supabase Storage
- Soporte para PDFs y Excels (el helper es agnóstico al tipo de archivo)
