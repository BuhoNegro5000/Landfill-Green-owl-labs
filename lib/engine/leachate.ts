import type { CellConfig, GeometryParams, LeachateParams, SiteData } from "@/lib/types";
import type { GeometryResult } from "./geometry";
import { cellSurfaceAreaAtHeight, heightForVolume } from "./geometry";
import type { WasteResult } from "./waste";

export interface LeachateAnnualRow {
  year: number;
  activeAreaM2: number;
  closedAreaM2: number;
  rainfallM3: number;
  runoffM3: number;
  evapotranspirationM3: number;
  infiltrationM3: number;
  moistureReleaseM3: number;
  leachateM3: number;
  treatedM3: number;
  untreatedM3: number;
  avgFlowLps: number;
  peakMonthFlowLps: number;
  storageEventM3: number;
}

export interface LeachateResult {
  annual: LeachateAnnualRow[];
  totalLeachateM3: number;
  totalTreatedM3: number;
  totalUntreatedM3: number;
  avgFlowLps: number;
  designPeakFlowLps: number;
  recommendedStorageM3: number;
  pipeCapacityLps: number;
  pipeUtilizationPct: number | null;
  pipeStatus: "ok" | "insufficient" | "sin-datos" | "sin-demanda";
  swissFlowLps: number;
  swissCoefficient: number;
  stormFlowLps: number;
  leakageM3Yr: number;
  waterBalanceClosurePct: number;
  assumptions: string[];
}

/** Manning full-pipe capacity (m³/s) for a circular pipe. */
export function manningFullPipeCapacity(diameterM: number, slope: number, n: number): number {
  if (diameterM <= 0 || slope <= 0 || n <= 0) return 0;
  const area = (Math.PI * diameterM ** 2) / 4;
  const hydraulicRadius = diameterM / 4;
  return (1 / n) * area * hydraulicRadius ** (2 / 3) * Math.sqrt(slope);
}

