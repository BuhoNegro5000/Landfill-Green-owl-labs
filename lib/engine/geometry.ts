import type { CellConfig, CellMethod, GeometryParams, Layer } from "@/lib/types";
import {
  cutDepthOf,
  designHeightOf,
  effectiveMethod,
  freeboardOf,
  methodChecks,
  type MethodCheck,
} from "./cellMethods";

export const ENGINE_VERSION = "1.1.0";

export interface CellGeometry {
  id: string;
  name: string;
  shape: CellConfig["shape"];
  method: CellConfig["method"];
  effectiveMethod: CellMethod;
  methodMatches: boolean;
  bottomLengthM: number;
  bottomWidthM: number;
  topLengthM: number;
  topWidthM: number;
  groundLengthM: number;
  groundWidthM: number;
  heightM: number;
  designHeightM: number;
  slopeHtoV: number;
  bermCount: number;
  bermWidthM: number;
  baseElevationM: number;
  groundElevationM: number;
  topElevationM: number;
  designTopElevationM: number;
  excavationDepthM: number;
  freeboardM: number;
  cutDepthM: number;
  fillHeightM: number;
  cutFractionPct: number;
  fillFractionPct: number;
  bottomAreaM2: number;
  topAreaM2: number;
  groundAreaM2: number;
  grossVolumeM3: number;
  designWasteVolumeM3: number;
  excavationVolumeM3: number;
  cutVolumeM3: number;
  belowGradeWasteVolumeM3: number;
  aboveGradeVolumeM3: number;
  rampWidthM: number;
  rampGradePct: number;
  rampLengthM: number;
  rampVolumeM3: number;
  liningAreaM2: number;
  finalCoverAreaM2: number;
  cutLateralAreaM2: number;
  fillLateralAreaM2: number;
  lateralAreaM2: number;
  slopeAngleDeg: number;
  sequenceOrder: number;
  valid: boolean;
  warnings: string[];
  methodChecks: MethodCheck[];
}

export interface LayerVolume {
  layerId: string;
  name: string;
  category: Layer["category"];
  thicknessMm: number;
  areaM2: number;
  volumeM3: number;
}

export interface GeometryResult {
  cells: CellGeometry[];
  grossVolumeM3: number;
  designGrossVolumeM3: number;
  excavationVolumeM3: number;
  rampExcavationVolumeM3: number;
  totalExcavationVolumeM3: number;
  aboveGradeVolumeM3: number;
  liningAreaM2: number;
  finalCoverAreaM2: number;
  footprintAreaM2: number;
  topAreaM2: number;
  groundAreaM2: number;
  layerVolumes: LayerVolume[];
  linerVolumeM3: number;
  methodCounts: Record<CellMethod, number>;
  effectiveMethodCounts: Record<CellMethod, number>;
  warnings: string[];
  volumeProfileM3: { elevation: number; volume: number }[];
}

/** Minimal shape descriptor required by the slice integrator. */
export type CellShapeInput = Pick<
  CellConfig,
  | "bottomLengthM"
  | "bottomWidthM"
  | "heightM"
  | "bermCount"
  | "bermWidthM"
  | "slopeHtoV"
  | "excavationDepthM"
>;

interface ProfileParams {
  heightM: number;
  cutDepthM: number;
  bermCount: number;
  intervalM: number;
  bermWidthM: number;
  slopeHtoV: number;
  /** Número de bermas cruzadas al llegar a la cota de terreno. */
  groundBenchCount: number;
}

function profileParams(cell: CellShapeInput): ProfileParams {
  const heightM = Math.max(cell.heightM, 0);
  const cutDepthM = Math.min(Math.max(cell.excavationDepthM ?? 0, 0), heightM);
  const bermCount = Math.max(0, Math.round(cell.bermCount ?? 0));
  const intervalM = bermCount > 0 && heightM > 0 ? heightM / bermCount : heightM;
  const bermWidthM = Math.max(0, cell.bermWidthM ?? 0);
  const slopeHtoV = Math.max(0, cell.slopeHtoV ?? 0);
  const groundBenchCount =
    bermCount > 0 && intervalM > 0
      ? Math.min(bermCount, Math.floor(cutDepthM / intervalM + 1e-9))
      : 0;
  return { heightM, cutDepthM, bermCount, intervalM, bermWidthM, slopeHtoV, groundBenchCount };
}

