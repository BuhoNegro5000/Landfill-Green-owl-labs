import type { ScenarioParams } from "@/lib/types";
import { computeCore } from "./model";

export interface SensitivityMetrics {
  lifeYears: number;
  totalLeachateM3: number;
  totalCh4T: number;
  storageM3: number;
}

export interface SensitivityRow {
  id: string;
  label: string;
  parameter: string;
  lowLabel: string;
  highLabel: string;
  low: SensitivityMetrics;
  high: SensitivityMetrics;
  deltaPct: {
    lifeYears: number;
    totalLeachateM3: number;
    totalCh4T: number;
    storageM3: number;
  };
  maxImpactPct: number;
}

export interface SensitivityResult {
  base: SensitivityMetrics;
  rows: SensitivityRow[];
  method: string;
  notes: string[];
}

function metrics(params: ScenarioParams, horizon: number): SensitivityMetrics {
  const core = computeCore(params, horizon);
  return {
    lifeYears: core.waste.operatingYears,
    totalLeachateM3: core.leachate.totalLeachateM3,
    totalCh4T: core.gas.totalCh4GeneratedT,
    storageM3: core.leachate.recommendedStorageM3,
  };
}

function pctDelta(value: number, base: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return 0;
  return ((value - base) / base) * 100;
}

interface Variant {
  id: string;
  label: string;
  parameter: string;
  lowLabel: string;
  highLabel: string;
  /** Multiplier applied to the base value for the low case (default 0.8). */
  lowFactor?: number;
  /** Multiplier applied to the base value for the high case (default 1.2). */
  highFactor?: number;
  apply: (p: ScenarioParams, multiplier: number) => void;
}

const VARIANTS: Variant[] = [
  {
    id: "population",
    label: "Población servida",
    parameter: "waste.population",
    lowLabel: "−20 %",
    highLabel: "+20 %",
    apply: (p, m) => {
      p.waste.population *= m;
    },
  },
  {
    id: "perCapita",
    label: "Generación per cápita",
    parameter: "waste.perCapitaKgDay",
    lowLabel: "−20 %",
    highLabel: "+20 %",
    apply: (p, m) => {
      p.waste.perCapitaKgDay *= m;
    },
  },
  {
    id: "density",
    label: "Densidad de diseño",
    parameter: "waste.density",
    lowLabel: "−15 %",
    highLabel: "+15 %",
    lowFactor: 0.85,
    highFactor: 1.15,
    apply: (p, m) => {
      p.waste.densityInitialKgM3 *= m;
      p.waste.densityStabilizedKgM3 *= m;
    },
  },
  {
    id: "recovery",
    label: "Tasa de recuperación",
    parameter: "waste.recoveryPct",
    lowLabel: "−20 % rel.",
    highLabel: "+20 % rel.",
    apply: (p, m) => {
      p.waste.recoveryPct = Math.min(100, Math.max(0, p.waste.recoveryPct * m));
    },
  },
  {
    id: "rainfall",
    label: "Precipitación anual",
    parameter: "site.rainfallMmYr",
    lowLabel: "−25 %",
    highLabel: "+25 %",
    lowFactor: 0.75,
    highFactor: 1.25,
    apply: (p, m) => {
      p.site.rainfallMmYr *= m;
      p.site.maxMonthlyRainfallMm *= m;
      p.site.maxDailyRainfallMm *= m;
    },
  },
  {
    id: "utilization",
    label: "Factor de utilización",
    parameter: "geometry.utilizationFactor",
    lowLabel: "−0.10 abs.",
    highLabel: "+0.10 abs.",
    apply: (p, m) => {
      const delta = m > 1 ? 0.1 : -0.1;
      p.geometry.utilizationFactor = Math.min(1, Math.max(0.3, p.geometry.utilizationFactor + delta));
    },
  },
  {
    id: "doc",
    label: "Carbono orgánico degradable (DOC)",
    parameter: "gas.doc",
    lowLabel: "−25 %",
    highLabel: "+25 %",
    lowFactor: 0.75,
    highFactor: 1.25,
    apply: (p, m) => {
      p.gas.doc *= m;
    },
  },
  {
    id: "k",
    label: "Constante de decaimiento k",
    parameter: "gas.k",
    lowLabel: "−50 %",
    highLabel: "+50 %",
    lowFactor: 0.5,
    highFactor: 1.5,
    apply: (p, m) => {
      p.gas.k *= m;
    },
  },
  {
    id: "moisture",
    label: "Humedad de ingreso",
    parameter: "leachate.incomingMoisturePct",
    lowLabel: "−15 % rel.",
    highLabel: "+15 % rel.",
    lowFactor: 0.85,
    highFactor: 1.15,
    apply: (p, m) => {
      p.leachate.incomingMoisturePct = Math.min(90, p.leachate.incomingMoisturePct * m);
    },
  },
];

