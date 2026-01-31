
# Plan: Control de Calidad del Formato en el Chat del Advisor

## Resumen

Implementar una capa de **post-procesamiento centralizado** que limpie y normalice todo el contenido que llega desde Railway antes de renderizarlo en el chat. Esto se hará completamente en el frontend, sin necesidad de modificar el backend de Railway.

## Contexto Actual

El flujo actual es:
1. Railway envía la respuesta (streaming o JSON)
2. `useAdvisorChat.ts` actualiza el estado `messages`
3. `AdvisorMessage.tsx` aplica `cleanMarkdownContent()` 
4. ReactMarkdown renderiza con componentes personalizados

El problema es que la limpieza actual está dispersa entre varios archivos y algunos patrones problemáticos (ecuaciones, checklists, tablas anchas) no se detectan correctamente.

## Solución: Pipeline de Control de Calidad

```text
┌─────────────────────────────────────────────────────────────────┐
│                    RAILWAY RESPONSE                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            src/utils/contentQualityControl.ts                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Normalizar diagramas Mermaid                          │   │
│  │ 2. Detectar y marcar Balance Hídrico                     │   │
│  │ 3. Normalizar ecuaciones químicas (texto plano)          │   │
│  │ 4. Limpiar tablas para evitar scroll horizontal          │   │
│  │ 5. Normalizar checklists como listas normales            │   │
│  │ 6. Sanitizar caracteres especiales problemáticos         │   │
│  │ 7. Aplicar formateo de títulos                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AdvisorMessage.tsx                           │
│                 (renderizado final limpio)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Archivos a Crear/Modificar

### 1. Nuevo: `src/utils/contentQualityControl.ts`
Pipeline centralizado que:
- Detecta patrones problemáticos conocidos
- Normaliza ecuaciones químicas: `CO₂ + H₂O → H₂CO₃` como texto normal (no código)
- Convierte checklists con boxes ASCII (`[ ]`, `[x]`) a listas normales
- Detecta tablas excesivamente anchas y las simplifica o marca para renderizado especial
- Sanitiza HTML inline problemático (`<br>`, etc.)
- Retorna contenido limpio + metadata de bloques especiales detectados

### 2. Modificar: `src/utils/fixMarkdownTables.ts`
- Añadir función para detectar tablas que excederían el ancho del contenedor
- Opción para truncar columnas o marcar para renderizado responsive

### 3. Modificar: `src/components/advisor/AdvisorMessage.tsx`
- Usar el nuevo pipeline de calidad en lugar de llamadas dispersas
- Manejar los bloques especiales detectados (balance hídrico, ecuaciones, etc.)

## Detalle Técnico

### Detección de Patrones Problemáticos

```typescript
// src/utils/contentQualityControl.ts

interface QualityResult {
  content: string;
  specialBlocks: {
    type: 'water-balance' | 'equation' | 'wide-table' | 'checklist';
    startIndex: number;
    endIndex: number;
    originalContent: string;
  }[];
}

export function applyContentQualityControl(rawContent: string): QualityResult {
  // 1. Pre-procesar diagramas (ya existe)
  // 2. Detectar ecuaciones químicas y convertir a texto normal
  // 3. Normalizar checklists ASCII a listas markdown
  // 4. Detectar tablas anchas y marcarlas
  // 5. Limpiar HTML problemático
  // 6. Retornar contenido limpio + metadata
}
```

### Normalización de Ecuaciones
Detectar patrones como:
- `CO₂`, `H₂O`, `NH₃`, etc.
- Flechas de reacción: `→`, `⇌`, `↔`
- Coeficientes: `2H₂ + O₂ → 2H₂O`

Estos se mantienen como texto normal, no código.

### Normalización de Checklists
Convertir:
```
[ ] Verificar pH
[x] Analizar conductividad
```
A:
```
- ☐ Verificar pH
- ☑ Analizar conductividad
```

### Tablas Anchas
Si una tabla tiene más de 5-6 columnas o contenido muy largo, marcarla para:
- Renderizado con scroll controlado (dentro del contenedor)
- O conversión a lista de items

## Respuesta a tu Pregunta

**No necesitas pedirle a Railway ningún código especial.** Todo el control de calidad se puede hacer en el frontend porque:

1. Railway ya envía el contenido en texto plano/markdown
2. Los patrones problemáticos (ecuaciones, checklists, tablas) se pueden detectar con regex
3. La normalización es una transformación de texto que no requiere metadata adicional del backend

El único caso donde sería útil tener metadata de Railway sería si quisieras que el LLM explícitamente etiquetara sus bloques (ej: `:::water-balance ... :::`) - pero esto añadiría complejidad al prompt y no es necesario ya que los patrones son detectables.

## Beneficios

- **Centralizado**: Un solo punto de control para toda la limpieza
- **Extensible**: Fácil añadir nuevos patrones problemáticos
- **Sin dependencia de Railway**: Funciona con el contenido actual
- **Testeable**: Funciones puras que se pueden testear fácilmente
