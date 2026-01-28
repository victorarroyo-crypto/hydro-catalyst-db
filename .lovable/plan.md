
# Plan: Prevenir Desconexiones Espurias Durante Streaming

## Diagnóstico

El streaming funcionó correctamente (los logs muestran ~71 segundos de SSE exitoso con status 200). Sin embargo, fuiste redirigido a la página de autenticación porque el componente detectó momentáneamente `isAuthenticated = false`.

Esto puede ocurrir cuando:
- React remonta el componente (por error de renderizado o cambio de estado)
- El contexto de autenticación se reinicializa brevemente
- Hay una condición de carrera entre el estado de carga y la lectura de localStorage

## Cambios Propuestos

### 1. Proteger la redirección durante streaming activo

Modificar el `useEffect` de autenticación en `AdvisorChat.tsx` para que **no redirija si hay un streaming en curso**:

```text
src/pages/advisor/AdvisorChat.tsx (líneas 105-109)
- Agregar verificación: si deepStream.isStreaming o isStreaming están activos, NO redirigir
- Esto previene que una fluctuación temporal del estado de autenticación interrumpa la respuesta
```

### 2. Agregar ref para tracking de streaming

Crear una referencia que persista entre renders para saber si se estaba haciendo streaming antes de una posible desconexión.

### 3. Validar localStorage antes de redirigir

Agregar una verificación directa de localStorage como "última línea de defensa" antes de ejecutar la navegación.

## Resultado Esperado

- Si estás recibiendo una respuesta de streaming, la aplicación **nunca** te redirigirá a la página de login
- Si hay una desconexión real de sesión, se mostrará un toast de error en lugar de redirigir abruptamente
- El streaming completará aunque haya fluctuaciones en el estado de autenticación
