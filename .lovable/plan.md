
# Plan: Detectar documentos pendientes automáticamente y habilitar re-extracción

## Problema identificado
Actualmente el botón "Re-extraer documentos" y la alerta amarilla solo aparecen cuando el usuario sube documentos **en la sesión actual**. Esto se debe a que `pendingReExtraction` es un estado local (`useState(false)`) que solo se activa en `handleUploadComplete`.

Si hay documentos pendientes o fallidos de sesiones anteriores (por ejemplo, después de un timeout), el usuario no ve ninguna señal visual ni tiene forma de reprocesarlos.

## Solución propuesta
Modificar la lógica para detectar documentos pendientes/fallidos desde los datos reales, no desde un estado local efímero.

## Cambios técnicos

### 1. Usar `PendingDocumentsList` para exponer estadísticas de documentos
Modificar el componente `PendingDocumentsList` para exponer las estadísticas de documentos (pendientes, fallidos) al componente padre mediante una nueva prop callback.

```
Archivo: src/components/cost-consulting/PendingDocumentsList.tsx

- Añadir prop: onStatsChange?: (stats: { pending: number; failed: number }) => void
- Llamar a esta función cuando las estadísticas cambien (usando useEffect)
```

### 2. Actualizar `CostConsultingDetail` para recibir estadísticas
En la página de detalle, usar las estadísticas para determinar si hay documentos pendientes:

```
Archivo: src/pages/cost-consulting/CostConsultingDetail.tsx

- Añadir estado: documentStats con { pending: number; failed: number }
- Pasar callback a PendingDocumentsList para actualizar documentStats
- Calcular hasPendingDocuments = documentStats.pending > 0 || documentStats.failed > 0
- Usar hasPendingDocuments en lugar de (o además de) pendingReExtraction
```

### 3. Mejorar la alerta y el botón
Mostrar información más específica sobre qué documentos están pendientes:

```
- Si hay documentos pendientes: "X documentos pendientes de extracción"
- Si hay documentos fallidos: "X documentos con error"
- Botón siempre visible si hay documentos pendientes o fallidos
```

## Flujo visual esperado

```text
┌─────────────────────────────────────────────────────────┐
│  Usuario abre proyecto                                  │
│         ↓                                               │
│  PendingDocumentsList carga documentos de Railway API   │
│         ↓                                               │
│  Calcula stats: { pending: 5, failed: 2 }               │
│         ↓                                               │
│  Llama onStatsChange con las estadísticas               │
│         ↓                                               │
│  CostConsultingDetail recibe stats                      │
│         ↓                                               │
│  hasPendingDocuments = true                             │
│         ↓                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ⚠️ Alerta: 5 documentos pendientes, 2 con error  │  │
│  │ [Botón: Re-extraer documentos]                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/cost-consulting/PendingDocumentsList.tsx` | Añadir prop `onStatsChange` y llamarlo cuando cambien las estadísticas |
| `src/pages/cost-consulting/CostConsultingDetail.tsx` | Recibir estadísticas y usar `hasPendingDocuments` derivado de datos reales |

## Ventajas de esta solución
1. Los documentos "colgados" se detectan automáticamente al cargar la página
2. El estado refleja la realidad de los datos, no depende de acciones del usuario en la sesión
3. El usuario siempre tiene visibilidad sobre documentos problemáticos
4. Mantiene compatibilidad con el flujo actual (también se activa al subir nuevos documentos)
