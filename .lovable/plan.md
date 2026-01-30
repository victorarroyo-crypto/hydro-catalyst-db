
# Plan: Aplicar Estilos Vandarum a Tablas del Deep Advisor

## Resumen
Actualizar los componentes de tabla en el markdown del Advisor para usar los colores corporativos de Vandarum, mejorando la identidad visual y legibilidad.

---

## Especificaciones de Diseño

```text
┌─────────────────────────────────────────────────────────┐
│  Parámetro  │   Valor   │   Unidad                     │  ← Header: bg-[#307177] text-white
├─────────────────────────────────────────────────────────┤
│  DQO        │   500     │   mg/L                       │  ← Fila impar: bg-white
├─────────────────────────────────────────────────────────┤
│  DBO        │   250     │   mg/L                       │  ← Fila par: bg-[#f9fafb]
├─────────────────────────────────────────────────────────┤
│  SS         │   300     │   mg/L                       │  ← Fila impar: bg-white
└─────────────────────────────────────────────────────────┘
          ↑ Bordes: border-[#e5e7eb]
```

| Elemento | Color/Estilo |
|----------|--------------|
| Header fondo | `#307177` (vandarum-dark-green) |
| Header texto | `white` |
| Filas impares | `white` (fondo base) |
| Filas pares | `#f9fafb` (zebra striping) |
| Bordes | `#e5e7eb` |
| Hover en filas | `bg-[#f0fdfa]` (teal muy claro) |

---

## Cambios a Realizar

### 1. AdvisorMessage.tsx (líneas 203-234)

**Antes:**
```tsx
thead: ({ children }) => (
  <thead className="bg-muted/50">
    {children}
  </thead>
),
th: ({ children }) => (
  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">
    {children}
  </th>
),
tbody: ({ children }) => (
  <tbody className="divide-y divide-border bg-card">
    {children}
  </tbody>
),
```

**Después:**
```tsx
thead: ({ children }) => (
  <thead className="bg-[#307177]">
    {children}
  </thead>
),
th: ({ children }) => (
  <th className="border border-[#e5e7eb] px-4 py-3 text-left font-semibold text-white text-xs uppercase tracking-wide">
    {children}
  </th>
),
tbody: ({ children }) => (
  <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-[#f9fafb]">
    {children}
  </tbody>
),
td: ({ children }) => (
  <td className="border border-[#e5e7eb] px-4 py-3 text-foreground leading-relaxed">
    {children}
  </td>
),
tr: ({ children }) => (
  <tr className="hover:bg-[#f0fdfa] transition-colors">
    {children}
  </tr>
),
```

### 2. StreamingResponse.tsx (líneas 64-81)

**Antes:**
```tsx
thead: ({ children }) => (
  <thead className="bg-muted">{children}</thead>
),
th: ({ children }) => (
  <th className="border border-border px-3 py-2 text-left font-medium text-foreground">
    {children}
  </th>
),
td: ({ children }) => (
  <td className="border border-border px-3 py-2">{children}</td>
),
```

**Después:**
```tsx
thead: ({ children }) => (
  <thead className="bg-[#307177]">{children}</thead>
),
tbody: ({ children }) => (
  <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-[#f9fafb]">
    {children}
  </tbody>
),
tr: ({ children }) => (
  <tr className="hover:bg-[#f0fdfa] transition-colors">
    {children}
  </tr>
),
th: ({ children }) => (
  <th className="border border-[#e5e7eb] px-3 py-2 text-left font-medium text-white">
    {children}
  </th>
),
td: ({ children }) => (
  <td className="border border-[#e5e7eb] px-3 py-2 text-foreground">
    {children}
  </td>
),
```

---

## Archivos a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `src/components/advisor/AdvisorMessage.tsx` | 210-234 | Estilos Vandarum en thead, th, tbody, td, tr |
| `src/components/advisor/streaming/StreamingResponse.tsx` | 71-81 | Estilos Vandarum en thead, tbody, tr, th, td |

---

## Resultado Visual Esperado

Las tablas del Deep Advisor mostrarán:
- **Cabecera teal corporativa** (#307177) con texto blanco
- **Alternancia de colores** en filas (zebra striping) para mejor legibilidad
- **Bordes consistentes** grises claros (#e5e7eb)
- **Hover sutil** en teal muy claro (#f0fdfa) para interactividad

Esto alinea el estilo con la identidad visual de Vandarum y mejora la experiencia de lectura de datos tabulares.
