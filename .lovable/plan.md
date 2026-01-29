
## Problema identificado

Las "Conversaciones Recientes" del dashboard no muestran las conversaciones realmente recientes porque el campo `updated_at` de la tabla `advisor_chats` **no se actualiza** cuando se envían mensajes nuevos.

### Datos actuales en la base de datos:
- Hay 23 conversaciones totales
- La conversación más recientemente "actualizada" es del **18 de enero**
- Pero la fecha actual es **29 de enero** (11 días de diferencia)
- Esto significa que aunque hayas enviado mensajes recientemente, el campo `updated_at` nunca se modificó

### Causa raíz
Cuando el backend (Railway) guarda mensajes en `advisor_messages`, no actualiza el campo `updated_at` del chat padre en `advisor_chats`. Tampoco existe un trigger automático que lo haga.

---

## Solución propuesta

Crear un **trigger en la base de datos** que automáticamente actualice `updated_at` en `advisor_chats` cada vez que se inserte un mensaje nuevo en `advisor_messages`.

### Cambios a implementar

**1. Crear función y trigger en la base de datos:**

```sql
-- Función que actualiza updated_at del chat cuando se inserta un mensaje
CREATE OR REPLACE FUNCTION update_advisor_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE advisor_chats 
  SET updated_at = NOW() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta después de cada INSERT en advisor_messages
CREATE TRIGGER trg_update_advisor_chat_on_message
AFTER INSERT ON advisor_messages
FOR EACH ROW
EXECUTE FUNCTION update_advisor_chat_timestamp();
```

**2. Actualizar los chats existentes (corrección de datos históricos):**

```sql
-- Actualiza updated_at basándose en el mensaje más reciente de cada chat
UPDATE advisor_chats ac
SET updated_at = (
  SELECT MAX(created_at) 
  FROM advisor_messages am 
  WHERE am.chat_id = ac.id
)
WHERE EXISTS (
  SELECT 1 FROM advisor_messages am WHERE am.chat_id = ac.id
);
```

---

## Resultado esperado

Una vez implementado:
- Las conversaciones con actividad reciente aparecerán primero
- El orden será realmente cronológico basado en la última interacción
- Los datos históricos también se corregirán

## Archivos afectados
Solo se requiere una migración de base de datos (sin cambios en código frontend)
