
# Plan: Componente CostDashboard - Dashboard Analítico Completo

## Resumen

Crear un componente `CostDashboard` que visualice los datos analíticos de un proyecto de Cost Consulting usando gráficos de Recharts. El dashboard consumirá el endpoint `GET /api/cost-consulting/projects/{projectId}/dashboard` y mostrará KPIs principales junto con tres vistas de gráficos intercambiables.

---

## Estructura de Archivos

```text
src/
├── components/cost-consulting/
│   └── CostDashboard.tsx           ← Componente principal (CREAR)
├── services/
│   └── costConsultingApi.ts        ← Añadir función getDashboard()
```

---

## Implementación Detallada

### 1. Servicio API (costConsultingApi.ts)

Añadir la función para consumir el endpoint de dashboard:

```typescript
// Tipos para Dashboard
export interface DashboardSummary {
  total_spend: number;
  total_savings_identified: number;
  savings_pct: number;
  opportunities_count: number;
  quick_wins_count: number;
  invoice_count: number;
  supplier_count: number;
  duplicate_candidates: number;
  potential_duplicate_savings: number;
}

export interface SpendByCategory {
  category_name: string;
  total_spend: number;
  pct_of_total: number;
  benchmark_comparison: 'excellent' | 'good' | 'average' | 'above_market';
}

export interface SpendBySupplier {
  supplier_name: string;
  total_spend: number;
  pct_of_total: number;
  invoice_count: number;
  risk_flags: { 
    single_source: boolean; 
    no_contract: boolean; 
    high_concentration: boolean; 
  };
}

export interface TimelinePoint {
  period: string;
  total_spend: number;
  invoice_count: number;
  top_category: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  spend_by_category: SpendByCategory[];
  spend_by_supplier: SpendBySupplier[];
  timeline: TimelinePoint[];
  opportunity_matrix?: Array<Record<string, unknown>>;
}

export const getDashboard = async (projectId: string): Promise<DashboardData> => {
  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/projects/${projectId}/dashboard`
  );
  if (!response.ok) throw new Error('Error fetching dashboard data');
  return response.json();
};
```

---

### 2. Componente CostDashboard

#### 2.1 Estructura del Componente

```typescript
interface CostDashboardProps {
  projectId: string;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ projectId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cost-dashboard', projectId],
    queryFn: () => getDashboard(projectId),
    enabled: !!projectId,
  });

  // ... render
};
```

#### 2.2 Subcomponentes Internos

| Componente | Función |
|------------|---------|
| `DashboardKPICards` | 4 tarjetas: Gasto Total, Ahorro Potencial, % Ahorro, Oportunidades |
| `SpendByCategoryChart` | Gráfico de barras horizontales con indicador de benchmark |
| `SpendBySupplierChart` | Gráfico de barras verticales con flags de riesgo en tooltip |
| `SpendTimelineChart` | Gráfico de líneas temporal con área |

#### 2.3 Layout Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                    ANÁLISIS DE COSTES                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ €425,000 │ │ €38,500  │ │   9.1%   │ │    12    │       │
│  │  Gasto   │ │  Ahorro  │ │ % Ahorro │ │ Oportunid│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Categorías] [Proveedores] [Timeline]               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │            < Gráfico activo aquí >                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Detalles de Gráficos (Recharts)

#### 3.1 SpendByCategoryChart
- **Tipo**: `BarChart` horizontal (layout="vertical")
- **Color de barras**: Dinámico según `benchmark_comparison`:
  - `excellent`: #8cb63c (verde)
  - `good`: #32b4cd (azul acento)
  - `average`: #ffa720 (warning)
  - `above_market`: #ef4444 (rojo)
- **Tooltip**: Muestra % del total y comparación benchmark

#### 3.2 SpendBySupplierChart
- **Tipo**: `BarChart` vertical
- **Color**: #307177 (principal)
- **Tooltip personalizado**: Muestra flags de riesgo con iconos

#### 3.3 SpendTimelineChart
- **Tipo**: `LineChart` con `Area` para el relleno
- **Eje X**: Periodos (meses)
- **Eje Y**: Gasto total
- **Color área**: #32b4cd con opacidad 0.3
- **Línea**: #307177

---

### 4. Paleta de Colores (Constantes)

```typescript
const BRAND_COLORS = {
  primary: '#307177',
  accent: '#32b4cd',
  positive: '#8cb63c',
  warning: '#ffa720',
  danger: '#ef4444',
};

const BENCHMARK_COLORS = {
  excellent: '#8cb63c',
  good: '#32b4cd',
  average: '#ffa720',
  above_market: '#ef4444',
};
```

---

### 5. Estados de UI

| Estado | Comportamiento |
|--------|----------------|
| `isLoading` | Skeleton loaders para KPIs y área de gráfico |
| `error` | Alert con mensaje y botón de reintentar |
| `data vacío` | EmptyState con mensaje informativo |
| `data válido` | Render completo del dashboard |

---

### 6. Dependencias Utilizadas

- `recharts` (ya instalado)
- `@tanstack/react-query` (ya instalado)
- Componentes UI: Card, Tabs, Badge, Skeleton
- Iconos: Euro, TrendingDown, Lightbulb, PieChart, BarChart3, Calendar

---

## Secuencia de Tareas

1. **Añadir tipos y función `getDashboard` a `costConsultingApi.ts`**
2. **Crear componente `CostDashboard.tsx`** con:
   - Hook useQuery para fetch de datos
   - Componente KPICards (4 tarjetas de métricas)
   - Tabs con 3 vistas de gráficos
   - Gráfico de categorías (barras horizontales)
   - Gráfico de proveedores (barras verticales)
   - Gráfico de timeline (líneas con área)
   - Estados de loading/error
3. **Exportar desde index.ts** del directorio cost-consulting
