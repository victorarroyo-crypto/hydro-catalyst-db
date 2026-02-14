

## Plan: Corregir el flujo de facturas - Separacion limpia entre contratos y facturas

### Problemas identificados

1. **Facturas aparecen en "Condiciones"**: La pestana Condiciones muestra todos los documentos que tienen `datos_extraidos.supplier_name`. Las facturas extraidas por Railway tambien incluyen ese campo, asi que aparecen como si fueran contratos.

2. **Facturas aparecen dos veces en "Facturas"**: La pestana Facturas muestra (a) los PDFs subidos filtrados de `documents` y (b) el componente `ChemInvoicesTab` que trae datos procesados desde la API de Railway. Si Railway ya proceso esas facturas, el usuario ve la misma informacion duplicada.

3. **Filtro fragil en "Documentos"**: El filtro actual (`tipo_documento === 'otro' && nombre_archivo.includes('factura')`) es fragil y puede fallar si el archivo no tiene "factura" en el nombre.

4. **Documentos acotados al audit seleccionado**: La query `documents` esta filtrada por `audit_id`, lo que limita las facturas visibles a un solo proveedor en vez de mostrar todas las del proyecto.

### Solucion propuesta

#### 1. Crear un filtro robusto para distinguir facturas de contratos

En lugar de depender del nombre del archivo, usar una funcion helper que identifique facturas por multiples criterios:
- `tipo_documento === 'otro'` con nombre que incluya "factura"
- O bien, el `raw_text` extraido contiene indicadores de factura (numero factura, IVA, base imponible)
- O bien, `datos_extraidos` tiene campos tipicos de factura (como `productos_mencionados` con precios pero sin clausulas contractuales como `duracion_contrato_meses`)

La funcion seria algo como:

```text
isInvoiceDoc(doc):
  - Si tipo_documento === 'otro' Y nombre contiene 'factura' -> true
  - Si datos_extraidos.raw_text contiene 'FACTURA' e 'IVA' -> true
  - Si tipo_documento es un tipo contractual conocido -> false
  - Default: false
```

#### 2. Pestana "Condiciones" — Excluir facturas

Modificar el filtro en la linea 662 para excluir documentos identificados como facturas:

```text
const docsWithData = documents.filter(d => 
  d.datos_extraidos?.supplier_name && !isInvoiceDoc(d)
);
```

#### 3. Pestana "Documentos" — Excluir facturas

Actualizar el filtro en linea 395-398 para usar la misma funcion `isInvoiceDoc`:

```text
const contractDocs = documents.filter(d => !isInvoiceDoc(d));
```

#### 4. Pestana "Facturas" — Eliminar la lista duplicada de PDFs

La seccion de "Facturas subidas" (lineas 1268-1329) que muestra los PDFs crudos es redundante con el `ChemInvoicesTab`. La solucion es simplificar esta pestana:

- Mantener solo el boton "Subir factura" y el boton "Extraer datos de facturas"
- Mostrar la lista de PDFs subidos de forma compacta (solo como referencia, sin tabla detallada)
- El componente `ChemInvoicesTab` ya muestra los datos procesados correctamente

#### 5. Boton "Extraer facturas" en el lugar correcto

Mover la logica de extraccion de facturas exclusivamente a la pestana Facturas y eliminar el boton duplicado de la pestana Documentos (lineas 603-612).

### Cambios de archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/chemicals/ChemContratos.tsx` | Agregar funcion `isInvoiceDoc()`, actualizar filtros en las 3 pestanas, simplificar seccion de PDFs en Facturas, mover boton de extraccion |

### Resultado esperado

- **Documentos**: Solo contratos y documentos NO-factura
- **Condiciones**: Solo datos extraidos de contratos (nunca facturas)
- **Facturas**: Seccion compacta de PDFs subidos + boton subir + boton extraer + `ChemInvoicesTab` con datos procesados (sin duplicacion)

