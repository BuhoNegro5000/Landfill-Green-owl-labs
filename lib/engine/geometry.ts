import type { CellConfig, GeometryParams, Layer } from "@/lib/types";

export const ENGINE_VERSION = "1.0.0";

export interface CellGeometry {
  id: string;
  name: string;
  shape: CellConfig["shape"];
  method: CellConfig["method"];
  bottomLengthM: number;
  bottomWidthM: number;
  topLengthM: number;
  topWidthM: number;
  heightM: number;
  slopeHtoV: number;
  bermCount: number;
  bermWidthM: number;
  baseElevationM: number;
  topElevationM: number;
  excavationDepthM: number;
  bottomAreaM2: number;
  topAreaM2: number;
  grossVolumeM3: number;
  excavationVolumeM3: number;
  liningAreaM2: number;
  lateralAreaM2: number;
  slopeAngleDeg: number;
  sequenceOrder: number;
  valid: boolean;
  warnings: string[];
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
  excavationVolumeM3: number;
  liningAreaM2: number;
  footprintAreaM2: number;
  topAreaM2: number;
  layerVolumes: LayerVolume[];
  linerVolumeM3: number;
  warnings: string[];
  volumeProfileM3: { elevation: number; volume: number }[];
}

/** Minimal shape descriptor required by the slice integrator. */
export type CellShapeInput = Pick<
  CellConfig,
  "bottomLengthM" | "bottomWidthM" | "shape" | "heightM" | "bermCount" | "bermWidthM" | "slopeHtoV"
>;

/** Berm interval used by the slice integrator (m). */
function bermInterval(cell: CellShapeInput): number {
  return cell.bermCount > 0 ? cell.heightM / cell.bermCount : cell.heightM;
}

/**
 * Horizontal dimension of a cell at relative height z (0 = base, H = top).
 * Benches (bermas) are modelled as a horizontal step of width b every H/n.
 * Excavated cells widen with height; above-grade mounds narrow.
 */
export function cellDimensionAt(
  cell: CellShapeInput,
  z: number,
  axis: "length" | "width",
): number {
  const base = axis === "length" ? cell.bottomLengthM : cell.bottomWidthM;
  const sign = cell.shape === "excavated" ? 1 : -1;
  const interval = bermInterval(cell);
  const clamped = Math.min(Math.max(z, 0), cell.heightM);
  const fullIntervals = Math.min(Math.floor(clamped / interval + 1e-9), cell.bermCount);
  const localZ = clamped - fullIntervals * interval;
  const offset = cell.slopeHtoV * localZ + fullIntervals * cell.bermWidthM;
  return base + sign * 2 * offset;
}

export interface CellProfilePoint {
  z: number;
  lengthM: number;
  widthM: number;
  areaM2: number;
}

export function cellProfile(cell: CellConfig, samples = 24): CellProfilePoint[] {
  const pts: CellProfilePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const z = (cell.heightM * i) / samples;
    const lengthM = Math.max(0, cellDimensionAt(cell, z, "length"));
    const widthM = Math.max(0, cellDimensionAt(cell, z, "width"));
    pts.push({ z, lengthM, widthM, areaM2: lengthM * widthM });
  }
  return pts;
}

/**
 * Exact prismoidal integration over each bench interval.
 * Inside an interval both horizontal dimensions are linear in z, so the
 * cross-section area is quadratic and V = Σ h/6 (A1 + 4Am + A2).
 */
