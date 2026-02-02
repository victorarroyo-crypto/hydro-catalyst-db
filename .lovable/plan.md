
# Plan: Añadir botones Ver/Editar a las tablas de Contratos y Facturas ✅ COMPLETADO

## Problema
Las tablas `ContractsReviewTable` e `InvoicesReviewTable` muestran los datos extraídos pero no tienen botones para:
- Ver los detalles completos del documento
- Editar los datos extraídos

Los modales de edición ya existen (`ContractFormModal`, `InvoiceFormModal`) pero no están conectados a las tablas.

## Solución

Añadir una columna "Acciones" a ambas tablas con botones de Ver (👁) y Editar (✏️), y conectarlos con los modales existentes.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/cost-consulting/ContractsReviewTable.tsx` | Añadir columna Acciones con callbacks |
| `src/components/cost-consulting/InvoicesReviewTable.tsx` | Añadir columna Acciones con callbacks |
| `src/pages/cost-consulting/CostConsultingDetail.tsx` | Importar modales e integrar con las tablas |

---

## Cambios detallados

### 1. ContractsReviewTable.tsx

**Nuevas props:**
```typescript
interface ContractsReviewTableProps {
  contracts: Contract[];
  onView?: (contract: Contract) => void;   // NUEVO
  onEdit?: (contract: Contract) => void;   // NUEVO
}
```

**Nueva columna en la tabla:**
```
| Proveedor | Nº Contrato | Valor Anual | Vigencia | Renovación | Pago | Confianza | Acciones |
                                                                                    [👁] [✏️]
```

**Iconos a importar:** `Eye`, `Pencil` de lucide-react

### 2. InvoicesReviewTable.tsx

**Nuevas props:**
```typescript
interface InvoicesReviewTableProps {
  invoices: Invoice[];
  onView?: (invoice: Invoice) => void;   // NUEVO
  onEdit?: (invoice: Invoice) => void;   // NUEVO
}
```

**Nueva columna en la tabla:**
```
| ▶ | Nº Factura | Fecha | Proveedor | Base | IVA | Total | Líneas | Acciones |
                                                                       [👁] [✏️]
```

**Nota:** Los botones deben usar `e.stopPropagation()` para evitar que expandan la fila al hacer clic.

### 3. CostConsultingDetail.tsx

**Nuevos imports:**
```typescript
import { ContractFormModal } from '@/components/cost-consulting/ContractFormModal';
import { InvoiceFormModal } from '@/components/cost-consulting/InvoiceFormModal';
```

**Nuevos estados:**
```typescript
const [editingContract, setEditingContract] = useState<CostContract | null>(null);
const [editingInvoice, setEditingInvoice] = useState<CostInvoice | null>(null);
const [viewingContract, setViewingContract] = useState<CostContract | null>(null);
const [viewingInvoice, setViewingInvoice] = useState<CostInvoice | null>(null);
```

**Actualizar las tablas con callbacks:**
```tsx
<ContractsReviewTable 
  contracts={contracts}
  onView={(c) => setViewingContract(c)}
  onEdit={(c) => setEditingContract(c)}
/>

<InvoicesReviewTable 
  invoices={invoices}
  onView={(i) => setViewingInvoice(i)}
  onEdit={(i) => setEditingInvoice(i)}
/>
```

**Añadir los modales al final del componente:**
```tsx
{/* Contract Edit Modal */}
<ContractFormModal
  projectId={project?.id || ''}
  contract={editingContract}
  suppliers={[]} // Obtener de hook existente
  open={!!editingContract}
  onClose={() => setEditingContract(null)}
  onSaved={() => {
    queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
    setEditingContract(null);
  }}
/>

{/* Invoice Edit Modal */}
<InvoiceFormModal
  projectId={project?.id || ''}
  invoice={editingInvoice}
  suppliers={[]}
  contracts={contracts}
  open={!!editingInvoice}
  onClose={() => setEditingInvoice(null)}
  onSaved={() => {
    queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
    setEditingInvoice(null);
  }}
/>
```

**Modal de Vista (simplificado):** Para los botones "Ver", abrir el modal de edición en modo solo lectura, o crear un Dialog simple que muestre todos los campos.

---

## Diseño visual de los botones

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Proveedor      │ Nº Factura │ Fecha       │ Total      │ Líneas │ Acciones  │
├────────────────┼────────────┼─────────────┼────────────┼────────┼───────────┤
│ AGUASERV S.L.  │ FAS-001    │ 05 dic 2024 │ 15.125,00€ │  [1]   │ [👁] [✏️] │
│ MAPFRE S.A.    │ POL-001    │ 01 ene 2024 │  6.800,00€ │  [1]   │ [👁] [✏️] │
└────────────────┴────────────┴─────────────┴────────────┴────────┴───────────┘
```

- **👁 (Eye)**: Tooltip "Ver detalles" - Abre vista de solo lectura
- **✏️ (Pencil)**: Tooltip "Editar" - Abre modal de edición

---

## Flujo de usuario

1. Usuario ve la tabla de facturas/contratos en el estado "review"
2. Cada fila tiene botones de Ver y Editar en la última columna
3. Al hacer clic en "Ver" → Abre modal con todos los detalles (solo lectura)
4. Al hacer clic en "Editar" → Abre el formulario de edición existente
5. Al guardar cambios → La tabla se actualiza automáticamente via React Query

---

## Detalles técnicos

- **Iconos:** `Eye` y `Pencil` de lucide-react
- **Botones:** Variante `ghost`, tamaño `icon` o `sm`
- **Invalidación de queries:** Usar `queryClient.invalidateQueries` tras guardar
- **Suppliers:** Necesitamos cargar la lista de proveedores para los modales (revisar si ya existe un hook `useCostSuppliers`)
