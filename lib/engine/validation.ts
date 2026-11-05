import type { Project, ScenarioParams, WasteParams } from "@/lib/types";
import { validateComposition } from "@/lib/types";
import type { CapacityResult } from "./capacity";
import type { ClosureResult } from "./closure";
import type { GasResult } from "./gas";
import type { GeotechResult } from "./geotech";
import type { GeometryResult } from "./geometry";
import type { LeachateResult } from "./leachate";
import type { SiteCompleteness } from "@/lib/siteFields";
import type { SiteSelectionAssessment } from "@/lib/siteSelection";
import type { WasteResult } from "./waste";

export type IssueSeverity = "error" | "warning" | "info";
export type IssueModule =
  | "site"
  | "geometry"
  | "cells"
  | "capacity"
  | "waste"
  | "leachate"
  | "gas"
  | "operation"
  | "geotech"
  | "closure"
  | "scenarios";

export interface Issue {
  id: string;
  severity: IssueSeverity;
  module: IssueModule;
  title: string;
  detail: string;
  reference?: string;
}

interface ValidationInput {
  project: Project;
  params: ScenarioParams;
  geometry: GeometryResult;
  capacity: CapacityResult;
  waste: WasteResult;
  leachate: LeachateResult;
  gas: GasResult;
  geotech: GeotechResult;
  closure: ClosureResult;
  completeness: SiteCompleteness;
  siteSelection: SiteSelectionAssessment;
}

function issue(
  severity: IssueSeverity,
  module: IssueModule,
  id: string,
  title: string,
  detail: string,
  reference?: string,
): Issue {
  return { id, severity, module, title, detail, reference };
}

function wasteChecks(waste: WasteParams): Issue[] {
  const issues: Issue[] = [];
  if (waste.population <= 0)
    issues.push(issue("error", "waste", "waste-pop", "Población servida inválida", "La población debe ser mayor que cero."));
  if (waste.perCapitaKgDay < 0.2 || waste.perCapitaKgDay > 2)
    issues.push(
      issue(
        "warning",
        "waste",
        "waste-ppc",
        "Generación per cápita fuera de rango típico",
        `El valor ${waste.perCapitaKgDay.toFixed(2)} kg/hab/día está fuera del rango 0.2–2.0. Verifique el estudio de caracterización.`,
        "MINAM 2011, p. 62",
      ),
    );
  if (waste.collectionCoveragePct < 0 || waste.collectionCoveragePct > 100)
    issues.push(issue("error", "waste", "waste-cov", "Cobertura de recolección inválida", "Debe estar entre 0 y 100 %."));
  if (waste.recoveryPct < 0 || waste.recoveryPct > 100)
    issues.push(issue("error", "waste", "waste-rec", "Tasa de recuperación inválida", "Debe estar entre 0 y 100 %."));
  const compError = validateComposition(waste.composition);
  if (compError)
    issues.push(issue("error", "waste", "waste-comp", "Composición de residuos inconsistente", compError));
  if (waste.densityInitialKgM3 < 400 || waste.densityInitialKgM3 > 1200)
    issues.push(
      issue(
        "warning",
        "waste",
        "waste-density",
        "Densidad inicial fuera de rango documentado",
        `${waste.densityInitialKgM3} kg/m³ está fuera del rango 400–1200 kg/m³. Honduras 2014 reporta 600–850 kg/m³ para relleno mecanizado y 400–500 kg/m³ para manual.`,
        "Honduras 2014, pp. 45-46 (PDF 46-47)",
      ),
    );
  if (waste.densityStabilizedKgM3 < waste.densityInitialKgM3)
    issues.push(
      issue(
        "error",
        "waste",
        "waste-density2",
        "Densidad estabilizada menor que la inicial",
        "La densidad final no puede ser menor que la densidad de compactación inicial.",
        "Honduras 2014, pp. 45-46 (PDF 46-47)",
      ),
    );
  if (waste.coverRatioPct < 10 || waste.coverRatioPct > 30)
    issues.push(
      issue(
        "warning",
        "waste",
        "waste-cover",
        "Relación de cobertura fuera de referencia",
        `${waste.coverRatioPct} % está fuera del rango 10–30 % citado para material de cobertura.`,
        "MINAM 2011, p. 63; Honduras 2014, p. 33 (PDF 34)",
      ),
    );
  if (waste.populationGrowthPct < -5 || waste.populationGrowthPct > 8)
    issues.push(
      issue("warning", "waste", "waste-popgrowth", "Crecimiento poblacional atípico", "Revise la tasa anual de crecimiento (rango de control: −5 % a 8 %)."),
    );
  return issues;
}

