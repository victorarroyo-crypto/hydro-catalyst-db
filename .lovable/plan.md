
# Plan: Corregir Error "Field Required" en Validar Todos

## Problema Identificado
El botón "Validar todos los documentos" falla con el error "Field required" porque el backend requiere un parametro `user_id` obligatorio para auditoría, pero el frontend no lo está enviando.

## Causa Raíz
En `CostConsultingDetail.tsx`, el componente `ReviewSummaryCard` se usa sin pasar la propiedad `userId`:

```tsx
<ReviewSummaryCard
  projectId={project?.id || ''}
  onAllValidated={() => {...}}
/>
// Falta: userId={user?.id}
```

El archivo ya tiene acceso al usuario via `const { user } = useAuth()`, pero no lo está pasando al componente.

## Solución

### Archivo a modificar
**`src/pages/cost-consulting/CostConsultingDetail.tsx`**

### Cambio
Agregar la propiedad `userId` al componente `ReviewSummaryCard` (líneas 1050-1056):

```tsx
<ReviewSummaryCard
  projectId={project?.id || ''}
  userId={user?.id}  // <-- Agregar esta línea
  onAllValidated={() => {
    refreshReview();
    queryClient.invalidateQueries({ queryKey: ['cost-project', id] });
  }}
/>
```

## Detalles Técnicos
- El hook `useDocumentReview` ya maneja correctamente el `userId` cuando se proporciona
- La función `validateAll` construye la URL con `user_id` como query parameter
- El backend FastAPI requiere este parámetro para registrar quién realizó la validación

## Resultado Esperado
Después del cambio, al hacer clic en "Validar todos", la petición incluirá el parámetro `user_id` requerido y la validación masiva funcionará correctamente.
