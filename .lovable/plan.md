
# Plan: Corregir error en cambio de tipo de documento

## Problemas Identificados

### 1. Falta `user_id` en las llamadas al backend

**Ubicación:** `src/pages/cost-consulting/CostConsultingDetail.tsx` línea 560

**Código actual:**
```typescript
useDocumentReview(id, undefined, project?.status === 'review');
```

**Problema:** El backend requiere `user_id` como parámetro obligatorio, pero se está pasando `undefined`.

**Error del backend:**
```json
{"detail":[{"type":"missing","loc":["query","user_id"],"msg":"Field required"}]}
```

### 2. Manejo de errores incorrecto

**Ubicación:** `src/hooks/useDocumentReview.ts` líneas 171-173

**Código actual:**
```typescript
const error = await response.json().catch(() => ({ detail: 'Error changing document type' }));
throw new Error(error.detail || 'Error changing document type');
```

**Problema:** `error.detail` es un array, no un string. Cuando se pasa a `new Error()`, se muestra como `[object Object]`.

---

## Solución

### Archivo 1: `src/pages/cost-consulting/CostConsultingDetail.tsx`

**Cambio 1:** Importar `useAuth`
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Cambio 2:** Obtener el usuario dentro del componente
```typescript
const CostConsultingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();  // AÑADIR ESTA LÍNEA
  // ...
```

**Cambio 3:** Pasar `user?.id` al hook
```typescript
} = useDocumentReview(id, user?.id, project?.status === 'review');
//                        ^^^^^^^^^ Cambiar undefined por user?.id
```

### Archivo 2: `src/hooks/useDocumentReview.ts`

**Cambio:** Mejorar el parsing de errores del backend

```typescript
// Función helper para extraer mensaje de error
const parseErrorMessage = (errorData: unknown, defaultMsg: string): string => {
  if (!errorData) return defaultMsg;
  
  // Si detail es un string, devolverlo directamente
  if (typeof errorData === 'object' && 'detail' in errorData) {
    const detail = (errorData as { detail: unknown }).detail;
    
    if (typeof detail === 'string') {
      return detail;
    }
    
    // Si detail es un array (formato Pydantic/FastAPI)
    if (Array.isArray(detail) && detail.length > 0) {
      const firstError = detail[0];
      if (firstError && typeof firstError === 'object' && 'msg' in firstError) {
        return firstError.msg;
      }
    }
  }
  
  return defaultMsg;
};
```

Luego usar esta función en los catch blocks:
```typescript
// En changeDocumentType
if (!response.ok) {
  const errorData = await response.json().catch(() => null);
  const message = parseErrorMessage(errorData, 'Error al cambiar el tipo del documento');
  throw new Error(message);
}

// En validateDocument
if (!response.ok) {
  const errorData = await response.json().catch(() => null);
  const message = parseErrorMessage(errorData, 'Error al validar el documento');
  throw new Error(message);
}

// En validateAll
if (!response.ok) {
  const errorData = await response.json().catch(() => null);
  const message = parseErrorMessage(errorData, 'Error al validar los documentos');
  throw new Error(message);
}
```

---

## Resumen de Cambios

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `CostConsultingDetail.tsx` | Import | Añadir `import { useAuth }` |
| `CostConsultingDetail.tsx` | ~507 | Añadir `const { user } = useAuth();` |
| `CostConsultingDetail.tsx` | ~560 | Cambiar `undefined` por `user?.id` |
| `useDocumentReview.ts` | ~10 | Añadir función `parseErrorMessage` |
| `useDocumentReview.ts` | ~171 | Usar `parseErrorMessage` en `changeDocumentType` |
| `useDocumentReview.ts` | ~144 | Usar `parseErrorMessage` en `validateDocument` |
| `useDocumentReview.ts` | ~201 | Usar `parseErrorMessage` en `validateAll` |

---

## Resultado Esperado

Después de estos cambios:
- El `user_id` se enviará correctamente al backend
- Si hay errores, se mostrarán mensajes legibles como "Field required" en vez de "[object Object]"
- El cambio de tipo de factura a contrato funcionará correctamente