export function validateModel(input: ValidationInput): Issue[] {
  const { project, params, geometry, capacity, waste, leachate, gas, geotech, closure, completeness, siteSelection } = input;
  const issues: Issue[] = [];
  const siteAreaM2 = params.site.areaHa * 10_000;

  if (geometry.cells.length === 0) {
    issues.push(issue("error", "geometry", "geo-none", "No hay celdas de disposición", "Agregue al menos una celda para calcular capacidad y operación."));
  }
  for (const cell of geometry.cells) {
    if (!cell.valid) {
      issues.push(
        issue("error", "cells", `cell-invalid-${cell.id}`, `Geometría inválida en ${cell.name}`, cell.warnings.join(" "), "Integración de secciones"),
      );
    }
    for (const w of cell.warnings) {
      if (cell.valid) issues.push(issue("warning", "cells", `cell-warn-${cell.id}-${w.slice(0, 8)}`, `${cell.name}: revisión geométrica`, w));
    }
  }

  if (siteAreaM2 > 0 && geometry.footprintAreaM2 > siteAreaM2) {
    issues.push(
      issue(
        "error",
        "site",
        "site-area",
        "Huella de celdas mayor que el área disponible",
        `La huella modelada (${geometry.footprintAreaM2.toFixed(0)} m²) supera el área declarada (${siteAreaM2.toFixed(0)} m²).`,
      ),
    );
  }

  const terrain = params.geometry.terrainBaseElevationM;
  const minBase = geometry.cells.length ? Math.min(...geometry.cells.map((c) => c.baseElevationM)) : terrain;
  const groundwaterElevation = terrain - params.site.waterTableDepthM;
  const separation = minBase - groundwaterElevation;
  if (params.site.waterTableDepthM <= 0) {
    issues.push(issue("error", "site", "site-gw0", "Nivel freático no definido", "Registre la profundidad al nivel freático más alto."));
  } else if (separation < 0) {
    issues.push(
      issue(
        "error",
        "site",
        "site-gw",
        "El fondo de la celda está por debajo del nivel freático",
        `Separación estimada: ${separation.toFixed(1)} m. Reduzca la profundidad de excavación o revise el dato hidrogeológico.`,
        "Honduras 2014, p. 39 (PDF 40)",
      ),
    );
  } else if (separation < 3) {
    issues.push(
      issue(
        "warning",
        "site",
        "site-gw3",
        "Separación al nivel freático menor que 3 m",
        `Separación estimada: ${separation.toFixed(1)} m. La referencia técnica recomienda no menos de 3 m.`,
        "Honduras 2014, p. 39 (PDF 40)",
      ),
    );
  }

  const siteKcmS = params.site.permeabilityMs * 100;
  if (params.site.permeabilityMs > 0 && siteKcmS > 1e-5) {
    issues.push(
      issue(
        "warning",
        "site",
        "site-k",
        "Permeabilidad natural elevada",
        `k = ${siteKcmS.toExponential(2)} cm/s. La referencia recomienda una capa de suelo ≤ 1×10⁻⁵ cm/s entre el fondo y el nivel freático.`,
        "Honduras 2014, p. 39 (PDF 40)",
      ),
    );
  }

  const clay = params.geometry.layers.find((l) => l.enabled && l.category === "clay");
  const gm = params.geometry.layers.find((l) => l.enabled && l.category === "geomembrane");
  const dailyCover = params.geometry.layers.find((l) => l.enabled && (l.category === "daily-cover" || l.category === "intermediate-cover"));
  if (!clay && !gm) {
    issues.push(
      issue(
        "warning",
        "cells",
        "cells-barrier",
        "Sistema de impermeabilización incompleto",
        "No se ha definido barrera mineral ni geomembrana. La referencia de Honduras 2014 exige estimar la impermeabilización según población e hidrogeología.",
        "Honduras 2014, pp. 50-51 (PDF 51-52)",
      ),
    );
  }
  if (clay && clay.thicknessMm < 400) {
    issues.push(
      issue(
        "warning",
        "cells",
        "cells-clay",
        "Espesor de arcilla menor que la referencia",
        `${clay.thicknessMm} mm < 400 mm. La Guía MINAM 2019 exige una barrera mineral de 0,40 m con k ≤ 1×10⁻⁶ cm/s (o justificar la barrera geológica natural).`,
        "Guía MINAM 2019, pp. 60-64 (PDF 62-66); D.S. 014-2017-MINAM, art. 114",
      ),
    );
  }
  if (clay && clay.permeabilityMs !== undefined && clay.permeabilityMs > 1e-9) {
    issues.push(
      issue(
        "warning",
        "cells",
        "cells-clayk",
        "Permeabilidad de arcilla mayor que 1×10⁻⁹ m/s",
        "La Guía MINAM 2019 solicita ≤ 1×10⁻⁶ cm/s (1×10⁻⁸ m/s) para la barrera mineral; el umbral de 1×10⁻⁹ m/s es una práctica conservadora.",
        "Guía MINAM 2019, p. 13 y §12.9 (PDF 62)",
      ),
    );
  }
  if (gm && gm.thicknessMm < 1.2) {
    issues.push(
      issue(
        "warning",
        "cells",
        "cells-gm",
        "Espesor de geomembrana menor que 1,2 mm",
        `${gm.thicknessMm} mm < 1,2 mm. La Guía MINAM 2019 fija 1,2 mm como espesor mínimo de HDPE cuando se usa impermeabilización sintética.`,
        "Guía MINAM 2019, §12.9 (PDF 62); D.S. 014-2017-MINAM, art. 114",
      ),
    );
  }
  if (dailyCover && dailyCover.thicknessMm < 150) {
    issues.push(
      issue(
        "info",
        "cells",
        "cells-daily",
        "Cobertura diaria menor que 150 mm",
        "La referencia recomienda 150–200 mm compactados para control de vectores.",
        "Honduras 2014, p. 42; MINAM 2011, p. 64",
      ),
    );
  }

  // --- Barrera de fondo según Guía MINAM 2019 ---------------------------
  const barrierK = params.leachate.linerPermeabilityMs;
  if (barrierK > 1e-8) {
    issues.push(
      issue(
        "error",
        "cells",
        "cells-barrier-k",
        "Barrera de fondo con permeabilidad mayor que 1×10⁻⁶ cm/s",
        `k = ${barrierK.toExponential(2)} m/s. La Guía MINAM 2019 exige k ≤ 1×10⁻⁶ cm/s (1×10⁻⁸ m/s) en 0,40 m, salvo barrera geológica natural justificada.`,
        "Guía MINAM 2019, p. 13 y §12.9; D.S. 014-2017-MINAM, art. 114",
      ),
    );
  }
  const barrierIsMineral = Boolean(
    clay && clay.thicknessMm >= 400 && (clay.permeabilityMs ?? params.site.permeabilityMs) <= 1e-8,
  );
  const geotextile = params.geometry.layers.find((l) => l.enabled && l.category === "geotextile");
  if (!barrierIsMineral) {
    if (!gm) {
      issues.push(
        issue(
          "error",
          "cells",
          "cells-barrier-none",
          "No se cumple la barrera mineral ni existe geomembrana",
          "La barrera mineral declarada no alcanza 0,40 m o k ≤ 1×10⁻⁶ cm/s. Se requiere geomembrana HDPE ≥ 1,2 mm con geotextil, o justificar la barrera geológica natural.",
          "Guía MINAM 2019, §12.9 (PDF 62); D.S. 014-2017-MINAM, art. 114",
        ),
      );
    } else if (gm.thicknessMm < 1.2) {
      issues.push(
        issue(
          "warning",
          "cells",
          "cells-barrier-gm",
          "Barrera sintética de reemplazo insuficiente",
          "La barrera mineral no cumple; la geomembrana debe tener al menos 1,2 mm y estar protegida con geotextil no tejido.",
          "Guía MINAM 2019, §12.9",
        ),
      );
    }
    if (!geotextile) {
      issues.push(
        issue(
          "warning",
          "cells",
          "cells-barrier-gtx",
          "Falta geotextil de protección en la barrera sintética",
          "La Guía MINAM 2019 exige geomembrana protegida con geotextil no tejido cuando se opta por impermeabilización sintética.",
          "Guía MINAM 2019, §12.9 (PDF 62)",
        ),
      );
    }
  }

  // --- Clasificación por caudal y captura de gas ------------------------
  const operatingYears = Math.max(waste.operatingYears, 1);
  const averageDailyT = waste.totalLandfilledT / (operatingYears * 365);
  const peakDailyT = waste.annual.reduce((max, row) => Math.max(max, row.landfilledT / 365), 0);
  if (peakDailyT > 200) {
    issues.push(
      issue(
        "info",
        "gas",
        "gas-central",
        "Captura y quema centralizada de gases requerida por caudal",
        `Caudal pico estimado: ${peakDailyT.toFixed(1)} t/día (> 200 t/día). La Guía MINAM 2019 exige implementar progresivamente captura y quema centralizada, además de los drenes verticales.`,
        "Guía MINAM 2019, Cuadro N°43, p. 165 (PDF 83)",
      ),
    );
  } else if (peakDailyT > 0) {
    issues.push(
      issue(
        "info",
        "gas",
        "gas-conv",
        "Captura y quema convencional de gases",
        `Caudal pico estimado: ${peakDailyT.toFixed(1)} t/día (< 200 t/día). La Guía MINAM 2019 admite captura y quema convencional con drenes verticales.`,
        "Guía MINAM 2019, Cuadro N°43, p. 165 (PDF 83)",
      ),
    );
  }
  if (averageDailyT > 50 && params.site.facilityType === "celda-transitoria") {
    issues.push(
      issue(
        "warning",
        "operation",
        "op-class",
        "Caudal incompatible con una celda transitoria",
        `Promedio estimado: ${averageDailyT.toFixed(1)} t/día. La Guía MINAM 2019 clasifica como mecanizado el rango > 50 t/día y limita la celda transitoria a una vida útil máxima de 3 años.`,
        "Guía MINAM 2019, pp. 12-13 y Cuadro N°01",
      ),
    );
  }

  // --- Verificación de localización (R.M. 165-2021 / art. 110) ----------
  for (const criterion of siteSelection.criteria) {
    if (criterion.status === "no-cumple") {
      issues.push(
        issue(
          criterion.kind === "legal" ? "error" : "warning",
          "site",
          `site-sel-${criterion.id}`,
          `Localización: ${criterion.label} no cumple`,
          `${criterion.note} Valor declarado: ${criterion.displayValue}; referencia: ${criterion.requirement}.`,
          criterion.source,
        ),
      );
    } else if (criterion.status === "observado") {
      issues.push(
        issue(
          "warning",
          "site",
          `site-sel-${criterion.id}`,
          `Localización: ${criterion.label} requiere verificación`,
          `${criterion.note} Valor declarado: ${criterion.displayValue}; referencia: ${criterion.requirement}.`,
          criterion.source,
        ),
      );
    }
  }
  for (const exclusion of siteSelection.exclusions) {
    if (exclusion.status === "no-cumple") {
      issues.push(
        issue(
          "error",
          "site",
          `site-excl-${exclusion.id}`,
          `Exclusión de localización: ${exclusion.label}`,
          "El área declarada se superpone con una exclusión de la R.M. 165-2021. La guía admite análisis de superposición y medidas de adaptación solo en los supuestos expresamente previstos; requiere sustento técnico y legal.",
          exclusion.source,
        ),
      );
    }
  }
  if (siteSelection.counts["sin-dato"] > 0) {
    issues.push(
      issue(
        "info",
        "site",
        "site-sel-missing",
        `Verificación de localización incompleta (${siteSelection.counts["sin-dato"]} criterios sin dato)`,
        "Complete distancias, pendiente y exclusiones en el módulo Emplazamiento para cerrar la matriz preliminar. La ausencia de dato no equivale a cumplimiento.",
        "R.M. 165-2021-MINAM, anexo, Tabla 6",
      ),
    );
  }

  if (capacity.wasteVolumeM3 <= 0) {
    issues.push(issue("error", "capacity", "cap-zero", "Capacidad útil nula", "El volumen disponible es cero. Revise geometría, capas y factor de utilización."));
  }
  if (capacity.utilizationFactor < 0.5) {
    issues.push(
      issue(
        "warning",
        "capacity",
        "cap-util",
        "Factor de utilización muy bajo",
        `FU = ${(capacity.utilizationFactor * 100).toFixed(0)} %. Verifique si el valor refleja una restricción real.`,
      ),
    );
  }
  if (waste.exhaustionYear === null) {
    issues.push(
      issue(
        "info",
        "capacity",
        "cap-life",
        "Capacidad no agotada en el horizonte simulado",
        "La simulación termina por horizonte, no por agotamiento. Amplíe el horizonte para conocer la vida útil.",
      ),
    );
  } else if (waste.operatingYears < 5) {
    issues.push(
      issue(
        "warning",
        "capacity",
        "cap-life5",
        "Vida útil menor que 5 años",
        `Vida útil estimada: ${waste.operatingYears.toFixed(1)} años. La referencia MINAM señala un mínimo de 5 años y recomienda ≥ 10 años.`,
        "MINAM 2011, p. 62",
      ),
    );
  }

  issues.push(...wasteChecks(params.waste));

  const hasOperationData = waste.annual.some((r) => r.landfilledT > 0);
  if (!hasOperationData) {
    issues.push(issue("warning", "operation", "op-empty", "Sin residuos dispuestos en la simulación", "Revise población, cobertura y capacidad."));
  }
  if (params.operation.workingFaceAreaM2 < 100) {
    issues.push(
      issue("warning", "operation", "op-face", "Frente de trabajo menor que 100 m²", "Revise el ancho mínimo para maniobras de vehículos y compactación."),
    );
  }

  const reuse = Math.max(0, params.leachate.incomingMoisturePct - params.leachate.fieldCapacityPct);
  if (reuse > 0 && params.leachate.incomingMoisturePct > 70) {
    issues.push(
      issue("warning", "leachate", "leach-moist", "Humedad de ingreso muy alta", "El rango documentado para RSM en países en desarrollo es 30–60 % (peso húmedo).", "MINAM 2011, p. 77"),
    );
  }
  if (Math.abs(leachate.waterBalanceClosurePct - 100) > 0.5) {
    issues.push(
      issue(
        "error",
        "leachate",
        "leach-closure",
        "El balance hídrico no cierra",
        `Cierre calculado: ${leachate.waterBalanceClosurePct.toFixed(2)} %. Revise precipitación, ET y escorrentía.`,
        "MINAM 2011, pp. 75-76",
      ),
    );
  }
  if (leachate.pipeStatus === "insufficient") {
    issues.push(
      issue(
        "warning",
        "leachate",
        "leach-pipe",
        "Capacidad de tubería insuficiente para el caudal pico",
        `Utilización ${leachate.pipeUtilizationPct?.toFixed(0)} %. Aumente diámetro o pendiente, o verifique el caudal de diseño.`,
        "MINAM 2011, p. 72",
      ),
    );
  }
  if (leachate.pipeUtilizationPct === null) {
    issues.push(issue("info", "leachate", "leach-nopipe", "Sin verificación hidráulica de tubería", "Complete diámetro, pendiente y rugosidad para calcular capacidad con Manning."));
  }
  if (leachate.pipeUtilizationPct !== null && leachate.pipeUtilizationPct > 85 && leachate.pipeUtilizationPct <= 100) {
    issues.push(
      issue("info", "leachate", "leach-util", "Tubería cerca de su capacidad a sección llena", `Utilización ${leachate.pipeUtilizationPct.toFixed(0)} %. Revise flujo parcial y aireación.`),
    );
  }
  if (params.leachate.linerPermeabilityMs > 1e-9) {
    issues.push(
      issue("warning", "leachate", "leach-linerk", "Permeabilidad de la barrera mayor que 1×10⁻⁹ m/s", "La fuga calculada por Darcy puede ser relevante; verifique el diseño de la barrera."),
    );
  }
  const maxAnnualLeachate = leachate.annual.reduce((m, r) => Math.max(m, r.leachateM3), 0);
  if (params.leachate.treatmentCapacityM3Day * 365 < maxAnnualLeachate) {
    issues.push(
      issue("warning", "leachate", "leach-treat", "Capacidad de tratamiento menor que el volumen anual pico", "Ajuste el almacenamiento o la capacidad de tratamiento; el déficit se reporta como no tratado."),
    );
  }

  if (params.gas.k <= 0) issues.push(issue("error", "gas", "gas-k", "Constante k inválida", "La constante de decaimiento debe ser mayor que cero."));
  if (params.gas.ch4Fraction <= 0 || params.gas.ch4Fraction > 1) issues.push(issue("error", "gas", "gas-frac", "Fracción de metano inválida", "Debe estar entre 0 y 1."));
  if (params.gas.ch4Fraction < 0.4 || params.gas.ch4Fraction > 0.6)
    issues.push(
      issue(
        "warning",
        "gas",
        "gas-frac2",
        "Fracción de metano fuera de 40–60 %",
        "La referencia reporta 40–60 % de CH₄ en la fase metanogénica estable.",
        "MINAM 2011, p. 88 (PDF 88)",
      ),
    );
  if (params.gas.collectionEfficiencyPct < 0 || params.gas.collectionEfficiencyPct > 100)
    issues.push(issue("error", "gas", "gas-eff", "Eficiencia de captación inválida", "Debe estar entre 0 y 100 %."));
  if (params.gas.oxidationPct > 100 || params.gas.oxidationPct < 0)
    issues.push(issue("error", "gas", "gas-ox", "Eficiencia de oxidación inválida", "Debe estar entre 0 y 100 %."));

  if (geotech.factorOfSafety < 1.0) {
    issues.push(
      issue(
        "error",
        "geotech",
        "geo-fs1",
        "Factor de seguridad conceptual menor que 1.0",
        `FS = ${geotech.factorOfSafety.toFixed(2)}. El talud es inestable bajo las hipótesis del método de talud infinito.`,
        "Modelo interno; verificar con estudio geotécnico",
      ),
    );
  } else if (geotech.factorOfSafety < 1.3) {
    issues.push(
      issue(
        "warning",
        "geotech",
        "geo-fs13",
        "Factor de seguridad bajo (FS < 1.3)",
        `FS = ${geotech.factorOfSafety.toFixed(2)}. Se requiere análisis especializado; el método implementado solo cubre traslación superficial.`,
        "Modelo interno; verificar con estudio geotécnico",
      ),
    );
  }

  const closureBarrier = params.closure.finalCoverLayers.some(
    (l) => l.enabled && (l.material.toLowerCase().includes("arcilla") || l.material.toLowerCase().includes("hdpe") || l.name.toLowerCase().includes("barrera")),
  );
  if (!closureBarrier) {
    issues.push(
      issue("warning", "closure", "closure-barrier", "Cobertura final sin barrera de baja permeabilidad", "Incorpore una capa mineral o geosintética según el diseño y la normativa aplicable."),
    );
  }
  if (closure.finalCoverThicknessMm < 500) {
    issues.push(
      issue(
        "info",
        "closure",
        "closure-thick",
        "Espesor total de cobertura final menor que 500 mm",
        "La referencia MINAM cita cobertura final no menor de 0.50 m; confirme el requisito aplicable vigente.",
        "MINAM 2011, p. 64",
      ),
    );
  }
  if (params.closure.monitoringPoints.length === 0)
    issues.push(issue("warning", "closure", "closure-mon", "Sin puntos de monitoreo", "Configure al menos un punto de lixiviados, aguas subterráneas, biogás o asentamientos."));
  if (closure.alerts > 0)
    issues.push(issue("info", "closure", "closure-alerts", `${closure.alerts} puntos de monitoreo en alerta o sin datos`, "Revise el módulo de clausura y posclausura."));

  const neededCover = closure.totalCoverMaterialM3;
  if (params.site.coverMaterialAvailableM3 > 0 && params.site.coverMaterialAvailableM3 < neededCover) {
    issues.push(
      issue(
        "warning",
        "site",
        "site-covermat",
        "Material de cobertura insuficiente",
        `Disponible: ${params.site.coverMaterialAvailableM3.toLocaleString("es-PE")} m³; requerido estimado: ${neededCover.toLocaleString("es-PE")} m³.`,
        "MINAM 2011, p. 63; Honduras 2014, p. 36 (PDF 37)",
      ),
    );
  }

  if (completeness.missing > 0) {
    issues.push(
      issue(
        "info",
        "site",
        "site-complete",
        `Información de emplazamiento incompleta (${completeness.missing}/${completeness.total})`,
        `Faltan: ${completeness.missingLabels.join(", ")}. La completitud no equivale a aptitud del sitio.`,
      ),
    );
  }
  if (project.scenarios.length < 2) {
    issues.push(issue("info", "scenarios", "scen-one", "Solo existe el escenario base", "Cree escenarios alternativos para comparar capacidad, lixiviados y metano."));
  }

  const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}
