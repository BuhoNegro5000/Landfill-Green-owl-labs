import type { ClosureParams, ClosureTask, Project, ScenarioParams } from "@/lib/types";
import type { GeometryResult } from "./geometry";

export interface ClosureTaskView extends ClosureTask {
  startDate: string;
  endDate: string;
  phase: "antes del cierre" | "cierre" | "posclausura";
}

export interface ClosureResult {
  closureYear: number | null;
  postClosureEndYear: number | null;
  coverAreaM2: number;
  finalCoverThicknessMm: number;
  finalCoverVolumeM3: number;
  settlementAllowanceM3: number;
  totalCoverMaterialM3: number;
  tasks: ClosureTaskView[];
  alerts: number;
  revegetation: string;
  monthlySchedule: { month: number; label: string; tasks: string[] }[];
}

function addMonths(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  return d.toISOString().slice(0, 10);
}

export function computeClosure(
  params: ScenarioParams,
  geometry: GeometryResult,
  wasteCoverVolumeM3: number,
  exhaustionYear: number | null,
): ClosureResult {
  const closureYear = params.closure.earlyClosureYear ?? (exhaustionYear !== null ? Math.ceil(exhaustionYear) : null);
  const enabledLayers = params.closure.finalCoverLayers.filter((l) => l.enabled);
  const thicknessMm = enabledLayers.reduce((s, l) => s + l.thicknessMm, 0);
  const coverArea = geometry.topAreaM2;
  const finalCoverVolume = coverArea * (thicknessMm / 1000);
  const settlement = finalCoverVolume * (params.closure.settlementAllowancePct / 100);

  const tasks: ClosureTaskView[] = params.closure.tasks.map((task) => {
    const startYear = (closureYear ?? new Date().getFullYear()) + Math.floor(task.startMonth / 12);
    const startMonthIdx = ((task.startMonth % 12) + 12) % 12;
    const endMonthTotal = task.startMonth + task.durationMonths;
    const endYear = (closureYear ?? new Date().getFullYear()) + Math.floor(endMonthTotal / 12);
    const endMonthIdx = ((endMonthTotal % 12) + 12) % 12;
    const phase: ClosureTaskView["phase"] =
      task.startMonth < 0 ? "antes del cierre" : task.startMonth < 12 ? "cierre" : "posclausura";
    return {
      ...task,
      startDate: addMonths(startYear, startMonthIdx),
      endDate: addMonths(endYear, endMonthIdx),
      phase,
    };
  });

  const monthlySchedule: { month: number; label: string; tasks: string[] }[] = [];
  for (let m = -12; m < 12 + params.closure.postClosureYears * 12; m += 1) {
    if (m % 3 !== 0) continue;
    const label = closureYear
      ? new Date(Date.UTC(closureYear, m, 1)).toLocaleDateString("es-PE", { month: "short", year: "numeric" })
      : `Mes ${m}`;
    const active = tasks.filter((t) => {
      const start = new Date(t.startDate).getTime();
      const end = new Date(t.endDate).getTime();
      const point = new Date(addMonths(closureYear ?? new Date().getFullYear(), m)).getTime();
      return point >= start && point <= end;
    });
    monthlySchedule.push({ month: m, label, tasks: active.map((t) => t.name) });
  }

  return {
    closureYear,
    postClosureEndYear: closureYear !== null ? closureYear + params.closure.postClosureYears : null,
    coverAreaM2: coverArea,
    finalCoverThicknessMm: thicknessMm,
    finalCoverVolumeM3: finalCoverVolume,
    settlementAllowanceM3: settlement,
    totalCoverMaterialM3: wasteCoverVolumeM3 + finalCoverVolume + settlement,
    tasks,
    alerts: params.closure.monitoringPoints.filter((p) => p.status === "alerta" || p.status === "sin-datos").length,
    revegetation: params.closure.revegetation,
    monthlySchedule,
  };
}

export function closureCoverage(params: ClosureParams): number {
  const done = params.tasks.filter((t) => t.done).length;
  return params.tasks.length > 0 ? (done / params.tasks.length) * 100 : 0;
}

export function projectCoverage(project: Project, params: ScenarioParams): number {
  return closureCoverage(params.closure);
}
