

## Fix: Desglose de Costes por Producto (not by cost type)

### Problem
The "Desglose de Costes" donut chart currently shows a breakdown by **cost type** (Productos, Portes, Recargos, Servicios, Descuentos). This is not useful because almost all spend falls under "Productos", making the chart show a single slice. The user expects to see a breakdown **by individual product** (e.g., Hipoclorito, Bisulfito, PAC...).

### Solution
Replace the donut chart data source: instead of using `s.desglose` (cost type breakdown), use `s.baselines` (product baselines) which already contains per-product spend data (`gasto_anual` or `precio_medio * volumen_total_kg`).

### Changes in `src/pages/chemicals/ChemDashboard.tsx`

**Replace the donut data construction (lines 87-95):**

From:
```js
const donutData = [
  { name: 'Productos', value: s.desglose.productos, pct: 0 },
  { name: 'Portes', value: s.desglose.portes, pct: 0 },
  ...
]
```

To:
```js
const donutData = s.baselines
  .map(b => ({
    name: b.producto,
    value: b.gasto_anual ?? (b.precio_medio * b.volumen_total_kg),
    pct: 0,
  }))
  .filter(d => d.value > 0)
  .sort((a, b) => b.value - a.value);

// Group small slices into "Otros" if more than 8 products
if (donutData.length > 8) {
  const top7 = donutData.slice(0, 7);
  const rest = donutData.slice(7);
  const otrosValue = rest.reduce((sum, d) => sum + d.value, 0);
  donutData.length = 0;
  donutData.push(...top7, { name: 'Otros', value: otrosValue, pct: 0 });
}
```

This reuses the existing baselines data already available in the summary. No new API calls needed.

**Also update the chart title** to "Desglose por Producto" for clarity.

**Keep the TCO cost-type bar** (at the bottom of the card) as-is since it still provides useful context about transport/surcharge percentages, or optionally remove it if it becomes redundant.

### Files to modify
- `src/pages/chemicals/ChemDashboard.tsx` -- replace donut data source and update title

