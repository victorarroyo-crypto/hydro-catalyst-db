
# Plan: Hacer que el aviso de documento duplicado persista

## Problema Actual

Cuando se detecta un documento duplicado, el toast de aviso desaparece automáticamente después de 6 segundos:

```typescript
toast.warning(
  `Documento duplicado: "${docName}" ya existe en la base de conocimiento`,
  { duration: 6000 }  // 6 segundos
);
```

## Solución

Modificar el toast para que persista indefinidamente hasta que el usuario lo cierre manualmente.

## Cambio Necesario

### Archivo: `src/pages/KnowledgeBase.tsx`

**Línea 548-551** - Cambiar `duration` a `Infinity`:

```typescript
// ANTES
toast.warning(
  `Documento duplicado: "${docName}" ya existe en la base de conocimiento`,
  { duration: 6000 }
);

// DESPUÉS
toast.warning(
  `Documento duplicado: "${docName}" ya existe en la base de conocimiento`,
  { duration: Infinity }
);
```

## Comportamiento Esperado

| Antes | Después |
|-------|---------|
| El aviso desaparece en 6 segundos | El aviso permanece visible |
| El usuario puede no verlo si no mira | El usuario debe cerrarlo manualmente (clic en X) |

## Notas Técnicas

- Sonner (la librería de toasts) soporta `duration: Infinity` para toasts persistentes
- El usuario puede cerrar el toast haciendo clic en la X o deslizándolo
- No requiere cambios adicionales en la configuración del Toaster