/**
 * One-at-a-time (OAT) sensitivity. Each parameter is perturbed independently
 * while all others remain at their base value. Not a probabilistic analysis.
 */
export function computeSensitivity(params: ScenarioParams, horizonYears: number): SensitivityResult {
  const base = metrics(structuredClone(params), horizonYears);
  const rows: SensitivityRow[] = VARIANTS.map((variant) => {
    const lowParams = structuredClone(params);
    const highParams = structuredClone(params);
    variant.apply(lowParams, variant.lowFactor ?? 0.8);
    variant.apply(highParams, variant.highFactor ?? 1.2);
    const low = metrics(lowParams, horizonYears);
    const high = metrics(highParams, horizonYears);
    const deltaPct = {
      lifeYears: pctDelta(low.lifeYears, base.lifeYears),
      totalLeachateM3: pctDelta(low.totalLeachateM3, base.totalLeachateM3),
      totalCh4T: pctDelta(low.totalCh4T, base.totalCh4T),
      storageM3: pctDelta(low.storageM3, base.storageM3),
    };
    const highDelta = {
      lifeYears: pctDelta(high.lifeYears, base.lifeYears),
      totalLeachateM3: pctDelta(high.totalLeachateM3, base.totalLeachateM3),
      totalCh4T: pctDelta(high.totalCh4T, base.totalCh4T),
      storageM3: pctDelta(high.storageM3, base.storageM3),
    };
    const maxImpactPct = Math.max(
      ...[...Object.values(deltaPct), ...Object.values(highDelta)].map((v) => Math.abs(v)),
    );
    return {
      id: variant.id,
      label: variant.label,
      parameter: variant.parameter,
      lowLabel: variant.lowLabel,
      highLabel: variant.highLabel,
      low,
      high,
      deltaPct,
      maxImpactPct,
    };
  }).sort((a, b) => b.maxImpactPct - a.maxImpactPct);

  return {
    base,
    rows,
    method: "Análisis de sensibilidad uno a la vez (OAT)",
    notes: [
      "Cada variable se modifica de forma independiente; el resto permanece en el escenario base.",
      "Los porcentajes de cambio se calculan respecto del resultado base del escenario activo.",
      "No sustituye un análisis probabilístico ni cuantifica correlaciones entre variables.",
      "El signo del cambio se muestra en la tabla; el gráfico tornado usa el valor absoluto.",
    ],
  };
}

export interface MonteCarloResult {
  iterations: number;
  seed: number;
  metrics: {
    lifeYears: { p10: number; p50: number; p90: number; mean: number };
    totalLeachateM3: { p10: number; p50: number; p90: number; mean: number };
    totalCh4T: { p10: number; p50: number; p90: number; mean: number };
  };
  assumptions: string[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number, mean: number, sd: number): number {
  const u = Math.max(rand(), 1e-9);
  const v = Math.max(rand(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Monte Carlo with truncated normal distributions. Only the five variables with
 * explicit coefficients of variation are sampled; distributions are documented
 * assumptions, not site measurements.
 */
export function runMonteCarlo(
  params: ScenarioParams,
  horizonYears: number,
  iterations = 200,
  seed = 20260101,
): MonteCarloResult {
  const rand = mulberry32(seed);
  const life: number[] = [];
  const leachate: number[] = [];
  const ch4: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const p = structuredClone(params);
    p.waste.population = Math.max(1, normal(rand, p.waste.population, p.waste.population * 0.08));
    p.waste.perCapitaKgDay = Math.max(0.05, normal(rand, p.waste.perCapitaKgDay, p.waste.perCapitaKgDay * 0.1));
    p.site.rainfallMmYr = Math.max(0, normal(rand, p.site.rainfallMmYr, p.site.rainfallMmYr * 0.15));
    p.gas.doc = Math.min(0.5, Math.max(0.01, normal(rand, p.gas.doc, p.gas.doc * 0.12)));
    p.gas.k = Math.min(0.5, Math.max(0.005, normal(rand, p.gas.k, p.gas.k * 0.2)));
    const core = computeCore(p, horizonYears);
    life.push(core.waste.operatingYears);
    leachate.push(core.leachate.totalLeachateM3);
    ch4.push(core.gas.totalCh4GeneratedT);
  }

  const summarize = (values: number[]) => ({
    p10: percentile(values, 10),
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    mean: values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1),
  });

  return {
    iterations,
    seed,
    metrics: {
      lifeYears: summarize(life),
      totalLeachateM3: summarize(leachate),
      totalCh4T: summarize(ch4),
    },
    assumptions: [
      "Distribución normal truncada para población (CV 8 %), per cápita (CV 10 %), precipitación (CV 15 %), DOC (CV 12 %) y k (CV 20 %).",
      "Muestreo independiente entre variables; no se modelan correlaciones.",
      "Semilla fija para reproducibilidad; los percentiles dependen del número de iteraciones.",
      "Las distribuciones son supuestos del usuario, no inferencia estadística de datos de campo.",
    ],
  };
}
