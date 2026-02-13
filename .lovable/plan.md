

## Migrar cliente Supabase en modulo Quimicos: de `supabase` a `externalSupabase`

Todos los archivos del modulo Quimicos (`src/pages/chemicals/`) actualmente usan el cliente local `supabase` para acceder a las tablas `chem_*`. Esto es incorrecto: los datos de quimicos viven en la base de datos externa (Railway/Supabase), por lo que deben usar `externalSupabase`.

### Archivos a modificar (12 archivos)

En cada archivo se realizara el mismo cambio:

1. **Reemplazar el import**: cambiar `import { supabase } from '@/integrations/supabase/client'` por `import { externalSupabase } from '@/integrations/supabase/externalClient'`
2. **Reemplazar todas las llamadas**: cambiar `supabase.from('chem_...` por `externalSupabase.from('chem_...`

| Archivo | Tablas usadas | Notas |
|---------|--------------|-------|
| `ChemProjectsList.tsx` | `chem_projects` | Tambien usa `supabase` local para auth (`useAuth`) - NO cambiar auth |
| `ChemProjectLayout.tsx` | `chem_projects` | Queries + update estado |
| `ChemDashboard.tsx` | `chem_projects`, `chem_products`, etc. | Solo queries |
| `ChemInventario.tsx` | `chem_products` | CRUD completo |
| `ChemContratos.tsx` | `chem_contract_audits`, `chem_contract_documents` | Incluye `supabase.storage` para documentos - storage se mantiene en local |
| `ChemBaseline.tsx` | `chem_products`, `chem_baselines`, `chem_projects` | Upserts |
| `ChemBenchmarking.tsx` | `chem_products`, `chem_benchmarks`, `chem_benchmark_library` | Upserts + library |
| `ChemHistorico.tsx` | `chem_products`, `chem_price_history` | CRUD |
| `ChemVisita.tsx` | `chem_plant_visits` | Upserts |
| `ChemRfqs.tsx` | `chem_products`, `chem_rfqs`, `chem_rfq_offers` | CRUD |
| `ChemAhorro.tsx` | `chem_savings`, `chem_products` | Solo queries |
| `ChemAutorizacion.tsx` | `chem_projects`, `chem_authorizations` | Upserts |

### Caso especial: ChemContratos.tsx

Este archivo usa `supabase.storage.from('chem-documents')` para subir/eliminar archivos. El storage vive en Lovable Cloud (local), asi que esas llamadas de storage se mantienen con `supabase`. Solo las llamadas `.from('chem_...')` de tablas se migran a `externalSupabase`. Esto requiere importar **ambos** clientes.

### Detalle tecnico

```typescript
// ANTES (en todos los archivos)
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('chem_projects')...

// DESPUES
import { externalSupabase } from '@/integrations/supabase/externalClient';
const { data } = await externalSupabase.from('chem_projects')...

// CASO ESPECIAL ChemContratos.tsx - ambos imports
import { supabase } from '@/integrations/supabase/client';          // para storage
import { externalSupabase } from '@/integrations/supabase/externalClient'; // para tablas
```

### Pasos de implementacion

1. Modificar los 12 archivos en paralelo, cambiando import y todas las referencias `supabase.from('chem_` a `externalSupabase.from('chem_`
2. En `ChemContratos.tsx`, mantener `supabase` para las operaciones de storage
3. Verificar que no se rompa ninguna funcionalidad de autenticacion (el `useAuth` sigue usando el contexto local)

