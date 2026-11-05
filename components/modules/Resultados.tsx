"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Download,
  FileJson,
  Gauge,
  Layers3,
  Receipt,
  ShieldAlert,
  Sprout,
  Users,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel, useScenarioSummaries } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { downloadText, exportProjectJson, exportValidationCsv, safeFileName, toCsv } from "@/lib/exporters";
import { fmt, fmtCompact, fmtPct, fmtUsd } from "@/lib/format";
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
  SearchInput,
  Segmented,
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import { FormGrid, InlineNote, IssueSummary, MiniStat } from "./shared";
import type { ModuleId } from "@/lib/nav";

type SeverityFilter = "all" | "error" | "warning" | "info";

interface IssueRow {
  id: string;
  severity: "error" | "warning" | "info";
  module: string;
  title: string;
  detail: string;
  reference?: string;
}

const SEVERITY_LABEL = { error: "Error", warning: "Advertencia", info: "Información" } as const;
const SEVERITY_TONE = { error: "red", warning: "amber", info: "blue" } as const;

const SUMMARY_LINKS: { module: ModuleId; label: string; detail: string; icon: typeof Boxes }[] = [
  { module: "celdas", label: "Geometría", detail: "Celdas, bermas y capas", icon: Boxes },
  { module: "residuos", label: "Residuos", detail: "Generación y vida útil", icon: Users },
  { module: "lixiviados", label: "Lixiviados", detail: "Balance hídrico y drenaje", icon: Layers3 },
  { module: "biogas", label: "Biogás", detail: "Metano, captura y energía", icon: Wind },
  { module: "geotecnia", label: "Geotecnia", detail: "Talud infinito conceptual", icon: Gauge },
  { module: "clausura", label: "Clausura", detail: "Cobertura y monitoreo", icon: Sprout },
];

