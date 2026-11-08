import type { CellConfig, CellMethod, CellShape } from "@/lib/types";

/**
 * Métodos constructivos de celda y su traducción geométrica.
 *
 * La fuente principal es la Guía MINAM 2019 (métodos de trinchera, área y
 * combinado, pp. 24-26) y la Guía MINAM 2011 (métodos y fórmula de volumen,
 * pp. 56-59). Los valores de taludes y vías se citan como referencias técnicas
 * de diseño preliminar, no como límites legales automáticos.
 */

export interface CellMethodSpec {
  id: CellMethod;
  label: string;
  shortLabel: string;
  description: string;
  shape: CellShape;
  /** Profundidad de corte objetivo como fracción de la altura (0-1). */
  cutRatio: number;
  defaultDepthM: number;
  depthRangeM: [number, number];
  recommendedSlopeHtoV: number;
  slopeRangeHtoV: [number, number];
  defaultBermCount: number;
  defaultBermWidthM: number;
  defaultFreeboardM: number;
  rampWidthM: number;
  rampGradePct: number;
  references: string[];
}

export const CELL_METHOD_SPECS: Record<CellMethod, CellMethodSpec> = {
  trench: {
    id: "trench",
    label: "Trinchera",
    shortLabel: "Trinchera",
    description:
      "Excavación por debajo del terreno natural; los residuos ocupan el volumen habilitado y el material excavado se reserva para cobertura. La celda termina a la cota del borde de la excavación.",
    shape: "excavated",
    cutRatio: 1,
    defaultDepthM: 3,
    depthRangeM: [2, 6],
    recommendedSlopeHtoV: 0.75,
    slopeRangeHtoV: [0.5, 2],
    defaultBermCount: 0,
    defaultBermWidthM: 0,
    defaultFreeboardM: 0.4,
    rampWidthM: 0,
    rampGradePct: 0,
    references: [
      "Guía MINAM 2019, métodos de disposición final, pp. 24-26 (PDF 24-26)",
      "Guía MINAM 2011, método de trinchera, pp. 56-59 (PDF 56-59)",
      "Honduras 2014, ejemplo de trincheras de 3 m × 6 m, PDF p. 36",
      "Guía MINAM 2019, Cuadro N.° 19, taludes de corte, pp. 36-37 (PDF 36-37)",
    ],
  },
  area: {
    id: "area",
    label: "Celda de área",
    shortLabel: "Área",
    description:
      "Disposición sobre la superficie del terreno acondicionado, formando plataformas y montículos. No requiere excavación de la celda; el material de cobertura proviene de préstamo o de cortes laterales.",
    shape: "mound",
    cutRatio: 0,
    defaultDepthM: 0,
    depthRangeM: [0, 0.5],
    recommendedSlopeHtoV: 2.5,
    slopeRangeHtoV: [1.5, 4],
    defaultBermCount: 2,
    defaultBermWidthM: 3,
    defaultFreeboardM: 0.3,
    rampWidthM: 0,
    rampGradePct: 0,
    references: [
      "Guía MINAM 2019, método de área, pp. 24-26 (PDF 24-26)",
      "Guía MINAM 2011, método del área, p. 57 (PDF 57)",
      "Guía MINAM 2019, Cuadro N.° 20, taludes de relleno (V:H), p. 37 (PDF 37)",
    ],
  },
  ramp: {
    id: "ramp",
    label: "Rampa / combinado",
    shortLabel: "Rampa",
    description:
      "Combina una parte excavada (trinchera) con un crecimiento sobre el terreno (área). La rampa de acceso conecta la cota de operación con el fondo o las plataformas. Es el método tipo rampa de la Guía MINAM 2011 y la combinación de métodos de la Guía MINAM 2019.",
    shape: "excavated",
    cutRatio: 0.45,
    defaultDepthM: 4,
    depthRangeM: [1, 12],
    recommendedSlopeHtoV: 2,
    slopeRangeHtoV: [1.5, 3.5],
    defaultBermCount: 1,
    defaultBermWidthM: 3,
    defaultFreeboardM: 0.3,
    rampWidthM: 6,
    rampGradePct: 8,
    references: [
      "Guía MINAM 2019, combinación de métodos, pp. 24-26 (PDF 24-26)",
      "Guía MINAM 2011, método mixto o combinado tipo rampa, pp. 57-58 (PDF 57-58)",
      "Guía MINAM 2019, vías internas: ancho mínimo 6 m, bermas 0,75 m y pendiente máxima 8 % (7 % sobre 3000 m s. n. m.), pp. 61-62 (PDF 63-64)",
    ],
  },
};

