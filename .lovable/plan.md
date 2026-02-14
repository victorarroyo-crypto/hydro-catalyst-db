

## Plan: Boton "Ver PDF" en la lista de facturas

### Objetivo
Agregar un boton para abrir el PDF original de cada factura directamente desde la tabla de analisis de facturas.

### Como funciona la conexion

Cada factura (`chem_invoices`) tiene un campo `document_id` que apunta al registro en `chem_contract_documents`, donde esta almacenada la URL del archivo (`file_url`). El plan es resolver esa URL y mostrar un boton para abrir el PDF en una nueva pestana.

### Cambios

#### 1. Resolver las URLs de documentos (`ChemContratos.tsx`)

- Cuando se cargan las facturas, hacer una consulta adicional a `chem_contract_documents` con los `document_id` de las facturas para obtener las `file_url` correspondientes.
- Pasar un mapa `{ [document_id]: file_url }` como prop al componente `ChemInvoicesTab`.

#### 2. Boton "Ver PDF" en la tabla de facturas (`ChemInvoicesList.tsx`)

- Agregar una nueva columna con un icono de "ver documento" (icono `FileText` o `ExternalLink`) en cada fila de factura.
- El boton solo se muestra si la factura tiene `document_id` y se encontro una URL valida.
- Al pulsar, abre el PDF en una nueva pestana usando `convertStorageUrl()` del helper existente (para convertir URLs `storage://` si es necesario).

#### 3. Tambien en el detalle expandido

- Dentro de `InvoiceDetail`, agregar un boton mas visible "Ver factura original (PDF)" en la cabecera del detalle expandido, para que sea facil acceder al documento cuando se esta revisando la informacion extraida.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/chemicals/ChemContratos.tsx` | Query para resolver `document_id` a `file_url`. Pasar mapa de URLs a `ChemInvoicesTab`. |
| `src/components/chemicals/invoices/ChemInvoicesTab.tsx` | Recibir y propagar el mapa de URLs de documentos. |
| `src/components/chemicals/invoices/ChemInvoicesList.tsx` | Agregar columna con boton "Ver PDF" en la tabla y boton en el detalle expandido. |

### Resultado

El usuario podra abrir el PDF original de cualquier factura con un solo clic, tanto desde la tabla como desde el detalle expandido, facilitando la comparacion visual entre el documento original y los datos extraidos por la IA.

