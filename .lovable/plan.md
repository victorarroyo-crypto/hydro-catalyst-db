

## Fix: Filter invoices by supplier when viewing a contract

### Problem
When you open a specific contract (e.g., Proquimia), the "Facturas" sub-tab shows ALL project invoices (including Brentag's) instead of only the invoices belonging to that supplier.

### Root Cause
`ChemInvoicesTab` in `ChemContratos.tsx` (line 1392) only receives `projectId` -- it has no knowledge of which supplier/audit is selected. The `useChemInvoices` hook fetches all invoices for the entire project without any supplier filter.

### Solution
Pass an optional `supplierId` prop through the component chain and filter invoices, alerts, and summary client-side.

### Changes

**1. `src/components/chemicals/invoices/ChemInvoicesTab.tsx`**
- Add optional `supplierId?: string` prop
- Pass it to `useChemInvoices`

**2. `src/components/chemicals/invoices/useChemInvoices.ts`**
- Accept optional `supplierId` parameter
- After fetching all invoices, filter them client-side: `invoices.filter(i => i.supplier_id === supplierId)` when `supplierId` is provided
- Similarly filter alerts by `supplier_id`
- Return filtered data so all sub-tabs (invoices list, alerts, summary) show only the relevant supplier's data

**3. `src/pages/chemicals/ChemContratos.tsx`**
- Pass `supplierId={currentAudit.supplier_id}` to `ChemInvoicesTab` at line 1392

**4. `src/pages/chemicals/ChemFacturas.tsx`** (no change needed)
- The standalone Facturas page continues showing all invoices (no `supplierId` passed), which is correct behavior for the project-wide view.

### Technical Detail
Client-side filtering is used because the Railway API endpoint does not currently support a `supplier_id` query parameter. The data volume per project is small enough that this is efficient. The filter applies to `invoicesQuery.data`, `alertsQuery.data` before they are returned from the hook.
