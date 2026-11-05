"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Beaker,
  Copy,
  Download,
  GitCompareArrows,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel, useScenarioSummaries } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { exportScenariosCsv } from "@/lib/exporters";
import { fmt, fmtCompact, fmtPct, fmtUsd } from "@/lib/format";
import {
  Badge,
  Btn,
  Callout,
  ConfirmDialog,
  DataTable,
  Field,
  Kpi,
  KpiGrid,
  PageHeader,
  Panel,
  Segmented,
  SelectField,
  TextArea,
  TextField,
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, SERIES_COLORS, axisProps } from "@/components/ui/charts";
import type { ScenarioSummary } from "@/lib/engine/model";
import type { ScenarioKind } from "@/lib/types";
import { FormGrid, InlineNote } from "./shared";

const KIND_LABEL: Record<ScenarioKind, string> = {
  base: "Base",
  conservador: "Conservador",
  "generacion-elevada": "Generación elevada",
  "mayor-recuperacion": "Mayor recuperación",
  precipitaciones: "Precipitaciones extremas",
  "optimizacion-capacidad": "Optimización de capacidad",
  "clausura-anticipada": "Clausura anticipada",
  personalizado: "Personalizado",
};

const METRICS = [
  { value: "capacityT", label: "Capacidad", unit: "t", color: CHART_COLORS.leaf },
  { value: "lifeYears", label: "Vida útil", unit: "años", color: CHART_COLORS.blue },
  { value: "leachateM3", label: "Lixiviado", unit: "m³", color: CHART_COLORS.amber },
  { value: "ch4T", label: "CH₄", unit: "t", color: CHART_COLORS.orange },
  { value: "npvUsd", label: "VPN", unit: "USD", color: CHART_COLORS.purple },
  { value: "fs", label: "FS", unit: "", color: CHART_COLORS.clay },
] as const;

type MetricKey = (typeof METRICS)[number]["value"];

function delta(value: number, base: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
  return ((value - base) / base) * 100;
}

