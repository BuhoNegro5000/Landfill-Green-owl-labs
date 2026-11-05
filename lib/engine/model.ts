import type { Project, Scenario, ScenarioParams } from "@/lib/types";
import { computeCapacity, type CapacityResult } from "./capacity";
import { computeClosure, type ClosureResult } from "./closure";
import { computeGas, type GasResult } from "./gas";
import { computeGeotech, type GeotechResult } from "./geotech";
import { computeGeometry, ENGINE_VERSION, type GeometryResult } from "./geometry";
import { computeLeachate, type LeachateResult } from "./leachate";
import { computeWasteBalance, type WasteResult } from "./waste";
import { computeSiteCompleteness, type SiteCompleteness } from "@/lib/siteFields";
import { assessSiteSelection, type SiteSelectionAssessment } from "@/lib/siteSelection";
import { validateModel, type Issue } from "./validation";

export interface OperationYear {
  year: number;
  wasteT: number;
  cumulativeT: number;
  fillPct: number;
  remainingT: number;
  maxElevationM: number;
  activeCellNames: string[];
  closedCellNames: string[];
  cellStates: { cellId: string; name: string; fillPct: number; elevationM: number }[];
  closurePhase: "operación" | "clausura" | "posclausura";
}

export interface CostResult {
  npvUsd: number;
  totalCapexUsd: number;
  totalOpexUsd: number;
  totalTreatmentUsd: number;
  totalRevenueUsd: number;
  costPerTonneUsd: number;
  annual: { year: number; opex: number; treatment: number; revenue: number; net: number; discounted: number }[];
  notes: string[];
}

export interface CoreResult {
  params: ScenarioParams;
  geometry: GeometryResult;
  capacity: CapacityResult;
  waste: WasteResult;
  leachate: LeachateResult;
  gas: GasResult;
  geotech: GeotechResult;
  closure: ClosureResult;
  operation: OperationYear[];
  costs: CostResult;
  completeness: SiteCompleteness;
  siteSelection: SiteSelectionAssessment;
  horizonYears: number;
}

export interface ComputedModel extends CoreResult {
  issues: Issue[];
  engineVersion: string;
}

function computeCosts(params: ScenarioParams, waste: WasteResult, leachate: LeachateResult, gas: GasResult): CostResult {
  const rate = Math.max(params.costs.discountRatePct, 0) / 100;
  const annual = waste.annual.map((row, idx) => {
    const yearGas = gas.annual.find((g) => g.year === row.year);
    const yearLeachate = leachate.annual.find((l) => l.year === row.year);
    const opex = row.landfilledT * params.costs.opexUsdPerTonne;
    const treatment = (yearLeachate?.treatedM3 ?? 0) * params.costs.leachateTreatmentUsdPerM3;
    const revenue = (yearGas?.energyMWh ?? 0) * params.costs.gasRevenueUsdPerMwh;
    const net = opex + treatment - revenue;
    return {
      year: row.year,
      opex,
      treatment,
      revenue,
      net,
      discounted: net / (1 + rate) ** (idx + 1),
    };
  });
  const totalOpex = annual.reduce((s, a) => s + a.opex, 0);
  const totalTreatment = annual.reduce((s, a) => s + a.treatment, 0);
  const totalRevenue = annual.reduce((s, a) => s + a.revenue, 0);
  const npv = params.costs.capexUsd + annual.reduce((s, a) => s + a.discounted, 0);
  return {
    npvUsd: npv,
    totalCapexUsd: params.costs.capexUsd,
    totalOpexUsd: totalOpex,
    totalTreatmentUsd: totalTreatment,
    totalRevenueUsd: totalRevenue,
    costPerTonneUsd: waste.totalLandfilledT > 0 ? npv / waste.totalLandfilledT : 0,
    annual,
    notes: [
      "CAPEX se registra en el año 0; OPEX, tratamiento y ingresos se descuentan desde el año 1.",
      "No se incluyen costos de posclausura ni de remediación; el usuario debe incorporarlos si corresponde.",
      "Los costos son datos introducidos por el usuario y no una estimación de mercado.",
    ],
  };
}

function buildOperation(
  waste: WasteResult,
  closureYear: number | null,
  postClosureYears: number,
): OperationYear[] {
  return waste.annual.map((row) => {
    const closurePhase: OperationYear["closurePhase"] =
      closureYear === null
        ? "operación"
        : row.year < Math.floor(closureYear)
          ? "operación"
          : row.year < closureYear + postClosureYears
            ? "clausura"
            : "posclausura";
    const cellStates = waste.cellAllocation.annual.find((a) => a.year === row.year);
    return {
      year: row.year,
      wasteT: row.landfilledT,
      cumulativeT: row.cumulativeMassT,
      fillPct: row.fillPct,
      remainingT: row.remainingTonnageT,
      maxElevationM: row.maxElevationM,
      activeCellNames: waste.capacity.cells
        .filter((c) => row.activeCellIds.includes(c.cellId))
        .map((c) => c.name),
      closedCellNames: waste.capacity.cells
        .filter((c) => row.closedCellIds.includes(c.cellId))
        .map((c) => c.name),
      cellStates: waste.capacity.cells.map((c) => ({
        cellId: c.cellId,
        name: c.name,
        fillPct: (cellStates?.cellFillFractions[c.cellId] ?? 0) * 100,
        elevationM: cellStates?.cellElevations[c.cellId] ?? 0,
      })),
      closurePhase,
    };
  });
}