export function cellVolumeZeroTo(cell: CellConfig, top: number): number {
  const H = Math.min(Math.max(top, 0), cell.heightM);
  if (H <= 0) return 0;
  const interval = bermInterval(cell);
  const n = cell.bermCount;
  let volume = 0;
  let z = 0;
  let index = 0;
  while (z < H - 1e-9) {
    const z1 = Math.min(z + interval, H);
    const h = z1 - z;
    const k = Math.min(index, n);
    const dim = (zz: number, axis: "length" | "width") => {
      const base = axis === "length" ? cell.bottomLengthM : cell.bottomWidthM;
      const sign = cell.shape === "excavated" ? 1 : -1;
      const local = zz - index * interval;
      const offset = cell.slopeHtoV * Math.max(local, 0) + k * cell.bermWidthM;
      return Math.max(0, base + sign * 2 * offset);
    };
    const A1 = dim(z, "length") * dim(z, "width");
    const Am = dim((z + z1) / 2, "length") * dim((z + z1) / 2, "width");
    const A2 = dim(z1, "length") * dim(z1, "width");
    volume += (h / 6) * (A1 + 4 * Am + A2);
    z = z1;
    index += 1;
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
  const total = cellVolumeZeroTo(cell, cell.heightM);
  if (volumeM3 >= total) return cell.heightM;
  let lo = 0;
  let hi = cell.heightM;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cellVolumeZeroTo(cell, mid) < volumeM3) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function lateralArea(cell: CellConfig): number {
  const interval = bermInterval(cell);
  const slant = Math.sqrt(1 + cell.slopeHtoV ** 2);
  let area = 0;
  let index = 0;
  let z = 0;
  while (z < cell.heightM - 1e-9) {
    const z1 = Math.min(z + interval, cell.heightM);
    const h = z1 - z;
    const L0 = Math.max(0, cellDimensionAt(cell, z, "length"));
    const W0 = Math.max(0, cellDimensionAt(cell, z, "width"));
    const L1 = Math.max(0, cellDimensionAt(cell, z1 - 1e-6, "length"));
    const W1 = Math.max(0, cellDimensionAt(cell, z1 - 1e-6, "width"));
    const P0 = 2 * (L0 + W0);
    const P1 = 2 * (L1 + W1);
    area += ((P0 + P1) / 2) * h * slant;
    if (index < cell.bermCount) {
      area += P1 * cell.bermWidthM; // horizontal bench surface
    }
    z = z1;
    index += 1;
  }
  return area;
}

export function cellGeometry(cell: CellConfig): CellGeometry {
  const warnings: string[] = [];
  const topLength = cellDimensionAt(cell, cell.heightM, "length");
  const topWidth = cellDimensionAt(cell, cell.heightM, "width");
  const bottomArea = cell.bottomLengthM * cell.bottomWidthM;
  const gross = cellVolumeZeroTo(cell, cell.heightM);
  const excavation = cell.shape === "excavated" ? cellVolumeZeroTo(cell, Math.min(cell.excavationDepthM, cell.heightM)) : 0;

  let valid = true;
  if (topLength <= 0 || topWidth <= 0) {
    valid = false;
    warnings.push(
      "La coronación de la celda es nula o negativa: reduzca la altura, la pendiente o el ancho de bermas.",
    );
  }
  if (cell.shape === "mound" && topLength < cell.bottomLengthM * 0.02) {
    warnings.push("La plataforma superior del montículo es muy pequeña para operar equipos.");
  }
  if (cell.excavationDepthM > cell.heightM) {
    warnings.push("La profundidad de excavación supera la altura geométrica de la celda; se limita a H.");
  }
  if (cell.slopeHtoV < 1) {
    warnings.push("Talud más vertical que 1H:1V: revise estabilidad y requerimientos de la barrera.");
  }
  if (cell.slopeHtoV > 4) {
    warnings.push("Talud más tendido que 1H:4V: revise consumo de área y volúmenes.");
  }

  return {
    id: cell.id,
    name: cell.name,
    shape: cell.shape,
    method: cell.method,
    bottomLengthM: cell.bottomLengthM,
    bottomWidthM: cell.bottomWidthM,
    topLengthM: topLength,
    topWidthM: topWidth,
    heightM: cell.heightM,
    slopeHtoV: cell.slopeHtoV,
    bermCount: cell.bermCount,
    bermWidthM: cell.bermWidthM,
    baseElevationM: cell.baseElevationM,
    topElevationM: cell.baseElevationM + cell.heightM,
    excavationDepthM: cell.excavationDepthM,
    bottomAreaM2: bottomArea,
    topAreaM2: Math.max(0, topLength) * Math.max(0, topWidth),
    grossVolumeM3: gross,
    excavationVolumeM3: excavation,
    liningAreaM2: bottomArea + lateralArea(cell),
    lateralAreaM2: lateralArea(cell),
    slopeAngleDeg: (Math.atan(1 / cell.slopeHtoV) * 180) / Math.PI,
    sequenceOrder: cell.sequenceOrder,
    valid,
    warnings,
  };
}

function layerArea(layer: Layer, cell: CellGeometry): number {
  if (layer.category === "final-cover" || layer.category === "vegetation") {
    return cell.topAreaM2;
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

export function computeGeometry(geometry: GeometryParams): GeometryResult {
  const cells = [...geometry.cells]
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map(cellGeometry);
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const c of cells) {
    if (ids.has(c.name)) warnings.push(`Identificador de celda duplicado: ${c.name}.`);
    ids.add(c.name);
    warnings.push(...c.warnings.map((w) => `${c.name}: ${w}`));
  }

  const grossVolume = cells.reduce((s, c) => s + c.grossVolumeM3, 0);
  const excavationVolume = cells.reduce((s, c) => s + c.excavationVolumeM3, 0);
  const liningArea = cells.reduce((s, c) => s + c.liningAreaM2, 0);
  const footprintArea = cells.reduce((s, c) => s + Math.max(c.bottomAreaM2, c.topAreaM2), 0);
  const topArea = cells.reduce((s, c) => s + c.topAreaM2, 0);

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
      const cg = cells.find((c) => c.id === cfg.id);
      if (!cg) continue;
      const rel = e - cfg.baseElevationM;
      v += cellVolumeZeroTo(cfg, Math.max(0, Math.min(rel, cfg.heightM)));
    }
    volumeProfileM3.push({ elevation: Number(e.toFixed(2)), volume: v });
  }

  return {
    cells,
    grossVolumeM3: grossVolume,
    excavationVolumeM3: excavationVolume,
    liningAreaM2: liningArea,
    footprintAreaM2: footprintArea,
    topAreaM2: topArea,
    layerVolumes,
    linerVolumeM3: linerVolume,
    warnings,
    volumeProfileM3,
  };
}
