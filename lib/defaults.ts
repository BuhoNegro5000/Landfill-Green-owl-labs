import type {
  CellConfig,
  ClosureLayer,
  ClosureTask,
  Layer,
  MonitoringPoint,
  Project,
  Scenario,
  ScenarioKind,
  ScenarioParams,
  SiteData,
} from "@/lib/types";
import { uid } from "@/lib/uid";

export const BRAND = {
  company: "Green Owl Labs",
  product: "Green Owl Landfill 3D",
  descriptor: "Laboratorio de Diseño y Simulación de Rellenos Sanitarios",
  version: "1.0.0",
  engine: "GO-ENGINE 1.0.0",
};

export const DEFAULT_COMPOSITION = {
  organic: 52,
  paper: 12,
  plastic: 15,
  glass: 3,
  metal: 2,
  other: 16,
};

export function defaultSite(overrides: Partial<SiteData> = {}): SiteData {
  return {
    country: "Perú",
    region: "Junín",
    location: "Sector Pampa Verde (emplazamiento sintético)",
    latitude: -11.952,
    longitude: -75.248,
    elevationMasl: 3250,
    facilityType: "relleno-sanitario",
    areaHa: 20,
    landUse: "Terreno eriazo de ladera, sin viviendas en 500 m",
    distanceToWaterM: 850,
    geology: "Depósitos coluviales sobre roca volcánica fracturada; suelos areno-limosos",
    hydrogeology: "Acuífero local discontinuo, flujo hacia el noreste",
    waterTableDepthM: 22,
    permeabilityMs: 1e-7,
    rainfallMmYr: 780,
    maxMonthlyRainfallMm: 150,
    maxDailyRainfallMm: 45,
    evapotranspirationMmYr: 550,
    runoffCoefficient: 0.35,
    seismicPga: 0.15,
    coverMaterialSource: "Banco de material residual dentro del área, 6 ha",
    coverMaterialAvailableM3: 240_000,
    access: "Vía afirmada de 2.4 km desde carretera regional; dos accesos alternos",
    sensitiveAreas: "Quebrada estacional a 850 m; bosque de protección a 1.2 km",
    risks: "Lluvias intensas entre diciembre y marzo; susceptibilidad moderada a erosión",
    siteSelection: {
      distanceToPopulationM: 1_450,
      distanceToInfrastructureM: 2_800,
      distanceToAgricultureM: 960,
      distanceToFarmsM: 6_400,
      distanceToFaultsM: 4_800,
      distanceToAirportM: 16_500,
      slopePct: 12,
      exclusions: {
        floodOrMassMovement: false,
        protectedArea: false,
        wetlandOrAquiferRecharge: false,
        riverMarginalStrip: false,
        marineCoastalStrip: false,
        culturalHeritage: false,
        miningOrPetroleumConcession: false,
        forestConcession: false,
        campesinoOrNativeCommunity: false,
      },
    },
    dataQuality: {
      topography: "measured",
      geology: "measured",
      geotechnics: "measured",
      hydrogeology: "estimated",
      permeability: "measured",
      hydrology: "estimated",
      climate: "measured",
      coverMaterial: "estimated",
      access: "measured",
      landUse: "measured",
      risks: "assumed",
      social: "missing",
    },
    ...overrides,
  };
}

