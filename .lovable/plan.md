
# Plan: Añadir Botones de Eliminar a las Tablas de Revisión

## Resumen

Añadir un botón de papelera (🗑️) a cada fila de las tablas de Contratos y Facturas en la vista de revisión, permitiendo eliminar registros individuales antes o después del análisis.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `ContractsReviewTable.tsx` | Añadir prop `onDelete`, botón Trash2 |
| `InvoicesReviewTable.tsx` | Añadir prop `onDelete`, botón Trash2 |
| `CostConsultingDetail.tsx` | Implementar handlers y pasarlos a las tablas |

## Cambios Detallados

### 1. ContractsReviewTable.tsx

```typescript
// Importar Trash2
import { ..., Trash2 } from 'lucide-react';

// Actualizar interface (línea 66-73)
interface ContractsReviewTableProps {
  contracts: ContractForReview[];
  onView?: (contract: ContractForReview) => void;
  onEdit?: (contract: ContractForReview) => void;
  onValidate?: (contractId: string) => void;
  onChangeType?: (contract: ContractForReview) => void;
  onDelete?: (contractId: string) => void;  // NUEVO
  isValidating?: string | null;
  isDeleting?: string | null;  // NUEVO
}

// Añadir botón después de Validar (línea ~331)
{/* Delete */}
{onDelete && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(contract.id)}
        disabled={isDeleting === contract.id}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Eliminar</TooltipContent>
  </Tooltip>
)}
```

### 2. InvoicesReviewTable.tsx

```typescript
// Importar Trash2 (ya hay otros iconos)
import { ..., Trash2 } from 'lucide-react';

// Actualizar interface (línea 76-83)
interface InvoicesReviewTableProps {
  invoices: InvoiceForReview[];
  onView?: (invoice: InvoiceForReview) => void;
  onEdit?: (invoice: InvoiceForReview) => void;
  onValidate?: (invoiceId: string) => void;
  onChangeType?: (invoice: InvoiceForReview) => void;
  onDelete?: (invoiceId: string) => void;  // NUEVO
  isValidating?: string | null;
  isDeleting?: string | null;  // NUEVO
}

// Añadir botón después de Validar (línea ~393)
{/* Delete */}
{onDelete && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(invoice.id)}
        disabled={isDeleting === invoice.id}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Eliminar</TooltipContent>
  </Tooltip>
)}
```

### 3. CostConsultingDetail.tsx

```typescript
// Estados para tracking de eliminación
const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

// Handler para eliminar contrato
const handleDeleteContract = async (contractId: string) => {
  setDeletingContractId(contractId);
  try {
    await deleteContract(projectId, contractId);
    toast.success('Contrato eliminado');
    refetchContracts();
  } catch (error) {
    toast.error('Error al eliminar contrato');
  } finally {
    setDeletingContractId(null);
  }
};

// Handler para eliminar factura
const handleDeleteInvoice = async (invoiceId: string) => {
  setDeletingInvoiceId(invoiceId);
  try {
    await deleteInvoice(projectId, invoiceId);
    toast.success('Factura eliminada');
    refetchInvoices();
  } catch (error) {
    toast.error('Error al eliminar factura');
  } finally {
    setDeletingInvoiceId(null);
  }
};

// Pasar a los componentes
<ContractsReviewTable
  contracts={contracts}
  onDelete={handleDeleteContract}
  isDeleting={deletingContractId}
  // ... otras props
/>

<InvoicesReviewTable
  invoices={invoices}
  onDelete={handleDeleteInvoice}
  isDeleting={deletingInvoiceId}
  // ... otras props
/>
```

## Diseño Visual

El botón de eliminar:
- Icono: `Trash2` de lucide-react
- Color: Rojo (`text-destructive`)
- Posición: Último botón de la fila (después de "Validar")
- Hover: `hover:bg-destructive/10`
- Estado deshabilitado mientras se elimina

## Notas

- Los endpoints `deleteContract` y `deleteInvoice` ya existen en `costConsultingApi.ts`
- No se requiere confirmación previa (el usuario puede volver a extraer si elimina por error)
- El botón aparece siempre, independientemente del estado de validación
