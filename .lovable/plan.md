
# Plan: Habilitar Re-extracción para Documentos Duplicados (Error 409)

## Problema Identificado

Cuando se sube un documento que ya existe en Railway, el sistema devuelve error **409 Duplicate**. Actualmente:

1. La Edge Function retorna `success: false` porque `response.ok` es `false` para status 409
2. El modal de upload detecta `!data?.success` y lanza un error
3. La función `handleUploadComplete()` nunca se ejecuta
4. El estado `pendingReExtraction` nunca se activa
5. El botón "Re-extraer documentos" no aparece

**Resultado:** El documento ya existe y está listo para procesar, pero el usuario no puede activar la re-extracción.

## Solución

### 1. Edge Function: Tratar 409 como éxito (idempotencia)

**Archivo:** `supabase/functions/cost-consulting-upload/index.ts`

Agregar manejo especial para respuesta 409 antes de retornar:

```typescript
// Línea ~119, después de obtener la respuesta de Railway
const responseText = await response.text();
console.log(`Railway response (${response.status}):`, responseText);

let responseData;
try {
  responseData = JSON.parse(responseText);
} catch {
  responseData = { raw: responseText };
}

// NUEVO: Si Railway devuelve 409 (duplicado), tratarlo como éxito
if (response.status === 409) {
  console.log('Document already exists in Railway, treating as success');
  return new Response(JSON.stringify({
    success: true,           // <-- Cambio clave
    status: 200,
    file_url: fileUrl,
    already_exists: true,    // <-- Flag para el frontend
    message: 'Documento ya registrado previamente',
    ...responseData,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Resto del código existente...
return new Response(JSON.stringify({
  success: response.ok,
  status: response.status,
  file_url: fileUrl,
  ...responseData,
}), ...);
```

### 2. Frontend: Manejar documentos duplicados informativamente

**Archivo:** `src/components/cost-consulting/UploadMoreDocumentsModal.tsx`

Actualizar `handleUpload` para reconocer documentos existentes:

```typescript
// Línea ~103, después de recibir respuesta del Edge Function
const { data, error } = await supabase.functions.invoke('cost-consulting-upload', {
  body: formData,
});

if (error) {
  throw new Error(`Error subiendo ${file.name}: ${error.message}`);
}

// NUEVO: Manejar documento duplicado como información, no error
if (data?.already_exists) {
  console.log(`${file.name} ya existía, continuando...`);
  // Opcional: mostrar toast informativo
} else if (!data?.success) {
  // Mostrar mensaje real del backend
  const errorMessage = data?.detail || data?.error || data?.message || 'Error desconocido';
  throw new Error(`Error subiendo ${file.name}: ${errorMessage}`);
}
```

También mejorar el mensaje de éxito final:

```typescript
// Línea ~118, mensaje de éxito
setUploadComplete(true);
toast.success('Documentos procesados', {
  description: 'Ejecuta "Re-extraer documentos" para procesarlos.',
});
```

## Flujo Resultante

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────┐
│ Usuario sube    │ ──► │ Edge Function │ ──► │   Railway   │
│ documento.xlsx  │     │               │     │             │
└─────────────────┘     └───────────────┘     └─────────────┘
                              │                     │
                              │               ┌─────┴─────┐
                              │               │ 200 OK    │ → Nuevo doc
                              │               │ 409 Dup   │ → Ya existe
                              │               └───────────┘
                              ▼
                   ┌────────────────────────┐
                   │ Edge Function retorna: │
                   │ • 200 → success: true  │
                   │ • 409 → success: true  │ ◄── CAMBIO
                   │         already_exists │
                   └────────────────────────┘
                              │
                              ▼
                   ┌────────────────────────┐
                   │ Modal llama:           │
                   │ handleUploadComplete() │
                   └────────────────────────┘
                              │
                              ▼
                   ┌────────────────────────┐
                   │ pendingReExtraction    │
                   │ = true                 │
                   └────────────────────────┘
                              │
                              ▼
                   ┌────────────────────────┐
                   │ Botón "Re-extraer"     │
                   │ VISIBLE ✓              │
                   └────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/cost-consulting-upload/index.ts` | Tratar status 409 como `success: true` con flag `already_exists` |
| `src/components/cost-consulting/UploadMoreDocumentsModal.tsx` | Reconocer `already_exists` y mostrar mensaje informativo |

## Resultado Esperado

- Documentos que ya existen en Railway no bloquean el flujo
- El usuario ve un mensaje informativo (opcional) si el documento ya existía
- `handleUploadComplete()` siempre se ejecuta si no hay errores reales
- El botón "Re-extraer documentos" aparece correctamente
- El usuario puede iniciar la re-extracción para procesar los documentos pendientes