export function defaultLayers(): Layer[] {
  return [
    {
      id: uid("layer"),
      name: "Preparación de subrasante",
      category: "subgrade",
      thicknessMm: 300,
      material: "Suelo compactado al 95 % Proctor",
      function: "Nivelación, soporte estructural y sello inicial",
      permeabilityMs: 1e-7,
      notes: "Retirar material orgánico y regularizar pendiente hacia drenes.",
      reference: "MINAM 2011, p. 99; Honduras 2014, p. 50",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Barrera mineral compactada",
      category: "clay",
      thicknessMm: 600,
      material: "Arcilla compactada, k ≤ 1×10⁻⁹ m/s",
      function: "Barrera de baja permeabilidad y protección de la geomembrana",
      permeabilityMs: 1e-9,
      notes: "Humedad y compactación controladas; traslapes escalonados.",
      reference: "Honduras 2014, pp. 50-51",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Geomembrana HDPE 1.5 mm",
      category: "geomembrane",
      thicknessMm: 1.5,
      material: "Polietileno de alta densidad (HDPE)",
      function: "Barrera primaria de impermeabilización",
      permeabilityMs: 1e-14,
      notes: "Termosoldadura, ensayos de integridad y protección contra punzonamiento.",
      reference: "Honduras 2014, p. 51",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Geotextil de protección",
      category: "geotextile",
      thicknessMm: 2,
      material: "Geotextil no tejido 300 g/m²",
      function: "Protección mecánica y separación",
      notes: "Evita daño de geomembrana por grava y equipos.",
      reference: "MINAM 2011, p. 82",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Capa drenante de grava",
      category: "drainage",
      thicknessMm: 500,
      material: "Grava lavada 3/4\" a 1 1/2\"",
      function: "Conducción lateral de lixiviados hacia tuberías",
      permeabilityMs: 1e-2,
      notes: "Espesor de referencia 600 mm; ajustar a la red de drenaje.",
      reference: "MINAM 2011, p. 82",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Capa de protección",
      category: "protection",
      thicknessMm: 300,
      material: "Arena limosa libre de piedras",
      function: "Protección de la capa drenante y preparación de la base",
      notes: "Sin material cortopunzante; compactación moderada.",
      reference: "MINAM 2011, p. 82",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Cobertura diaria",
      category: "daily-cover",
      thicknessMm: 150,
      material: "Suelo de cobertura k ≤ 1×10⁻⁶ m/s",
      function: "Control de vectores, olores y dispersión",
      notes: "Compactar con al menos 4 pasadas al cierre de jornada.",
      reference: "Honduras 2014, p. 88; MINAM 2011, p. 64",
      enabled: true,
    },
    {
      id: uid("layer"),
      name: "Cobertura intermedia",
      category: "intermediate-cover",
      thicknessMm: 300,
      material: "Suelo compactado",
      function: "Separación de etapas y control de infiltración",
      notes: "Revisar estabilidad y drenaje antes de la siguiente etapa.",
      reference: "MINAM 2011, p. 64",
      enabled: true,
    },
  ];
}

export function makeCells(options: {
  count: number;
  bottomLength: number;
  bottomWidth: number;
  height: number;
  slope: number;
  excavationDepth: number;
  baseElevation: number;
  bermCount?: number;
  bermWidth?: number;
  shape?: CellConfig["shape"];
  method?: CellConfig["method"];
  freeboard?: number;
  rampWidth?: number;
  rampGrade?: number;
}): CellConfig[] {
  const method = options.method ?? "area";
  const shape = options.shape ?? (method === "area" ? "mound" : "excavated");
  return Array.from({ length: options.count }, (_, i) => ({
    id: uid("cell"),
    name: `Celda ${String.fromCharCode(65 + i)}`,
    method,
    shape,
    bottomLengthM: options.bottomLength,
    bottomWidthM: options.bottomWidth,
    heightM: options.height,
    slopeHtoV: options.slope,
    excavationDepthM: options.excavationDepth,
    baseElevationM: options.baseElevation,
    bermCount: options.bermCount ?? 2,
    bermWidthM: options.bermWidth ?? 3,
    freeboardM: options.freeboard ?? (method === "area" ? 0.3 : 0.4),
    rampWidthM: options.rampWidth ?? (method === "ramp" ? 6 : 0),
    rampGradePct: options.rampGrade ?? (method === "ramp" ? 8 : 0),
    rampLengthM: 0,
    sequenceOrder: i + 1,
    notes: "",
  }));
}

export function defaultClosureLayers(): ClosureLayer[] {
  return [
    { id: uid("fc"), name: "Capa de regularización", thicknessMm: 300, material: "Suelo compactado", function: "Base de apoyo y ajuste de pendientes", enabled: true },
    { id: uid("fc"), name: "Barrera mineral de baja permeabilidad", thicknessMm: 600, material: "Arcilla compactada k ≤ 1×10⁻⁹ m/s", function: "Control de infiltración", enabled: true },
    { id: uid("fc"), name: "Geomembrana HDPE 1.5 mm", thicknessMm: 1.5, material: "HDPE", function: "Barrera sintética complementaria", enabled: true },
    { id: uid("fc"), name: "Capa drenante", thicknessMm: 300, material: "Grava / geored", function: "Drenaje del agua que percola la capa superficial", enabled: true },
    { id: uid("fc"), name: "Capa protectora", thicknessMm: 450, material: "Suelo seleccionado", function: "Protección de la barrera", enabled: true },
    { id: uid("fc"), name: "Suelo vegetal", thicknessMm: 300, material: "Suelo orgánico", function: "Soporte de revegetación", enabled: true },
    { id: uid("fc"), name: "Cobertura vegetal", thicknessMm: 100, material: "Especies nativas", function: "Evapotranspiración y control de erosión", enabled: true },
  ];
}

