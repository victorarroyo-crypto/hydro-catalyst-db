

## Diagnóstico: El trabajo no se lanza

### Problema Identificado

Los logs confirman que el **backend de Railway no está respondiendo**:

```text
[advisor-railway-proxy] Timeout after 180010ms  (GET /api/advisor/deep/config)
[advisor-railway-proxy] Timeout after 180007ms  (GET /api/advisor/deep/config)
[advisor-railway-proxy] Timeout after 180015ms  (GET /api/advisor/deep/config)
```

El flujo actual es:
1. Al abrir el chat, se llama a `/api/advisor/deep/config` para obtener modelos disponibles
2. Railway no responde → timeout de 3 minutos
3. Sin configuración, el `getValidatedConfig()` retorna `null`
4. El trabajo no puede iniciarse correctamente

### Propuesta de Mejora: Fallback a valores por defecto

Para que el Deep Advisor pueda funcionar **incluso cuando Railway está lento**, implementar fallbacks:

---

#### 1. Hook `useDeepAdvisorConfig.ts`

Añadir constantes de fallback y exportar función para obtener configuración con valores por defecto:

```typescript
const FALLBACK_CONFIG: Omit<DeepAdvisorConfigUpdate, 'user_id'> = {
  search_model: 'gpt-4o-mini',
  analysis_model: 'gpt-4o-mini',
  synthesis_model: 'deepseek',
  enable_web_search: true,
  enable_rag: true,
};

export function getConfigWithFallback(
  config: DeepAdvisorConfigResponse | undefined
): Omit<DeepAdvisorConfigUpdate, 'user_id'> {
  // Si tenemos config válida, la usamos
  const validated = getValidatedConfig(config);
  if (validated) return validated;
  
  // Si no, usamos fallback
  return FALLBACK_CONFIG;
}
```

---

#### 2. Componente `AdvisorChat.tsx`

En `handleSend()`, usar `getConfigWithFallback` en lugar de `getValidatedConfig`:

```typescript
// Antes (línea 288)
const validatedConfig = getValidatedConfig(deepConfig);

// Después
import { getConfigWithFallback } from '@/hooks/useDeepAdvisorConfig';
const validatedConfig = getConfigWithFallback(deepConfig);
```

Esto garantiza que **siempre** tengamos valores válidos para enviar, incluso si Railway tarda en responder.

---

#### 3. UI de estado del backend

El componente ya tiene el banner de "Servicio temporalmente no disponible" (línea 543), pero solo se muestra si `isConfigError` es true. Añadir detección de timeout:

```typescript
// Mostrar banner si hay error O si la query lleva más de 30s cargando
const showBackendWarning = isConfigError || 
  (deepConfig === undefined && !authLoading && advisorUser?.id);
```

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useDeepAdvisorConfig.ts` | Añadir `FALLBACK_CONFIG` y `getConfigWithFallback()` |
| `src/pages/advisor/AdvisorChat.tsx` | Usar `getConfigWithFallback()` en `handleSend()` |

---

### Resultado esperado

- El trabajo podrá **iniciarse** aunque Railway esté lento
- Se usarán modelos por defecto (económicos) mientras Railway no responde
- El usuario verá progreso en lugar de bloqueo

