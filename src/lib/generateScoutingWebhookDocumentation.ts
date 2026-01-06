import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const createBorderedCell = (text: string, isHeader = false) => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: isHeader ? 22 : 20,
          }),
        ],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    shading: isHeader ? { fill: 'E8E8E8' } : undefined,
  });
};

export async function generateScoutingWebhookDocumentation() {
  const doc = new Document({
    sections: [
      {
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sistema de Seguimiento de Scouting',
                bold: true,
                size: 48,
                color: '2E86AB',
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Documentación Técnica de Integración Railway ↔ Lovable Cloud',
                italics: true,
                size: 24,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generado: ${new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`,
                size: 20,
                color: '888888',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // Section 1: Overview
          new Paragraph({
            text: '1. VISIÓN GENERAL',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Este documento describe cómo implementar un sistema de comunicación bidireccional entre el backend de Railway (donde se ejecuta el scouting) y Lovable Cloud (donde se visualiza el progreso y se almacenan los resultados).',
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Objetivos del Sistema:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Seguimiento en tiempo real del progreso del scouting', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Captura de métricas detalladas (sitios visitados, tecnologías encontradas)', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Generación automática de informes finales', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Notificaciones de errores y alertas', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Historial completo de ejecuciones', size: 22 })],
            indent: { left: 400 },
            spacing: { after: 400 },
          }),

          // Section 2: Architecture
          new Paragraph({
            text: '2. ARQUITECTURA DEL SISTEMA',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Flujo de Comunicación:',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `
┌─────────────────────────────────────────────────────────────────────────┐
│                          RAILWAY BACKEND                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Inicio    │───▶│  Análisis   │───▶│ Validación  │                  │
│  │  Scouting   │    │   Papers    │    │ Proveedores │                  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                  │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│    POST /webhook      POST /webhook      POST /webhook                   │
│    (phase: init)     (phase: research)  (phase: validate)               │
└─────────┬──────────────────┬──────────────────┬─────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LOVABLE CLOUD                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │               Edge Function: scouting-webhook                     │   │
│  │  • Recibe actualizaciones de progreso                            │   │
│  │  • Almacena en tabla scouting_progress                           │   │
│  │  • Genera eventos realtime para UI                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Base de Datos                                  │   │
│  │  • scouting_progress (logs en tiempo real)                       │   │
│  │  • scouting_reports (informes finales)                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
`,
                font: 'Courier New',
                size: 16,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Section 3: Webhook Endpoint
          new Paragraph({
            text: '3. ENDPOINT DEL WEBHOOK',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'URL del Webhook:',
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/scouting-webhook',
                font: 'Courier New',
                size: 20,
                color: '0066CC',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Método: POST',
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Headers requeridos:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createBorderedCell('Header', true),
                  createBorderedCell('Valor', true),
                  createBorderedCell('Descripción', true),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Content-Type'),
                  createBorderedCell('application/json'),
                  createBorderedCell('Tipo de contenido'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('x-webhook-secret'),
                  createBorderedCell('[SECRET_KEY]'),
                  createBorderedCell('Clave secreta para autenticar el webhook'),
                ],
              }),
            ],
          }),

          // Section 4: Payload Structure
          new Paragraph({
            text: '4. ESTRUCTURA DEL PAYLOAD',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '4.1 Actualización de Progreso (Durante el Scouting)',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `{
  "event_type": "progress",
  "scouting_id": "uuid-del-scouting",
  "timestamp": "2024-01-15T10:30:00Z",
  "phase": "researching",
  "phase_progress": 45,
  "message": "Analizando papers académicos...",
  "metrics": {
    "sources_checked": 15,
    "sources_total": 50,
    "technologies_found": 8,
    "technologies_discarded": 3,
    "current_source": "IEEE Xplore",
    "elapsed_time_ms": 45000
  },
  "details": {
    "last_technology_found": "Quantum Computing Platform",
    "last_source_checked": "https://ieeexplore.ieee.org/...",
    "errors_count": 0
  }
}`,
                font: 'Courier New',
                size: 18,
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '4.2 Finalización del Scouting (Informe Final)',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `{
  "event_type": "complete",
  "scouting_id": "uuid-del-scouting",
  "timestamp": "2024-01-15T11:00:00Z",
  "status": "success",
  "summary": {
    "total_duration_ms": 1800000,
    "phases_completed": [
      {"phase": "init", "duration_ms": 5000},
      {"phase": "analyzing", "duration_ms": 120000},
      {"phase": "researching", "duration_ms": 600000},
      {"phase": "validating", "duration_ms": 480000},
      {"phase": "extracting", "duration_ms": 300000},
      {"phase": "evaluating", "duration_ms": 240000},
      {"phase": "completing", "duration_ms": 55000}
    ],
    "sources": {
      "total_checked": 50,
      "successful": 47,
      "failed": 3,
      "by_type": {
        "academic_papers": 20,
        "tech_blogs": 15,
        "company_websites": 10,
        "patent_databases": 5
      }
    },
    "technologies": {
      "total_found": 25,
      "approved_for_review": 18,
      "discarded": 7,
      "by_sector": {
        "energia": 8,
        "manufactura": 6,
        "tecnologia": 4
      },
      "by_trl": {
        "1-3": 5,
        "4-6": 10,
        "7-9": 3
      }
    },
    "errors": [],
    "warnings": [
      "3 fuentes no respondieron (timeout)"
    ]
  }
}`,
                font: 'Courier New',
                size: 18,
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '4.3 Notificación de Error',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `{
  "event_type": "error",
  "scouting_id": "uuid-del-scouting",
  "timestamp": "2024-01-15T10:45:00Z",
  "phase": "validating",
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "Timeout al validar proveedor: TechCorp",
    "severity": "warning",
    "recoverable": true,
    "details": {
      "url": "https://techcorp.com",
      "timeout_ms": 30000
    }
  }
}`,
                font: 'Courier New',
                size: 18,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Section 5: Phases
          new Paragraph({
            text: '5. FASES DEL SCOUTING',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createBorderedCell('Fase', true),
                  createBorderedCell('Código', true),
                  createBorderedCell('Descripción', true),
                  createBorderedCell('Cuándo enviar webhook', true),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Inicialización'),
                  createBorderedCell('init'),
                  createBorderedCell('Configurando parámetros del scouting'),
                  createBorderedCell('Al iniciar el proceso'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Análisis DB'),
                  createBorderedCell('analyzing'),
                  createBorderedCell('Analizando base de datos existente'),
                  createBorderedCell('Cada 10% de progreso'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Investigación'),
                  createBorderedCell('researching'),
                  createBorderedCell('Buscando en papers y fuentes'),
                  createBorderedCell('Por cada fuente procesada'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Validación'),
                  createBorderedCell('validating'),
                  createBorderedCell('Validando proveedores encontrados'),
                  createBorderedCell('Por cada proveedor validado'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Extracción'),
                  createBorderedCell('extracting'),
                  createBorderedCell('Extrayendo información de tecnologías'),
                  createBorderedCell('Por cada tecnología extraída'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Evaluación'),
                  createBorderedCell('evaluating'),
                  createBorderedCell('Evaluando y puntuando tecnologías'),
                  createBorderedCell('Cada 5 tecnologías evaluadas'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('Finalización'),
                  createBorderedCell('completing'),
                  createBorderedCell('Guardando resultados finales'),
                  createBorderedCell('Al completar'),
                ],
              }),
            ],
          }),

          // Section 6: Implementation in Railway
          new Paragraph({
            text: '6. IMPLEMENTACIÓN EN RAILWAY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '6.1 Función de Envío de Webhook (Python)',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `import httpx
import os
from datetime import datetime
from typing import Optional, Dict, Any

WEBHOOK_URL = "https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/scouting-webhook"
WEBHOOK_SECRET = os.getenv("SCOUTING_WEBHOOK_SECRET")

class ScoutingProgressTracker:
    def __init__(self, scouting_id: str):
        self.scouting_id = scouting_id
        self.start_time = datetime.now()
        self.metrics = {
            "sources_checked": 0,
            "sources_total": 0,
            "technologies_found": 0,
            "technologies_discarded": 0,
            "current_source": None,
            "elapsed_time_ms": 0
        }
    
    async def send_progress(
        self, 
        phase: str, 
        phase_progress: int, 
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Envía actualización de progreso al webhook"""
        self.metrics["elapsed_time_ms"] = int(
            (datetime.now() - self.start_time).total_seconds() * 1000
        )
        
        payload = {
            "event_type": "progress",
            "scouting_id": self.scouting_id,
            "timestamp": datetime.now().isoformat(),
            "phase": phase,
            "phase_progress": phase_progress,
            "message": message,
            "metrics": self.metrics,
            "details": details or {}
        }
        
        await self._send_webhook(payload)
    
    async def send_complete(self, summary: Dict[str, Any]):
        """Envía informe final al webhook"""
        payload = {
            "event_type": "complete",
            "scouting_id": self.scouting_id,
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "summary": summary
        }
        
        await self._send_webhook(payload)
    
    async def send_error(
        self, 
        phase: str, 
        code: str, 
        message: str,
        severity: str = "error",
        recoverable: bool = False,
        details: Optional[Dict[str, Any]] = None
    ):
        """Envía notificación de error al webhook"""
        payload = {
            "event_type": "error",
            "scouting_id": self.scouting_id,
            "timestamp": datetime.now().isoformat(),
            "phase": phase,
            "error": {
                "code": code,
                "message": message,
                "severity": severity,
                "recoverable": recoverable,
                "details": details or {}
            }
        }
        
        await self._send_webhook(payload)
    
    async def _send_webhook(self, payload: Dict[str, Any]):
        """Envía el payload al webhook de Lovable Cloud"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    WEBHOOK_URL,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "x-webhook-secret": WEBHOOK_SECRET
                    },
                    timeout=10.0
                )
                response.raise_for_status()
        except Exception as e:
            # Log error but don't fail the scouting process
            print(f"Warning: Failed to send webhook: {e}")
`,
                font: 'Courier New',
                size: 16,
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '6.2 Ejemplo de Uso en el Proceso de Scouting',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `async def run_scouting(scouting_id: str, config: Dict):
    tracker = ScoutingProgressTracker(scouting_id)
    
    # Fase 1: Inicialización
    await tracker.send_progress("init", 0, "Inicializando scouting...")
    sources = load_sources(config)
    tracker.metrics["sources_total"] = len(sources)
    
    # Fase 2: Análisis de DB
    await tracker.send_progress("analyzing", 0, "Analizando base de datos existente...")
    existing_technologies = await analyze_database()
    await tracker.send_progress("analyzing", 100, f"Encontradas {len(existing_technologies)} tecnologías existentes")
    
    # Fase 3: Investigación
    technologies_found = []
    for i, source in enumerate(sources):
        tracker.metrics["current_source"] = source.name
        tracker.metrics["sources_checked"] = i + 1
        
        await tracker.send_progress(
            "researching", 
            int((i + 1) / len(sources) * 100),
            f"Investigando: {source.name}",
            {"last_source_checked": source.url}
        )
        
        try:
            found = await research_source(source)
            technologies_found.extend(found)
            tracker.metrics["technologies_found"] = len(technologies_found)
        except Exception as e:
            await tracker.send_error(
                "researching",
                "SOURCE_ERROR",
                f"Error al procesar {source.name}: {str(e)}",
                severity="warning",
                recoverable=True
            )
    
    # Fase 4: Validación
    validated = []
    for i, tech in enumerate(technologies_found):
        await tracker.send_progress(
            "validating",
            int((i + 1) / len(technologies_found) * 100),
            f"Validando: {tech.name}"
        )
        if await validate_technology(tech):
            validated.append(tech)
        else:
            tracker.metrics["technologies_discarded"] += 1
    
    # Fase 5: Extracción
    enriched = []
    for i, tech in enumerate(validated):
        await tracker.send_progress(
            "extracting",
            int((i + 1) / len(validated) * 100),
            f"Extrayendo información: {tech.name}"
        )
        enriched_tech = await extract_details(tech)
        enriched.append(enriched_tech)
    
    # Fase 6: Evaluación
    for i, tech in enumerate(enriched):
        await tracker.send_progress(
            "evaluating",
            int((i + 1) / len(enriched) * 100),
            f"Evaluando: {tech.name}"
        )
        tech.score = await evaluate_technology(tech)
    
    # Fase 7: Finalización
    await tracker.send_progress("completing", 50, "Guardando resultados...")
    await save_to_database(enriched)
    
    # Enviar resumen final
    summary = {
        "total_duration_ms": tracker.metrics["elapsed_time_ms"],
        "sources": {
            "total_checked": tracker.metrics["sources_checked"],
            "successful": tracker.metrics["sources_checked"],
            "failed": 0
        },
        "technologies": {
            "total_found": tracker.metrics["technologies_found"],
            "approved_for_review": len(enriched),
            "discarded": tracker.metrics["technologies_discarded"]
        }
    }
    
    await tracker.send_complete(summary)
`,
                font: 'Courier New',
                size: 16,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Section 7: Configuration
          new Paragraph({
            text: '7. CONFIGURACIÓN NECESARIA',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '7.1 Variables de Entorno en Railway',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createBorderedCell('Variable', true),
                  createBorderedCell('Descripción', true),
                  createBorderedCell('Ejemplo', true),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('SCOUTING_WEBHOOK_SECRET'),
                  createBorderedCell('Clave secreta para autenticar webhooks'),
                  createBorderedCell('sk_scouting_xyz123...'),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '7.2 Configuración en Lovable Cloud',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Los siguientes componentes serán creados automáticamente:',
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Edge Function: scouting-webhook (recibe y procesa webhooks)', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Tabla: scouting_progress (almacena logs de progreso)', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Tabla: scouting_reports (almacena informes finales)', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '• Secret: SCOUTING_WEBHOOK_SECRET (misma clave que Railway)', size: 22 })],
            indent: { left: 400 },
            spacing: { after: 400 },
          }),

          // Section 8: Response Codes
          new Paragraph({
            text: '8. CÓDIGOS DE RESPUESTA DEL WEBHOOK',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createBorderedCell('Código', true),
                  createBorderedCell('Significado', true),
                  createBorderedCell('Acción Railway', true),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('200'),
                  createBorderedCell('Webhook procesado correctamente'),
                  createBorderedCell('Continuar normalmente'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('400'),
                  createBorderedCell('Payload inválido'),
                  createBorderedCell('Revisar formato del JSON'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('401'),
                  createBorderedCell('Secret inválido'),
                  createBorderedCell('Verificar SCOUTING_WEBHOOK_SECRET'),
                ],
              }),
              new TableRow({
                children: [
                  createBorderedCell('500'),
                  createBorderedCell('Error interno'),
                  createBorderedCell('Reintentar con backoff exponencial'),
                ],
              }),
            ],
          }),

          // Section 9: Best Practices
          new Paragraph({
            text: '9. MEJORES PRÁCTICAS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. Frecuencia de Webhooks', bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • No enviar más de 1 webhook por segundo', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • Agrupar actualizaciones cuando sea posible', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • Enviar siempre al cambiar de fase', size: 22 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '2. Manejo de Errores', bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • No fallar el scouting si el webhook falla', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • Implementar reintentos con backoff exponencial', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • Loguear errores localmente como respaldo', size: 22 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '3. Timeouts', bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • Timeout del webhook: 10 segundos', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '   • No bloquear el proceso principal esperando respuesta', size: 22 })],
            spacing: { after: 400 },
          }),

          // Section 10: Testing
          new Paragraph({
            text: '10. PRUEBAS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Comando cURL para probar el webhook:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `curl -X POST \\
  "https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/scouting-webhook" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_SECRET_HERE" \\
  -d '{
    "event_type": "progress",
    "scouting_id": "test-123",
    "timestamp": "2024-01-15T10:30:00Z",
    "phase": "init",
    "phase_progress": 0,
    "message": "Test webhook",
    "metrics": {
      "sources_checked": 0,
      "sources_total": 10,
      "technologies_found": 0,
      "technologies_discarded": 0
    }
  }'`,
                font: 'Courier New',
                size: 16,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Section 11: Next Steps
          new Paragraph({
            text: '11. PRÓXIMOS PASOS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. Generar una clave secreta segura para el webhook', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '2. Configurar la variable SCOUTING_WEBHOOK_SECRET en Railway', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '3. Confirmar en Lovable para crear las tablas y edge function', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '4. Implementar el ScoutingProgressTracker en el código de Railway', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '5. Probar con el comando cURL de ejemplo', size: 22 })],
            indent: { left: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '6. Ejecutar un scouting de prueba y verificar el tracking en la UI', size: 22 })],
            indent: { left: 400 },
            spacing: { after: 400 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: '─'.repeat(70),
                color: 'CCCCCC',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Documentación generada por Vandarum Technology Radar',
                italics: true,
                size: 18,
                color: '888888',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Integracion_Webhook_Scouting_${new Date().toISOString().split('T')[0]}.docx`);
}
