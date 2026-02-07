

# Plan: Corregir Exportación Inconsistente de Diagramas ReactFlow a Word

## Problema Identificado

Algunos diagramas ReactFlow se muestran correctamente en pantalla pero no aparecen en el documento Word exportado.

### Causa Raíz

El problema está en el archivo `src/lib/reactflowToImage.ts`, específicamente en el uso de `btoa()` para generar claves base64:

```typescript
// Líneas 133, 161, 197
const base64 = btoa(jsonContent);  // ❌ FALLA con caracteres Unicode
```

**¿Por qué falla?**
- `btoa()` solo funciona con caracteres ASCII (0-255)
- Cuando el JSON contiene labels con tildes (`"Tratamiento Biológico"`), ñ, u otros caracteres Unicode, `btoa()` lanza un error `DOMException`
- El error se captura silenciosamente en el `catch`, y el diagrama nunca se añade al array `blocks`
- Resultado: el diagrama se renderiza en pantalla (porque usa otra función) pero no se exporta a Word

### Diagrama del Flujo de Error

```text
JSON con Unicode ("Desnitrificación")
           ↓
    btoa(jsonContent)
           ↓
   DOMException: Invalid character
           ↓
      catch (e) { }  ← Error silenciado
           ↓
   Diagrama NO se añade a blocks[]
           ↓
   Word generado SIN ese diagrama
```

## Solución

Reemplazar `btoa()` con una función segura para Unicode que primero codifica el texto a UTF-8 antes de convertir a base64.

### Cambios Requeridos

#### Archivo: `src/lib/reactflowToImage.ts`

**1. Añadir función helper para base64 seguro (antes de `extractReactFlowBlocks`)**

Nueva función `safeBase64Encode`:
```typescript
/**
 * Safely encode string to base64, handling Unicode characters.
 * Standard btoa() fails on non-ASCII characters.
 */
function safeBase64Encode(str: string): string {
  try {
    // First encode to UTF-8, then to base64
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
  } catch (e) {
    // Fallback: generate a unique hash from the string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `rf_${Math.abs(hash).toString(36)}_${str.length}`;
  }
}
```

**2. Reemplazar todas las llamadas a `btoa()` con `safeBase64Encode()`**

Hay 3 lugares donde se usa `btoa()`:

| Línea | Código actual | Código nuevo |
|-------|---------------|--------------|
| 133 | `const base64 = btoa(jsonContent);` | `const base64 = safeBase64Encode(jsonContent);` |
| 161 | `const base64 = btoa(jsonContent);` | `const base64 = safeBase64Encode(jsonContent);` |
| 197 | `const base64 = btoa(jsonText);` | `const base64 = safeBase64Encode(jsonText);` |

**3. Añadir logging mejorado para diagnóstico**

Actualizar los mensajes de warning para incluir más contexto:

```typescript
} catch (e) {
  console.warn('Failed to parse ReactFlow from ```reactflow fence:', e, 
    'Content preview:', jsonContent.substring(0, 100));
}
```

## Resumen de Cambios

| Archivo | Acción |
|---------|--------|
| `src/lib/reactflowToImage.ts` | Añadir `safeBase64Encode()` + Reemplazar 3 usos de `btoa()` |

## Verificación

Después de implementar:
1. Exportar a Word un informe con diagramas que contengan texto en español (tildes, ñ)
2. Verificar que TODOS los diagramas aparecen en el documento
3. Comprobar que no hay errores en la consola durante la exportación

