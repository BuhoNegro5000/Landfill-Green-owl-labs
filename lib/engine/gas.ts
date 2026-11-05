import type { GasParams } from "@/lib/types";
import type { WasteResult } from "./waste";

export interface GasAnnualRow {
  year: number;
  phase: "operacion" | "clausura";
  wastePlacedT: number;
  ch4GeneratedT: number;
  ch4GeneratedM3: number;
  biogasM3: number;
  capturedM3: number;
  oxidizedM3: number;
  emittedM3: number;
  flaredM3: number;
  energyMWh: number;
  captureEfficiencyPct: number;
}

export interface GasResult {
  annual: GasAnnualRow[];
  totalCh4GeneratedT: number;
  totalBiogasM3: number;
  totalCapturedM3: number;
  totalEmittedM3: number;
  totalEnergyMWh: number;
  ultimateCh4PotentialT: number;
  peakYear: number | null;
  peakFlowNm3H: number;
  averageCapturePct: number;
  densityKgM3: number;
  assumptions: string[];
}

/** Methane density from the ideal gas law at the reference conditions. */
export function methaneDensity(referenceTemperatureC: number, pressurePa = 101325): number {
  const M = 0.016042; // kg/mol
  const R = 8.314462618;
  return (pressurePa * M) / (R * (273.15 + referenceTemperatureC));
}

/** IPCC first-order decay potential for one tonne of waste (t CH4 / t waste). */
export function ch4PotentialPerTonne(params: Pick<GasParams, "doc" | "docf" | "mcf" | "f">): number {
  return params.doc * params.docf * params.mcf * params.f * (16 / 12);
}

export function computeGas(
  params: GasParams,
  waste: WasteResult,
  closureYear: number | null,
): GasResult {
  const density = methaneDensity(params.referenceTemperatureC);
  const potential = ch4PotentialPerTonne(params);
  const placements = waste.annual.map((r) => ({ year: r.year, massT: r.landfilledT }));
  const lastPlacement = placements.length ? placements[placements.length - 1].year : waste.annual[0]?.year ?? 0;
  const firstYear = placements.length ? placements[0].year : 0;
  const endYear = Math.max(lastPlacement, closureYear ?? lastPlacement) + Math.max(params.postClosureYears, 0);
  const years: number[] = [];
  for (let y = firstYear; y <= endYear; y++) years.push(y);

  const rows: GasAnnualRow[] = years.map((year) => {
    let ch4T = 0;
    for (const p of placements) {
      if (p.year > year) continue;
      const age = year - p.year;
      const decayed = p.massT * potential * (1 - Math.exp(-params.k)) * Math.exp(-params.k * age);
      ch4T += decayed;
    }
    const ch4M3 = (ch4T * 1000) / density;
    const biogasM3 = params.ch4Fraction > 0 ? ch4M3 / params.ch4Fraction : 0;
    const inClosure = closureYear !== null && year >= closureYear;
    const efficiency = inClosure ? params.closureCaptureEfficiencyPct : params.collectionEfficiencyPct;
    const captured = ch4M3 * (efficiency / 100);
    const oxidized = Math.max(0, ch4M3 - captured) * (params.oxidationPct / 100);
    const emitted = Math.max(0, ch4M3 - captured - oxidized);
    const flared = captured * (params.flareEfficiencyPct / 100);
    const energy = (captured * params.lhvMjNm3 * (params.energyEfficiencyPct / 100)) / 3600;
    return {
      year,
      phase: inClosure ? "clausura" : "operacion",
      wastePlacedT: placements.find((p) => p.year === year)?.massT ?? 0,
      ch4GeneratedT: ch4T,
      ch4GeneratedM3: ch4M3,
      biogasM3,
      capturedM3: captured,
      oxidizedM3: oxidized,
      emittedM3: emitted,
      flaredM3: flared,
      energyMWh: energy,
      captureEfficiencyPct: efficiency,
    };
  });

  const totalCh4T = rows.reduce((s, r) => s + r.ch4GeneratedT, 0);
  const totalCaptured = rows.reduce((s, r) => s + r.capturedM3, 0);
  const totalEmitted = rows.reduce((s, r) => s + r.emittedM3, 0);
  const totalEnergy = rows.reduce((s, r) => s + r.energyMWh, 0);
  const totalBiogas = rows.reduce((s, r) => s + r.biogasM3, 0);
  const ultimate = placements.reduce((s, p) => s + p.massT * potential, 0);
  let peak: GasAnnualRow | null = null;
  for (const r of rows) if (!peak || r.ch4GeneratedM3 > peak.ch4GeneratedM3) peak = r;
  const totalGeneratedM3 = rows.reduce((s, r) => s + r.ch4GeneratedM3, 0);

  return {
    annual: rows,
    totalCh4GeneratedT: totalCh4T,
    totalBiogasM3: totalBiogas,
    totalCapturedM3: totalCaptured,
    totalEmittedM3: totalEmitted,
    totalEnergyMWh: totalEnergy,
    ultimateCh4PotentialT: ultimate,
    peakYear: peak && peak.ch4GeneratedM3 > 0 ? peak.year : null,
    peakFlowNm3H: peak ? peak.ch4GeneratedM3 / (365 * 24) : 0,
    averageCapturePct: totalGeneratedM3 > 0 ? (totalCaptured / totalGeneratedM3) * 100 : 0,
    densityKgM3: density,
    assumptions: [
      "Modelo de descomposición de primer orden (FOD) del IPCC: DDOCm = W · DOC · DOCf · MCF · F.",
      "CH4 generado = Σ DDOCm × (1 − e^(−k)) × e^(−k·(t−x)) × 16/12.",
      "El metano se convierte a volumen con la ecuación de gases ideales en las condiciones de referencia declaradas.",
      `Densidad de CH4 a ${params.referenceTemperatureC} °C y 1 atm: ${density.toFixed(4)} kg/m³.`,
      `Biogás = CH4 / ${(params.ch4Fraction * 100).toFixed(1)} % de fracción de metano.`,
      `Eficiencia de captación: ${params.collectionEfficiencyPct} % en operación y ${params.closureCaptureEfficiencyPct} % en clausura.`,
      "La oxidación en cobertura se aplica solo al metano no capturado; la eficiencia de antorcha se aplica al gas capturado.",
      "No se incluye producción de gas de celdas sin residuos, ni migración lateral, ni variaciones estacionales.",
      "El diseño definitivo de pozos, colectores y antorchas requiere pruebas de campo y balance de aire.",
    ],
  };
}
