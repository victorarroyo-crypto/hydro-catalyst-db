import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Database, Link2, Languages, ArrowRight, FileText, Download } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

// Schema data extracted from database
const schemaData = {
  tables: [
    {
      name: 'technologies',
      description: 'Tabla principal de tecnologías',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'Nombre de la tecnología', type: 'text', language: 'es' },
        { name: 'Tipo de tecnología', type: 'text', language: 'es' },
        { name: 'Subcategoría', type: 'text', language: 'es' },
        { name: 'Sector y subsector', type: 'text', language: 'es' },
        { name: 'Proveedor / Empresa', type: 'text', language: 'es' },
        { name: 'País de origen', type: 'text', language: 'es' },
        { name: 'Paises donde actua', type: 'text', language: 'es' },
        { name: 'Web de la empresa', type: 'text', language: 'es' },
        { name: 'Email de contacto', type: 'text', language: 'es' },
        { name: 'Descripción técnica breve', type: 'text', language: 'es' },
        { name: 'Aplicación principal', type: 'text', language: 'es' },
        { name: 'Ventaja competitiva clave', type: 'text', language: 'es' },
        { name: 'Porque es innovadora', type: 'text', language: 'es' },
        { name: 'Grado de madurez (TRL)', type: 'integer', language: 'es' },
        { name: 'Casos de referencia', type: 'text', language: 'es' },
        { name: 'Comentarios del analista', type: 'text', language: 'es' },
        { name: 'Fecha de scouting', type: 'date', language: 'es' },
        { name: 'Estado del seguimiento', type: 'text', language: 'es' },
        { name: 'tipo_id', type: 'integer', language: 'en' },
        { name: 'subcategoria_id', type: 'integer', language: 'mixed' },
        { name: 'sector_id', type: 'varchar', language: 'en' },
        { name: 'subsector_industrial', type: 'varchar', language: 'es' },
        { name: 'status', type: 'text', language: 'en' },
        { name: 'quality_score', type: 'integer', language: 'en' },
        { name: 'review_status', type: 'text', language: 'en' },
        { name: 'updated_by', type: 'uuid', language: 'en' },
        { name: 'reviewer_id', type: 'uuid', language: 'en' },
        { name: 'reviewed_at', type: 'timestamptz', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'scouting_queue',
      description: 'Cola de tecnologías pendientes de revisión',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'Nombre de la tecnología', type: 'text', language: 'es' },
        { name: 'Tipo de tecnología', type: 'text', language: 'es' },
        { name: 'Subcategoría', type: 'text', language: 'es' },
        { name: 'Sector y subsector', type: 'text', language: 'es' },
        { name: 'Proveedor / Empresa', type: 'text', language: 'es' },
        { name: 'País de origen', type: 'text', language: 'es' },
        { name: 'Paises donde actua', type: 'text', language: 'es' },
        { name: 'Web de la empresa', type: 'text', language: 'es' },
        { name: 'Email de contacto', type: 'text', language: 'es' },
        { name: 'Descripción técnica breve', type: 'text', language: 'es' },
        { name: 'Aplicación principal', type: 'text', language: 'es' },
        { name: 'Ventaja competitiva clave', type: 'text', language: 'es' },
        { name: 'Porque es innovadora', type: 'text', language: 'es' },
        { name: 'Grado de madurez (TRL)', type: 'integer', language: 'es' },
        { name: 'Casos de referencia', type: 'text', language: 'es' },
        { name: 'Comentarios del analista', type: 'text', language: 'es' },
        { name: 'Fecha de scouting', type: 'date', language: 'es' },
        { name: 'Estado del seguimiento', type: 'text', language: 'es' },
        { name: 'tipo_id', type: 'integer', language: 'en' },
        { name: 'subcategoria_id', type: 'integer', language: 'mixed' },
        { name: 'sector_id', type: 'varchar', language: 'en' },
        { name: 'subsector_industrial', type: 'varchar', language: 'es' },
        { name: 'source', type: 'text', language: 'en' },
        { name: 'source_url', type: 'text', language: 'en' },
        { name: 'priority', type: 'text', language: 'en' },
        { name: 'notes', type: 'text', language: 'en' },
        { name: 'queue_status', type: 'text', language: 'en' },
        { name: 'rejection_reason', type: 'text', language: 'en' },
        { name: 'created_by', type: 'uuid', language: 'en' },
        { name: 'reviewed_by', type: 'uuid', language: 'en' },
        { name: 'reviewed_at', type: 'timestamptz', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'rejected_technologies',
      description: 'Tecnologías rechazadas',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'original_scouting_id', type: 'uuid', language: 'en' },
        { name: 'Nombre de la tecnología', type: 'text', language: 'es' },
        { name: 'Tipo de tecnología', type: 'text', language: 'es' },
        { name: 'Subcategoría', type: 'text', language: 'es' },
        { name: 'Sector y subsector', type: 'text', language: 'es' },
        { name: 'Proveedor / Empresa', type: 'text', language: 'es' },
        { name: 'País de origen', type: 'text', language: 'es' },
        { name: 'Paises donde actua', type: 'text', language: 'es' },
        { name: 'Web de la empresa', type: 'text', language: 'es' },
        { name: 'Email de contacto', type: 'text', language: 'es' },
        { name: 'Descripción técnica breve', type: 'text', language: 'es' },
        { name: 'Aplicación principal', type: 'text', language: 'es' },
        { name: 'Ventaja competitiva clave', type: 'text', language: 'es' },
        { name: 'Porque es innovadora', type: 'text', language: 'es' },
        { name: 'Grado de madurez (TRL)', type: 'integer', language: 'es' },
        { name: 'Casos de referencia', type: 'text', language: 'es' },
        { name: 'Comentarios del analista', type: 'text', language: 'es' },
        { name: 'Fecha de scouting', type: 'date', language: 'es' },
        { name: 'Estado del seguimiento', type: 'text', language: 'es' },
        { name: 'tipo_id', type: 'integer', language: 'en' },
        { name: 'subcategoria_id', type: 'integer', language: 'mixed' },
        { name: 'sector_id', type: 'varchar', language: 'en' },
        { name: 'subsector_industrial', type: 'varchar', language: 'es' },
        { name: 'rejection_reason', type: 'text', language: 'en' },
        { name: 'rejection_category', type: 'text', language: 'en' },
        { name: 'original_data', type: 'jsonb', language: 'en' },
        { name: 'rejected_at', type: 'timestamptz', language: 'en' },
        { name: 'rejected_by', type: 'uuid', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'casos_de_estudio',
      description: 'Casos de estudio',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'name', type: 'text', language: 'en' },
        { name: 'description', type: 'text', language: 'en' },
        { name: 'entity_type', type: 'text', language: 'en' },
        { name: 'country', type: 'text', language: 'en' },
        { name: 'sector', type: 'text', language: 'en' },
        { name: 'technology_types', type: 'array', language: 'en' },
        { name: 'original_data', type: 'jsonb', language: 'en' },
        { name: 'source_technology_id', type: 'uuid', language: 'en' },
        { name: 'created_by', type: 'uuid', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'technological_trends',
      description: 'Tendencias tecnológicas',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'name', type: 'text', language: 'en' },
        { name: 'description', type: 'text', language: 'en' },
        { name: 'technology_type', type: 'text', language: 'en' },
        { name: 'subcategory', type: 'text', language: 'en' },
        { name: 'sector', type: 'text', language: 'en' },
        { name: 'original_data', type: 'jsonb', language: 'en' },
        { name: 'source_technology_id', type: 'uuid', language: 'en' },
        { name: 'created_by', type: 'uuid', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'taxonomy_tipos',
      description: 'Tipos de tecnología (taxonomía)',
      columns: [
        { name: 'id', type: 'integer', language: 'en' },
        { name: 'codigo', type: 'varchar', language: 'es' },
        { name: 'nombre', type: 'varchar', language: 'es' },
        { name: 'descripcion', type: 'text', language: 'es' },
      ]
    },
    {
      name: 'taxonomy_subcategorias',
      description: 'Subcategorías (taxonomía)',
      columns: [
        { name: 'id', type: 'integer', language: 'en' },
        { name: 'tipo_id', type: 'integer', language: 'en' },
        { name: 'codigo', type: 'varchar', language: 'es' },
        { name: 'nombre', type: 'varchar', language: 'es' },
      ]
    },
    {
      name: 'taxonomy_sectores',
      description: 'Sectores (taxonomía)',
      columns: [
        { name: 'id', type: 'varchar', language: 'en' },
        { name: 'nombre', type: 'varchar', language: 'es' },
        { name: 'descripcion', type: 'text', language: 'es' },
      ]
    },
    {
      name: 'scouting_sources',
      description: 'Fuentes de scouting',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'nombre', type: 'text', language: 'es' },
        { name: 'url', type: 'text', language: 'en' },
        { name: 'tipo', type: 'text', language: 'es' },
        { name: 'descripcion', type: 'text', language: 'es' },
        { name: 'pais', type: 'text', language: 'es' },
        { name: 'sector_foco', type: 'text', language: 'es' },
        { name: 'tecnologias_foco', type: 'text', language: 'es' },
        { name: 'frecuencia_escaneo', type: 'text', language: 'es' },
        { name: 'ultima_revision', type: 'timestamptz', language: 'es' },
        { name: 'proxima_revision', type: 'timestamptz', language: 'es' },
        { name: 'tecnologias_encontradas', type: 'integer', language: 'es' },
        { name: 'calidad_score', type: 'integer', language: 'es' },
        { name: 'activo', type: 'boolean', language: 'es' },
        { name: 'notas', type: 'text', language: 'es' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
        { name: 'created_by', type: 'uuid', language: 'en' },
      ]
    },
    {
      name: 'projects',
      description: 'Proyectos',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'name', type: 'text', language: 'en' },
        { name: 'description', type: 'text', language: 'en' },
        { name: 'client_id', type: 'uuid', language: 'en' },
        { name: 'status', type: 'text', language: 'en' },
        { name: 'target_date', type: 'date', language: 'en' },
        { name: 'notes', type: 'text', language: 'en' },
        { name: 'responsible_user_id', type: 'uuid', language: 'en' },
        { name: 'created_by', type: 'uuid', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
      ]
    },
    {
      name: 'profiles',
      description: 'Perfiles de usuario',
      columns: [
        { name: 'id', type: 'uuid', language: 'en' },
        { name: 'user_id', type: 'uuid', language: 'en' },
        { name: 'full_name', type: 'text', language: 'en' },
        { name: 'role', type: 'app_role', language: 'en' },
        { name: 'created_at', type: 'timestamptz', language: 'en' },
        { name: 'updated_at', type: 'timestamptz', language: 'en' },
      ]
    },
  ]
};