export function defaultClosureTasks(): ClosureTask[] {
  return [
    { id: uid("task"), name: "Perfilado final y regularización de la superficie", startMonth: -6, durationMonths: 6, responsible: "Jefatura de obra", category: "cierre", done: true },
    { id: uid("task"), name: "Instalación de barrera de baja permeabilidad", startMonth: 0, durationMonths: 4, responsible: "Supervisión ambiental", category: "cierre", done: false },
    { id: uid("task"), name: "Capa drenante y protección", startMonth: 4, durationMonths: 3, responsible: "Jefatura de obra", category: "cierre", done: false },
    { id: uid("task"), name: "Sistema de drenaje superficial y canales", startMonth: 6, durationMonths: 4, responsible: "Ingeniería civil", category: "cierre", done: false },
    { id: uid("task"), name: "Suelo vegetal y revegetación", startMonth: 7, durationMonths: 5, responsible: "Especialista ambiental", category: "cierre", done: false },
    { id: uid("task"), name: "Ajuste y operación de pozos de biogás", startMonth: 2, durationMonths: 6, responsible: "Operaciones", category: "cierre", done: false },
    { id: uid("task"), name: "Monitoreo de lixiviados y aguas subterráneas", startMonth: 12, durationMonths: 60, responsible: "Laboratorio acreditado", category: "posclausura", done: false },
    { id: uid("task"), name: "Inspección de cobertura y asentamientos", startMonth: 12, durationMonths: 60, responsible: "Supervisión ambiental", category: "posclausura", done: false },
    { id: uid("task"), name: "Mantenimiento de drenaje y control de erosión", startMonth: 12, durationMonths: 60, responsible: "Mantenimiento", category: "posclausura", done: false },
  ];
}

export function defaultMonitoringPoints(): MonitoringPoint[] {
  return [
    { id: uid("mon"), name: "PZ-01 Aguas subterráneas aguas arriba", type: "aguas-subterraneas", frequency: "Trimestral", parameters: "pH, conductividad, DQO, metales", responsible: "Laboratorio acreditado", lastValue: "CE 640 µS/cm", referenceLimit: "Línea base del sitio", status: "ok" },
    { id: uid("mon"), name: "PZ-02 Aguas subterráneas aguas abajo", type: "aguas-subterraneas", frequency: "Trimestral", parameters: "pH, conductividad, DQO, metales", responsible: "Laboratorio acreditado", lastValue: "CE 710 µS/cm", referenceLimit: "Línea base + 20 %", status: "alerta" },
    { id: uid("mon"), name: "LIX-01 Tanque de lixiviados", type: "lixiviados", frequency: "Mensual", parameters: "pH, DQO, DBO5, SST, NH3", responsible: "Operaciones", lastValue: "DQO 3 850 mg/L", referenceLimit: "Según plan de tratamiento", status: "ok" },
    { id: uid("mon"), name: "GAS-01 Colector principal", type: "biogas", frequency: "Semanal", parameters: "CH4, CO2, O2, H2S, caudal", responsible: "Operaciones", lastValue: "CH4 54 %", referenceLimit: "CH4 ≥ 40 %", status: "ok" },
    { id: uid("mon"), name: "AS-01 Punto de asentamiento", type: "asentamiento", frequency: "Semestral", parameters: "Cota topográfica", responsible: "Topografía", lastValue: "Sin lectura", referenceLimit: "≤ 5 % de la altura", status: "sin-datos" },
  ];
}