function benchCountAt(params: ProfileParams, z: number): number {
  if (params.bermCount <= 0 || params.intervalM <= 0) return 0;
  return Math.min(
    params.bermCount,
    Math.max(0, Math.floor(Math.max(0, z) / params.intervalM + 1e-9)),
  );
}

/**
 * Desplazamiento horizontal (por lado) respecto de la base, con pivote en la
 * cota de terreno:
 *   - bajo el terreno el corte se ensancha hacia arriba;
 *   - sobre el terreno el relleno se estrecha hacia arriba;
 *   - las bermas reducen la dimensión en cada escalón.
 * Esto permite que trinchera, área y rampa compartan un solo integrador.
 */
function halfOffsetAt(params: ProfileParams, z: number, benchCount: number): number {
  const { heightM, cutDepthM, slopeHtoV, bermWidthM, groundBenchCount } = params;
  const zz = Math.min(Math.max(z, 0), heightM);
  if (zz <= cutDepthM + 1e-12) {
    return slopeHtoV * zz - benchCount * bermWidthM;
  }
  const halfAtGround = slopeHtoV * cutDepthM - groundBenchCount * bermWidthM;
  const aboveGround = zz - cutDepthM;
  const aboveBenches = Math.max(0, benchCount - groundBenchCount);
  return halfAtGround - slopeHtoV * aboveGround - aboveBenches * bermWidthM;
}

function dimensionWithBench(
  params: ProfileParams,
  base: number,
  z: number,
  benchCount: number,
): number {
  return Math.max(0, base + 2 * halfOffsetAt(params, z, benchCount));
}

/**
 * Horizontal dimension of a cell at relative height z (0 = base, H = top).
 * The profile pivots at the original ground surface (base + excavation depth).
 */
export function cellDimensionAt(
  cell: CellShapeInput,
  z: number,
  axis: "length" | "width",
): number {
  const params = profileParams(cell);
  const base = axis === "length" ? cell.bottomLengthM : cell.bottomWidthM;
  const clamped = Math.min(Math.max(z, 0), params.heightM);
  return dimensionWithBench(params, base, clamped, benchCountAt(params, clamped));
}

export interface CellProfilePoint {
  z: number;
  lengthM: number;
  widthM: number;
  areaM2: number;
  phase: "cut" | "fill";
}

export function cellProfile(cell: CellConfig, samples = 24): CellProfilePoint[] {
  const pts: CellProfilePoint[] = [];
  const params = profileParams(cell);
  for (let i = 0; i <= samples; i++) {
    const z = (cell.heightM * i) / samples;
    const lengthM = Math.max(0, cellDimensionAt(cell, z, "length"));
    const widthM = Math.max(0, cellDimensionAt(cell, z, "width"));
    pts.push({
      z,
      lengthM,
      widthM,
      areaM2: lengthM * widthM,
      phase: z <= params.cutDepthM + 1e-9 ? "cut" : "fill",
    });
  }
  return pts;
}

/**
 * Exact prismoidal integration over each bench interval.
 * Inside an interval both horizontal dimensions are linear in z, so the
 * cross-section area is quadratic and V = Σ h/6 (A1 + 4Am + A2).
 */
