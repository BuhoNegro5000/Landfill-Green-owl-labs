"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beaker,
  Download,
  FlaskConical,
  Play,
  RotateCcw,
  ShieldQuestion,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import {
  computeSensitivity,
  runMonteCarlo,
  type MonteCarloResult,
  type SensitivityMetrics,
} from "@/lib/engine/sensitivity";
import { downloadText, safeFileName, toCsv } from "@/lib/exporters";
import { fmt, fmtCompact } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  Badge,
  Btn,
  Callout,
  Field,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  Panel,
  Segmented,
  type TableColumn,
  DataTable,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import { FormGrid, FormulaHint, InlineNote, MiniStat } from "./shared";

type MetricKey = keyof SensitivityMetrics;

const METRICS: { key: MetricKey; label: string; unit: string; digits: number; color: string }[] = [
  { key: "lifeYears", label: "Vida útil", unit: "años", digits: 1, color: CHART_COLORS.blue },
  { key: "totalLeachateM3", label: "Lixiviado", unit: "m³", digits: 0, color: CHART_COLORS.amber },
  { key: "totalCh4T", label: "CH₄", unit: "t", digits: 1, color: CHART_COLORS.orange },
  { key: "storageM3", label: "Almacenamiento", unit: "m³", digits: 0, color: CHART_COLORS.purple },
];

interface OatRow {
  id: string;
  label: string;
  parameter: string;
  range: string;
  lifeLow: number;
  lifeHigh: number;
  leachateLow: number;
  leachateHigh: number;
  ch4Low: number;
  ch4High: number;
  impact: number;
}

function delta(value: number, base: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return 0;
  return ((value - base) / base) * 100;
}

function pctPair(low: number, high: number): string {
  const left = `${fmt(low, 1)} %`;
  const right = `${high >= 0 ? "+" : ""}${fmt(high, 1)} %`;
  return `${left} → ${right}`;
}

