
# Plan: Sidebar de Adjuntos Colapsable

## Objetivo
Agregar un botón de toggle que permita ocultar/mostrar la barra lateral de adjuntos hacia la izquierda con una animación suave.

## Cambios Propuestos

### 1. Modificar `AttachmentsSidebar.tsx`
- Agregar prop `isCollapsed` y `onToggle` para controlar el estado desde el padre
- Agregar botón de toggle (flecha) en el borde derecho del sidebar
- Implementar animación CSS de transición `transition-all duration-300`
- Cuando esté colapsado: ancho mínimo (~12px) mostrando solo el botón de expandir
- Cuando esté expandido: ancho normal de 208px (w-52)

### 2. Modificar `AdvisorChat.tsx`  
- Agregar estado `isSidebarCollapsed` con `useState`
- Pasar el estado y la función toggle al componente `AttachmentsSidebar`
- Guardar preferencia en localStorage para persistir entre sesiones

## Diseño Visual

```text
┌──────────────────────────────────────────────────────┐
│ Header                                               │
├──────────────────────────────────────────────────────┤
│ Services Bar                                         │
├────────┬─────────────────────────────────────────────┤
│        │                                             │
│ [◀]    │  Área de Chat                              │
│ Sidebar│                                             │
│ 208px  │  max-w-3xl                                 │
│        │                                             │
├────────┴─────────────────────────────────────────────┤
│ Input Area                                           │
└──────────────────────────────────────────────────────┘

Colapsado:
┌───┬───────────────────────────────────────────────────┐
│[▶]│  Área de Chat (más ancha)                        │
│12px                                                   │
└───┴───────────────────────────────────────────────────┘
```

## Detalles Técnicos

### Props Nuevas para AttachmentsSidebar
```typescript
interface AttachmentsSidebarProps {
  attachments: AttachmentInfo[];
  onRemove: (id: string) => void;
  uploadProgress?: UploadProgress;
  isVisible: boolean;
  isCollapsed: boolean;        // NUEVO
  onToggleCollapse: () => void; // NUEVO
}
```

### Estado en AdvisorChat.tsx
```typescript
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
  return localStorage.getItem('advisor_sidebar_collapsed') === 'true';
});

const toggleSidebar = () => {
  setIsSidebarCollapsed(prev => {
    const newValue = !prev;
    localStorage.setItem('advisor_sidebar_collapsed', String(newValue));
    return newValue;
  });
};
```

### Animación del Sidebar
```typescript
<div className={cn(
  "border-r bg-muted/20 flex flex-col shrink-0 transition-all duration-300 relative",
  isCollapsed ? "w-3" : "w-52"
)}>
  {/* Botón toggle siempre visible en el borde derecho */}
  <button 
    onClick={onToggleCollapse}
    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-muted"
  >
    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
  </button>
  
  {/* Contenido del sidebar - oculto cuando colapsado */}
  {!isCollapsed && (
    <>
      {/* Header, progress, file list */}
    </>
  )}
</div>
```

## Comportamiento
- Al hacer clic en el botón de flecha, el sidebar se colapsa/expande con animación
- La preferencia se guarda en localStorage
- El botón de toggle aparece como un círculo flotante en el borde del sidebar
- Cuando está colapsado, solo se ve una línea delgada con el botón de expandir
