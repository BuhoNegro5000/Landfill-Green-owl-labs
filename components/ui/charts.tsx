"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui";

export const CHART_COLORS = {
  leaf: "#79CE4C",
  leafDeep: "#3E9B2E",
  blue: "#4FA8C7",
  amber: "#D8A33A",
  orange: "#D4683C",
  clay: "#A47A54",
  purple: "#9B8AD6",
  gray: "#88958C",
  danger: "#C0553F",
  grid: "rgba(255,255,255,0.07)",
  text: "#9AA69E",
};

export const SERIES_COLORS = [
  CHART_COLORS.leaf,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.clay,
  CHART_COLORS.gray,
  CHART_COLORS.danger,
];

export const axisProps = {
  stroke: "transparent",
  tick: { fill: "#93A097", fontSize: 10, fontFamily: "inherit" },
  tickLine: false,
  axisLine: { stroke: "rgba(255,255,255,0.09)" },
} as const;

export function ChartEmpty({ message = "Sin datos para graficar." }: { message?: string }) {
  return <div className="chart-empty">{message}</div>;
}

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  unit?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined ? <div className="chart-tooltip-label">{label}</div> : null}
      {payload.map((item, index) => {
        const numeric = typeof item.value === "number" ? item.value : Number(item.value);
        const text = formatter && Number.isFinite(numeric)
          ? formatter(numeric, String(item.name ?? ""))
          : `${Number.isFinite(numeric) ? numeric.toLocaleString("es-PE", { maximumFractionDigits: 2 }) : item.value}${unit ? ` ${unit}` : ""}`;
        return (
          <div key={`${item.dataKey}-${index}`} className="chart-tooltip-row">
            <i style={{ background: item.color ?? CHART_COLORS.leaf }} />
            <span>{item.name}</span>
            <strong>{text}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  legend,
  action,
  height = 240,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  legend?: { label: string; color: string }[];
  action?: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("chart-card", className)}>
      <div className="chart-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="chart-body" style={{ height }}>
        {children}
      </div>
      {legend ? <ChartLegend items={legend} /> : null}
    </div>
  );
}
