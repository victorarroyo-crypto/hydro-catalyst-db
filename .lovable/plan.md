
# Plan: Añadir Rutas Admin al Menú de Cost Consulting

## Problema Detectado
El menú "Consultoría de Costes" en la barra lateral solo muestra 3 opciones:
- Mis Análisis
- Nuevo Análisis  
- Proveedores

Faltan las rutas de administración que acabamos de crear.

## Cambios Requeridos

### Archivo: `src/components/layout/AppSidebar.tsx`

Actualizar el array `costConsultingSubItems` (líneas 86-90) para incluir:

| Opción | Ruta | Icono | Notas |
|--------|------|-------|-------|
| Mis Análisis | `/cost-consulting` | FileText | Ya existe |
| Nuevo Análisis | `/cost-consulting/new` | Rocket | Ya existe |
| Proveedores | `/cost-consulting/suppliers` | Building2 | Ya existe |
| **Benchmarks** | `/cost-consulting/benchmarks` | BarChart3 | **AÑADIR** |
| --- separador visual --- | | | |
| **Admin Proveedores** | `/cost-consulting/admin/suppliers` | Shield | **AÑADIR** (solo admins) |
| **Admin Benchmarks** | `/cost-consulting/admin/benchmarks` | Shield | **AÑADIR** (solo admins) |

### Estructura Propuesta del Menú

```
📊 Consultoría de Costes
├── 📄 Mis Análisis
├── 🚀 Nuevo Análisis
├── 🏢 Proveedores
├── 📈 Benchmarks
└── ⚙️ Administración (submenú colapsable)
    ├── 🛡️ Gestión Proveedores
    └── 🛡️ Gestión Benchmarks
```

### Implementación

1. Añadir nuevas rutas al array `costConsultingSubItems`
2. Opcionalmente, crear un submenú anidado "Administración" para las rutas admin
3. Usar icono `Shield` o `Settings` para indicar que son opciones de administración

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/AppSidebar.tsx` | Añadir rutas admin al menú Cost Consulting |

