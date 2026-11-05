import type { DataQuality, SiteData } from "@/lib/types";

export interface SiteFieldDef {
  key: string;
  label: string;
  group: "físico" | "hidrogeológico" | "climático" | "territorial";
}

export const SITE_FIELDS: SiteFieldDef[] = [
  { key: "topography", label: "Topografía y pendientes", group: "físico" },
  { key: "geology", label: "Geología del emplazamiento", group: "físico" },
  { key: "geotechnics", label: "Geotecnia y ensayos de suelo", group: "físico" },
  { key: "hydrogeology", label: "Hidrogeología y nivel freático", group: "hidrogeológico" },
  { key: "permeability", label: "Permeabilidad del suelo", group: "hidrogeológico" },
  { key: "hydrology", label: "Hidrología superficial y escorrentía", group: "hidrogeológico" },
  { key: "climate", label: "Precipitación y evapotranspiración", group: "climático" },
  { key: "coverMaterial", label: "Disponibilidad de material de cobertura", group: "físico" },
  { key: "access", label: "Accesos y vías internas", group: "territorial" },
  { key: "landUse", label: "Uso de suelo y áreas sensibles", group: "territorial" },
  { key: "risks", label: "Riesgos naturales y condicionantes sociales", group: "territorial" },
  { key: "social", label: "Aceptación y consulta comunitaria", group: "territorial" },
];

export const DATA_QUALITY_LABEL: Record<DataQuality, string> = {
  measured: "Medido",
  estimated: "Estimado",
  assumed: "Supuesto",
  missing: "Faltante",
};

export interface SiteCompleteness {
  pct: number;
  measured: number;
  estimated: number;
  assumed: number;
  missing: number;
  missingLabels: string[];
  total: number;
}

export function computeSiteCompleteness(site: SiteData): SiteCompleteness {
  let weight = 0;
  let measured = 0;
  let estimated = 0;
  let assumed = 0;
  let missing = 0;
  const missingLabels: string[] = [];
  for (const field of SITE_FIELDS) {
    const q: DataQuality = (site.dataQuality?.[field.key] as DataQuality) ?? "missing";
    if (q === "measured") {
      weight += 1;
      measured += 1;
    } else if (q === "estimated") {
      weight += 0.6;
      estimated += 1;
    } else if (q === "assumed") {
      weight += 0.3;
      assumed += 1;
    } else {
      missing += 1;
      missingLabels.push(field.label);
    }
  }
  return {
    pct: (weight / SITE_FIELDS.length) * 100,
    measured,
    estimated,
    assumed,
    missing,
    missingLabels,
    total: SITE_FIELDS.length,
  };
}
