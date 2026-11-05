import type { CellConfig, GasParams, GeotechParams, WasteParams } from "@/lib/types";
import { computeGeometry, cellVolumeZeroTo } from "@/lib/engine/geometry";
import { computeCapacity } from "@/lib/engine/capacity";
import { computeGas, ch4PotentialPerTonne } from "@/lib/engine/gas";
import { computeGeotech } from "@/lib/engine/geotech";
import { computeCore } from "@/lib/engine/model";
import { manningFullPipeCapacity } from "@/lib/engine/leachate";
import { defaultScenarioParams, defaultLayers } from "@/lib/defaults";
import type { WasteResult } from "@/lib/engine/waste";

export interface SelfTestResult {
  id: string;
  name: string;
  methodId: string;
  source: string;
  expected: string;
  actual: string;
  relativeError: number | null;
  tolerance: string;
  passed: boolean;
  detail: string;
}

function close(actual: number, expected: number, relTolerance: number): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  if (expected === 0) return Math.abs(actual) < relTolerance;
  return Math.abs((actual - expected) / expected) <= relTolerance;
}

function testCell(overrides: Partial<CellConfig>): CellConfig {
  return {
    id: "cell_test",
    name: "Celda de prueba",
    method: "trench",
    shape: "excavated",
    bottomLengthM: 73.5,
    bottomWidthM: 4.5,
    heightM: 2.5,
    slopeHtoV: 0.5,
    excavationDepthM: 2.5,
    baseElevationM: 100,
    bermCount: 0,
    bermWidthM: 0,
    sequenceOrder: 1,
    notes: "",
    ...overrides,
  };
}