export function defaultScenarioParams(overrides: Partial<ScenarioParams> = {}): ScenarioParams {
  return {
    site: defaultSite(),
    waste: {
      population: 185_000,
      perCapitaKgDay: 0.62,
      collectionCoveragePct: 88,
      populationGrowthPct: 1.2,
      generationGrowthPct: 0.5,
      recoveryPct: 8,
      composition: { ...DEFAULT_COMPOSITION },
      densityInitialKgM3: 850,
      densityStabilizedKgM3: 950,
      capacityDensityBasis: "stabilized",
      coverRatioPct: 20,
      coverDensityKgM3: 1300,
    },
    geometry: {
      method: "area",
      terrainBaseElevationM: 3250,
      footprintAreaM2: 130_000,
      utilizationFactor: 0.9,
      infrastructureReservePct: 4,
      cells: makeCells({
        count: 5,
        bottomLength: 100,
        bottomWidth: 70,
        height: 12,
        slope: 2.5,
        excavationDepth: 0,
        baseElevation: 3250,
        bermCount: 2,
        bermWidth: 3,
        method: "area",
        freeboard: 0.3,
      }),
      layers: defaultLayers(),
    },
    leachate: {
      exposedAreaMode: "operation",
      manualExposedAreaM2: 12_000,
      initialMoisturePct: 45,
      incomingMoisturePct: 55,
      fieldCapacityPct: 30,
      coverInfiltrationFactor: 0.15,
      closedAreaFraction: 0,
      storageRetentionDays: 3,
      swissK: 0.2,
      pipeDiameterMm: 200,
      pipeSlopePct: 1,
      pipeManningN: 0.013,
      treatmentCapacityM3Day: 60,
      linerPermeabilityMs: 1e-12,
    },
    gas: {
      doc: 0.16,
      docf: 0.5,
      mcf: 1,
      f: 0.5,
      k: 0.06,
      ch4Fraction: 0.55,
      collectionEfficiencyPct: 65,
      closureCaptureEfficiencyPct: 85,
      oxidationPct: 10,
      flareEfficiencyPct: 98,
      energyEfficiencyPct: 35,
      lhvMjNm3: 35.8,
      referenceTemperatureC: 0,
      postClosureYears: 30,
      wellCount: 14,
      wellDepthM: 11,
      wellSpacingM: 45,
    },
    geotech: {
      slopeAngleDeg: 21.8,
      unitWeightKnM3: 16,
      cohesionKpa: 5,
      frictionAngleDeg: 26,
      interfaceFrictionAngleDeg: 22,
      interfaceCohesionKpa: 0,
      waterTableRatio: 0.3,
      sliceDepthM: 8,
      seismicCoefficient: 0.15,
    },
    operation: {
      startYear: 2026,
      workingFaceAreaM2: 1_500,
      dailyCoverThicknessMm: 150,
      compactionPasses: 5,
      activeCellsPerYear: 2,
      sequenceMode: "sequential",
    },
    closure: {
      finalCoverLayers: defaultClosureLayers(),
      tasks: defaultClosureTasks(),
      monitoringPoints: defaultMonitoringPoints(),
      postClosureYears: 30,
      earlyClosureYear: null,
      revegetation: "Mezcla de gramíneas y arbustos nativos; exclusión de especies invasoras",
      settlementAllowancePct: 5,
    },
    costs: {
      capexUsd: 12_500_000,
      opexUsdPerTonne: 18,
      leachateTreatmentUsdPerM3: 6,
      gasRevenueUsdPerMwh: 90,
      discountRatePct: 8,
    },
    ...overrides,
  };
}

const SCENARIO_COLORS: Record<ScenarioKind, string> = {
  base: "#79CE4C",
  conservador: "#3B7C9E",
  "generacion-elevada": "#C89B3C",
  "mayor-recuperacion": "#2E9FBE",
  precipitaciones: "#8C7BC4",
  "optimizacion-capacidad": "#3E9B2E",
  "clausura-anticipada": "#C0553F",
  personalizado: "#A7B0A8",
};

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function makeScenario(
  name: string,
  kind: ScenarioKind,
  params: ScenarioParams,
  mutate?: (p: ScenarioParams) => void,
): Scenario {
  const p = clone(params);
  if (mutate) mutate(p);
  return {
    id: uid("scn"),
    name,
    kind,
    color: SCENARIO_COLORS[kind],
    isBase: kind === "base",
    description:
      kind === "base"
        ? "Escenario de referencia con los parámetros declarados del proyecto."
        : "Escenario derivado. Modifique parámetros sin alterar el escenario base.",
    params: p,
  };
}

export function baseScenario(params: ScenarioParams): Scenario {
  return makeScenario("Escenario base", "base", params);
}

