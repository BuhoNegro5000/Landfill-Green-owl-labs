import { describe, expect, it } from "vitest";
import type { CellConfig, GasParams, GeotechParams, WasteParams } from "@/lib/types";
import { cellVolumeZeroTo, computeGeometry, heightForVolume } from "@/lib/engine/geometry";
import { computeCapacity } from "@/lib/engine/capacity";
import { computeGas, ch4PotentialPerTonne } from "@/lib/engine/gas";
import { computeGeotech } from "@/lib/engine/geotech";
import { manningFullPipeCapacity } from "@/lib/engine/leachate";
import { computeCore } from "@/lib/engine/model";
import { computeSensitivity, runMonteCarlo } from "@/lib/engine/sensitivity";
import { defaultLayers, defaultScenarioParams, defaultSite } from "@/lib/defaults";
import { DEFAULT_DOCUMENTS, normativeStats, reconcileDocuments } from "@/lib/normative";
import { assessSiteSelection } from "@/lib/siteSelection";
import { runSelfTests } from "@/lib/selfTest";
import type { WasteResult } from "@/lib/engine/waste";

function testCell(overrides: Partial<CellConfig> = {}): CellConfig {
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

const WASTE_FIXTURE: WasteParams = {
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

describe("geometría prismoidal", () => {
  it("integra la trinchera MINAM con el método prismoidal exacto", () => {
    const cell = testCell();
    const exact = cellVolumeZeroTo(cell, cell.heightM);
    // Σ h/6 (A1 + 4Am + A2) for linear dimensions: 2.5/6 (330.75 + 4·429.8125 + 532).
    const expected = (2.5 / 6) * (330.75 + 4 * 429.8125 + 532);
    expect(exact).toBeCloseTo(expected, 6);
    expect(exact).toBeCloseTo(1075.8333, 3);
  });

  it("reproduce el valor del manual MINAM con la fórmula de tronco citada", () => {
    // MINAM 2011 p. 59: V = h/3 (ab + cd + √(ab·cd)) with a=76, b=7, c=4.5, d=73.5.
    const manual = (2.5 / 3) * (76 * 7 + 73.5 * 4.5 + Math.sqrt(76 * 7 * 73.5 * 4.5));
    expect(manual).toBeCloseTo(1068.52, 1);
    const exact = cellVolumeZeroTo(testCell(), 2.5);
    // The exact prismoidal integral differs from the manual's frustum approximation.
    expect(Math.abs((exact - manual) / manual)).toBeLessThan(0.01);
    expect(exact).toBeGreaterThan(manual);
  });

  it("invierte volumen y altura con tolerancia sub-milimétrica", () => {
    const cell = testCell({ bermCount: 2, bermWidthM: 3, heightM: 10, shape: "mound", bottomLengthM: 80, bottomWidthM: 60, slopeHtoV: 2.5, excavationDepthM: 0 });
    const target = cellVolumeZeroTo(cell, cell.heightM) * 0.37;
    const z = heightForVolume(cell, target);
    expect(cellVolumeZeroTo(cell, z)).toBeCloseTo(target, 5);
  });
});

describe("capacidad y balance de residuos", () => {
  it("reproduce la referencia preliminar de Honduras 2014", () => {
    const volume = (365 * 1.25 * 12 * 120_000 * 0.75 * 0.85) / 600;
    expect(volume).toBeCloseTo(698_062.5, 0);
  });

  it("cierra el balance volumétrico y másico del modelo", () => {
    const geometry = computeGeometry({
      method: "area",
      terrainBaseElevationM: 100,
      footprintAreaM2: 100_000,
      utilizationFactor: 0.9,
      infrastructureReservePct: 5,
      cells: [
        testCell({
          shape: "mound",
          bottomLengthM: 80,
          bottomWidthM: 60,
          heightM: 10,
          slopeHtoV: 2.5,
          bermCount: 2,
          bermWidthM: 3,
          excavationDepthM: 0,
        }),
      ],
      layers: defaultLayers(),
    });
    const capacity = computeCapacity(geometry, defaultLayers(), WASTE_FIXTURE, {
      utilizationFactor: 0.9,
      infrastructureReservePct: 5,
    });

    expect(capacity.wasteVolumeM3 + capacity.coverVolumeM3).toBeCloseTo(capacity.usableVolumeM3, 9);
    expect(capacity.totalTonnageT).toBeCloseTo((capacity.wasteVolumeM3 * capacity.densityKgM3) / 1000, 9);
    expect(capacity.usableVolumeM3).toBeLessThanOrEqual(geometry.grossVolumeM3 * 0.9 + 1e-9);

    const cellVolumeSum = capacity.cells.reduce((s, c) => s + c.wasteVolumeM3, 0);
    const cellTonnageSum = capacity.cells.reduce((s, c) => s + c.tonnageT, 0);
    expect(cellVolumeSum).toBeCloseTo(capacity.wasteVolumeM3, 6);
    expect(cellTonnageSum).toBeCloseTo(capacity.totalTonnageT, 6);
  });
});

describe("hidráulica de lixiviados", () => {
  it("calcula Manning a sección llena en el caso de referencia", () => {
    const lps = manningFullPipeCapacity(0.2, 0.01, 0.013) * 1000;
    expect(lps).toBeCloseTo(32.8, 1);
  });
});

describe("geotecnia de talud infinito", () => {
  it("reproduce FS = √3 para β = 18.43°, φ′ = 30° sin cohesión ni presión de poros", () => {
    const params: GeotechParams = {
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
    const result = computeGeotech(params);
    expect(result.factorOfSafety).toBeCloseTo(Math.sqrt(3), 6);
    expect(result.band).toBe("aceptable");
  });
});

describe("biogás IPCC FOD", () => {
  it("conserva la masa de metano en el horizonte de decaimiento", () => {
    const params: GasParams = { ...defaultScenarioParams().gas, postClosureYears: 220 };
    const waste = { annual: [{ year: 2026, landfilledT: 1000 }] } as unknown as WasteResult;
    const gas = computeGas(params, waste, 2026);
    const ultimate = 1000 * ch4PotentialPerTonne(params);
    const generated = gas.annual.reduce((sum, row) => sum + row.ch4GeneratedT, 0);

    expect(generated).toBeCloseTo(ultimate, 1);
    expect(Math.abs((generated - ultimate) / ultimate)).toBeLessThan(0.005);
    expect(gas.annual.at(-1)?.ch4GeneratedT ?? 1).toBeLessThan(ultimate * 0.001);
  });
});

describe("balance hídrico y partición de tratamiento", () => {
  it("cierra P = R + ET + I y tratado + no tratado = generado", () => {
    const core = computeCore(defaultScenarioParams(), 12);
    expect(core.leachate.waterBalanceClosurePct).toBeCloseTo(100, 6);

    const maxGap = core.leachate.annual.reduce(
      (max, row) => Math.max(max, Math.abs(row.treatedM3 + row.untreatedM3 - row.leachateM3)),
      0,
    );
    expect(maxGap).toBeLessThan(1e-6);

    for (const row of core.leachate.annual) {
      expect(row.runoffM3 + row.evapotranspirationM3 + row.infiltrationM3).toBeCloseTo(row.rainfallM3, 6);
      expect(row.leachateM3).toBeGreaterThanOrEqual(row.infiltrationM3);
    }
  });
});

describe("sensibilidad", () => {
  it("ordena las variables por impacto absoluto y conserva el escenario base", () => {
    const params = defaultScenarioParams();
    const base = computeCore(params, 12);
    const sensitivity = computeSensitivity(params, 12);

    expect(sensitivity.base.lifeYears).toBeCloseTo(base.waste.operatingYears, 9);
    expect(sensitivity.rows.length).toBeGreaterThan(5);
    for (let i = 1; i < sensitivity.rows.length; i++) {
      expect(sensitivity.rows[i - 1].maxImpactPct).toBeGreaterThanOrEqual(sensitivity.rows[i].maxImpactPct);
    }

    const population = sensitivity.rows.find((row) => row.id === "population");
    expect(population).toBeDefined();
    expect(population!.low.lifeYears).toBeGreaterThan(population!.high.lifeYears);
  });

  it("aplica los factores declarados por variante OAT", () => {
    const params = defaultScenarioParams();
    const sensitivity = computeSensitivity(params, 12);

    const popLow = structuredClone(params);
    popLow.waste.population *= 0.8;
    const popLowCore = computeCore(popLow, 12);
    const population = sensitivity.rows.find((row) => row.id === "population");
    expect(population!.low.lifeYears).toBeCloseTo(popLowCore.waste.operatingYears, 9);

    const densityLow = structuredClone(params);
    densityLow.waste.densityInitialKgM3 *= 0.85;
    densityLow.waste.densityStabilizedKgM3 *= 0.85;
    const densityLowCore = computeCore(densityLow, 12);
    const density = sensitivity.rows.find((row) => row.id === "density");
    expect(density!.low.totalLeachateM3).toBeCloseTo(densityLowCore.leachate.totalLeachateM3, 6);

    const rainHigh = structuredClone(params);
    rainHigh.site.rainfallMmYr *= 1.25;
    rainHigh.site.maxMonthlyRainfallMm *= 1.25;
    rainHigh.site.maxDailyRainfallMm *= 1.25;
    const rainHighCore = computeCore(rainHigh, 12);
    const rainfall = sensitivity.rows.find((row) => row.id === "rainfall");
    expect(rainfall!.high.totalLeachateM3).toBeCloseTo(rainHighCore.leachate.totalLeachateM3, 6);
  });

  it("Monte Carlo es reproducible con la misma semilla", () => {
    const params = defaultScenarioParams();
    const a = runMonteCarlo(params, 12, 60, 20260101);
    const b = runMonteCarlo(params, 12, 60, 20260101);
    expect(a.metrics).toEqual(b.metrics);
    expect(a.metrics.lifeYears.p10).toBeLessThanOrEqual(a.metrics.lifeYears.p50);
    expect(a.metrics.lifeYears.p50).toBeLessThanOrEqual(a.metrics.lifeYears.p90);
  });
});

describe("autopruebas de la aplicación", () => {
  it("todas las verificaciones de referencia del motor aprueban", () => {
    const results = runSelfTests();
    const failed = results.filter((result) => !result.passed);
    expect(failed, failed.map((f) => `${f.id}: ${f.actual}`).join("; ")).toHaveLength(0);
  });
});

describe("biblioteca normativa peruana", () => {
  it("conserva 13 documentos únicos con estado, clasificación y fecha de contraste", () => {
    const documents = DEFAULT_DOCUMENTS;

    expect(documents).toHaveLength(13);
    expect(new Set(documents.map((doc) => doc.id)).size).toBe(13);

    for (const doc of documents) {
      expect(doc.title.length).toBeGreaterThan(3);
      expect(doc.number.length).toBeGreaterThan(2);
      expect(doc.sourceUrl).toMatch(/^https:\/\//);
      expect(doc.accessedAt).toBe("2026-11-04");
      expect(["vigente-verificado", "pendiente-verificacion", "referencia-historica"]).toContain(doc.status);
      expect(["requisito-legal", "recomendacion-tecnica", "parametro-configurable", "supuesto-modelo"]).toContain(
        doc.classification,
      );
    }

    expect(normativeStats(documents)).toEqual({
      total: 13,
      verified: 8,
      pending: 1,
      historical: 4,
      legal: 8,
    });

    const legacy = documents.filter((doc) => doc.id !== "doc-pe-ley32212");
    const migrated = reconcileDocuments(legacy);
    expect(migrated).toHaveLength(13);
    expect(migrated.some((doc) => doc.id === "doc-pe-ley32212")).toBe(true);

    const custom = { ...documents[0], id: "doc-propio", title: "Documento propio del usuario" };
    const merged = reconcileDocuments([...legacy, custom]);
    expect(merged).toHaveLength(14);
    expect(merged.some((doc) => doc.id === "doc-propio")).toBe(true);
  });

  it("cita la fuente oficial de las normas peruanas verificadas", () => {
    const peruvianVerified = DEFAULT_DOCUMENTS.filter(
      (doc) =>
        doc.status === "vigente-verificado" &&
        doc.classification === "requisito-legal" &&
        doc.issuer.includes("Perú"),
    );

    expect(peruvianVerified).toHaveLength(6);
    for (const doc of peruvianVerified) {
      expect(doc.sourceUrl).toMatch(/^https:\/\/(www\.gob\.pe|busquedas\.elperuano\.pe)\//);
      expect(doc.article.length).toBeGreaterThan(0);
      expect(doc.notes.toLowerCase()).toMatch(/vigente|publicad/);
    }

    const ley32212 = DEFAULT_DOCUMENTS.find((doc) => doc.number === "Ley N.° 32212");
    expect(ley32212?.status).toBe("vigente-verificado");
    expect(ley32212?.date).toBe("2024-12-21");
    expect(ley32212?.sourceUrl).toBe("https://busquedas.elperuano.pe/dispositivo/NL/2356497-1");

    const reglamento = DEFAULT_DOCUMENTS.find((doc) => doc.number === "Decreto Supremo N.° 014-2017-MINAM");
    expect(reglamento?.status).toBe("vigente-verificado");
    expect(reglamento?.sourceUrl).toBe("https://www.gob.pe/institucion/minam/normas-legales/3695-014-2017-minam");
  });
});

describe("verificación de localización R.M. 165-2021", () => {
  it("aprueba la matriz del sitio demostrativo y reporta cumplimiento", () => {
    const assessment = assessSiteSelection(defaultSite());
    expect(assessment.counts["no-cumple"]).toBe(0);
    expect(assessment.hardStops).toBe(0);
    expect(assessment.compliancePct).toBeGreaterThan(80);
    expect(["apto-precaucion", "observado", "incompleto"]).toContain(assessment.status);
  });

  it("marca no cumple cuando la distancia a población es menor a 500 m", () => {
    const site = defaultSite({
      siteSelection: {
        ...defaultSite().siteSelection,
        distanceToPopulationM: 320,
      },
    });
    const assessment = assessSiteSelection(site);
    const criterion = assessment.criteria.find((row) => row.id === "population");
    expect(criterion?.status).toBe("no-cumple");
    expect(assessment.status).toBe("no-apto");
    expect(assessment.hardStops).toBeGreaterThanOrEqual(1);
  });

  it("marca observado en la franja aeroportuaria de 4 a 13 km", () => {
    const site = defaultSite({
      siteSelection: { ...defaultSite().siteSelection, distanceToAirportM: 8_500 },
    });
    const assessment = assessSiteSelection(site);
    expect(assessment.criteria.find((row) => row.id === "airport")?.status).toBe("observado");
  });

  it("distingue sin dato de cumplimiento en las exclusiones", () => {
    const site = defaultSite({ siteSelection: { ...defaultSite().siteSelection, exclusions: {} } });
    const assessment = assessSiteSelection(site);
    expect(assessment.counts["sin-dato"]).toBeGreaterThanOrEqual(9);
    expect(assessment.status).toBe("incompleto");
  });

  it("convierte una exclusión declarada en restricción dura", () => {
    const base = defaultSite();
    const site = defaultSite({
      siteSelection: {
        ...base.siteSelection,
        exclusions: { ...base.siteSelection?.exclusions, wetlandOrAquiferRecharge: true },
      },
    });
    const assessment = assessSiteSelection(site);
    expect(assessment.exclusions.find((row) => row.id === "wetlandOrAquiferRecharge")?.status).toBe("no-cumple");
    expect(assessment.status).toBe("no-apto");
  });
});
