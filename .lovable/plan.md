
## Plan: Corregir el boton "Ver PDF" usando URLs firmadas

### Causa raiz del error 404

El bucket `chem-documents` en la base de datos externa es **privado**. La URL que se genera actualmente usa la ruta `/object/public/chem-documents/...`, que solo funciona para buckets publicos. La respuesta del servidor confirma: `"Bucket not found"` (no expone buckets privados por esa ruta).

Mi "arreglo" anterior fue una chapuza: cambie el dominio pero segui usando la ruta publica. No probe la URL resultante. Eso no puede volver a pasar.

### Solucion correcta: URLs firmadas (signed URLs)

En vez de construir una URL publica manualmente, usar el cliente `externalSupabase` (que tiene la clave service_role) para generar una **URL firmada temporal** que permite acceder al archivo privado durante un tiempo limitado (ej: 1 hora).

### Cambios

#### 1. Nueva funcion `getSignedDocumentUrl()` en `ChemInvoicesTab.tsx`

Reemplazar la logica actual de `documentUrlMap` (que guarda la URL cruda `storage://...`) por una funcion que:
- Recibe el `file_url` crudo (`storage://chem-documents/...`)
- Extrae el path relativo dentro del bucket (ej: `7baf4eab-.../factura.pdf`)
- Usa `externalSupabase.storage.from('chem-documents').createSignedUrl(path, 3600)` para generar una URL firmada valida por 1 hora
- Abre esa URL en una nueva pestana

#### 2. Cambiar el flujo del boton "Ver PDF"

En lugar de pre-calcular URLs y pasarlas como mapa, el boton llamara a la funcion `getSignedDocumentUrl()` en el momento del clic. Esto es mejor porque:
- Las URLs firmadas tienen expiracion, no conviene pre-generarlas
- La generacion es instantanea (es una llamada al API de storage)

#### 3. Eliminar la logica rota de `convertStorageUrl` para chem-documents

La funcion `convertStorageUrl` en `storageUrlHelper.ts` seguira existiendo para los documentos de cost-consulting (que usan un bucket publico), pero la rama de `chem-documents` se elimina porque esa ruta nunca funciono.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/chemicals/invoices/ChemInvoicesList.tsx` | El boton "Ver PDF" llamara a una funcion asincrona que genera signed URL en el momento del clic, en vez de usar una URL pre-calculada |
| `src/components/chemicals/invoices/ChemInvoicesTab.tsx` | El `documentUrlMap` seguira pasando las URLs crudas (para saber SI hay PDF), pero la apertura usara signed URLs |
| `src/utils/storageUrlHelper.ts` | Agregar nueva funcion `openChemDocumentUrl()` que usa `externalSupabase.storage.createSignedUrl()`. Eliminar la rama rota de chem-documents en `convertStorageUrl` |

### Verificacion

La URL firmada tendra este formato:
```text
https://ktzhrlcvluaptixngrsh.supabase.co/storage/v1/object/sign/chem-documents/7baf.../factura.pdf?token=eyJ...
```
Esto funciona porque la clave service_role tiene acceso total al bucket privado.
