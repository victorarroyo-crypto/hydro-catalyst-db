
# Plan: Limpiar Adjuntos al Iniciar Nuevo Chat

## Problema Identificado
Cuando el usuario hace clic en "Nuevo Chat", el handler en `AdvisorChat.tsx` llama a `startNewChat()` y `deepStream.reset()`, pero **no limpia el array de adjuntos ni el estado de progreso de upload**. Esto causa que los documentos subidos en la sesión anterior permanezcan visibles en el sidebar.

## Solución
Agregar la limpieza de adjuntos y estado de upload en el handler de "Nuevo Chat".

## Cambio Propuesto

**Archivo:** `src/pages/advisor/AdvisorChat.tsx`

**Antes (líneas 417-420):**
```tsx
onNewChat={() => {
  startNewChat();
  deepStream.reset();
}}
```

**Después:**
```tsx
onNewChat={() => {
  startNewChat();
  deepStream.reset();
  // Clear attachments and upload state when starting a new chat
  setAttachments([]);
  setUploadProgress({ status: 'idle', progress: 0, completedCount: 0, totalCount: 0 });
}}
```

## Impacto
- **Mínimo:** Solo 2 líneas adicionales
- **Sin riesgo:** Usa las mismas funciones que ya se usan en otras partes del código (línea 305-306)
- **UX mejorada:** Al iniciar un nuevo chat, el sidebar de adjuntos se oculta automáticamente ya que `attachments.length === 0`
