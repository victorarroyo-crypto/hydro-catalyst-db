
# Plan: Admin Pages for Cost Consulting - Suppliers & Benchmarks

## Overview
This plan implements two complete admin pages with full CRUD functionality:
1. **Suppliers Admin** (`/cost-consulting/admin/suppliers`) - Extended management for providers
2. **Benchmarks Admin** (`/cost-consulting/admin/benchmarks`) - Price reference data management

Both pages will connect to the Railway backend API endpoints and follow existing Vandarum design patterns.

---

## Technical Details

### 1. API Service Extensions (`src/services/costConsultingApi.ts`)

Add new functions to connect with the Railway backend:

```text
SUPPLIERS API:
- getSuppliers(filters) → GET /api/cost-consulting/suppliers
- getPendingSuppliers() → GET /api/cost-consulting/suppliers/pending
- getSupplier(id) → GET /api/cost-consulting/suppliers/{id}
- createSupplier(data) → POST /api/cost-consulting/suppliers
- updateSupplier(id, data) → PATCH /api/cost-consulting/suppliers/{id}
- verifySupplier(id, data) → POST /api/cost-consulting/suppliers/{id}/verify
- deleteSupplier(id) → DELETE /api/cost-consulting/suppliers/{id}

BENCHMARKS API:
- getBenchmarkPrices(filters) → GET /api/cost-consulting/benchmarks/prices
- getBenchmarkPrice(id) → GET /api/cost-consulting/benchmarks/prices/{id}
- createBenchmarkPrice(data) → POST /api/cost-consulting/benchmarks/prices
- updateBenchmarkPrice(id, data) → PATCH /api/cost-consulting/benchmarks/prices/{id}
- deleteBenchmarkPrice(id) → DELETE /api/cost-consulting/benchmarks/prices/{id}
```

### 2. TypeScript Interfaces (`src/types/costConsulting.ts`)

New file with complete type definitions:

```typescript
// Extended Supplier interface (matching API spec)
interface Supplier {
  id: string;
  name: string;
  trade_name?: string;
  tax_id?: string;
  vertical_id?: string;
  category_ids?: string[];
  country: string;
  region?: string;
  web?: string;
  email?: string;
  phone?: string;
  verified: boolean;
  verified_at?: string;
  source: "manual" | "extracted";
  categoria?: SupplierCategory;
  subcategorias?: string[];
  productos_servicios?: ProductService[];
  ambito_geografico?: string;
  condiciones_comerciales?: CommercialConditions;
  rating?: SupplierRating;
  contacto_comercial?: ContactInfo;
  activo: boolean;
  fecha_ultima_oferta?: string;
  notas?: string;
}

// Benchmark price interface
interface BenchmarkPrice {
  id: string;
  vertical_id: string;
  category_id: string;
  product_name: string;
  unit: string;
  region?: string;
  price_p10: number;
  price_p25: number;
  price_p50: number;
  price_p75: number;
  price_p90: number;
  source: string;
  valid_from: string;
  valid_until: string;
  notes?: string;
  cost_categories?: { code: string; name: string };
}
```

### 3. New React Hooks (`src/hooks/useCostAdminData.ts`)

```typescript
// Suppliers hooks
- useCostAdminSuppliers(filters) - List with filters
- useCostPendingSuppliers() - Pending verification
- useSupplierMutations() - Create/Update/Delete/Verify

// Benchmarks hooks  
- useCostBenchmarks(filters) - List with filters
- useBenchmarkMutations() - Create/Update/Delete
```

### 4. Suppliers Admin Page

**Route:** `/cost-consulting/admin/suppliers`

**File:** `src/pages/cost-consulting/admin/CostSuppliersAdmin.tsx`

**Features:**
- **Header**: Title with Admin badge, "Nuevo Proveedor" button
- **Stats Cards**: Total, Verified, Pending, Inactive counts
- **Filters Bar**: 
  - Search input
  - Category dropdown (ENUM values)
  - Verified filter (All/Yes/No)
  - Active filter (All/Yes/No)
  - Region dropdown
- **Tabs**:
  - "Todos" - All suppliers table
  - "Pendientes" - Verification queue with form
  - "Por Categoría" - Grouped view
