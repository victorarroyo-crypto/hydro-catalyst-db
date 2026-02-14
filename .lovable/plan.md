

# Rediseno de la pestana Condiciones: Claridad por contrato

## Problema actual
Hay 3 secciones desplegables con datos extraidos de cada contrato (solo lectura) y debajo un unico formulario editable ("Datos consolidados"). No queda claro a que contrato corresponden los datos editables ni cual es el contrato "activo" cuyos datos se estan usando.

## Solucion propuesta: Integrar formulario editable dentro de cada contrato

En lugar de tener los contratos arriba y un formulario suelto abajo, cada contrato tendra su propia seccion completa con dos partes:

1. **Datos extraidos por IA** (solo lectura, con fondo azul claro) -- lo que ya existe
2. **Campos editables** (formulario) -- lo que ahora esta abajo, pero replicado dentro de cada contrato

### Flujo del usuario

```text
Contrato 1: "INQUIDE - contrato_2024.pdf"
+-----------------------------------------------+
| Extraido por IA (lectura)                     |
|   Plazo pago: 60 dias | Duracion: 24 meses   |
+-----------------------------------------------+
| [Boton: Copiar extraidos a campos editables]  |
+-----------------------------------------------+
| Campos editables (formulario)                 |
|   Plazo pago: [60]  | Duracion: [24]          |
|   ... (todos los campos)                      |
|   [Guardar]                                   |
+-----------------------------------------------+

Contrato 2: "PROQUIMIA - condiciones.pdf"
+-----------------------------------------------+
| ... misma estructura ...                      |
+-----------------------------------------------+

Contrato 3: "..."
+-----------------------------------------------+
| ... misma estructura ...                      |
+-----------------------------------------------+
```

### Pero hay un problema de datos...

Actualmente solo existe UN registro en `chem_contract_audits` por proveedor (no por documento). Esto significa que los "datos editables" solo pueden guardarse en un sitio. Hay dos opciones:

**Opcion A (recomendada, sin cambios en BD):** Mantener un solo registro editable pero presentarlo de forma clara. En lugar de integrarlo en cada contrato, se muestra asi:

- Los 3 contratos arriba como estan (solo lectura, desplegables)
- Al pulsar "Rellenar campos" en un contrato, se resalta visualmente ese contrato como "activo" (borde verde, badge "Datos en uso")
- El formulario editable de abajo muestra un indicador claro: **"Editando datos basados en: INQUIDE - contrato_2024.pdf"** con enlace para cambiar de contrato fuente
- Se anade una barra de contexto entre los contratos y el formulario que dice de donde vienen los datos

**Opcion B (requiere cambio en BD):** Crear un campo `document_id_source` en `chem_contract_audits` para registrar de que documento provienen los datos, y potencialmente permitir multiples audits por proveedor (uno por contrato).

## Plan de implementacion (Opcion A)

### Cambios en `src/pages/chemicals/ChemContratos.tsx`:

1. **Anadir estado** `activeDocId` para rastrear que documento fue usado para rellenar los campos
2. **Marcar visualmente** el contrato activo con borde verde y badge "Datos en uso"
3. **Anadir barra indicadora** entre los contratos y el formulario editable que muestre:
   - Nombre del documento fuente
   - Fecha en que se aplicaron los datos
   - Boton para cambiar a otro contrato
4. **Actualizar `handleAutoFill`** para que al pulsar "Rellenar campos" en un contrato, se marque ese como activo (guardando `docId` en estado local)
5. **Renombrar seccion** de "Datos consolidados del proveedor" a algo mas claro como "Ficha de condiciones del proveedor" con subtitulo explicativo
6. **Eliminar ambiguedad** anadiendo un texto explicativo: "Estos son los datos oficiales del proveedor que se usaran en el analisis. Puedes rellenarlos automaticamente desde cualquier contrato o editarlos manualmente."

### Resultado visual esperado

- Contratos extraidos: cards con fondo azul, solo lectura, el activo con borde verde
- Barra indicadora: "Datos cargados desde: contrato_2024.pdf [Cambiar]"
- Formulario editable: mismo que ahora pero con contexto claro de su proposito

