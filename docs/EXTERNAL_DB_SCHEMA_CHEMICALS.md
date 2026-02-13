## REFERENCIA: Schema BD Externa (externalSupabase) - Módulo Químicos

### REGLA FUNDAMENTAL
NO inventar columnas. Usar SOLO las columnas listadas aquí.
Si necesitas el nombre del proveedor, hacer JOIN con chem_suppliers, NO añadir columnas.

---

### 15 TABLAS DEL MÓDULO chem_consulting

#### 1. chem_projects
- id (UUID PK)
- user_id (UUID FK → auth.users)
- nombre_cliente (TEXT)
- sector_industrial (TEXT) — valores: farmacéutico, alimentario, reciclaje, químico, automoción, textil, papelero, metalúrgico, otro
- contacto_principal (TEXT)
- fecha_inicio (DATE)
- fecha_mandato (DATE)
- estado (TEXT) — valores: prospección, auditoría, negociación, implementación, seguimiento, cerrado
- notas (TEXT)
- created_at, updated_at (TIMESTAMPTZ)

#### 2. chem_suppliers
- id (UUID PK)
- project_id (UUID FK → chem_projects, nullable para refs globales)
- nombre (TEXT) ← ESTE es el campo del nombre del proveedor
- tipo (TEXT) — valores: fabricante, distribuidor_nacional, distribuidor_regional, importador
- contacto_nombre (TEXT)
- contacto_email (TEXT)
- contacto_telefono (TEXT)
- zona_cobertura (TEXT)
- productos_principales (TEXT)
- es_referencia (BOOLEAN) — true = proveedor de referencia global
- notas (TEXT)
- created_at (TIMESTAMPTZ)

#### 3. chem_products
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- nombre_comercial (TEXT)
- nombre_materia_activa (TEXT)
- familia_quimica (TEXT) — valores: ácidos, bases_álcalis, oxidantes_desinfectantes, floculantes_coagulantes, detergentes_desengrasantes, disolventes, nutrientes, antiespumantes, inhibidores_corrosión, resinas_intercambio, especialidades, otros
- concentracion_porcentaje (NUMERIC 5,2)
- codigo_taric (TEXT)
- clasificacion_pareto (TEXT) — valores: commodity, semi-especialidad, especialidad
- aplicacion (TEXT)
- formato_envase (TEXT) — valores: bidón_25kg, bidón_200kg, IBC_1000L, cisterna_granel, saco_25kg, saco_big_bag, otro
- proveedor_actual_id (UUID FK → chem_suppliers)
- precio_unitario_actual (NUMERIC 10,4)
- tipo_precio (TEXT) — valores: fijo, indexado, spot
- indice_referencia (TEXT)
- prima_actual (NUMERIC 10,2)
- incoterm_actual (TEXT) — valores: EXW, FCA, DAP, DDP
- coste_transporte_separado (NUMERIC 10,4)
- consumo_anual_kg (NUMERIC 12,2)
- precio_benchmark (NUMERIC 10,4)
- notas (TEXT)
- created_at (TIMESTAMPTZ)

#### 4. chem_contract_audits
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- supplier_id (UUID FK → chem_suppliers) ← Para obtener nombre: hacer JOIN con chem_suppliers
- plazo_pago_dias (INT)
- pronto_pago_descuento_pct (NUMERIC 4,2)
- pronto_pago_dias (INT)
- duracion_contrato_meses (INT)
- fecha_vencimiento (DATE)
- renovacion_automatica (BOOLEAN)
- preaviso_no_renovacion_dias (INT)
- clausula_salida (BOOLEAN)
- volumen_comprometido_anual (NUMERIC 12,2)
- banda_volumen_min (NUMERIC 12,2)
- banda_volumen_max (NUMERIC 12,2)
- take_or_pay (BOOLEAN)
- penalizacion_take_or_pay (TEXT)
- formula_revision_existe (BOOLEAN)
- formula_revision_detalle (TEXT)
- indice_vinculado (TEXT)
- frecuencia_revision (TEXT) — valores: mensual, trimestral, semestral, anual, ninguna
- simetria_subida_bajada (BOOLEAN)
- cap_subida_pct (NUMERIC 5,2)
- floor_bajada_pct (NUMERIC 5,2)
- rappel_existe (BOOLEAN)
- rappel_detalle (TEXT)
- rappel_cobrado (BOOLEAN)
- stock_consigna (BOOLEAN)
- gestion_envases_vacios (TEXT) — valores: devolucion_proveedor, gestion_cliente_residuo, sin_definir
- coste_envases_incluido (BOOLEAN)
- servicio_tecnico_incluido (BOOLEAN)
- detalle_servicio_tecnico (TEXT)
- equipos_comodato (BOOLEAN)
- detalle_comodato (TEXT)
- clausula_mfn (BOOLEAN)
- score_precio (INT 1-4)
- score_condiciones (INT 1-4)
- score_servicio (INT 1-4)
- score_logistica (INT 1-4)
- notas_auditor (TEXT)
- created_at (TIMESTAMPTZ)

