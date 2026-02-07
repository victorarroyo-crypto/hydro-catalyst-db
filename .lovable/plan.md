
# Plan: Corregir Estructura de Datos en Exportación Word de ReactFlow

## Problema Identificado

El error ocurre porque hay una **discrepancia en la estructura de datos**:

| Componente | Estructura esperada | Dónde busca label |
|------------|---------------------|-------------------|
| `ReactFlowDiagram.tsx` (frontend) | `{ id, label, type }` | `node.label` |
| `reactflowToImage.ts` (Word export) | `{ id, data: { label }, type }` | `node.data.label` |

El backend envía nodos con `label` directamente en el nodo, pero el código de exportación a Word busca `node.data.label`, que es `undefined`.

**Error en consola:**
```
TypeError: Cannot read properties of undefined (reading 'label')
at line 83: label: node.data.label
```

## Solución

Actualizar `reactflowToImage.ts` para manejar **ambas estructuras**:
- Formato simplificado: `{ id, label, type }` (lo que envía el backend)
- Formato ReactFlow nativo: `{ id, data: { label }, type }` (por si cambia en el futuro)

## Cambios Requeridos

### Archivo: `src/lib/reactflowToImage.ts`

**1. Actualizar interfaz `ReactFlowData` (líneas 7-22)**

```typescript
export interface ReactFlowData {
  title?: string;
  direction?: 'LR' | 'TD';
  nodes: Array<{
    id: string;
    type?: string;
    // Support both formats: direct label or nested in data
    label?: string;
    data?: { label: string };
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
  }>;
}
```

**2. Crear función helper para extraer label (nueva, antes de `createReactFlowSvg`)**

```typescript
/**
 * Extract label from node, supporting both formats
 */
function getNodeLabel(node: ReactFlowData['nodes'][0]): string {
  // Format 1: Direct label (from backend)
  if (typeof node.label === 'string') {
    return node.label;
  }
  // Format 2: Nested in data (ReactFlow native format)
  if (node.data && typeof node.data.label === 'string') {
    return node.data.label;
  }
  // Fallback: use node id
  return node.id;
}
```

**3. Actualizar `createReactFlowSvg` para usar el helper**

Línea 83 (dentro de `nodes.forEach`):
```typescript
// Antes:
label: node.data.label,

// Después:
label: getNodeLabel(node),
```

Líneas 192-194 (renderizado del label):
```typescript
// Antes:
const label = node.data.label.length > 20 
  ? node.data.label.substring(0, 18) + '...' 
  : node.data.label;

// Después:
const nodeLabel = getNodeLabel(node);
const label = nodeLabel.length > 20 
  ? nodeLabel.substring(0, 18) + '...' 
  : nodeLabel;
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/lib/reactflowToImage.ts` | Actualizar interfaz + añadir `getNodeLabel()` + usar en 2 lugares |

## Verificación

1. Los diagramas ReactFlow deben aparecer en el Word (no espacios en blanco)
2. Los nodos deben mostrar sus labels correctamente
3. No debe haber errores en consola al exportar
4. El chat debe seguir renderizando los diagramas correctamente