export function standardScenarios(params: ScenarioParams, startYear: number): Scenario[] {
  return [
    baseScenario(params),
    makeScenario("Conservador", "conservador", params, (p) => {
      p.waste.perCapitaKgDay *= 0.95;
      p.waste.populationGrowthPct += 0.4;
      p.waste.recoveryPct = Math.max(0, p.waste.recoveryPct - 3);
      p.waste.densityInitialKgM3 *= 0.95;
      p.waste.densityStabilizedKgM3 *= 0.95;
      p.site.rainfallMmYr *= 1.1;
      p.site.maxMonthlyRainfallMm *= 1.1;
      p.gas.doc *= 0.9;
      p.gas.collectionEfficiencyPct = 55;
    }),
    makeScenario("Generación elevada", "generacion-elevada", params, (p) => {
      p.waste.perCapitaKgDay *= 1.15;
      p.waste.generationGrowthPct += 1;
      p.waste.populationGrowthPct += 0.3;
    }),
    makeScenario("Mayor recuperación", "mayor-recuperacion", params, (p) => {
      p.waste.recoveryPct = Math.min(60, p.waste.recoveryPct + 14);
      p.waste.collectionCoveragePct = Math.min(100, p.waste.collectionCoveragePct + 6);
    }),
    makeScenario("Precipitaciones extremas", "precipitaciones", params, (p) => {
      p.site.rainfallMmYr *= 1.3;
      p.site.maxMonthlyRainfallMm *= 1.35;
      p.site.maxDailyRainfallMm *= 1.4;
      p.site.runoffCoefficient = Math.min(0.7, p.site.runoffCoefficient + 0.05);
    }),
    makeScenario("Optimización de capacidad", "optimizacion-capacidad", params, (p) => {
      p.geometry.utilizationFactor = Math.min(0.98, p.geometry.utilizationFactor + 0.05);
      p.geometry.infrastructureReservePct = Math.max(2, p.geometry.infrastructureReservePct - 1);
      p.waste.coverRatioPct = Math.max(10, p.waste.coverRatioPct - 2);
      p.waste.densityStabilizedKgM3 *= 1.05;
    }),
    makeScenario("Clausura anticipada", "clausura-anticipada", params, (p) => {
      p.closure.earlyClosureYear = startYear + 10;
      p.gas.closureCaptureEfficiencyPct = 80;
    }),
  ];
}

export function demoProjectOne(): Project {
  const params = defaultScenarioParams();
  const now = "2026-09-18T09:30:00.000Z";
  return {
    id: uid("prj"),
    name: "Relleno Sanitario Valle Verde",
    descriptor: "Alternativa de disposición final para 185 000 habitantes",
    country: "Perú",
    region: "Junín",
    location: "Sector Pampa Verde (emplazamiento sintético)",
    latitude: -11.952,
    longitude: -75.248,
    unitSystem: "SI",
    regulationRef: "D.L. 1278 y D.S. 014-2017-MINAM — verificación pendiente",
    responsible: "Ing. Ambiental de Demostración",
    notes:
      "Proyecto de demostración con datos sintéticos. No corresponde a un emplazamiento real ni sustituye estudios de campo.",
    version: "1.0-demo",
    isDemo: true,
    archived: false,
    horizonYears: 20,
    createdAt: "2026-08-04T14:20:00.000Z",
    updatedAt: now,
    tags: ["demostración", "Perú", "relleno mecanizado"],
    scenarios: standardScenarios(params, params.operation.startYear),
  };
}

