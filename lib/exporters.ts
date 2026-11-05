import type { Project, RawDocument } from "@/lib/types";
import type { ScenarioSummary } from "@/lib/engine/model";
import type { ComputedModel } from "@/lib/engine/model";

export function safeFileName(text: string, fallback = "green-owl"): string {
  const cleaned = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(content: string, filename: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

type Primitive = string | number | boolean | null | undefined;

function csvCell(value: Primitive): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : String(value);
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: { key: string; label: string }[], rows: Record<string, Primitive>[]): string {
  const lines = [headers.map((h) => csvCell(h.label)).join(";")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h.key])).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function exportProjectJson(project: Project, documents?: RawDocument[]): void {
  const payload = {
    format: "green-owl-landfill-3d",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    note: "Respaldo local de Green Owl Landfill 3D. No contiene datos de servidor.",
    project,
    documents: documents ?? [],
  };
  downloadText(JSON.stringify(payload, null, 2), `${safeFileName(project.name)}-green-owl.json`, "application/json;charset=utf-8");
}

export function exportBackupJson(projects: Project[], documents: RawDocument[]): void {
  const payload = {
    format: "green-owl-landfill-3d-backup",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    note: "Respaldo completo del espacio de trabajo local. No contiene datos de servidor.",
    projects,
    documents,
  };
  downloadText(JSON.stringify(payload, null, 2), `green-owl-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json;charset=utf-8");
}

export function exportWasteCsv(model: ComputedModel, project: Project): void {
  const csv = toCsv(
    [
      { key: "year", label: "Año" },
      { key: "population", label: "Población" },
      { key: "generatedT", label: "Generado (t)" },
      { key: "collectedT", label: "Recolectado (t)" },
      { key: "recoveredT", label: "Recuperado (t)" },
      { key: "notCollectedT", label: "No recolectado (t)" },
      { key: "landfilledT", label: "Dispuesto (t)" },
      { key: "densityKgM3", label: "Densidad (kg/m3)" },
      { key: "wasteVolumeM3", label: "Volumen residuos (m3)" },
      { key: "coverVolumeM3", label: "Volumen cobertura (m3)" },
      { key: "cumulativeMassT", label: "Masa acumulada (t)" },
      { key: "fillPct", label: "Llenado (%)" },
      { key: "remainingTonnageT", label: "Capacidad remanente (t)" },
    ],
    model.waste.annual as unknown as Record<string, Primitive>[],
  );
  downloadText(csv, `${safeFileName(project.name)}-balance-residuos.csv`, "text/csv;charset=utf-8");
}

export function exportLeachateCsv(model: ComputedModel, project: Project): void {
  const csv = toCsv(
    [
      { key: "year", label: "Año" },
      { key: "activeAreaM2", label: "Área activa (m2)" },
      { key: "closedAreaM2", label: "Área cerrada (m2)" },
      { key: "rainfallM3", label: "Precipitación (m3)" },
      { key: "runoffM3", label: "Escorrentía (m3)" },
      { key: "evapotranspirationM3", label: "Evapotranspiración (m3)" },
      { key: "infiltrationM3", label: "Infiltración (m3)" },
      { key: "moistureReleaseM3", label: "Humedad liberada (m3)" },
      { key: "leachateM3", label: "Lixiviado generado (m3)" },
      { key: "treatedM3", label: "Tratado (m3)" },
      { key: "untreatedM3", label: "No tratado (m3)" },
      { key: "avgFlowLps", label: "Caudal medio (L/s)" },
      { key: "peakMonthFlowLps", label: "Caudal pico mensual (L/s)" },
    ],
    model.leachate.annual as unknown as Record<string, Primitive>[],
  );
  downloadText(csv, `${safeFileName(project.name)}-lixiviados.csv`, "text/csv;charset=utf-8");
}

export function exportGasCsv(model: ComputedModel, project: Project): void {
  const csv = toCsv(
    [
      { key: "year", label: "Año" },
      { key: "phase", label: "Fase" },
      { key: "wastePlacedT", label: "Residuos dispuestos (t)" },
      { key: "ch4GeneratedT", label: "CH4 generado (t)" },
      { key: "ch4GeneratedM3", label: "CH4 generado (m3)" },
      { key: "biogasM3", label: "Biogás (m3)" },
      { key: "capturedM3", label: "Capturado (m3)" },
      { key: "oxidizedM3", label: "Oxidado (m3)" },
      { key: "emittedM3", label: "Emitido (m3)" },
      { key: "flaredM3", label: "Quemado (m3)" },
      { key: "energyMWh", label: "Energía (MWh)" },
    ],
    model.gas.annual as unknown as Record<string, Primitive>[],
  );
  downloadText(csv, `${safeFileName(project.name)}-biogas.csv`, "text/csv;charset=utf-8");
}

export function exportCapacityCsv(model: ComputedModel, project: Project): void {
  const csv = toCsv(
    [
      { key: "name", label: "Celda" },
      { key: "sequenceOrder", label: "Secuencia" },
      { key: "grossVolumeM3", label: "Volumen bruto (m3)" },
      { key: "linerVolumeM3", label: "Liner (m3)" },
      { key: "infrastructureReserveM3", label: "Reserva infraestructura (m3)" },
      { key: "wasteVolumeM3", label: "Volumen residuos (m3)" },
      { key: "coverVolumeM3", label: "Volumen cobertura (m3)" },
      { key: "tonnageT", label: "Tonelaje (t)" },
      { key: "fillFraction", label: "Llenado (fracción)" },
      { key: "topElevationM", label: "Cota superior simulada (m)" },
    ],
    model.capacity.cells as unknown as Record<string, Primitive>[],
  );
  downloadText(csv, `${safeFileName(project.name)}-capacidad.csv`, "text/csv;charset=utf-8");
}

export function exportScenariosCsv(summaries: ScenarioSummary[], project: Project): void {
  const rows = summaries.map((s) => ({
    name: s.scenario.name,
    kind: s.scenario.kind,
    capacityT: s.capacityT,
    capacityM3: s.capacityM3,
    lifeYears: s.lifeYears,
    exhaustionYear: s.exhaustionYear,
    leachateM3: s.leachateM3,
    peakLeachateLps: s.peakLeachateLps,
    ch4T: s.ch4T,
    capturedM3: s.capturedM3,
    energyMWh: s.energyMWh,
    npvUsd: s.npvUsd,
    fs: s.fs,
  }));
  const csv = toCsv(
    [
      { key: "name", label: "Escenario" },
      { key: "kind", label: "Tipo" },
      { key: "capacityT", label: "Capacidad (t)" },
      { key: "capacityM3", label: "Capacidad (m3)" },
      { key: "lifeYears", label: "Vida útil (años)" },
      { key: "exhaustionYear", label: "Año de agotamiento" },
      { key: "leachateM3", label: "Lixiviado total (m3)" },
      { key: "peakLeachateLps", label: "Caudal pico (L/s)" },
      { key: "ch4T", label: "CH4 generado (t)" },
      { key: "capturedM3", label: "CH4 capturado (m3)" },
      { key: "energyMWh", label: "Energía (MWh)" },
      { key: "npvUsd", label: "Valor presente neto (USD)" },
      { key: "fs", label: "FS talud infinito" },
    ],
    rows,
  );
  downloadText(csv, `${safeFileName(project.name)}-escenarios.csv`, "text/csv;charset=utf-8");
}

export function exportValidationCsv(model: ComputedModel, project: Project): void {
  const rows = model.issues.map((i) => ({
    severity: i.severity,
    module: i.module,
    title: i.title,
    detail: i.detail,
    reference: i.reference ?? "",
  }));
  const csv = toCsv(
    [
      { key: "severity", label: "Severidad" },
      { key: "module", label: "Módulo" },
      { key: "title", label: "Hallazgo" },
      { key: "detail", label: "Detalle" },
      { key: "reference", label: "Referencia" },
    ],
    rows,
  );
  downloadText(csv, `${safeFileName(project.name)}-validacion.csv`, "text/csv;charset=utf-8");
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}
