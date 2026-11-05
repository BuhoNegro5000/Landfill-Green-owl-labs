import type { Project, RawDocument, Scenario } from "@/lib/types";
import type { ComputedModel, ScenarioSummary } from "@/lib/engine/model";
import { computeSensitivity, type SensitivityResult } from "@/lib/engine/sensitivity";
import { runSelfTests, selfTestSummary } from "@/lib/selfTest";
import { METHODS, REFERENCE_VALUES, SOURCES } from "@/lib/methods";
import { DOC_CLASS_LABEL, DOC_STATUS_LABEL } from "@/lib/normative";
import { nf0, nf1, nf2, fmt, fmtDate, fmtPct, fmtUsd } from "@/lib/format";
import { scenarioSummary } from "@/lib/engine/model";

export const REPORT_SECTIONS = [
  { id: "resumen", title: "Resumen ejecutivo" },
  { id: "proyecto", title: "Identificación del proyecto" },
  { id: "emplazamiento", title: "Emplazamiento y calidad del dato" },
  { id: "geometria", title: "Geometría general" },
  { id: "celdas", title: "Celdas y bermas" },
  { id: "capas", title: "Sistema de impermeabilización y capas" },
  { id: "capacidad", title: "Capacidad y tonelaje" },
  { id: "residuos", title: "Balance anual de residuos" },
  { id: "lixiviados", title: "Balance hídrico y lixiviados" },
  { id: "biogas", title: "Biogás y metano" },
  { id: "operacion", title: "Operación y secuencia" },
  { id: "geotecnia", title: "Revisión geotécnica conceptual" },
  { id: "clausura", title: "Clausura y posclausura" },
  { id: "escenarios", title: "Comparación de escenarios" },
  { id: "sensibilidad", title: "Sensibilidad e incertidumbre" },
  { id: "resultados", title: "Resultados, costos y validación" },
  { id: "metodos", title: "Métodos, trazabilidad y verificación" },
  { id: "normativa", title: "Biblioteca normativa" },
  { id: "supuestos", title: "Supuestos, limitaciones y firma" },
] as const;

export type ReportSectionId = (typeof REPORT_SECTIONS)[number]["id"];
export type ReportSectionFlags = Record<ReportSectionId, boolean>;

export interface ReportOptions {
  sections: ReportSectionFlags;
  include3d: boolean;
  preparedBy: string;
  observations: string;
  screenshotDataUrl: string | null;
  documents: RawDocument[];
}

const FOREST: [number, number, number] = [9, 39, 27];
const FOREST_MID: [number, number, number] = [19, 74, 51];
const LEAF: [number, number, number] = [87, 178, 59];
const LEAF_LIGHT: [number, number, number] = [206, 237, 185];
const INK: [number, number, number] = [36, 48, 42];
const MUTED: [number, number, number] = [93, 108, 100];
const PAPER: [number, number, number] = [250, 251, 249];
const WARN: [number, number, number] = [192, 133, 51];
const DANGER: [number, number, number] = [176, 69, 50];

type Doc = import("jspdf").jsPDF;

function sectionEnabled(options: ReportOptions, id: ReportSectionId): boolean {
  return options.sections[id] !== false;
}

