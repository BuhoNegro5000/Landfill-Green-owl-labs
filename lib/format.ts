export const nf0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nf3 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function fmt(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const formatter = digits === 0 ? nf0 : digits === 1 ? nf1 : digits === 2 ? nf2 : nf3;
  return formatter.format(value);
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${fmt(value, digits)} %`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${fmt(value / 1_000_000, 2)} M`;
  if (abs >= 1_000) return `${fmt(value / 1_000, 1)} k`;
  return fmt(value, 0);
}

export function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `US$ ${fmt(value, 0)}`;
}

export function fmtYears(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${fmt(value, 1)} años`;
}

/** Presentation-only conversions. Internal model always uses SI. */
export function toImperial(value: number, kind: "length" | "volume" | "mass" | "area"): number {
  switch (kind) {
    case "length":
      return value * 3.28084;
    case "volume":
      return value * 1.30795;
    case "mass":
      return value * 1.10231;
    case "area":
      return value * 10.7639;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function percentDelta(value: number, base: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
  return ((value - base) / base) * 100;
}
