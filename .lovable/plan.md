

## Guía de Uso del Advisor - Plan de Implementación

### Decisión de UX

Propongo una solución híbrida:

1. **Banner compacto permanente** sobre el input (siempre visible)
2. **Sheet deslizable desde la derecha** para la guía completa (desktop)
3. **Modal de pantalla completa** en móvil
4. **Banner de activación Deep Mode** que aparece temporalmente al activar el modo

Esta combinación ofrece:
- Acceso rápido sin interrumpir el flujo
- Guía completa accesible con un click
- Buena experiencia en móvil
- Persistencia de preferencias del usuario

---

### Componentes a Crear

#### 1. `src/components/advisor/AdvisorUsageGuide.tsx`

Componente principal que contiene todo el contenido de la guía, organizado en secciones colapsables:

```text
Estructura:
├── Props: { isDeepMode: boolean, variant: 'full' | 'compact' }
├── Sección 1: Cómo estructurar tu consulta (4 subsecciones)
├── Sección 2: Ejemplos (evitar vs mejor)
├── Sección 3: Qué documentos subir (3 categorías)
└── Sección 4: Limitaciones (solo visible en Deep Mode)
```

Usará `Accordion` de Radix para las secciones colapsables.

---

#### 2. `src/components/advisor/AdvisorUsageGuideSheet.tsx`

Wrapper que decide si mostrar Sheet (desktop) o Dialog (móvil):

```text
Estructura:
├── Detecta móvil con useIsMobile()
├── Desktop: Sheet side="right" width ~400px
├── Móvil: Dialog con scroll vertical
├── Trigger: botón "?" o "Ver guía completa"
└── Estado open/close controlado externamente
```

---

#### 3. `src/components/advisor/CompactUsageHint.tsx`

Banner pequeño que aparece sobre el input:

```text
Diseño:
┌─────────────────────────────────────────────────────────────┐
│ 💡 Incluye: sector, ubicación, datos técnicos y objetivo   │
│    claro  [Ver guía completa →]                             │
└─────────────────────────────────────────────────────────────┘
```

Comportamiento:
- Primera visita: expandido
- Visitas posteriores: recordar preferencia
- Link abre el Sheet/Modal completo
- Persistencia en `localStorage` con key `advisor_guide_dismissed`

---

#### 4. `src/components/advisor/DeepModeActivatedBanner.tsx`

Banner temporal que aparece al activar Deep Mode:

```text
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Deep Advisor activado                                    │
│    Análisis con 4 expertos. Adjunta documentos para        │
│    mejores resultados. Indica ubicación exacta.            │
└─────────────────────────────────────────────────────────────┘
```

- Aparece solo cuando `deepMode` cambia de `false` a `true`
- Se oculta automáticamente después de 5 segundos
- Botón X para cerrar inmediatamente
- Solo muestra una vez por sesión (localStorage `advisor_deep_banner_shown`)

---

### Integración en AdvisorChat.tsx

#### A. Imports nuevos
```typescript
import { CompactUsageHint } from '@/components/advisor/CompactUsageHint';
import { AdvisorUsageGuideSheet } from '@/components/advisor/AdvisorUsageGuideSheet';
import { DeepModeActivatedBanner } from '@/components/advisor/DeepModeActivatedBanner';
```

#### B. Nuevos estados
```typescript
const [isGuideOpen, setIsGuideOpen] = useState(false);
const [showDeepBanner, setShowDeepBanner] = useState(false);
const prevDeepModeRef = useRef(deepMode);
```

#### C. Detectar cambio de Deep Mode
```typescript
useEffect(() => {
  if (!prevDeepModeRef.current && deepMode) {
    // Deep mode just activated
    const shown = localStorage.getItem('advisor_deep_banner_shown');
    if (!shown) {
      setShowDeepBanner(true);
      localStorage.setItem('advisor_deep_banner_shown', 'true');
      setTimeout(() => setShowDeepBanner(false), 5000);
    }
  }
  prevDeepModeRef.current = deepMode;
}, [deepMode]);
```

#### D. Ubicación del banner compacto (sobre el input, línea ~711)
```tsx
{/* Usage Hint Banner */}
<CompactUsageHint 
  onOpenGuide={() => setIsGuideOpen(true)} 
  isDeepMode={deepMode}
/>

{/* Deep Mode Activated Banner */}
{showDeepBanner && (
  <DeepModeActivatedBanner onDismiss={() => setShowDeepBanner(false)} />
)}
```

#### E. Sheet/Modal al final del componente
```tsx
<AdvisorUsageGuideSheet 
  open={isGuideOpen} 
  onOpenChange={setIsGuideOpen}
  isDeepMode={deepMode}
/>
```

---

### Contenido detallado de la guía

El contenido se estructura como constantes para facilitar mantenimiento:

```typescript
const GUIDE_SECTIONS = {
  structureQuery: {
    title: "Cómo estructurar tu consulta",
    subsections: [
      { title: "Contexto", items: [...] },
      { title: "Datos técnicos", items: [...] },
      { title: "Objetivo claro", items: [...] },
      { title: "Pregunta específica", items: [...] },
    ]
  },
  examples: {
    title: "Ejemplos",
    avoid: [...],
    better: [...]
  },
  documents: {
    title: "Qué documentos subir",
    useful: [...],
    moderate: [...],
    avoid: [...]
  },
  limitations: {  // Solo Deep Mode
    title: "Limitaciones",
    items: [...]
  }
};
```

---

### Estilos y colores

- Banner compacto: `bg-amber-50 border-amber-200` (como el InstructionTip)
- Deep banner: `bg-cyan-50 border-cyan-200` (colores de marca)
- Secciones de la guía: iconos con colores de marca (#307177, #32b4cd, #8cb63c, #ffa720)
- Badges para categorías de documentos (verde = útil, amarillo = moderado, rojo = evitar)

---

### localStorage Keys

| Key | Propósito |
|-----|-----------|
| `advisor_guide_dismissed` | Si el usuario cerró el hint compacto |
| `advisor_guide_expanded` | Preferencia de secciones expandidas |
| `advisor_deep_banner_shown` | Si ya se mostró el banner de Deep Mode |

---

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/components/advisor/AdvisorUsageGuide.tsx` | Crear |
| `src/components/advisor/AdvisorUsageGuideSheet.tsx` | Crear |
| `src/components/advisor/CompactUsageHint.tsx` | Crear |
| `src/components/advisor/DeepModeActivatedBanner.tsx` | Crear |
| `src/pages/advisor/AdvisorChat.tsx` | Modificar |

---

### Responsividad

- **Desktop (>768px)**: Sheet deslizable desde la derecha, banner compacto horizontal
- **Móvil (<768px)**: Dialog de pantalla completa con scroll, banner compacto apilado verticalmente

