import type { GeotechParams } from "@/lib/types";

export type StabilityBand = "inestable" | "revisar" | "marginal" | "aceptable";

export interface StabilityCase {
  id: string;
  name: string;
  description: string;
  cohesionKpa: number;
  frictionAngleDeg: number;
  waterTableRatio: number;
  factorOfSafety: number;
  band: StabilityBand;
}

export interface GeotechResult {
  slopeAngleDeg: number;
  factorOfSafety: number;
  band: StabilityBand;
  drivingStressKpa: number;
  resistingStressKpa: number;
  porePressureKpa: number;
  cases: StabilityCase[];
  verticalStressKpa: number;
  notes: string[];
  designWarning: string;
}

function fsInfiniteSlope(
  cKpa: number,
  phiDeg: number,
  gammaKnM3: number,
  zM: number,
  betaDeg: number,
  waterRatio: number,
): { fs: number; driving: number; resisting: number; pore: number } {
  const beta = (betaDeg * Math.PI) / 180;
  const phi = (phiDeg * Math.PI) / 180;
  const gammaW = 9.81;
  const sigma = gammaKnM3 * zM * Math.cos(beta) ** 2;
  const tau = gammaKnM3 * zM * Math.sin(beta) * Math.cos(beta);
  const pore = gammaW * waterRatio * zM * Math.cos(beta) ** 2;
  const resisting = cKpa + Math.max(0, sigma - pore) * Math.tan(phi);
  const fs = tau > 0 ? resisting / tau : Infinity;
  return { fs, driving: tau, resisting, pore };
}

function bandFor(fs: number): StabilityBand {
  if (fs < 1.0) return "inestable";
  if (fs < 1.3) return "revisar";
  if (fs < 1.5) return "marginal";
  return "aceptable";
}

/**
 * Infinite-slope translational stability along a potential slip plane parallel
 * to the slope face. Covers shallow translational mechanisms only.
 * FS = [c' + (σ − u)·tanφ'] / τ, with σ = γ·z·cos²β and τ = γ·z·sinβ·cosβ.
 */
export function computeGeotech(params: GeotechParams): GeotechResult {
  const base = fsInfiniteSlope(
    params.cohesionKpa,
    params.frictionAngleDeg,
    params.unitWeightKnM3,
    params.sliceDepthM,
    params.slopeAngleDeg,
    params.waterTableRatio,
  );
  const interfaceCase = fsInfiniteSlope(
    params.interfaceCohesionKpa,
    params.interfaceFrictionAngleDeg,
    params.unitWeightKnM3,
    params.sliceDepthM,
    params.slopeAngleDeg,
    params.waterTableRatio,
  );
  const dryCase = fsInfiniteSlope(
    params.cohesionKpa,
    params.frictionAngleDeg,
    params.unitWeightKnM3,
    params.sliceDepthM,
    params.slopeAngleDeg,
    0,
  );
  const saturatedCase = fsInfiniteSlope(
    params.cohesionKpa,
    params.frictionAngleDeg,
    params.unitWeightKnM3,
    params.sliceDepthM,
    params.slopeAngleDeg,
    1,
  );

  return {
    slopeAngleDeg: params.slopeAngleDeg,
    factorOfSafety: base.fs,
    band: bandFor(base.fs),
    drivingStressKpa: base.driving,
    resistingStressKpa: base.resisting,
    porePressureKpa: base.pore,
    verticalStressKpa: params.unitWeightKnM3 * params.sliceDepthM,
    cases: [
      {
        id: "base",
        name: "Condición base",
        description: "Nivel freático según parámetro del proyecto.",
        cohesionKpa: params.cohesionKpa,
        frictionAngleDeg: params.frictionAngleDeg,
        waterTableRatio: params.waterTableRatio,
        factorOfSafety: base.fs,
        band: bandFor(base.fs),
      },
      {
        id: "interfaz",
        name: "Interfaz geosintética",
        description: "Resistencia de interfaz geomembrana–geotextil o suelo–geomembrana.",
        cohesionKpa: params.interfaceCohesionKpa,
        frictionAngleDeg: params.interfaceFrictionAngleDeg,
        waterTableRatio: params.waterTableRatio,
        factorOfSafety: interfaceCase.fs,
        band: bandFor(interfaceCase.fs),
      },
      {
        id: "seco",
        name: "Sin saturación",
        description: "Escenario de verificación sin presión de poros.",
        cohesionKpa: params.cohesionKpa,
        frictionAngleDeg: params.frictionAngleDeg,
        waterTableRatio: 0,
        factorOfSafety: dryCase.fs,
        band: bandFor(dryCase.fs),
      },
      {
        id: "saturado",
        name: "Saturación total",
        description: "Escenario conservador con nivel freático en la superficie.",
        cohesionKpa: params.cohesionKpa,
        frictionAngleDeg: params.frictionAngleDeg,
        waterTableRatio: 1,
        factorOfSafety: saturatedCase.fs,
        band: bandFor(saturatedCase.fs),
      },
    ],
    notes: [
      "Método de talud infinito para mecanismos traslacionales superficiales paralelos al talud.",
      "FS = [c' + (γ·z·cos²β − u)·tanφ'] / (γ·z·sinβ·cosβ), con u = γw·m·z·cos²β.",
      "No analiza fallas circulares, cuñas profundas, capacidad de soporte, licuación ni estabilidad global del macizo.",
      "El coeficiente sísmico se registra como dato del emplazamiento; el cálculo pseudo-estático no está implementado.",
      "Los umbrales de FS son criterios de referencia para revisión, no límites normativos.",
      "La verificación definitiva requiere campaña geotécnica, ensayos de interfaz y software especializado.",
    ],
    designWarning:
      "Resultado conceptual. No sustituye un análisis de estabilidad global ni un estudio geotécnico firmado por profesional habilitado.",
  };
}

export function renderSlopeSvgPath(params: GeotechParams): { x1: number; y1: number; x2: number; y2: number } {
  const beta = (params.slopeAngleDeg * Math.PI) / 180;
  return { x1: 20, y1: 120, x2: 20 + 100 * Math.cos(beta), y2: 120 - 100 * Math.sin(beta) };
}
