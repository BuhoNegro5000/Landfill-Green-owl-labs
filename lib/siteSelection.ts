import type { SiteData, SiteExclusions, SiteSelectionData } from "@/lib/types";

/**
 * Verificación preliminar de localización basada en:
 * - R.M. N.° 165-2021-MINAM, anexo: Guía para la identificación de zonas
 *   potenciales para infraestructura de disposición final de RSM (Tabla 1,
 *   Tabla 2 y Tabla 6).
 * - D.S. N.° 014-2017-MINAM, artículo 110, citado por la Guía MINAM 2019
 *   (pp. 12-13).
 *
 * La verificación es declarativa: compara los datos ingresados por el usuario
 * contra distancias y exclusiones de referencia. No reemplaza el modelamiento
 * SIG, la verificación de campo ni la revisión de la autoridad competente.
 */

export type SiteCriterionStatus = "cumple" | "observado" | "no-cumple" | "sin-dato";

export interface SiteCriterionResult {
  id: string;
  label: string;
  requirement: string;
  valueM: number | null;
  unit: string;
  displayValue: string;
  status: SiteCriterionStatus;
  kind: "legal" | "tecnico";
  source: string;
  note: string;
}

export interface SiteExclusionResult {
  id: keyof SiteExclusions;
  label: string;
  status: SiteCriterionStatus;
  source: string;
}

export interface SiteSelectionAssessment {
  criteria: SiteCriterionResult[];
  exclusions: SiteExclusionResult[];
  counts: Record<SiteCriterionStatus, number>;
  /** Porcentaje de verificación: cumple = 1, observado = 0,5, resto = 0. */
  compliancePct: number;
  hardStops: number;
  status: "apto-precaucion" | "observado" | "no-apto" | "incompleto";
  statusLabel: string;
  headline: string;
  disclaimer: string;
}

const SOURCE_RM = "R.M. 165-2021-MINAM, anexo, Tabla 6 (p. 18)";
const SOURCE_DS = "D.S. 014-2017-MINAM, art. 110, citado en Guía MINAM 2019, pp. 12-13";
const SOURCE_2019 = "Guía MINAM 2019, pp. 12-13";
const SOURCE_TECH = "R.M. 165-2021-MINAM, anexo, Tabla 6, nota ** (p. 18)";

export interface SiteCriterionDefinition {
  id: string;
  label: string;
  requirement: string;
  unit: string;
  kind: "legal" | "tecnico";
  source: string;
  evaluate: (site: SiteData) => { value: number | null; status: SiteCriterionStatus; note: string };
}

function selection(site: SiteData): SiteSelectionData {
  return site.siteSelection ?? {};
}

