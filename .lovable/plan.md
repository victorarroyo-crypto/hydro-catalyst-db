
# Plan: Reorganizar la Interfaz de Subida de Archivos

## Problema Identificado
Cuando se adjuntan archivos, los previews y la barra de progreso se muestran en línea con el botón de adjuntar, lo que expande el área de entrada verticalmente y dificulta la escritura.

## Solución Propuesta
Mover los archivos adjuntos y la barra de progreso **encima** del área de entrada, en una sección separada y claramente visible.

## Cambios a Realizar

### 1. Modificar `FileAttachmentButton.tsx`
- Separar el componente en dos partes:
  - **Botón de adjuntar**: Solo el icono del clip (permanece en la línea de entrada)
  - **Vista previa de archivos**: Se renderiza externamente (controlado por el padre)

### 2. Crear componente `AttachmentsPreview.tsx`
- Nuevo componente que muestra:
  - Lista de archivos adjuntos con iconos y nombres
  - Barra de progreso durante la subida
  - Botón para eliminar cada archivo
- Se ubicará **encima** del input, con un diseño limpio y compacto

### 3. Actualizar `AdvisorChat.tsx`
- Renderizar `AttachmentsPreview` en una nueva fila sobre el área de entrada
- Solo se muestra cuando hay archivos adjuntos o subida en progreso
- El input mantiene su altura fija y usabilidad

## Diseño Visual Propuesto

```text
┌─────────────────────────────────────────────────────┐
│  📎 documento1.pdf (2.3MB) ✕  📎 imagen.png (1MB) ✕ │  ← Archivos adjuntos (solo visible si hay)
│  ████████████░░░░░░  2/3 archivos                   │  ← Progreso (solo durante upload)
├─────────────────────────────────────────────────────┤
│  📎  │  Escribe tu consulta...           │  Enviar │  ← Input siempre visible y accesible
└─────────────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `src/components/advisor/FileAttachmentButton.tsx` | Simplificar a solo botón |
| `src/components/advisor/AttachmentsPreview.tsx` | Crear nuevo componente |
| `src/pages/advisor/AdvisorChat.tsx` | Reorganizar layout del input |

## Detalles Técnicos

### FileAttachmentButton (simplificado)
```typescript
// Solo renderiza el botón del clip
<Button onClick={handleClick} disabled={disabled || isUploading}>
  {isUploading ? <Loader2 /> : <Paperclip />}
</Button>
```

### AttachmentsPreview (nuevo)
```typescript
// Muestra archivos y progreso encima del input
<div className="mb-2 p-2 rounded-lg bg-muted/50 border">
  <div className="flex flex-wrap gap-2">
    {attachments.map(file => (
      <Badge key={file.id}>
        {getIcon(file.type)} {file.name} <X onClick={remove} />
      </Badge>
    ))}
  </div>
  {isUploading && <Progress value={progress} />}
</div>
```

### AdvisorChat layout actualizado
```typescript
<div className="max-w-4xl mx-auto">
  {/* Archivos adjuntos - visible solo cuando hay */}
  {(attachments.length > 0 || isUploading) && (
    <AttachmentsPreview 
      attachments={attachments}
      onRemove={handleRemove}
      uploadProgress={uploadProgress}
    />
  )}
  
  {/* Input row - siempre con altura fija */}
  <div className="flex gap-3 items-center ...">
    <FileAttachmentButton onAttach={handleAttach} disabled={disabled} />
    <Input ... />
    <Button>Enviar</Button>
  </div>
</div>
```

## Beneficios
- El área de entrada mantiene altura constante
- Los archivos se ven claramente sin obstruir el chat
- El progreso de subida es visible pero no bloquea la interfaz
- Diseño más limpio y profesional
