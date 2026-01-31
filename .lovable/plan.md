
# Plan: Añadir botón de editar título para documentos individuales

## Problema identificado

En la sección de **Documentos Técnicos** (Knowledge Base), los documentos **individuales** (no multi-parte) no muestran el botón de lápiz ni la indicación para editar el título. Actualmente solo se muestra el nombre como texto estático:

```tsx
<p className="font-medium line-clamp-2 break-all">{doc.name}</p>
```

Mientras que los grupos multi-parte SÍ tienen:
- Texto clickeable con `cursor-pointer hover:text-primary`
- Tooltip "Clic para editar"  
- Botón de lápiz visible (icono Pencil)
- Handler onClick para activar modo edición

## Solución

Actualizar el renderizado del título en documentos individuales para que tenga la misma funcionalidad de edición que los grupos multi-parte:

1. Hacer el título clickeable para editar
2. Añadir el botón de lápiz (Pencil) visible junto al título
3. Condicionar ambos a `canManage` (permisos de usuario)

## Cambios técnicos

### Archivo: `src/pages/KnowledgeBase.tsx`

**Líneas ~2827-2829** - Reemplazar el párrafo estático del título:

```tsx
// ANTES (línea 2828)
<p className="font-medium line-clamp-2 break-all">{doc.name}</p>

// DESPUÉS
<div className="flex items-center gap-2">
  <p 
    className={`font-medium line-clamp-2 break-all ${canManage ? 'cursor-pointer hover:text-primary' : ''}`}
    onClick={canManage ? () => { setEditingDocId(doc.id); setEditingName(doc.name); } : undefined}
    title={canManage ? "Clic para editar" : undefined}
  >
    {doc.name}
  </p>
  {canManage && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => { setEditingDocId(doc.id); setEditingName(doc.name); }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Renombrar documento</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )}
</div>
```

## Comportamiento esperado

| Usuario | Antes | Después |
|---------|-------|---------|
| Admin/Supervisor/Analyst | No podían ver el botón de editar | Ven el lápiz y pueden hacer clic en el título |
| Viewer | No veían nada | Sin cambios (sin botón, sin hover) |

## Impacto
- Solo afecta la vista de lista de documentos individuales
- No modifica la lógica de guardado (ya funciona con `renameMutation`)
- Mantiene consistencia visual con grupos multi-parte
