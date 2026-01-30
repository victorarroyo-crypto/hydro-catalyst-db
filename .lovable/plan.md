

## Añadir Proxy de Exportación PDF en Deep Advisor

### Problema Actual

El frontend llama directamente a Railway para descargar el PDF, lo cual causa problemas de CORS:

```typescript
// Actual (línea 428-430) - FALLA por CORS
const response = await fetch(
  `${API_URL}/api/advisor/deep/export/pdf/${deepJob.jobId}`
);
```

### Solución

Añadir una ruta en la Edge Function `deep-advisor` que actúe como proxy para la exportación PDF.

---

### Cambios a implementar

#### 1. Edge Function: `supabase/functions/deep-advisor/index.ts`

Añadir nueva ruta `GET /export/pdf/:job_id` antes del bloque 404:

```typescript
// GET /export/pdf/:job_id - Exportar PDF del análisis
if (path.startsWith('/export/pdf/') && method === 'GET') {
  const jobId = path.split('/export/pdf/')[1];
  
  if (!jobId || !/^[\w-]+$/.test(jobId)) {
    return new Response(JSON.stringify({ error: 'Invalid job_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log(`[deep-advisor] Exporting PDF for job ${jobId}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const response = await fetch(
      `${railwayApiUrl}/api/advisor/deep/export/pdf/${jobId}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[deep-advisor] PDF export failed: ${response.status}`, errorText);
      return new Response(JSON.stringify({ 
        error: 'PDF generation failed',
        status: response.status 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const pdfBlob = await response.blob();
    
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vandarum_report_${jobId}.pdf"`,
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'PDF generation timed out' }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    throw error;
  }
}
```

---

#### 2. Frontend: `src/pages/advisor/AdvisorChat.tsx`

Cambiar la URL de descarga para usar la Edge Function (líneas 428-430):

**Antes:**
```typescript
const response = await fetch(
  `${API_URL}/api/advisor/deep/export/pdf/${deepJob.jobId}`
);
```

**Después:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/deep-advisor/export/pdf/${deepJob.jobId}`
);
```

También añadir el import de `VITE_SUPABASE_URL` al inicio del archivo (ya disponible en el entorno).

---

### Flujo de la solución

```text
Usuario click "Descargar PDF"
        │
        ▼
AdvisorChat.tsx
fetch(`${SUPABASE_URL}/functions/v1/deep-advisor/export/pdf/${jobId}`)
        │
        ▼
Edge Function deep-advisor
GET /export/pdf/:job_id
        │
        ▼
Railway Backend
GET /api/advisor/deep/export/pdf/:job_id
        │
        ▼
PDF binario retornado
        │
        ▼
Edge Function (proxy passthrough)
Content-Type: application/pdf
        │
        ▼
Browser descarga el archivo
```

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/deep-advisor/index.ts` | Añadir ruta `/export/pdf/:job_id` |
| `src/pages/advisor/AdvisorChat.tsx` | Cambiar URL a usar Edge Function |

---

### Resultado esperado

- El botón "Descargar PDF" funcionará correctamente sin problemas de CORS
- El PDF se descargará con nombre `vandarum_report_{job_id}.pdf`
- Los errores se manejarán con mensajes apropiados

