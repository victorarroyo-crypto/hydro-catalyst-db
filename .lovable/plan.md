
# Plan: Sincronizar Usuario a app_users en Restauración de Sesión

## Problema Actual
La sincronización a `app_users` solo ocurre en:
- Login explícito (`signIn`)
- Registro (`signUp`)  
- Evento `SIGNED_IN` en `onAuthStateChange`

Pero cuando un usuario ya logueado **recarga la página**, la sesión se restaura via `getSession()` y el evento puede ser `INITIAL_SESSION` (no `SIGNED_IN`), causando que el usuario **no se sincronice** a la base de datos externa.

## Cambios Propuestos

### Archivo: `src/contexts/AuthContext.tsx`

**Cambio 1: Sincronizar en `getSession()` (líneas 82-91)**

Actual:
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  if (session?.user) {
    fetchProfile(session.user.id);
  }
  
  setLoading(false);
});
```

Nuevo:
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  if (session?.user) {
    // Sync user on session restore (page refresh, etc.)
    syncUserToExternal(session.user);
    fetchProfile(session.user.id);
  }
  
  setLoading(false);
});
```

**Cambio 2: Ampliar condición en `onAuthStateChange` (líneas 66-69)**

Actual:
```typescript
if (event === 'SIGNED_IN') {
  syncUserToExternal(session.user);
}
```

Nuevo:
```typescript
if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  syncUserToExternal(session.user);
}
```

## Por qué esto resuelve el problema

1. **`getSession()`**: Se ejecuta siempre al cargar la app. Si hay sesión persistida, sincroniza inmediatamente.

2. **`INITIAL_SESSION`**: Evento que Supabase dispara cuando hay una sesión inicial (diferente a `SIGNED_IN` que es para logins nuevos).

3. **Upsert es idempotente**: Llamar `syncUserToExternal` múltiples veces no causa problemas - el `upsert` con `onConflict: 'id'` simplemente actualiza `updated_at`.

## Resultado Esperado
- Usuario recarga página → `getSession()` detecta sesión → `syncUserToExternal()` se ejecuta
- Usuario existe en `app_users` antes de intentar validar documentos
- FK constraint en `human_validated_by` funciona correctamente