export function cellVolumeZeroTo(cell: CellConfig, top: number): number {
  const params = profileParams(cell);
  const limit = Math.min(Math.max(top, 0), params.heightM);
  if (limit <= 0 || params.heightM <= 0) return 0;
  const interval = params.intervalM > 0 ? params.intervalM : params.heightM;
  const steps = params.bermCount > 0 ? Math.ceil(limit / interval - 1e-9) : 1;
  let volume = 0;
  let z0 = 0;
  for (let k = 0; k < steps; k++) {
    const z1 = Math.min((k + 1) * interval, limit);
    const h = z1 - z0;
    if (h <= 0) break;
    const dim = (z: number, axis: "length" | "width") => {
      const base = axis === "length" ? cell.bottomLengthM : cell.bottomWidthM;
      return dimensionWithBench(params, base, z, k);
    };
    const A1 = dim(z0, "length") * dim(z0, "width");
    const Am = dim((z0 + z1) / 2, "length") * dim((z0 + z1) / 2, "width");
    const A2 = dim(z1, "length") * dim(z1, "width");
    volume += (h / 6) * (A1 + 4 * Am + A2);
    z0 = z1;
  }
  return volume;
}

export function cellSurfaceAreaAtHeight(cell: CellConfig, z: number): number {
  const l = Math.max(0, cellDimensionAt(cell, z, "length"));
  const w = Math.max(0, cellDimensionAt(cell, z, "width"));
  return l * w;
}

/** Inverse of the slice integration: elevation reached for a given waste volume. */
export function heightForVolume(cell: CellConfig, volumeM3: number): number {
  if (volumeM3 <= 0) return 0;
  const maxHeight = designHeightOf(cell);
  const total = cellVolumeZeroTo(cell, maxHeight);
  if (volumeM3 >= total) return maxHeight;
  let lo = 0;
  let hi = maxHeight;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cellVolumeZeroTo(cell, mid) < volumeM3) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

interface LateralParts {
  cut: number;
  fill: number;
  total: number;
}

/**
 * Lateral area split between the cut (below ground) and the fill (above
 * ground). Bench shelves are assigned to the side where they are built.
 */
function lateralAreaParts(cell: CellConfig): LateralParts {
  const params = profileParams(cell);
  const { heightM, cutDepthM, bermCount, intervalM, slopeHtoV } = params;
  if (heightM <= 0) return { cut: 0, fill: 0, total: 0 };
  const slant = Math.sqrt(1 + slopeHtoV ** 2);
  const steps = bermCount > 0 ? bermCount : 1;
  const interval = intervalM > 0 ? intervalM : heightM;
  let cut = 0;
  let fill = 0;
  let z0 = 0;

  for (let k = 0; k < steps; k++) {
    const z1 = Math.min((k + 1) * interval, heightM);
    if (z1 <= z0) break;
    const pieces: [number, number][] = [];
    if (cutDepthM > z0 + 1e-9 && cutDepthM < z1 - 1e-9) {
      pieces.push([z0, cutDepthM], [cutDepthM, z1]);
    } else {
      pieces.push([z0, z1]);
    }
    for (const [a, b] of pieces) {
      const La = dimensionWithBench(params, cell.bottomLengthM, a, k);
      const Wa = dimensionWithBench(params, cell.bottomWidthM, a, k);
      const Lb = dimensionWithBench(params, cell.bottomLengthM, b, k);
      const Wb = dimensionWithBench(params, cell.bottomWidthM, b, k);
      const P0 = 2 * (La + Wa);
      const P1 = 2 * (Lb + Wb);
      const area = ((P0 + P1) / 2) * (b - a) * slant;
      if ((a + b) / 2 <= cutDepthM + 1e-9) cut += area;
      else fill += area;
    }
    if (k < bermCount && z1 < heightM - 1e-9) {
      const Lout = dimensionWithBench(params, cell.bottomLengthM, z1, k);
      const Wout = dimensionWithBench(params, cell.bottomWidthM, z1, k);
      const Lin = dimensionWithBench(params, cell.bottomLengthM, z1, k + 1);
      const Win = dimensionWithBench(params, cell.bottomWidthM, z1, k + 1);
      const shelf = Math.max(0, Lout * Wout - Lin * Win);
      if (z1 <= cutDepthM + 1e-9) cut += shelf;
      else fill += shelf;
    }
    z0 = z1;
  }
  return { cut, fill, total: cut + fill };
}

export function lateralArea(cell: CellConfig): number {
  return lateralAreaParts(cell).total;
}

