
## Plan: Corregir carga de mensajes desde BD externa

### Problema detectado
Los chats recientes del Deep Advisor (posteriores al 18/01/2026) aparecen en el historial, pero al abrirlos, los mensajes aparecen vacíos. Según lo confirmado, **los mensajes SÍ existen** en la BD externa (`ktzhrlcvluaptixngrsh.supabase.co`).

### Causa raíz
El código actual en `useAdvisorChat.ts` consulta ambas BDs en paralelo pero:
1. Prioriza los resultados locales si existen (aunque estén vacíos en la BD local)
2. Solo usa la BD externa como fallback cuando la local devuelve error o está vacía

### Solución propuesta

**Archivo: `src/hooks/useAdvisorChat.ts`**

Modificar la función `loadChat` para:

1. **Priorizar BD externa para chats recientes**: Si el chat no tiene mensajes en la BD local, usar automáticamente los de la BD externa

2. **Añadir logging mejorado** para debugging:
   - Log de cuántos mensajes se encontraron en cada BD
   - Log de qué fuente se usó finalmente

3. **Combinar resultados inteligentemente**: Si la BD externa tiene mensajes y la local no, usar la externa sin importar el orden de llegada

### Cambios técnicos

```typescript
// En loadChat función
const [localResult, externalResult] = await Promise.all([
  fetchMessages(supabase),
  fetchMessages(externalSupabase)
]);

// Log para debugging
console.log('[loadChat] Local messages:', localResult.data?.length || 0);
console.log('[loadChat] External messages:', externalResult.data?.length || 0);

// Priorizar fuente con datos
let data: typeof localResult.data;
let source: string;

if (externalResult.data && externalResult.data.length > 0) {
  // Preferir BD externa para chats recientes (donde están los datos del Deep Advisor)
  data = externalResult.data;
  source = 'external';
} else if (localResult.data && localResult.data.length > 0) {
  data = localResult.data;
  source = 'local';
} else {
  data = [];
  source = 'none';
}

console.log('[loadChat] Using source:', source, 'with', data.length, 'messages');
```

### Resultado esperado
- Los chats del Deep Advisor (post 18/01) cargarán sus mensajes desde la BD externa
- Los chats antiguos (pre 18/01) seguirán cargando desde la BD local
- Logs mejorados facilitarán debugging futuro
