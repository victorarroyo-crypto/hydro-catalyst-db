
# Arreglar la pestaña Facturas: subida y extracción

## Problemas detectados

### Problema 1: El botón "Subir facturas" no funciona correctamente
El botón abre el mismo modal de subida de documentos que la pestaña "Documentos", pero siempre sube los archivos con tipo `contrato_formal`. No hay forma de indicar que el documento es una factura.

### Problema 2: El botón "Extraer datos de facturas" está siempre deshabilitado
El botón usa la condición `hasDocsReadyForExtraction`, que comprueba si hay documentos con texto extraído (Phase 1) pero sin datos estructurados (Phase 2). Como los 3 documentos actuales ya tienen Phase 2 completada, la condición siempre es `false` y el botón queda gris e inactivo.

## Solución propuesta

### Cambio 1: Botón "Subir facturas" abre el modal con tipo pre-seleccionado
Cuando se pulse "Subir facturas" desde la pestaña Facturas, el modal de subida se abrirá con el tipo de documento pre-configurado como `factura` en vez de `contrato_formal`.

### Cambio 2: Condición del botón de extracción de facturas independiente
Crear una condición separada para facturas que no dependa de Phase 2 de contratos. El botón "Extraer datos de facturas" se habilitará si hay al menos un documento con Phase 1 completada (tiene `raw_text`), independientemente de si ya tiene datos de contrato extraídos.

### Cambio 3: Mejorar la pestaña Facturas con más contexto
Añadir un mensaje más claro que explique el flujo: primero subir facturas (PDF/Excel), luego extraer datos. Mostrar cuántos documentos hay disponibles para extracción.

## Detalles técicos

Archivo: `src/pages/chemicals/ChemContratos.tsx`

1. Añadir una función `openUploadForInvoices` que haga `setUploadTipo('factura'); setShowUploadModal(true)` y usarla en el botón "Subir facturas".
2. Crear `hasDocsForInvoiceExtraction` = `documents.some(d => isPhase1Complete(d))` -- sin el filtro `!isPhase2Complete`.
3. Usar `hasDocsForInvoiceExtraction` en el `disabled` del botón de la pestaña Facturas en lugar de `hasDocsReadyForExtraction`.
4. Actualizar el texto explicativo de la pestaña para indicar cuántos documentos están disponibles.