export function demoProjectTwo(): Project {
  const params = defaultScenarioParams({
    site: defaultSite({
      country: "Honduras",
      region: "Atlántida",
      location: "Valle de La Ceiba (emplazamiento sintético)",
      latitude: 15.759,
      longitude: -86.782,
      elevationMasl: 45,
      areaHa: 9,
      rainfallMmYr: 2800,
      maxMonthlyRainfallMm: 420,
      maxDailyRainfallMm: 110,
      evapotranspirationMmYr: 1100,
      runoffCoefficient: 0.45,
      waterTableDepthM: 9,
      permeabilityMs: 5e-7,
      coverMaterialSource: "Banco aluvial a 3 km",
      coverMaterialAvailableM3: 90_000,
      geology: "Sedimentos aluviales areno-arcillosos",
      hydrogeology: "Acuífero costero somero con influencia mareal",
      dataQuality: {
        topography: "measured",
        geology: "estimated",
        geotechnics: "assumed",
        hydrogeology: "estimated",
        permeability: "assumed",
        hydrology: "measured",
        climate: "measured",
        coverMaterial: "estimated",
        access: "measured",
        landUse: "assumed",
        risks: "assumed",
        social: "estimated",
      },
    }),
    waste: {
      population: 68_000,
      perCapitaKgDay: 0.55,
      collectionCoveragePct: 80,
      populationGrowthPct: 1.6,
      generationGrowthPct: 1,
      recoveryPct: 5,
      composition: { organic: 58, paper: 10, plastic: 13, glass: 2, metal: 2, other: 15 },
      densityInitialKgM3: 700,
      densityStabilizedKgM3: 850,
      capacityDensityBasis: "stabilized",
      coverRatioPct: 22,
      coverDensityKgM3: 1250,
    },
    geometry: {
      method: "trench",
      terrainBaseElevationM: 45,
      footprintAreaM2: 62_000,
      utilizationFactor: 0.86,
      infrastructureReservePct: 5,
      cells: makeCells({
        count: 3,
        bottomLength: 90,
        bottomWidth: 12,
        height: 6,
        slope: 1,
        excavationDepth: 6,
        baseElevation: 39,
        bermCount: 0,
        bermWidth: 0,
        method: "trench",
        freeboard: 0.4,
      }),
      layers: defaultLayers(),
    },
    leachate: {
      exposedAreaMode: "operation",
      manualExposedAreaM2: 8_000,
      initialMoisturePct: 55,
      incomingMoisturePct: 65,
      fieldCapacityPct: 32,
      coverInfiltrationFactor: 0.25,
      closedAreaFraction: 0,
      storageRetentionDays: 3,
      swissK: 0.25,
      pipeDiameterMm: 200,
      pipeSlopePct: 1.2,
      pipeManningN: 0.013,
      treatmentCapacityM3Day: 90,
      linerPermeabilityMs: 1e-12,
    },
    gas: {
      doc: 0.18,
      docf: 0.5,
      mcf: 0.8,
      f: 0.5,
      k: 0.08,
      ch4Fraction: 0.5,
      collectionEfficiencyPct: 45,
      closureCaptureEfficiencyPct: 70,
      oxidationPct: 15,
      flareEfficiencyPct: 95,
      energyEfficiencyPct: 30,
      lhvMjNm3: 35.8,
      referenceTemperatureC: 15,
      postClosureYears: 25,
      wellCount: 10,
      wellDepthM: 9,
      wellSpacingM: 35,
    },
    geotech: {
      slopeAngleDeg: 18.4,
      unitWeightKnM3: 15,
      cohesionKpa: 3,
      frictionAngleDeg: 24,
      interfaceFrictionAngleDeg: 20,
      interfaceCohesionKpa: 0,
      waterTableRatio: 0.5,
      sliceDepthM: 6,
      seismicCoefficient: 0.1,
    },
    operation: {
      startYear: 2027,
      workingFaceAreaM2: 1_200,
      dailyCoverThicknessMm: 150,
      compactionPasses: 4,
      activeCellsPerYear: 1,
      sequenceMode: "sequential",
    },
    closure: {
      finalCoverLayers: defaultClosureLayers(),
      tasks: defaultClosureTasks(),
      monitoringPoints: defaultMonitoringPoints(),
      postClosureYears: 25,
      earlyClosureYear: null,
      revegetation: "Gramíneas locales y árboles de sombra; control de escorrentía",
      settlementAllowancePct: 6,
    },
    costs: {
      capexUsd: 4_800_000,
      opexUsdPerTonne: 22,
      leachateTreatmentUsdPerM3: 8,
      gasRevenueUsdPerMwh: 70,
      discountRatePct: 9,
    },
  }) as ScenarioParams;
  const meta = {
    id: uid("prj"),
    name: "Relleno Mecanizado La Ceiba",
    descriptor: "Caso demostrativo con clima tropical húmedo",
    country: "Honduras",
    region: "Atlántida",
    location: "Valle de La Ceiba (emplazamiento sintético)",
    latitude: 15.759,
    longitude: -86.782,
    unitSystem: "SI" as const,
    regulationRef: "Manual de Construcción y Operación de Rellenos Sanitarios en Honduras (2014) — referencia técnica",
    responsible: "Ing. Ambiental de Demostración",
    notes:
      "Datos sintéticos para demostración. El clima húmedo y la cercanía al nivel freático generan alertas deliberadas para revisión técnica.",
    version: "1.0-demo",
    isDemo: true,
    archived: false,
    horizonYears: 18,
    createdAt: "2026-07-22T10:15:00.000Z",
    updatedAt: "2026-09-12T16:40:00.000Z",
    tags: ["demostración", "Honduras", "trinchera"],
  };
  return {
    ...meta,
    scenarios: [
      baseScenario(params),
      makeScenario("Conservador", "conservador", params, (p) => {
        p.waste.perCapitaKgDay *= 1.1;
        p.site.rainfallMmYr *= 1.15;
        p.gas.collectionEfficiencyPct = 35;
      }),
      makeScenario("Precipitaciones extremas", "precipitaciones", params, (p) => {
        p.site.rainfallMmYr *= 1.5;
        p.site.maxMonthlyRainfallMm *= 1.4;
        p.site.maxDailyRainfallMm *= 1.3;
      }),
    ],
  };
}