// Inconsistencies detected
const inconsistencies = [
  {
    type: 'language_mix',
    severity: 'high',
    tables: ['technologies', 'scouting_queue', 'rejected_technologies'],
    description: 'Mezcla de campos en español (con espacios y acentos) e inglés (snake_case)',
    examples: [
      '"Nombre de la tecnología" vs "name" (en otras tablas)',
      '"País de origen" vs "country" (en casos_de_estudio)',
      '"Tipo de tecnología" vs "technology_type" (en technological_trends)',
    ]
  },
  {
    type: 'naming_convention',
    severity: 'high',
    tables: ['technologies', 'scouting_queue', 'rejected_technologies'],
    description: 'Campos de negocio usan espacios y caracteres especiales, campos técnicos usan snake_case',
    examples: [
      '"Proveedor / Empresa" - contiene espacios y barra',
      '"Grado de madurez (TRL)" - contiene paréntesis',
      '"Paises donde actua" - falta tilde, inconsistente con "País de origen"',
    ]
  },
  {
    type: 'semantic_inconsistency',
    severity: 'medium',
    tables: ['technologies', 'casos_de_estudio', 'technological_trends'],
    description: 'Campos que representan lo mismo tienen nombres diferentes entre tablas',
    examples: [
      'technologies."Nombre de la tecnología" vs casos_de_estudio.name vs technological_trends.name',
      'technologies."País de origen" vs casos_de_estudio.country',
      'technologies."Tipo de tecnología" vs technological_trends.technology_type',
      'technologies."Subcategoría" vs technological_trends.subcategory',
    ]
  },
  {
    type: 'type_mismatch',
    severity: 'medium',
    tables: ['technologies', 'taxonomy_sectores'],
    description: 'Campos relacionados tienen tipos de datos diferentes',
    examples: [
      'technologies.sector_id (varchar) vs taxonomy_sectores.id (varchar) - OK',
      'ai_model_settings.id (text) vs otras tablas id (uuid) - Inconsistente',
    ]
  },
  {
    type: 'fk_naming',
    severity: 'low',
    tables: ['technologies', 'taxonomy_tipos', 'taxonomy_subcategorias'],
    description: 'Nombres de foreign keys usan abreviaciones en español',
    examples: [
      'tipo_id referencia a taxonomy_tipos.id',
      'subcategoria_id (sin tilde) referencia a taxonomy_subcategorias.id',
    ]
  },
];

