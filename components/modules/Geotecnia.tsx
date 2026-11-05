"use client";

import { ArrowLeft, ArrowRight, Compass, Ruler, ShieldAlert, TriangleAlert } from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import {
  Badge,
  Btn,
  Callout,
  DataTable,
  Field,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  Panel,
  RangeField,
  type TableColumn,
} from "@/components/ui";
import type { StabilityCase } from "@/lib/engine/geotech";
import { FormGrid, FormulaHint, InlineNote, Reference } from "./shared";

const BAND_LABEL = {
  inestable: "Inestable",
  revisar: "Revisar",
  marginal: "Marginal",
  aceptable: "Aceptable",
} as const;

function bandTone(band: StabilityCase["band"]): "leaf" | "amber" | "red" {
  if (band === "aceptable") return "leaf";
  if (band === "marginal" || band === "revisar") return "amber";
  return "red";
}

export default function Geotecnia() {
  const { model } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const params = model.params.geotech;
  const result = model.geotech;
  const tone = bandTone(result.band);

  const columns: TableColumn<StabilityCase>[] = [
    { key: "name", label: "Caso", render: (row) => <strong>{row.name}</strong> },
    { key: "description", label: "Descripción" },
    { key: "cohesionKpa", label: "c′ (kPa)", align: "right", render: (row) => fmt(row.cohesionKpa, 2) },
    { key: "frictionAngleDeg", label: "φ′ (°)", align: "right", render: (row) => fmt(row.frictionAngleDeg, 1) },
    { key: "waterTableRatio", label: "m", align: "right", render: (row) => fmt(row.waterTableRatio, 2) },
    { key: "factorOfSafety", label: "FS", align: "right", render: (row) => <strong>{fmt(row.factorOfSafety, 2)}</strong> },
    { key: "band", label: "Banda", render: (row) => <Badge tone={bandTone(row.band)}>{BAND_LABEL[row.band]}</Badge> },
  ];

  const beta = (result.slopeAngleDeg * Math.PI) / 180;
  const slopeLength = 96;
  const x0 = 42;
  const y0 = 132;
  const x1 = x0 + slopeLength * Math.cos(beta);
  const y1 = y0 - slopeLength * Math.sin(beta);
  const waterY = y0 - slopeLength * Math.sin(beta) * Math.min(1, Math.max(0, params.waterTableRatio)) * 0.55;
  const failureX = x0 + slopeLength * 0.52 * Math.cos(beta);
  const failureY = y0 - slopeLength * 0.52 * Math.sin(beta) + 9;

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 09 · Geotecnia"
        title="Revisión conceptual de estabilidad"
        description="Se evalúa un mecanismo traslacional superficial con la formulación de talud infinito. No es un análisis de estabilidad global ni reemplaza un estudio geotécnico firmado."
        actions={
          <>
            <Btn variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => setModule("operacion")}>Volver a operación</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("clausura")}>Continuar a clausura</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Factor de seguridad" value={fmt(result.factorOfSafety, 2)} hint="Talud infinito, condición base" tone={tone === "leaf" ? "leaf" : tone === "amber" ? "amber" : "danger"} icon={<ShieldAlert size={15} />} />
        <Kpi label="Ángulo promedio del talud" value={fmt(result.slopeAngleDeg, 1)} unit="°" hint="Promedio ponderado por volumen de celdas" tone="blue" icon={<Compass size={15} />} />
        <Kpi label="Esfuerzo motor" value={fmt(result.drivingStressKpa, 2)} unit="kPa" hint={`Profundidad de falla ${fmt(params.sliceDepthM, 1)} m`} />
        <Kpi label="Resistencia disponible" value={fmt(result.resistingStressKpa, 2)} unit="kPa" hint={`Presión de poros ${fmt(result.porePressureKpa, 2)} kPa`} tone="leaf" icon={<Ruler size={15} />} />
      </KpiGrid>

      <Callout tone={result.factorOfSafety < 1.3 ? "danger" : "warn"} title="Alcance limitado del método">
        {result.designWarning} El método solo cubre traslación superficial paralela al talud; no analiza fallas circulares, cuñas profundas, capacidad de soporte, licuación ni estabilidad global del macizo.
      </Callout>

      <div className="split-grid">
        <Panel title="Parámetros resistentes" eyebrow="Escenario activo" description="La cohesión, la fricción y la presión de poros modifican directamente el factor de seguridad. El ángulo del talud se deriva de la geometría de las celdas.">
          <FormGrid columns={2}>
            <Field label="Peso unitario" hint="Peso unitario total del material.">
              <NumberField value={params.unitWeightKnM3} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.unitWeightKnM3 = v; })} min={8} max={25} step={0.5} unit="kN/m³" />
            </Field>
            <Field label="Profundidad de la superficie de falla">
              <NumberField value={params.sliceDepthM} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.sliceDepthM = v; })} min={0.5} max={40} step={0.5} unit="m" />
            </Field>
            <Field label="Cohesión efectiva c′">
              <NumberField value={params.cohesionKpa} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.cohesionKpa = v; })} min={0} max={100} step={0.5} unit="kPa" />
            </Field>
            <Field label="Ángulo de fricción φ′">
              <NumberField value={params.frictionAngleDeg} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.frictionAngleDeg = v; })} min={0} max={45} step={0.5} unit="°" />
            </Field>
            <Field label="Cohesión de interfaz" hint="Resistencia de la interfaz geosintética.">
              <NumberField value={params.interfaceCohesionKpa} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.interfaceCohesionKpa = v; })} min={0} max={100} step={0.5} unit="kPa" />
            </Field>
            <Field label="Fricción de interfaz">
              <NumberField value={params.interfaceFrictionAngleDeg} onChange={(v) => updateScenarioParams((draft) => { draft.geotech.interfaceFrictionAngleDeg = v; })} min={0} max={45} step={0.5} unit="°" />
            </Field>
          </FormGrid>
          <RangeField
            label="Relación de nivel freático (m = u / γ·z)"
            value={params.waterTableRatio}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateScenarioParams((draft) => { draft.geotech.waterTableRatio = v; })}
            hint="0 = sin presión de poros; 1 = saturación total en la superficie de falla."
            digits={2}
          />
          <FormulaHint>
            FS = [c′ + (γ · z · cos²β − u) · tanφ′] / (γ · z · sinβ · cosβ); u = γ<sub>w</sub> · m · z · cos²β
          </FormulaHint>
          <InlineNote tone="neutral">
            El ángulo β proviene del promedio ponderado de los taludes de las celdas. Para cambiarlo, edite el talud en Celdas y capas. La PGA declarada ({fmt(model.params.site.seismicPga, 2)}) se registra, pero el análisis pseudo-estático no está implementado.
          </InlineNote>
        </Panel>

        <Panel title="Sección esquemática" eyebrow="Interpretación" description="Esquema no a escala del talud, el nivel freático y una superficie de falla paralela.">
          <div className="slope-figure">
            <svg viewBox="0 0 260 170" role="img" aria-label="Esquema de talud infinito con nivel freático y superficie de falla">
              <defs>
                <linearGradient id="slope-ground" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5f7a55" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#2c3d2f" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="260" height="170" fill="#101a14" rx="10" />
              <path d={`M ${x0 - 20} ${y0 + 14} L ${x0} ${y0} L ${x1} ${y1} L ${x1 + 26} ${y1} L ${x1 + 26} ${y1 + 40} L ${x0 - 20} ${y0 + 40} Z`} fill="url(#slope-ground)" />
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#d6e5d2" strokeWidth="1.6" />
              <line x1={x0} y1={waterY} x2={x1} y2={waterY - (y0 - y1) * 0.55} stroke="#4FA8C7" strokeWidth="1.2" strokeDasharray="5 4" />
              <line x1={x0 + 6} y1={y0 + 3} x2={failureX + 46} y2={failureY - 14} stroke="#D8A33A" strokeWidth="1.4" strokeDasharray="6 3" />
              <circle cx={x0} cy={y0} r="2.6" fill="#79CE4C" />
              <circle cx={x1} cy={y1} r="2.6" fill="#79CE4C" />
              <text x="8" y="158" fill="#93A097" fontSize="8">Base del modelo</text>
              <text x={x1 - 22} y={Math.max(16, y1 - 8)} fill="#cfe0cc" fontSize="8">Talud β = {fmt(result.slopeAngleDeg, 1)}°</text>
              <text x={x0 + 4} y={waterY - 5} fill="#7fc4dd" fontSize="7.4">Nivel freático</text>
              <text x={failureX + 4} y={failureY + 4} fill="#e0bd72" fontSize="7.4">Falla paralela</text>
              <line x1={x0 - 6} y1={y0} x2={x0 + 28} y2={y0} stroke="#93A097" strokeWidth="1" strokeDasharray="2 3" />
            </svg>
          </div>
          <div className="capacity-facts">
            <div><span>FS condición base</span><strong>{fmt(result.factorOfSafety, 3)}</strong></div>
            <div><span>Banda de revisión</span><strong>{BAND_LABEL[result.band]}</strong></div>
            <div><span>Esfuerzo vertical</span><strong>{fmt(result.verticalStressKpa, 2)} kPa</strong></div>
            <div><span>PGA registrada</span><strong>{fmt(model.params.site.seismicPga, 2)}</strong></div>
          </div>
          <div className="fs-scale">
            <div className="fs-band is-danger"><span>&lt; 1,0</span><strong>Inestable</strong></div>
            <div className="fs-band is-warn"><span>1,0–1,3</span><strong>Revisar</strong></div>
            <div className="fs-band is-marginal"><span>1,3–1,5</span><strong>Marginal</strong></div>
            <div className="fs-band is-ok"><span>≥ 1,5</span><strong>Aceptable</strong></div>
          </div>
          <InlineNote tone="neutral">Las bandas son criterios de revisión del modelo, no umbrales normativos. El valor aplicable debe definirse con el estudio geotécnico y la normativa vigente.</InlineNote>
        </Panel>
      </div>

      <Panel title="Casos de verificación" eyebrow="Comparación interna" description="Los casos comparten la geometría y el peso unitario; cambian la resistencia y la presión de poros." flush>
        <DataTable columns={columns} rows={result.cases} rowKey={(row) => row.id} dense />
      </Panel>

      <div className="split-grid">
        <Panel title="Lectura de resultados" eyebrow="Ingeniería" description="Un FS alto en el método de talud infinito no descarta mecanismos profundos ni fallas por erosión o subsidencia.">
          <div className="capacity-facts">
            <div><span>FS base</span><strong>{fmt(result.factorOfSafety, 3)}</strong></div>
            <div><span>FS interfaz</span><strong>{fmt(result.cases.find((c) => c.id === "interfaz")?.factorOfSafety ?? 0, 3)}</strong></div>
            <div><span>FS saturado</span><strong>{fmt(result.cases.find((c) => c.id === "saturado")?.factorOfSafety ?? 0, 3)}</strong></div>
            <div><span>FS seco</span><strong>{fmt(result.cases.find((c) => c.id === "seco")?.factorOfSafety ?? 0, 3)}</strong></div>
          </div>
          <InlineNote tone={result.cases.some((c) => c.factorOfSafety < 1) ? "danger" : "leaf"}>
            {result.cases.some((c) => c.factorOfSafety < 1)
              ? "Al menos un caso de verificación queda por debajo de 1,0. Se requiere revisión especializada antes de continuar."
              : "Ningún caso de verificación queda por debajo de 1,0 bajo las hipótesis del método."}
          </InlineNote>
          <div className="tag-row">
            <Reference>Formulación clásica de talud infinito</Reference>
            <Badge tone="amber">Resultado conceptual</Badge>
          </div>
        </Panel>

        <Panel title="Supuestos y limitaciones" eyebrow="Trazabilidad" description="Se incluyen en el informe y deben leerse junto con el factor de seguridad.">
          <ul className="assumption-list">
            {result.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <div className="callout-inline">
            <TriangleAlert size={14} />
            <span>No se implementa análisis sísmico, de licuación, de capacidad de soporte ni de estabilidad de la cobertura final.</span>
          </div>
        </Panel>
      </div>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <ShieldAlert size={14} /> FS {fmt(result.factorOfSafety, 2)} · banda {BAND_LABEL[result.band]} · β {fmt(result.slopeAngleDeg, 1)}°
        </div>
        <div className="row-actions">
          <Btn variant="secondary" onClick={() => setModule("celdas")}>Revisar taludes</Btn>
          <Btn variant="primary" onClick={() => setModule("clausura")}>Continuar a clausura</Btn>
        </div>
      </div>
    </div>
  );
}
