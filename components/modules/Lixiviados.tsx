"use client";

import { useState } from "react";
import { ArrowRight, Download, Droplets, Gauge, ShieldAlert, Waves } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { exportLeachateCsv } from "@/lib/exporters";
import { fmt, fmtCompact, fmtPct } from "@/lib/format";
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
  ProgressBar,
  SelectField,
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import type { LeachateAnnualRow } from "@/lib/engine/leachate";
import { FormGrid, FormulaHint, InlineNote, LogField, Reference } from "./shared";

const PIPE_LABEL: Record<string, { text: string; tone: "leaf" | "amber" | "red" | "neutral" }> = {
  ok: { text: "Capacidad suficiente", tone: "leaf" },
  insufficient: { text: "Capacidad insuficiente", tone: "red" },
  "sin-datos": { text: "Sin datos de diseño", tone: "amber" },
  "sin-demanda": { text: "Sin demanda calculada", tone: "neutral" },
};

export default function Lixiviados() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const params = model.params.leachate;
  const site = model.params.site;
  const result = model.leachate;
  const [showAll, setShowAll] = useState(false);

  const columns: TableColumn<LeachateAnnualRow>[] = [
    { key: "year", label: "Año", width: "62px" },
    { key: "activeAreaM2", label: "Área activa", align: "right", render: (row) => fmt(row.activeAreaM2) },
    { key: "closedAreaM2", label: "Área cerrada", align: "right", render: (row) => fmt(row.closedAreaM2) },
    { key: "rainfallM3", label: "Lluvia", align: "right", render: (row) => fmt(row.rainfallM3) },
    { key: "runoffM3", label: "Escorrentía", align: "right", render: (row) => fmt(row.runoffM3) },
    { key: "evapotranspirationM3", label: "ET", align: "right", render: (row) => fmt(row.evapotranspirationM3) },
    { key: "infiltrationM3", label: "Infiltración", align: "right", render: (row) => fmt(row.infiltrationM3) },
    { key: "moistureReleaseM3", label: "Humedad liberada", align: "right", render: (row) => fmt(row.moistureReleaseM3) },
    { key: "leachateM3", label: "Lixiviado", align: "right", render: (row) => fmt(row.leachateM3) },
    { key: "treatedM3", label: "Tratado", align: "right", render: (row) => fmt(row.treatedM3) },
    { key: "untreatedM3", label: "No tratado", align: "right", render: (row) => fmt(row.untreatedM3) },
    { key: "avgFlowLps", label: "Medio (L/s)", align: "right", render: (row) => fmt(row.avgFlowLps, 2) },
    { key: "peakMonthFlowLps", label: "Pico mes (L/s)", align: "right", render: (row) => fmt(row.peakMonthFlowLps, 2) },
  ];

  const rows = showAll ? result.annual : result.annual.slice(0, 12);
  const pipe = PIPE_LABEL[result.pipeStatus];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 06 · Lixiviados"
        title="Balance hídrico, drenaje y tratamiento"
        description="El lixiviado se estima como infiltración en áreas activas y cerradas más la liberación de humedad de los residuos. La capacidad de tubería se verifica con Manning a sección llena."
        actions={
          <>
            <Btn variant="secondary" icon={<Waves size={14} />} onClick={() => setModule("biogas")}>Ir a biogás</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("operacion")}>Continuar a operación</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Lixiviado total" value={fmtCompact(result.totalLeachateM3)} unit="m³" hint={`${result.annual.length} años simulados`} tone="blue" icon={<Droplets size={15} />} />
        <Kpi label="Caudal medio" value={fmt(result.avgFlowLps, 2)} unit="L/s" hint="Promedio del período simulado" />
        <Kpi label="Pico mensual de diseño" value={fmt(result.designPeakFlowLps, 2)} unit="L/s" hint="Mes de máxima precipitación y humedad" tone="amber" icon={<Gauge size={15} />} />
        <Kpi label="Almacenamiento recomendado" value={fmtCompact(result.recommendedStorageM3)} unit="m³" hint={`${params.storageRetentionDays} días de caudal medio + evento máximo`} tone="leaf" />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Parámetros del balance" eyebrow="Escenario activo" description="La precipitación, la escorrentía y la evapotranspiración provienen del emplazamiento. Ajuste aquí la exposición y el sistema de manejo.">
          <FormGrid columns={2}>
            <Field label="Modo de área expuesta" hint="Operación usa el avance de llenado y el frente de trabajo; manual usa un área fija.">
              <SelectField
                value={params.exposedAreaMode}
                onChange={(value) => updateScenarioParams((draft) => { draft.leachate.exposedAreaMode = value as typeof draft.leachate.exposedAreaMode; })}
                options={[
                  { value: "operation", label: "Según avance de operación" },
                  { value: "manual", label: "Área manual" },
                ]}
              />
            </Field>
            <Field label="Área expuesta manual">
              <NumberField value={params.manualExposedAreaM2} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.manualExposedAreaM2 = v; })} min={0} max={1_000_000} step={250} unit="m²" disabled={params.exposedAreaMode !== "manual"} />
            </Field>
            <Field label="Humedad de ingreso">
              <NumberField value={params.incomingMoisturePct} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.incomingMoisturePct = v; })} min={0} max={95} step={1} unit="%" />
            </Field>
            <Field label="Capacidad de campo">
              <NumberField value={params.fieldCapacityPct} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.fieldCapacityPct = v; })} min={0} max={95} step={1} unit="%" />
            </Field>
            <Field label="Factor de infiltración en áreas cerradas" hint="0 = cobertura impermeable; 1 = sin reducción.">
              <NumberField value={params.coverInfiltrationFactor} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.coverInfiltrationFactor = v; })} min={0} max={1} step={0.01} />
            </Field>
            <Field label="Retención de almacenamiento">
              <NumberField value={params.storageRetentionDays} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.storageRetentionDays = v; })} min={0} max={15} step={1} unit="días" />
            </Field>
            <Field label="Coeficiente suizo K" hint="Referencia MINAM 2011, p. 80. Depende de la densidad.">
              <NumberField value={params.swissK} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.swissK = v; })} min={0.1} max={0.5} step={0.01} />
            </Field>
            <Field label="Capacidad de tratamiento">
              <NumberField value={params.treatmentCapacityM3Day} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.treatmentCapacityM3Day = v; })} min={0} max={10_000} step={1} unit="m³/día" />
            </Field>
            <Field label="Diámetro de tubería">
              <NumberField value={params.pipeDiameterMm} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.pipeDiameterMm = v; })} min={50} max={1200} step={10} unit="mm" />
            </Field>
            <Field label="Pendiente de tubería">
              <NumberField value={params.pipeSlopePct} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.pipeSlopePct = v; })} min={0.05} max={10} step={0.05} unit="%" />
            </Field>
            <Field label="Rugosidad de Manning (n)">
              <NumberField value={params.pipeManningN} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.pipeManningN = v; })} min={0.005} max={0.05} step={0.001} />
            </Field>
            <LogField label="Permeabilidad de la barrera" value={params.linerPermeabilityMs} onChange={(v) => updateScenarioParams((draft) => { draft.leachate.linerPermeabilityMs = v; })} min={-15} max={-6} hint="Se usa para estimar fuga de referencia a través del fondo." />
          </FormGrid>
          <FormulaHint>
            P = R + ET + I; L = I<sub>activo</sub> + I<sub>cerrado</sub> + m · (w<sub>ingreso</sub> − CC); Q<sub>Manning</sub> = (1/n) · A · R<sub>h</sub><sup>2/3</sup> · S<sup>1/2</sup>
          </FormulaHint>
        </Panel>

        <Panel title="Verificación del sistema" eyebrow="Diseño preliminar" description="Los resultados comparan la demanda con la capacidad declarada. No reemplazan un diseño hidráulico detallado.">
          <div className="capacity-facts">
            <div><span>Precipitación anual</span><strong>{fmt(site.rainfallMmYr)} mm</strong></div>
            <div><span>Escorrentía</span><strong>{fmtPct(site.runoffCoefficient * 100, 0)}</strong></div>
            <div><span>ET anual</span><strong>{fmt(site.evapotranspirationMmYr)} mm</strong></div>
            <div><span>Tratado</span><strong>{fmtCompact(result.totalTreatedM3)} m³</strong></div>
            <div><span>No tratado</span><strong>{fmtCompact(result.totalUntreatedM3)} m³</strong></div>
            <div><span>Cierre del balance</span><strong>{fmtPct(result.waterBalanceClosurePct, 1)}</strong></div>
          </div>
          <div className="check-list">
            <div className="check-line">
              <div><strong>Capacidad de tubería</strong><span>{fmt(result.pipeCapacityLps, 1)} L/s a sección llena</span></div>
              <Badge tone={pipe.tone}>{pipe.text}</Badge>
            </div>
            {result.pipeUtilizationPct !== null ? (
              <ProgressBar value={result.pipeUtilizationPct} max={100} showValue label="Uso de la tubería con el caudal pico" tone={result.pipeUtilizationPct > 100 ? "danger" : result.pipeUtilizationPct > 80 ? "amber" : "leaf"} />
            ) : null}
            <div className="check-line">
              <div><strong>Almacenamiento</strong><span>{fmt(result.recommendedStorageM3)} m³ recomendados</span></div>
              <Badge tone={result.recommendedStorageM3 > 0 ? "blue" : "neutral"}>{result.recommendedStorageM3 > 0 ? "Calculado" : "Sin demanda"}</Badge>
            </div>
            <div className="check-line">
              <div><strong>Fuga de referencia por el fondo</strong><span>{result.leakageM3Yr.toExponential(2)} m³/año</span></div>
              <Badge tone="neutral">Estimación</Badge>
            </div>
          </div>
          <InlineNote tone={result.pipeStatus === "insufficient" ? "amber" : "neutral"}>
            Manning se evalúa a sección llena y flujo uniforme. No verifica flujo parcial, aireación, obstrucciones ni línea de energía.
          </InlineNote>
        </Panel>
      </div>

      <Panel title="Balance anual de lixiviados" eyebrow={`${result.annual.length} año(s)`} description="Todos los volúmenes están en m³; los caudales en L/s. Tratado + no tratado = lixiviado generado." flush>
        <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.year)} dense maxHeight={430} />
        {result.annual.length > 12 ? (
          <div className="table-foot">
            <Btn size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Mostrar solo los primeros 12 años" : `Mostrar los ${result.annual.length} años`}
            </Btn>
          </div>
        ) : null}
      </Panel>

      <div className="split-grid">
        <ChartCard
          title="Componentes del balance hídrico"
          subtitle="Lluvia, escorrentía, evapotranspiración e infiltración; línea de lixiviado generado."
          height={260}
          legend={[
            { label: "Lluvia", color: CHART_COLORS.blue },
            { label: "Escorrentía", color: CHART_COLORS.gray },
            { label: "Infiltración", color: CHART_COLORS.amber },
            { label: "Lixiviado", color: CHART_COLORS.leaf },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={result.annual} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={54} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Bar dataKey="rainfallM3" name="Lluvia" fill={CHART_COLORS.blue} opacity={0.45} isAnimationActive={false} />
              <Bar dataKey="runoffM3" name="Escorrentía" fill={CHART_COLORS.gray} opacity={0.55} isAnimationActive={false} />
              <Bar dataKey="infiltrationM3" name="Infiltración" fill={CHART_COLORS.amber} isAnimationActive={false} />
              <Line type="monotone" dataKey="leachateM3" name="Lixiviado" stroke={CHART_COLORS.leaf} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel title="Comparaciones de referencia" eyebrow="Contraste" description="Métodos simplificados citados por la guía; se muestran como orden de magnitud, no como diseño.">
          <div className="capacity-facts">
            <div><span>Método suizo</span><strong>{fmt(result.swissFlowLps, 3)} L/s</strong></div>
            <div><span>Fórmula racional (tormenta)</span><strong>{fmt(result.stormFlowLps, 2)} L/s</strong></div>
            <div><span>Manning a sección llena</span><strong>{fmt(result.pipeCapacityLps, 1)} L/s</strong></div>
            <div><span>Pico mensual del balance</span><strong>{fmt(result.designPeakFlowLps, 2)} L/s</strong></div>
          </div>
          <Callout tone="info" title="Diferencia esperada entre métodos">
            El método suizo y la fórmula racional usan áreas y coeficientes distintos al balance anual. Úselos para contrastar el orden de magnitud; no los sume.
          </Callout>
          <Reference>MINAM 2011, pp. 69–83</Reference>
        </Panel>
      </div>

      <Panel title="Supuestos y limitaciones" eyebrow="Trazabilidad" description="Se reproducen en el informe y deben leerse antes de usar los caudales.">
        <ul className="assumption-list">
          {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
        <div className="tag-row">
          <Badge tone="leaf">Cierre del balance {fmtPct(result.waterBalanceClosurePct, 1)}</Badge>
          <Badge tone={result.totalUntreatedM3 > 0 ? "amber" : "leaf"}>Déficit de tratamiento {fmtCompact(result.totalUntreatedM3)} m³</Badge>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <ShieldAlert size={14} /> Pico {fmt(result.designPeakFlowLps, 2)} L/s · almacenamiento {fmtCompact(result.recommendedStorageM3)} m³
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportLeachateCsv(model, project)}>Exportar CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("biogas")}>Continuar a biogás</Btn>
        </div>
      </div>
    </div>
  );
}