// Mapping table
const mappingTable = [
  { sourceTable: 'technologies', sourceColumn: 'Nombre de la tecnología', destTable: 'casos_de_estudio', destColumn: 'name', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'Nombre de la tecnología', destTable: 'technological_trends', destColumn: 'name', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'País de origen', destTable: 'casos_de_estudio', destColumn: 'country', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'Tipo de tecnología', destTable: 'technological_trends', destColumn: 'technology_type', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'Subcategoría', destTable: 'technological_trends', destColumn: 'subcategory', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'Sector y subsector', destTable: 'casos_de_estudio', destColumn: 'sector', consistent: false },
  { sourceTable: 'technologies', sourceColumn: 'tipo_id', destTable: 'taxonomy_tipos', destColumn: 'id', consistent: true },
  { sourceTable: 'technologies', sourceColumn: 'subcategoria_id', destTable: 'taxonomy_subcategorias', destColumn: 'id', consistent: true },
  { sourceTable: 'technologies', sourceColumn: 'sector_id', destTable: 'taxonomy_sectores', destColumn: 'id', consistent: true },
  { sourceTable: 'scouting_queue', sourceColumn: 'Nombre de la tecnología', destTable: 'technologies', destColumn: 'Nombre de la tecnología', consistent: true },
  { sourceTable: 'rejected_technologies', sourceColumn: 'Nombre de la tecnología', destTable: 'technologies', destColumn: 'Nombre de la tecnología', consistent: true },
  { sourceTable: 'taxonomy_subcategorias', sourceColumn: 'tipo_id', destTable: 'taxonomy_tipos', destColumn: 'id', consistent: true },
  { sourceTable: 'scouting_sources', sourceColumn: 'nombre', destTable: 'taxonomy_tipos', destColumn: 'nombre', consistent: true },
];

