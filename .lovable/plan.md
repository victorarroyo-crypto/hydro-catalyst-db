

## Plan: Mejorar Acceso al Historial de Conversaciones

### Diagnóstico

He investigado la base de datos y el código, y encontré lo siguiente:

| Aspecto | Estado |
|---------|--------|
| Los chats del Deep Mode se guardan | Correcto - Hay mensajes en la BD |
| La página de historial existe | `/advisor/history` está configurada |
| Los chats se pueden cargar | La función `loadChat` funciona |
| Campo `message_count` | Siempre 0 (bug del backend Railway) |
| Acceso al historial | Solo desde Dashboard, difícil de encontrar |

### Problema Principal

El historial existe y funciona, pero:
1. No hay acceso directo desde la pantalla del chat
2. El contador de mensajes siempre muestra 0 (dato incorrecto del backend)

### Solución

Agregar un botón de "Historial" visible en la barra superior del chat, junto a los otros iconos de navegación, para acceso directo a conversaciones pasadas.

---

### Cambios a Implementar

#### 1. Agregar botón de Historial en la barra del chat

**Archivo**: `src/pages/advisor/AdvisorChat.tsx`

En la sección del header (donde están los iconos de Dashboard y Logout), agregar un botón para ir al historial:

```typescript
// En el header, junto a los otros botones
<Button 
  variant="ghost" 
  size="icon"
  onClick={() => navigate('/advisor/history')}
  title="Historial de conversaciones"
>
  <History className="w-5 h-5" />
</Button>
```

#### 2. Calcular `message_count` en el cliente (workaround)

Dado que el backend no actualiza correctamente `message_count`, se puede hacer una subconsulta para contar mensajes reales:

**Archivo**: `src/hooks/useAdvisorHistory.ts`

Modificar la consulta para obtener el conteo real de mensajes:

```typescript
// Opción A: Agregar join con conteo
const { data, error } = await supabase
  .from('advisor_chats')
  .select(`
    *,
    advisor_messages(count)
  `)
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
  .limit(50);

// Luego mapear:
message_count: data[0]?.advisor_messages?.[0]?.count || 0
```

---

### Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/advisor/AdvisorChat.tsx` | Agregar botón de History en el header |
| `src/hooks/useAdvisorHistory.ts` | Consulta con conteo real de mensajes |

---

### Beneficios

- Acceso directo al historial desde cualquier pantalla del chat
- Contador de mensajes preciso en la lista de conversaciones
- No requiere cambios en el backend de Railway