export const CELL_METHOD_OPTIONS: { value: CellMethod; label: string; hint: string }[] = [
  { value: "trench", label: CELL_METHOD_SPECS.trench.label, hint: "Corte bajo el terreno; altura ≈ profundidad." },
  { value: "area", label: CELL_METHOD_SPECS.area.label, hint: "Relleno sobre el terreno; sin corte." },
  { value: "ramp", label: CELL_METHOD_SPECS.ramp.label, hint: "Corte + relleno con rampa de acceso." },
];

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Profundidad de corte efectiva, limitada a la altura geométrica de la celda. */
export function cutDepthOf(cell: Pick<CellConfig, "excavationDepthM" | "heightM">): number {
  return clampNumber(cell.excavationDepthM, 0, Math.max(cell.heightM, 0));
}

/** Altura de relleno sobre el terreno natural. */
export function fillHeightOf(cell: Pick<CellConfig, "excavationDepthM" | "heightM">): number {
  return Math.max(0, cell.heightM - cutDepthOf(cell));
}

/** Borde libre limitado a la altura de la celda. */
export function freeboardOf(cell: Pick<CellConfig, "freeboardM" | "heightM">): number {
  return clampNumber(cell.freeboardM ?? 0, 0, Math.max(cell.heightM, 0));
}

/** Altura útil de residuos (altura geométrica menos borde libre). */
export function designHeightOf(cell: Pick<CellConfig, "freeboardM" | "heightM">): number {
  return Math.max(0, cell.heightM - freeboardOf(cell));
}

function methodTolerance(heightM: number): number {
  return Math.max(0.25, heightM * 0.02);
}

/**
 * Método que realmente describe la geometría. No es una etiqueta: se deriva
 * del corte y del relleno.
 *   - sin corte -> área
 *   - sin relleno -> trinchera
 *   - corte y relleno -> rampa / combinado
 */
export function effectiveMethod(
  cell: Pick<CellConfig, "excavationDepthM" | "heightM">,
): CellMethod {
  const height = Math.max(cell.heightM, 0);
  const cut = cutDepthOf(cell);
  const fill = Math.max(0, height - cut);
  const tol = methodTolerance(height);
  if (cut <= tol) return "area";
  if (fill <= tol) return "trench";
  return "ramp";
}

export interface MethodSummary {
  declared: CellMethod;
  effective: CellMethod;
  declaredLabel: string;
  effectiveLabel: string;
  matches: boolean;
  cutDepthM: number;
  fillHeightM: number;
  cutFractionPct: number;
  fillFractionPct: number;
  freeboardM: number;
  designHeightM: number;
}

export function methodSummary(
  cell: Pick<CellConfig, "method" | "excavationDepthM" | "heightM" | "freeboardM">,
): MethodSummary {
  const height = Math.max(cell.heightM, 0);
  const cut = cutDepthOf(cell);
  const fill = Math.max(0, height - cut);
  const effective = effectiveMethod(cell);
  return {
    declared: cell.method,
    effective,
    declaredLabel: CELL_METHOD_SPECS[cell.method].label,
    effectiveLabel: CELL_METHOD_SPECS[effective].label,
    matches: effective === cell.method,
    cutDepthM: cut,
    fillHeightM: fill,
    cutFractionPct: height > 0 ? (cut / height) * 100 : 0,
    fillFractionPct: height > 0 ? (fill / height) * 100 : 0,
    freeboardM: freeboardOf(cell),
    designHeightM: designHeightOf(cell),
  };
}

export interface MethodPresetOptions {
  /** Cota de la superficie del terreno a la que se alinea la celda. */
  terrainBaseElevationM: number;
}