// Recommendations
const recommendations = [
  {
    priority: 'alta',
    action: 'Estandarizar nombres de campos de negocio',
    description: 'Usar snake_case en español para todos los campos de negocio. Eliminar espacios, tildes y caracteres especiales.',
    before: '"Nombre de la tecnología", "País de origen", "Proveedor / Empresa"',
    after: 'nombre_tecnologia, pais_origen, proveedor_empresa',
  },
  {
    priority: 'alta',
    action: 'Unificar nomenclatura entre tablas relacionadas',
    description: 'casos_de_estudio y technological_trends deben usar los mismos nombres que technologies',
    before: 'name, country, technology_type, subcategory',
    after: 'nombre_tecnologia, pais_origen, tipo_tecnologia, subcategoria',
  },
  {
    priority: 'media',
    action: 'Corregir inconsistencia ortográfica',
    description: 'Corregir "Paises donde actua" que no tiene tilde',
    before: '"Paises donde actua"',
    after: 'paises_donde_actua (o paises_operacion)',
  },
  {
    priority: 'media',
    action: 'Estandarizar tablas de taxonomía',
    description: 'Mantener español con snake_case en tablas de taxonomía',
    before: 'codigo, nombre, descripcion (ya correcto)',
    after: 'Mantener actual - es consistente',
  },
  {
    priority: 'baja',
    action: 'Considerar migración gradual',
    description: 'Crear vistas o aliases para mantener compatibilidad mientras se migra',
    before: 'N/A',
    after: 'CREATE VIEW technologies_normalized AS SELECT ...',
  },
];

