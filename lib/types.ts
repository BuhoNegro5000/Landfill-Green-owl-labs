import { z } from "zod";

export const unitSystemSchema = z.enum(["SI", "IMPERIAL_DISPLAY"]);
export const facilityTypeSchema = z.enum([
  "relleno-sanitario",
  "relleno-mecanizado",
  "celda-transitoria",
  "planta-integral",
]);

export const layerCategorySchema = z.enum([
  "subgrade",
  "clay",
  "geomembrane",
  "geotextile",
  "drainage",
  "protection",
  "waste",
  "daily-cover",
  "intermediate-cover",
  "final-cover",
  "vegetation",
]);

export const METHOD_IDS = [
  "prismoid",
  "slice-integration",
  "waste-balance",
  "ipcc-fod",
  "water-balance",
  "manning",
  "infinite-slope",
  "sensitivity-oat",
] as const;

export type UnitSystem = z.infer<typeof unitSystemSchema>;
export type FacilityType = z.infer<typeof facilityTypeSchema>;
export type LayerCategory = z.infer<typeof layerCategorySchema>;
export type MethodId = (typeof METHOD_IDS)[number];

export type CellMethod = "trench" | "area" | "ramp";
export type CellShape = "excavated" | "mound";
export type DataQuality = "measured" | "estimated" | "assumed" | "missing";

export interface Composition {
  organic: number;
  paper: number;
  plastic: number;
  glass: number;
  metal: number;
  other: number;
}

export interface Layer {
  id: string;
  name: string;
  category: LayerCategory;
  thicknessMm: number;
  material: string;
  function: string;
  permeabilityMs?: number;
  notes: string;
  reference: string;
  enabled: boolean;
}

export interface CellConfig {
  id: string;
  name: string;
  method: CellMethod;
  shape: CellShape;
  bottomLengthM: number;
  bottomWidthM: number;
  heightM: number;
  slopeHtoV: number;
  excavationDepthM: number;
  baseElevationM: number;
  bermCount: number;
  bermWidthM: number;
  sequenceOrder: number;
  notes: string;
}

/**
 * Criterios de localización de la R.M. N.° 165-2021-MINAM (anexo) y del
 * artículo 110 del D.S. 014-2017-MINAM. Los campos son opcionales para no
 * romper proyectos guardados antes de incorporar la verificación de sitio.
 */
export interface SiteExclusions {
  floodOrMassMovement?: boolean;
  protectedArea?: boolean;
  wetlandOrAquiferRecharge?: boolean;
  riverMarginalStrip?: boolean;
  marineCoastalStrip?: boolean;
  culturalHeritage?: boolean;
  miningOrPetroleumConcession?: boolean;
  forestConcession?: boolean;
  campesinoOrNativeCommunity?: boolean;
}

export interface SiteSelectionData {
  distanceToPopulationM?: number | null;
  distanceToInfrastructureM?: number | null;
  distanceToAgricultureM?: number | null;
  distanceToFarmsM?: number | null;
  distanceToFaultsM?: number | null;
  distanceToAirportM?: number | null;
  slopePct?: number | null;
  exclusions?: SiteExclusions;
}

export interface SiteData {
  country: string;
  region: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  elevationMasl: number;
  facilityType: FacilityType;
  areaHa: number;
  landUse: string;
  distanceToWaterM: number;
  siteSelection?: SiteSelectionData;
  geology: string;
  hydrogeology: string;
  waterTableDepthM: number;
  permeabilityMs: number;
  rainfallMmYr: number;
  maxMonthlyRainfallMm: number;
  maxDailyRainfallMm: number;
  evapotranspirationMmYr: number;
  runoffCoefficient: number;
  seismicPga: number;
  coverMaterialSource: string;
  coverMaterialAvailableM3: number;
  access: string;
  sensitiveAreas: string;
  risks: string;
  dataQuality: Record<string, DataQuality>;
}

export interface WasteParams {
  population: number;
  perCapitaKgDay: number;
  collectionCoveragePct: number;
  populationGrowthPct: number;
  generationGrowthPct: number;
  recoveryPct: number;
  composition: Composition;
  densityInitialKgM3: number;
  densityStabilizedKgM3: number;
  capacityDensityBasis: "initial" | "stabilized";
  coverRatioPct: number;
  coverDensityKgM3: number;
}

export interface GeometryParams {
  method: CellMethod;
  terrainBaseElevationM: number;
  footprintAreaM2: number;
  utilizationFactor: number;
  infrastructureReservePct: number;
  cells: CellConfig[];
  layers: Layer[];
}

export interface LeachateParams {
  exposedAreaMode: "operation" | "manual";
  manualExposedAreaM2: number;
  initialMoisturePct: number;
  incomingMoisturePct: number;
  fieldCapacityPct: number;
  coverInfiltrationFactor: number;
  closedAreaFraction: number;
  storageRetentionDays: number;
  swissK: number;
  pipeDiameterMm: number;
  pipeSlopePct: number;
  pipeManningN: number;
  treatmentCapacityM3Day: number;
  linerPermeabilityMs: number;
}

export interface GasParams {
  doc: number;
  docf: number;
  mcf: number;
  f: number;
  k: number;
  ch4Fraction: number;
  collectionEfficiencyPct: number;
  closureCaptureEfficiencyPct: number;
  oxidationPct: number;
  flareEfficiencyPct: number;
  energyEfficiencyPct: number;
  lhvMjNm3: number;
  referenceTemperatureC: number;
  postClosureYears: number;
  wellCount: number;
  wellDepthM: number;
  wellSpacingM: number;
}

