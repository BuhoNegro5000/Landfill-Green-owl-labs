import type { CellConfig, WasteParams } from "@/lib/types";
import { designDensity } from "./density";
import {
  cellLinerVolume,
  heightForVolume,
  type GeometryResult,
} from "./geometry";

export interface CellCapacity {
  cellId: string;
  name: string;
  /** Volumen bruto geométrico de la celda (fondo a coronación). */
  geometricGrossVolumeM3: number;
  /** Volumen bruto disponible hasta la cota de diseño (altura − borde libre). */
  grossVolumeM3: number;
  freeboardVolumeM3: number;
  cutVolumeM3: number;
  aboveGradeVolumeM3: number;
  rampVolumeM3: number;
  linerVolumeM3: number;
  infrastructureReserveM3: number;
  wasteVolumeM3: number;
  coverVolumeM3: number;
  tonnageT: number;
  fillVolumeM3: number;
  fillFraction: number;
  topElevationM: number;
  sequenceOrder: number;
}

export interface CapacityResult {
  method: string;
  geometricGrossVolumeM3: number;
  designGrossVolumeM3: number;
  freeboardVolumeM3: number;
  excavationVolumeM3: number;
  rampExcavationVolumeM3: number;
  totalExcavationVolumeM3: number;
  cutSoilAvailableM3: number;
  coverSoilDemandM3: number;
  earthworksBalanceM3: number;
  earthworksStatus: "superávit" | "equilibrio" | "déficit";
  linerVolumeM3: number;
  infrastructureReserveM3: number;
  usableVolumeM3: number;
  wasteVolumeM3: number;
  coverVolumeM3: number;
  totalVolumeM3: number;
  utilizationFactor: number;
  coverRatioPct: number;
  densityKgM3: number;
  totalTonnageT: number;
  cells: CellCapacity[];
  assumptionNotes: string[];
}

/**
 * Capacity model:
 *   V_disp = V_bruto_diseño · FU − V_liner − V_infra
 *   V_res  = V_disp / (1 + r_cover)
 *   T      = V_res · ρ / 1000
 * with V_bruto_diseño limited by the freeboard and r_cover as a volume ratio.
 * The method-aware geometry provides cut, above-grade and ramp volumes; the
 * earthworks balance compares excavated soil with cover demand.
 */
export function computeCapacity(
  geometry: GeometryResult,
  layers: Parameters<typeof cellLinerVolume>[1],
  waste: WasteParams,
  options: { utilizationFactor: number; infrastructureReservePct: number },
): CapacityResult {
  const utilization = Math.min(Math.max(options.utilizationFactor, 0), 1);
  const infraPct = Math.min(Math.max(options.infrastructureReservePct, 0), 100);
  const coverRatio = Math.max(waste.coverRatioPct, 0) / 100;
  const density = designDensity(waste);

  const cells: CellCapacity[] = geometry.cells.map((cell) => {
    const liner = cellLinerVolume(cell, layers);
    const designGross = cell.designWasteVolumeM3;
    const infra = (designGross * infraPct) / 100;
    const available = Math.max(0, designGross * utilization - liner - infra);
    const wasteVolume = available / (1 + coverRatio);
    return {
      cellId: cell.id,
      name: cell.name,
      geometricGrossVolumeM3: cell.grossVolumeM3,
      grossVolumeM3: designGross,
      freeboardVolumeM3: Math.max(0, cell.grossVolumeM3 - designGross),
      cutVolumeM3: cell.cutVolumeM3,
      aboveGradeVolumeM3: cell.aboveGradeVolumeM3,
      rampVolumeM3: cell.rampVolumeM3,
      linerVolumeM3: liner,
      infrastructureReserveM3: infra,
      wasteVolumeM3: wasteVolume,
      coverVolumeM3: wasteVolume * coverRatio,
      tonnageT: (wasteVolume * density) / 1000,
      fillVolumeM3: 0,
      fillFraction: 0,
      topElevationM: cell.designTopElevationM,
      sequenceOrder: cell.sequenceOrder,
    };
  });

  const geomGross = geometry.grossVolumeM3;
  const designGross = geometry.designGrossVolumeM3;
  const linerVolume = geometry.linerVolumeM3;
  const infra = (designGross * infraPct) / 100;
  const available = Math.max(0, designGross * utilization - linerVolume - infra);
  const wasteVolume = available / (1 + coverRatio);
  const coverVolume = wasteVolume * coverRatio;
  const cutSoilAvailable = geometry.totalExcavationVolumeM3;
  const earthworksBalance = cutSoilAvailable - coverVolume;
  const earthworksStatus: CapacityResult["earthworksStatus"] =
    earthworksBalance > 1e-6 ? "superávit" : earthworksBalance < -1e-6 ? "déficit" : "equilibrio";

  return {
    method:
      "Capacidad volumétrica por integración de secciones (prismoidal), con corte, relleno, borde libre y balance de tierras",
    geometricGrossVolumeM3: geomGross,
    designGrossVolumeM3: designGross,
    freeboardVolumeM3: Math.max(0, geomGross - designGross),
    excavationVolumeM3: geometry.excavationVolumeM3,
    rampExcavationVolumeM3: geometry.rampExcavationVolumeM3,
    totalExcavationVolumeM3: geometry.totalExcavationVolumeM3,
    cutSoilAvailableM3: cutSoilAvailable,
    coverSoilDemandM3: coverVolume,
    earthworksBalanceM3: earthworksBalance,
    earthworksStatus,
    linerVolumeM3: linerVolume,
    infrastructureReserveM3: infra,
    usableVolumeM3: available,
    wasteVolumeM3: wasteVolume,
    coverVolumeM3: coverVolume,
    totalVolumeM3: wasteVolume + coverVolume,
    utilizationFactor: utilization,
    coverRatioPct: waste.coverRatioPct,
    densityKgM3: density,
    totalTonnageT: (wasteVolume * density) / 1000,
    cells,
    assumptionNotes: [
      "Volumen calculado por integración prismoidal de secciones horizontales; no reemplaza una cubicación topográfica.",
      `Factor de utilización del volumen: ${(utilization * 100).toFixed(0)} %.`,
      `Reserva de infraestructura: ${infraPct.toFixed(1)} % del volumen bruto de diseño.`,
      `Relación volumétrica de cobertura: ${waste.coverRatioPct.toFixed(1)} % del volumen de residuos.`,
      "El volumen bruto de diseño descuenta el borde libre declarado en cada celda; el volumen geométrico se informa por separado.",
      "El volumen de la barrera mineral y geosintéticos se descuenta con el área de fondo y los taludes de corte del modelo.",
      "El balance de tierras compara el material excavado (celdas + rampa) con el volumen de cobertura requerido; no incluye préstamos para barrera mineral ni pérdidas de manipulación.",
      "El volumen de rampa se estima como cuña de acceso (0,5 · ancho · longitud · desnivel) y no forma parte del prisma de residuos.",
    ],
  };
}

