"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Download, Flame, Gauge, Leaf, Wind } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { exportGasCsv } from "@/lib/exporters";
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
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import type { GasAnnualRow } from "@/lib/engine/gas";
import { FormGrid, FormulaHint, InlineNote, Reference } from "./shared";

export default function Biogas() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const params = model.params.gas;
  const result = model.gas;
  const [showAll, setShowAll] = useState(false);

  const massGap = useMemo(
    () =>
      result.annual.reduce(
        (max, row) => Math.max(max, Math.abs(row.capturedM3 + row.oxidizedM3 + row.emittedM3 - row.ch4GeneratedM3)),
        0,
      ),
    [result.annual],
  );

  const topArea = model.geometry.topAreaM2;
  const areaPerWell = params.wellCount > 0 ? topArea / params.wellCount : 0;
  const impliedSpacing = areaPerWell > 0 ? Math.sqrt(areaPerWell) : 0;
  const peakPerWell = params.wellCount > 0 ? result.peakFlowNm3H / params.wellCount : 0;
  const revenuePotential = result.totalEnergyMWh * model.params.costs.gasRevenueUsdPerMwh;

  const rows = showAll ? result.annual : result.annual.slice(0, 12);

  const columns: TableColumn<GasAnnualRow>[] = [
    { key: "year", label: "Año", width: "60px" },
    { key: "phase", label: "Fase", render: (row) => <Badge tone={row.phase === "clausura" ? "blue" : "leaf"}>{row.phase === "clausura" ? "Clausura" : "Operación"}</Badge> },
    { key: "wastePlacedT", label: "Dispuesto", align: "right", render: (row) => fmt(row.wastePlacedT) },
    { key: "ch4GeneratedT", label: "CH₄ (t)", align: "right", render: (row) => fmt(row.ch4GeneratedT, 2) },
    { key: "ch4GeneratedM3", label: "CH₄ (m³)", align: "right", render: (row) => fmt(row.ch4GeneratedM3) },
    { key: "biogasM3", label: "Biogás (m³)", align: "right", render: (row) => fmt(row.biogasM3) },
    { key: "capturedM3", label: "Capturado", align: "right", render: (row) => fmt(row.capturedM3) },
    { key: "oxidizedM3", label: "Oxidado", align: "right", render: (row) => fmt(row.oxidizedM3) },
    { key: "emittedM3", label: "Emitido", align: "right", render: (row) => fmt(row.emittedM3) },
    { key: "flaredM3", label: "Quemado", align: "right", render: (row) => fmt(row.flaredM3) },
    { key: "energyMWh", label: "Energía", align: "right", render: (row) => fmt(row.energyMWh, 1) },
    { key: "captureEfficiencyPct", label: "Captura", align: "right", render: (row) => fmtPct(row.captureEfficiencyPct, 0) },
  ];

  const chartData = result.annual.map((row) => ({
    year: row.year,
    generado: row.ch4GeneratedM3,
    capturado: row.capturedM3,
    emitido: row.emittedM3,
    biogas: row.biogasM3,
    energia: row.energyMWh,
  }));

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 07 · Biogás"
        title="Metano, captura y aprovechamiento energético"
        description="La generación se estima con el modelo de descomposición de primer orden del IPCC 2006. La captura, oxidación, antorcha y conversión energética son eficiencias declaradas por el usuario."
        actions={
          <>
            <Btn variant="secondary" icon={<Wind size={14} />} onClick={() => setModule("lixiviados")}>Revisar lixiviados</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("operacion")}>Continuar a operación</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="CH₄ generado" value={fmtCompact(result.totalCh4GeneratedT)} unit="t" hint={`${result.annual.length} años en el horizonte de gas`} tone="leaf" icon={<Leaf size={15} />} />
        <Kpi label="Biogás total" value={fmtCompact(result.totalBiogasM3)} unit="m³" hint={`CH₄ al ${fmtPct(params.ch4Fraction * 100, 1)} del biogás`} tone="blue" />
        <Kpi label="CH₄ capturado" value={fmtCompact(result.totalCapturedM3)} unit="m³" hint={`Captura promedio ${fmtPct(result.averageCapturePct, 1)}`} tone="amber" icon={<Flame size={15} />} />
        <Kpi label="Energía potencial" value={fmtCompact(result.totalEnergyMWh)} unit="MWh" hint={`${fmt(params.energyEfficiencyPct, 0)} % de eficiencia eléctrica declarada`} tone="leaf" />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Parámetros del modelo IPCC" eyebrow="Escenario activo" description="DOC, DOCf, MCF, F y k definen el potencial y la velocidad de descomposición. Deben justificarse con caracterización local.">
          <FormGrid columns={3}>
            <Field label="DOC" hint="Carbono orgánico degradable (fracción de masa).">
              <NumberField value={params.doc} onChange={(v) => updateScenarioParams((draft) => { draft.gas.doc = v; })} min={0.01} max={0.5} step={0.005} />
            </Field>
            <Field label="DOCf" hint="Fracción de DOC que efectivamente se descompone.">
              <NumberField value={params.docf} onChange={(v) => updateScenarioParams((draft) => { draft.gas.docf = v; })} min={0} max={1} step={0.01} />
            </Field>
            <Field label="MCF" hint="Factor de corrección de metano según gestión del sitio.">
              <NumberField value={params.mcf} onChange={(v) => updateScenarioParams((draft) => { draft.gas.mcf = v; })} min={0} max={1} step={0.01} />
            </Field>
            <Field label="F" hint="Fracción de CH₄ en el gas generado.">
              <NumberField value={params.f} onChange={(v) => updateScenarioParams((draft) => { draft.gas.f = v; })} min={0} max={1} step={0.01} />
            </Field>
            <Field label="Constante k" hint="Tasa anual de decaimiento.">
              <NumberField value={params.k} onChange={(v) => updateScenarioParams((draft) => { draft.gas.k = v; })} min={0.001} max={0.5} step={0.001} unit="1/año" />
            </Field>
            <Field label="Fracción de CH₄" hint="Composición del biogás; referencia 40–60 %.">
              <NumberField value={params.ch4Fraction} onChange={(v) => updateScenarioParams((draft) => { draft.gas.ch4Fraction = v; })} min={0.01} max={1} step={0.01} />
            </Field>
            <Field label="Captación en operación">
              <NumberField value={params.collectionEfficiencyPct} onChange={(v) => updateScenarioParams((draft) => { draft.gas.collectionEfficiencyPct = v; })} min={0} max={100} step={1} unit="%" />
            </Field>
            <Field label="Captación en clausura">
              <NumberField value={params.closureCaptureEfficiencyPct} onChange={(v) => updateScenarioParams((draft) => { draft.gas.closureCaptureEfficiencyPct = v; })} min={0} max={100} step={1} unit="%" />
            </Field>
            <Field label="Oxidación en cobertura" hint="Se aplica solo al CH₄ no capturado.">
              <NumberField value={params.oxidationPct} onChange={(v) => updateScenarioParams((draft) => { draft.gas.oxidationPct = v; })} min={0} max={100} step={1} unit="%" />
            </Field>
            <Field label="Eficiencia de antorcha">
              <NumberField value={params.flareEfficiencyPct} onChange={(v) => updateScenarioParams((draft) => { draft.gas.flareEfficiencyPct = v; })} min={0} max={100} step={1} unit="%" />
            </Field>
            <Field label="Eficiencia eléctrica">
              <NumberField value={params.energyEfficiencyPct} onChange={(v) => updateScenarioParams((draft) => { draft.gas.energyEfficiencyPct = v; })} min={0} max={60} step={1} unit="%" />
            </Field>
            <Field label="Poder calorífico inferior">
              <NumberField value={params.lhvMjNm3} onChange={(v) => updateScenarioParams((draft) => { draft.gas.lhvMjNm3 = v; })} min={10} max={60} step={0.1} unit="MJ/Nm³" />
            </Field>
            <Field label="Temperatura de referencia">
              <NumberField value={params.referenceTemperatureC} onChange={(v) => updateScenarioParams((draft) => { draft.gas.referenceTemperatureC = v; })} min={-10} max={40} step={1} unit="°C" />
            </Field>
            <Field label="Años de posclausura simulados">
              <NumberField value={params.postClosureYears} onChange={(v) => updateScenarioParams((draft) => { draft.gas.postClosureYears = v; })} min={0} max={100} step={1} unit="años" />
            </Field>
            <Field label="Pozos de extracción declarados" hint="Se usa para el caudal y el área por pozo; no altera la generación total.">
              <NumberField value={params.wellCount} onChange={(v) => updateScenarioParams((draft) => { draft.gas.wellCount = Math.round(v); })} min={0} max={300} step={1} unit="pozos" />
            </Field>
          </FormGrid>
          <FormulaHint>
            DDOCm = W · DOC · DOCf · MCF · F; CH₄(t) = Σ W<sub>x</sub> · potencial · (1 − e<sup>−k</sup>) · e<sup>−k(t−x)</sup> · 16/12
          </FormulaHint>
          <InlineNote tone={params.ch4Fraction < 0.4 || params.ch4Fraction > 0.6 ? "amber" : "neutral"}>
            La referencia documentada para la fracción de metano es 40–60 % (MINAM 2011, p. 87; Honduras 2014, p. 92). Es un rango observado, no un límite legal.
          </InlineNote>
        </Panel>

        <Panel title="Balance de metano y captura" eyebrow="Verificación" description="El metano generado se reparte entre capturado, oxidado y emitido. La energía se calcula solo sobre el gas capturado.">
          <div className="capacity-facts">
            <div><span>Potencial último</span><strong>{fmt(result.ultimateCh4PotentialT)} t CH₄</strong></div>
            <div><span>Densidad de CH₄</span><strong>{result.densityKgM3.toFixed(4)} kg/m³</strong></div>
            <div><span>Año pico</span><strong>{result.peakYear ?? "—"}</strong></div>
            <div><span>Caudal pico</span><strong>{fmt(result.peakFlowNm3H, 1)} Nm³/h</strong></div>
            <div><span>CH₄ emitido</span><strong>{fmtCompact(result.totalEmittedM3)} m³</strong></div>
            <div><span>Ingreso potencial</span><strong>{fmt(revenuePotential, 0)} USD</strong></div>
          </div>
          <div className="check-list">
            <div className="check-line">
              <div><strong>Cierre del balance de metano</strong><span>Capturado + oxidado + emitido = generado</span></div>
              <Badge tone={massGap < 0.5 ? "leaf" : "red"}>{massGap < 0.5 ? "Cierra" : `Δ ${massGap.toExponential(2)} m³`}</Badge>
            </div>
            <ProgressBar value={result.averageCapturePct} max={100} showValue label="Captura promedio del CH₄ generado" tone="leaf" />
            <ProgressBar value={result.annual.reduce((s, r) => s + r.oxidizedM3, 0) > 0 ? (result.annual.reduce((s, r) => s + r.oxidizedM3, 0) / Math.max(result.annual.reduce((s, r) => s + r.ch4GeneratedM3, 0), 1)) * 100 : 0} max={100} showValue label="Oxidación acumulada sobre el CH₄ generado" tone="blue" />
          </div>
          <div className="capacity-facts">
            <div><span>Pozos declarados</span><strong>{fmt(params.wellCount)}</strong></div>
            <div><span>Área de coronación por pozo</span><strong>{fmt(areaPerWell)} m²</strong></div>
            <div><span>Espaciamiento equivalente</span><strong>{fmt(impliedSpacing, 1)} m</strong></div>
            <div><span>Caudal pico por pozo</span><strong>{fmt(peakPerWell, 1)} Nm³/h</strong></div>
          </div>
          <InlineNote tone="neutral">
            El número de pozos es una declaración de diseño. El espaciamiento equivalente se deriva del área de coronación y no sustituye un diseño de captura con pruebas de campo.
          </InlineNote>
        </Panel>
      </div>

      <Panel title="Generación anual de biogás" eyebrow={`${result.annual.length} año(s)`} description="CH₄ y biogás en m³; energía en MWh. La fase cambia a clausura desde el año de cierre calculado." flush>
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
          title="Metano generado, capturado y emitido"
          subtitle="Volúmenes anuales en m³. El área superior es la generación total."
          height={260}
          legend={[
            { label: "Generado", color: CHART_COLORS.blue },
            { label: "Capturado", color: CHART_COLORS.leaf },
            { label: "Emitido", color: CHART_COLORS.orange },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gas-generated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={56} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Area type="monotone" dataKey="generado" name="Generado" stroke={CHART_COLORS.blue} fill="url(#gas-generated)" strokeWidth={1.8} isAnimationActive={false} />
              <Area type="monotone" dataKey="capturado" name="Capturado" stroke={CHART_COLORS.leaf} fill={CHART_COLORS.leaf} fillOpacity={0.12} strokeWidth={1.8} isAnimationActive={false} />
              <Line type="monotone" dataKey="emitido" name="Emitido" stroke={CHART_COLORS.orange} strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Energía anual" subtitle="Energía eléctrica potencial del gas capturado, en MWh." height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={48} />
              <Tooltip content={<ChartTooltip unit="MWh" />} />
              <Bar dataKey="energia" name="Energía" fill={CHART_COLORS.amber} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Panel title="Supuestos y limitaciones" eyebrow="Trazabilidad" description="Se reproducen en el informe técnico y deben revisarse antes de usar los resultados.">
        <ul className="assumption-list">
          {result.assumptions.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <Callout tone="warn" title="El diseño de captura no está resuelto">
          Las eficiencias de captura, oxidación y antorcha son parámetros del usuario. Este módulo no diseña pozos, colectores, sopladores ni antorchas, y no verifica el balance de aire ni la calidad del gas.
        </Callout>
        <div className="tag-row">
          <Reference>IPCC 2006, Vol. 5, Cap. 3</Reference>
          <Reference>MINAM 2011, p. 87</Reference>
          <Reference>Honduras 2014, p. 92</Reference>
          <Badge tone="amber">Verificar parámetros locales</Badge>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Gauge size={14} /> Motor {model.engineVersion} · pico {fmt(result.peakFlowNm3H, 1)} Nm³/h · densidad {result.densityKgM3.toFixed(4)} kg/m³
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportGasCsv(model, project)}>Exportar CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("operacion")}>Continuar a operación</Btn>
        </div>
      </div>
    </div>
  );
}