export function computeLeachate(
  site: SiteData,
  params: LeachateParams,
  waste: WasteResult,
  geometry: GeometryResult,
  geometryParams: GeometryParams,
  operationWorkingFaceAreaM2: number,
): LeachateResult {
  const cellConfigs = new Map(geometryParams.cells.map((c) => [c.id, c]));
  const rows: LeachateAnnualRow[] = [];
  let totalLeachate = 0;
  let totalTreated = 0;
  let totalUntreated = 0;
  let totalRain = 0;
  let totalRunoff = 0;
  let totalEt = 0;
  let totalInfil = 0;
  let maxPeak = 0;

  waste.annual.forEach((row, idx) => {
    const alloc = waste.cellAllocation.annual[idx];
    let activeArea = params.exposedAreaMode === "manual" ? params.manualExposedAreaM2 : 0;
    let closedArea = 0;

    if (params.exposedAreaMode === "operation") {
      activeArea += operationWorkingFaceAreaM2;
      const prev = idx > 0 ? waste.cellAllocation.annual[idx - 1].cellVolumes : {};
      for (const [cellId, filled] of Object.entries(alloc?.cellVolumes ?? {})) {
        const cfg = cellConfigs.get(cellId) as CellConfig | undefined;
        const geom = geometry.cells.find((c) => c.id === cellId);
        if (!cfg || !geom) continue;
        const filledBefore = prev[cellId] ?? 0;
        const cellCap = waste.capacity.cells.find((c) => c.cellId === cellId)?.wasteVolumeM3 ?? 0;
        const isClosed = cellCap > 0 && filled >= cellCap - 1e-6;
        if (filled > filledBefore + 1e-9) {
          const z = heightForVolume(cfg, filled);
          activeArea += cellSurfaceAreaAtHeight(cfg, z);
        } else if (filled > 1e-9) {
          closedArea += isClosed ? geom.topAreaM2 : cellSurfaceAreaAtHeight(cfg, heightForVolume(cfg, filled));
        }
      }
    }

    const rainfallActive = (site.rainfallMmYr / 1000) * activeArea;
    const rainfallClosed = (site.rainfallMmYr / 1000) * closedArea;
    const runoffActive = rainfallActive * site.runoffCoefficient;
    const runoffClosed = rainfallClosed * site.runoffCoefficient;
    const etClosed = Math.min(
      (site.evapotranspirationMmYr / 1000) * closedArea,
      Math.max(0, rainfallClosed - runoffClosed),
    );
    const infiltrationActive = Math.max(0, rainfallActive - runoffActive);
    const infiltrationClosed = Math.max(0, rainfallClosed - runoffClosed - etClosed) * params.coverInfiltrationFactor;
    const moistureRelease = row.landfilledT * Math.max(0, (params.incomingMoisturePct - params.fieldCapacityPct) / 100);
    const leachate = infiltrationActive + infiltrationClosed + moistureRelease;
    const annualCapacity = params.treatmentCapacityM3Day * 365;
    const treated = Math.min(leachate, annualCapacity);
    const untreated = Math.max(0, leachate - treated);

    const monthInfil =
      ((site.maxMonthlyRainfallMm / 1000) * (activeArea + closedArea * params.coverInfiltrationFactor) *
        (1 - site.runoffCoefficient)) +
      moistureRelease / 12;
    const peakMonthFlow = (monthInfil / (30 * 86400)) * 1000;
    const stormVolume =
      (site.maxDailyRainfallMm / 1000) * (activeArea + closedArea * params.coverInfiltrationFactor) * (1 - site.runoffCoefficient);
    const avgFlow = (leachate / (365 * 86400)) * 1000;

    rows.push({
      year: row.year,
      activeAreaM2: activeArea,
      closedAreaM2: closedArea,
      rainfallM3: rainfallActive + rainfallClosed,
      runoffM3: runoffActive + runoffClosed,
      evapotranspirationM3: etClosed,
      infiltrationM3: infiltrationActive + infiltrationClosed,
      moistureReleaseM3: moistureRelease,
      leachateM3: leachate,
      treatedM3: treated,
      untreatedM3: untreated,
      avgFlowLps: avgFlow,
      peakMonthFlowLps: peakMonthFlow,
      storageEventM3: stormVolume,
    });

    totalLeachate += leachate;
    totalTreated += treated;
    totalUntreated += untreated;
    totalRain += rainfallActive + rainfallClosed;
    totalRunoff += runoffActive + runoffClosed;
    totalEt += etClosed;
    totalInfil += infiltrationActive + infiltrationClosed;
    maxPeak = Math.max(maxPeak, peakMonthFlow);
  });

  const avgFlow = totalLeachate > 0 && waste.annual.length ? (totalLeachate / (waste.annual.length * 365 * 86400)) * 1000 : 0;
  const designPeak = maxPeak;
  const avgDaily = totalLeachate / Math.max(waste.annual.length, 1) / 365;
  const maxEvent = rows.reduce((m, r) => Math.max(m, r.storageEventM3), 0);
  const recommendedStorage = avgDaily * params.storageRetentionDays + maxEvent;

  const diameterM = params.pipeDiameterMm / 1000;
  const slope = params.pipeSlopePct / 100;
  const capacityLps = manningFullPipeCapacity(diameterM, slope, params.pipeManningN) * 1000;
  const pipeUtilization = capacityLps > 0 ? (designPeak / capacityLps) * 100 : null;
  const pipeStatus: LeachateResult["pipeStatus"] =
    designPeak <= 0
      ? "sin-demanda"
      : capacityLps <= 0
        ? "sin-datos"
        : designPeak <= capacityLps
          ? "ok"
          : "insufficient";

  const liningArea = geometry.cells.reduce((s, c) => s + c.bottomAreaM2, 0);
  const leakage = params.linerPermeabilityMs * 1 * liningArea * 365 * 86400;
  const closureCheck = totalRain > 0 ? ((totalRunoff + totalEt + totalInfil) / totalRain) * 100 : 100;
  const swissCoefficient = Math.min(Math.max(params.swissK, 0), 1);
  const swissFlowLps =
    (site.rainfallMmYr * geometry.footprintAreaM2 * swissCoefficient) / 31_536_000;
  const stormIntensityMmH = site.maxDailyRainfallMm / 24;
  const stormFlowLps =
    (site.runoffCoefficient * stormIntensityMmH * geometry.footprintAreaM2 * 1000) / 3_600_000;

  const assumptions = [
    "Balance hídrico anual de control de superficie: P = E + R + I (precipitación = evapotranspiración + escorrentía + infiltración).",
    `Coeficiente de escorrentía: ${site.runoffCoefficient.toFixed(2)}; ET: ${site.evapotranspirationMmYr} mm/año.`,
    "El área expuesta se estima a partir del avance de llenado de cada celda y del frente de trabajo declarado.",
    `Factor de infiltración de áreas cerradas: ${params.coverInfiltrationFactor.toFixed(2)} (0 = cobertura impermeable, 1 = sin reducción).`,
    "Liberación de humedad = masa dispuesta × (humedad de ingreso − capacidad de campo); no se modela flujo no saturado.",
    `Almacenamiento = caudal medio diario × ${params.storageRetentionDays} días + evento de lluvia máxima diaria.`,
    "La capacidad de tubería se calcula con Manning a sección llena; no verifica gradiente hidráulico, aireación ni flujo parcial.",
    `Método suizo de control: Q = P · A · K / 31 536 000, con K = ${params.swissK} (MINAM 2011, p. 80).`,
    `Escorrentía de diseño por fórmula racional: Qp = C · i · A / 3 600 000, con i = ${stormIntensityMmH.toFixed(2)} mm/h (MINAM 2011, p. 70).`,
    "La animación de flujo en 3D es conceptual y no resuelve hidráulica espacial.",
  ];

  return {
    annual: rows,
    totalLeachateM3: totalLeachate,
    totalTreatedM3: totalTreated,
    totalUntreatedM3: totalUntreated,
    avgFlowLps: avgFlow,
    designPeakFlowLps: designPeak,
    recommendedStorageM3: recommendedStorage,
    pipeCapacityLps: capacityLps,
    pipeUtilizationPct: pipeUtilization,
    pipeStatus,
    swissFlowLps,
    swissCoefficient,
    stormFlowLps,
    leakageM3Yr: leakage,
    waterBalanceClosurePct: closureCheck,
    assumptions,
  };
}
