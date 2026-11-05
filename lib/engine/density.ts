import type { WasteParams } from "@/lib/types";

/**
 * Design density used for capacity and annual volume.
 * Honduras 2014 (p.46-49) differentiates the freshly compacted density from the
 * final stabilised density and uses the chosen basis year by year.
 */
export function designDensity(waste: WasteParams): number {
  return waste.capacityDensityBasis === "stabilized"
    ? Math.max(waste.densityStabilizedKgM3, 1)
    : Math.max(waste.densityInitialKgM3, 1);
}

export function densityLabel(waste: WasteParams): string {
  return waste.capacityDensityBasis === "stabilized" ? "densidad final estabilizada" : "densidad inicial compactada";
}