⚠️ NO EXISTE "proveedor_nombre" en esta tabla. Usar JOIN:
```typescript
const { data } = await externalSupabase
  .from('chem_contract_audits')
  .select('*, chem_suppliers(nombre)')
  .eq('project_id', projectId)
```

#### 5. chem_contract_documents
- id (UUID PK)
- audit_id (UUID FK → chem_contract_audits)
- supplier_id (UUID FK → chem_suppliers)
- project_id (UUID FK → chem_projects)
- tipo_documento (TEXT) — valores: contrato_formal, condiciones_generales, email_tarifa, oferta_aceptada, adenda, otro
- nombre_archivo (TEXT)
- file_url (TEXT)
- estado_extraccion (TEXT) — valores: pendiente, procesando, completado, error, sin_datos
- datos_extraidos (JSONB)
- confianza_extraccion (NUMERIC 3,2)
- campos_confirmados (JSONB)
- notas_extraccion (TEXT)
- created_at (TIMESTAMPTZ)

#### 6. chem_baselines
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- product_id (UUID FK → chem_products)
- supplier_id (UUID FK → chem_suppliers)
- materia_activa (TEXT)
- concentracion (NUMERIC 5,2)
- tipo_precio (TEXT) — valores: fijo, indexado, spot
- periodo_calculo_inicio (DATE)
- periodo_calculo_fin (DATE)
- volumen_referencia_anual_kg (NUMERIC 12,2)
- precio_medio_ponderado (NUMERIC 10,4)
- prima_baseline (NUMERIC 10,2)
- indice_referencia (TEXT)
- fuente_verificacion (TEXT) — valores: facturas_12_meses, facturas_24_meses, contrato_vigente, albaranes, otra
- firmado (BOOLEAN)
- fecha_firma (DATE)
- firmante_cliente (TEXT)
- firmante_era (TEXT)
- notas (TEXT)
- created_at (TIMESTAMPTZ)

#### 7. chem_benchmarks
- id (UUID PK)
- product_id (UUID FK → chem_products)
- project_id (UUID FK → chem_projects)
- estado_investigacion (TEXT) — valores: sin_investigar, en_curso, completado
- cotizacion_1_proveedor (TEXT), cotizacion_1_precio_dap (NUMERIC), cotizacion_1_fecha (DATE)
- cotizacion_2_proveedor (TEXT), cotizacion_2_precio_dap (NUMERIC), cotizacion_2_fecha (DATE)
- cotizacion_3_proveedor (TEXT), cotizacion_3_precio_dap (NUMERIC), cotizacion_3_fecha (DATE)
- datacomex_codigo_taric (TEXT), datacomex_precio_cif (NUMERIC), datacomex_periodo (TEXT)
- icis_precio_referencia (NUMERIC), icis_prima_mercado (NUMERIC), icis_fecha (DATE)
- benchmark_historico_precio (NUMERIC), benchmark_historico_proyecto (TEXT), benchmark_historico_fecha (DATE), benchmark_historico_ajustado (NUMERIC)
- created_at (TIMESTAMPTZ)

#### 8. chem_benchmark_library
- id (UUID PK)
- user_id (UUID FK → auth.users)
- nombre_materia_activa (TEXT)
- concentracion_porcentaje (NUMERIC 5,2)
- familia_quimica (TEXT)
- codigo_taric (TEXT)
- precio_dap_kg_producto (NUMERIC 10,4)
- precio_dap_kg_materia_activa (NUMERIC 10,4)
- fuente (TEXT) — valores: cotizacion_distribuidor, precio_contratado, datacomex, icis, chemanalyst
- proveedor (TEXT)
- zona_geografica (TEXT)
- volumen_anual_referencia (NUMERIC 12,2)
- incoterm (TEXT)
- proyecto_origen (TEXT)
- fecha_dato (DATE)
- vigente (BOOLEAN)
- notas (TEXT)
- created_at (TIMESTAMPTZ)