/**
 * Cambia el método y traduce el cambio a geometría real: profundidad, altura,
 * cota de fondo, talud, bermas, borde libre y parámetros de rampa.
 * No modifica largo ni ancho de fondo, que son decisión del diseñador.
 */
export function methodPreset(
  cell: CellConfig,
  method: CellMethod,
  options: MethodPresetOptions,
): Partial<CellConfig> {
  const spec = CELL_METHOD_SPECS[method];
  const currentHeight = Math.max(cell.heightM, 1);
  let heightM = currentHeight;
  let depthM = 0;

  if (method === "trench") {
    const preferred =
      cell.excavationDepthM > 0 && cell.excavationDepthM < currentHeight
        ? cell.excavationDepthM
        : cell.method === "trench" && cell.excavationDepthM > 0
          ? cell.excavationDepthM
          : spec.defaultDepthM;
    depthM = clampNumber(preferred, spec.depthRangeM[0], spec.depthRangeM[1]);
    heightM = depthM;
  } else if (method === "area") {
    depthM = 0;
    heightM = Math.max(currentHeight, 4);
  } else {
    const preferred =
      cell.excavationDepthM > 0 && cell.excavationDepthM < currentHeight
        ? cell.excavationDepthM
        : currentHeight * spec.cutRatio;
    depthM = clampNumber(preferred, 1, Math.max(1, currentHeight - 1));
    heightM = Math.max(currentHeight, depthM + 2);
  }

  const freeboardM = clampNumber(spec.defaultFreeboardM, 0, heightM * 0.5);

  return {
    method,
    shape: spec.shape,
    heightM: round1(heightM),
    excavationDepthM: round1(depthM),
    baseElevationM: round1(options.terrainBaseElevationM - depthM),
    slopeHtoV: round1(spec.recommendedSlopeHtoV),
    bermCount: spec.defaultBermCount,
    bermWidthM: spec.defaultBermWidthM,
    freeboardM: round1(freeboardM),
    rampWidthM: method === "ramp" ? spec.rampWidthM : 0,
    rampGradePct: method === "ramp" ? spec.rampGradePct : 0,
    rampLengthM: 0,
  };
}

export type MethodCheckSeverity = "error" | "warning" | "info";

export interface MethodCheck {
  id: string;
  severity: MethodCheckSeverity;
  title: string;
  detail: string;
  reference?: string;
}

export interface MethodCheckOptions {
  terrainBaseElevationM?: number;
}

/**
 * Verificaciones técnicas del método constructivo. No son límites legales:
 * son avisos de coherencia geométrica y de práctica de diseño preliminar.
 */