function rampGeometry(cell: CellConfig, cutDepthM: number): {
  widthM: number;
  gradePct: number;
  lengthM: number;
  volumeM3: number;
} {
  const widthM = Math.max(0, cell.rampWidthM ?? 0);
  const gradePct = Math.max(0, cell.rampGradePct ?? 0);
  const declaredLength = Math.max(0, cell.rampLengthM ?? 0);
  const lengthM =
    declaredLength > 0 ? declaredLength : gradePct > 0 ? cutDepthM / (gradePct / 100) : 0;
  const isRamp = cell.method === "ramp" || effectiveMethod(cell) === "ramp";
  const volumeM3 = isRamp && widthM > 0 && lengthM > 0 && cutDepthM > 0
    ? 0.5 * widthM * lengthM * cutDepthM
    : 0;
  return { widthM, gradePct, lengthM, volumeM3 };
}

export interface CellGeometryContext {
  terrainBaseElevationM?: number;
}

export function cellGeometry(cell: CellConfig, context: CellGeometryContext = {}): CellGeometry {
  const warnings: string[] = [];
  const params = profileParams(cell);
  const height = params.heightM;
  const cutDepth = cutDepthOf(cell);
  const fillHeight = Math.max(0, height - cutDepth);
  const freeboard = freeboardOf(cell);
  const designHeight = designHeightOf(cell);
  const topLength = cellDimensionAt(cell, height, "length");
  const topWidth = cellDimensionAt(cell, height, "width");
  const groundLength = Math.max(
    cellDimensionAt(cell, cutDepth, "length"),
    cellDimensionAt(cell, Math.max(cutDepth - 1e-6, 0), "length"),
  );
  const groundWidth = Math.max(
    cellDimensionAt(cell, cutDepth, "width"),
    cellDimensionAt(cell, Math.max(cutDepth - 1e-6, 0), "width"),
  );
  const bottomArea = cell.bottomLengthM * cell.bottomWidthM;
  const groundArea = groundLength * groundWidth;
  const topArea = Math.max(0, topLength) * Math.max(0, topWidth);
  const gross = cellVolumeZeroTo(cell, height);
  const designWaste = cellVolumeZeroTo(cell, designHeight);
  const cutVolume = cellVolumeZeroTo(cell, cutDepth);
  const belowGradeWaste = cellVolumeZeroTo(cell, Math.min(cutDepth, designHeight));
  const aboveGrade = Math.max(0, gross - cutVolume);
  const lateral = lateralAreaParts(cell);
  const ramp = rampGeometry(cell, cutDepth);
  const checks = methodChecks(cell, { terrainBaseElevationM: context.terrainBaseElevationM });

  let valid = true;
  if (height <= 0) {
    valid = false;
    warnings.push("La altura geométrica de la celda debe ser mayor que cero.");
  }
  if (topLength <= 0 || topWidth <= 0) {
    valid = false;
    warnings.push(
      "La coronación de la celda es nula o negativa: reduzca la altura, la pendiente o el ancho de bermas.",
    );
  }
  if (bottomArea <= 0) {
    valid = false;
    warnings.push("El área de fondo de la celda debe ser mayor que cero.");
  }
  if (cell.heightM > 0 && cell.excavationDepthM > cell.heightM + 1e-9) {
    warnings.push("La profundidad de excavación supera la altura geométrica de la celda; se limita a H.");
  }
  if (freeboard >= height && height > 0) {
    warnings.push("El borde libre consume toda la altura de la celda; no queda volumen útil para residuos.");
  }
  if (cell.slopeHtoV <= 0) {
    valid = false;
    warnings.push("El talud debe ser mayor que cero.");
  } else if (cell.slopeHtoV < 0.5) {
    warnings.push("Talud más vertical que 1V:0,5H: revise estabilidad y requerimientos de la barrera.");
  } else if (cell.slopeHtoV > 4) {
    warnings.push("Talud más tendido que 1H:4V: revise consumo de área y volúmenes.");
  }
  if (fillHeight > 0.05 && topLength < cell.bottomLengthM * 0.02) {
    warnings.push("La plataforma superior del montículo es muy pequeña para operar equipos.");
  }
  if (checks.some((check) => check.severity === "error")) valid = false;

  return {
    id: cell.id,
    name: cell.name,
    shape: cell.shape,
    method: cell.method,
    effectiveMethod: effectiveMethod(cell),
    methodMatches: effectiveMethod(cell) === cell.method,
    bottomLengthM: cell.bottomLengthM,
    bottomWidthM: cell.bottomWidthM,
    topLengthM: topLength,
    topWidthM: topWidth,
    groundLengthM: groundLength,
    groundWidthM: groundWidth,
    heightM: height,
    designHeightM: designHeight,
    slopeHtoV: cell.slopeHtoV,
    bermCount: cell.bermCount,
    bermWidthM: cell.bermWidthM,
    baseElevationM: cell.baseElevationM,
    groundElevationM: cell.baseElevationM + cutDepth,
    topElevationM: cell.baseElevationM + height,
    designTopElevationM: cell.baseElevationM + designHeight,
    excavationDepthM: cell.excavationDepthM,
    freeboardM: freeboard,
    cutDepthM: cutDepth,
    fillHeightM: fillHeight,
    cutFractionPct: height > 0 ? (cutDepth / height) * 100 : 0,
    fillFractionPct: height > 0 ? (fillHeight / height) * 100 : 0,
    bottomAreaM2: bottomArea,
    topAreaM2: topArea,
    groundAreaM2: groundArea,
    grossVolumeM3: gross,
    designWasteVolumeM3: designWaste,
    excavationVolumeM3: cutVolume,
    cutVolumeM3: cutVolume,
    belowGradeWasteVolumeM3: belowGradeWaste,
    aboveGradeVolumeM3: aboveGrade,
    rampWidthM: ramp.widthM,
    rampGradePct: ramp.gradePct,
    rampLengthM: ramp.lengthM,
    rampVolumeM3: ramp.volumeM3,
    liningAreaM2: bottomArea + lateral.cut,
    finalCoverAreaM2: topArea + lateral.fill,
    cutLateralAreaM2: lateral.cut,
    fillLateralAreaM2: lateral.fill,
    lateralAreaM2: lateral.total,
    slopeAngleDeg: cell.slopeHtoV > 0 ? (Math.atan(1 / cell.slopeHtoV) * 180) / Math.PI : 90,
    sequenceOrder: cell.sequenceOrder,
    valid,
    warnings,
    methodChecks: checks,
  };
}

