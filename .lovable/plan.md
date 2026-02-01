
# Plan: Unificar Autenticacion Cost Consulting con Auth Principal

## Problema Identificado
El modulo Cost Consulting usa un sistema de autenticacion separado (`AdvisorAuthContext` con tabla `advisor_users`) que es independiente del sistema principal de Supabase Auth. Esto causa que usuarios ya autenticados en la app vean el error "Debes iniciar sesion".

## Solucion Propuesta
Modificar el modulo Cost Consulting para usar el usuario de Supabase Auth existente en lugar de requerir autenticacion adicional con AdvisorAuth.

---

## Cambios a Realizar

### 1. Modificar CostConsultingNew.tsx

**Cambios:**
- Reemplazar `useAdvisorAuth()` por `useAuth()` del contexto principal
- Usar `user.id` de Supabase Auth en lugar de `advisorUser.id`

```typescript
// ANTES
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
const { advisorUser } = useAdvisorAuth();
// ...
user_id: advisorUser.id,

// DESPUES  
import { useAuth } from '@/contexts/AuthContext';
const { user } = useAuth();
// ...
user_id: user.id,
```

**Actualizar validacion:**
```typescript
// ANTES
if (!canProceed() || !advisorUser) {
  if (!advisorUser) {
    toast.error('Debes iniciar sesión...');
  }

// DESPUES
if (!canProceed() || !user) {
  if (!user) {
    toast.error('Sesión expirada. Por favor recarga la página.');
  }
```

### 2. Modificar useCostConsultingData.ts

**Cambios:**
- Reemplazar `useAdvisorAuth()` por `useAuth()`
- Actualizar la logica de filtrado por `user_id`

```typescript
// ANTES
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
const { advisorUser } = useAdvisorAuth();
const userId = advisorUser?.id;

// DESPUES
import { useAuth } from '@/contexts/AuthContext';
const { user } = useAuth();
const userId = user?.id;
```

### 3. Actualizar App.tsx - Remover AdvisorAuthProvider de rutas Cost Consulting

**Cambios:**
Las rutas de Cost Consulting ya estan dentro de `AppLayout` que requiere autenticacion principal. No necesitan el wrapper adicional de `AdvisorAuthProvider`.

```typescript
// ANTES
<Route path="/cost-consulting" element={<AdvisorAuthProvider><CostConsultingList /></AdvisorAuthProvider>} />
<Route path="/cost-consulting/new" element={<AdvisorAuthProvider><CostConsultingNew /></AdvisorAuthProvider>} />
// ... etc

// DESPUES
<Route path="/cost-consulting" element={<CostConsultingList />} />
<Route path="/cost-consulting/new" element={<CostConsultingNew />} />
// ... etc
```

### 4. Verificar CostConsultingList.tsx y otros componentes

Revisar y actualizar cualquier otro componente de Cost Consulting que use `useAdvisorAuth`:
- CostConsultingList.tsx
- CostConsultingDetail.tsx
- Otros archivos en `/pages/cost-consulting/`

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Remover `AdvisorAuthProvider` wrapper de rutas cost-consulting |
| `src/pages/cost-consulting/CostConsultingNew.tsx` | Cambiar de `useAdvisorAuth` a `useAuth` |
| `src/hooks/useCostConsultingData.ts` | Cambiar de `useAdvisorAuth` a `useAuth` |
| `src/pages/cost-consulting/CostConsultingList.tsx` | Verificar y actualizar si usa AdvisorAuth |

---

## Consideraciones Tecnicas

### Base de datos externa
La tabla `cost_consulting_projects` en la base de datos externa tiene un campo `user_id`. Este campo debera almacenar el UUID del usuario de Supabase Auth (que es diferente del ID de advisor_users).

**Verificar compatibilidad:** Ambos son UUIDs, por lo que deberia ser compatible. Los proyectos existentes creados con IDs de advisor_users quedaran huerfanos, pero como es un modulo nuevo esto no deberia ser problema.

### Beneficios
1. UX simplificada - no mas doble login
2. Codigo mas limpio - un solo sistema de auth
3. Consistencia con el resto de la aplicacion