export default function Escenarios() {
  const { project, scenario } = useModel();
  const summaries = useScenarioSummaries();
  const setActiveScenario = useStore((s) => s.setActiveScenario);
  const updateScenarioMeta = useStore((s) => s.updateScenarioMeta);
  const addScenario = useStore((s) => s.setDialog);
  const duplicateScenario = useStore((s) => s.duplicateScenario);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const setBaseScenario = useStore((s) => s.setBaseScenario);
  const resetScenarioToBase = useStore((s) => s.resetScenarioToBase);
  const setModule = useStore((s) => s.setModule);
  const pushToast = useStore((s) => s.pushToast);

  const [metric, setMetric] = useState<MetricKey>("capacityT");
  const [pendingDelete, setPendingDelete] = useState<ScenarioSummary | null>(null);
  const [pendingReset, setPendingReset] = useState(false);

  const base = summaries.find((s) => s.scenario.isBase) ?? summaries[0];
  const active = summaries.find((s) => s.scenario.id === scenario.id) ?? summaries[0];
  const selectedMetric = METRICS.find((m) => m.value === metric) ?? METRICS[0];

  const chartData = summaries.map((summary, index) => ({
    name: summary.scenario.name,
    value: summary[metric],
    color: summary.scenario.color || SERIES_COLORS[index % SERIES_COLORS.length],
    isBase: summary.scenario.isBase,
  }));

  const deltaRows = useMemo(
    () =>
      summaries.map((summary) => ({
        id: summary.scenario.id,
        name: summary.scenario.name,
        life: delta(summary.lifeYears, base.lifeYears),
        leachate: delta(summary.leachateM3, base.leachateM3),
        ch4: delta(summary.ch4T, base.ch4T),
        energy: delta(summary.energyMWh, base.energyMWh),
        npv: delta(summary.npvUsd, base.npvUsd),
      })),
    [summaries, base],
  );

  const columns: TableColumn<ScenarioSummary>[] = [
    {
      key: "name",
      label: "Escenario",
      render: (row) => (
        <span className="cell-name">
          <span className="cell-swatch" style={{ background: row.scenario.color }} />
          <strong>{row.scenario.name}</strong>
          {row.scenario.id === scenario.id ? <Badge tone="leaf">Activo</Badge> : null}
          {row.scenario.isBase ? <Badge tone="blue">Base</Badge> : null}
        </span>
      ),
    },
    { key: "kind", label: "Tipo", render: (row) => KIND_LABEL[row.scenario.kind] },
    { key: "capacityT", label: "Capacidad", align: "right", render: (row) => `${fmt(row.capacityT)} t` },
    { key: "lifeYears", label: "Vida útil", align: "right", render: (row) => `${fmt(row.lifeYears, 1)} años` },
    { key: "exhaustion", label: "Agotamiento", align: "right", render: (row) => (row.exhaustionYear ? fmt(row.exhaustionYear, 1) : "—") },
    { key: "leachateM3", label: "Lixiviado", align: "right", render: (row) => `${fmtCompact(row.leachateM3)} m³` },
    { key: "ch4T", label: "CH₄", align: "right", render: (row) => `${fmt(row.ch4T)} t` },
    { key: "energyMWh", label: "Energía", align: "right", render: (row) => `${fmtCompact(row.energyMWh)} MWh` },
    { key: "npvUsd", label: "VPN", align: "right", render: (row) => fmtUsd(row.npvUsd) },
    { key: "fs", label: "FS", align: "right", render: (row) => fmt(row.fs, 2) },
    {
      key: "actions",
      label: "",
      width: "124px",
      render: (row) => (
        <span className="row-actions">
          <button
            type="button"
            className="icon-button"
            title="Duplicar escenario"
            aria-label={`Duplicar ${row.scenario.name}`}
            onClick={(event) => {
              event.stopPropagation();
              duplicateScenario(row.scenario.id);
              pushToast({ kind: "ok", title: "Escenario duplicado", detail: row.scenario.name });
            }}
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Marcar como base"
            aria-label={`Marcar ${row.scenario.name} como base`}
            disabled={row.scenario.isBase}
            onClick={(event) => {
              event.stopPropagation();
              setBaseScenario(row.scenario.id);
              pushToast({ kind: "ok", title: "Escenario base actualizado", detail: row.scenario.name });
            }}
          >
            <Star size={12} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Eliminar escenario"
            aria-label={`Eliminar ${row.scenario.name}`}
            disabled={row.scenario.isBase}
            onClick={(event) => {
              event.stopPropagation();
              setPendingDelete(row);
            }}
          >
            <Trash2 size={12} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 11 · Escenarios"
        title="Comparación de alternativas"
        description="Todos los escenarios se calculan con el mismo motor. Las diferencias provienen de sus parámetros, no de fórmulas distintas. El escenario base sirve de referencia para los deltas."
        actions={
          <>
            <Btn variant="secondary" icon={<GitCompareArrows size={14} />} onClick={() => setModule("resultados")}>Ver resultados</Btn>
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => addScenario("new-scenario")}>Nuevo escenario</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Escenario activo" value={scenario.name} hint={`${KIND_LABEL[scenario.kind]} · ${scenario.isBase ? "base del proyecto" : "derivado"}`} tone="leaf" />
        <Kpi label="Capacidad" value={fmtCompact(active.capacityT)} unit="t" hint={`Base: ${fmtCompact(base.capacityT)} t`} tone="blue" />
        <Kpi label="Vida útil" value={fmt(active.lifeYears, 1)} unit="años" hint={delta(active.lifeYears, base.lifeYears) !== null ? `${fmt(delta(active.lifeYears, base.lifeYears) ?? 0, 1)} % respecto de la base` : "Sin base comparable"} tone="amber" />
        <Kpi label="VPN" value={fmtUsd(active.npvUsd)} hint="Costos declarados, no estimación de mercado" tone="default" />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Metadatos del escenario activo" eyebrow="Edición" description="El nombre, tipo, color y descripción se guardan en el proyecto. Cambiar el tipo no recalcula parámetros; solo documenta la intención.">
          <FormGrid columns={2}>
            <Field label="Nombre">
              <TextField value={scenario.name} onChange={(event) => updateScenarioMeta({ name: event.target.value })} maxLength={60} />
            </Field>
            <Field label="Tipo de escenario">
              <SelectField
                value={scenario.kind}
                onChange={(value) => updateScenarioMeta({ kind: value as ScenarioKind })}
                options={(Object.keys(KIND_LABEL) as ScenarioKind[]).map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))}
              />
            </Field>
            <Field label="Color de identificación">
              <input
                className="input color-input"
                type="color"
                value={scenario.color}
                onChange={(event) => updateScenarioMeta({ color: event.target.value })}
                aria-label="Color del escenario"
              />
            </Field>
            <Field label="Base del proyecto">
              <div className="readonly-value">{scenario.isBase ? "Sí, referencia del proyecto" : "No, escenario derivado"}</div>
            </Field>
            <Field label="Descripción" className="span-2">
              <TextArea rows={3} value={scenario.description} onChange={(event) => updateScenarioMeta({ description: event.target.value })} />
            </Field>
          </FormGrid>
          <div className="row-actions">
            <Btn
              size="sm"
              variant="secondary"
              icon={<RotateCcw size={12} />}
              disabled={scenario.isBase}
              onClick={() => setPendingReset(true)}
            >
              Restablecer desde la base
            </Btn>
            <Btn
              size="sm"
              variant="outline"
              icon={<Copy size={12} />}
              onClick={() => {
                duplicateScenario(scenario.id);
                pushToast({ kind: "ok", title: "Escenario duplicado", detail: `Se creó una copia de ${scenario.name}.` });
              }}
            >
              Duplicar activo
            </Btn>
          </div>
          <InlineNote tone="neutral">
            Un escenario derivado conserva una copia independiente de todos los parámetros. Los cambios en este escenario no alteran el base.
          </InlineNote>
        </Panel>

        <Panel title="Diferencia contra la base" eyebrow="Lectura comparativa" description="Los porcentajes se calculan contra los resultados del escenario base. Un valor negativo en VPN representa un menor costo presente neto.">
          <div className="comparison-list">
            <div>
              <span>Capacidad</span>
              <strong>{fmt(active.capacityT)} t</strong>
              <Badge tone={(delta(active.capacityT, base.capacityT) ?? 0) >= 0 ? "leaf" : "amber"}>{fmt(delta(active.capacityT, base.capacityT) ?? 0, 1)} %</Badge>
            </div>
            <div>
              <span>Vida útil</span>
              <strong>{fmt(active.lifeYears, 1)} años</strong>
              <Badge tone={(delta(active.lifeYears, base.lifeYears) ?? 0) >= 0 ? "leaf" : "red"}>{fmt(delta(active.lifeYears, base.lifeYears) ?? 0, 1)} %</Badge>
            </div>
            <div>
              <span>Lixiviado total</span>
              <strong>{fmt(active.leachateM3)} m³</strong>
              <Badge tone={(delta(active.leachateM3, base.leachateM3) ?? 0) <= 0 ? "leaf" : "amber"}>{fmt(delta(active.leachateM3, base.leachateM3) ?? 0, 1)} %</Badge>
            </div>
            <div>
              <span>CH₄ generado</span>
              <strong>{fmt(active.ch4T)} t</strong>
              <Badge tone={(delta(active.ch4T, base.ch4T) ?? 0) <= 0 ? "leaf" : "amber"}>{fmt(delta(active.ch4T, base.ch4T) ?? 0, 1)} %</Badge>
            </div>
            <div>
              <span>Energía</span>
              <strong>{fmt(active.energyMWh, 1)} MWh</strong>
              <Badge tone={(delta(active.energyMWh, base.energyMWh) ?? 0) >= 0 ? "leaf" : "amber"}>{fmt(delta(active.energyMWh, base.energyMWh) ?? 0, 1)} %</Badge>
            </div>
            <div>
              <span>VPN</span>
              <strong>{fmtUsd(active.npvUsd)}</strong>
              <Badge tone={(delta(active.npvUsd, base.npvUsd) ?? 0) <= 0 ? "leaf" : "red"}>{fmt(delta(active.npvUsd, base.npvUsd) ?? 0, 1)} %</Badge>
            </div>
          </div>
          <InlineNote tone="neutral">
            La comparación no establece cuál escenario es preferible: la decisión requiere criterios técnicos, ambientales, sociales y económicos fuera del modelo.
          </InlineNote>
        </Panel>
      </div>

      <Panel
        title="Escenarios del proyecto"
        eyebrow={`${summaries.length} escenario(s)`}
        description="Haga clic en una fila para activar el escenario. Duplicar, marcar como base o eliminar desde las acciones de la fila."
        actions={<Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={() => exportScenariosCsv(summaries, project)}>Exportar comparación CSV</Btn>}
        flush
      >
        <DataTable
          columns={columns}
          rows={summaries}
          rowKey={(row) => row.scenario.id}
          onRowClick={(row) => setActiveScenario(row.scenario.id)}
          activeKey={scenario.id}
          dense
          maxHeight={420}
        />
      </Panel>

      <div className="split-grid">
        <ChartCard
          title="Comparación por indicador"
          subtitle="La barra resaltada corresponde al escenario activo."
          height={280}
          legend={[{ label: selectedMetric.label, color: selectedMetric.color }]}
          action={
            <Segmented
              size="sm"
              ariaLabel="Indicador de comparación"
              value={metric}
              onChange={(value) => setMetric(value)}
              options={METRICS.map((item) => ({ value: item.value, label: item.label }))}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} angle={-12} textAnchor="end" height={54} />
              <YAxis {...axisProps} tickFormatter={(v) => (metric === "npvUsd" ? fmtCompact(Number(v)) : fmtCompact(Number(v)))} width={54} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) => (metric === "npvUsd" ? fmtUsd(value) : `${fmt(value, 2)}${selectedMetric.unit ? ` ${selectedMetric.unit}` : ""}`)}
                  />
                }
              />
              <Bar dataKey="value" name={selectedMetric.label} isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === scenario.name ? selectedMetric.color : `${selectedMetric.color}66`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel title="Deltas de todos los escenarios" eyebrow="Tabla comparativa" description="Cambio porcentual respecto del escenario base. Un guion significa que la base no permite calcular el porcentaje." flush>
          <DataTable
            columns={[
              { key: "name", label: "Escenario", render: (row) => <strong>{row.name}</strong> },
              { key: "life", label: "Δ vida", align: "right", render: (row) => (row.life === null ? "—" : `${fmt(row.life, 1)} %`) },
              { key: "leachate", label: "Δ lixiviado", align: "right", render: (row) => (row.leachate === null ? "—" : `${fmt(row.leachate, 1)} %`) },
              { key: "ch4", label: "Δ CH₄", align: "right", render: (row) => (row.ch4 === null ? "—" : `${fmt(row.ch4, 1)} %`) },
              { key: "energy", label: "Δ energía", align: "right", render: (row) => (row.energy === null ? "—" : `${fmt(row.energy, 1)} %`) },
              { key: "npv", label: "Δ VPN", align: "right", render: (row) => (row.npv === null ? "—" : `${fmt(row.npv, 1)} %`) },
            ]}
            rows={deltaRows}
            rowKey={(row) => row.id}
            dense
          />
        </Panel>
      </div>

      <Panel title="Alcance de la comparación" eyebrow="Trazabilidad" description="Los escenarios son hipótesis de parámetros; no son alternativas de sitio ni diseños construidos.">
        <Callout tone="info" title="Comparación de parámetros, no de decisiones">
          Cada escenario usa la misma geometría base salvo que sus parámetros la modifiquen. La comparación no incorpora cambios de sitio, licenciamiento, aceptación social ni cronograma de inversión.
        </Callout>
        <div className="callout-inline">
          <Beaker size={14} />
          <span>Para evaluar una geometría alternativa, duplique el proyecto o cree un escenario y edite las celdas en el módulo correspondiente.</span>
        </div>
      </Panel>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar escenario"
        description={pendingDelete ? `Se eliminará «${pendingDelete.scenario.name}» del proyecto. El escenario base no puede eliminarse.` : undefined}
        confirmLabel="Eliminar escenario"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteScenario(pendingDelete.scenario.id);
          pushToast({ kind: "ok", title: "Escenario eliminado", detail: pendingDelete.scenario.name });
          setPendingDelete(null);
        }}
      >
        <p className="muted-small">Esta acción no se puede deshacer desde la interfaz.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingReset}
        title="Restablecer desde la base"
        description={`Se reemplazarán todos los parámetros de «${scenario.name}» por los del escenario base.`}
        confirmLabel="Restablecer parámetros"
        tone="primary"
        onClose={() => setPendingReset(false)}
        onConfirm={() => {
          resetScenarioToBase();
          pushToast({ kind: "ok", title: "Escenario restablecido", detail: "Los parámetros se copiaron desde el escenario base." });
          setPendingReset(false);
        }}
      >
        <p className="muted-small">El nombre y la descripción del escenario se conservan; solo cambian los parámetros técnicos.</p>
      </ConfirmDialog>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <GitCompareArrows size={14} /> {summaries.length} escenarios · base: {base.scenario.name} · activo: {scenario.name}
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportScenariosCsv(summaries, project)}>Exportar CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("sensibilidad")}>Continuar a sensibilidad</Btn>
        </div>
      </div>
    </div>
  );
}