function distance(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function minimum(
  value: number | null,
  limit: number,
  unit: string,
  passNote: string,
  failNote: string,
): { value: number | null; status: SiteCriterionStatus; note: string } {
  if (value === null) return { value: null, status: "sin-dato", note: "Registre la distancia para verificar el criterio." };
  return {
    value,
    status: value >= limit ? "cumple" : "no-cumple",
    note: value >= limit ? passNote : `${failNote} Referencia: ≥ ${limit.toLocaleString("es-PE")} ${unit}.`,
  };
}

export const SITE_CRITERIA: SiteCriterionDefinition[] = [
  {
    id: "population",
    label: "Distancia a centros poblados",
    requirement: "≥ 500 m",
    unit: "m",
    kind: "legal",
    source: SOURCE_DS,
    evaluate: (site) => ({
      ...minimum(selection(site).distanceToPopulationM ?? null, 500, "m", "Cumple la distancia mínima de referencia.", "La infraestructura se ubica a menos de 500 m de un centro poblado."),
      note:
        selection(site).distanceToPopulationM === null || selection(site).distanceToPopulationM === undefined
          ? "Registre la distancia al centro poblado más cercano."
          : selection(site).distanceToPopulationM! >= 500
            ? "Cumple la distancia mínima de referencia. La excepción por IGA debe sustentarse técnicamente."
            : "La infraestructura se ubica a menos de 500 m de un centro poblado. Se requiere excepción sustentada en el IGA.",
    }),
  },
  {
    id: "surface-water",
    label: "Distancia a fuentes de agua superficial",
    requirement: "≥ 500 m",
    unit: "m",
    kind: "legal",
    source: SOURCE_DS,
    evaluate: (site) =>
      minimum(
        distance(site.distanceToWaterM),
        500,
        "m",
        "Cumple la distancia mínima a cauces, lagos o lagunas.",
        "La infraestructura se ubica a menos de 500 m de una fuente superficial.",
      ),
  },
  {
    id: "infrastructure",
    label: "Distancia a infraestructura existente",
    requirement: "≥ 500 m",
    unit: "m",
    kind: "legal",
    source: SOURCE_RM,
    evaluate: (site) =>
      minimum(
        selection(site).distanceToInfrastructureM ?? null,
        500,
        "m",
        "Cumple la distancia a embalses, represas y obras hidroeléctricas.",
        "La infraestructura se ubica a menos de 500 m de una obra civil existente.",
      ),
  },
  {
    id: "agriculture",
    label: "Distancia a áreas agrícolas",
    requirement: "≥ 500 m",
    unit: "m",
    kind: "legal",
    source: SOURCE_RM,
    evaluate: (site) =>
      minimum(
        selection(site).distanceToAgricultureM ?? null,
        500,
        "m",
        "Cumple la distancia a áreas agrícolas.",
        "La infraestructura se ubica a menos de 500 m de un área agrícola.",
      ),
  },
  {
    id: "farms",
    label: "Distancia a granjas porcinas y avícolas",
    requirement: "5 000–10 000 m",
    unit: "m",
    kind: "legal",
    source: `${SOURCE_RM}; D.S. 029-2007-AG, art. 52`,
    evaluate: (site) => {
      const value = distance(selection(site).distanceToFarmsM ?? null);
      if (value === null) return { value: null, status: "sin-dato", note: "Registre la distancia a la granja más cercana." };
      if (value < 5_000) {
        return {
          value,
          status: "no-cumple",
          note: "La distancia es menor a 5 km. Verifique el artículo 52 del Reglamento del Sistema Sanitario Avícola (D.S. 029-2007-AG).",
        };
      }
      if (value <= 10_000) {
        return { value, status: "cumple", note: "Dentro de la franja de referencia de 5 a 10 km." };
      }
      return {
        value,
        status: "cumple",
        note: "No se identifica restricción por proximidad; la franja de referencia es 5–10 km.",
      };
    },
  },
  {
    id: "faults",
    label: "Distancia a fallas geológicas",
    requirement: "≥ 1 000 m",
    unit: "m",
    kind: "legal",
    source: SOURCE_RM,
    evaluate: (site) =>
      minimum(
        selection(site).distanceToFaultsM ?? null,
        1_000,
        "m",
        "Cumple la distancia mínima a fallas geológicas.",
        "La infraestructura se ubica a menos de 1 km de una falla geológica.",
      ),
  },
  {
    id: "airport",
    label: "Distancia a aeródromos",
    requirement: "≥ 13 000 m (Guía 2019); franja 4–13 km sujeta a estudio",
    unit: "m",
    kind: "legal",
    source: `${SOURCE_2019}; ${SOURCE_RM}`,
    evaluate: (site) => {
      const value = distance(selection(site).distanceToAirportM ?? null);
      if (value === null) return { value: null, status: "sin-dato", note: "Registre la distancia al aeródromo más cercano." };
      if (value >= 13_000) {
        return { value, status: "cumple", note: "Cumple la distancia mínima de 13 km de la Guía MINAM 2019." };
      }
      if (value >= 4_000) {
        return {
          value,
          status: "observado",
          note: "Se ubica en la franja de 4 a 13 km. La Guía 2019 exige ≥ 13 km; la R.M. 165-2021 admite evaluación del riesgo operacional (DGAC).",
        };
      }
      return {
        value,
        status: "no-cumple",
        note: "La infraestructura se ubica a menos de 4 km de un aeródromo; existe restricción por riesgo operacional.",
      };
    },
  },
  {
    id: "slope",
    label: "Pendiente del terreno",
    requirement: "< 25 %",
    unit: "%",
    kind: "tecnico",
    source: SOURCE_TECH,
    evaluate: (site) => {
      const value = distance(selection(site).slopePct ?? null);
      if (value === null) return { value: null, status: "sin-dato", note: "Registre la pendiente predominante del área." };
      if (value < 25) return { value, status: "cumple", note: "Cumple el criterio técnico de pendiente < 25 %." };
      if (value <= 30) {
        return {
          value,
          status: "observado",
          note: "La guía admite flexibilidad en el criterio de 25 % según el relieve, verificable en campo.",
        };
      }
      return {
        value,
        status: "no-cumple",
        note: "Pendiente superior al 30 %. Se requiere justificación técnica y verificación de campo.",
      };
    },
  },
];

export const SITE_EXCLUSIONS: { id: keyof SiteExclusions; label: string; source: string }[] = [
  { id: "floodOrMassMovement", label: "Peligro o susceptibilidad por inundación y movimientos en masa", source: SOURCE_RM },
  { id: "protectedArea", label: "Áreas Naturales Protegidas", source: SOURCE_RM },
  { id: "wetlandOrAquiferRecharge", label: "Pantanos, humedales o recarga de acuíferos", source: SOURCE_RM },
  { id: "riverMarginalStrip", label: "Faja marginal de ríos", source: SOURCE_RM },
  { id: "marineCoastalStrip", label: "Franja marino-costera", source: SOURCE_RM },
  { id: "culturalHeritage", label: "Patrimonio cultural", source: SOURCE_RM },
  { id: "miningOrPetroleumConcession", label: "Concesiones mineras o petroleras en explotación", source: SOURCE_RM },
  { id: "forestConcession", label: "Concesiones forestales", source: SOURCE_RM },
  { id: "campesinoOrNativeCommunity", label: "Comunidades campesinas y nativas", source: SOURCE_RM },
];

const STATUS_LABEL: Record<SiteCriterionStatus, string> = {
  cumple: "Cumple",
  observado: "Observado",
  "no-cumple": "No cumple",
  "sin-dato": "Sin dato",
};

export function siteCriterionStatusLabel(status: SiteCriterionStatus): string {
  return STATUS_LABEL[status];
}

export function formatDistance(value: number | null, unit: string): string {
  if (value === null) return "Sin dato";
  if (unit === "%") return `${value.toFixed(1).replace(".", ",")} %`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2).replace(".", ",")} km`;
  return `${value.toFixed(0)} m`;
}

export function assessSiteSelection(site: SiteData): SiteSelectionAssessment {
  const criteria: SiteCriterionResult[] = SITE_CRITERIA.map((definition) => {
    const evaluated = definition.evaluate(site);
    return {
      id: definition.id,
      label: definition.label,
      requirement: definition.requirement,
      unit: definition.unit,
      kind: definition.kind,
      source: definition.source,
      valueM: evaluated.value,
      displayValue: formatDistance(evaluated.value, definition.unit),
      status: evaluated.status,
      note: evaluated.note,
    };
  });

  const flags = selection(site).exclusions ?? {};
  const exclusions: SiteExclusionResult[] = SITE_EXCLUSIONS.map((definition) => {
    const flag = flags[definition.id];
    const status: SiteCriterionStatus = flag === true ? "no-cumple" : flag === false ? "cumple" : "sin-dato";
    return { id: definition.id, label: definition.label, status, source: definition.source };
  });

  const counts: Record<SiteCriterionStatus, number> = { cumple: 0, observado: 0, "no-cumple": 0, "sin-dato": 0 };
  for (const item of [...criteria, ...exclusions]) counts[item.status] += 1;

  const total = criteria.length + exclusions.length;
  const compliancePct = total > 0 ? ((counts.cumple + counts.observado * 0.5) / total) * 100 : 0;
  const hardStops = counts["no-cumple"];
  const status: SiteSelectionAssessment["status"] =
    hardStops > 0 ? "no-apto" : counts.observado > 0 ? "observado" : counts["sin-dato"] > 0 ? "incompleto" : "apto-precaucion";

  const statusLabel: Record<SiteSelectionAssessment["status"], string> = {
    "apto-precaucion": "Sin restricciones identificadas",
    observado: "Requiere verificación",
    "no-apto": "Restricción identificada",
    incompleto: "Información incompleta",
  };

  const headline =
    status === "no-apto"
      ? `${hardStops} criterio(s) no cumplen. La localización no es admisible sin subsanación o excepción sustentada.`
      : status === "observado"
        ? `${counts.observado} criterio(s) requieren verificación adicional antes de continuar.`
        : status === "incompleto"
          ? `${counts["sin-dato"]} criterio(s) no tienen dato. Complete la matriz para cerrar la verificación preliminar.`
          : "Los criterios declarados no identifican restricciones. Continúe con SIG, campo y evaluación ambiental.";

  return {
    criteria,
    exclusions,
    counts,
    compliancePct,
    hardStops,
    status,
    statusLabel: statusLabel[status],
    headline,
    disclaimer:
      "Verificación declarativa, no un dictamen de aptitud. La R.M. 165-2021 exige modelamiento SIG y validación de campo; el artículo 110 del D.S. 014-2017-MINAM mantiene excepciones sujetas al IGA y a la autoridad competente.",
  };
}