export default function Resultados() {
  const { project, scenario, model } = useModel();
  const summaries = useScenarioSummaries();
  const documents = useStore((s) => s.documents);
  const update = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const setActiveScenario = useStore((s) => s.setActiveScenario);
  const pushToast = useStore((s) => s.pushToast);

  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");

  const issues: IssueRow[] = useMemo(
    () =>
      model.issues.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        module: issue.module,
        title: issue.title,
        detail: issue.detail,
        reference: issue.reference,
      })),
    [model.issues],
  );

  const filteredIssues = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (severity !== "all" && issue.severity !== severity) return false;
      if (!needle) return true;
      return `${issue.module} ${issue.title} ${issue.detail} ${issue.reference ?? ""}`.toLowerCase().includes(needle);
    });
  }, [issues, severity, search]);

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  const base = summaries.find((item) => item.scenario.isBase) ?? summaries[0];
  const activeSummary = summaries.find((item) => item.scenario.id === scenario.id) ?? summaries[0];

  const costColumns: TableColumn<NonNullable<typeof model.costs.annual>[number]>[] = [
    { key: "year", label: "Año" },
    { key: "opex", label: "OPEX", align: "right", render: (row) => fmtUsd(row.opex) },
    { key: "treatment", label: "Tratamiento", align: "right", render: (row) => fmtUsd(row.treatment) },
    { key: "revenue", label: "Ingresos", align: "right", render: (row) => fmtUsd(row.revenue) },
    { key: "net", label: "Costo neto", align: "right", render: (row) => fmtUsd(row.net) },
    { key: "discounted", label: "Descontado", align: "right", render: (row) => fmtUsd(row.discounted) },
  ];

  const issueColumns: TableColumn<IssueRow>[] = [
    {
      key: "severity",
      label: "Severidad",
      width: "108px",
      render: (row) => <Badge tone={SEVERITY_TONE[row.severity]}>{SEVERITY_LABEL[row.severity]}</Badge>,
    },
    { key: "module", label: "Módulo", width: "130px" },
    { key: "title", label: "Hallazgo", render: (row) => <strong>{row.title}</strong> },
    { key: "detail", label: "Detalle" },
    { key: "reference", label: "Referencia", render: (row) => row.reference ?? "—" },
  ];

  const exportCosts = () => {
    const csv = toCsv(
      [
        { key: "year", label: "Año" },
        { key: "opex", label: "OPEX (USD)" },
        { key: "treatment", label: "Tratamiento (USD)" },
        { key: "revenue", label: "Ingresos (USD)" },
        { key: "net", label: "Costo neto (USD)" },
        { key: "discounted", label: "Costo descontado (USD)" },
      ],
      model.costs.annual,
    );
    downloadText(csv, `${safeFileName(project.name)}-costos.csv`, "text/csv;charset=utf-8");
    pushToast({ kind: "ok", title: "Costos exportados", detail: "Los costos son datos declarados por el usuario." });
  };

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 13 · Resultados"
        title="Síntesis técnica del modelo"
        description={`Escenario «${scenario.name}» · horizonte de ${project.horizonYears} años. Los indicadores provienen del motor y los costos de los parámetros declarados; no son una estimación de mercado.`}
        actions={
          <>
            <Btn variant="outline" icon={<FileJson size={14} />} onClick={() => exportProjectJson(project, documents)}>Exportar proyecto</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("informes")}>Generar informe</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Capacidad de diseño" value={fmtCompact(model.capacity.totalTonnageT)} unit="t" hint={`${fmt(model.capacity.wasteVolumeM3)} m³ de residuos`} tone="leaf" />
        <Kpi label="Vida útil simulada" value={fmt(model.waste.operatingYears, 1)} unit="años" hint={model.waste.exhaustionYear ? `Agotamiento en ${fmt(model.waste.exhaustionYear, 1)}` : "Sin agotamiento en el horizonte"} tone="blue" />
        <Kpi label="Valor presente neto" value={fmtUsd(model.costs.npvUsd)} hint="CAPEX + costos descontados − ingresos" tone="default" />
        <Kpi label="Costo por tonelada" value={fmtUsd(model.costs.costPerTonneUsd)} unit="/t" hint="VPN dividido por masa dispuesta" tone="amber" />
        <Kpi label="Lixiviado total" value={fmtCompact(model.leachate.totalLeachateM3)} unit="m³" hint={`Q pico ${fmt(model.leachate.designPeakFlowLps, 2)} L/s`} tone="amber" />
        <Kpi label="CH₄ generado" value={fmtCompact(model.gas.totalCh4GeneratedT)} unit="t" hint={`${fmtCompact(model.gas.totalEnergyMWh)} MWh potenciales`} tone="leaf" />
        <Kpi label="Factor de seguridad" value={fmt(model.geotech.factorOfSafety, 2)} hint="Talud infinito conceptual" tone={model.geotech.factorOfSafety < 1.3 ? "danger" : "default"} />
        <Kpi label="Validación" value={`${errors} / ${warnings}`} unit="err. / adv." hint={`${issues.length} hallazgos en total`} tone={errors ? "danger" : warnings ? "amber" : "leaf"} />
      </KpiGrid>

      <Panel
        title="Resumen por sistema"
        eyebrow="Navegación técnica"
        description="Cada indicador conserva su módulo de origen. Abra el módulo para editar los parámetros y ver los supuestos completos."
      >
        <div className="summary-tile-grid">
          {SUMMARY_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.module} type="button" className="summary-tile" onClick={() => setModule(item.module)}>
                <span className="summary-tile-icon"><Icon size={16} /></span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowRight size={13} />
              </button>
            );
          })}
        </div>
        {model.issues.length === 0 ? (
          <InlineNote tone="leaf">
            <CheckCircle2 size={13} /> No hay hallazgos de validación. Esto no equivale a aptitud del sitio ni a cumplimiento legal.
          </InlineNote>
        ) : (
          <InlineNote tone={errors ? "danger" : "amber"}>
            <ShieldAlert size={13} /> {errors} error(es) y {warnings} advertencia(s). Revise la tabla de validación antes de usar los resultados.
          </InlineNote>
        )}
      </Panel>

      <div className="split-grid">
        <Panel
          title="Parámetros de costo"
          eyebrow="Datos declarados"
          description="Los costos se aplican al balance anual y al VPN. No se incluyen posclausura, remediación ni contingencias si no se declaran aquí."
        >
          <FormGrid columns={2}>
            <Field label="CAPEX" hint="Inversión inicial registrada en el año 0.">
              <NumberField
                value={model.params.costs.capexUsd}
                onChange={(value) => update((draft) => { draft.costs.capexUsd = value; })}
                min={0}
                step={10000}
                unit="USD"
              />
            </Field>
            <Field label="OPEX por tonelada">
              <NumberField
                value={model.params.costs.opexUsdPerTonne}
                onChange={(value) => update((draft) => { draft.costs.opexUsdPerTonne = value; })}
                min={0}
                step={0.5}
                unit="USD/t"
              />
            </Field>
            <Field label="Tratamiento de lixiviado">
              <NumberField
                value={model.params.costs.leachateTreatmentUsdPerM3}
                onChange={(value) => update((draft) => { draft.costs.leachateTreatmentUsdPerM3 = value; })}
                min={0}
                step={0.5}
                unit="USD/m³"
              />
            </Field>
            <Field label="Ingreso por energía">
              <NumberField
                value={model.params.costs.gasRevenueUsdPerMwh}
                onChange={(value) => update((draft) => { draft.costs.gasRevenueUsdPerMwh = value; })}
                min={0}
                step={1}
                unit="USD/MWh"
              />
            </Field>
            <Field label="Tasa de descuento" hint="Se aplica desde el año 1; el CAPEX no se descuenta.">
              <NumberField
                value={model.params.costs.discountRatePct}
                onChange={(value) => update((draft) => { draft.costs.discountRatePct = value; })}
                min={0}
                max={50}
                step={0.5}
                unit="%"
              />
            </Field>
          </FormGrid>
          <InlineNote tone="neutral">
            Modificar un costo recalcula el VPN y el costo por tonelada; no altera capacidades, vidas útiles ni emisiones.
          </InlineNote>
        </Panel>

        <Panel title="Indicadores económicos" eyebrow="Resultado" description="Cifras derivadas del balance anual y de los parámetros declarados.">
          <div className="inline-stat-block">
            <MiniStat label="CAPEX" value={fmtUsd(model.costs.totalCapexUsd)} />
            <MiniStat label="OPEX acumulado" value={fmtUsd(model.costs.totalOpexUsd)} />
            <MiniStat label="Tratamiento" value={fmtUsd(model.costs.totalTreatmentUsd)} />
            <MiniStat label="Ingresos" value={fmtUsd(model.costs.totalRevenueUsd)} />
            <MiniStat label="VPN" value={fmtUsd(model.costs.npvUsd)} />
            <MiniStat label="Costo unitario" value={`${fmtUsd(model.costs.costPerTonneUsd)}/t`} />
          </div>
          <div className="assumption-list">
            {model.costs.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
          <div className="row-actions">
            <Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportCosts}>Exportar costos CSV</Btn>
          </div>
        </Panel>
      </div>

      <div className="split-grid">
        <ChartCard
          title="Costo anual"
          subtitle="OPEX, tratamiento e ingresos por energía. El costo neto puede ser negativo si los ingresos superan los costos."
          height={300}
          legend={[
            { label: "OPEX", color: CHART_COLORS.blue },
            { label: "Tratamiento", color: CHART_COLORS.amber },
            { label: "Ingresos", color: CHART_COLORS.leaf },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.costs.annual} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(value) => fmtCompact(Number(value))} width={58} />
              <Tooltip content={<ChartTooltip unit="USD" formatter={(value) => fmtUsd(value)} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="opex" name="OPEX" fill={CHART_COLORS.blue} isAnimationActive={false} />
              <Bar dataKey="treatment" name="Tratamiento" fill={CHART_COLORS.amber} isAnimationActive={false} />
              <Bar dataKey="revenue" name="Ingresos" fill={CHART_COLORS.leaf} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel
          title="Comparación con la base"
          eyebrow="Escenario activo"
          description={`Base: «${base.scenario.name}». Haga clic en una fila para activar ese escenario.`}
          actions={<Btn size="sm" variant="outline" onClick={() => setModule("escenarios")}>Comparar todo</Btn>}
          flush
        >
          <DataTable
            columns={[
              {
                key: "name",
                label: "Escenario",
                render: (row) => (
                  <span className="cell-name">
                    <span className="cell-swatch" style={{ background: row.scenario.color }} />
                    <strong>{row.scenario.name}</strong>
                    {row.scenario.isBase ? <Badge tone="blue">Base</Badge> : null}
                  </span>
                ),
              },
              { key: "capacityT", label: "Capacidad", align: "right", render: (row) => `${fmtCompact(row.capacityT)} t` },
              { key: "lifeYears", label: "Vida", align: "right", render: (row) => `${fmt(row.lifeYears, 1)} a` },
              { key: "npvUsd", label: "VPN", align: "right", render: (row) => fmtUsd(row.npvUsd) },
            ]}
            rows={summaries}
            rowKey={(row) => row.scenario.id}
            onRowClick={(row) => setActiveScenario(row.scenario.id)}
            activeKey={scenario.id}
            dense
            maxHeight={280}
          />
          <div style={{ padding: 12 }}>
            <InlineNote tone="neutral">
              Activo: <strong>{activeSummary.scenario.name}</strong>. Las diferencias provienen de los parámetros, no de
              fórmulas distintas.
            </InlineNote>
          </div>
        </Panel>
      </div>

      <Panel
        title="Hallazgos de validación"
        eyebrow={`${filteredIssues.length} de ${issues.length}`}
        description="Reglas de revisión del motor. Un error indica una inconsistencia o un dato faltante crítico; una advertencia señala un valor fuera de rango de referencia."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar hallazgo…" />
            <Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={() => exportValidationCsv(model, project)}>CSV</Btn>
          </>
        }
      >
        <div className="validation-toolbar">
          <Segmented
            size="sm"
            ariaLabel="Filtrar por severidad"
            value={severity}
            onChange={(value) => setSeverity(value as SeverityFilter)}
            options={[
              { value: "all", label: "Todos" },
              { value: "error", label: "Errores" },
              { value: "warning", label: "Advertencias" },
              { value: "info", label: "Información" },
            ]}
          />
          <IssueSummary issues={model.issues} />
        </div>
        <DataTable
          columns={issueColumns}
          rows={filteredIssues}
          rowKey={(row) => row.id}
          dense
          maxHeight={440}
          empty="No hay hallazgos con el filtro seleccionado."
        />
      </Panel>

      <Panel title="Lectura responsable" eyebrow="Alcance" description="Los resultados son una estimación de diseño; no son un dictamen de aptitud, estabilidad ni cumplimiento.">
        <Callout tone={errors ? "danger" : warnings ? "warn" : "info"} title="Antes de usar estas cifras">
          {errors > 0
            ? "Existen errores de validación. Corrija los datos o confirme explícitamente por qué el resultado sigue siendo útil."
            : warnings > 0
              ? "Existen advertencias. Revise los valores fuera de rango de referencia antes de tomar decisiones."
              : "No se detectaron errores ni advertencias, pero la validación interna no reemplaza la revisión profesional."}
        </Callout>
        <div className="callout-inline">
          <Receipt size={14} />
          <span>Los costos son datos del usuario. No incluyen posclausura, contingencias, impuestos ni costos financieros si no se declaran.</span>
        </div>
        <div className="callout-inline">
          <ShieldAlert size={14} />
          <span>La completitud del emplazamiento es {fmtPct(model.completeness.pct)}; la falta de datos no se compensa con valores por defecto silenciosos.</span>
        </div>
        <div className="callout-inline">
          <Gauge size={14} />
          <span>La geotecnia se limita a un mecanismo traslacional superficial de talud infinito.</span>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Receipt size={14} /> Motor {model.engineVersion} · {issues.length} hallazgos · {summaries.length} escenarios
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={exportCosts}>Exportar costos</Btn>
          <Btn variant="primary" onClick={() => setModule("informes")}>Preparar informe PDF</Btn>
        </div>
      </div>
    </div>
  );
}
