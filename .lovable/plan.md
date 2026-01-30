

## Plan: Mejoras en Visualización de Diagramas y Reset del Textarea

### Problema 1: Textarea no resetea su altura

Cuando el usuario escribe un mensaje largo y lo envía, el textarea permanece expandido durante la espera de respuesta. Esto consume espacio innecesario.

**Solución**: Reset explícito de la altura del textarea al enviar el mensaje

**Archivo**: `src/pages/advisor/AdvisorChat.tsx`

```typescript
// En handleSend, después de setInputValue('')
setInputValue('');

// Añadir reset de altura del textarea
const textareaEl = document.querySelector('textarea');
if (textareaEl) {
  textareaEl.style.height = 'auto';
}
```

---

### Problema 2: Diagramas de flujo horizontales se ven mal

Los diagramas generados por la IA tienen un formato horizontal con flechas (`→`) pero el renderizador actual los convierte a tarjetas verticales que ocupan mucho espacio y pierden la estructura visual horizontal.

**Antes (actual)**: Tarjetas verticales con flechas hacia abajo - no representa bien procesos industriales

**Solución propuesta**: Diseño horizontal compacto tipo "pipeline" que mantiene la dirección del flujo original

**Archivo**: `src/components/advisor/FlowDiagramRenderer.tsx`

Rediseñar el componente para:

1. **Layout horizontal scrolleable** - Los pasos se muestran de izquierda a derecha como un tren de proceso
2. **Chips compactos** - Cada paso es un chip/badge pequeño en lugar de una tarjeta grande
3. **Flechas horizontales** - Conectores → entre pasos
4. **Detalles en tooltip** - Los paréntesis se muestran en hover para mantener compacto
5. **Scroll suave** - Si el diagrama es muy largo, permite scroll horizontal

**Diseño visual propuesto**:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐ │
│ │ ENTRADA PET   │ →  │ PRE-LAVADO    │ →  │ LAVADO        │ →  │ ENJUAGUES     │ │
│ │ SUCIO         │    │ (frío)        │    │ ALCALINO      │    │               │ │
│ └───────────────┘    └───────────────┘    └───────────────┘    └───────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Cada chip:
- Borde redondeado con color primario sutil
- Texto principal en negrita
- Detalle (paréntesis) en texto más pequeño debajo
- Flecha horizontal `→` entre chips

**Para diagramas con múltiples líneas** (como "LÍNEA 1", "LÍNEA 2", etc.):
- Detectar el patrón de encabezado de línea
- Renderizar cada línea como un bloque separado con su título

---

### Cambios en Archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/advisor/AdvisorChat.tsx` | Reset altura textarea al enviar mensaje |
| `src/components/advisor/FlowDiagramRenderer.tsx` | Nuevo diseño horizontal tipo pipeline |

---

### Detalles Técnicos

**FlowDiagramRenderer.tsx** - Nueva estructura:

```typescript
// Componente FlowChip individual
function FlowChip({ step }: { step: FlowStep }) {
  return (
    <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
      <span className="text-sm font-medium text-foreground">
        {step.label}
      </span>
      {step.detail && (
        <span className="text-xs text-muted-foreground block">
          ({step.detail})
        </span>
      )}
    </div>
  );
}

// Flecha horizontal
function FlowArrowHorizontal() {
  return (
    <span className="text-primary/60 mx-1 flex-shrink-0">→</span>
  );
}

// Contenedor horizontal scrolleable
export function FlowDiagramRenderer({ content }: FlowDiagramRendererProps) {
  const steps = parseFlowSteps(content);
  
  return (
    <div className="my-4 overflow-x-auto">
      <div className="flex items-center gap-1 p-3 bg-muted/30 rounded-lg min-w-max">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <FlowChip step={step} />
            {idx < steps.length - 1 && <FlowArrowHorizontal />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

**Mejora adicional**: Para diagramas con ramificaciones (como efluentes en paralelo), detectar el patrón de flechas verticales `↓` y mostrar como sub-items debajo del paso correspondiente.

