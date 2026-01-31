
# Plan: Persistencia de Descarga de PDFs entre Sesiones

## Problema Identificado

Cuando completas un análisis con Deep Advisor:
- El botón "Descargar informe" funciona correctamente **durante la sesión actual**
- Si inicias un nuevo chat o vuelves al día siguiente, **ya no puedes descargar el PDF** fácilmente

La funcionalidad de descarga para mensajes históricos **SÍ existe**, pero tiene limitaciones que hacen que no sea tan visible o útil como la original.

---

## Situación Actual

| Escenario | ¿Funciona? | Cómo |
|-----------|-----------|------|
| Descargar justo después de análisis | ✅ | Usa datos en memoria (`deepJob.result`) |
| Descargar mismo chat, recargado | ⚠️ | Usa `message.content` si mensaje > 500 chars |
| Descargar desde historial días después | ⚠️ | Mismo mecanismo, pero botón poco visible |

El botón de descarga para mensajes históricos existe (línea 793-806 del código), pero:
1. Solo aparece si `message.content.length > 500`
2. No tiene acceso a las fuentes/sources originales del análisis profundo
3. El PDF pre-generado por Railway (`pdf_url`) **nunca se guarda** en la base de datos

---

## Solución Propuesta

### Estrategia 1: Guardar `pdf_url` al completar el job

Cuando el backend Railway completa un análisis profundo, devuelve una URL del PDF pre-generado que se almacena en Supabase Storage. Esta URL **debería guardarse** en `advisor_messages.pdf_url`.

**Cambios:**
1. Modificar el callback `onComplete` de `useDeepAdvisorJob` para guardar el `pdf_url` en la DB
2. Mostrar un botón dedicado "Descargar PDF" cuando el mensaje tenga `pdf_url`

### Estrategia 2: Mejorar la descarga local desde historial

Asegurar que todos los datos necesarios (sources, facts) se guarden junto con el mensaje y estén disponibles para regenerar el documento completo.

**Cambios:**
1. Guardar `sources` y otros metadatos en el mensaje cuando se complete
2. Pasar estos datos a `generateDeepAdvisorDocument` desde el historial

---

## Implementación Recomendada (Combinada)

### Paso 1: Guardar `pdf_url` en la base de datos

Cuando el job termina, guardar la URL del PDF:

```typescript
// En useAdvisorChat.ts o en el callback onComplete de AdvisorChat
const updateMessageWithPdfUrl = async (chatId: string, pdfUrl: string) => {
  await externalSupabase
    .from('advisor_messages')
    .update({ pdf_url: pdfUrl })
    .eq('chat_id', chatId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1);
};
```

### Paso 2: Mostrar botón de PDF persistente

En los mensajes del historial, mostrar un botón específico cuando exista `pdf_url`:

```typescript
{message.pdf_url && (
  <Button onClick={() => window.open(message.pdf_url, '_blank')}>
    <FileDown /> Abrir PDF original
  </Button>
)}
```

### Paso 3: Mejorar descarga local como fallback

Si no hay `pdf_url`, usar la generación local pero con todos los metadatos:

```typescript
// Ya existe pero mejorar para incluir sources
handleDownloadHistoricMessage(message) {
  generateDeepAdvisorDocument({
    content: message.content,
    sources: message.sources,  // ← Ya se pasan
    factsExtracted: message.metadata?.facts_extracted, // ← Añadir
    query: undefined,
  });
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/advisor/AdvisorChat.tsx` | Guardar `pdf_url` en callback `onComplete`, mejorar UI del botón de descarga histórica |
| `src/hooks/useAdvisorChat.ts` | Cargar `pdf_url` al recuperar mensajes (ya lo hace) |
| `src/types/advisorChat.ts` | Ya tiene `pdf_url` - no requiere cambios |

---

## Flujo Después de los Cambios

```text
1. Usuario hace análisis con Deep Advisor
         │
         ▼
2. Backend Railway genera PDF → devuelve pdf_url
         │
         ▼
3. Frontend guarda pdf_url en advisor_messages
         │
         ▼
4. Días después: Usuario abre historial
         │
         ▼
5. Mensaje cargado con pdf_url intacto
         │
         ▼
6. Botón "Abrir PDF" → window.open(pdf_url)
```

---

## Beneficios

- **Persistencia garantizada**: El PDF está en Supabase Storage, la URL se guarda en la DB
- **Acceso instantáneo**: No hay que regenerar el documento, solo abrir la URL
- **Fallback robusto**: Si no hay URL, la generación local sigue funcionando
- **Sin dependencia de sesión**: Funciona igual al día siguiente o meses después
