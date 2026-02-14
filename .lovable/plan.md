

## Plan: Conectar el flujo completo de extraccion y analisis de facturas

### Problema raiz

Hay dos desconexiones criticas:

1. **"Extraer datos"** llama a `startPolling()`, pero ese polling solo busca contratos (`supplier_name` en `chem_contract_documents`). Nunca invalida las queries de facturas (`chem-invoices`, `chem-invoice-alerts`, `chem-invoice-summary`), asi que `ChemInvoicesTab` nunca se actualiza.

2. **"Analizar Facturas"** hace un unico `setTimeout` de 10 segundos para refrescar alertas. Si Railway tarda mas, el usuario no ve nada. No hay feedback visual de progreso.

### Solucion

#### 1. Crear un polling dedicado para facturas en `ChemContratos.tsx`

Nueva funcion `startInvoicePolling()` que:
- Cada 5 segundos consulta el endpoint `/invoices` de Railway
- Invalida `chem-invoices`, `chem-invoice-alerts` y `chem-invoice-summary`
- Para cuando detecta que hay facturas procesadas (o tras 3 minutos maximo)
- Muestra estado visual de "Procesando facturas..." con spinner

`handleExtractInvoices` llamara a `startInvoicePolling()` en vez del `startPolling()` actual.

#### 2. Indicador visual de procesamiento en la seccion de PDFs

Agregar un banner/estado entre la card de PDFs y el `ChemInvoicesTab`:
- Mientras el polling esta activo: "Extrayendo datos de facturas..." con spinner y barra de progreso
- Cuando termina: desaparece automaticamente

Se usara un nuevo estado `invoicePollingActive` para controlar la visibilidad.

#### 3. Polling para "Analizar Facturas" en `useChemInvoices.ts`

Reemplazar el `setTimeout` unico de 10s por un polling real:
- Cada 5 segundos invalida `chem-invoice-alerts` y `chem-invoice-summary`
- Para cuando detecta alertas nuevas o tras 2 minutos
- Muestra "Analizando..." en el boton mientras esta activo (ya lo hace parcialmente con `isPending`, pero necesita extenderse al polling)

#### 4. Mensaje contextual cuando no hay facturas procesadas

En `ChemInvoicesTab`, cuando `invoices.length === 0` y no esta cargando:
- Mostrar mensaje: "No hay facturas procesadas. Sube PDFs de facturas y pulsa 'Extraer datos' para comenzar."
- El boton "Analizar Facturas" mostrara tooltip explicativo: "Primero extrae los datos de las facturas subidas"

### Cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `src/pages/chemicals/ChemContratos.tsx` | Crear `startInvoicePolling()` con invalidacion de queries de facturas. Agregar estado `invoicePollingActive`. Mostrar banner de procesamiento. Cambiar `handleExtractInvoices` para usar el nuevo polling. |
| `src/components/chemicals/invoices/useChemInvoices.ts` | Reemplazar `setTimeout(10s)` en `analyzeInvoicesMutation` por polling real con intervalo de 5s y maximo 2 min. Exponer estado `analyzingPolling` para UI. |
| `src/components/chemicals/invoices/ChemInvoicesTab.tsx` | Agregar mensaje vacio contextual cuando no hay facturas. Extender el estado de "Analizando" para cubrir el polling post-analisis. |

### Flujo resultante

```text
Usuario sube PDFs ──> Railway extrae texto (fase 1, automatico)
                          |
Usuario pulsa "Extraer datos"
                          |
    ┌─────────────────────┴──────────────────────┐
    │  Banner: "Extrayendo datos de facturas..."  │
    │  Polling cada 5s invalida chem-invoices     │
    │  Barra de progreso visible                  │
    └─────────────────────┬──────────────────────┘
                          |
    Railway termina ──> Polling detecta facturas ──> Tabla se llena
                          |
Usuario pulsa "Analizar Facturas"
                          |
    ┌─────────────────────┴──────────────────────┐
    │  Boton: "Analizando..."                     │
    │  Polling cada 5s invalida alerts/summary    │
    └─────────────────────┬──────────────────────┘
                          |
    Railway termina ──> Alertas y resumen aparecen
```