export function demoProjectThree(): Project {
  const params = defaultScenarioParams({
    site: defaultSite({
      country: "Perú",
      region: "Piura",
      location: "Zona noreste de Piura (emplazamiento sintético)",
      latitude: -5.178,
      longitude: -80.62,
      elevationMasl: 60,
      areaHa: 28,
      rainfallMmYr: 220,
      maxMonthlyRainfallMm: 120,
      maxDailyRainfallMm: 65,
      evapotranspirationMmYr: 1450,
      runoffCoefficient: 0.3,
      waterTableDepthM: 30,
      geology: "Arenas eólicas sobre arcillas continentales",
      hydrogeology: "Acuífero profundo, baja vulnerabilidad local",
      coverMaterialSource: "Material aluvial externo a 8 km",
      coverMaterialAvailableM3: 180_000,
    }),
    waste: {
      population: 320_000,
      perCapitaKgDay: 0.65,
      collectionCoveragePct: 92,
      populationGrowthPct: 1.5,
      generationGrowthPct: 0.8,
      recoveryPct: 12,
      composition: { organic: 48, paper: 14, plastic: 17, glass: 3, metal: 2, other: 16 },
      densityInitialKgM3: 900,
      densityStabilizedKgM3: 1000,
      capacityDensityBasis: "stabilized",
      coverRatioPct: 18,
      coverDensityKgM3: 1350,
    },
    geometry: {
      method: "ramp",
      terrainBaseElevationM: 60,
      footprintAreaM2: 195_000,
      utilizationFactor: 0.92,
      infrastructureReservePct: 4,
      cells: makeCells({
        count: 6,
        bottomLength: 110,
        bottomWidth: 75,
        height: 14,
        slope: 2.5,
        excavationDepth: 5,
        baseElevation: 55,
        bermCount: 2,
        bermWidth: 3,
        method: "ramp",
        freeboard: 0.3,
        rampWidth: 6,
        rampGrade: 8,
      }),
      layers: defaultLayers(),
    },
    leachate: {
      exposedAreaMode: "operation",
      manualExposedAreaM2: 15_000,
      initialMoisturePct: 40,
      incomingMoisturePct: 45,
      fieldCapacityPct: 28,
      coverInfiltrationFactor: 0.1,
      closedAreaFraction: 0,
      storageRetentionDays: 2,
      swissK: 0.15,
      pipeDiameterMm: 250,
      pipeSlopePct: 0.8,
      pipeManningN: 0.013,
      treatmentCapacityM3Day: 30,
      linerPermeabilityMs: 1e-12,
    },
    gas: {
      doc: 0.15,
      docf: 0.5,
      mcf: 1,
      f: 0.5,
      k: 0.05,
      ch4Fraction: 0.56,
      collectionEfficiencyPct: 70,
      closureCaptureEfficiencyPct: 88,
      oxidationPct: 8,
      flareEfficiencyPct: 98,
      energyEfficiencyPct: 38,
      lhvMjNm3: 35.8,
      referenceTemperatureC: 0,
      postClosureYears: 30,
      wellCount: 20,
      wellDepthM: 13,
      wellSpacingM: 45,
    },
    geotech: {
      slopeAngleDeg: 21.8,
      unitWeightKnM3: 17,
      cohesionKpa: 8,
      frictionAngleDeg: 28,
      interfaceFrictionAngleDeg: 24,
      interfaceCohesionKpa: 0,
      waterTableRatio: 0.2,
      sliceDepthM: 9,
      seismicCoefficient: 0.35,
    },
    operation: {
      startYear: 2028,
      workingFaceAreaM2: 1_800,
      dailyCoverThicknessMm: 150,
      compactionPasses: 5,
      activeCellsPerYear: 2,
      sequenceMode: "sequential",
    },
    closure: {
      finalCoverLayers: defaultClosureLayers(),
      tasks: defaultClosureTasks(),
      monitoringPoints: defaultMonitoringPoints(),
      postClosureYears: 30,
      earlyClosureYear: null,
      revegetation: "Especies xerófitas nativas con riego de establecimiento",
      settlementAllowancePct: 5,
    },
    costs: {
      capexUsd: 22_000_000,
      opexUsdPerTonne: 16,
      leachateTreatmentUsdPerM3: 9,
      gasRevenueUsdPerMwh: 95,
      discountRatePct: 8,
    },
  });
  return {
    id: uid("prj"),
    name: "Planta Integral Norte Piura",
    descriptor: "Escenario de alta capacidad con recuperación de materiales",
    country: "Perú",
    region: "Piura",
    location: "Zona noreste de Piura (emplazamiento sintético)",
    latitude: -5.178,
    longitude: -80.62,
    unitSystem: "SI",
    regulationRef: "D.L. 1278 y D.S. 014-2017-MINAM — verificación pendiente",
    responsible: "Ing. Ambiental de Demostración",
    notes: "Proyecto de demostración con datos sintéticos. No representa una instalación existente.",
    version: "1.0-demo",
    isDemo: true,
    archived: false,
    horizonYears: 22,
    createdAt: "2026-06-10T08:05:00.000Z",
    updatedAt: "2026-08-30T11:25:00.000Z",
    tags: ["demostración", "Perú", "recuperación"],
    scenarios: [
      baseScenario(params),
      makeScenario("Mayor recuperación", "mayor-recuperacion", params, (p) => {
        p.waste.recoveryPct = 30;
        p.waste.collectionCoveragePct = 96;
      }),
      makeScenario("Generación elevada", "generacion-elevada", params, (p) => {
        p.waste.perCapitaKgDay *= 1.12;
        p.waste.populationGrowthPct += 0.4;
      }),
      makeScenario("Optimización de capacidad", "optimizacion-capacidad", params, (p) => {
        p.geometry.utilizationFactor = 0.96;
        p.waste.densityStabilizedKgM3 = 1050;
      }),
    ],
  };
}

