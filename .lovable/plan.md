
# Plan completo: Corregir flujo de Facturas y alinear con esquema externo

## Bugs encontrados

### Bug 1: Query `allProjectDocs` usa nombres de columnas INCORRECTOS
La query de la linea 81 usa `nombre` y `tipo` pero va contra `externalSupabase` donde las columnas se llaman `nombre_archivo` y `tipo_documento`. Resultado: la tabla de la pestana Facturas muestra guiones en todas las celdas.

**Linea 81 actual:**
```
.select('id, nombre, tipo, estado_extraccion, datos_extraidos, created_at, audit_id, chem_contract_audits(supplier_id, chem_suppliers(nombre))')
```

**Debe ser:**
```
.select('id, nombre_archivo, tipo_documento, estado_extraccion, datos_extraidos, created_at, audit_id, chem_contract_audits(supplier_id, chem_suppliers(nombre))')
```

### Bug 2: Renderizado de la tabla Facturas usa propiedades incorrectas
La tabla en la linea 1323 accede a `d.nombre` y `d.tipo`, pero con la correccion del Bug 1, las propiedades seran `d.nombre_archivo` y `d.tipo_documento`.

### Bug 3: La query `priceHistory` filtra por `project_id` pero esa columna NO existe en `chem_price_history` externo
Segun el esquema externo, `chem_price_history` solo tiene: `id`, `product_id`, `mes`, `importe_facturado`, `cantidad_kg`, `indice_icis_mes`. NO tiene `project_id`.

Para obtener el historico de precios de un proyecto, hay que:
1. Primero obtener los `product_id` del proyecto (desde `chem_products` filtrado por `project_id`)
2. Luego filtrar `chem_price_history` por esos `product_id`

O alternativamente, hacer el JOIN inverso: `chem_price_history` -> `chem_products(project_id, nombre_comercial)` y filtrar en el cliente.

### Bug 4: La variable `hasProjectDocsForExtraction` accede a `datos_extraidos` pero no verifica bien el campo
La linea 241 busca `d.datos_extraidos?.raw_text` pero si la BD externa devolvio el campo con un nombre diferente o esta vacio, el boton se queda deshabilitado siempre.

### Bug 5: No hay opcion "Factura" en el selector de tipo de documento
Se quito "Factura" del selector y se mapea a "Otro". Esto es correcto para la BD, pero el usuario no sabe que "Otro" significa factura. Hay que anadir una pista visual.

## Cambios a realizar

### Cambio 1: Corregir query `allProjectDocs` (linea 81)
Cambiar los nombres de columnas a los del esquema externo: `nombre_archivo`, `tipo_documento`.

### Cambio 2: Corregir renderizado tabla Facturas (lineas 1323-1326)
- `d.nombre` → `d.nombre_archivo`
- `d.tipo` → `d.tipo_documento`

### Cambio 3: Corregir query `priceHistory` (lineas 91-103)
Cambiar la estrategia: en vez de filtrar por `project_id` (que no existe en la tabla externa), obtener los IDs de productos del proyecto y filtrar por ellos. Usar `.in('product_id', productIds)`.

Esto requiere que la query de productos ya este cargada. Se puede usar los datos de `chem_products` que ya se cargan en otros componentes, o anadir una query auxiliar.

### Cambio 4: Anadir etiqueta "Factura" visual al selector
Anadir un `SelectItem` con valor `otro` pero texto "Otro / Factura" para que el usuario entienda que las facturas se suben como "otro". Alternativamente, anadir un texto de ayuda debajo del selector cuando se abre desde la pestana Facturas.

### Cambio 5: Anadir query de productos del proyecto
Para poder filtrar `chem_price_history` por productos del proyecto, necesitamos la lista de productos. Anadir:
```typescript
const { data: projectProducts = [] } = useQuery({
  queryKey: ['chem-products-for-history', projectId],
  queryFn: async () => {
    const { data, error } = await externalSupabase
      .from('chem_products')
      .select('id, nombre_comercial')
      .eq('project_id', projectId!);
    if (error) throw error;
    return data || [];
  },
  enabled: !!projectId,
});
```

Y luego la query de priceHistory:
```typescript
const productIds = projectProducts.map((p: any) => p.id);

const { data: priceHistory = [] } = useQuery({
  queryKey: ['chem-price-history', projectId, productIds],
  queryFn: async () => {
    if (productIds.length === 0) return [];
    const { data, error } = await externalSupabase
      .from('chem_price_history')
      .select('*, chem_products(nombre_comercial)')
      .in('product_id', productIds)
      .order('mes', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: productIds.length > 0,
});
```

## Resumen de archivos a modificar

Archivo unico: `src/pages/chemicals/ChemContratos.tsx`

1. Linea 81: Corregir nombres de columnas en select de `allProjectDocs`
2. Lineas 91-103: Reescribir query `priceHistory` para usar `product_id` en vez de `project_id`
3. Anadir query `projectProducts` antes de `priceHistory`
4. Linea 241: Verificar que `hasProjectDocsForExtraction` usa los campos correctos
5. Linea 1323: `d.nombre` → `d.nombre_archivo`
6. Linea 1326: `d.tipo` → `d.tipo_documento`
7. Linea ~658: Cambiar texto de "Otro" a "Otro / Factura" en el selector
