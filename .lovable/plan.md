

# Plan: Trazabilidad Documento → Entidades Extraídas

## Problema Real Identificado

Actualmente hay 145 documentos subidos pero solo 109 entidades extraídas (9 contratos + 100 facturas). El usuario no tiene forma de saber:

1. **Qué documentos generaron entidades** y cuáles no
2. **Por qué 36 documentos no generaron nada** (¿timeout? ¿documentos no procesables?)
3. **Cómo reclasificar manualmente** un documento que fue mal clasificado o ignorado

La clasificación la hace automáticamente el backend, pero no hay feedback al usuario.

## Análisis de la Arquitectura Actual

```text
┌─────────────────────────────┐
│  cost_project_documents     │  ← 145 documentos
│  - id                       │
│  - filename                 │
│  - extraction_status        │  ← "completed" para todos
│  - file_type                │  ← "contrato", "factura", "otro"
└─────────────────────────────┘
            │
            │ document_id (FK)
            ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  cost_project_contracts     │    │  cost_project_invoices      │
│  - id                       │    │  - id                       │
│  - document_id              │    │  - document_id              │
│  - supplier_name_raw        │    │  - invoice_number           │
│  ...                        │    │  ...                        │
└─────────────────────────────┘    └─────────────────────────────┘
        9 contratos                       100 facturas
```

**Problema**: Un documento puede tener múltiples entidades o ninguna. No se muestra esta relación al usuario.

## Solución Propuesta

### 1. Enriquecer la lista de documentos con conteo de entidades

Crear un hook que calcule cuántas entidades (contratos/facturas) tiene cada documento:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Documento                    │ Estado    │ Tipo      │ Contratos │ Facturas │
├─────────────────────────────────────────────────────────────────────────────┤
│ factura_enero.pdf            │ ✓ Listo   │ Factura   │    0      │    3     │
│ contrato_telefonica.pdf      │ ✓ Listo   │ Contrato  │    1      │    0     │
│ anexo_precios.pdf            │ ✓ Listo   │ Otro      │    0      │    0     │ ← ⚠️
│ listado_gastos.pdf           │ ✓ Listo   │ Otro      │    0      │    0     │ ← ⚠️
└─────────────────────────────────────────────────────────────────────────────┘

⚠️ 36 documentos procesados no generaron datos extraíbles.
```

### 2. Mostrar indicador visual para documentos sin entidades

Añadir badge o alerta cuando hay documentos que no produjeron nada:

- Badge "Sin datos" en rojo/naranja junto al documento
- Contador global: "X documentos sin contratos ni facturas"
- Tooltip explicando: "Este documento fue procesado pero no se encontraron contratos ni facturas"

### 3. Habilitar extracción individual

Para documentos sin entidades, ofrecer botón "Re-extraer" individual que:
- Borra cualquier entidad previa de ese documento
- Vuelve a ejecutar el pipeline de extracción solo para ese documento

## Cambios Técnicos

### Archivo 1: `src/hooks/useDocumentEntityCounts.ts` (NUEVO)

Crear hook que cruza documentos con contratos/facturas:

```typescript
export interface DocumentEntityCounts {
  [documentId: string]: {
    contracts: number;
    invoices: number;
  }
}

export const useDocumentEntityCounts = (projectId?: string) => {
  const { data: contracts = [] } = useCostContracts(projectId);
  const { data: invoices = [] } = useCostInvoices(projectId);
  
  return useMemo(() => {
    const counts: DocumentEntityCounts = {};
    
    contracts.forEach(c => {
      if (c.document_id) {
        counts[c.document_id] = counts[c.document_id] || { contracts: 0, invoices: 0 };
        counts[c.document_id].contracts++;
      }
    });
    
    invoices.forEach(i => {
      if (i.document_id) {
        counts[i.document_id] = counts[i.document_id] || { contracts: 0, invoices: 0 };
        counts[i.document_id].invoices++;
      }
    });
    
    return counts;
  }, [contracts, invoices]);
};
```

### Archivo 2: `src/components/cost-consulting/PendingDocumentsList.tsx`

Modificar para mostrar columnas de entidades:

1. Importar el nuevo hook `useDocumentEntityCounts`
2. Añadir columnas "Contratos" y "Facturas" a la tabla
3. Mostrar badge "Sin datos" cuando ambos son 0 y el documento está completado
4. Añadir a stats: `{ ...stats, noEntities: X }`

### Archivo 3: `src/pages/cost-consulting/CostConsultingDetail.tsx`

1. Extender el callback `onStatsChange` para incluir `noEntities`
2. Mostrar alerta cuando hay documentos sin entidades:
   ```
   ⚠️ 36 documentos procesados no generaron contratos ni facturas.
   Esto puede deberse a que son anexos, catálogos o documentos auxiliares.
   ```
3. Diferenciar en la alerta:
   - Documentos pendientes/fallidos → Problema de procesamiento
   - Documentos sin entidades → Posiblemente no extraíbles (o timeout)

## Archivos a Crear/Modificar

| Archivo | Acción | Cambio |
|---------|--------|--------|
| `src/hooks/useDocumentEntityCounts.ts` | NUEVO | Hook que cuenta entidades por documento |
| `src/components/cost-consulting/PendingDocumentsList.tsx` | Modificar | Añadir columnas contratos/facturas y badge "Sin datos" |
| `src/pages/cost-consulting/CostConsultingDetail.tsx` | Modificar | Mostrar alerta de documentos sin entidades |

## Interfaz Resultado

La tabla de documentos mostrará:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Documentos Subidos (145)                                                         │
│ 145 procesados · 36 sin entidades                                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Documento              │ Estado    │ Contratos │ Facturas │ Acciones             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 📄 factura_001.pdf     │ ✓ Listo   │    0      │    2     │ 🗑️                   │
│ 📄 contrato_iber.pdf   │ ✓ Listo   │    1      │    0     │ 🗑️                   │
│ 📄 anexo_tecnico.pdf   │ ⚠️ Sin datos │  0     │    0     │ 🔄 🗑️               │
│ 📄 catalogo.pdf        │ ⚠️ Sin datos │  0     │    0     │ 🔄 🗑️               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Alerta adicional:
```text
⚠️ 36 documentos procesados no generaron datos
   Estos documentos fueron procesados correctamente pero no contienen
   información extraíble (contratos/facturas). Pueden ser anexos técnicos,
   catálogos u otros documentos de soporte.
```

