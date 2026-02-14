

# Plan completo: Corregir flujo de Facturas en ChemContratos

## Resumen de todos los problemas

### 1. Subida de facturas envia tipo "factura" que NO existe en el esquema de la BD
`openUploadForInvoices` establece `uploadTipo = 'factura'`. Sin embargo, la tabla `chem_contract_documents` solo acepta: `contrato_formal`, `condiciones_generales`, `email_tarifa`, `oferta_aceptada`, `adenda`, `otro`. El backend Railway probablemente rechaza el valor "factura", causando el error "Failed to fetch".

**Solucion**: Cambiar `openUploadForInvoices` para usar `'otro'` en lugar de `'factura'`. Eliminar la opcion "Factura" del selector del modal de subida (ya que no es un tipo valido en la BD).

### 2. La subida requiere `selectedAudit` pero desde la pestana Facturas podria no haber uno
La linea 217 hace `if (!uploadFile || !selectedAudit || !projectId) return;`. Si el usuario navego a la pestana Facturas sin que haya un audit seleccionado, la subida falla silenciosamente.

**Solucion**: Mostrar un toast de error explicativo si `selectedAudit` no existe cuando se intenta subir: "Selecciona un proveedor primero". Esto ya esta resuelto implicitamente porque para llegar a la pestana Facturas hay que estar dentro de un proveedor (el `selectedAudit` ya existe), pero anadiremos una validacion explicita por seguridad.

### 3. La pestana Facturas solo muestra documentos del proveedor actual, pero la extraccion es a nivel proyecto
`documents` se filtra por `audit_id = selectedAudit` (linea 62-68). Pero `handleExtractInvoices` llama a Railway con `project_id` (linea 193), procesando TODOS los documentos del proyecto.

**Solucion**: Crear una nueva query `allProjectDocs` que traiga todos los documentos del proyecto (sin filtrar por audit). Usar esta query en la pestana Facturas para:
- Contar documentos disponibles para extraccion
- Habilitar/deshabilitar el boton de extraccion
- Mostrar una tabla con todos los documentos del proyecto (archivo, proveedor, tipo, estado)

### 4. La pestana Facturas no muestra datos extraidos
La tabla destino de facturas es `chem_price_history` (producto, mes, importe_facturado, cantidad_kg). Actualmente la pestana Facturas no muestra nada de esto.

**Solucion**: Anadir una query a `chem_price_history` por `project_id` con JOIN a `chem_products` para nombre del producto. Mostrar una tabla con las columnas: Producto, Mes, Importe facturado, Cantidad (kg), Precio medio.

### 5. Textos de botones confusos
Los botones de extraccion no aclaran bien que hacen ni a que alcance (proveedor vs proyecto).

**Solucion**: 
- Pestana Documentos: "Extraer clausulas de contratos" (sin cambio) + "Procesar todos los documentos del proyecto"
- Pestana Facturas: "Procesar facturas de todos los proveedores"

### 6. Mejor manejo de errores de conexion
Cuando Railway no responde, el error generico "Failed to fetch" no es util.

**Solucion**: En `handleUploadDocument`, capturar `TypeError` y mostrar: "No se pudo conectar con el servidor. Verifica tu conexion."

## Cambios tecnicos detallados

Archivo: `src/pages/chemicals/ChemContratos.tsx`

### A. Nueva query: todos los documentos del proyecto

```typescript
const { data: allProjectDocs = [] } = useQuery({
  queryKey: ['chem-all-project-docs', projectId],
  queryFn: async () => {
    const { data, error } = await externalSupabase
      .from('chem_contract_documents')
      .select('id, nombre_archivo, tipo_documento, estado_extraccion, datos_extraidos, created_at, audit_id, chem_contract_audits(supplier_id, chem_suppliers(nombre))')
      .eq('project_id', projectId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: !!projectId,
});
```

### B. Nueva query: historico de precios (facturas extraidas)

```typescript
const { data: priceHistory = [] } = useQuery({
  queryKey: ['chem-price-history', projectId],
  queryFn: async () => {
    const { data, error } = await externalSupabase
      .from('chem_price_history')
      .select('*, chem_products(nombre_comercial)')
      .eq('project_id', projectId!)
      .order('mes', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: !!projectId,
});
```

### C. Corregir `openUploadForInvoices`
Cambiar de `setUploadTipo('factura')` a `setUploadTipo('otro')`.

### D. Eliminar opcion "Factura" del selector
Quitar `<SelectItem value="factura">Factura</SelectItem>` del modal de subida (linea 621).

### E. Nueva variable para habilitacion del boton de extraccion en Facturas
```typescript
const hasProjectDocsForExtraction = allProjectDocs.some((d: any) => 
  d.estado_extraccion === 'completado' && d.datos_extraidos?.raw_text
);
```

### F. Reescribir pestana Facturas
Reemplazar el contenido actual de la pestana Facturas con:
1. Tabla de documentos del proyecto (usando `allProjectDocs`): Archivo, Proveedor (via JOIN), Tipo, Estado
2. Boton de extraccion usando `hasProjectDocsForExtraction`
3. Tabla de datos extraidos (usando `priceHistory`): Producto, Mes, Importe, Cantidad, Precio medio

### G. Mejorar manejo de errores en `handleUploadDocument`
```typescript
} catch (err: any) {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    toast.error('No se pudo conectar con el servidor. Verifica tu conexion.');
  } else {
    toast.error(`Error: ${err.message}`);
  }
}
```

### H. Invalidar queries tras extraccion
En `handleExtractInvoices`, anadir invalidacion de `chem-all-project-docs` y `chem-price-history` para que la pestana Facturas se actualice automaticamente.