export function demoProjects(): Project[] {
  return [demoProjectOne(), demoProjectTwo(), demoProjectThree()];
}

export function blankProject(): Project {
  const params = defaultScenarioParams({
    waste: {
      population: 100_000,
      perCapitaKgDay: 0.6,
      collectionCoveragePct: 85,
      populationGrowthPct: 1.2,
      generationGrowthPct: 0.5,
      recoveryPct: 5,
      composition: { ...DEFAULT_COMPOSITION },
      densityInitialKgM3: 800,
      densityStabilizedKgM3: 900,
      capacityDensityBasis: "stabilized",
      coverRatioPct: 20,
      coverDensityKgM3: 1300,
    },
    geometry: {
      method: "area",
      terrainBaseElevationM: 500,
      footprintAreaM2: 90_000,
      utilizationFactor: 0.9,
      infrastructureReservePct: 5,
      cells: makeCells({
        count: 4,
        bottomLength: 95,
        bottomWidth: 65,
        height: 12,
        slope: 2.5,
        excavationDepth: 0,
        baseElevation: 500,
        bermCount: 1,
        bermWidth: 3,
        method: "area",
        freeboard: 0.3,
      }),
      layers: defaultLayers(),
    },
  });
  return {
    id: uid("prj"),
    name: "Nuevo proyecto",
    country: "Perú",
    region: "—",
    location: "—",
    latitude: null,
    longitude: null,
    unitSystem: "SI",
    regulationRef: "D.S. 014-2017-MINAM (verificación pendiente)",
    responsible: "",
    notes: "",
    version: "0.1",
    isDemo: false,
    archived: false,
    horizonYears: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    scenarios: [baseScenario(params)],
  };
}
