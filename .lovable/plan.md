

# Corregir pestaña Facturas: 3 bugs pendientes

## Problema 1: Boton "Extraer datos de facturas" en pestaña Documentos sigue deshabilitado
En la linea 594 del archivo, el boton de extraccion de facturas que aparece en la pestana Documentos todavia usa `hasDocsReadyForExtraction` (que requiere Phase 1 completa Y Phase 2 incompleta). Solo se corrigio el boton de la pestana Facturas pero no el de la pestana Documentos.

**Solucion**: Cambiar `hasDocsReadyForExtraction` a `hasDocsForInvoiceExtraction` en la linea 594.

## Problema 2: Subida de documentos falla ("Failed to fetch")
El modal de subida usa `handleUploadDocument` que requiere `selectedAudit` en la linea 217. Si no hay un audit seleccionado (por ejemplo si se accede desde la pestana Facturas sin haber seleccionado proveedor), la funcion retorna sin hacer nada. Ademas, tras subir, resetea el tipo a `contrato_formal` (linea 239), lo que pierde la seleccion de "factura".

**Solucion**: 
- Cambiar el reset del tipo tras subida: en vez de forzar `contrato_formal`, mantener el tipo actual o usar un valor por defecto mas neutro como `otro`.
- Verificar que `selectedAudit` existe antes de permitir subir y mostrar mensaje claro si no hay proveedor seleccionado.

## Problema 3: Texto del boton de extraccion no refleja lo que hace
El boton dice "Extraer datos de facturas" pero realmente procesa todos los documentos (contratos y facturas). 

**Solucion**: Renombrar a "Extraer datos de documentos" o "Extraer facturas y contratos" para que sea claro.

## Cambios tecnicos

Archivo: `src/pages/chemicals/ChemContratos.tsx`

1. **Linea 594**: Cambiar `disabled={extractingInvoices || !hasDocsReadyForExtraction}` a `disabled={extractingInvoices || !hasDocsForInvoiceExtraction}`
2. **Linea 239**: Cambiar `setUploadTipo('contrato_formal')` a `setUploadTipo('otro')` para no sobreescribir la seleccion
3. **Linea 599**: Cambiar texto de "Extraer datos de facturas" a "Extraer datos de facturas y contratos" (pestana Documentos)
4. **Linea 1288**: Cambiar texto del boton en pestana Facturas a "Extraer datos de todos los documentos" para claridad

