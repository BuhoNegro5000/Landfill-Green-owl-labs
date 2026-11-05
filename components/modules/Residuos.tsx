"use client";

import { useState } from "react";
import { ArrowRight, Download, Recycle, Scale, TrendingUp, Users } from "lucide-react";
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
import { exportWasteCsv } from "@/lib/exporters";
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
import type { WasteAnnualRow } from "@/lib/engine/waste";
import { CompositionEditor, FormGrid, FormulaHint, InlineNote, Reference } from "./shared";

export default function Residuos() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setHorizon = useStore((s) => s.setHorizon);
  const setModule = useStore((s) => s.setModule);
  const waste = model.params.waste;
  const result = model.waste;

  const [showAll, setShowAll] = useState(false);

  const columns: TableColumn<WasteAnnualRow>[] = [
    { key: "year", label: "Año", width: "62px" },
    { key: "population", label: "Población", align: "right", render: (row) => fmt(row.population) },
    { key: "generatedT", label: "Generado (t)", align: "right", render: (row) => fmt(row.generatedT) },
    { key: "collectedT", label: "Recolectado (t)", align: "right", render: (row) => fmt(row.collectedT) },
    { key: "recoveredT", label: "Recuperado (t)", align: "right", render: (row) => fmt(row.recoveredT) },
    { key: "landfilledT", label: "Dispuesto (t)", align: "right", render: (row) => fmt(row.landfilledT) },
    { key: "wasteVolumeM3", label: "Volumen (m³)", align: "right", render: (row) => fmt(row.wasteVolumeM3) },
    { key: "cumulativeMassT", label: "Acumulado (t)", align: "right", render: (row) => fmt(row.cumulativeMassT) },
    {
      key: "fillPct",
      label: "Llenado",
      align: "right",
      render: (row) => (
        <div className="table-progress">
          <ProgressBar value={row.fillPct} max={100} height={4} tone={row.capacityExhausted ? "amber" : "leaf"} />
          <span>{fmtPct(row.fillPct, 0)}</span>
        </div>
      ),
    },
    { key: "remainingTonnageT", label: "Remanente (t)", align: "right", render: (row) => fmt(row.remainingTonnageT) },
    {
      key: "maxElevationM",
      label: "Cota máx. (m)",
      align: "right",
      render: (row) => (row.maxElevationM > 0 ? fmt(row.maxElevationM, 1) : "—"),
    },
  ];

  const rows = showAll ? result.annual : result.annual.slice(0, 12);
  const usedPct = result.usedPct;

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 05 · Residuos"
        title="Generación, recuperación y vida útil"
        description="La proyección usa crecimiento geométrico de población y generación. La vida útil se obtiene del balance anual contra la capacidad volumétrica, no de una división estática."
        actions={
          <>
            <Btn variant="secondary" icon={<Scale size={14} />} onClick={() => setModule("capacidad")}>Revisar capacidad</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("lixiviados")}>Siguiente: lixiviados</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Población inicial" value={fmtCompact(waste.population)} unit="hab" hint={`Crecimiento ${fmtPct(waste.populationGrowthPct, 1)} anual`} icon={<Users size={15} />} />
        <Kpi label="Residuos dispuestos" value={fmtCompact(result.totalLandfilledT)} unit="t" hint={`${result.operatingYears.toFixed(1)} años de operación simulada`} tone="leaf" />
        <Kpi label="Vida útil" value={fmt(result.operatingYears, 1)} unit="años" hint={result.exhaustionYear ? `Agotamiento en ${fmt(result.exhaustionYear, 1)}` : "No agotada en el horizonte"} tone={usedPct >= 100 ? "amber" : "blue"} icon={<TrendingUp size={15} />} />
        <Kpi label="Uso de capacidad" value={fmtPct(usedPct, 1)} hint={`${fmtCompact(result.remainingTonnageT)} t remanentes`} tone={usedPct >= 100 ? "amber" : "leaf"} />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Parámetros de generación" eyebrow="Escenario activo" description="Los valores deben proceder de un estudio de caracterización; si no existen, declárelos como supuestos en Emplazamiento.">
          <FormGrid columns={2}>
            <Field label="Población servida">
              <NumberField value={waste.population} onChange={(v) => updateScenarioParams((draft) => { draft.waste.population = v; })} min={100} max={30_000_000} step={1000} unit="hab" />
            </Field>
            <Field label="Generación per cápita">
              <NumberField value={waste.perCapitaKgDay} onChange={(v) => updateScenarioParams((draft) => { draft.waste.perCapitaKgDay = v; })} min={0.05} max={3} step={0.01} unit="kg/hab/d" />
            </Field>
            <Field label="Cobertura de recolección">
              <NumberField value={waste.collectionCoveragePct} onChange={(v) => updateScenarioParams((draft) => { draft.waste.collectionCoveragePct = v; })} min={0} max={100} step={0.5} unit="%" />
            </Field>
            <Field label="Tasa de recuperación" hint="Se aplica a los residuos recolectados, antes de disponer.">
              <NumberField value={waste.recoveryPct} onChange={(v) => updateScenarioParams((draft) => { draft.waste.recoveryPct = v; })} min={0} max={100} step={0.5} unit="%" />
            </Field>
            <Field label="Crecimiento poblacional">
              <NumberField value={waste.populationGrowthPct} onChange={(v) => updateScenarioParams((draft) => { draft.waste.populationGrowthPct = v; })} min={-2} max={8} step={0.1} unit="%/año" />
            </Field>
            <Field label="Crecimiento de generación">
              <NumberField value={waste.generationGrowthPct} onChange={(v) => updateScenarioParams((draft) => { draft.waste.generationGrowthPct = v; })} min={-2} max={8} step={0.1} unit="%/año" />
            </Field>
            <Field label="Horizonte de evaluación" hint="El balance puede agotar la capacidad antes del horizonte.">
              <NumberField value={project.horizonYears} onChange={setHorizon} min={5} max={60} step={1} unit="años" />
            </Field>
            <Field label="Base de densidad">
              <SelectField
                value={waste.capacityDensityBasis}
                onChange={(value) => updateScenarioParams((draft) => { draft.waste.capacityDensityBasis = value as typeof draft.waste.capacityDensityBasis; })}
                options={[
                  { value: "initial", label: "Inicial compactada" },
                  { value: "stabilized", label: "Final estabilizada" },
                ]}
              />
            </Field>
          </FormGrid>
          <FormulaHint>
            G<sub>t</sub> = Población<sub>0</sub>(1+i)<sup>t</sup> · ppc<sub>0</sub>(1+g)<sup>t</sup> · 365 / 1000 · Cob · (1 − Rec); V<sub>t</sub> = G<sub>t</sub> / ρ
          </FormulaHint>
        </Panel>

        <Panel title="Composición de residuos" eyebrow="Caracterización" description="La suma debe ser 100 %. La composición se registra en el informe y puede alimentar ajustes de DOC.">
          <CompositionEditor />
          <Callout tone="info" title="Composición y biogás">
            El modelo de biogás usa DOC como parámetro independiente. La composición no modifica automáticamente DOC; ajuste ese valor en el módulo de Biogás con base en la caracterización.
          </Callout>
        </Panel>
      </div>

      <Panel title="Balance anual" eyebrow={`${result.annual.length} año(s)`} description="La columna de dispuesto se limita a la capacidad remanente. Si se agota la capacidad, el año de agotamiento se interpola." flush>
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
          title="Flujo anual de residuos"
          subtitle="Generado, recolectado y dispuesto; la línea muestra el porcentaje de capacidad ocupada."
          height={260}
          legend={[
            { label: "Generado", color: CHART_COLORS.gray },
            { label: "Recolectado", color: CHART_COLORS.blue },
            { label: "Dispuesto", color: CHART_COLORS.leaf },
            { label: "Llenado", color: CHART_COLORS.amber },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={result.annual} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis yAxisId="left" {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={54} />
              <YAxis yAxisId="right" orientation="right" {...axisProps} tickFormatter={(v) => `${fmt(Number(v), 0)}%`} width={46} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="left" dataKey="generatedT" name="Generado" fill={CHART_COLORS.gray} opacity={0.5} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="collectedT" name="Recolectado" fill={CHART_COLORS.blue} opacity={0.7} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="landfilledT" name="Dispuesto" fill={CHART_COLORS.leaf} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="fillPct" name="Llenado" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel title="Lectura de la vida útil" eyebrow="Resultado" description="El agotamiento puede ocurrir antes del horizonte declarado.">
          <div className="capacity-facts">
            <div><span>Generado total</span><strong>{fmtCompact(result.totalGeneratedT)} t</strong></div>
            <div><span>Recolectado total</span><strong>{fmtCompact(result.totalCollectedT)} t</strong></div>
            <div><span>Recuperado total</span><strong>{fmtCompact(result.totalRecoveredT)} t</strong></div>
            <div><span>Dispuesto total</span><strong>{fmtCompact(result.totalLandfilledT)} t</strong></div>
            <div><span>Volumen dispuesto</span><strong>{fmtCompact(result.totalWasteVolumeM3)} m³</strong></div>
            <div><span>Agotamiento</span><strong>{result.exhaustionYear ? fmt(result.exhaustionYear, 1) : "No alcanzado"}</strong></div>
          </div>
          <ProgressBar value={usedPct} max={100} showValue label="Uso de la capacidad de residuos" tone={usedPct >= 100 ? "amber" : "leaf"} />
          <InlineNote tone={usedPct >= 100 ? "amber" : "leaf"}>
            {usedPct >= 100
              ? "La capacidad se agota. Revise la geometría, la densidad o la recuperación antes de aprobar el dimensionamiento."
              : "La capacidad remanente permite seguir operando más allá del período simulado."}
          </InlineNote>
          <Reference>Honduras 2014, pp. 46–50 · MINAM 2011, pp. 61–63</Reference>
        </Panel>
      </div>

      <Panel title="Supuestos del balance" eyebrow="Trazabilidad" description="El informe conserva estas notas y las referencias.">
        <ul className="assumption-list">
          {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
        <div className="tag-row">
          <Badge tone="leaf">Densidad de diseño {fmt(result.capacity.densityKgM3)} kg/m³</Badge>
          <Badge tone="blue">Recuperación {fmtPct(waste.recoveryPct, 0)}</Badge>
          <Badge tone="amber">Cobertura {fmtPct(waste.coverRatioPct, 0)}</Badge>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Recycle size={14} /> {fmt(result.totalLandfilledT)} t dispuestas · vida útil {fmt(result.operatingYears, 1)} años
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportWasteCsv(model, project)}>Exportar CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("lixiviados")}>Continuar a lixiviados</Btn>
        </div>
      </div>
    </div>
  );
}