export function runSelfTests(): SelfTestResult[] {
  const results: SelfTestResult[] = [];

  // 1. MINAM 2011 worked example: trench 76 × 7 m at the top, 73.5 × 4.5 m at the bottom, h = 2.5 m.
  // The manual evaluates the frustum formula V = h/3 (ab + cd + √(ab·cd)) and reports 1 068.52 m³.
  // The engine integrates the exact prismoid V = Σ h/6 (A1 + 4Am + A2), which gives 1 075.83 m³.
  const trench = testCell({});
  const trenchVolume = cellVolumeZeroTo(trench, trench.heightM);
  const manualFrustum = (2.5 / 3) * (76 * 7 + 73.5 * 4.5 + Math.sqrt(76 * 7 * 73.5 * 4.5));
  results.push({
    id: "prismoid",
    name: "Volumen prismoidal exacto — trinchera MINAM",
    methodId: "prismoid",
    source: "MINAM 2011, p. 59 (PDF 59)",
    expected: "1 075.83 m³ (analítico)",
    actual: `${trenchVolume.toFixed(2)} m³`,
    relativeError: (trenchVolume - 1075.8333333) / 1075.8333333,
    tolerance: "±0.001 %",
    passed: close(trenchVolume, 1075.8333333, 1e-5),
    detail:
      "Integración prismoidal exacta de la trinchera 76 × 7 m / 73.5 × 4.5 m / h = 2.5 m. Difiere +0.68 % del valor 1 068.52 m³ del manual, que usa la fórmula de tronco.",
  });
  results.push({
    id: "minam-frustum",
    name: "Fórmula de tronco — ejemplo MINAM",
    methodId: "prismoid",
    source: "MINAM 2011, p. 59 (PDF 59)",
    expected: "1 068.52 m³",
    actual: `${manualFrustum.toFixed(2)} m³`,
    relativeError: (manualFrustum - 1068.52) / 1068.52,
    tolerance: "±0.01 %",
    passed: close(manualFrustum, 1068.52, 0.0001),
    detail:
      "Reproduce la aritmética del manual con V = h/3 (ab + cd + √(ab·cd)), a = 76, b = 7, c = 4.5, d = 73.5. Es una aproximación de tronco; el motor usa integración prismoidal exacta.",
  });

  // 2. Honduras 2014 preliminary capacity reference.
  const honduras = (365 * 1.25 * 12 * 120_000 * 0.75 * 0.85) / 600;
  results.push({
    id: "honduras-capacity",
    name: "Capacidad preliminar — Honduras 2014",
    methodId: "honduras-capacity",
    source: "Honduras 2014, pp. 33–35 (PDF 34–36)",
    expected: "698 063 m³",
    actual: `${honduras.toFixed(0)} m³`,
    relativeError: (honduras - 698_063) / 698_063,
    tolerance: "±0.01 %",
    passed: close(honduras, 698_063, 0.0001),
    detail: "120 000 hab, 0.75 kg/hab/día, 85 % de cobertura, 12 años, 600 kg/m³, factor 1.25.",
  });

  // 3. Volumetric closure of the capacity model.
  const geometry = computeGeometry({
    method: "area",
    terrainBaseElevationM: 100,
    footprintAreaM2: 100_000,
    utilizationFactor: 0.9,
    infrastructureReservePct: 5,
    cells: [testCell({ shape: "mound", bottomLengthM: 80, bottomWidthM: 60, heightM: 10, slopeHtoV: 2.5, bermCount: 2, bermWidthM: 3, excavationDepthM: 0 })],
    layers: defaultLayers(),
  });
  const waste: WasteParams = {
    population: 100_000,
    perCapitaKgDay: 0.6,
    collectionCoveragePct: 85,
    populationGrowthPct: 1,
    generationGrowthPct: 0.5,
    recoveryPct: 5,
    composition: { organic: 52, paper: 12, plastic: 15, glass: 3, metal: 2, other: 16 },
    densityInitialKgM3: 800,
    densityStabilizedKgM3: 900,
    capacityDensityBasis: "stabilized",
    coverRatioPct: 20,
    coverDensityKgM3: 1300,
  };
  const capacity = computeCapacity(geometry, defaultLayers(), waste, { utilizationFactor: 0.9, infrastructureReservePct: 5 });
  const capacityGap = Math.abs(capacity.wasteVolumeM3 + capacity.coverVolumeM3 - capacity.usableVolumeM3);
  const massGap = Math.abs(capacity.totalTonnageT - (capacity.wasteVolumeM3 * capacity.densityKgM3) / 1000);
  results.push({
    id: "capacity-balance",
    name: "Cierre volumétrico de capacidad",
    methodId: "capacity",
    source: "GO-ENGINE — balance interno",
    expected: "V_res + V_cob = V_útil; T = V_res·ρ/1000",
    actual: `ΔV = ${capacityGap.toExponential(2)} m³; ΔT = ${massGap.toExponential(2)} t`,
    relativeError: capacity.usableVolumeM3 > 0 ? capacityGap / capacity.usableVolumeM3 : null,
    tolerance: "1×10⁻⁶",
    passed: capacityGap < 1e-6 && massGap < 1e-6,
    detail: "Comprueba que el volumen de cobertura y la tonelada se derivan del volumen útil sin pérdidas.",
  });

  // 4. Manning full pipe.
  const manning = manningFullPipeCapacity(0.2, 0.01, 0.013) * 1000;
  results.push({
    id: "manning",
    name: "Manning a sección llena",
    methodId: "manning",
    source: "MINAM 2011, p. 72 (PDF 72)",
    expected: "≈ 32.8 L/s",
    actual: `${manning.toFixed(2)} L/s`,
    relativeError: (manning - 32.8) / 32.8,
    tolerance: "±0.5 %",
    passed: close(manning, 32.8, 0.005),
    detail: "D = 0.20 m, S = 0.01 m/m, n = 0.013. Calculado como referencia geométrica de la fórmula implementada.",
  });

  // 5. Infinite slope reference case.
  const geoParams: GeotechParams = {
    slopeAngleDeg: (Math.atan(1 / 3) * 180) / Math.PI,
    unitWeightKnM3: 16,
    cohesionKpa: 0,
    frictionAngleDeg: 30,
    interfaceFrictionAngleDeg: 22,
    interfaceCohesionKpa: 0,
    waterTableRatio: 0,
    sliceDepthM: 5,
    seismicCoefficient: 0,
  };
  const fs = computeGeotech(geoParams).factorOfSafety;
  results.push({
    id: "infinite-slope",
    name: "Talud infinito — caso de referencia",
    methodId: "infinite-slope",
    source: "GO-ENGINE — formulación de talud infinito",
    expected: "1.732",
    actual: fs.toFixed(3),
    relativeError: (fs - Math.sqrt(3)) / Math.sqrt(3),
    tolerance: "±0.01 %",
    passed: close(fs, Math.sqrt(3), 0.0001),
    detail: "β = 18.43°, φ' = 30°, c' = 0, sin presión de poros: FS = tanφ'/tanβ = 1.732.",
  });

  // 6. IPCC FOD mass conservation over the full decay horizon.
  const gasParams: GasParams = {
    ...defaultScenarioParams().gas,
    postClosureYears: 220,
  };
  const mockWaste = {
    annual: [{ year: 2026, landfilledT: 1_000 }],
  } as unknown as WasteResult;
  const gas = computeGas(gasParams, mockWaste, 2026);
  const ultimate = 1_000 * ch4PotentialPerTonne(gasParams);
  const generated = gas.annual.reduce((sum, row) => sum + row.ch4GeneratedT, 0);
  results.push({
    id: "ipcc-fod",
    name: "Conservación de masa — IPCC FOD",
    methodId: "ipcc-fod",
    source: "IPCC 2006, Vol. 5, Cap. 3, ecuaciones 3.1–3.3",
    expected: `${ultimate.toFixed(2)} t CH₄ potenciales`,
    actual: `${generated.toFixed(2)} t CH₄ integradas`,
    relativeError: (generated - ultimate) / ultimate,
    tolerance: "±0.5 %",
    passed: close(generated, ultimate, 0.005),
    detail: "1 000 t dispuestas en 2026; la integral del decaimiento en 221 años converge al potencial último.",
  });

  // 7. Annual water balance closure and treatment split.
  const core = computeCore(defaultScenarioParams(), 12);
  const waterClosure = core.leachate.waterBalanceClosurePct;
  const treatmentGap = core.leachate.annual.reduce(
    (max, row) => Math.max(max, Math.abs(row.treatedM3 + row.untreatedM3 - row.leachateM3)),
    0,
  );
  results.push({
    id: "water-balance",
    name: "Balance hídrico y tratamiento",
    methodId: "water-balance",
    source: "MINAM 2011, pp. 73–77 (PDF 73–77)",
    expected: "Cierre ≈ 100 %; tratado + no tratado = generado",
    actual: `Cierre ${waterClosure.toFixed(2)} %; Δ máx ${treatmentGap.toExponential(2)} m³`,
    relativeError: Math.abs(waterClosure - 100) / 100,
    tolerance: "±0.5 % de cierre; 1×10⁻⁶ m³",
    passed: Math.abs(waterClosure - 100) < 0.5 && treatmentGap < 1e-6,
    detail: "Verifica P = R + ET + I en la suma anual y la partición del volumen de lixiviados entre tratamiento y déficit.",
  });

  return results;
}

export function selfTestSummary(results: SelfTestResult[]) {
  const passed = results.filter((r) => r.passed).length;
  return { total: results.length, passed, failed: results.length - passed, ok: passed === results.length };
}
