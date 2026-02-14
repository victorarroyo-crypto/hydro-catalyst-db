

# Mejora de claridad: seleccion automatica al abrir contrato

## Cambios propuestos

### 1. Titulo dinamico con nombre del proveedor
El titulo "Ficha de condiciones del proveedor" pasara a mostrar el nombre real:
- **"Ficha de condiciones de INQUIDE"** (cuando hay un contrato activo/abierto)
- **"Ficha de condiciones del proveedor"** (solo si no hay ninguno seleccionado)

### 2. Seleccion automatica al abrir desplegable
Cuando el usuario abre (expande) un contrato arriba, automaticamente:
- Ese contrato se marca como activo (borde verde + badge "Datos en uso")
- El titulo del formulario de abajo cambia al nombre de ese proveedor
- La barra de contexto se actualiza con el nombre del archivo

No hace falta pulsar "Rellenar campos" para que el formulario se vincule visualmente al contrato. El boton "Rellenar campos" sigue existiendo para copiar datos al formulario, pero la vinculacion visual es inmediata al abrir.

### 3. Eliminar boton "Desmarcar"
Se quita el boton "Desmarcar" de la barra de contexto. Si el usuario abre otro contrato, simplemente cambia el activo.

### 4. Barra de contexto simplificada
En lugar de "Datos cargados desde: archivo.pdf", mostrara:
- **"Proveedor: INQUIDE | Documento: contrato_2024.pdf"**

## Detalles tecnicos

Cambios en `src/pages/chemicals/ChemContratos.tsx`:

1. **Convertir Collapsible a controlado**: Cambiar de `defaultOpen` a `open` + `onOpenChange` para cada contrato. Cuando `onOpenChange(true)`, se ejecuta `setActiveDocId(docId)` y `setActiveDocName(nombre)`.

2. **Titulo dinamico**: Reemplazar el texto fijo "Ficha de condiciones del proveedor" por una interpolacion que use `activeDocName` para mostrar el nombre del proveedor extraido de `ext.supplier_name`.

3. **Eliminar boton Desmarcar**: Quitar el `Button` de "Desmarcar" y su `onClick`.

4. **Actualizar barra de contexto**: Reformatear para mostrar proveedor + documento claramente.

5. **Estado de apertura controlado**: Anadir estado `openDocId` (o reusar `activeDocId`) para controlar que Collapsible esta abierto, de forma que al abrir uno se cierre el anterior y se actualice el contexto.