export function methodChecks(
  cell: Pick<
    CellConfig,
    | "method"
    | "shape"
    | "heightM"
    | "slopeHtoV"
    | "excavationDepthM"
    | "baseElevationM"
    | "bottomWidthM"
    | "freeboardM"
    | "rampWidthM"
    | "rampGradePct"
    | "rampLengthM"
  >,
  options: MethodCheckOptions = {},
): MethodCheck[] {
  const checks: MethodCheck[] = [];
  const height = Math.max(cell.heightM, 0);
  const cut = cutDepthOf(cell);
  const fill = Math.max(0, height - cut);
  const declared = cell.method;
  const effective = effectiveMethod(cell);
  const tol = methodTolerance(height);
  const freeboard = freeboardOf(cell);

  if (height <= 0) {
    return checks;
  }

  const mismatch =
    (declared === "trench" && fill > tol) ||
    (declared === "area" && cut > tol) ||
    (declared === "ramp" && (cut <= tol || fill <= tol));
  if (mismatch) {
    checks.push({
      id: "method-mismatch",
      severity: "warning",
      title: "Método declarado distinto del método efectivo",
      detail: `Declarado: ${CELL_METHOD_SPECS[declared].label}. Geometría efectiva: ${CELL_METHOD_SPECS[effective].label} (corte ${cut.toFixed(2)} m, relleno ${fill.toFixed(2)} m). Ajuste la profundidad, la altura o el método para que la etiqueta y el diseño coincidan.`,
      reference:
        "Guía MINAM 2019, métodos de disposición final, pp. 24-26 (PDF 24-26); Guía MINAM 2011, pp. 56-58",
    });
  }

  if (freeboard < 0.3 && height >= 1) {
    checks.push({
      id: "freeboard-low",
      severity: "warning",
      title: "Borde libre menor que 0,30 m",
      detail: `Borde libre declarado: ${freeboard.toFixed(2)} m. Un borde libre reducido limita el control de aguas de escorrentía, asentamientos y cobertura final.`,
      reference: "Práctica de diseño preliminar; verifique drenaje superficial y asentamientos.",
    });
  }

  if (options.terrainBaseElevationM !== undefined) {
    const ground = cell.baseElevationM + cut;
    const delta = Math.abs(ground - options.terrainBaseElevationM);
    if (delta > 0.5) {
      checks.push({
        id: "ground-mismatch",
        severity: "warning",
        title: "Cota de fondo y terreno no coinciden",
        detail: `Fondo + profundidad = ${ground.toFixed(2)} m s. n. m.; terreno declarado = ${options.terrainBaseElevationM.toFixed(2)} m s. n. m. (Δ = ${delta.toFixed(2)} m). Alinee la cota de fondo para que el corte, el relleno y el orificio del terreno en 3D sean coherentes.`,
        reference: "Coherencia interna del modelo geométrico.",
      });
    }
  }

  if (declared === "trench" || effective === "trench") {
    if (cut < 2) {
      checks.push({
        id: "trench-shallow",
        severity: "warning",
        title: "Trinchera poco profunda",
        detail: `Profundidad de corte: ${cut.toFixed(2)} m. Los ejemplos de referencia usan 2,5 m (MINAM 2011) y 3 m (Honduras 2014); una trinchera muy somera se comporta como celda de área.`,
        reference: "Guía MINAM 2011, p. 59 (PDF 59); Honduras 2014, PDF p. 36",
      });
    }
    if (cut > 10) {
      checks.push({
        id: "trench-deep",
        severity: "warning",
        title: "Excavación profunda: revisar estabilidad y flotación",
        detail: `Profundidad de corte: ${cut.toFixed(2)} m. Verifique taludes de corte, empujes, nivel freático y posible flotación del liner.`,
        reference: "Guía MINAM 2019, Cuadro N.° 19, pp. 36-37 (PDF 36-37)",
      });
    }
    if (cell.bottomWidthM < 4) {
      checks.push({
        id: "trench-narrow",
        severity: "warning",
        title: "Ancho de trinchera menor que 4 m",
        detail: `Ancho de fondo: ${cell.bottomWidthM.toFixed(1)} m. Revise acceso de equipo, compactación y espacio de trabajo.`,
        reference: "Honduras 2014, ejemplo de 6 m de ancho, PDF p. 36",
      });
    } else if (cell.bottomWidthM > 20) {
      checks.push({
        id: "trench-wide",
        severity: "info",
        title: "Trinchera ancha: comportamiento cercano a celda de área",
        detail: `Ancho de fondo: ${cell.bottomWidthM.toFixed(1)} m. El ejemplo de referencia usa 6 m; verifique si el método de área no es más eficiente.`,
        reference: "Honduras 2014, PDF p. 36; Guía MINAM 2019, pp. 24-26",
      });
    }
    if (cell.slopeHtoV < 0.5) {
      checks.push({
        id: "trench-slope-steep",
        severity: "warning",
        title: "Talud de corte más vertical que 1V:0,5H",
        detail: `Talud declarado: ${cell.slopeHtoV.toFixed(2)} H:V. Verifique estabilidad, seguridad de operación y requisitos de la barrera.`,
        reference: "Guía MINAM 2019, Cuadro N.° 19, pp. 36-37; Guía MINAM 2011, p. 59",
      });
    } else if (cell.slopeHtoV > 3) {
      checks.push({
        id: "trench-slope-flat",
        severity: "info",
        title: "Talud de corte muy tendido",
        detail: `Talud declarado: ${cell.slopeHtoV.toFixed(2)} H:V. Aumentará el volumen de excavación y el área ocupada.`,
        reference: "Guía MINAM 2019, Cuadro N.° 19, pp. 36-37",
      });
    }
  }

  if (declared === "area" || effective === "area") {
    if (cell.slopeHtoV < 1.5) {
      checks.push({
        id: "area-slope-steep",
        severity: "warning",
        title: "Talud de relleno más vertical que 1V:1,5H",
        detail: `Talud declarado: ${cell.slopeHtoV.toFixed(2)} H:V. El Cuadro N.° 20 de la Guía MINAM 2019 recomienda taludes de relleno de 1V:1,5H a 1V:2,5H para grava, limo arenoso y arcilla, según altura.`,
        reference: "Guía MINAM 2019, Cuadro N.° 20, p. 37 (PDF 37)",
      });
    } else if (cell.slopeHtoV > 4) {
      checks.push({
        id: "area-slope-flat",
        severity: "info",
        title: "Talud de relleno muy tendido",
        detail: `Talud declarado: ${cell.slopeHtoV.toFixed(2)} H:V. Revise el consumo de área y el volumen de cobertura.`,
        reference: "Guía MINAM 2019, Cuadro N.° 20, p. 37 (PDF 37)",
      });
    }
  }

  if (declared === "ramp" || effective === "ramp") {
    const width = Math.max(0, cell.rampWidthM ?? 0);
    const grade = Math.max(0, cell.rampGradePct ?? 0);
    const length = Math.max(0, cell.rampLengthM ?? 0);
    if (width < 5) {
      checks.push({
        id: "ramp-narrow",
        severity: "warning",
        title: "Ancho de rampa menor que 5 m",
        detail: `Ancho declarado: ${width.toFixed(1)} m. La Guía MINAM 2019 indica 6 m para vías internas permanentes (con bermas de 0,75 m) y 5 m para vías temporales.`,
        reference: "Guía MINAM 2019, vías internas, pp. 61-62 (PDF 63-64)",
      });
    } else if (width < 6) {
      checks.push({
        id: "ramp-narrow-temporary",
        severity: "info",
        title: "Rampa de ancho temporal",
        detail: `Ancho declarado: ${width.toFixed(1)} m. Es admisible como vía temporal de 5 m; para vía permanente se requieren 6 m más bermas.`,
        reference: "Guía MINAM 2019, vías internas, pp. 61-62 (PDF 63-64)",
      });
    }
    if (grade <= 0) {
      checks.push({
        id: "ramp-grade-missing",
        severity: "warning",
        title: "Pendiente de rampa no definida",
        detail: "Defina la pendiente longitudinal para calcular la longitud y el volumen de la rampa.",
        reference: "Guía MINAM 2019, vías internas, pp. 61-62 (PDF 63-64)",
      });
    } else if (grade > 10) {
      checks.push({
        id: "ramp-grade-steep",
        severity: "warning",
        title: "Pendiente de rampa mayor que 10 %",
        detail: `Pendiente declarada: ${grade.toFixed(1)} %. La referencia permite superar 10 % solo excepcionalmente en tramos cortos; la vía permanente tiene máximos de 8 % (≤3000 m s. n. m.) o 7 % (>3000 m s. n. m.).`,
        reference: "Guía MINAM 2019, vías internas y Cuadro N.° 25, pp. 61-62 (PDF 63-64)",
      });
    } else if (grade > 8) {
      checks.push({
        id: "ramp-grade-above-permanent",
        severity: "info",
        title: "Pendiente de rampa superior a 8 %",
        detail: `Pendiente declarada: ${grade.toFixed(1)} %. Admisible como vía temporal en tramos cortos; verifique longitud, frenado y drenaje.`,
        reference: "Guía MINAM 2019, vías internas, pp. 61-62 (PDF 63-64)",
      });
    }
    if (length > 0 && grade > 0) {
      const required = cut / (grade / 100);
      if (Math.abs(length - required) > Math.max(5, required * 0.2)) {
        checks.push({
          id: "ramp-length-inconsistent",
          severity: "info",
          title: "Longitud de rampa poco consistente con la pendiente",
          detail: `Longitud declarada: ${length.toFixed(1)} m; longitud geométrica para ${cut.toFixed(1)} m de desnivel al ${grade.toFixed(1)} %: ${required.toFixed(1)} m.`,
          reference: "Coherencia interna del modelo de rampa.",
        });
      }
    }
  }

  return checks;
}