export function computeCore(params: ScenarioParams, horizonYears: number): CoreResult {
  const geometry = computeGeometry(params.geometry);
  const capacity = computeCapacity(geometry, params.geometry.layers, params.waste, {
    utilizationFactor: params.geometry.utilizationFactor,
    infrastructureReservePct: params.geometry.infrastructureReservePct,
  });

  const effectiveHorizon =
    params.closure.earlyClosureYear !== null
      ? Math.max(1, params.closure.earlyClosureYear - params.operation.startYear + 1)
      : horizonYears;

  const waste = computeWasteBalance(
    params.waste,
    capacity,
    params.geometry.cells,
    params.operation.startYear,
    effectiveHorizon,
  );

  // Reflect the simulated fill state in the capacity table (same objects).
  const lastState = waste.cellAllocation.annual[waste.cellAllocation.annual.length - 1];
  for (const summary of waste.cellAllocation.cellSummary) {
    const cell = capacity.cells.find((c) => c.cellId === summary.cellId);
    if (!cell) continue;
    cell.fillVolumeM3 = summary.filledVolumeM3;
    cell.fillFraction = summary.fillFraction;
    if (lastState?.cellElevations[cell.cellId] !== undefined) {
      cell.topElevationM = lastState.cellElevations[cell.cellId];
    }
  }

  const closure = computeClosure(params, geometry, waste.totalCoverVolumeM3, waste.exhaustionYear);
  const leachate = computeLeachate(
    params.site,
    params.leachate,
    waste,
    geometry,
    params.geometry,
    params.operation.workingFaceAreaM2,
  );

  const averageSlopeDeg =
    geometry.cells.length > 0
      ? geometry.cells.reduce((s, c) => s + c.slopeAngleDeg * Math.max(c.grossVolumeM3, 1), 0) /
        geometry.cells.reduce((s, c) => s + Math.max(c.grossVolumeM3, 1), 0)
      : params.geotech.slopeAngleDeg;

  const geotech = computeGeotech({ ...params.geotech, slopeAngleDeg: averageSlopeDeg });
  const gas = computeGas(params.gas, waste, closure.closureYear);
  const operation = buildOperation(waste, closure.closureYear, params.closure.postClosureYears);
  const costs = computeCosts(params, waste, leachate, gas);
  const completeness = computeSiteCompleteness(params.site);
  const siteSelection = assessSiteSelection(params.site);

  return {
    params,
    geometry,
    capacity,
    waste,
    leachate,
    gas,
    geotech,
    closure,
    operation,
    costs,
    completeness,
    siteSelection,
    horizonYears,
  };
}

export function computeModel(project: Project, scenario: Scenario): ComputedModel {
  const core = computeCore(scenario.params, project.horizonYears);
  const issues = validateModel({
    project,
    params: scenario.params,
    geometry: core.geometry,
    capacity: core.capacity,
    waste: core.waste,
    leachate: core.leachate,
    gas: core.gas,
    geotech: core.geotech,
    closure: core.closure,
    completeness: core.completeness,
    siteSelection: core.siteSelection,
  });
  return { ...core, issues, engineVersion: ENGINE_VERSION };
}

export function scenarioSummary(project: Project, scenario: Scenario) {
  const core = computeCore(scenario.params, project.horizonYears);
  return {
    scenario,
    capacityT: core.capacity.totalTonnageT,
    capacityM3: core.capacity.wasteVolumeM3,
    lifeYears: core.waste.operatingYears,
    exhaustionYear: core.waste.exhaustionYear,
    leachateM3: core.leachate.totalLeachateM3,
    peakLeachateLps: core.leachate.designPeakFlowLps,
    ch4T: core.gas.totalCh4GeneratedT,
    capturedM3: core.gas.totalCapturedM3,
    energyMWh: core.gas.totalEnergyMWh,
    npvUsd: core.costs.npvUsd,
    usedPct: core.waste.usedPct,
    fs: core.geotech.factorOfSafety,
    storageM3: core.leachate.recommendedStorageM3,
    remainingT: core.waste.remainingTonnageT,
  };
}

export type ScenarioSummary = ReturnType<typeof scenarioSummary>;
