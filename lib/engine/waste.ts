import type { CellConfig, WasteParams } from "@/lib/types";
import { allocateWasteToCells, type CapacityResult, type CellCapacity } from "./capacity";
import { densityLabel, designDensity } from "./density";

export interface WasteAnnualRow {
  year: number;
  index: number;
  population: number;
  generatedT: number;
  collectedT: number;
  recoveredT: number;
  notCollectedT: number;
  receivedT: number;
  landfilledT: number;
  densityKgM3: number;
  wasteVolumeM3: number;
  coverVolumeM3: number;
  cumulativeMassT: number;
  cumulativeWasteVolumeM3: number;
  cumulativeCoverVolumeM3: number;
  remainingVolumeM3: number;
  remainingTonnageT: number;
  fillPct: number;
  activeCellIds: string[];
  closedCellIds: string[];
  maxElevationM: number;
  capacityExhausted: boolean;
  isProjection: boolean;
}

export interface WasteResult {
  annual: WasteAnnualRow[];
  exhaustionYear: number | null;
  operatingYears: number;
  totalGeneratedT: number;
  totalCollectedT: number;
  totalRecoveredT: number;
  totalLandfilledT: number;
  totalWasteVolumeM3: number;
  totalCoverVolumeM3: number;
  capacityTonnageT: number;
  remainingTonnageT: number;
  usedPct: number;
  cellAllocation: ReturnType<typeof allocateWasteToCells>;
  capacity: CapacityResult;
  assumptions: string[];
}

export function densityForYear(waste: WasteParams, _yearIndex: number): number {
  return designDensity(waste);
}

