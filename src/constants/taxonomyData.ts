/**
 * Shared Taxonomy Constants
 * 
 * Single source of truth for all taxonomy-related constants
 * used across the application for standardized dropdowns.
 */

export const TRL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'en_revision', label: 'En revisión' },
] as const;

export const ESTADO_SEGUIMIENTO_OPTIONS = [
  { value: 'Identificada', label: 'Identificada' },
  { value: 'En evaluación', label: 'En evaluación' },
  { value: 'Contactada', label: 'Contactada' },
  { value: 'En negociación', label: 'En negociación' },
  { value: 'Implementada', label: 'Implementada' },
  { value: 'Descartada', label: 'Descartada' },
] as const;

export const SUBSECTORES_INDUSTRIALES = [
  'Alimentación y Bebidas',
  'Lácteo',
  'Textil',
  'Químico y Petroquímico',
  'Farmacéutico',
  'Papelero',
  'Metalúrgico',
  'Automoción',
  'Electrónica',
  'Energía',
  'Minería',
  'Otros',
] as const;

/**
 * TIPOS DE TECNOLOGÍA (Taxonomía fija)
 * Sincronizado con tabla taxonomy_tipos
 */
export const TIPOS_TECNOLOGIA = [
  { id: 1, codigo: 'TAP', nombre: 'Tratamiento de Agua Potable' },
  { id: 2, codigo: 'TAR', nombre: 'Tratamiento de Aguas Residuales' },
  { id: 3, codigo: 'GLR', nombre: 'Gestión de Lodos y Residuos' },
  { id: 4, codigo: 'MON', nombre: 'Monitorización y Control' },
  { id: 5, codigo: 'RED', nombre: 'Gestión de Redes' },
  { id: 6, codigo: 'SOF', nombre: 'Software y Digitalización' },
  { id: 7, codigo: 'ENE', nombre: 'Energía y Eficiencia' },
  { id: 8, codigo: 'EQU', nombre: 'Equipamiento Auxiliar' },
  { id: 9, codigo: 'ALC', nombre: 'Gestión de Redes de Alcantarillado' },
] as const;

/**
 * SECTORES (Taxonomía fija)
 * Sincronizado con tabla taxonomy_sectores
 */
export const SECTORES = [
  { id: 'MUN', nombre: 'Municipal' },
  { id: 'IND', nombre: 'Industrial' },
  { id: 'AMB', nombre: 'Ambos' },
] as const;

export const PAISES = [
  'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda', 'Arabia Saudita', 'Argelia', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Bélgica', 'Belice', 'Benín',
  'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana', 'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá', 'Catar', 'Chad', 'Chile', 'China', 'Chipre',
  'Colombia', 'Comoras', 'Corea del Norte', 'Corea del Sur', 'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica',
  'Ecuador', 'Egipto', 'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'España', 'Estados Unidos', 'Estonia',
  'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada',
  'Grecia', 'Guatemala', 'Guinea', 'Guinea Ecuatorial', 'Guinea-Bisáu', 'Guyana', 'Haití', 'Honduras', 'Hungría', 'India',
  'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia', 'Jamaica',
  'Japón', 'Jordania', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto', 'Letonia',
  'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui',
  'Maldivas', 'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia', 'Moldavia', 'Mónaco',
  'Mongolia', 'Montenegro', 'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria', 'Noruega',
  'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán', 'Palaos', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay', 'Perú', 'Polonia',
  'Portugal', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República del Congo', 'República Democrática del Congo', 'República Dominicana', 'Ruanda', 'Rumania', 'Rusia',
  'Samoa', 'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona',
  'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Suazilandia', 'Sudáfrica', 'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza',
  'Surinam', 'Tailandia', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo', 'Tonga', 'Trinidad y Tobago', 'Túnez', 'Turkmenistán',
  'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán', 'Vanuatu', 'Vaticano', 'Venezuela', 'Vietnam',
  'Yemen', 'Yibuti', 'Zambia', 'Zimbabue',
] as const;

// Type exports for use in components
export type TRLValue = (typeof TRL_OPTIONS)[number];
export type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];
export type EstadoSeguimientoValue = (typeof ESTADO_SEGUIMIENTO_OPTIONS)[number]['value'];
export type SubsectorIndustrialValue = (typeof SUBSECTORES_INDUSTRIALES)[number];
export type PaisValue = (typeof PAISES)[number];
export type TipoTecnologiaValue = (typeof TIPOS_TECNOLOGIA)[number];
export type SectorValue = (typeof SECTORES)[number];
