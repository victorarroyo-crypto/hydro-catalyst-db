
# Plan: Almacenar PDFs en Supabase Storage y permitir descarga

## Resumen

Actualmente los documentos PDF se suben a través de una Edge Function que los reenvía directamente a Railway. El campo `file_url` en la base de datos queda vacío o apunta a un storage de Railway no accesible desde el frontend.

Este plan implementa:
1. Almacenamiento de los PDFs en Supabase Storage (Lovable Cloud)
2. Guardado de la URL pública en el campo `file_url`
3. Botón de descarga en los modales de contrato/factura

---

## Flujo Actual vs Propuesto

```text
ACTUAL:
Usuario → Edge Function → Railway (almacena PDF) → file_url vacío/inaccesible

PROPUESTO:
Usuario → Edge Function → [1. Guarda en Storage] → Railway (procesa)
                             ↓
                      file_url = URL pública de Storage
```

---

## Cambios Requeridos

### 1. Crear bucket `cost-documents` en Storage

**Archivo:** Nueva migración SQL

```sql
-- Crear bucket público para documentos de cost consulting
INSERT INTO storage.buckets (id, name, public)
VALUES ('cost-documents', 'cost-documents', true);

-- Política: Usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload cost documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cost-documents');

-- Política: Lectura pública (para descargar desde modales)
CREATE POLICY "Public can read cost documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cost-documents');

-- Política: Usuarios autenticados pueden borrar sus documentos
CREATE POLICY "Authenticated users can delete cost documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cost-documents');
```

### 2. Modificar Edge Function `cost-consulting-upload`

**Archivo:** `supabase/functions/cost-consulting-upload/index.ts`

**Cambios:**
1. Antes de reenviar a Railway, subir el archivo a Storage
2. Generar la URL pública
3. Incluir la URL en el FormData que se envía a Railway

```typescript
// NUEVO: Subir a Storage antes de enviar a Railway
const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const storagePath = `${projectId}/${Date.now()}_${sanitizedFilename}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('cost-documents')
  .upload(storagePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  });

if (uploadError) {
  console.error('Storage upload error:', uploadError);
  // Continuar sin URL si falla el storage
}

// Obtener URL pública
let fileUrl: string | null = null;
if (uploadData?.path) {
  const { data: urlData } = supabase.storage
    .from('cost-documents')
    .getPublicUrl(uploadData.path);
  fileUrl = urlData.publicUrl;
}

// Añadir URL al FormData para Railway
const railwayFormData = new FormData();
railwayFormData.append('file', file);
railwayFormData.append('file_type', fileType || 'otro');
if (fileUrl) {
  railwayFormData.append('file_url', fileUrl);  // NUEVO
}
```

### 3. Añadir botón de descarga a `ContractFormModal`

**Archivo:** `src/components/cost-consulting/ContractFormModal.tsx`

**Cambios:**
- Añadir prop para el documento asociado
- Mostrar botón de descarga si existe `file_url`

```tsx
// En el header del modal, después del título
{contract?.cost_project_documents?.file_url && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => window.open(contract.cost_project_documents.file_url, '_blank')}
  >
    <Download className="h-4 w-4 mr-2" />
    Ver PDF Original
  </Button>
)}
```

### 4. Añadir botón de descarga a `InvoiceFormModal`

**Archivo:** `src/components/cost-consulting/InvoiceFormModal.tsx`

**Cambios similares:**

```tsx
// En el header del modal
{invoice?.cost_project_documents?.file_url && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => window.open(invoice.cost_project_documents.file_url, '_blank')}
  >
    <Download className="h-4 w-4 mr-2" />
    Ver PDF Original
  </Button>
)}
```

### 5. Actualizar tipos para incluir documento

**Archivo:** `src/hooks/useCostConsultingData.ts`

Los tipos ya tienen `cost_project_documents?: CostDocument | null` pero necesitamos asegurar que incluyan `file_url`:

```typescript
export interface CostDocument {
  id: string;
  // ... otros campos
  file_url: string | null;  // Ya existe
}
```

### 6. Añadir botón de descarga a las tablas de revisión

**Archivos:** 
- `src/components/cost-consulting/review/ContractsReviewTable.tsx`
- `src/components/cost-consulting/review/InvoicesReviewTable.tsx`

Añadir nueva columna o botón para descargar PDF directamente desde la tabla:

```tsx
// Nueva prop en ContractForReview
interface ContractForReview {
  // ... campos existentes
  cost_project_documents?: {
    file_url?: string;
    filename?: string;
  };
}

// En la columna de acciones, añadir:
{contract.cost_project_documents?.file_url && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          window.open(contract.cost_project_documents.file_url, '_blank');
        }}
      >
        <FileDown className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Descargar PDF</TooltipContent>
  </Tooltip>
)}
```

---

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| Nueva migración SQL | Crear bucket y políticas RLS |
| `supabase/functions/cost-consulting-upload/index.ts` | Guardar PDF en Storage |
| `src/components/cost-consulting/ContractFormModal.tsx` | Añadir botón descarga |
| `src/components/cost-consulting/InvoiceFormModal.tsx` | Añadir botón descarga |
| `src/components/cost-consulting/review/ContractsReviewTable.tsx` | Añadir botón descarga |
| `src/components/cost-consulting/review/InvoicesReviewTable.tsx` | Añadir botón descarga |

---

## Consideraciones Técnicas

### Compatibilidad hacia atrás
- Los documentos ya subidos no tendrán `file_url` - el botón simplemente no aparecerá
- Los nuevos documentos tendrán la URL guardada

### Backend Railway
- El backend necesita aceptar el nuevo campo `file_url` en el FormData
- Debe guardar esta URL en la columna `file_url` de `cost_project_documents`
- **Si el backend no soporta esto**, se necesitará modificar el endpoint en Railway

### Tamaño de archivos
- Supabase Storage tiene límite de 50MB por archivo (suficiente para PDFs)
- El bucket será público para lectura (las URLs funcionarán sin autenticación)

### Limpieza de archivos
- Cuando se elimine un documento de la BD, habría que borrar también el archivo de Storage
- Esto podría hacerse con un trigger o desde el frontend

---

## Flujo Final de Usuario

1. Usuario sube PDFs en la creación del proyecto
2. Edge function guarda cada PDF en Storage → obtiene URL pública
3. Edge function envía archivo + URL a Railway
4. Railway procesa y guarda `file_url` en la BD
5. Al ver contrato/factura, el usuario puede hacer clic en "Ver PDF Original"
6. Se abre el PDF en nueva pestaña (descarga directa desde Storage)
