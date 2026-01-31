

# Plan: Corregir error de caracteres especiales en subida de documentos

## Problema Identificado

Al intentar subir el documento **CASTROLEBRERO_MARÍA_parte3de5.pdf**, Supabase Storage rechaza el archivo con:

```
Error: Invalid key: f4db4dc5-1e2a-4a4a-8592-ee719c0a81af/1769845318476-CASTROLEBRERO_MARÍA_parte3de5.pdf
```

**Causa**: El carácter **"Í"** (I con tilde) no está permitido en las claves de Storage.

**Evidencia**: Las 5 partes del documento fallaron con el mismo error.

## Análisis Técnico

En `src/pages/KnowledgeBase.tsx` (línea 723):
```typescript
// PROBLEMA: No sanitiza caracteres especiales
const filePath = `${authData.user.id}/${Date.now()}-${file.name}`;
```

Comparado con `uploadAdvisorAttachment.ts` (línea 21):
```typescript
// CORRECTO: Reemplaza caracteres no ASCII
const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
```

## Solución

Aplicar la misma sanitización del nombre de archivo antes de construir el `filePath`:

```typescript
// Sanitizar nombre para evitar caracteres no permitidos en Storage
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const filePath = `${authData.user.id}/${Date.now()}-${sanitizedFileName}`;
```

## Cambios Necesarios

### Archivo: `src/pages/KnowledgeBase.tsx`

**Línea ~723** - Añadir sanitización:

```typescript
// ANTES
const filePath = `${authData.user.id}/${Date.now()}-${file.name}`;

// DESPUÉS
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const filePath = `${authData.user.id}/${Date.now()}-${sanitizedFileName}`;
```

> **Nota**: El nombre original (`file.name`) se seguirá guardando en la base de datos (línea 742: `name: file.name`) para mostrarlo correctamente en la UI. Solo el path de Storage usa el nombre sanitizado.

## Resultado Esperado

| Nombre Original | Path en Storage |
|-----------------|-----------------|
| `CASTROLEBRERO_MARÍA_parte3de5.pdf` | `userId/timestamp-CASTROLEBRERO_MAR_A_parte3de5.pdf` |
| `Análisis Técnico (v2).pdf` | `userId/timestamp-An_lisis_T_cnico__v2_.pdf` |

## Impacto

- **Mínimo**: Solo afecta la construcción del path de Storage
- **UI sin cambios**: El nombre visible sigue siendo el original
- **Compatibilidad**: Documentos existentes no se ven afectados

