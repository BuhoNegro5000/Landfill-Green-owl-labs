export const MODULES = [
  "inicio",
  "emplazamiento",
  "modelo",
  "celdas",
  "capacidad",
  "residuos",
  "lixiviados",
  "biogas",
  "operacion",
  "geotecnia",
  "clausura",
  "escenarios",
  "sensibilidad",
  "resultados",
  "informes",
  "metodos",
  "normativa",
  "configuracion",
] as const;

export type ModuleId = (typeof MODULES)[number];

export interface NavItem {
  id: ModuleId;
  label: string;
  short: string;
  eyebrow: string;
  description: string;
}

export const MODULE_META: Record<ModuleId, NavItem> = {
  inicio: {
    id: "inicio",
    label: "Proyectos",
    short: "Proyectos",
    eyebrow: "Laboratorio",
    description: "Seleccione un proyecto, cree uno nuevo o restaure los casos demostrativos.",
  },
  emplazamiento: {
    id: "emplazamiento",
    label: "Emplazamiento",
    short: "Sitio",
    eyebrow: "Módulo 01",
    description: "Datos físicos, hidrogeológicos, climáticos y territoriales del sitio, con su calidad de dato declarada.",
  },
  modelo: {
    id: "modelo",
    label: "Modelo 3D",
    short: "Modelo 3D",
    eyebrow: "Módulo 02",
    description: "Geometría del relleno, avance del llenado, red de drenaje, pozos de biogás y sección de capas.",
  },
  celdas: {
    id: "celdas",
    label: "Celdas y capas",
    short: "Celdas",
    eyebrow: "Módulo 03",
    description: "Celdas, bermas, taludes y sistema de impermeabilización con trazabilidad de referencias.",
  },
  capacidad: {
    id: "capacidad",
    label: "Capacidad",
    short: "Capacidad",
    eyebrow: "Módulo 04",
    description: "Volumen bruto, descuentos, reserva de cobertura, tonelaje y asignación por celda.",
  },
  residuos: {
    id: "residuos",
    label: "Residuos",
    short: "Residuos",
    eyebrow: "Módulo 05",
    description: "Proyección de generación, recuperación, densidad y vida útil año a año.",
  },
  lixiviados: {
    id: "lixiviados",
    label: "Lixiviados",
    short: "Lixiviados",
    eyebrow: "Módulo 06",
    description: "Balance hídrico, caudal pico, almacenamiento, capacidad de tubería y tratamiento.",
  },
  biogas: {
    id: "biogas",
    label: "Biogás",
    short: "Biogás",
    eyebrow: "Módulo 07",
    description: "Generación de metano por descomposición de primer orden, captura, emisiones y energía.",
  },
  operacion: {
    id: "operacion",
    label: "Operación",
    short: "Operación",
    eyebrow: "Módulo 08",
    description: "Secuencia de llenado, frentes de trabajo, cobertura diaria y fases de clausura.",
  },
  geotecnia: {
    id: "geotecnia",
    label: "Geotecnia",
    short: "Geotecnia",
    eyebrow: "Módulo 09",
    description: "Revisión conceptual de talud infinito. No sustituye un análisis de estabilidad global.",
  },
  clausura: {
    id: "clausura",
    label: "Clausura",
    short: "Clausura",
    eyebrow: "Módulo 10",
    description: "Cobertura final, cronograma de cierre, posclausura y monitoreo.",
  },
  escenarios: {
    id: "escenarios",
    label: "Escenarios",
    short: "Escenarios",
    eyebrow: "Módulo 11",
    description: "Casos alternativos con los mismos motores de cálculo y comparación contra la base.",
  },
  sensibilidad: {
    id: "sensibilidad",
    label: "Sensibilidad",
    short: "Sensibilidad",
    eyebrow: "Módulo 12",
    description: "Análisis uno a la vez y simulación Monte Carlo con supuestos explícitos.",
  },
  resultados: {
    id: "resultados",
    label: "Resultados",
    short: "Resultados",
    eyebrow: "Módulo 13",
    description: "Síntesis técnica del modelo, alertas de validación, costos y comparación de escenarios.",
  },
  informes: {
    id: "informes",
    label: "Informes",
    short: "Informes",
    eyebrow: "Módulo 14",
    description: "Documento PDF generado localmente con datos reales del proyecto, captura 3D y trazabilidad.",
  },
  metodos: {
    id: "metodos",
    label: "Métodos",
    short: "Métodos",
    eyebrow: "Módulo 15",
    description: "Formulaciones implementadas, supuestos, limitaciones, páginas de fuente y verificación.",
  },
  normativa: {
    id: "normativa",
    label: "Normativa",
    short: "Normativa",
    eyebrow: "Módulo 16",
    description: "Biblioteca documental con estado de verificación explícito. Nada se declara vigente sin contraste.",
  },
  configuracion: {
    id: "configuracion",
    label: "Configuración",
    short: "Ajustes",
    eyebrow: "Sistema",
    description: "Preferencias de la vista 3D, almacenamiento local, respaldo y diagnóstico del motor.",
  },
};

export interface NavGroup {
  title: string;
  items: ModuleId[];
}

export const NAV_GROUPS: NavGroup[] = [
  { title: "Laboratorio", items: ["inicio", "emplazamiento", "modelo", "celdas", "capacidad", "residuos"] },
  { title: "Sistemas", items: ["lixiviados", "biogas", "operacion", "geotecnia", "clausura"] },
  { title: "Análisis", items: ["escenarios", "sensibilidad", "resultados"] },
  { title: "Documentación", items: ["informes", "metodos", "normativa"] },
];

export const MODEL_MODULES: ModuleId[] = ["modelo"];
export const WIDE_MODULES: ModuleId[] = ["metodos", "normativa", "informes", "sensibilidad", "resultados", "escenarios"];