function localDate(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function labelValue(doc: Doc, pairs: [string, string][], y: number, columns = 2): number {
  const usable = 182;
  const colWidth = usable / columns;
  let rowY = y;
  pairs.forEach((pair, index) => {
    const col = index % columns;
    if (col === 0 && index > 0) rowY += 11.5;
    const x = 14 + col * colWidth;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(pair[0].toUpperCase(), x, rowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...INK);
    const value = doc.splitTextToSize(pair[1] || "—", colWidth - 4);
    doc.text(value.slice(0, 2), x, rowY + 4.1);
  });
  return rowY + 13;
}

export async function generateReport(
  project: Project,
  scenario: Scenario,
  model: ComputedModel,
  options: ReportOptions,
): Promise<{ fileName: string; pages: number }> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = (autoTableModule.default ?? autoTableModule) as unknown as (
    doc: Doc,
    options: Record<string, unknown>,
  ) => void;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const summaries: ScenarioSummary[] = project.scenarios.map((s) => scenarioSummary(project, s));
  const baseSummary = summaries.find((s) => s.scenario.isBase) ?? summaries[0];
  const selfTests = sectionEnabled(options, "metodos") ? runSelfTests() : [];
  const testsSummary = selfTestSummary(selfTests);
  const sensitivity: SensitivityResult | null = sectionEnabled(options, "sensibilidad")
    ? computeSensitivity(scenario.params, project.horizonYears)
    : null;

  let y = 24;
  const sectionPages: Partial<Record<ReportSectionId, number>> = {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const usable = pageWidth - 28;

  const newPage = () => {
    doc.addPage();
    y = 26;
    return y;
  };

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - 18) newPage();
  };

  const heading = (id: ReportSectionId, title: string, subtitle?: string) => {
    if (!sectionPages[id]) sectionPages[id] = doc.getNumberOfPages();
    ensure(18);
    doc.setFillColor(...LEAF);
    doc.rect(left, y - 3.5, 1.4, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...FOREST);
    doc.text(title, left + 4, y + 1.5);
    y += 6;
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(...MUTED);
      const lines = doc.splitTextToSize(subtitle, usable - 4);
      doc.text(lines, left + 4, y + 1);
      y += lines.length * 3.4 + 1;
    }
    y += 4;
  };

  const paragraph = (text: string, size = 8, color: [number, number, number] = INK) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, usable);
    for (const line of lines) {
      ensure(5);
      doc.text(line, left, y);
      y += size * 0.48;
    }
    y += 2;
  };

  const callout = (title: string, text: string, tone: "info" | "warn" | "danger" = "info") => {
    const color = tone === "danger" ? DANGER : tone === "warn" ? WARN : FOREST_MID;
    const lines = doc.splitTextToSize(text, usable - 8);
    const height = lines.length * 3.4 + 10;
    ensure(height + 2);
    doc.setFillColor(tone === "danger" ? 252 : tone === "warn" ? 253 : 245, tone === "danger" ? 241 : tone === "warn" ? 248 : 250, tone === "danger" ? 239 : tone === "warn" ? 237 : 245);
    doc.rect(left, y, usable, height, "F");
    doc.setFillColor(...color);
    doc.rect(left, y, 1.1, height, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.3);
    doc.setTextColor(...color);
    doc.text(title.toUpperCase(), left + 4, y + 4.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...INK);
    doc.text(lines, left + 4, y + 8);
    y += height + 4;
  };

  const table = (head: string[], body: (string | number)[][], widths?: number[]) => {
    if (body.length === 0) return;
    const rows = body.map((row) => row.map((value) => (typeof value === "number" ? fmt(value, 2) : value)));
    autoTable(doc, {
      startY: y,
      head: [head],
      body: rows,
      margin: { left, right: left },
      styles: { font: "helvetica", fontSize: 6.6, cellPadding: 1.4, textColor: INK, lineColor: [218, 225, 217], lineWidth: 0.08, valign: "top" },
      headStyles: { fillColor: FOREST, textColor: [245, 250, 243], fontSize: 6.4, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 249, 245] },
      columnStyles: widths ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])) : undefined,
      didDrawPage: () => {
        y = 26;
      },
    });
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 5;
    if (y > pageHeight - 30) newPage();
  };

  const bulletList = (items: string[], size = 7.4) => {
    for (const item of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(item, usable - 5);
      ensure(5);
      doc.setFillColor(...LEAF);
      doc.circle(left + 1.2, y - 0.7, 0.55, "F");
      doc.text(lines, left + 4, y);
      y += lines.length * (size * 0.47) + 1.1;
    }
    y += 1.5;
  };

  // -------------------------------------------------------------------------
  // Cover
  // -------------------------------------------------------------------------
  doc.setFillColor(...FOREST);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(...FOREST_MID);
  doc.circle(pageWidth + 10, -20, 95, "F");
  doc.setFillColor(12, 48, 34);
  doc.circle(-25, pageHeight + 15, 75, "F");
  doc.setDrawColor(...LEAF);
  doc.setLineWidth(0.6);
  doc.line(left, 42, left + 40, 42);

  // Geometric owl mark, drawn with vector primitives (no external asset).
  const ox = left;
  const oy = 49;
  doc.setFillColor(...LEAF);
  doc.triangle(ox + 3, oy + 3, ox + 11, oy - 5, ox + 12, oy + 8, "F");
  doc.triangle(ox + 31, oy + 3, ox + 23, oy - 5, ox + 22, oy + 8, "F");
  doc.setFillColor(230, 244, 219);
  doc.roundedRect(ox + 2, oy + 2, 30, 26, 7, 7, "F");
  doc.setFillColor(...FOREST);
  doc.circle(ox + 11, oy + 13, 5.1, "F");
  doc.circle(ox + 23, oy + 13, 5.1, "F");
  doc.setFillColor(...LEAF);
  doc.circle(ox + 11, oy + 13, 2.2, "F");
  doc.circle(ox + 23, oy + 13, 2.2, "F");
  doc.setFillColor(210, 150, 55);
  doc.triangle(ox + 14.8, oy + 17.4, ox + 19.2, oy + 17.4, ox + 17, oy + 21.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...LEAF_LIGHT);
  doc.text("GREEN OWL LABS", left, 83);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(170, 193, 178);
  doc.text("LABORATORIO DE DISEÑO Y SIMULACIÓN DE RELLENOS SANITARIOS", left, 88);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize("Informe técnico del proyecto", 150);
  doc.text(titleLines, left, 112);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(17);
  doc.setTextColor(...LEAF_LIGHT);
  const nameLines = doc.splitTextToSize(project.name, 165);
  doc.text(nameLines, left, 126);

  doc.setDrawColor(57, 91, 70);
  doc.line(left, 145, pageWidth - left, 145);

  doc.setFontSize(8.2);
  doc.setTextColor(211, 226, 214);
  doc.text(`Escenario: ${scenario.name}`, left, 154);
  doc.text(`Ubicación declarada: ${project.location}, ${project.region}, ${project.country}`, left, 161);
  doc.text(`Responsable: ${project.responsible || "Sin asignar"}`, left, 168);
  doc.text(`Versión del proyecto: ${project.version} · Motor: GO-ENGINE ${model.engineVersion}`, left, 175);
  doc.text(`Generado: ${localDate(new Date().toISOString())}`, left, 182);

  doc.setFillColor(15, 55, 39);
  doc.roundedRect(left, 199, usable, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...LEAF_LIGHT);
  doc.text("DOCUMENTO GENERADO LOCALMENTE", left + 4, 205);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.9);
  doc.setTextColor(187, 208, 191);
  doc.text(
    doc.splitTextToSize(
      "Los resultados provienen de los datos introducidos por el usuario y de los métodos documentados en el módulo Métodos. No constituyen un estudio de campo, una validación oficial ni una declaración de cumplimiento legal.",
      usable - 8,
    ),
    left + 4,
    209.5,
  );

  doc.setFontSize(7);
  doc.setTextColor(140, 166, 146);
  doc.text("Green Owl Landfill 3D · www.greenowllabs.local · Sin conexión a servidor", left, pageHeight - 12);

  // -------------------------------------------------------------------------
  // Table of contents placeholder (filled at the end)
  // -------------------------------------------------------------------------
  doc.addPage();
  y = 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...FOREST);
  doc.text("Contenido", left, y);
  y += 9;
  doc.setDrawColor(...LEAF);
  doc.setLineWidth(0.4);
  doc.line(left, y, left + 24, y);
  y += 8;
  const tocStartY = y;

  // -------------------------------------------------------------------------
  // 1. Executive summary
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "resumen")) {
    newPage();
    heading("resumen", "1. Resumen ejecutivo", `${scenario.name} · ${project.name}`);
    paragraph(
      `${project.name} se evalúa con el motor ${model.engineVersion}. La capacidad de diseño estimada es de ${fmt(model.capacity.totalTonnageT)} t (${fmt(model.capacity.wasteVolumeM3)} m³ de residuos) para el escenario activo, con una vida útil simulada de ${nf1.format(model.waste.operatingYears)} años${model.waste.exhaustionYear ? ` y agotamiento en ${nf1.format(model.waste.exhaustionYear)}` : " sin agotamiento dentro del horizonte"}.`,
    );
    table(
      ["Indicador", "Resultado", "Unidad"],
      [
        ["Volumen bruto modelado", fmt(model.geometry.grossVolumeM3), "m³"],
        ["Capacidad de residuos", fmt(model.capacity.wasteVolumeM3), "m³"],
        ["Tonelaje de diseño", fmt(model.capacity.totalTonnageT), "t"],
        ["Vida útil simulada", nf1.format(model.waste.operatingYears), "años"],
        ["Lixiviado generado (total simulado)", fmt(model.leachate.totalLeachateM3), "m³"],
        ["Caudal pico de diseño", nf2.format(model.leachate.designPeakFlowLps), "L/s"],
        ["CH₄ generado (total simulado)", fmt(model.gas.totalCh4GeneratedT), "t"],
        ["Energía potencial", fmt(model.gas.totalEnergyMWh), "MWh"],
        ["Valor presente neto declarado", fmtUsd(model.costs.npvUsd), "USD"],
        ["Factor de seguridad (talud infinito)", nf2.format(model.geotech.factorOfSafety), "—"],
      ],
      [88, 60, 30],
    );
    const errors = model.issues.filter((i) => i.severity === "error").length;
    const warnings = model.issues.filter((i) => i.severity === "warning").length;
    callout(
      "Lectura responsable",
      `El modelo reporta ${errors} error(es) y ${warnings} advertencia(s) de validación. La completitud declarada del emplazamiento es ${fmtPct(model.completeness.pct)}. Los resultados son una estimación de diseño y no un dictamen de aptitud, estabilidad o cumplimiento.`,
      errors > 0 ? "danger" : warnings > 0 ? "warn" : "info",
    );
    if (options.observations.trim()) {
      heading("resumen", "Observaciones del responsable");
      paragraph(options.observations);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Project identification
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "proyecto")) {
    newPage();
    heading("proyecto", "2. Identificación del proyecto", "Datos declarados por el usuario, sin verificación externa.");
    y = labelValue(
      doc,
      [
        ["Proyecto", project.name],
        ["Descriptor", project.descriptor ?? "—"],
        ["País", project.country],
        ["Región", project.region],
        ["Ubicación", project.location],
        ["Coordenadas", project.latitude !== null && project.longitude !== null ? `${project.latitude}, ${project.longitude}` : "No declaradas"],
        ["Responsable", project.responsible || "Sin asignar"],
        ["Versión", project.version],
        ["Horizonte de simulación", `${project.horizonYears} años`],
        ["Referencia normativa declarada", project.regulationRef],
        ["Creado", fmtDate(project.createdAt)],
        ["Actualizado", fmtDate(project.updatedAt)],
      ],
      y,
    );
    paragraph("Notas del proyecto", 8.2);
    paragraph(project.notes || "Sin notas.");
    paragraph("Escenario activo", 8.2);
    y = labelValue(
      doc,
      [
        ["Nombre", scenario.name],
        ["Tipo", scenario.kind],
        ["Base del proyecto", scenario.isBase ? "Sí" : "No"],
        ["Descripción", scenario.description],
        ["Año de inicio de operación", String(scenario.params.operation.startYear)],
        ["Horizonte", `${project.horizonYears} años`],
        ["Etiquetas", project.tags.join(", ") || "—"],
      ],
      y,
      2,
    );
    callout(
      "Alcance documental",
      "Este informe describe un modelo digital. No reemplaza estudios topográficos, geotécnicos, hidrogeológicos, de impacto ambiental ni la revisión de la autoridad competente.",
    );
  }

  // -------------------------------------------------------------------------
  // 3. Site
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "emplazamiento")) {
    newPage();
    heading("emplazamiento", "3. Emplazamiento y calidad del dato", "Cada campo tiene una calidad declarada: medido, estimado, supuesto o faltante.");
    const s = model.params.site;
    y = labelValue(
      doc,
      [
        ["Tipo de instalación", s.facilityType],
        ["Área declarada", `${fmt(s.areaHa, 2)} ha`],
        ["Cota (m s. n. m.)", fmt(s.elevationMasl)],
        ["Distancia a cuerpo de agua", `${fmt(s.distanceToWaterM)} m`],
        ["Profundidad al nivel freático", `${fmt(s.waterTableDepthM, 1)} m`],
        ["Permeabilidad del suelo", `${s.permeabilityMs.toExponential(2)} m/s`],
        ["Geología", s.geology],
        ["Hidrogeología", s.hydrogeology],
        ["Precipitación anual", `${fmt(s.rainfallMmYr)} mm`],
        ["Precipitación máxima mensual", `${fmt(s.maxMonthlyRainfallMm)} mm`],
        ["Precipitación máxima diaria", `${fmt(s.maxDailyRainfallMm)} mm`],
        ["Evapotranspiración", `${fmt(s.evapotranspirationMmYr)} mm/año`],
        ["Coeficiente de escorrentía", nf2.format(s.runoffCoefficient)],
        ["Aceleración sísmica (PGA)", nf2.format(s.seismicPga)],
        ["Uso de suelo", s.landUse],
        ["Áreas sensibles", s.sensitiveAreas],
        ["Accesos", s.access],
        ["Riesgos declarados", s.risks],
        ["Material de cobertura", s.coverMaterialSource],
        ["Disponibilidad de cobertura", `${fmt(s.coverMaterialAvailableM3)} m³`],
      ],
      y,
      2,
    );
    table(
      ["Calidad del dato", "Campos"],
      [
        ["Medido", String(model.completeness.measured)],
        ["Estimado", String(model.completeness.estimated)],
        ["Supuesto", String(model.completeness.assumed)],
        ["Faltante", String(model.completeness.missing)],
        ["Completitud ponderada", fmtPct(model.completeness.pct)],
      ],
      [60, 118],
    );
    if (model.completeness.missing > 0) {
      callout(
        "Información faltante",
        `Campos sin dato: ${model.completeness.missingLabels.join(", ")}. La completitud no equivale a aptitud del sitio ni reemplaza la verificación de campo.`,
        "warn",
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Geometry and 3D capture
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "geometria")) {
    newPage();
    heading("geometria", "4. Geometría general", "Integración prismoidal por intervalos entre bermas. Terreno esquemático, no levantamiento topográfico.");
    y = labelValue(
      doc,
      [
        ["Volumen bruto de celdas", `${fmt(model.geometry.grossVolumeM3)} m³`],
        ["Volumen de excavación", `${fmt(model.geometry.excavationVolumeM3)} m³`],
        ["Huella de celdas", `${fmt(model.geometry.footprintAreaM2)} m²`],
        ["Área de coronación", `${fmt(model.geometry.topAreaM2)} m²`],
        ["Área de impermeabilización", `${fmt(model.geometry.liningAreaM2)} m²`],
        ["Volumen del liner", `${fmt(model.geometry.linerVolumeM3)} m³`],
        ["Número de celdas", String(model.geometry.cells.length)],
      ],
      y,
      2,
    );
    if (options.include3d && options.screenshotDataUrl) {
      try {
        const available = pageHeight - 30 - y;
        const imgWidth = usable;
        const imgHeight = Math.min(available, imgWidth * 0.48);
        doc.setFillColor(...PAPER);
        doc.rect(left, y, imgWidth, imgHeight + 6, "F");
        doc.addImage(options.screenshotDataUrl, "PNG", left + 1, y + 1, imgWidth - 2, imgHeight - 2);
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        doc.text("Captura del modelo 3D al momento de generar el informe. Escala no cartográfica; capas del liner exageradas solo en la vista 3D.", left + 1, y + imgHeight + 4.5);
        y += imgHeight + 9;
      } catch {
        callout("Captura 3D no disponible", "El navegador no permitió exportar el lienzo WebGL. El resto de secciones se genera con normalidad.", "warn");
      }
    } else {
      callout("Sin captura 3D", "La sección se generó sin imagen del visor tridimensional por configuración del informe.", "info");
    }
    if (model.geometry.warnings.length) {
      callout("Advertencias geométricas", model.geometry.warnings.join(" "), "warn");
    }
  }

  // -------------------------------------------------------------------------
  // 5. Cells
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "celdas")) {
    newPage();
    heading("celdas", "5. Celdas y bermas", "Dimensiones inferiores, altura, talud y secuencia declarada.");
    table(
      ["Celda", "Tipo", "Fondo (m)", "Altura (m)", "Talud", "Bermas", "Coronación (m)", "Bruto (m³)"],
      model.geometry.cells.map((c) => [
        c.name,
        `${c.shape === "excavated" ? "Excavada" : "Montículo"} / ${c.method}`,
        `${nf1.format(c.bottomLengthM)} × ${nf1.format(c.bottomWidthM)}`,
        nf1.format(c.heightM),
        `1H:${nf1.format(c.slopeHtoV)}V`,
        `${c.bermCount}`,
        `${nf0.format(c.topLengthM)} × ${nf0.format(c.topWidthM)}`,
        fmt(c.grossVolumeM3),
      ]),
      [18, 25, 26, 17, 17, 14, 28, 25],
    );
    table(
      ["Celda", "Base (m s. n. m.)", "Corona (m s. n. m.)", "Excavación (m)", "Área fondo (m²)", "Liner (m²)", "Advertencias"],
      model.geometry.cells.map((c) => [
        c.name,
        nf1.format(c.baseElevationM),
        nf1.format(c.topElevationM),
        nf1.format(c.excavationDepthM),
        fmt(c.bottomAreaM2),
        fmt(c.liningAreaM2),
        c.warnings.length ? c.warnings.join(" ") : "—",
      ]),
      [16, 28, 28, 22, 25, 25, 38],
    );
    paragraph("La cota de corona es base + altura. La excavación se limita a la altura geométrica de la celda. Las bermas se modelan como escalones horizontales.", 7.2, MUTED);
  }

  // -------------------------------------------------------------------------
  // 6. Layers
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "capas")) {
    newPage();
    heading("capas", "6. Sistema de impermeabilización y capas", "Espesores reales declarados. Las referencias son técnicas, no requisitos legales automáticos.");
    table(
      ["Capa", "Categoría", "Espesor", "Material", "Función", "Referencia"],
      model.params.geometry.layers.map((l) => [
        `${l.enabled ? "" : "[Deshabilitada] "}${l.name}`,
        l.category,
        `${nf1.format(l.thicknessMm)} mm`,
        l.material,
        l.function,
        l.reference,
      ]),
      [30, 23, 18, 35, 42, 34],
    );
    paragraph(
      "En el visor 3D los espesores del liner se exageran para poder observarlos; la tabla y la sección 2D conservan los espesores reales. El terreno del visor es esquemático y no representa una superficie topográfica medida.",
      7.2,
      MUTED,
    );
    y = labelValue(
      doc,
      [
        ["Volumen de capas del liner", `${fmt(model.geometry.linerVolumeM3)} m³`],
        ["Área de aplicación", `${fmt(model.geometry.liningAreaM2)} m²`],
        ["Espesor real acumulado", `${nf1.format(model.params.geometry.layers.filter((l) => l.enabled).reduce((s, l) => s + l.thicknessMm, 0))} mm`],
      ],
      y,
      2,
    );
  }

  // -------------------------------------------------------------------------
  // 7. Capacity
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "capacidad")) {
    newPage();
    heading("capacidad", "7. Capacidad y tonelaje", "V_disp = V_bruto·FU − V_liner − V_infra; V_res = V_disp/(1+r_cob); T = V_res·ρ/1000.");
    y = labelValue(
      doc,
      [
        ["Volumen bruto", `${fmt(model.capacity.geometricGrossVolumeM3)} m³`],
        ["Liner descontado", `${fmt(model.capacity.linerVolumeM3)} m³`],
        ["Reserva de infraestructura", `${fmt(model.capacity.infrastructureReserveM3)} m³`],
        ["Volumen disponible", `${fmt(model.capacity.usableVolumeM3)} m³`],
        ["Volumen de residuos", `${fmt(model.capacity.wasteVolumeM3)} m³`],
        ["Volumen de cobertura", `${fmt(model.capacity.coverVolumeM3)} m³`],
        ["Densidad de diseño", `${fmt(model.params.waste.capacityDensityBasis === "initial" ? model.params.waste.densityInitialKgM3 : model.params.waste.densityStabilizedKgM3)} kg/m³ (${model.params.waste.capacityDensityBasis === "initial" ? "inicial" : "estabilizada"})`],
        ["Tonelaje de diseño", `${fmt(model.capacity.totalTonnageT)} t`],
        ["Factor de utilización", fmtPct(model.capacity.utilizationFactor * 100)],
        ["Relación de cobertura", fmtPct(model.params.waste.coverRatioPct)],
      ],
      y,
      2,
    );
    table(
      ["Celda", "Sec.", "Bruto (m³)", "Liner (m³)", "Reserva (m³)", "Residuos (m³)", "Cobertura (m³)", "Tonelaje (t)", "Llenado"],
      model.capacity.cells.map((c) => [
        c.name,
        String(c.sequenceOrder),
        fmt(c.grossVolumeM3),
        fmt(c.linerVolumeM3),
        fmt(c.infrastructureReserveM3),
        fmt(c.wasteVolumeM3),
        fmt(c.coverVolumeM3),
        fmt(c.tonnageT),
        fmtPct(c.fillFraction * 100),
      ]),
      [17, 9, 24, 20, 22, 24, 24, 23, 18],
    );
    const preliminar = (365 * 1.25 * project.horizonYears * model.params.waste.population * model.params.waste.perCapitaKgDay * (model.params.waste.collectionCoveragePct / 100)) / 600;
    paragraph(
      `Referencia comparativa Honduras 2014 (prospección preliminar): V ≈ 365 × 1.25 × ${project.horizonYears} × ${fmt(model.params.waste.population)} × ${nf2.format(model.params.waste.perCapitaKgDay)} × ${nf2.format(model.params.waste.collectionCoveragePct / 100)} / 600 = ${fmt(preliminar)} m³. Es una fórmula de orden de magnitud con densidad fija de 600 kg/m³ y sin crecimiento; no reemplaza el balance anual.`,
      7.2,
      MUTED,
    );
  }

  // -------------------------------------------------------------------------
  // 8. Waste
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "residuos")) {
    newPage();
    heading("residuos", "8. Balance anual de residuos", "Generación geométrica, cobertura, recuperación y densidad de diseño.");
    y = labelValue(
      doc,
      [
        ["Población inicial", fmt(model.params.waste.population)],
        ["Generación per cápita", `${nf2.format(model.params.waste.perCapitaKgDay)} kg/hab/día`],
        ["Cobertura de recolección", fmtPct(model.params.waste.collectionCoveragePct)],
        ["Crecimiento poblacional", fmtPct(model.params.waste.populationGrowthPct)],
        ["Crecimiento de generación", fmtPct(model.params.waste.generationGrowthPct)],
        ["Recuperación", fmtPct(model.params.waste.recoveryPct)],
        ["Total generado", `${fmt(model.waste.totalGeneratedT)} t`],
        ["Total dispuesto", `${fmt(model.waste.totalLandfilledT)} t`],
        ["Vida útil", `${nf1.format(model.waste.operatingYears)} años`],
        ["Año de agotamiento", model.waste.exhaustionYear ? nf1.format(model.waste.exhaustionYear) : "No agotado en el horizonte"],
        ["Capacidad remanente", `${fmt(model.waste.remainingTonnageT)} t`],
      ],
      y,
      2,
    );
    table(
      ["Año", "Población", "Generado (t)", "Recolectado (t)", "Recuperado (t)", "Dispuesto (t)", "Volumen (m³)", "Acumulado (t)", "Llenado"],
      model.waste.annual.map((r) => [
        String(r.year),
        fmt(r.population),
        fmt(r.generatedT),
        fmt(r.collectedT),
        fmt(r.recoveredT),
        fmt(r.landfilledT),
        fmt(r.wasteVolumeM3),
        fmt(r.cumulativeMassT),
        fmtPct(r.fillPct),
      ]),
      [12, 24, 25, 25, 24, 24, 24, 25, 18],
    );
    table(
      ["Fracción", "Composición (%)"],
      Object.entries(model.params.waste.composition).map(([k, v]) => [k, fmt(v)]),
      [60, 40],
    );
  }

  // -------------------------------------------------------------------------
  // 9. Leachate
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "lixiviados")) {
    newPage();
    heading("lixiviados", "9. Balance hídrico y lixiviados", "P = R + ET + I; liberación de humedad y caudal pico mensual. Manning a sección llena.");
    y = labelValue(
      doc,
      [
        ["Lixiviado total simulado", `${fmt(model.leachate.totalLeachateM3)} m³`],
        ["Caudal medio", `${nf2.format(model.leachate.avgFlowLps)} L/s`],
        ["Caudal pico de diseño", `${nf2.format(model.leachate.designPeakFlowLps)} L/s`],
        ["Almacenamiento recomendado", `${fmt(model.leachate.recommendedStorageM3)} m³`],
        ["Capacidad de tubería (Manning)", `${nf2.format(model.leachate.pipeCapacityLps)} L/s`],
        ["Utilización de tubería", model.leachate.pipeUtilizationPct !== null ? fmtPct(model.leachate.pipeUtilizationPct) : "Sin datos"],
        ["Estado hidráulico", model.leachate.pipeStatus],
        ["Tratado", `${fmt(model.leachate.totalTreatedM3)} m³`],
        ["No tratado", `${fmt(model.leachate.totalUntreatedM3)} m³`],
        ["Fuga por liner (Darcy)", `${nf2.format(model.leachate.leakageM3Yr)} m³/año`],
        ["Cierre del balance hídrico", fmtPct(model.leachate.waterBalanceClosurePct)],
        ["Método suizo comparativo", `${nf2.format(model.leachate.swissFlowLps)} L/s`],
        ["Escorrentía racional", `${nf2.format(model.leachate.stormFlowLps)} L/s`],
      ],
      y,
      2,
    );
    table(
      ["Año", "Área activa (m²)", "P (m³)", "R (m³)", "ET (m³)", "I (m³)", "Humedad (m³)", "Lixiviado (m³)", "Tratado (m³)", "No tratado (m³)", "Q medio (L/s)"],
      model.leachate.annual.map((r) => [
        String(r.year),
        fmt(r.activeAreaM2),
        fmt(r.rainfallM3),
        fmt(r.runoffM3),
        fmt(r.evapotranspirationM3),
        fmt(r.infiltrationM3),
        fmt(r.moistureReleaseM3),
        fmt(r.leachateM3),
        fmt(r.treatedM3),
        fmt(r.untreatedM3),
        nf2.format(r.avgFlowLps),
      ]),
      [10, 20, 18, 16, 16, 16, 20, 21, 18, 20, 19],
    );
    paragraph("Supuestos del módulo", 8);
    bulletList(model.leachate.assumptions);
    callout(
      "Alcance hidráulico",
      "El balance es anual y de control de superficie. La capacidad de tubería se calcula a sección llena y no verifica flujo parcial, aireación ni obstrucciones. No sustituye HELP, HYDRUS ni un modelo hidrogeológico calibrado.",
    );
  }

  // -------------------------------------------------------------------------
  // 10. Gas
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "biogas")) {
    newPage();
    heading("biogas", "10. Biogás y metano", "Modelo de descomposición de primer orden del IPCC 2006. Captura y oxidación son eficiencias supuestas.");
    y = labelValue(
      doc,
      [
        ["CH₄ generado total", `${fmt(model.gas.totalCh4GeneratedT)} t`],
        ["Biogás generado", `${fmt(model.gas.totalBiogasM3)} m³`],
        ["CH₄ capturado", `${fmt(model.gas.totalCapturedM3)} m³`],
        ["CH₄ emitido", `${fmt(model.gas.totalEmittedM3)} m³`],
        ["Energía potencial", `${fmt(model.gas.totalEnergyMWh)} MWh`],
        ["Potencial último", `${fmt(model.gas.ultimateCh4PotentialT)} t CH₄`],
        ["Año pico", model.gas.peakYear ? String(model.gas.peakYear) : "—"],
        ["Caudal pico", `${nf1.format(model.gas.peakFlowNm3H)} Nm³/h`],
        ["Densidad de CH₄", `${model.gas.densityKgM3.toFixed(4)} kg/m³`],
        ["Captura promedio", fmtPct(model.gas.averageCapturePct)],
      ],
      y,
      2,
    );
    table(
      ["Año", "Fase", "Dispuesto (t)", "CH₄ (t)", "CH₄ (m³)", "Biogás (m³)", "Capturado (m³)", "Emitido (m³)", "Energía (MWh)"],
      model.gas.annual.map((r) => [
        String(r.year),
        r.phase,
        fmt(r.wastePlacedT),
        nf2.format(r.ch4GeneratedT),
        fmt(r.ch4GeneratedM3),
        fmt(r.biogasM3),
        fmt(r.capturedM3),
        fmt(r.emittedM3),
        nf2.format(r.energyMWh),
      ]),
      [12, 20, 22, 18, 22, 24, 24, 22, 22],
    );
    paragraph("Supuestos del módulo", 8);
    bulletList(model.gas.assumptions);
    callout(
      "Diseño de captura",
      "Las eficiencias de captura, oxidación y antorcha son parámetros del usuario, no resultados de un diseño de pozos. La verificación requiere pruebas de campo, balance de aire y monitoreo.",
      "warn",
    );
  }

  // -------------------------------------------------------------------------
  // 11. Operation
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "operacion")) {
    newPage();
    heading("operacion", "11. Operación y secuencia", "Asignación secuencial por volumen y año de apertura/cierre derivado.");
    y = labelValue(
      doc,
      [
        ["Año de inicio", String(model.params.operation.startYear)],
        ["Horizonte", `${project.horizonYears} años`],
        ["Frente de trabajo", `${fmt(model.params.operation.workingFaceAreaM2)} m²`],
        ["Cobertura diaria declarada", `${fmt(model.params.operation.dailyCoverThicknessMm)} mm`],
        ["Pasadas de compactación", String(model.params.operation.compactionPasses)],
        ["Celdas activas por año", String(model.params.operation.activeCellsPerYear)],
        ["Modo de secuencia", model.params.operation.sequenceMode],
      ],
      y,
      2,
    );
    table(
      ["Celda", "Secuencia", "Apertura", "Cierre", "Volumen asignado (m³)", "Tonelaje (t)", "Llenado final"],
      model.waste.cellAllocation.cellSummary.map((c) => [
        model.capacity.cells.find((x) => x.cellId === c.cellId)?.name ?? c.cellId,
        String(model.capacity.cells.find((x) => x.cellId === c.cellId)?.sequenceOrder ?? "—"),
        c.openYear ? String(c.openYear) : "No abierta",
        c.closeYear ? String(c.closeYear) : "—",
        fmt(c.filledVolumeM3),
        fmt(c.filledTonnageT),
        fmtPct(c.fillFraction * 100),
      ]),
      [30, 20, 22, 20, 40, 30, 20],
    );
    table(
      ["Año", "Dispuesto (t)", "Llenado acumulado", "Celdas activas", "Celdas cerradas", "Fase"],
      model.operation.map((r) => [
        String(r.year),
        fmt(r.wasteT),
        fmtPct(r.fillPct),
        r.activeCellNames.join(", ") || "—",
        r.closedCellNames.join(", ") || "—",
        r.closurePhase,
      ]),
      [15, 25, 27, 45, 45, 25],
    );
  }

  // -------------------------------------------------------------------------
  // 12. Geotech
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "geotecnia")) {
    newPage();
    heading("geotecnia", "12. Revisión geotécnica conceptual", "Talud infinito, mecanismo traslacional superficial. No es un análisis de estabilidad global.");
    callout(
      "Limitación esencial",
      model.geotech.designWarning,
      model.geotech.factorOfSafety < 1.3 ? "danger" : "warn",
    );
    y = labelValue(
      doc,
      [
        ["Ángulo de talud", `${nf2.format(model.geotech.slopeAngleDeg)}°`],
        ["Peso unitario", `${nf2.format(model.params.geotech.unitWeightKnM3)} kN/m³`],
        ["Cohesión efectiva", `${nf2.format(model.params.geotech.cohesionKpa)} kPa`],
        ["Ángulo de fricción", `${nf2.format(model.params.geotech.frictionAngleDeg)}°`],
        ["Relación de nivel freático", nf2.format(model.params.geotech.waterTableRatio)],
        ["Profundidad de falla", `${nf2.format(model.params.geotech.sliceDepthM)} m`],
        ["Factor de seguridad", nf2.format(model.geotech.factorOfSafety)],
        ["Banda", model.geotech.band],
        ["Esfuerzo motor", `${nf2.format(model.geotech.drivingStressKpa)} kPa`],
        ["Esfuerzo resistente", `${nf2.format(model.geotech.resistingStressKpa)} kPa`],
        ["Presión de poros", `${nf2.format(model.geotech.porePressureKpa)} kPa`],
        ["PGA registrada", nf2.format(model.params.site.seismicPga)],
      ],
      y,
      2,
    );
    table(
      ["Caso", "c' (kPa)", "φ' (°)", "m", "FS", "Banda"],
      model.geotech.cases.map((c) => [c.name, nf2.format(c.cohesionKpa), nf2.format(c.frictionAngleDeg), nf2.format(c.waterTableRatio), nf2.format(c.factorOfSafety), c.band]),
      [50, 25, 25, 22, 25, 35],
    );
    paragraph("Supuestos y limitaciones", 8);
    bulletList(model.geotech.notes);
  }

  // -------------------------------------------------------------------------
  // 13. Closure
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "clausura")) {
    newPage();
    heading("clausura", "13. Clausura y posclausura", "Cobertura final, cronograma de tareas y monitoreo declarado.");
    y = labelValue(
      doc,
      [
        ["Año de cierre", model.closure.closureYear ? nf1.format(model.closure.closureYear) : "No determinado"],
        ["Fin de posclausura", model.closure.postClosureEndYear ? String(model.closure.postClosureEndYear) : "—"],
        ["Área de cobertura", `${fmt(model.closure.coverAreaM2)} m²`],
        ["Espesor total de cobertura", `${fmt(model.closure.finalCoverThicknessMm)} mm`],
        ["Volumen de cobertura final", `${fmt(model.closure.finalCoverVolumeM3)} m³`],
        ["Reserva por asentamiento", `${fmt(model.closure.settlementAllowanceM3)} m³`],
        ["Material total requerido", `${fmt(model.closure.totalCoverMaterialM3)} m³`],
        ["Disponibilidad declarada", `${fmt(model.params.site.coverMaterialAvailableM3)} m³`],
        ["Revegetación", model.closure.revegetation],
        ["Puntos en alerta o sin datos", String(model.closure.alerts)],
      ],
      y,
      2,
    );
    table(
      ["Tarea", "Fase", "Inicio", "Fin", "Responsable", "Estado"],
      model.closure.tasks.map((t) => [t.name, t.phase, fmtDate(t.startDate), fmtDate(t.endDate), t.responsible, t.done ? "Completada" : "Pendiente"]),
      [55, 25, 24, 24, 35, 22],
    );
    table(
      ["Punto", "Tipo", "Frecuencia", "Parámetros", "Último valor", "Referencia", "Estado"],
      model.params.closure.monitoringPoints.map((m) => [m.name, m.type, m.frequency, m.parameters, m.lastValue, m.referenceLimit, m.status]),
      [28, 26, 22, 40, 28, 28, 18],
    );
    if (model.params.site.coverMaterialAvailableM3 < model.closure.totalCoverMaterialM3) {
      callout("Déficit de material de cobertura", "La disponibilidad declarada es menor que el requerimiento estimado. Verifique el balance de materiales y las fuentes de préstamo.", "warn");
    }
  }

  // -------------------------------------------------------------------------
  // 14. Scenarios
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "escenarios")) {
    newPage();
    heading("escenarios", "14. Comparación de escenarios", "Todos los escenarios del proyecto con el mismo motor; las diferencias provienen de sus parámetros.");
    table(
      ["Escenario", "Base", "Capacidad (t)", "Vida (años)", "Agotamiento", "Lixiviado (m³)", "Q pico (L/s)", "CH₄ (t)", "Energía (MWh)", "VPN (USD)"],
      summaries.map((s) => [
        s.scenario.name,
        s.scenario.isBase ? "Sí" : "No",
        fmt(s.capacityT),
        nf1.format(s.lifeYears),
        s.exhaustionYear ? nf1.format(s.exhaustionYear) : "—",
        fmt(s.leachateM3),
        nf2.format(s.peakLeachateLps),
        fmt(s.ch4T),
        fmt(s.energyMWh),
        fmt(s.npvUsd),
      ]),
      [30, 12, 24, 17, 20, 25, 21, 20, 22, 28],
    );
    paragraph("Deltas respecto de la base", 8);
    table(
      ["Escenario", "Δ vida", "Δ lixiviado", "Δ CH₄", "Δ VPN"],
      summaries.map((s) => [
        s.scenario.name,
        baseSummary.lifeYears ? `${nf1.format(((s.lifeYears - baseSummary.lifeYears) / baseSummary.lifeYears) * 100)} %` : "—",
        baseSummary.leachateM3 ? `${nf1.format(((s.leachateM3 - baseSummary.leachateM3) / baseSummary.leachateM3) * 100)} %` : "—",
        baseSummary.ch4T ? `${nf1.format(((s.ch4T - baseSummary.ch4T) / baseSummary.ch4T) * 100)} %` : "—",
        baseSummary.npvUsd ? `${nf1.format(((s.npvUsd - baseSummary.npvUsd) / baseSummary.npvUsd) * 100)} %` : "—",
      ]),
      [55, 30, 32, 32, 33],
    );
  }

  // -------------------------------------------------------------------------
  // 15. Sensitivity
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "sensibilidad") && sensitivity) {
    newPage();
    heading("sensibilidad", "15. Sensibilidad e incertidumbre", "Análisis uno a la vez (OAT). No es un intervalo de confianza ni un análisis probabilístico.");
    paragraph(
      `Resultado base: vida útil ${nf1.format(sensitivity.base.lifeYears)} años; lixiviado ${fmt(sensitivity.base.totalLeachateM3)} m³; CH₄ ${fmt(sensitivity.base.totalCh4T)} t; almacenamiento ${fmt(sensitivity.base.storageM3)} m³.`,
    );
    table(
      ["Variable", "Perturbación", "Δ vida (%)", "Δ lixiviado (%)", "Δ CH₄ (%)", "Impacto máx. |%|"],
      sensitivity.rows.map((r) => [
        r.label,
        `${r.lowLabel} / ${r.highLabel}`,
        nf1.format(r.deltaPct.lifeYears),
        nf1.format(r.deltaPct.totalLeachateM3),
        nf1.format(r.deltaPct.totalCh4T),
        nf1.format(r.maxImpactPct),
      ]),
      [55, 32, 24, 28, 24, 30],
    );
    bulletList(sensitivity.notes);
    callout(
      "Monte Carlo",
      "El módulo Sensibilidad permite ejecutar una simulación Monte Carlo con distribuciones normales truncadas y semilla fija. Este informe incluye únicamente el análisis OAT; los percentiles deben generarse y revisarse en la aplicación.",
    );
  }

  // -------------------------------------------------------------------------
  // 16. Results and costs
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "resultados")) {
    newPage();
    heading("resultados", "16. Resultados, costos y validación", "Costos declarados por el usuario; no son una estimación de mercado.");
    y = labelValue(
      doc,
      [
        ["CAPEX", fmtUsd(model.costs.totalCapexUsd)],
        ["OPEX acumulado", fmtUsd(model.costs.totalOpexUsd)],
        ["Tratamiento de lixiviados", fmtUsd(model.costs.totalTreatmentUsd)],
        ["Ingresos por energía", fmtUsd(model.costs.totalRevenueUsd)],
        ["Valor presente neto", fmtUsd(model.costs.npvUsd)],
        ["Costo por tonelada", fmtUsd(model.costs.costPerTonneUsd)],
        ["Tasa de descuento", fmtPct(model.params.costs.discountRatePct)],
        ["Advertencias de validación", String(model.issues.filter((i) => i.severity === "warning").length)],
        ["Errores de validación", String(model.issues.filter((i) => i.severity === "error").length)],
      ],
      y,
      2,
    );
    table(
      ["Año", "OPEX (USD)", "Tratamiento (USD)", "Ingresos (USD)", "Neto (USD)", "Descontado (USD)"],
      model.costs.annual.map((a) => [
        String(a.year),
        fmt(a.opex),
        fmt(a.treatment),
        fmt(a.revenue),
        fmt(a.net),
        fmt(a.discounted),
      ]),
      [18, 32, 36, 32, 32, 32],
    );
    paragraph("Hallazgos de validación priorizados", 8);
    table(
      ["Severidad", "Módulo", "Hallazgo", "Detalle", "Referencia"],
      model.issues.slice(0, 40).map((i) => [i.severity, i.module, i.title, i.detail, i.reference ?? "—"]),
      [20, 22, 45, 75, 30],
    );
    paragraph("Notas de costo", 8);
    bulletList(model.costs.notes);
  }

  // -------------------------------------------------------------------------
  // 17. Methods and verification
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "metodos")) {
    newPage();
    heading("metodos", "17. Métodos, trazabilidad y verificación", "Formulaciones implementadas, fuente y estado de verificación del motor.");
    table(
      ["Método", "Fórmula", "Fuente", "Páginas", "Estado", "Función del motor"],
      METHODS.map((m) => [m.name, m.formula, m.sourceDoc, m.sourcePages, m.validation, m.engineFunction]),
      [36, 58, 30, 26, 24, 38],
    );
    paragraph(
      `La verificación en vivo ejecutó ${testsSummary.total} pruebas al generar este informe: ${testsSummary.passed} aprobadas y ${testsSummary.failed} fallidas.`,
      8,
    );
    table(
      ["Prueba", "Esperado", "Obtenido", "Tolerancia", "Resultado"],
      selfTests.map((t) => [t.name, t.expected, t.actual, t.tolerance, t.passed ? "Aprobada" : "Fallida"]),
      [45, 45, 45, 28, 20],
    );
    table(
      ["Parámetro de referencia", "Valor", "Fuente", "Páginas", "Clasificación"],
      REFERENCE_VALUES.map((v) => [v.parameter, v.value, v.source, v.pages, v.classification]),
      [52, 44, 28, 34, 34],
    );
    paragraph("Fuentes", 8);
    bulletList(Object.values(SOURCES).map((s) => `${s.title} — ${s.issuer}, ${s.year}. ${s.url || "Documento interno."}`), 7);
  }

  // -------------------------------------------------------------------------
  // 18. Normative library
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "normativa")) {
    newPage();
    heading("normativa", "18. Biblioteca normativa", "Estado de verificación explícito. Ninguna entrada se declara vigente sin contraste oficial.");
    table(
      ["Documento", "Número / fecha", "Emisor", "Artículo", "Estado", "Clasificación", "Aplicabilidad"],
      options.documents.map((d) => [
        d.title,
        `${d.number} · ${d.date}`,
        d.issuer,
        d.article,
        DOC_STATUS_LABEL[d.status],
        DOC_CLASS_LABEL[d.classification],
        d.applicability,
      ]),
      [38, 31, 28, 21, 25, 24, 45],
    );
    if (options.documents.some((d) => d.status === "pendiente-verificacion")) {
      callout(
        "Verificación pendiente",
        "Una o más entradas están marcadas como pendientes de verificación. No deben citarse como requisitos legales vigentes sin confirmar el texto oficial y sus modificaciones.",
        "warn",
      );
    }
  }

  // -------------------------------------------------------------------------
  // 19. Assumptions, limitations and signature
  // -------------------------------------------------------------------------
  if (sectionEnabled(options, "supuestos")) {
    newPage();
    heading("supuestos", "19. Supuestos, limitaciones y firma", "Lectura obligatoria antes de utilizar los resultados.");
    paragraph("Supuestos del balance de residuos", 8.2);
    bulletList(model.waste.assumptions);
    paragraph("Supuestos de lixiviados", 8.2);
    bulletList(model.leachate.assumptions);
    paragraph("Supuestos de biogás", 8.2);
    bulletList(model.gas.assumptions);
    paragraph("Limitaciones generales", 8.2);
    bulletList([
      "El motor no sustituye estudios de campo, topografía, geotecnia, hidrogeología, clima ni evaluación de impacto ambiental.",
      "La geometría del terreno y del relleno es un modelo matemático; el visor 3D no es una representación cartográfica.",
      "Los costos son datos introducidos por el usuario y no una estimación de mercado.",
      "Las referencias normativas marcadas como pendientes deben verificarse en la fuente oficial vigente.",
      "La estabilidad geotécnica se limita a un mecanismo traslacional superficial de talud infinito.",
      "La captura y oxidación de metano son eficiencias supuestas; no provienen de un diseño de pozos.",
      "La persistencia es local del navegador; no existe respaldo en servidor ni colaboración multiusuario.",
    ]);
    callout(
      "Declaración de alcance",
      "Este documento fue generado automáticamente por Green Owl Landfill 3D a partir de datos locales. No constituye un dictamen técnico firmado, una certificación, una validación oficial ni una declaración de cumplimiento legal.",
    );
    ensure(50);
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.2);
    doc.line(left, y + 16, left + 80, y + 16);
    doc.line(left + 100, y + 16, left + 170, y + 16);
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text("Responsable técnico", left, y + 20);
    doc.text("Revisión / aprobación", left + 100, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(options.preparedBy || project.responsible || "Sin asignar", left, y + 29);
    y += 38;
  }

  // -------------------------------------------------------------------------
  // TOC fill
  // -------------------------------------------------------------------------
  const contentPages = doc.getNumberOfPages();
  doc.setPage(2);
  y = tocStartY;
  REPORT_SECTIONS.forEach((section, index) => {
    const page = sectionPages[section.id];
    if (!page) return;
    if (y > pageHeight - 22) {
      doc.addPage();
      y = 28;
    }
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...INK);
    doc.text(section.title, left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(String(page), pageWidth - left, y, { align: "right" });
    doc.setDrawColor(228, 233, 226);
    doc.setLineWidth(0.1);
    doc.line(left, y + 1.6, pageWidth - left, y + 1.6);
    y += 8.2;
  });
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text(`Documento de ${contentPages} páginas. Generado ${localDate(new Date().toISOString())}.`, left, pageHeight - 24);

  // -------------------------------------------------------------------------
  // Headers and footers on all pages except cover
  // -------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let page = 2; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 225);
    doc.setLineWidth(0.2);
    doc.line(left, 15, pageWidth - left, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    doc.setTextColor(...MUTED);
    doc.text("GREEN OWL LANDFILL 3D · INFORME TÉCNICO", left, 11);
    doc.text(project.name.slice(0, 60), pageWidth - left, 11, { align: "right" });
    doc.line(left, pageHeight - 13, pageWidth - left, pageHeight - 13);
    doc.text(`Escenario: ${scenario.name}`, left, pageHeight - 9);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - left, pageHeight - 9, { align: "right" });
  }

  const fileName = `informe-${project.name.replace(/[^a-zA-Z0-9áéíóúñ]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return { fileName, pages: totalPages };
}
