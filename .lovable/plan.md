

# Agregar boton Descargar Word a ChemVisita

## Estado actual
Los 2 bugs (parsing de respuesta y fecha_visita) ya estan corregidos en el codigo actual. Solo falta implementar la descarga DOCX.

## Cambios en `src/pages/chemicals/ChemVisita.tsx`

### 1. Agregar import de FileDown
Anadir `FileDown` a los imports de lucide-react (linea 13).

### 2. Agregar estado isDownloading
Nuevo estado `const [isDownloading, setIsDownloading] = useState(false)` junto a los demas estados.

### 3. Funcion downloadDocx
Nueva funcion que:
- Llama a `GET /api/chem-consulting/projects/{projectId}/plant-visits/{visitId}/report/docx`
- Recibe el blob y lo descarga como archivo `.docx`
- Muestra toast de exito/error
- Maneja estado de loading

### 4. Boton en el header
Anadir un boton "Descargar Word" con icono FileDown al lado del contador de observados (lineas 211-223). Muestra spinner (Loader2) durante la descarga.

**Resultado visual del header:**

```text
Visita a Planta          5/20 observados  (3 IA)  [Descargar Word]
```

## Resumen
- 1 archivo modificado: `src/pages/chemicals/ChemVisita.tsx`
- 4 cambios puntuales: import, estado, funcion, boton
- Sin dependencias nuevas