const getLanguageBadge = (language: string) => {
  switch (language) {
    case 'es':
      return <Badge variant="default" className="bg-green-500">ES</Badge>;
    case 'en':
      return <Badge variant="secondary">EN</Badge>;
    case 'mixed':
      return <Badge variant="destructive">Mixto</Badge>;
    default:
      return <Badge variant="outline">?</Badge>;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'high':
      return <Badge variant="destructive">Alta</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Media</Badge>;
    case 'low':
      return <Badge variant="secondary">Baja</Badge>;
    default:
      return <Badge variant="outline">?</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'alta':
      return <Badge variant="destructive">Alta</Badge>;
    case 'media':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Media</Badge>;
    case 'baja':
      return <Badge variant="secondary">Baja</Badge>;
    default:
      return <Badge variant="outline">?</Badge>;
  }
};

export default function DatabaseAudit() {
  const { toast } = useToast();
  const totalColumns = schemaData.tables.reduce((acc, table) => acc + table.columns.length, 0);
  const spanishColumns = schemaData.tables.reduce((acc, table) => 
    acc + table.columns.filter(c => c.language === 'es').length, 0);
  const englishColumns = schemaData.tables.reduce((acc, table) => 
    acc + table.columns.filter(c => c.language === 'en').length, 0);
  const mixedColumns = schemaData.tables.reduce((acc, table) => 
    acc + table.columns.filter(c => c.language === 'mixed').length, 0);
  const inconsistentMappings = mappingTable.filter(m => !m.consistent).length;

  const generateWordReport = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "Auditoría de Base de Datos - Vandarum",
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              text: `Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`,
              spacing: { after: 400 },
            }),
            
            // Summary
            new Paragraph({
              text: "Resumen Ejecutivo",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `• Total de tablas: ${schemaData.tables.length}`, break: 1 }),
                new TextRun({ text: `• Total de columnas: ${totalColumns}`, break: 1 }),
                new TextRun({ text: `• Columnas en español: ${spanishColumns}`, break: 1 }),
                new TextRun({ text: `• Columnas en inglés: ${englishColumns}`, break: 1 }),
                new TextRun({ text: `• Columnas mixtas: ${mixedColumns}`, break: 1 }),
                new TextRun({ text: `• Inconsistencias detectadas: ${inconsistencies.length}`, break: 1 }),
                new TextRun({ text: `• Mapeos inconsistentes: ${inconsistentMappings} de ${mappingTable.length}`, break: 1 }),
              ],
            }),

            // Inconsistencies
            new Paragraph({
              text: "Inconsistencias Detectadas",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400 },
            }),
            ...inconsistencies.flatMap(inc => [
              new Paragraph({
                text: `[${inc.severity.toUpperCase()}] ${inc.description}`,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: `Tablas afectadas: ${inc.tables.join(', ')}`,
              }),
              new Paragraph({
                text: "Ejemplos:",
                spacing: { before: 200 },
              }),
              ...inc.examples.map(ex => new Paragraph({
                text: `  • ${ex}`,
              })),
            ]),

            // Schema Tables
            new Paragraph({
              text: "Esquema de Tablas",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400 },
            }),
            ...schemaData.tables.flatMap(table => [
              new Paragraph({
                text: `${table.name} - ${table.description}`,
                heading: HeadingLevel.HEADING_2,
              }),
              new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Columna", bold: true })] })] }),
                      new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true })] })] }),
                      new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Idioma", bold: true })] })] }),
                    ],
                  }),
                  ...table.columns.map(col => new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new Paragraph({ text: col.name })] }),
                      new DocxTableCell({ children: [new Paragraph({ text: col.type })] }),
                      new DocxTableCell({ children: [new Paragraph({ text: col.language.toUpperCase() })] }),
                    ],
                  })),
                ],
              }),
            ]),

            // Mapping Table
            new Paragraph({
              text: "Tabla de Mapeo de Campos",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400 },
            }),
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tabla Origen", bold: true })] })] }),
                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Columna Origen", bold: true })] })] }),
                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tabla Destino", bold: true })] })] }),
                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Columna Destino", bold: true })] })] }),
                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Consistente", bold: true })] })] }),
                  ],
                }),
                ...mappingTable.map(m => new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph({ text: m.sourceTable })] }),
                    new DocxTableCell({ children: [new Paragraph({ text: m.sourceColumn })] }),
                    new DocxTableCell({ children: [new Paragraph({ text: m.destTable })] }),
                    new DocxTableCell({ children: [new Paragraph({ text: m.destColumn })] }),
                    new DocxTableCell({ children: [new Paragraph({ text: m.consistent ? "Sí" : "No" })] }),
                  ],
                })),
              ],
            }),

            // Recommendations
            new Paragraph({
              text: "Recomendaciones",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400 },
            }),
            ...recommendations.flatMap(rec => [
              new Paragraph({
                text: `[${rec.priority.toUpperCase()}] ${rec.action}`,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({ text: rec.description }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Antes: ", bold: true }),
                  new TextRun({ text: rec.before }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Después: ", bold: true }),
                  new TextRun({ text: rec.after }),
                ],
                spacing: { after: 200 },
              }),
            ]),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `auditoria_bd_vandarum_${new Date().toISOString().split('T')[0]}.docx`);
      
      toast({
        title: "Informe generado",
        description: "El informe Word se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error generating Word report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el informe Word",
        variant: "destructive",
      });
    }
  };

  const generatePdfReport = () => {
    // Create a printable HTML version and use browser print to PDF
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Auditoría de Base de Datos - Vandarum</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
          h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 30px; }
          h3 { color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .badge-high { background: #fecaca; color: #991b1b; }
          .badge-medium { background: #fef08a; color: #854d0e; }
          .badge-low { background: #e2e8f0; color: #475569; }
          .badge-es { background: #bbf7d0; color: #166534; }
          .badge-en { background: #e2e8f0; color: #475569; }
          .consistent-yes { color: #16a34a; font-weight: bold; }
          .consistent-no { color: #dc2626; font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
          .summary-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .summary-value { font-size: 24px; font-weight: bold; color: #0d9488; }
          .recommendation { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .before { background: #fef2f2; padding: 10px; border-radius: 4px; margin: 5px 0; }
          .after { background: #f0fdf4; padding: 10px; border-radius: 4px; margin: 5px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Auditoría de Base de Datos - Vandarum</h1>
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        
        <h2>Resumen Ejecutivo</h2>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-value">${schemaData.tables.length}</div>Tablas</div>
          <div class="summary-item"><div class="summary-value">${totalColumns}</div>Columnas</div>
          <div class="summary-item"><div class="summary-value">${spanishColumns} ES / ${englishColumns} EN</div>Idiomas</div>
          <div class="summary-item"><div class="summary-value">${inconsistencies.length}</div>Inconsistencias</div>
        </div>

        <h2>Inconsistencias Detectadas</h2>
        ${inconsistencies.map(inc => `
          <div class="recommendation">
            <h3><span class="badge badge-${inc.severity}">${inc.severity.toUpperCase()}</span> ${inc.description}</h3>
            <p><strong>Tablas afectadas:</strong> ${inc.tables.join(', ')}</p>
            <ul>${inc.examples.map(ex => `<li>${ex}</li>`).join('')}</ul>
          </div>
        `).join('')}

        <h2>Esquema de Tablas</h2>
        ${schemaData.tables.map(table => `
          <h3>${table.name}</h3>
          <p><em>${table.description}</em></p>
          <table>
            <thead><tr><th>Columna</th><th>Tipo</th><th>Idioma</th></tr></thead>
            <tbody>
              ${table.columns.map(col => `
                <tr>
                  <td><code>${col.name}</code></td>
                  <td>${col.type}</td>
                  <td><span class="badge badge-${col.language}">${col.language.toUpperCase()}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}

        <h2>Tabla de Mapeo de Campos</h2>
        <table>
          <thead>
            <tr>
              <th>Tabla Origen</th>
              <th>Columna Origen</th>
              <th>Tabla Destino</th>
              <th>Columna Destino</th>
              <th>Consistente</th>
            </tr>
          </thead>
          <tbody>
            ${mappingTable.map(m => `
              <tr>
                <td>${m.sourceTable}</td>
                <td><code>${m.sourceColumn}</code></td>
                <td>${m.destTable}</td>
                <td><code>${m.destColumn}</code></td>
                <td class="${m.consistent ? 'consistent-yes' : 'consistent-no'}">${m.consistent ? '✓ Sí' : '✗ No'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recomendaciones</h2>
        ${recommendations.map(rec => `
          <div class="recommendation">
            <h3><span class="badge badge-${rec.priority === 'alta' ? 'high' : rec.priority === 'media' ? 'medium' : 'low'}">${rec.priority.toUpperCase()}</span> ${rec.action}</h3>
            <p>${rec.description}</p>
            <div class="before"><strong>Antes:</strong> <code>${rec.before}</code></div>
            <div class="after"><strong>Después:</strong> <code>${rec.after}</code></div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    toast({
      title: "Informe listo",
      description: "Usa Ctrl+P o Cmd+P para guardar como PDF",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Auditoría de Base de Datos</h1>
          <p className="text-muted-foreground mt-2">
            Análisis de nomenclatura, consistencia y relaciones del esquema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateWordReport}>
            <FileText className="w-4 h-4 mr-2" />
            Descargar Word
          </Button>
          <Button variant="outline" onClick={generatePdfReport}>
            <Download className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Tablas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemaData.tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Columnas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalColumns}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {spanishColumns} ES / {englishColumns} EN / {mixedColumns} Mixtas
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Inconsistencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{inconsistencies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Mapeos Inconsistentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{inconsistentMappings}</div>
            <div className="text-xs text-muted-foreground mt-1">
              de {mappingTable.length} relaciones
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schema" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schema">Esquema</TabsTrigger>
          <TabsTrigger value="inconsistencies">Inconsistencias</TabsTrigger>
          <TabsTrigger value="erd">Diagrama ERD</TabsTrigger>
          <TabsTrigger value="mapping">Tabla de Mapeo</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-4">
          {schemaData.tables.map((table) => (
            <Card key={table.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {table.name}
                </CardTitle>
                <CardDescription>{table.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Columna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Idioma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.columns.map((column) => (
                        <TableRow key={column.name}>
                          <TableCell className="font-mono text-sm">{column.name}</TableCell>
                          <TableCell className="text-muted-foreground">{column.type}</TableCell>
                          <TableCell>{getLanguageBadge(column.language)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inconsistencies" className="space-y-4">
          {inconsistencies.map((inc, index) => (
            <Alert key={index} variant={inc.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle className="flex items-center gap-2">
                {inc.description}
                {getSeverityBadge(inc.severity)}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <strong>Tablas afectadas:</strong> {inc.tables.join(', ')}
                </div>
                <div className="mt-2">
                  <strong>Ejemplos:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {inc.examples.map((ex, i) => (
                      <li key={i} className="text-sm">{ex}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </TabsContent>

        <TabsContent value="erd">
          <Card>
            <CardHeader>
              <CardTitle>Diagrama de Relaciones (ERD Simplificado)</CardTitle>
              <CardDescription>Relaciones entre las tablas principales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre">{`
┌─────────────────────────┐         ┌─────────────────────────┐
│      taxonomy_tipos     │         │  taxonomy_subcategorias │
├─────────────────────────┤         ├─────────────────────────┤
│ id (int) PK             │◄────────┤ tipo_id (int) FK        │
│ codigo (varchar)        │         │ id (int) PK             │
│ nombre (varchar)        │         │ codigo (varchar)        │
│ descripcion (text)      │         │ nombre (varchar)        │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                   │
            │ tipo_id                           │ subcategoria_id
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         technologies                             │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid) PK                                                    │
│ "Nombre de la tecnología" (text)  ← Español con espacios       │
│ "Tipo de tecnología" (text)       ← Duplica info de tipo_id    │
│ tipo_id (int) FK ─────────────────► taxonomy_tipos.id          │
│ subcategoria_id (int) FK ─────────► taxonomy_subcategorias.id  │
│ sector_id (varchar) FK ───────────► taxonomy_sectores.id       │
│ ...más campos en español...                                     │
│ status (text)                     ← Inglés                      │
│ quality_score (int)               ← Inglés                      │
│ updated_by (uuid)                 ← Inglés                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  scouting_queue │ │   rejected_     │ │    casos_de_estudio     │
│                 │ │  technologies   │ ├─────────────────────────┤
│ (Misma          │ │                 │ │ name (text)  ← Inglés!  │
│  estructura     │ │ (Misma          │ │ country      ← Inglés!  │
│  que            │ │  estructura     │ │ sector       ← Inglés!  │
│  technologies)  │ │  que            │ │ technology_types ← EN!  │
│                 │ │  technologies)  │ │ ...                     │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘

                                        ┌─────────────────────────┐
                                        │  technological_trends   │
                                        ├─────────────────────────┤
                                        │ name (text)  ← Inglés!  │
                                        │ technology_type ← EN!   │
                                        │ subcategory    ← EN!    │
                                        │ sector         ← EN!    │
                                        └─────────────────────────┘

┌─────────────────────────┐
│   taxonomy_sectores     │
├─────────────────────────┤
│ id (varchar) PK         │
│ nombre (varchar)        │
│ descripcion (text)      │
└─────────────────────────┘

                ┌─────────────────────────┐
                │    scouting_sources     │
                ├─────────────────────────┤
                │ nombre (text) ← Español │
                │ tipo (text)   ← Español │
                │ pais (text)   ← Español │
                │ ...todo en español...   │
                └─────────────────────────┘
                `}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Mapeo de Campos</CardTitle>
              <CardDescription>Relación semántica entre campos de diferentes tablas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabla Origen</TableHead>
                    <TableHead>Columna Origen</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Tabla Destino</TableHead>
                    <TableHead>Columna Destino</TableHead>
                    <TableHead>¿Consistente?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingTable.map((mapping, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{mapping.sourceTable}</TableCell>
                      <TableCell className="font-mono text-sm">{mapping.sourceColumn}</TableCell>
                      <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                      <TableCell className="font-medium">{mapping.destTable}</TableCell>
                      <TableCell className="font-mono text-sm">{mapping.destColumn}</TableCell>
                      <TableCell>
                        {mapping.consistent ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.map((rec, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getPriorityBadge(rec.priority)}
                  {rec.action}
                </CardTitle>
                <CardDescription>{rec.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-destructive/10 p-3 rounded-md">
                  <strong className="text-sm text-destructive">Antes:</strong>
                  <code className="block mt-1 text-sm">{rec.before}</code>
                </div>
                <div className="bg-green-500/10 p-3 rounded-md">
                  <strong className="text-sm text-green-600">Después:</strong>
                  <code className="block mt-1 text-sm">{rec.after}</code>
                </div>
              </CardContent>
            </Card>
          ))}

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Nota Importante</AlertTitle>
            <AlertDescription>
              Una migración de nomenclatura requiere:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Crear nuevas columnas con nombres correctos</li>
                <li>Migrar datos a las nuevas columnas</li>
                <li>Actualizar todo el código que referencia las columnas antiguas</li>
                <li>Actualizar edge functions y queries</li>
                <li>Actualizar tipos TypeScript (types.ts se regenera automáticamente)</li>
                <li>Eliminar columnas antiguas una vez verificado</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}