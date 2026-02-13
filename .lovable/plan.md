

# Plan: Mostrar datos extraidos del contrato

## Problema diagnosticado

Los datos del contrato de Brenntag SI estan en la base de datos (`datos_extraidos.raw_text` con 5385 caracteres del contrato completo), pero la UI no los muestra porque:

1. **La UI solo muestra datos si Phase 2 esta completa** (`datos_extraidos.supplier_name` existe) - y Phase 2 nunca se ejecuto con exito
2. **El texto crudo (Phase 1) se ignora completamente** - el usuario no puede ver nada de lo extraido
3. **El endpoint `/extract-contracts` de Railway probablemente no actualizo `datos_extraidos`** con campos estructurados

## Solucion en 2 partes

### Parte 1: Mostrar datos de Phase 1 (texto crudo) inmediatamente

Cuando un documento tiene `raw_text` pero NO tiene `supplier_name`, mostrar una vista expandible con:
- El texto crudo del contrato en un bloque con scroll
- Un badge "Texto extraido" en lugar de "Solo texto"
- Indicacion clara de que la extraccion estructurada (Phase 2) esta pendiente

### Parte 2: Implementar Phase 2 via edge function con Lovable AI

Como el endpoint de Railway no funciono, implementar la extraccion estructurada usando una edge function que:
1. Lee el `raw_text` del documento desde `chem_contract_documents`
2. Lo envia a un modelo de Lovable AI (Gemini 2.5 Flash) con un prompt que parsea los 40 campos del contrato
3. Actualiza `datos_extraidos` en la BD externa con los campos estructurados
4. Actualiza `confianza_extraccion` y `estado_extraccion`

## Cambios en archivos

### 1. `src/pages/chemicals/ChemContratos.tsx`

**Cambios en la tabla de documentos:**
- Cuando solo hay Phase 1 (`raw_text` existe, no hay `supplier_name`): permitir expandir la fila para ver el texto crudo
- Anadir un boton "Ver texto" junto al badge "Solo texto"
- La vista expandida muestra el raw_text formateado en un bloque `<pre>` con scroll vertical (max 400px)

**Cambios en los botones de extraccion:**
- El boton "Extraer clausulas de contratos" llamara a la nueva edge function en lugar de Railway
- Mantener el boton de Railway como fallback si se desea

**Cambios en el polling:**
- Ademas de verificar `supplier_name`, verificar cualquier campo estructurado nuevo (ej: `plazo_pago_dias`, `duracion_contrato_meses`)

### 2. Nueva edge function: `supabase/functions/extract-contract-clauses/index.ts`

Flujo:
1. Recibe `project_id` y opcionalmente `document_id`
2. Lee documentos de `chem_contract_documents` desde la BD externa con `raw_text` pero sin `supplier_name`
3. Para cada documento, envia el `raw_text` al LLM con un prompt estructurado
4. El prompt pide extraer estos campos del contrato:
   - `supplier_name`, `supplier_cif`
   - `plazo_pago_dias`, `pronto_pago_descuento_pct`, `pronto_pago_dias`
   - `duracion_contrato_meses`, `fecha_vencimiento`, `renovacion_automatica`, `preaviso_no_renovacion_dias`
   - `take_or_pay`, `volumen_comprometido_anual`, `penalizacion_take_or_pay`
   - `formula_revision_detalle`, `indice_vinculado`, `frecuencia_revision`
   - `rappel_detalle`, `detalle_servicio_tecnico`, `detalle_comodato`
   - `productos_mencionados[]` (array con nombre, precio_kg, formato, incoterm, concentracion, volumen_anual, tipo_precio)
   - `alertas_auditor[]` (alertas como take-or-pay, vencimientos proximos, rappels no cobrados, etc.)
   - `confianza_por_campo` (objeto con confianza 0-1 por cada campo)
5. Actualiza `datos_extraidos` con el JSON estructurado (manteniendo `raw_text`, `chars`, `pages`)
6. Actualiza `confianza_extraccion` con la media de confianzas
7. Retorna resumen de documentos procesados

**Modelo a usar:** `google/gemini-2.5-flash` (buena relacion velocidad/calidad para parsing de texto)

**Prompt del LLM:**
El prompt incluira:
- El raw_text del contrato
- Un JSON schema exacto de los campos esperados
- Instrucciones para devolver `null` en campos no encontrados
- Instrucciones para generar alertas del auditor basadas en reglas de negocio (TAE pronto pago, vencimientos proximos, take-or-pay)

### 3. Cambios en `ChemContratos.tsx` - Vista expandida mejorada

La vista expandida tendra 3 estados:
1. **Solo Phase 1**: Muestra el texto crudo en un bloque con scroll + boton "Extraer clausulas con IA"
2. **Phase 2 completa**: Muestra la vista estructurada existente (datos del contrato, productos, alertas, confianza)
3. **Procesando**: Spinner con mensaje "Extrayendo clausulas..."

## Secuencia tecnica

```text
Usuario hace click en fila del documento
  |
  v
Si solo Phase 1 --> Muestra raw_text + boton "Extraer con IA"
  |
  v
Click "Extraer con IA" --> POST a edge function extract-contract-clauses
  |
  v
Edge function lee raw_text de BD externa
  |
  v
Envia a Gemini 2.5 Flash con prompt estructurado
  |
  v
Parsea respuesta JSON del LLM
  |
  v
UPDATE datos_extraidos en BD externa (merge con datos existentes)
  |
  v
Frontend polling detecta supplier_name --> Muestra vista estructurada
```

## Consideraciones

- La edge function usa `externalSupabase` (service_role key de la BD externa) para leer/escribir
- El VITE_RAILWAY_URL se mantiene como fallback
- Los secrets necesarios: la key de la BD externa ya esta en el codigo del `externalClient.ts`; para la edge function necesitaremos configurar `EXTERNAL_SUPABASE_URL` y `EXTERNAL_SUPABASE_KEY` como secrets
- El raw_text del contrato de Brenntag tiene ~5400 chars, bien dentro de los limites del modelo

