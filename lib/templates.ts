import type { FacilityType, Project, Scenario, ScenarioParams } from "@/lib/types";
import { blankProject, defaultSite, makeCells, standardScenarios, baseScenario, makeScenario } from "@/lib/defaults";
import { uid } from "@/lib/uid";

export interface ProjectTemplate {
  id: string;
  name: string;
  tag: string;
  subtitle: string;
  description: string;
  horizon: number;
  population: number;
  perCapita: number;
  recommended?: boolean;
  accent: string;
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "mecanizado",
    name: "Relleno mecanizado",
    tag: "Urbano",
    subtitle: "Celdas tipo área, 4 unidades",
    description: "Configuración base para un municipio intermedio con operación mecanizada y balance anual de residuos.",
    horizon: 20,
    population: 150_000,
    perCapita: 0.62,
    recommended: true,
    accent: "#79CE4C",
  },
  {
    id: "trinchera",
    name: "Trinchera / manual",
    tag: "Tropical",
    subtitle: "Trincheras poco profundas, 6 unidades",
    description: "Celdas estrechas con excavación y bermas reducidas; útil para climas húmedos y operación semi-mecanizada.",
    horizon: 15,
    population: 65_000,
    perCapita: 0.55,
    accent: "#3B7C9E",
  },
  {
    id: "integral",
    name: "Planta integral",
    tag: "Alta capacidad",
    subtitle: "Rampas, recuperación y 6 celdas",
    description: "Mayor volumen y recuperación previa; pensado para evaluar reducción de tonelaje dispuesto.",
    horizon: 25,
    population: 300_000,
    perCapita: 0.65,
    accent: "#C89B3C",
  },
  {
    id: "vacio",
    name: "Proyecto vacío",
    tag: "Personalizado",
    subtitle: "Una celda y parámetros mínimos",
    description: "Empiece desde cero con una sola celda. Todos los datos deben completarse y declararse.",
    horizon: 15,
    population: 100_000,
    perCapita: 0.6,
    accent: "#A7B0A8",
  },
];

export interface NewProjectInput {
  name: string;
  country: string;
  region: string;
  location: string;
  responsible: string;
  notes: string;
  horizonYears: number;
  templateId: string;
  population: number;
  perCapitaKgDay: number;
}

function templateById(id: string): ProjectTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

function facilityFor(id: string): FacilityType {
  if (id === "trinchera") return "relleno-mecanizado";
  if (id === "integral") return "planta-integral";
  if (id === "vacio") return "relleno-sanitario";
  return "relleno-sanitario";
}