function layerArea(layer: Layer, cell: CellGeometry): number {
  if (layer.category === "final-cover" || layer.category === "vegetation") {
    return cell.finalCoverAreaM2;
  }
  if (layer.category === "daily-cover" || layer.category === "intermediate-cover") {
    return cell.topAreaM2;
  }
  return cell.liningAreaM2;
}

const LINER_CATEGORIES = new Set<Layer["category"]>([
  "subgrade",
  "clay",
  "geomembrane",
  "geotextile",
  "drainage",
  "protection",
]);

export function cellLinerVolume(cell: CellGeometry, layers: Layer[]): number {
  return layers
    .filter((l) => l.enabled && LINER_CATEGORIES.has(l.category))
    .reduce((sum, l) => sum + layerArea(l, cell) * (l.thicknessMm / 1000), 0);
}

function emptyMethodCounts(): Record<CellMethod, number> {
  return { trench: 0, area: 0, ramp: 0 };
}

export function computeGeometry(geometry: GeometryParams): GeometryResult {
  const cells = [...geometry.cells]
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((cell) =>
      cellGeometry(cell, { terrainBaseElevationM: geometry.terrainBaseElevationM }),
    );
  const warnings: string[] = [];
  const ids = new Set<string>();
  const methodCounts = emptyMethodCounts();
  const effectiveMethodCounts = emptyMethodCounts();
  for (const c of cells) {
    if (ids.has(c.name)) warnings.push(`Identificador de celda duplicado: ${c.name}.`);
    ids.add(c.name);
    methodCounts[c.method] += 1;
    effectiveMethodCounts[c.effectiveMethod] += 1;
    warnings.push(...c.warnings.map((w) => `${c.name}: ${w}`));
    warnings.push(...c.methodChecks.map((check) => `${c.name}: ${check.title} — ${check.detail}`));
  }

  const grossVolume = cells.reduce((s, c) => s + c.grossVolumeM3, 0);
  const designGrossVolume = cells.reduce((s, c) => s + c.designWasteVolumeM3, 0);
  const excavationVolume = cells.reduce((s, c) => s + c.excavationVolumeM3, 0);
  const rampExcavationVolume = cells.reduce((s, c) => s + c.rampVolumeM3, 0);
  const aboveGradeVolume = cells.reduce((s, c) => s + c.aboveGradeVolumeM3, 0);
  const liningArea = cells.reduce((s, c) => s + c.liningAreaM2, 0);
  const finalCoverArea = cells.reduce((s, c) => s + c.finalCoverAreaM2, 0);
  const footprintArea = cells.reduce((s, c) => s + c.groundAreaM2, 0);
  const topArea = cells.reduce((s, c) => s + c.topAreaM2, 0);
  const groundArea = cells.reduce((s, c) => s + c.groundAreaM2, 0);

  const layerVolumes: LayerVolume[] = [];
  const activeLayers = geometry.layers.filter((l) => l.enabled);
  for (const layer of activeLayers) {
    if (layer.category === "waste") continue;
    let area = 0;
    for (const cell of cells) area += layerArea(layer, cell);
    layerVolumes.push({
      layerId: layer.id,
      name: layer.name,
      category: layer.category,
      thicknessMm: layer.thicknessMm,
      areaM2: area,
      volumeM3: area * (layer.thicknessMm / 1000),
    });
  }
  const linerVolume = layerVolumes
    .filter((l) => LINER_CATEGORIES.has(l.category))
    .reduce((s, l) => s + l.volumeM3, 0);
  if (geometry.footprintAreaM2 > 0 && footprintArea > geometry.footprintAreaM2 * 1.02) {
    warnings.push(
      `La huella de las celdas (${footprintArea.toFixed(0)} m²) supera el área de implantación declarada (${geometry.footprintAreaM2.toFixed(0)} m²).`,
    );
  }

  // Aggregated elevation-volume curve used by the capacity chart.
  const volumeProfileM3: { elevation: number; volume: number }[] = [];
  const minElev = Math.min(...cells.map((c) => c.baseElevationM), geometry.terrainBaseElevationM);
  const maxElev = Math.max(...cells.map((c) => c.topElevationM), geometry.terrainBaseElevationM + 1);
  const step = Math.max((maxElev - minElev) / 30, 0.5);
  for (let e = minElev; e <= maxElev + 1e-6; e += step) {
    let v = 0;
    for (let i = 0; i < geometry.cells.length; i++) {
      const cfg = geometry.cells[i];
      const rel = e - cfg.baseElevationM;
      v += cellVolumeZeroTo(cfg, Math.max(0, Math.min(rel, cfg.heightM)));
    }
    volumeProfileM3.push({ elevation: Number(e.toFixed(2)), volume: v });
  }

  return {
    cells,
    grossVolumeM3: grossVolume,
    designGrossVolumeM3: designGrossVolume,
    excavationVolumeM3: excavationVolume,
    rampExcavationVolumeM3: rampExcavationVolume,
    totalExcavationVolumeM3: excavationVolume + rampExcavationVolume,
    aboveGradeVolumeM3: aboveGradeVolume,
    liningAreaM2: liningArea,
    finalCoverAreaM2: finalCoverArea,
    footprintAreaM2: footprintArea,
    topAreaM2: topArea,
    groundAreaM2: groundArea,
    layerVolumes,
    linerVolumeM3: linerVolume,
    methodCounts,
    effectiveMethodCounts,
    warnings,
    volumeProfileM3,
  };
}