export interface GeotechParams {
  slopeAngleDeg: number;
  unitWeightKnM3: number;
  cohesionKpa: number;
  frictionAngleDeg: number;
  interfaceFrictionAngleDeg: number;
  interfaceCohesionKpa: number;
  waterTableRatio: number;
  sliceDepthM: number;
  seismicCoefficient: number;
}

export interface OperationParams {
  startYear: number;
  workingFaceAreaM2: number;
  dailyCoverThicknessMm: number;
  compactionPasses: number;
  activeCellsPerYear: number;
  sequenceMode: "manual" | "sequential";
}

export interface ClosureLayer {
  id: string;
  name: string;
  thicknessMm: number;
  material: string;
  function: string;
  enabled: boolean;
}

export interface ClosureTask {
  id: string;
  name: string;
  startMonth: number;
  durationMonths: number;
  responsible: string;
  category: "cierre" | "posclausura";
  done: boolean;
}

export interface MonitoringPoint {
  id: string;
  name: string;
  type: "lixiviados" | "aguas-subterraneas" | "aguas-superficiales" | "biogas" | "asentamiento" | "drenaje";
  frequency: string;
  parameters: string;
  responsible: string;
  lastValue: string;
  referenceLimit: string;
  status: "ok" | "alerta" | "sin-datos";
}

export interface ClosureParams {
  finalCoverLayers: ClosureLayer[];
  tasks: ClosureTask[];
  monitoringPoints: MonitoringPoint[];
  postClosureYears: number;
  earlyClosureYear: number | null;
  revegetation: string;
  settlementAllowancePct: number;
}

export interface CostParams {
  capexUsd: number;
  opexUsdPerTonne: number;
  leachateTreatmentUsdPerM3: number;
  gasRevenueUsdPerMwh: number;
  discountRatePct: number;
}

export interface ScenarioParams {
  site: SiteData;
  waste: WasteParams;
  geometry: GeometryParams;
  leachate: LeachateParams;
  gas: GasParams;
  geotech: GeotechParams;
  operation: OperationParams;
  closure: ClosureParams;
  costs: CostParams;
}

export type ScenarioKind =
  | "base"
  | "conservador"
  | "generacion-elevada"
  | "mayor-recuperacion"
  | "precipitaciones"
  | "optimizacion-capacidad"
  | "clausura-anticipada"
  | "personalizado";

export interface Scenario {
  id: string;
  name: string;
  kind: ScenarioKind;
  description: string;
  isBase: boolean;
  color: string;
  params: ScenarioParams;
}

export interface Project {
  id: string;
  name: string;
  descriptor?: string;
  country: string;
  region: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  unitSystem: UnitSystem;
  regulationRef: string;
  responsible: string;
  notes: string;
  version: string;
  isDemo: boolean;
  archived: boolean;
  horizonYears: number;
  createdAt: string;
  updatedAt: string;
  scenarios: Scenario[];
  tags: string[];
}

export interface RawDocument {
  id: string;
  title: string;
  kind: "norma" | "guia" | "metodo" | "otro";
  number: string;
  date: string;
  issuer: string;
  article: string;
  sourceUrl: string;
  accessedAt: string;
  status: "vigente-verificado" | "pendiente-verificacion" | "referencia-historica";
  applicability: string;
  classification: "requisito-legal" | "recomendacion-tecnica" | "parametro-configurable" | "supuesto-modelo";
  notes: string;
}

export const projectMetaSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(90),
  country: z.string().min(2),
  region: z.string().min(1, "Indique la región"),
  location: z.string().min(3, "Indique la ubicación del emplazamiento"),
  unitSystem: unitSystemSchema,
  regulationRef: z.string().min(2),
  responsible: z.string().min(3, "Indique el responsable técnico"),
  notes: z.string().max(2000),
  version: z.string().min(1),
});

export const compositionSchema = z
  .object({
    organic: z.number().min(0).max(100),
    paper: z.number().min(0).max(100),
    plastic: z.number().min(0).max(100),
    glass: z.number().min(0).max(100),
    metal: z.number().min(0).max(100),
    other: z.number().min(0).max(100),
  })
  .refine(
    (c) => Math.abs(c.organic + c.paper + c.plastic + c.glass + c.metal + c.other - 100) < 0.5,
    { message: "La composición debe sumar 100 % (±0.5)" },
  );

export const cellSchema = z.object({
  name: z.string().min(1).max(24),
  bottomLengthM: z.number().gt(0).max(2000),
  bottomWidthM: z.number().gt(0).max(2000),
  heightM: z.number().gt(0).max(200),
  slopeHtoV: z.number().min(0.25).max(6),
  excavationDepthM: z.number().min(0),
  baseElevationM: z.number().min(-500).max(6000),
  bermCount: z.number().int().min(0).max(20),
  bermWidthM: z.number().min(0).max(30),
});

export function validateComposition(c: Composition): string | null {
  const sum = c.organic + c.paper + c.plastic + c.glass + c.metal + c.other;
  return Math.abs(sum - 100) < 0.5 ? null : `La composición suma ${sum.toFixed(1)} %; debe sumar 100 %.`;
}