#### 9. chem_price_history
- id (UUID PK)
- product_id (UUID FK → chem_products)
- mes (DATE)
- importe_facturado (NUMERIC 12,2)
- cantidad_kg (NUMERIC 12,2)
- indice_icis_mes (NUMERIC 10,4)
- created_at (TIMESTAMPTZ)

#### 10. chem_plant_visits
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- fecha_visita (DATE)
- visitante (TEXT)
- acompanante_cliente (TEXT)
- checklist (JSONB)
- resumen_oportunidades (TEXT)
- created_at (TIMESTAMPTZ)

#### 11. chem_rfqs
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- titulo (TEXT)
- estado (TEXT) — valores: borrador, enviado, en_evaluación, adjudicado, cancelado
- fecha_envio (DATE)
- fecha_limite_respuesta (DATE)
- incoterm_solicitado (TEXT)
- condiciones_pago_ofrecidas (TEXT)
- especificaciones_tecnicas (TEXT)
- notas (TEXT)
- created_at (TIMESTAMPTZ)

#### 12. chem_rfq_products (tabla puente)
- rfq_id (UUID FK → chem_rfqs) PK
- product_id (UUID FK → chem_products) PK
- volumen_anual_estimado (NUMERIC 12,2)

#### 13. chem_rfq_suppliers (tabla puente)
- rfq_id (UUID FK → chem_rfqs) PK
- supplier_id (UUID FK → chem_suppliers) PK

#### 14. chem_offers
- id (UUID PK)
- rfq_id (UUID FK → chem_rfqs)
- supplier_id (UUID FK → chem_suppliers)
- product_id (UUID FK → chem_products)
- precio_ofertado_kg (NUMERIC 10,4)
- incoterm (TEXT)
- plazo_pago_dias (INT)
- incluye_transporte (BOOLEAN)
- incluye_servicio_tecnico (BOOLEAN)
- incluye_comodato (BOOLEAN)
- certificaciones (TEXT)
- observaciones (TEXT)
- created_at (TIMESTAMPTZ)

#### 15. chem_savings
- id (UUID PK)
- project_id (UUID FK → chem_projects)
- product_id (UUID FK → chem_products)
- tipo_ahorro (TEXT) — valores: precio_fijo, prima_indexada, condiciones_contractuales, formato_envase, consolidacion_volumen, sustitucion_producto, logistica
- baseline_precio (NUMERIC 10,4)
- nuevo_precio (NUMERIC 10,4)
- prima_anterior (NUMERIC 10,2)
- prima_nueva (NUMERIC 10,2)
- volumen_real_12m (NUMERIC 12,2)
- mes (DATE)
- ahorro_real_mes (NUMERIC 12,2)
- created_at (TIMESTAMPTZ)

---

### VISTAS CALCULADAS

#### v_chem_products_calculated
Todos los campos de chem_products + campos calculados:
- proveedor_actual_nombre (TEXT) — JOIN con chem_suppliers
- precio_kg_materia_activa — precio / (concentración / 100)
- precio_puesto_planta — precio + transporte
- gasto_anual — precio × consumo
- gap_vs_benchmark_pct — diferencia % vs benchmark
- potencial_ahorro — ahorro estimado en €

#### v_chem_project_summary
- project_id, nombre_cliente, sector_industrial, estado, user_id
- num_productos, num_proveedores, gasto_total_anual
- num_auditorias, num_rfqs, ahorro_total_acumulado
- created_at, updated_at

---

### CÓMO OBTENER NOMBRE DE PROVEEDOR (patrón correcto)

```typescript
// Para auditorías con nombre de proveedor:
const { data } = await externalSupabase
  .from('chem_contract_audits')
  .select('*, chem_suppliers(nombre)')
  .eq('project_id', projectId)

// Acceder: audit.chem_suppliers.nombre

// Para productos con nombre de proveedor:
// Usar la vista v_chem_products_calculated que ya incluye proveedor_actual_nombre
const { data } = await externalSupabase
  .from('v_chem_products_calculated')
  .select('*')
  .eq('project_id', projectId)
```

### Storage Bucket

- Nombre: chem-documents (privado)
- Límite: 50MB
- Tipos: PDF, Excel, Word, JPEG, PNG, WebP