function signed(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${fmt(value, digits)} %`;
}

export default function Sensibilidad() {
  const { project, scenario } = useModel();
  const pushToast = useStore((s) => s.pushToast);
  const setModule = useStore((s) => s.setModule);

  const sensitivity = useMemo(
    () => computeSensitivity(scenario.params, project.horizonYears),
    [scenario.params, project.horizonYears],
  );

  const [metric, setMetric] = useState<MetricKey>("lifeYears");
  const [iterations, setIterations] = useState(200);
  const [seed, setSeed] = useState(20260101);
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  const selectedMetric = METRICS.find((item) => item.key === metric) ?? METRICS[0];

  const oatRows: OatRow[] = useMemo(
    () =>
      sensitivity.rows.map((row) => ({
        id: row.id,
        label: row.label,
        parameter: row.parameter,
        range: `${row.lowLabel} / ${row.highLabel}`,
        lifeLow: delta(row.low.lifeYears, sensitivity.base.lifeYears),
        lifeHigh: delta(row.high.lifeYears, sensitivity.base.lifeYears),
        leachateLow: delta(row.low.totalLeachateM3, sensitivity.base.totalLeachateM3),
        leachateHigh: delta(row.high.totalLeachateM3, sensitivity.base.totalLeachateM3),
        ch4Low: delta(row.low.totalCh4T, sensitivity.base.totalCh4T),
        ch4High: delta(row.high.totalCh4T, sensitivity.base.totalCh4T),
        impact: row.maxImpactPct,
      })),
    [sensitivity],
  );

  const tornadoData = useMemo(
    () =>
      sensitivity.rows.map((row) => ({
        label: row.label,
        low: delta(row.low[metric], sensitivity.base[metric]),
        high: delta(row.high[metric], sensitivity.base[metric]),
      })),
    [sensitivity, metric],
  );

  const runMc = () => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        const result = runMonteCarlo(scenario.params, project.horizonYears, iterations, seed);
        setMc(result);
        pushToast({
          kind: "ok",
          title: "Monte Carlo ejecutado",
          detail: `${iterations} iteraciones con semilla ${seed}. Los percentiles son supuestos del modelo.`,
        });
      } catch (error) {
        pushToast({ kind: "error", title: "No se pudo ejecutar Monte Carlo", detail: (error as Error).message });
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const exportOat = () => {
    const csv = toCsv(
      [
        { key: "variable", label: "Variable" },
        { key: "parameter", label: "Parámetro" },
        { key: "range", label: "Perturbación" },
        { key: "lifeLow", label: "Δ vida baja (%)" },
        { key: "lifeHigh", label: "Δ vida alta (%)" },
        { key: "leachateLow", label: "Δ lixiviado bajo (%)" },
        { key: "leachateHigh", label: "Δ lixiviado alto (%)" },
        { key: "ch4Low", label: "Δ CH4 bajo (%)" },
        { key: "ch4High", label: "Δ CH4 alto (%)" },
        { key: "impact", label: "Impacto máximo absoluto (%)" },
      ],
      oatRows as unknown as Record<string, string | number>[],
    );
    downloadText(csv, `${safeFileName(project.name)}-sensibilidad-oat.csv`, "text/csv;charset=utf-8");
    pushToast({ kind: "ok", title: "Sensibilidad exportada", detail: "Archivo CSV generado localmente." });
  };

  const exportMc = () => {
    if (!mc) return;
    const rows = (Object.keys(mc.metrics) as (keyof MonteCarloResult["metrics"])[]).map((key) => ({
      metric: key,
      p10: mc.metrics[key].p10,
      p50: mc.metrics[key].p50,
      p90: mc.metrics[key].p90,
      mean: mc.metrics[key].mean,
    }));
    const csv = toCsv(
      [
        { key: "metric", label: "Indicador" },
        { key: "p10", label: "P10" },
        { key: "p50", label: "P50" },
        { key: "p90", label: "P90" },
        { key: "mean", label: "Media" },
      ],
      rows,
    );
    downloadText(
      csv,
      `${safeFileName(project.name)}-monte-carlo-${iterations}-${seed}.csv`,
      "text/csv;charset=utf-8",
    );
    pushToast({ kind: "ok", title: "Monte Carlo exportado", detail: `${iterations} iteraciones · semilla ${seed}.` });
  };

  const columns: TableColumn<OatRow>[] = [
    {
      key: "label",
      label: "Variable",
      render: (row) => (
        <span>
          <strong>{row.label}</strong>
          <span className="muted-small"> · {row.parameter}</span>
        </span>
      ),
    },
    { key: "range", label: "Perturbación", render: (row) => row.range },
    { key: "life", label: "Δ vida", align: "right", render: (row) => pctPair(row.lifeLow, row.lifeHigh) },
    { key: "leachate", label: "Δ lixiviado", align: "right", render: (row) => pctPair(row.leachateLow, row.leachateHigh) },
    { key: "ch4", label: "Δ CH₄", align: "right", render: (row) => pctPair(row.ch4Low, row.ch4High) },
    {
      key: "impact",
      label: "Impacto máx.",
      align: "right",
      render: (row) => <Badge tone={row.impact > 50 ? "red" : row.impact > 20 ? "amber" : "leaf"}>{fmt(row.impact, 1)} %</Badge>,
    },
  ];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 12 · Sensibilidad"
        title="Qué mueve el resultado"
        description="Análisis uno a la vez (OAT) sobre el escenario activo y simulación Monte Carlo opcional. Ambos son exploraciones de supuestos, no intervalos de confianza ni inferencia estadística de campo."
        actions={
          <>
            <Btn variant="outline" icon={<Download size={14} />} onClick={exportOat}>Exportar OAT</Btn>
            <Btn variant="secondary" icon={<ArrowRight size={14} />} onClick={() => setModule("resultados")}>Ver resultados</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Vida útil base" value={fmt(sensitivity.base.lifeYears, 1)} unit="años" hint="Resultado del escenario activo" tone="blue" />
        <Kpi label="Lixiviado base" value={fmtCompact(sensitivity.base.totalLeachateM3)} unit="m³" hint="Total simulado en el horizonte" tone="amber" />
        <Kpi label="CH₄ base" value={fmt(sensitivity.base.totalCh4T)} unit="t" hint="Generado, no capturado" tone="leaf" />
        <Kpi label="Almacenamiento base" value={fmtCompact(sensitivity.base.storageM3)} unit="m³" hint="Recomendación por retención" tone="default" />
      </KpiGrid>

      <Panel
        title="Variable con mayor influencia"
        eyebrow="Lectura OAT"
        description={`Cada variable se perturba de forma independiente. La variable con mayor impacto absoluto es «${sensitivity.rows[0]?.label ?? "—"}».`}
        actions={<Badge tone="outline">{sensitivity.method}</Badge>}
      >
        <div className="inline-stat-block">
          <MiniStat label="Variables evaluadas" value={String(sensitivity.rows.length)} hint="Perturbaciones fijas y documentadas" />
          <MiniStat label="Mayor impacto" value={`${fmt(sensitivity.rows[0]?.maxImpactPct ?? 0, 1)} %`} hint={sensitivity.rows[0]?.label} />
          <MiniStat label="Base de comparación" value={`${project.horizonYears} años`} hint="Horizonte del proyecto" />
        </div>
        <InlineNote tone="neutral">
          El impacto se calcula como el mayor cambio porcentual absoluto entre la perturbación baja y alta de cada variable.
          Un impacto alto no implica causalidad ni probabilidad; solo indica sensibilidad del modelo en el rango probado.
        </InlineNote>
      </Panel>

      <ChartCard
        title="Diagrama tornado por indicador"
        subtitle="Barras hacia la izquierda y derecha del resultado base. El eje es cambio porcentual."
        height={330}
        legend={[
          { label: "Perturbación baja", color: CHART_COLORS.blue },
          { label: "Perturbación alta", color: CHART_COLORS.leaf },
        ]}
        action={
          <Segmented
            size="sm"
            ariaLabel="Indicador del diagrama tornado"
            value={metric}
            onChange={(value) => setMetric(value)}
            options={METRICS.map((item) => ({ value: item.key, label: item.label }))}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tornadoData} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }} stackOffset="sign">
            <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(value) => `${fmt(Number(value), 0)} %`} />
            <YAxis type="category" dataKey="label" width={150} {...axisProps} />
            <Tooltip content={<ChartTooltip unit="%" formatter={(value) => `${signed(value, 1)}`} />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.28)" />
            <Bar dataKey="low" name="Perturbación baja" fill={CHART_COLORS.blue} isAnimationActive={false} radius={[3, 0, 0, 3]} />
            <Bar dataKey="high" name="Perturbación alta" fill={CHART_COLORS.leaf} isAnimationActive={false} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Panel
        title="Análisis uno a la vez"
        eyebrow={`${oatRows.length} variables`}
        description="Cambio porcentual de cada indicador respecto del resultado base. El guion largo separa la perturbación baja de la alta."
        actions={<Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportOat}>Exportar CSV</Btn>}
        flush
      >
        <DataTable columns={columns} rows={oatRows} rowKey={(row) => row.id} dense maxHeight={430} />
      </Panel>

      <div className="split-grid">
        <Panel
          title="Simulación Monte Carlo"
          eyebrow="Incertidumbre"
          description="Muestreo de población, per cápita, precipitación, DOC y k con distribución normal truncada. Las medias son los valores del escenario activo."
        >
          <FormGrid columns={2}>
            <Field label="Iteraciones" hint="Más iteraciones estabilizan los percentiles, con mayor costo de cálculo.">
              <NumberField value={iterations} onChange={setIterations} min={50} max={2000} step={50} unit="iter." />
            </Field>
            <Field label="Semilla" hint="Misma semilla y mismos parámetros producen el mismo resultado.">
              <NumberField value={seed} onChange={setSeed} min={1} max={2147483000} step={1} />
            </Field>
          </FormGrid>
          <div className="row-actions" style={{ marginTop: 10 }}>
            <Btn variant="primary" icon={<Play size={13} />} onClick={runMc} disabled={running}>
              {running ? "Ejecutando…" : "Ejecutar Monte Carlo"}
            </Btn>
            <Btn
              variant="ghost"
              icon={<RotateCcw size={13} />}
              onClick={() => {
                setMc(null);
                setIterations(200);
                setSeed(20260101);
              }}
            >
              Restablecer
            </Btn>
          </div>
          <FormulaHint>
            Percentiles P10, P50 y P90 de vida útil, lixiviado y CH₄. La distribución y los coeficientes de variación están
            documentados en Métodos; no provienen de datos de campo.
          </FormulaHint>
          <div className="assumption-list">
            {(mc?.assumptions ?? [
              "Sin ejecución todavía. Los resultados se generan solo al presionar «Ejecutar Monte Carlo».",
            ]).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </Panel>

        <Panel
          title="Percentiles simulados"
          eyebrow={mc ? `${mc.iterations} iteraciones · semilla ${mc.seed}` : "Sin ejecución"}
          description="P10, P50 y P90 de cada indicador. La media puede diferir del P50 en distribuciones asimétricas."
          actions={mc ? <Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportMc}>Exportar CSV</Btn> : undefined}
          flush
        >
          {mc ? (
            <div className="stack" style={{ padding: 14, gap: 10 }}>
              {(
                [
                  { key: "lifeYears" as const, label: "Vida útil", unit: "años", digits: 1 },
                  { key: "totalLeachateM3" as const, label: "Lixiviado", unit: "m³", digits: 0 },
                  { key: "totalCh4T" as const, label: "CH₄ generado", unit: "t", digits: 1 },
                ] as const
              ).map((item) => (
                <div className="mc-row" key={item.key}>
                  <div className="mc-row-head">
                    <strong>{item.label}</strong>
                    <span>{item.unit}</span>
                  </div>
                  <div className="mc-percentiles">
                    <span><small>P10</small><b>{fmt(mc.metrics[item.key].p10, item.digits)}</b></span>
                    <span><small>P50</small><b>{fmt(mc.metrics[item.key].p50, item.digits)}</b></span>
                    <span><small>P90</small><b>{fmt(mc.metrics[item.key].p90, item.digits)}</b></span>
                    <span><small>Media</small><b>{fmt(mc.metrics[item.key].mean, item.digits)}</b></span>
                  </div>
                </div>
              ))}
              <InlineNote tone="amber">
                El rango P10–P90 describe la dispersión de los supuestos muestreados. No es un intervalo de confianza
                estadístico ni una probabilidad de falla.
              </InlineNote>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 30 }}>
              <FlaskConical size={20} />
              <h3>Sin resultados Monte Carlo</h3>
              <p>Defina iteraciones y semilla, luego ejecute la simulación. Nada se calcula de forma oculta.</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Alcance del análisis" eyebrow="Trazabilidad" description="La sensibilidad no elige alternativas ni reemplaza un estudio de campo.">
        <Callout tone="warn" title="Interpretación responsable">
          El análisis OAT mueve una variable a la vez y el Monte Carlo asume independencia entre variables. Ninguno de los
          dos incorpora correlaciones, tendencias climáticas, cambios regulatorios ni errores de medición. Los percentiles
          son una exploración de supuestos declarados.
        </Callout>
        <div className="assumption-list">
          {sensitivity.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        <div className="callout-inline">
          <ShieldQuestion size={14} />
          <span>
            Para revisar fórmulas, fuentes y pruebas de referencia, abra <button type="button" className="link-button" onClick={() => setModule("metodos")}>Métodos</button>.
          </span>
        </div>
        <div className="callout-inline">
          <Beaker size={14} />
          <span>Los resultados corresponden al escenario «{scenario.name}» y al horizonte de {project.horizonYears} años.</span>
        </div>
        <div className="callout-inline">
          <Activity size={14} />
          <span>La base se recalcula con el mismo motor cada vez que cambia un parámetro; no se almacenan resultados obsoletos.</span>
        </div>
        <div className="callout-inline">
          <TrendingUp size={14} />
          <span>Un impacto porcentual grande en un indicador pequeño puede tener poca relevancia absoluta; revise siempre los valores base.</span>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <FlaskConical size={14} /> OAT: {sensitivity.rows.length} variables · Monte Carlo: {mc ? `${mc.iterations} iteraciones` : "no ejecutado"}
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={exportOat}>Exportar OAT</Btn>
          <Btn variant="primary" onClick={() => setModule("informes")}>Preparar informe</Btn>
        </div>
      </div>
    </div>
  );
}
