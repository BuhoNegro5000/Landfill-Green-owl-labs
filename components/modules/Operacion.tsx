"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, CalendarRange, Download, Layers3, Play, Truck } from "lucide-react";
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
import type { OperationYear } from "@/lib/engine/model";
import { FormGrid, InlineNote, Reference } from "./shared";

interface CellSequenceRow {
  cellId: string;
  name: string;
  sequenceOrder: number;
  openYear: number | null;
  closeYear: number | null;
  filledVolumeM3: number;
  filledTonnageT: number;
  fillFraction: number;
}

export default function Operacion() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const operationYearIndex = useStore((s) => s.operationYearIndex);
  const setOperationYear = useStore((s) => s.setOperationYear);
  const params = model.params.operation;

  const maxActive = useMemo(
    () => model.operation.reduce((max, row) => Math.max(max, row.activeCellNames.length), 0),
    [model.operation],
  );
  const maxActiveDeclaredGap = maxActive - params.activeCellsPerYear;

  const sequence: CellSequenceRow[] = useMemo(
    () =>
      model.waste.cellAllocation.cellSummary
        .map((summary) => {
          const cap = model.capacity.cells.find((cell) => cell.cellId === summary.cellId);
          return {
            cellId: summary.cellId,
            name: cap?.name ?? summary.cellId,
            sequenceOrder: cap?.sequenceOrder ?? 0,
            openYear: summary.openYear,
            closeYear: summary.closeYear,
            filledVolumeM3: summary.filledVolumeM3,
            filledTonnageT: summary.filledTonnageT,
            fillFraction: summary.fillFraction,
          };
        })
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [model.waste.cellAllocation.cellSummary, model.capacity.cells],
  );

  const openYear = sequence.reduce<number | null>((min, row) => (row.openYear !== null && (min === null || row.openYear < min) ? row.openYear : min), null);
  const lastYear = model.operation.length ? model.operation[model.operation.length - 1].year : params.startYear;
  const activeYear = operationYearIndex !== null ? model.operation[operationYearIndex] : null;

  const annualColumns: TableColumn<OperationYear>[] = [
    { key: "year", label: "Año", width: "62px" },
    { key: "wasteT", label: "Dispuesto (t)", align: "right", render: (row) => fmt(row.wasteT) },
    { key: "cumulativeT", label: "Acumulado (t)", align: "right", render: (row) => fmt(row.cumulativeT) },
    {
      key: "fillPct",
      label: "Llenado",
      align: "right",
      render: (row) => (
        <div className="table-progress">
          <ProgressBar value={row.fillPct} max={100} height={4} tone={row.fillPct >= 99 ? "leaf" : "amber"} />
          <span>{fmtPct(row.fillPct, 0)}</span>
        </div>
      ),
    },
    { key: "maxElevationM", label: "Cota máx.", align: "right", render: (row) => `${fmt(row.maxElevationM, 1)} m` },
    { key: "activeCellNames", label: "Celdas activas", render: (row) => row.activeCellNames.join(", ") || "—" },
    { key: "closedCellNames", label: "Celdas cerradas", render: (row) => row.closedCellNames.join(", ") || "—" },
    {
      key: "closurePhase",
      label: "Fase",
      render: (row) => <Badge tone={row.closurePhase === "posclausura" ? "neutral" : row.closurePhase === "clausura" ? "blue" : "leaf"}>{row.closurePhase}</Badge>,
    },
  ];

  const sequenceColumns: TableColumn<CellSequenceRow>[] = [
    { key: "name", label: "Celda", render: (row) => <strong>{row.name}</strong> },
    { key: "sequenceOrder", label: "Sec.", align: "center", width: "54px" },
    { key: "openYear", label: "Apertura", align: "right", render: (row) => (row.openYear !== null ? String(row.openYear) : "No abierta") },
    { key: "closeYear", label: "Cierre", align: "right", render: (row) => (row.closeYear !== null ? String(row.closeYear) : "—") },
    { key: "filledVolumeM3", label: "Volumen asignado", align: "right", render: (row) => `${fmt(row.filledVolumeM3)} m³` },
    { key: "filledTonnageT", label: "Tonelaje", align: "right", render: (row) => `${fmt(row.filledTonnageT)} t` },
    {
      key: "fillFraction",
      label: "Llenado final",
      align: "right",
      render: (row) => (
        <div className="table-progress">
          <ProgressBar value={row.fillFraction * 100} max={100} height={4} tone={row.fillFraction >= 1 ? "leaf" : "amber"} />
          <span>{fmtPct(row.fillFraction * 100, 0)}</span>
        </div>
      ),
    },
  ];

  const chartData = model.operation.map((row) => ({
    year: row.year,
    dispuesto: row.wasteT,
    llenado: row.fillPct,
    cota: row.maxElevationM,
  }));

  const dailyCoverLayers = model.params.geometry.layers.filter((layer) => layer.category === "daily-cover");

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 08 · Operación"
        title="Secuencia de llenado y frentes de trabajo"
        description="La asignación de residuos sigue el orden declarado de celdas y el volumen disponible de cada una. El frente de trabajo alimenta el balance de lixiviados y el año de inicio desplaza toda la simulación."
        actions={
          <>
            <Btn variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => setModule("biogas")}>Volver a biogás</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("geotecnia")}>Continuar a geotecnia</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Inicio de operación" value={String(params.startYear)} unit="año" hint={`${model.operation.length} años simulados`} tone="blue" icon={<CalendarRange size={15} />} />
        <Kpi label="Vida útil simulada" value={fmt(model.waste.operatingYears, 1)} unit="años" hint={model.waste.exhaustionYear ? `Agotamiento en ${fmt(model.waste.exhaustionYear, 1)}` : "No agotada en el horizonte"} tone="leaf" />
        <Kpi label="Residuos dispuestos" value={fmtCompact(model.waste.totalLandfilledT)} unit="t" hint={`${fmtCompact(model.waste.totalWasteVolumeM3)} m³ ocupados`} tone="amber" icon={<Truck size={15} />} />
        <Kpi label="Máximo de celdas activas" value={String(maxActive)} unit="celdas" hint={`Declaradas por año: ${params.activeCellsPerYear}`} tone={maxActiveDeclaredGap > 0 ? "amber" : "default"} icon={<Layers3 size={15} />} />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Parámetros de operación" eyebrow="Escenario activo" description="El año de inicio y el frente de trabajo modifican los cálculos. La cobertura diaria se sincroniza con la capa correspondiente del sistema de celdas.">
          <FormGrid columns={2}>
            <Field label="Año de inicio" hint="Desplaza la proyección de residuos, lixiviados, biogás y costos.">
              <NumberField value={params.startYear} onChange={(v) => updateScenarioParams((draft) => { draft.operation.startYear = Math.round(v); })} min={2000} max={2100} step={1} />
            </Field>
            <Field label="Frente de trabajo" hint="Área expuesta adicional que alimenta el balance hídrico.">
              <NumberField value={params.workingFaceAreaM2} onChange={(v) => updateScenarioParams((draft) => { draft.operation.workingFaceAreaM2 = v; })} min={0} max={20_000} step={50} unit="m²" />
            </Field>
            <Field label="Cobertura diaria" hint="Actualiza la capa de cobertura diaria y su volumen en la geometría.">
              <NumberField
                value={params.dailyCoverThicknessMm}
                onChange={(v) =>
                  updateScenarioParams((draft) => {
                    draft.operation.dailyCoverThicknessMm = v;
                    for (const layer of draft.geometry.layers) {
                      if (layer.category === "daily-cover") layer.thicknessMm = v;
                    }
                  })
                }
                min={0}
                max={500}
                step={10}
                unit="mm"
              />
            </Field>
            <Field label="Celdas activas declaradas" hint="Se contrasta con las celdas activas simuladas; no reordena la asignación.">
              <NumberField value={params.activeCellsPerYear} onChange={(v) => updateScenarioParams((draft) => { draft.operation.activeCellsPerYear = Math.max(1, Math.round(v)); })} min={1} max={20} step={1} unit="celdas" />
            </Field>
            <Field label="Pasadas de compactación" hint="Dato operativo declarado; no modifica la densidad del modelo.">
              <NumberField value={params.compactionPasses} onChange={(v) => updateScenarioParams((draft) => { draft.operation.compactionPasses = Math.max(1, Math.round(v)); })} min={1} max={20} step={1} unit="pasadas" />
            </Field>
            <Field label="Modo de secuencia" hint="El motor asigna siempre en el orden de secuencia declarado.">
              <SelectField
                value={params.sequenceMode}
                onChange={(value) => updateScenarioParams((draft) => { draft.operation.sequenceMode = value as typeof draft.operation.sequenceMode; })}
                options={[
                  { value: "sequential", label: "Secuencial por orden de celda" },
                  { value: "manual", label: "Manual declarado (no reordena el cálculo)" },
                ]}
              />
            </Field>
          </FormGrid>
          <InlineNote tone={maxActiveDeclaredGap > 0 ? "amber" : "neutral"}>
            {maxActiveDeclaredGap > 0
              ? `La simulación mantiene hasta ${maxActive} celdas activas en un año, por encima de las ${params.activeCellsPerYear} declaradas. Revise la secuencia o el tamaño de las celdas.`
              : "Las celdas activas simuladas no superan la declaración operativa."}
          </InlineNote>
          <InlineNote tone={dailyCoverLayers.length === 0 ? "amber" : "neutral"}>
            {dailyCoverLayers.length === 0
              ? "No existe una capa de cobertura diaria en el sistema de celdas. Créela en Celdas y capas para reflejar el espesor en la geometría 3D."
              : `Capa sincronizada: ${dailyCoverLayers.map((layer) => layer.name).join(", ")}.`}
          </InlineNote>
        </Panel>

        <Panel title="Reproducción del avance" eyebrow="Modelo 3D" description="Seleccione un año para que el visor y el panel lateral muestren el estado del llenado en ese corte.">
          <div className="capacity-facts">
            <div><span>Primera apertura</span><strong>{openYear ?? "—"}</strong></div>
            <div><span>Último año simulado</span><strong>{lastYear}</strong></div>
            <div><span>Cierre calculado</span><strong>{model.closure.closureYear ? fmt(model.closure.closureYear, 1) : "No determinado"}</strong></div>
            <div><span>Frente declarado</span><strong>{fmt(params.workingFaceAreaM2)} m²</strong></div>
            <div><span>Cobertura diaria</span><strong>{fmt(params.dailyCoverThicknessMm)} mm</strong></div>
            <div><span>Compactación</span><strong>{params.compactionPasses} pasadas</strong></div>
          </div>
          <Field label="Año de operación mostrado">
            <SelectField
              ariaLabel="Año de operación mostrado"
              value={operationYearIndex === null ? "all" : String(operationYearIndex)}
              onChange={(value) => setOperationYear(value === "all" ? null : Number(value))}
              options={[{ value: "all", label: "Estado final del horizonte" }, ...model.operation.map((row, index) => ({ value: String(index), label: `${row.year} · ${fmtPct(row.fillPct, 0)} de llenado` }))]}
            />
          </Field>
          <div className="row-actions">
            <Btn size="sm" variant="secondary" disabled={model.operation.length === 0} onClick={() => setOperationYear(Math.max(0, (operationYearIndex ?? model.operation.length - 1) - 1))}>
              Año anterior
            </Btn>
            <Btn size="sm" variant="secondary" disabled={model.operation.length === 0} onClick={() => setOperationYear(Math.min(model.operation.length - 1, (operationYearIndex ?? -1) + 1))}>
              Año siguiente
            </Btn>
            <Btn size="sm" variant="primary" icon={<Play size={12} />} onClick={() => setModule("modelo")}>
              Ver en 3D
            </Btn>
          </div>
          {activeYear ? (
            <div className="inline-stat-block">
              <div><span>Año {activeYear.year}</span><strong>{fmtPct(activeYear.fillPct, 1)}</strong></div>
              <ProgressBar value={activeYear.fillPct} max={100} showValue label="Llenado acumulado" tone="leaf" />
              <p className="muted-small">
                Activas: {activeYear.activeCellNames.join(", ") || "—"}. Cerradas: {activeYear.closedCellNames.join(", ") || "—"}.
              </p>
            </div>
          ) : (
            <InlineNote tone="neutral">Se muestra el estado final del horizonte. Elija un año para revisar un corte intermedio.</InlineNote>
          )}
        </Panel>
      </div>

      <Panel title="Secuencia de celdas" eyebrow="Asignación por volumen" description="El año de cierre corresponde al año en que la celda completa su volumen de residuos. La asignación es secuencial; no modela frentes simultáneos dentro de una misma celda." flush>
        <DataTable columns={sequenceColumns} rows={sequence} rowKey={(row) => row.cellId} dense />
      </Panel>

      <Panel title="Operación año a año" eyebrow={`${model.operation.length} año(s)`} description="Celdas activas y cerradas derivadas de la asignación de volumen." flush>
        <DataTable columns={annualColumns} rows={model.operation} rowKey={(row) => String(row.year)} dense maxHeight={420} activeKey={activeYear ? String(activeYear.year) : null} onRowClick={(row) => setOperationYear(model.operation.findIndex((item) => item.year === row.year))} />
      </Panel>

      <div className="split-grid">
        <ChartCard
          title="Residuos dispuestos y llenado"
          subtitle="Barras: toneladas anuales. Línea: porcentaje acumulado de llenado."
          height={260}
          legend={[
            { label: "Dispuesto (t)", color: CHART_COLORS.blue },
            { label: "Llenado (%)", color: CHART_COLORS.leaf },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis yAxisId="mass" {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={52} />
              <YAxis yAxisId="pct" orientation="right" {...axisProps} domain={[0, 100]} tickFormatter={(v) => `${v} %`} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="mass" dataKey="dispuesto" name="Dispuesto (t)" fill={CHART_COLORS.blue} opacity={0.8} isAnimationActive={false} />
              <Line yAxisId="pct" type="monotone" dataKey="llenado" name="Llenado (%)" stroke={CHART_COLORS.leaf} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cota máxima alcanzada" subtitle="Cota superior simulada de las celdas con residuos, en m s. n. m." height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${fmt(Number(v), 0)} m`} width={52} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip content={<ChartTooltip unit="m" />} />
              <Line type="monotone" dataKey="cota" name="Cota máxima" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Panel title="Alcance operativo" eyebrow="Trazabilidad" description="El módulo describe la secuencia volumétrica; no sustituye el plan operativo ni el análisis de riesgos del sitio.">
        <Callout tone="warn" title="La secuencia no es un plan de operación">
          El motor asigna volumen en orden de celdas y calcula apertura y cierre por capacidad. No modela frentes simultáneos, rutas internas, maquinaria, tiempos de descarga ni cierre transitorio. La cobertura diaria y la compactación son declaraciones operativas.
        </Callout>
        <div className="tag-row">
          <Reference>MINAM 2011, pp. 61–64</Reference>
          <Reference>Honduras 2014, pp. 42–43</Reference>
          <Badge tone="amber">Programa de operación por validar</Badge>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Layers3 size={14} /> {sequence.filter((cell) => cell.openYear !== null).length} celda(s) abiertas · {sequence.filter((cell) => cell.closeYear !== null).length} cerrada(s) · {model.operation.length} años
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportWasteCsv(model, project)}>Exportar balance CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("geotecnia")}>Continuar a geotecnia</Btn>
        </div>
      </div>
    </div>
  );
}