/** Assign the annual disposed volume to cells in sequence and compute lift heights. */
export function allocateWasteToCells(
  cells: CellCapacity[],
  cellConfigs: CellConfig[],
  annualWasteVolumeM3: number[],
  startYear: number,
  wasteDensityKgM3: number,
): {
  annual: {
    year: number;
    cellVolumes: Record<string, number>;
    cellFillFractions: Record<string, number>;
    cellElevations: Record<string, number>;
  }[];
  cellSummary: {
    cellId: string;
    openYear: number | null;
    closeYear: number | null;
    filledVolumeM3: number;
    filledTonnageT: number;
    fillFraction: number;
  }[];
} {
  const order = [...cells].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const remaining = new Map(order.map((c) => [c.cellId, c.wasteVolumeM3]));
  const filled = new Map(order.map((c) => [c.cellId, 0]));
  const openYear = new Map<string, number>();
  const closeYear = new Map<string, number>();

  const annual = annualWasteVolumeM3.map((volume, idx) => {
    let left = volume;
    for (const cell of order) {
      if (left <= 1e-9) break;
      const rem = remaining.get(cell.cellId) ?? 0;
      if (rem <= 1e-9) continue;
      const take = Math.min(rem, left);
      if (take > 0 && !openYear.has(cell.cellId)) openYear.set(cell.cellId, startYear + idx);
      remaining.set(cell.cellId, rem - take);
      filled.set(cell.cellId, (filled.get(cell.cellId) ?? 0) + take);
      if ((remaining.get(cell.cellId) ?? 0) <= 1e-6) closeYear.set(cell.cellId, startYear + idx);
      left -= take;
    }
    const cellVolumes: Record<string, number> = {};
    const cellFillFractions: Record<string, number> = {};
    const cellElevations: Record<string, number> = {};
    for (const cell of order) {
      const v = filled.get(cell.cellId) ?? 0;
      const geom = cellConfigs.find((g) => g.id === cell.cellId);
      cellVolumes[cell.cellId] = v;
      cellFillFractions[cell.cellId] = cell.wasteVolumeM3 > 0 ? Math.min(1, v / cell.wasteVolumeM3) : 0;
      cellElevations[cell.cellId] = geom ? geom.baseElevationM + heightForVolume(geom, v) : 0;
    }
    return {
      year: startYear + idx,
      cellVolumes,
      cellFillFractions,
      cellElevations,
    };
  });

  const cellSummary = order.map((c) => ({
    cellId: c.cellId,
    openYear: openYear.get(c.cellId) ?? null,
    closeYear: closeYear.get(c.cellId) ?? null,
    filledVolumeM3: filled.get(c.cellId) ?? 0,
    filledTonnageT: ((filled.get(c.cellId) ?? 0) * wasteDensityKgM3) / 1000,
    fillFraction: c.wasteVolumeM3 > 0 ? Math.min(1, (filled.get(c.cellId) ?? 0) / c.wasteVolumeM3) : 0,
  }));

  return { annual, cellSummary };
}
