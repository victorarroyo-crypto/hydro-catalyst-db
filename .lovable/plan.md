

## Plan: Soporte para PDF Pre-Generado en Supabase Storage

### Contexto

El backend de Railway ahora puede devolver dos tipos de respuesta para la exportación de PDF:

| Content-Type | Contenido | Acción |
|--------------|-----------|--------|
| `application/json` | `{ pdf_url, expires_at, job_id }` | Abrir `pdf_url` directamente en nueva pestaña |
| `application/pdf` | Binario PDF | Descargar el blob como antes (fallback) |

---

### Cambios a Implementar

#### 1. Edge Function `deep-advisor/index.ts`

**Ruta afectada**: `GET /export/pdf/:job_id` (líneas 169-247)

Modificar para:
- Detectar el `Content-Type` de la respuesta de Railway
- Si es `application/json`: pasar el JSON directamente al cliente
- Si es `application/pdf` o cualquier otro: mantener el comportamiento actual (proxy del binario)

```typescript
// Dentro del handler de /export/pdf/:job_id
const contentType = response.headers.get('content-type') || '';

if (contentType.includes('application/json')) {
  // Railway devuelve JSON con pdf_url pre-generada
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Fallback: PDF binario (comportamiento actual)
const pdfBuffer = await response.arrayBuffer();
return new Response(pdfBuffer, {
  status: 200,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="vandarum_report_${jobId}.pdf"`,
  },
});
```

---

#### 2. Frontend `AdvisorChat.tsx`

**Función afectada**: `handleDownloadPDF` (líneas 422-454)

Modificar para:
- Verificar el `Content-Type` de la respuesta
- Si es JSON: extraer `pdf_url` y abrir en nueva pestaña con `window.open()`
- Si es blob/PDF: descargar como archivo (comportamiento actual)

```typescript
const handleDownloadPDF = async () => {
  if (!deepJob.jobId || isDownloadingPdf) return;
  
  setIsDownloadingPdf(true);
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/deep-advisor/export/pdf/${deepJob.jobId}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Nueva respuesta: PDF pre-generado en Storage
      const data = await response.json();
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast.success('PDF abierto en nueva pestaña');
        return;
      }
      throw new Error('pdf_url no encontrada en respuesta');
    }
    
    // Fallback: PDF binario directo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vandarum_advisor_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF descargado correctamente');
  } catch (error) {
    console.error('[AdvisorChat] PDF download error:', error);
    toast.error('Error al descargar PDF. Inténtalo de nuevo.');
  } finally {
    setIsDownloadingPdf(false);
  }
};
```

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/deep-advisor/index.ts` | Detectar Content-Type y pasar JSON si corresponde |
| `src/pages/advisor/AdvisorChat.tsx` | Manejar respuesta JSON con `pdf_url` o blob PDF |

---

### Flujo Resultante

```text
Usuario → "Descargar PDF"
    ↓
Frontend → GET /deep-advisor/export/pdf/{job_id}
    ↓
Edge Function → GET Railway /api/advisor/deep/export/pdf/{job_id}
    ↓
Railway responde:
    ├── JSON { pdf_url, expires_at } → Edge pasa JSON → Frontend abre pdf_url
    └── PDF binario                  → Edge pasa blob → Frontend descarga archivo
```

---

### Beneficios

- **Más rápido**: El PDF ya está pre-generado en Storage, sin esperar generación en tiempo real
- **Más robusto**: Evita timeouts de Edge Functions (~60s) ya que solo devuelve una URL
- **Retrocompatible**: Jobs antiguos siguen funcionando con el flujo de descarga binaria

