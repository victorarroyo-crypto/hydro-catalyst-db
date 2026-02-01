

# Plan: Subir Documentos via Backend Railway

## Resumen del Problema
El módulo Cost Consulting intenta subir archivos directamente al storage de Supabase externa (`cost-documents` bucket), pero este bucket no existe, causando errores 404 y dejando los proyectos bloqueados en estado "processing".

## Solución
Crear un flujo de subida que pase por el backend de Railway, siguiendo el patrón ya establecido en otros módulos (Knowledge Base, Case Studies). El backend de Railway gestionará el almacenamiento de los archivos.

---

## Arquitectura Propuesta

```
Frontend                    Edge Function                    Railway Backend
   │                            │                                  │
   │  POST FormData            │                                  │
   │  (file + metadata)        │                                  │
   ├───────────────────────────►│                                  │
   │                            │  POST FormData                   │
   │                            │  + X-Sync-Secret                 │
   │                            ├─────────────────────────────────►│
   │                            │                                  │
   │                            │◄─────────────────────────────────┤
   │                            │  { file_url, document_id }       │
   │◄───────────────────────────┤                                  │
   │                            │                                  │
```

---

## Cambios a Realizar

### 1. Crear Edge Function: `cost-consulting-upload`

Nueva edge function que:
- Recibe archivos via FormData desde el frontend
- Autentica al usuario via JWT
- Reenvía los archivos al endpoint de Railway `/api/cost-consulting/projects/{id}/documents`
- Incluye el header `X-Sync-Secret` para autenticación con Railway

**Archivo:** `supabase/functions/cost-consulting-upload/index.ts`

```typescript
// Estructura base
- Recibir POST con FormData (file, file_type, project_id)
- Validar autenticación JWT
- Obtener RAILWAY_API_URL y RAILWAY_SYNC_SECRET de env
- Reenviar FormData a Railway: POST /api/cost-consulting/projects/{project_id}/documents
- Retornar respuesta (file_url, document_id) al frontend
```

**Headers CORS:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 2. Modificar `CostConsultingNew.tsx`

Reemplazar las llamadas a `externalSupabase.storage` por llamadas al nuevo edge function.

**Cambios:**
- Importar `supabase` del cliente local (para invocar edge functions)
- Crear función `uploadDocument` que:
  1. Construye FormData con file, file_type, project_id
  2. Llama a `supabase.functions.invoke('cost-consulting-upload', { body: formData })`
  3. Retorna { file_url, document_id }

- Eliminar la creación manual de registros en `cost_project_documents` (Railway lo hará)
- Mejorar manejo de errores con contador de uploads exitosos/fallidos
- Si no hay uploads exitosos, revertir proyecto a 'draft' y mostrar error claro

**Código actual a reemplazar:**
```typescript
// ANTES (líneas 287-318)
const { error: uploadError } = await externalSupabase.storage
  .from('cost-documents')
  .upload(filePath, file);
// ... crear registro en cost_project_documents manualmente
```

**Código nuevo:**
```typescript
// DESPUÉS
const { data, error } = await supabase.functions.invoke('cost-consulting-upload', {
  body: formData,  // FormData con file, file_type, project_id
});
if (error) {
  console.error('Upload error:', error);
  failedUploads++;
  continue;
}
successfulUploads++;
// Railway crea el registro en cost_project_documents automáticamente
```

### 3. Modificar `CostConsultingDetail.tsx`

Añadir detección de proyectos "atascados" (processing sin documentos).

**Cambios:**
- Detectar `isProcessing && documents.length === 0`
- Mostrar mensaje informativo con opciones:
  - "Crear nuevo análisis"
  - "Volver a proyectos"
- No mostrar el spinner infinito de ProcessingState

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/functions/cost-consulting-upload/index.ts` | Crear | Edge function para proxy de uploads a Railway |
| `src/pages/cost-consulting/CostConsultingNew.tsx` | Modificar | Usar edge function en lugar de storage directo |
| `src/pages/cost-consulting/CostConsultingDetail.tsx` | Modificar | Detectar proyectos sin documentos |

---

## Detalles Técnicos

### Edge Function: cost-consulting-upload

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticar usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parsear FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string;
    const projectId = formData.get('project_id') as string;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing file or project_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Enviar a Railway
    const railwayUrl = Deno.env.get('RAILWAY_API_URL');
    const syncSecret = Deno.env.get('RAILWAY_SYNC_SECRET');

    if (!railwayUrl) {
      return new Response(JSON.stringify({ error: 'Backend not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const railwayFormData = new FormData();
    railwayFormData.append('file', file);
    railwayFormData.append('file_type', fileType || 'otro');

    const response = await fetch(
      `${railwayUrl}/api/cost-consulting/projects/${projectId}/documents`,
      {
        method: 'POST',
        headers: {
          'X-Sync-Secret': syncSecret || '',
          'X-User-Id': userData.user.id,
        },
        body: railwayFormData,
      }
    );

    const responseData = await response.json();

    return new Response(JSON.stringify({
      success: response.ok,
      ...responseData,
    }), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Cambios en CostConsultingNew.tsx

```typescript
// Importar cliente local de Supabase
import { supabase } from '@/integrations/supabase/client';

// Nueva función de upload
const uploadDocument = async (
  file: File, 
  fileType: string, 
  projectId: string
): Promise<{ success: boolean; error?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  formData.append('project_id', projectId);

  const { data, error } = await supabase.functions.invoke(
    'cost-consulting-upload',
    { body: formData }
  );

  if (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }

  return { success: data?.success ?? false, error: data?.error };
};

// En handleSubmit, reemplazar el loop de uploads:
let successfulUploads = 0;
let failedUploads = 0;

for (const fileData of allFiles) {
  const result = await uploadDocument(
    fileData.file, 
    fileData.type, 
    projectId
  );
  
  if (result.success) {
    successfulUploads++;
  } else {
    failedUploads++;
    console.error(`Failed to upload ${fileData.file.name}:`, result.error);
  }
}

// Verificar si hubo uploads exitosos
if (successfulUploads === 0 && allFiles.length > 0) {
  await externalSupabase
    .from('cost_consulting_projects')
    .update({ status: 'draft' })
    .eq('id', projectId);
  
  toast.error('Error al subir documentos. Por favor intenta de nuevo.');
  setIsSubmitting(false);
  return;
}

// Notificar uploads fallidos pero continuar si hay éxitos
if (failedUploads > 0) {
  toast.warning(`${failedUploads} archivo(s) no se pudieron subir`);
}
```

---

## Dependencias

Este plan asume que el backend de Railway tiene implementado el endpoint:

```
POST /api/cost-consulting/projects/{project_id}/documents
Content-Type: multipart/form-data

Body:
- file: File (PDF/XLSX)
- file_type: string ('contrato' | 'factura' | 'listado_proveedores' | 'otro')

Response:
{
  "success": true,
  "document_id": "uuid",
  "file_url": "https://..."
}
```

Si este endpoint no existe en Railway, habrá que crearlo en el backend de Python/FastAPI.

---

## Beneficios

1. **Elimina dependencia del bucket** - No necesitamos crear bucket en Supabase externa
2. **Sigue patrón existente** - Usa el mismo flujo que Knowledge Base y Case Studies
3. **Mejor manejo de errores** - Usuarios ven mensajes claros cuando algo falla
4. **No más spinners infinitos** - Proyectos sin documentos muestran opciones de acción

