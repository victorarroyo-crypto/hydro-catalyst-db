
# Plan: Mantener Aspect Ratio del Logo en Word

## Problema Identificado
El logo se inserta con dimensiones fijas de **80x80 píxeles**, lo cual deforma la imagen si el logo original no es cuadrado. El código actual fuerza estas dimensiones sin considerar las proporciones reales.

```typescript
// Código actual - líneas 64-70
logoImageRun = new ImageRun({
  data: arrayBuffer,
  transformation: {
    width: 80,  // Forzado
    height: 80, // Forzado - deforma si no es cuadrado
  },
  type: 'png',
});
```

---

## Solución Propuesta

Calcular las dimensiones reales del logo desde el ArrayBuffer y aplicar el aspect ratio correcto, limitando solo uno de los ejes (altura máxima de 60px para mantenerlo discreto).

### Archivo: `src/lib/generateDeepAdvisorDocument.ts`

**Cambio 1: Función auxiliar para obtener dimensiones de PNG**

Agregar una función que lea las dimensiones de una imagen PNG desde su ArrayBuffer:

```typescript
/**
 * Get image dimensions from PNG ArrayBuffer
 * PNG stores width/height in bytes 16-23 of the file
 */
function getPngDimensions(arrayBuffer: ArrayBuffer): { width: number; height: number } | null {
  try {
    const view = new DataView(arrayBuffer);
    // PNG signature check (first 8 bytes)
    // Width is at bytes 16-19, Height at bytes 20-23 (big-endian)
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height };
  } catch {
    return null;
  }
}
```

**Cambio 2: Modificar la creación del ImageRun**

Actualizar `createCoverPage` para calcular dimensiones proporcionales:

```typescript
// Fetch logo image
let logoImageRun: ImageRun | null = null;
try {
  const response = await fetch('/vandarum-logo-principal.png');
  const arrayBuffer = await response.arrayBuffer();
  
  // Calculate proportional dimensions
  const dimensions = getPngDimensions(arrayBuffer);
  let targetWidth = 120; // Default width
  let targetHeight = 60; // Default max height
  
  if (dimensions) {
    const aspectRatio = dimensions.width / dimensions.height;
    // Fix height to 60px and calculate width proportionally
    targetHeight = 60;
    targetWidth = Math.round(targetHeight * aspectRatio);
  }
  
  logoImageRun = new ImageRun({
    data: arrayBuffer,
    transformation: {
      width: targetWidth,
      height: targetHeight,
    },
    type: 'png',
  });
} catch (e) {
  console.warn('Could not load logo for Word document:', e);
}
```

---

## Resultado

| Antes | Después |
|-------|---------|
| Logo deformado (80x80 forzado) | Logo proporcional (altura 60px, ancho calculado) |
| Aspect ratio ignorado | Aspect ratio preservado |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/generateDeepAdvisorDocument.ts` | Agregar función `getPngDimensions` y calcular dimensiones proporcionales |

El logo mantendrá sus proporciones originales, apareciendo discreto pero sin deformación.
