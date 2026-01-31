
# Plan: Simplificar Zona de Entrada del Chat

## Objetivo
Eliminar la banda horizontal inferior que divide visualmente la pantalla y resta espacio al chat, dejando solo el campo de entrada limpio.

---

## Cambios Propuestos

### Archivo: `src/pages/advisor/AdvisorChat.tsx`

**1. Eliminar el fondo con gradiente oscuro del contenedor de input**

Línea 961 actual:
```tsx
<div className="border-t p-4 pb-6" style={{ background: 'linear-gradient(180deg, rgba(48,113,119,0.03) 0%, rgba(50,180,205,0.05) 100%)' }}>
```

Cambiar a:
```tsx
<div className="p-4">
```

Esto elimina:
- El `border-t` que crea la línea divisoria
- El fondo con gradiente oscuro
- El padding inferior extra (`pb-6`)

**2. Eliminar el `CompactUsageHint`**

Líneas 969-972 - Eliminar completamente:
```tsx
<CompactUsageHint 
  onOpenGuide={() => setIsGuideOpen(true)} 
  isDeepMode={deepMode}
/>
```

Este componente muestra una barra con tips que ocupa espacio horizontal.

**3. Simplificar el indicador de créditos**

Líneas 1034-1043 - Reducir a una línea más compacta o eliminarlo si el usuario lo prefiere. Propuesta: mantenerlo pero más discreto, centrado y sin el separador.

---

## Resultado Visual

| Antes | Después |
|-------|---------|
| Banda con gradiente oscuro | Fondo transparente |
| Borde superior visible | Sin borde divisorio |
| CompactUsageHint (barra de tips) | Eliminado |
| Padding generoso | Padding compacto |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/advisor/AdvisorChat.tsx` | Eliminar estilos de fondo, border-t, y CompactUsageHint |

El chat ocupará más espacio vertical y la transición al área de entrada será más fluida y sin interrupciones visuales.
