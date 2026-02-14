

# Rediseno del Dashboard General (/dashboard)

## Problema

El dashboard general actual muestra solo stats de tecnologias (BD, casos de estudio, tendencias, proyectos) y 3 accesos rapidos fijos. El proyecto ahora tiene 6+ modulos completos que no se reflejan: Consultoria de Procesos, Agua Industrial (Cost Consulting), Quimicos, Scouting, Advisor IA, y Herramientas IA. El usuario llega al dashboard y no tiene visibilidad de la actividad reciente ni accesos a los modulos nuevos.

## Nuevo diseno

### Layout (de arriba a abajo)

**1. Hero/Welcome** (mantener, simplificar texto)
Se mantiene el banner de bienvenida actual pero con texto mas generico que refleje la plataforma completa, no solo "tecnologias del agua".

**2. KPI Row -- 6 cards**
| Tecnologias | Proyectos Consultoria | Analisis Agua Industrial | Proyectos Quimicos | Scouting Sessions | Casos de Estudio |

Cada card con dato real consultado. Se reemplazan las 5 stats actuales por 6 mas relevantes que cubren todos los modulos.

**3. Modulos de la Plataforma (grid 2x3)**
Cards de acceso rapido para cada modulo principal, con icono, descripcion corta y count de items activos:
- BD Tecnologias (catalogo + count)
- Consultoria de Procesos (proyectos activos)
- Agua Industrial (analisis activos)
- Quimicos (proyectos activos)
- Scouting IA (sesiones)
- Advisor IA (acceso directo)

**4. Panel Admin** (solo admin/supervisor, mantener)
- Estado de tecnologias (mantener desglose actual)
- Sugerencias pendientes (mantener widget actual)

### Fuentes de datos

Datos actuales que se mantienen:
- `externalSupabase.from('technologies')` -- count total
- `externalSupabase.from('casos_de_estudio')` -- count
- `comparisonProjectsService.list()` -- proyectos scouting
- `supabase.from('technology_edits')` -- edits pendientes (admin)

Datos nuevos a agregar:
- `fetch(API_URL + '/api/projects')` -- count proyectos consultoria
- `fetch(API_URL + '/api/cost-consulting/projects')` -- count analisis agua industrial
- `externalSupabase.from('chem_projects')` -- count proyectos quimicos
- `externalSupabase.from('scouting_sessions')` -- count sesiones scouting

## Seccion tecnica

### Archivo a modificar: `src/pages/Dashboard.tsx`

**Cambios principales:**

1. **Queries adicionales**: Agregar 3 queries ligeras para counts de Consultoria, Agua Industrial y Quimicos. Cada una independiente y opcional (si falla, muestra "--").

2. **KPI Cards refactorizadas**: De 5 stats cards a 6, cubriendo todos los modulos. Se usa el mismo componente `StatsCard` existente.

3. **Grid de Modulos**: Reemplazar los 3 "Accesos Rapidos" fijos por un grid de 6 cards de modulos con count de actividad, icono tematico y link directo. Cada card incluye:
   - Icono del modulo
   - Nombre
   - Descripcion corta (1 linea)
   - Badge con count de items activos (si disponible)
   - Link a la pagina raiz del modulo

4. **Panel Admin**: Mantener sin cambios el bloque de "Estado de Tecnologias" y "Sugerencias Pendientes". Solo moverlos debajo del grid de modulos.

5. **Iconos**: Agregar imports de `FlaskConical`, `Radar`, `MessageSquare`, `Beaker` (o similares) desde lucide-react para los nuevos modulos.

### Archivos que NO se tocan
- `src/components/StatsCard.tsx` (se reutiliza tal cual)
- `src/components/layout/AppSidebar.tsx` (sin cambios)
- Ninguna pagina de modulos individuales

### Manejo de errores
Las queries nuevas son opcionales. Si alguna falla (ej: API de Railway no responde), ese KPI muestra "--" y la card del modulo sigue siendo clickeable pero sin badge de count.