export function buildProject(input: NewProjectInput): Project {
  const template = templateById(input.templateId);
  const project = blankProject();
  const year = new Date().getFullYear() + 1;
  const region = input.region.trim() || "Sin definir";
  const location = input.location.trim() || "Sin definir";
  const emptyQuality = Object.fromEntries(
    Object.keys(project.scenarios[0].params.site.dataQuality).map((k) => [k, "missing" as const]),
  );

  const site = defaultSite({
    country: input.country,
    region,
    location,
    latitude: null,
    longitude: null,
    elevationMasl: 500,
    facilityType: facilityFor(template.id),
    areaHa: template.id === "integral" ? 26 : template.id === "trinchera" ? 9 : 16,
    rainfallMmYr: input.country === "Honduras" ? 1_800 : 750,
    maxMonthlyRainfallMm: input.country === "Honduras" ? 320 : 140,
    maxDailyRainfallMm: input.country === "Honduras" ? 95 : 42,
    evapotranspirationMmYr: input.country === "Honduras" ? 1_050 : 620,
    waterTableDepthM: 15,
    dataQuality: emptyQuality,
  });

  let params: ScenarioParams = {
    ...project.scenarios[0].params,
    site,
    waste: {
      ...project.scenarios[0].params.waste,
      population: Math.max(1_000, input.population || template.population),
      perCapitaKgDay: input.perCapitaKgDay || template.perCapita,
      capacityDensityBasis: "stabilized",
    },
    operation: {
      ...project.scenarios[0].params.operation,
      startYear: year,
    },
  };

  if (template.id === "mecanizado") {
    params = {
      ...params,
      geometry: {
        ...params.geometry,
        method: "area",
        terrainBaseElevationM: 500,
        footprintAreaM2: 120_000,
        cells: makeCells({
          count: 4,
          bottomLength: 100,
          bottomWidth: 70,
          height: 12,
          slope: 2.5,
          excavationDepth: 0,
          baseElevation: 500,
          bermCount: 2,
          bermWidth: 3,
          method: "area",
          freeboard: 0.3,
        }),
      },
    };
  } else if (template.id === "trinchera") {
    params = {
      ...params,
      site: { ...params.site, areaHa: 9, waterTableDepthM: 9, rainfallMmYr: 2_100, maxMonthlyRainfallMm: 360, maxDailyRainfallMm: 100 },
      waste: { ...params.waste, densityInitialKgM3: 700, densityStabilizedKgM3: 850, coverRatioPct: 22 },
      geometry: {
        ...params.geometry,
        method: "trench",
        terrainBaseElevationM: 80,
        footprintAreaM2: 65_000,
        cells: makeCells({
          count: 6,
          bottomLength: 95,
          bottomWidth: 12,
          height: 6,
          slope: 1,
          excavationDepth: 6,
          baseElevation: 74,
          bermCount: 0,
          bermWidth: 0,
          method: "trench",
          freeboard: 0.4,
        }),
      },
      leachate: { ...params.leachate, coverInfiltrationFactor: 0.25, incomingMoisturePct: 62 },
    };
  } else if (template.id === "integral") {
    params = {
      ...params,
      waste: {
        ...params.waste,
        population: Math.max(150_000, input.population || template.population),
        perCapitaKgDay: input.perCapitaKgDay || template.perCapita,
        recoveryPct: 18,
        densityInitialKgM3: 900,
        densityStabilizedKgM3: 1_000,
        coverRatioPct: 18,
      },
      geometry: {
        ...params.geometry,
        method: "ramp",
        terrainBaseElevationM: 120,
        footprintAreaM2: 195_000,
        cells: makeCells({
          count: 6,
          bottomLength: 110,
          bottomWidth: 75,
          height: 14,
          slope: 2.5,
          excavationDepth: 5,
          baseElevation: 115,
          bermCount: 2,
          bermWidth: 3,
          method: "ramp",
          freeboard: 0.3,
          rampWidth: 6,
          rampGrade: 8,
        }),
      },
      gas: { ...params.gas, wellCount: 18, wellDepthM: 13 },
    };
  } else {
    params = {
      ...params,
      geometry: {
        ...params.geometry,
        terrainBaseElevationM: 500,
        footprintAreaM2: 60_000,
        cells: makeCells({
          count: 1,
          bottomLength: 90,
          bottomWidth: 60,
          height: 10,
          slope: 2.5,
          excavationDepth: 4,
          baseElevation: 496,
          bermCount: 1,
          bermWidth: 3,
        }),
      },
    };
  }

  let scenarios: Scenario[];
  if (template.id === "mecanizado" || template.id === "integral") {
    scenarios = standardScenarios(params, year);
  } else if (template.id === "trinchera") {
    scenarios = [
      baseScenario(params),
      makeScenario("Conservador", "conservador", params, (p) => {
        p.waste.perCapitaKgDay *= 1.08;
        p.site.rainfallMmYr *= 1.15;
        p.gas.collectionEfficiencyPct = 35;
      }),
      makeScenario("Precipitaciones extremas", "precipitaciones", params, (p) => {
        p.site.rainfallMmYr *= 1.4;
        p.site.maxMonthlyRainfallMm *= 1.35;
        p.site.maxDailyRainfallMm *= 1.3;
      }),
    ];
  } else {
    scenarios = [baseScenario(params)];
  }

  const regulation =
    input.country === "Honduras"
      ? "Manual de Construcción y Operación de Rellenos Sanitarios en Honduras (2014) — referencia técnica; normativa local pendiente de verificación"
      : "D.S. 014-2017-MINAM — verificación de vigencia y articulado pendiente";

  return {
    ...project,
    id: uid("prj"),
    name: input.name.trim() || "Proyecto sin nombre",
    descriptor: `${template.name} · ${region}`,
    country: input.country,
    region,
    location,
    latitude: null,
    longitude: null,
    unitSystem: "SI",
    regulationRef: regulation,
    responsible: input.responsible.trim() || "Sin asignar",
    notes: input.notes,
    version: "0.1",
    isDemo: false,
    archived: false,
    horizonYears: Math.min(40, Math.max(5, Math.round(input.horizonYears || template.horizon))),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [template.tag, input.country],
    scenarios,
  };
}