- **Table Columns**: Name, CIF, Categories, Verified badge, Active badge, Region, Rating, Actions
- **Row Click** → Opens detail Sheet panel
- **Sheet Panel**: 
  - Full supplier details
  - Edit form (expandable sections)
  - Products/Services list
  - Commercial conditions
  - Rating display
  - Contact info
  - Delete button with confirmation

**Visual Elements:**
- Verified badge: Green with CheckCircle icon
- Pending badge: Yellow with Clock icon
- Inactive badge: Gray
- Rating: 5-star display

### 5. Benchmarks Admin Page

**Route:** `/cost-consulting/admin/benchmarks`

**File:** `src/pages/cost-consulting/admin/CostBenchmarksAdmin.tsx`

**Features:**
- **Header**: Title with Admin badge, "Nuevo Benchmark" button, "Importar CSV" button
- **Stats Cards**: Categories, Data Points, Last Updated
- **Filters**: Category dropdown, Region, Year, Search
- **Table** (grouped by category):
  - Columns: Product, Unit, P10, P25, P50, P75, P90, Region, Valid Until
  - Price range visualization bar (gradient green→yellow→red)
- **Price Comparator Tool**:
  - Input: Product selector + Price input
  - Output: Percentile indicator with color (green if below P50, red if above)
- **Modal for Create/Edit**:
  - Category selector
  - Product name
  - Unit selector
  - 5 percentile inputs
  - Region (optional)
  - Validity dates
  - Source
  - Notes

**Visual Elements (Vandarum colors):**
- P10-P25 range: Green (#8cb63c)
- P25-P75 range: Yellow/Orange (#ffa720)
- P75-P90 range: Red

### 6. Component Files

```text
src/components/cost-consulting/admin/
├── SupplierAdminTable.tsx       - Table with filters
├── SupplierDetailSheet.tsx      - Detail panel
├── SupplierVerifyForm.tsx       - Verification form
├── ExtendedSupplierFormModal.tsx - Full create/edit form
├── BenchmarkTable.tsx           - Grouped table with bars
├── BenchmarkFormModal.tsx       - Create/edit modal
├── BenchmarkPriceBar.tsx        - Visual percentile bar
├── PriceComparator.tsx          - Price percentile checker
```

### 7. Routing Updates (`src/App.tsx`)

Add new admin routes:

```typescript
<Route path="/cost-consulting/admin/suppliers" element={<CostSuppliersAdmin />} />
<Route path="/cost-consulting/admin/benchmarks" element={<CostBenchmarksAdmin />} />
```

Update imports and exports in `src/pages/cost-consulting/index.ts`.

---

## Implementation Order

1. **Types & API** - Create interfaces and API service functions
2. **Hooks** - Implement React Query hooks for data fetching
3. **Supplier Components** - Build table, sheet, forms
4. **Supplier Page** - Assemble full admin page
5. **Benchmark Components** - Build table, modal, price bar
6. **Benchmark Page** - Assemble full admin page
7. **Routing** - Add routes and navigation

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/types/costConsulting.ts` |
| Create | `src/hooks/useCostAdminData.ts` |
| Create | `src/pages/cost-consulting/admin/CostSuppliersAdmin.tsx` |
| Create | `src/pages/cost-consulting/admin/CostBenchmarksAdmin.tsx` |
| Create | `src/components/cost-consulting/admin/SupplierDetailSheet.tsx` |
| Create | `src/components/cost-consulting/admin/ExtendedSupplierFormModal.tsx` |
| Create | `src/components/cost-consulting/admin/BenchmarkFormModal.tsx` |
| Create | `src/components/cost-consulting/admin/BenchmarkPriceBar.tsx` |
| Create | `src/components/cost-consulting/admin/PriceComparator.tsx` |
| Modify | `src/services/costConsultingApi.ts` - Add supplier & benchmark endpoints |
| Modify | `src/pages/cost-consulting/index.ts` - Export new pages |
| Modify | `src/App.tsx` - Add admin routes |

---

## Notes

- The existing `CostConsultingSuppliers.tsx` and `CostConsultingBenchmarks.tsx` pages will be replaced/upgraded
- All API calls use the Railway backend URL pattern
- Forms include Zod validation for input security
- Delete operations require confirmation dialogs
- The price comparator uses the percentile data to show where a given price falls
