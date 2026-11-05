"use client";

import { useMemo } from "react";
import { ArrowRight, Calculator, Download, Gauge, Layers3, Scale, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { exportCapacityCsv } from "@/lib/exporters";
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
import { FormGrid, FormulaHint, InlineNote, Reference } from "./shared";
import type { CellCapacity } from "@/lib/engine/capacity";

export default function Capacidad() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const capacity = model.capacity;
  const waste = model.params.waste;

  const columns: TableColumn<CellCapacity>[] = [
    { key: "name", label: "Celda", render: (row) => <strong>{row.name}</strong> },
    { key: "sequenceOrder", label: "Sec.", align: "center", width: "52px" },
    { key: "grossVolumeM3", label: "Bruto", align: "right", render: (row) => fmt(row.grossVolumeM3) },
    { key: "linerVolumeM3", label: "Barrera", align: "right", render: (row) => fmt(row.linerVolumeM3) },
    { key: "infrastructureReserveM3", label: "Reserva infra.", align: "right", render: (row) => fmt(row.infrastructureReserveM3) },
    { key: "wasteVolumeM3", label: "Residuos", align: "right", render: (row) => fmt(row.wasteVolumeM3) },
    { key: "coverVolumeM3", label: "Cobertura", align: "right", render: (row) => fmt(row.coverVolumeM3) },
    { key: "tonnageT", label: "Tonelaje", align: "right", render: (row) => fmt(row.tonnageT) },
    {
      key: "fill",
      label: "Llenado",
      align: "right",
      render: (row) => (
        <div className="table-progress">
          <ProgressBar value={row.fillFraction * 100} max={100} height={4} tone={row.fillFraction >= 1 ? "leaf" : "amber"} />
          <span>{fmtPct(row.fillFraction * 100, 0)}</span>
        </div>
      ),
    },
    { key: "topElevationM", label: "Cota superior", align: "right", render: (row) => `${fmt(row.topElevationM, 1)} m` },
  ];

  const barData = useMemo(
    () =>
      capacity.cells.map((cell) => ({
        name: cell.name,
        residuos: cell.wasteVolumeM3,
        cobertura: cell.coverVolumeM3,
        barrera: cell.linerVolumeM3,
        reserva: cell.infrastructureReserveM3,
      })),
    [capacity.cells],
  );

  const densityBasis = waste.capacityDensityBasis === "initial" ? "Densidad inicial compactada" : "Densidad final estabilizada";

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 04 · Capacidad"
        title="Capacidad, reservas y tonelaje"
        description="El volumen bruto se descuenta por barrera, reserva de infraestructura y cobertura. El resultado es una estimación volumétrica, no una cubicación topográfica."
        actions={
          <>
            <Btn variant="secondary" icon={<Layers3 size={14} />} onClick={() => setModule("celdas")}>Revisar geometría</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("residuos")}>Balance de residuos</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Volumen bruto" value={fmt(capacity.geometricGrossVolumeM3)} unit="m³" hint="Integración prismoidal de todas las celdas" icon={<Gauge size={15} />} />
        <Kpi label="Volumen útil" value={fmt(capacity.usableVolumeM3)} unit="m³" hint={`Bruto × ${capacity.utilizationFactor.toFixed(2)} − barrera − reserva`} tone="blue" />
        <Kpi label="Volumen de residuos" value={fmtCompact(capacity.wasteVolumeM3)} unit="m³" hint={`Cobertura ${fmtPct(capacity.coverRatioPct, 0)} del volumen de residuos`} tone="leaf" />
        <Kpi label="Capacidad" value={fmtCompact(capacity.totalTonnageT)} unit="t" hint={`${densityBasis} · ${fmt(capacity.densityKgM3)} kg/m³`} tone="amber" icon={<Scale size={15} />} />
      </KpiGrid>

      <Panel title="Parámetros de capacidad" eyebrow="Escenario activo" description="Estos parámetros alimentan el balance de residuos, la vida útil y el informe. La densidad se toma de la base seleccionada.">
        <FormGrid columns={3}>
          <Field label="Factor de utilización" hint="Fracción del volumen bruto aprovechable.">
            <NumberField value={model.params.geometry.utilizationFactor} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.utilizationFactor = v; })} min={0.3} max={1} step={0.01} />
          </Field>
          <Field label="Reserva de infraestructura">
            <NumberField value={model.params.geometry.infrastructureReservePct} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.infrastructureReservePct = v; })} min={0} max={30} step={0.5} unit="%" />
          </Field>
          <Field label="Relación de cobertura" hint="Volumen de cobertura como porcentaje del volumen de residuos.">
            <NumberField value={waste.coverRatioPct} onChange={(v) => updateScenarioParams((draft) => { draft.waste.coverRatioPct = v; })} min={0} max={60} step={0.5} unit="%" />
          </Field>
          <Field label="Base de densidad" hint="La elección cambia el tonelaje, no el volumen.">
            <SelectField
              value={waste.capacityDensityBasis}
              onChange={(value) => updateScenarioParams((draft) => { draft.waste.capacityDensityBasis = value as typeof draft.waste.capacityDensityBasis; })}
              options={[
                { value: "initial", label: "Inicial compactada" },
                { value: "stabilized", label: "Final estabilizada" },
              ]}
            />
          </Field>
          <Field label="Densidad inicial">
            <NumberField value={waste.densityInitialKgM3} onChange={(v) => updateScenarioParams((draft) => { draft.waste.densityInitialKgM3 = v; })} min={200} max={2000} step={10} unit="kg/m³" />
          </Field>
          <Field label="Densidad estabilizada">
            <NumberField value={waste.densityStabilizedKgM3} onChange={(v) => updateScenarioParams((draft) => { draft.waste.densityStabilizedKgM3 = v; })} min={200} max={2000} step={10} unit="kg/m³" />
          </Field>
        </FormGrid>
        <FormulaHint>
          V<sub>útil</sub> = V<sub>bruto</sub> · FU − V<sub>barrera</sub> − V<sub>infra</sub>; V<sub>residuos</sub> = V<sub>útil</sub> / (1 + r<sub>cob</sub>); T = V<sub>residuos</sub> · ρ / 1000.
        </FormulaHint>
        <InlineNote tone={waste.coverRatioPct > 30 ? "amber" : "neutral"}>
          Referencia técnica: cobertura de 20–25 % del volumen de residuos (Honduras 2014, p. 33; MINAM 2011, p. 63). Es una referencia, no un límite legal.
        </InlineNote>
      </Panel>

      <div className="split-grid">
        <Panel title="Descomposición del volumen" eyebrow="Balance volumétrico" description="Cada componente se descuenta en el orden indicado. Los valores están en m³.">
          <div className="capacity-breakdown">
            <div className="capacity-line">
              <span>Volumen geométrico bruto</span>
              <strong>{fmt(capacity.geometricGrossVolumeM3)}</strong>
              <i style={{ width: "100%", background: CHART_COLORS.gray }} />
            </div>
            <div className="capacity-line">
              <span>Menos barrera mineral y geosintéticos</span>
              <strong>− {fmt(capacity.linerVolumeM3)}</strong>
              <i style={{ width: `${(capacity.linerVolumeM3 / Math.max(capacity.geometricGrossVolumeM3, 1)) * 100}%`, background: CHART_COLORS.clay }} />
            </div>
            <div className="capacity-line">
              <span>Menos reserva de infraestructura</span>
              <strong>− {fmt(capacity.infrastructureReserveM3)}</strong>
              <i style={{ width: `${(capacity.infrastructureReserveM3 / Math.max(capacity.geometricGrossVolumeM3, 1)) * 100}%`, background: CHART_COLORS.orange }} />
            </div>
            <div className="capacity-line">
              <span>Volumen útil disponible</span>
              <strong>{fmt(capacity.usableVolumeM3)}</strong>
              <i style={{ width: `${(capacity.usableVolumeM3 / Math.max(capacity.geometricGrossVolumeM3, 1)) * 100}%`, background: CHART_COLORS.blue }} />
            </div>
            <div className="capacity-line">
              <span>Residuos</span>
              <strong>{fmt(capacity.wasteVolumeM3)}</strong>
              <i style={{ width: `${(capacity.wasteVolumeM3 / Math.max(capacity.geometricGrossVolumeM3, 1)) * 100}%`, background: CHART_COLORS.leaf }} />
            </div>
            <div className="capacity-line">
              <span>Cobertura reservada</span>
              <strong>{fmt(capacity.coverVolumeM3)}</strong>
              <i style={{ width: `${(capacity.coverVolumeM3 / Math.max(capacity.geometricGrossVolumeM3, 1)) * 100}%`, background: CHART_COLORS.amber }} />
            </div>
          </div>
          <div className="capacity-check">
            <span>Comprobación de cierre</span>
            <Badge tone={Math.abs(capacity.wasteVolumeM3 + capacity.coverVolumeM3 - capacity.usableVolumeM3) < 1e-6 ? "leaf" : "red"}>
              V residuos + V cobertura = V útil
            </Badge>
          </div>
        </Panel>

        <Panel title="Lectura del resultado" eyebrow="Indicadores" description="La capacidad depende de la geometría y de las reservas declaradas.">
          <div className="capacity-facts">
            <div><span>Celdas con capacidad</span><strong>{capacity.cells.filter((c) => c.wasteVolumeM3 > 0).length} / {capacity.cells.length}</strong></div>
            <div><span>Densidad de diseño</span><strong>{fmt(capacity.densityKgM3)} kg/m³</strong></div>
            <div><span>Relación cobertura/residuos</span><strong>{fmtPct((capacity.coverVolumeM3 / Math.max(capacity.wasteVolumeM3, 1)) * 100, 1)}</strong></div>
            <div><span>Uso simulado</span><strong>{fmtPct(model.waste.usedPct, 1)}</strong></div>
            <div><span>Remanente</span><strong>{fmt(model.waste.remainingTonnageT)} t</strong></div>
            <div><span>Vida útil</span><strong>{fmt(model.waste.operatingYears, 1)} años</strong></div>
          </div>
          <ProgressBar value={model.waste.usedPct} max={100} showValue label="Llenado de la capacidad de residuos" tone={model.waste.usedPct >= 100 ? "amber" : "leaf"} />
          <Callout tone="warn" title="No es una cubicación topográfica">
            El volumen se calcula con un prisma de caras planas y bermas escalonadas. Una cubicación real requiere levantamiento topográfico y modelo digital del terreno.
          </Callout>
        </Panel>
      </div>

      <Panel title="Capacidad por celda" eyebrow="Asignación geométrica" description="El llenado mostrado corresponde al último año simulado del balance de residuos." flush>
        <DataTable columns={columns} rows={capacity.cells} rowKey={(row) => row.cellId} />
      </Panel>

      <div className="split-grid">
        <ChartCard
          title="Volumen por celda"
          subtitle="Residuos, cobertura, barrera y reserva de infraestructura."
          height={240}
          legend={[
            { label: "Residuos", color: CHART_COLORS.leaf },
            { label: "Cobertura", color: CHART_COLORS.amber },
            { label: "Barrera", color: CHART_COLORS.clay },
            { label: "Reserva", color: CHART_COLORS.orange },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={54} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Bar dataKey="residuos" name="Residuos" stackId="v" fill={CHART_COLORS.leaf} isAnimationActive={false} />
              <Bar dataKey="cobertura" name="Cobertura" stackId="v" fill={CHART_COLORS.amber} isAnimationActive={false} />
              <Bar dataKey="barrera" name="Barrera" stackId="v" fill={CHART_COLORS.clay} isAnimationActive={false} />
              <Bar dataKey="reserva" name="Reserva" stackId="v" fill={CHART_COLORS.orange} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Curva volumen–elevación" subtitle="Volumen acumulado de todas las celdas por cota." height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={model.geometry.volumeProfileM3} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cap-profile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.leaf} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.leaf} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="elevation" {...axisProps} tickFormatter={(v) => `${fmt(Number(v), 0)} m`} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(Number(v))} width={54} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Area type="monotone" dataKey="volume" name="Volumen" stroke={CHART_COLORS.leaf} fill="url(#cap-profile)" strokeWidth={1.8} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Panel title="Supuestos del cálculo" eyebrow="Trazabilidad" description="El informe reproduce estos supuestos y las referencias asociadas.">
        <ul className="assumption-list">
          {capacity.assumptionNotes.map((note) => <li key={note}>{note}</li>)}
          <li>La densidad es un parámetro del escenario, no un resultado de ensayos de campo.</li>
          <li>El volumen de cobertura se reserva como fracción volumétrica; no se calcula por número de capas diarias.</li>
        </ul>
        <div className="tag-row">
          <Reference>MINAM 2011, pp. 60–63</Reference>
          <Reference>Honduras 2014, pp. 33–35 y 46–49</Reference>
          <Badge tone="amber">Verificar normativa vigente</Badge>
        </div>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Calculator size={14} /> Motor {model.engineVersion} · {fmt(model.params.geometry.cells.length)} celdas · {fmt(capacity.densityKgM3)} kg/m³
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportCapacityCsv(model, project)}>Exportar CSV</Btn>
          <Btn variant="primary" icon={<TrendingDown size={14} />} onClick={() => setModule("residuos")}>Proyectar residuos</Btn>
        </div>
      </div>
    </div>
  );
}
