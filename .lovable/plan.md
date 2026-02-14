
# Rediseno radical del Dashboard General de Cost Consulting

## Problema
El dashboard actual (`CostDashboard.tsx`) solo consume un unico endpoint (`/dashboard`) y muestra 4 KPIs basicos + 3 graficos en tabs. El proyecto ahora tiene endpoints ricos para: contratos, facturas, proveedores, documentos, oportunidades, duplicados, benchmarks, timeline analytics y matriz de oportunidades. Nada de esto se refleja en el dashboard.

## Nuevo diseno

### Layout (de arriba a abajo)

**Fila 1 -- 6 KPI Cards**
| Gasto Total | Ahorro Potencial | % Ahorro | Facturas | Proveedores | Duplicados |
Cada card con icono, valor principal y subtitulo contextual. La card de duplicados muestra pending count y ahorro potencial por duplicados.

**Fila 2 -- 2 columnas**
- **Izquierda (60%)**: Grafico de categorias con benchmark (SpendByCategoryChart, ya existente y bien hecho)
- **Derecha (40%)**: Matriz de Oportunidades compacta -- resumen visual de los 4 cuadrantes (Quick Wins, Major Projects, Fill-ins, Low Priority) con count + ahorro total por cuadrante

**Fila 3 -- 2 columnas**
- **Izquierda (50%)**: Gasto por proveedor (barras horizontales top 8, con risk flags en color)
- **Derecha (50%)**: Evolucion temporal (area chart mensual, ya existente)

**Fila 4 -- Benchmark Comparison** (nueva)
- Tabla compacta con categorias, tu precio vs benchmark mediana, posicion (dot de color), y ahorro potencial por categoria

### Fuentes de datos

Se mantiene la query principal al endpoint `/dashboard` que ya devuelve summary, spend_by_category, spend_by_supplier y timeline.

Se agregan 2 queries adicionales (ligeras):
1. `getOpportunityMatrix(projectId)` -- para la mini-matriz
2. `getBenchmarkComparison(projectId)` -- para la tabla de benchmarks
3. `getDuplicateStats(projectId)` -- para el KPI de duplicados

Todas estas funciones ya existen en `costConsultingApi.ts`, solo hay que importarlas y llamarlas.

## Seccion tecnica

### Archivo a modificar: `src/components/cost-consulting/CostDashboard.tsx`

**Cambios principales:**

1. **Imports adicionales**: Agregar `getOpportunityMatrix`, `getBenchmarkComparison`, `getDuplicateStats` y sus tipos desde `costConsultingApi.ts`

2. **Queries adicionales** en el componente principal:
```text
useQuery(['cost-opportunity-matrix', projectId], () => getOpportunityMatrix(projectId))
useQuery(['cost-benchmarks', projectId], () => getBenchmarkComparison(projectId))
useQuery(['cost-duplicate-stats', projectId], () => getDuplicateStats(projectId))
```
Estas queries son independientes y opcionales (si fallan, esas secciones simplemente no se muestran).

3. **KPI Cards ampliadas**: De 4 a 6, agregando "Facturas" (invoice_count) y "Duplicados" (del duplicateStats).

4. **Nuevo subcomponente `OpportunityMatrixMini`**: Cuadricula 2x2 con los 4 cuadrantes. Cada celda muestra el nombre, count de oportunidades y ahorro total. Quick Wins resaltado en verde, Major Projects en azul, etc.

5. **Nuevo subcomponente `BenchmarkTable`**: Tabla compacta con columnas: Categoria, Tu Precio, Mediana Mercado, Posicion (dot color), Ahorro Potencial. Usa datos de `getBenchmarkComparison`.

6. **Layout refactorizado**: Eliminar el sistema de Tabs y mostrar todo en un grid fluido con las 4 filas descritas arriba. Cada seccion en su propia Card.

7. **Mantener sin cambios**: `SpendByCategoryChart` (importado), `formatCurrency`, `formatPercent`, `KPICard`, `KPICardSkeleton`, tooltips de proveedores.

### Archivos que NO se tocan
- `src/pages/cost-consulting/CostConsultingDashboard.tsx` (wrapper, sin cambios)
- `src/components/cost-consulting/SpendByCategoryChart.tsx` (ya funciona bien)
- `src/services/costConsultingApi.ts` (las funciones ya existen)

### Manejo de errores
Las queries adicionales (matrix, benchmarks, duplicates) se tratan como opcionales: si fallan o no devuelven datos, esa seccion simplemente se oculta con un fallback elegante. Solo la query principal de dashboard es bloqueante.