export function computeWasteBalance(
  waste: WasteParams,
  capacity: CapacityResult,
  cellConfigs: CellConfig[],
  startYear: number,
  horizonYears: number,
): WasteResult {
  const capacityVolume = capacity.wasteVolumeM3;
  const maxYears = Math.min(Math.max(horizonYears, 10), 80);
  const rows: Omit<WasteAnnualRow, "cumulativeMassT" | "cumulativeWasteVolumeM3" | "cumulativeCoverVolumeM3">[] = [];
  let cumMass = 0;
  let cumVolume = 0;
  let cumCover = 0;
  let exhaustionYear: number | null = null;
  let totalGenerated = 0;
  let totalCollected = 0;
  let totalRecovered = 0;
  let totalLandfilled = 0;
  let totalVolume = 0;
  let totalCover = 0;

  for (let i = 0; i < maxYears; i++) {
    const pop = waste.population * (1 + waste.populationGrowthPct / 100) ** i;
    const genRate = waste.perCapitaKgDay * (1 + waste.generationGrowthPct / 100) ** i;
    const generatedT = (pop * genRate * 365) / 1000;
    const collectedT = generatedT * (waste.collectionCoveragePct / 100);
    const recoveredT = collectedT * (waste.recoveryPct / 100);
    const receivedT = collectedT - recoveredT;
    const notCollectedT = generatedT - collectedT;
    const density = densityForYear(waste, i);
    const fullVolume = (receivedT * 1000) / density;
    const remainingBefore = capacityVolume - cumVolume;
    const placedVolume = Math.min(fullVolume, Math.max(remainingBefore, 0));
    const landfilledT = density > 0 ? (placedVolume * density) / 1000 : 0;
    const coverVolume = placedVolume * (waste.coverRatioPct / 100);
    const exhaustedThisYear = placedVolume < fullVolume - 1e-6 && exhaustionYear === null;

    cumMass += landfilledT;
    cumVolume += placedVolume;
    cumCover += coverVolume;
    totalGenerated += generatedT;
    totalCollected += collectedT;
    totalRecovered += recoveredT;
    totalLandfilled += landfilledT;
    totalVolume += placedVolume;
    totalCover += coverVolume;

    if (exhaustedThisYear) {
      const fraction = fullVolume > 0 ? Math.max(0, Math.min(1, (landfilledT / (receivedT || 1)))) : 0;
      exhaustionYear = startYear + i + fraction;
    } else if (cumVolume >= capacityVolume - 1e-6 && exhaustionYear === null) {
      exhaustionYear = startYear + i + 1;
    }

    rows.push({
      year: startYear + i,
      index: i,
      population: pop,
      generatedT,
      collectedT,
      recoveredT,
      notCollectedT,
      receivedT,
      landfilledT,
      densityKgM3: density,
      wasteVolumeM3: placedVolume,
      coverVolumeM3: coverVolume,
      remainingVolumeM3: Math.max(0, capacityVolume - cumVolume),
      remainingTonnageT: (Math.max(0, capacityVolume - cumVolume) * density) / 1000,
      fillPct: capacityVolume > 0 ? Math.min(100, (cumVolume / capacityVolume) * 100) : 0,
      activeCellIds: [],
      closedCellIds: [],
      maxElevationM: 0,
      capacityExhausted: cumVolume >= capacityVolume - 1e-6,
      isProjection: i > 0,
    });

    if (exhaustionYear !== null) break;
  }

  // Fill active/closed cell identity after allocation.
  const annualWaste = rows.map((r) => r.wasteVolumeM3);
  const allocation = allocateWasteToCells(
    capacity.cells,
    cellConfigs,
    annualWaste,
    startYear,
    designDensity(waste),
  );

  const annual: WasteAnnualRow[] = rows.map((row, idx) => {
    const alloc = allocation.annual[idx];
    const activeCellIds = allocation.cellSummary
      .filter(
        (c) =>
          c.openYear !== null &&
          c.openYear <= row.year &&
          (c.closeYear === null || c.closeYear > row.year),
      )
      .map((c) => c.cellId);
    const closedCellIds = allocation.cellSummary
      .filter((c) => c.closeYear !== null && c.closeYear <= row.year)
      .map((c) => c.cellId);
    const cellElevations = alloc ? Object.values(alloc.cellElevations) : [];
    return {
      ...row,
      cumulativeMassT: rows.slice(0, idx + 1).reduce((s, r) => s + r.landfilledT, 0),
      cumulativeWasteVolumeM3: rows.slice(0, idx + 1).reduce((s, r) => s + r.wasteVolumeM3, 0),
      cumulativeCoverVolumeM3: rows.slice(0, idx + 1).reduce((s, r) => s + r.coverVolumeM3, 0),
      activeCellIds,
      closedCellIds,
      maxElevationM: cellElevations.length ? Math.max(...cellElevations) : 0,
    };
  });

  const appliedCellVolume = allocation.cellSummary.reduce((s, c) => s + c.filledVolumeM3, 0);
  const usedPct = capacityVolume > 0 ? (appliedCellVolume / capacityVolume) * 100 : 0;

  return {
    annual,
    exhaustionYear,
    operatingYears: exhaustionYear !== null ? exhaustionYear - startYear : maxYears,
    totalGeneratedT: totalGenerated,
    totalCollectedT: totalCollected,
    totalRecoveredT: totalRecovered,
    totalLandfilledT: totalLandfilled,
    totalWasteVolumeM3: totalVolume,
    totalCoverVolumeM3: totalCover,
    capacityTonnageT: capacity.totalTonnageT,
    remainingTonnageT: capacity.totalTonnageT - totalLandfilled,
    usedPct,
    cellAllocation: allocation,
    capacity,
    assumptions: [
      "Generación = población servida × generación per cápita × 365 / 1000 (t/año).",
      "Recolectado = generado × cobertura de recolección; recuperado = recolectado × tasa de recuperación.",
      "Dispuesto = recolectado − recuperado; la proyección de población y de generación es geométrica anual.",
      `Base de densidad: ${densityLabel(waste)} (${designDensity(waste)} kg/m³), según Honduras 2014, pp. 46-49.`,
      `Cobertura: ${waste.coverRatioPct} % del volumen de residuos.`,
      "La vida útil se obtiene del balance anual, no de una división estática de capacidad entre toneladas.",
    ],
  };
}

export function cellCapacityById(capacity: CapacityResult): Map<string, CellCapacity> {
  return new Map(capacity.cells.map((c) => [c.cellId, c]));
}
