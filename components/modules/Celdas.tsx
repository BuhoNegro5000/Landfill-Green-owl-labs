"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Box,
  Copy,
  Layers3,
  Plus,
  Ruler,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import type { CellMethod, LayerCategory } from "@/lib/types";
import { cellProfile, cellSurfaceAreaAtHeight } from "@/lib/engine/geometry";
import { CELL_METHOD_OPTIONS, CELL_METHOD_SPECS, methodSummary } from "@/lib/engine/cellMethods";
import { exportCapacityCsv } from "@/lib/exporters";
import { fmt, fmtPct } from "@/lib/format";
import {
  Badge,
  Btn,
  Callout,
  ConfirmDialog,
  DataTable,
  Field,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  Panel,
  ProgressBar,
  SelectField,
  TextArea,
  TextField,
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import { FormGrid, InlineNote, Reference, ToggleLine } from "./shared";

const CATEGORY_OPTIONS: { value: LayerCategory; label: string }[] = [
  { value: "subgrade", label: "Preparación de subrasante" },
  { value: "clay", label: "Barrera mineral" },
  { value: "geomembrane", label: "Geomembrana" },
  { value: "geotextile", label: "Geotextil" },
  { value: "drainage", label: "Drenaje" },
  { value: "protection", label: "Protección" },
  { value: "waste", label: "Residuos" },
  { value: "daily-cover", label: "Cobertura diaria" },
  { value: "intermediate-cover", label: "Cobertura intermedia" },
  { value: "final-cover", label: "Cobertura final" },
  { value: "vegetation", label: "Vegetación" },
];

export default function Celdas() {
  const { model, project, scenario } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const updateCell = useStore((s) => s.updateCell);
  const applyCellMethod = useStore((s) => s.applyCellMethod);
  const applyMethodToAllCells = useStore((s) => s.applyMethodToAllCells);
  const addCell = useStore((s) => s.addCell);
  const duplicateCell = useStore((s) => s.duplicateCell);
  const deleteCell = useStore((s) => s.deleteCell);
  const reorderCell = useStore((s) => s.reorderCell);
  const addLayer = useStore((s) => s.addLayer);
  const updateLayer = useStore((s) => s.updateLayer);
  const deleteLayer = useStore((s) => s.deleteLayer);
  const selectedCellId = useStore((s) => s.selectedCellId);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const setModule = useStore((s) => s.setModule);
  const pushToast = useStore((s) => s.pushToast);

  const cells = useMemo(
    () => [...model.geometry.cells].sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [model.geometry.cells],
  );
  const configs = useMemo(
    () => new Map(model.params.geometry.cells.map((c) => [c.id, c])),
    [model.params.geometry.cells],
  );

  const [layerId, setLayerId] = useState<string | null>(null);
  const [pendingDeleteCell, setPendingDeleteCell] = useState<string | null>(null);
  const [pendingDeleteLayer, setPendingDeleteLayer] = useState<string | null>(null);
  const [pendingBulkMethod, setPendingBulkMethod] = useState<CellMethod | null>(null);

  useEffect(() => {
    if (!selectedCellId && cells.length > 0) setSelectedCell(cells[0].id);
  }, [selectedCellId, cells, setSelectedCell]);

  const activeCell = cells.find((c) => c.id === selectedCellId) ?? cells[0] ?? null;
  const activeConfig = activeCell ? configs.get(activeCell.id) : undefined;
  const activeCapacity = model.capacity.cells.find((c) => c.cellId === activeCell?.id);
  const activeSummary = activeConfig ? methodSummary(activeConfig) : null;

  useEffect(() => {
    if (!layerId && model.params.geometry.layers.length) setLayerId(model.params.geometry.layers[0].id);
    if (layerId && !model.params.geometry.layers.some((l) => l.id === layerId)) {
      setLayerId(model.params.geometry.layers[0]?.id ?? null);
    }
  }, [layerId, model.params.geometry.layers]);

  const layer = model.params.geometry.layers.find((l) => l.id === layerId) ?? null;

  const profile = useMemo(() => {
    if (!activeConfig) return [];
    return cellProfile(activeConfig, 30).map((point) => ({
      height: point.z,
      area: point.areaM2,
      volume: 0,
    }));
  }, [activeConfig]);

  // Fill the profile with the cumulative volume for a second, readable curve.
  const profileWithVolume = useMemo(() => {
    if (!activeConfig) return [];
    return profile.map((point) => {
      let volume = 0;
      const samples = 24;
      for (let i = 0; i < samples; i++) {
        const z0 = (point.height * i) / samples;
        const z1 = (point.height * (i + 1)) / samples;
        const a0 = cellSurfaceAreaAtHeight(activeConfig, z0);
        const am = cellSurfaceAreaAtHeight(activeConfig, (z0 + z1) / 2);
        const a1 = cellSurfaceAreaAtHeight(activeConfig, z1);
        volume += ((z1 - z0) / 6) * (a0 + 4 * am + a1);
      }
      return { ...point, volume };
    });
  }, [activeConfig, profile]);

  const cellColumns: TableColumn<(typeof cells)[number]>[] = [
    {
      key: "name",
      label: "Celda",
      render: (row) => (
        <span className="cell-name">
          <span className="cell-swatch" style={{ background: row.valid ? CHART_COLORS.leaf : CHART_COLORS.danger }} />
          <strong>{row.name}</strong>
        </span>
      ),
    },
    { key: "sequenceOrder", label: "Sec.", align: "center", width: "54px" },
    {
      key: "method",
      label: "Método",
      render: (row) => (
        <span className="cell-method">
          <strong>{CELL_METHOD_SPECS[row.method].shortLabel}</strong>
          {!row.methodMatches ? (
            <Badge tone="amber">{`→ ${CELL_METHOD_SPECS[row.effectiveMethod].shortLabel}`}</Badge>
          ) : null}
        </span>
      ),
    },
    { key: "heightM", label: "Altura", align: "right", render: (row) => `${fmt(row.heightM, 1)} m` },
    {
      key: "cutFill",
      label: "Corte / relleno",
      align: "right",
      render: (row) => `${fmt(row.cutDepthM, 1)} / ${fmt(row.fillHeightM, 1)} m`,
    },
    {
      key: "dimensions",
      label: "Base / corona",
      align: "right",
      render: (row) => `${fmt(row.bottomLengthM, 0)}×${fmt(row.bottomWidthM, 0)} → ${fmt(row.topLengthM, 0)}×${fmt(row.topWidthM, 0)}`,
    },
    { key: "grossVolumeM3", label: "Bruto", align: "right", render: (row) => `${fmt(row.grossVolumeM3)} m³` },
    {
      key: "fill",
      label: "Llenado",
      align: "right",
      render: (row) => {
        const cap = model.capacity.cells.find((c) => c.cellId === row.id);
        return <span>{fmtPct((cap?.fillFraction ?? 0) * 100, 0)}</span>;
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <span className="row-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="icon-button" title="Subir" aria-label={`Subir ${row.name}`} onClick={() => reorderCell(row.id, -1)}>
            <ArrowUp size={12} />
          </button>
          <button type="button" className="icon-button" title="Bajar" aria-label={`Bajar ${row.name}`} onClick={() => reorderCell(row.id, 1)}>
            <ArrowDown size={12} />
          </button>
          <button type="button" className="icon-button" title="Duplicar" aria-label={`Duplicar ${row.name}`} onClick={() => duplicateCell(row.id)}>
            <Copy size={12} />
          </button>
          <button type="button" className="icon-button" title="Eliminar" aria-label={`Eliminar ${row.name}`} onClick={() => setPendingDeleteCell(row.id)}>
            <Trash2 size={12} />
          </button>
        </span>
      ),
    },
  ];

  const layerColumns: TableColumn<(typeof model.params.geometry.layers)[number]>[] = [
    {
      key: "enabled",
      label: "",
      width: "38px",
      render: (row) => (
        <button
          type="button"
          role="switch"
          aria-checked={row.enabled}
          aria-label={`Activar ${row.name}`}
          className={`switch switch-compact ${row.enabled ? "is-on" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            updateLayer(row.id, { enabled: !row.enabled });
          }}
        >
          <span className="switch-knob" />
        </button>
      ),
    },
    { key: "name", label: "Capa", render: (row) => <strong>{row.name}</strong> },
    {
      key: "category",
      label: "Categoría",
      render: (row) => <Badge tone="outline">{CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? row.category}</Badge>,
    },
    { key: "thicknessMm", label: "Espesor", align: "right", render: (row) => `${fmt(row.thicknessMm, 1)} mm` },
    { key: "material", label: "Material", className: "hide-sm" },
    { key: "reference", label: "Referencia", className: "hide-md" },
    {
      key: "remove",
      label: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          className="icon-button"
          title="Eliminar capa"
          aria-label={`Eliminar ${row.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setPendingDeleteLayer(row.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      ),
    },
  ];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 03 · Geometría"
        title="Celdas, bermas y capas"
        description="Defina la geometría de cada celda y el sistema de impermeabilización. El volumen se integra por secciones; los espesores de capa son reales y solo se exageran en la vista 3D."
        actions={
          <>
            <Btn variant="secondary" icon={<Box size={14} />} onClick={() => setModule("modelo")}>Ver en 3D</Btn>
            <Btn variant="primary" icon={<Plus size={14} />} onClick={addCell}>Agregar celda</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Celdas modeladas" value={String(cells.length)} hint={`${cells.filter((c) => c.valid).length} válidas geométricamente`} tone={cells.some((c) => !c.valid) ? "amber" : "leaf"} icon={<Layers3 size={15} />} />
        <Kpi label="Volumen bruto" value={fmt(model.geometry.grossVolumeM3)} unit="m³" hint={`Diseño ${fmt(model.geometry.designGrossVolumeM3)} m³ · excavación ${fmt(model.geometry.excavationVolumeM3)} m³`} />
        <Kpi label="Huella modelada" value={fmt(model.geometry.footprintAreaM2)} unit="m²" hint={`Coronación ${fmt(model.geometry.topAreaM2)} m² · cobertura ${fmt(model.geometry.finalCoverAreaM2)} m²`} tone="blue" />
        <Kpi label="Área de barrera" value={fmt(model.geometry.liningAreaM2)} unit="m²" hint="Fondo + taludes de corte + bermas" tone="amber" icon={<Ruler size={15} />} />
        <Kpi
          label="Balance de tierras"
          value={fmt(model.capacity.earthworksBalanceM3)}
          unit="m³"
          hint={`${model.capacity.earthworksStatus} · cobertura requerida ${fmt(model.capacity.coverSoilDemandM3)} m³`}
          tone={model.capacity.earthworksBalanceM3 < 0 ? "amber" : "leaf"}
        />
      </KpiGrid>

      <Panel
        title="Marco geométrico del escenario"
        eyebrow={scenario.name}
        description="Parámetros comunes a todas las celdas. El factor de utilización y la reserva de infraestructura se descuentan antes de calcular el volumen de residuos."
      >
        <FormGrid columns={3}>
          <Field
            label="Método constructivo del escenario"
            hint="Al cambiar el método se abre una confirmación y se aplica el preset geométrico a todas las celdas: profundidad, cota de fondo, talud, bermas, borde libre y rampa."
          >
            <SelectField
              value={model.params.geometry.method}
              onChange={(value) => setPendingBulkMethod(value as CellMethod)}
              options={CELL_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
          </Field>
          <Field label="Cota base del terreno">
            <NumberField value={model.params.geometry.terrainBaseElevationM} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.terrainBaseElevationM = v; })} min={-100} max={6000} step={1} unit="m s. n. m." />
          </Field>
          <Field label="Huella declarada" hint="Área de implantación; se compara con la huella de las celdas.">
            <NumberField value={model.params.geometry.footprintAreaM2} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.footprintAreaM2 = v; })} min={100} max={2_000_000} step={250} unit="m²" />
          </Field>
          <Field label="Factor de utilización" hint="Fracción del volumen bruto realmente ocupada por residuos y cobertura.">
            <NumberField value={model.params.geometry.utilizationFactor} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.utilizationFactor = v; })} min={0.3} max={1} step={0.01} />
          </Field>
          <Field label="Reserva de infraestructura">
            <NumberField value={model.params.geometry.infrastructureReservePct} onChange={(v) => updateScenarioParams((draft) => { draft.geometry.infrastructureReservePct = v; })} min={0} max={30} step={0.5} unit="%" />
          </Field>
          <Field label="Área declarada del sitio">
            <NumberField value={model.params.site.areaHa} onChange={(v) => updateScenarioParams((draft) => { draft.site.areaHa = v; })} min={0.1} max={2000} step={0.5} unit="ha" />
          </Field>
        </FormGrid>
        {model.geometry.warnings.length ? (
          <Callout tone="warn" title={`${model.geometry.warnings.length} advertencia(s) geométrica(s)`}>
            {model.geometry.warnings.slice(0, 3).join(" · ")}
          </Callout>
        ) : (
          <InlineNote tone="leaf">Sin advertencias geométricas con los valores actuales.</InlineNote>
        )}
      </Panel>

      <Panel
        title="Celdas del escenario"
        eyebrow={`${cells.length} celda(s) · secuencia de llenado`}
        description="El orden de secuencia determina la asignación anual de residuos y la elevación simulada."
        flush
        actions={<Btn size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addCell}>Nueva celda</Btn>}
      >
        <DataTable
          columns={cellColumns}
          rows={cells}
          rowKey={(row) => row.id}
          activeKey={activeCell?.id ?? null}
          onRowClick={(row) => setSelectedCell(row.id)}
        />
      </Panel>

      {activeCell && activeConfig ? (
        <Panel
          title={`Edición · ${activeCell.name}`}
          eyebrow="Geometría de la celda"
          description="Las dimensiones son de fondo. La corona se deriva de la altura, la pendiente y las bermas."
          actions={<Badge tone={activeCell.valid ? "leaf" : "red"}>{activeCell.valid ? "Geometría válida" : "Revisar geometría"}</Badge>}
        >
          <FormGrid columns={3}>
            <Field label="Nombre" required>
              <TextField
                value={activeConfig.name}
                maxLength={24}
                onChange={(event) => updateCell(activeCell.id, { name: event.target.value })}
              />
            </Field>
            <Field
              label="Método constructivo"
              hint="Cambiar el método aplica un preset real: profundidad, cota de fondo, talud, bermas, borde libre y rampa."
            >
              <SelectField
                value={activeConfig.method}
                onChange={(value) => applyCellMethod(activeCell.id, value as CellMethod)}
                options={CELL_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
            </Field>
            <Field label="Largo de fondo">
              <NumberField value={activeConfig.bottomLengthM} onChange={(v) => updateCell(activeCell.id, { bottomLengthM: v })} min={5} max={2000} step={1} unit="m" />
            </Field>
            <Field label="Ancho de fondo">
              <NumberField value={activeConfig.bottomWidthM} onChange={(v) => updateCell(activeCell.id, { bottomWidthM: v })} min={5} max={2000} step={1} unit="m" />
            </Field>
            <Field label="Altura de celda">
              <NumberField value={activeConfig.heightM} onChange={(v) => updateCell(activeCell.id, { heightM: v })} min={0.5} max={200} step={0.5} unit="m" />
            </Field>
            <Field label="Talud (H:V)" hint="2,5 = 1V:2,5H; 0,5 = 1V:0,5H; 3 = 1V:3H.">
              <NumberField value={activeConfig.slopeHtoV} onChange={(v) => updateCell(activeCell.id, { slopeHtoV: v })} min={0.25} max={6} step={0.1} unit="H:V" />
            </Field>
            <Field label="Profundidad de corte" hint="Parte de la celda bajo el terreno natural. 0 = celda de área.">
              <NumberField value={activeConfig.excavationDepthM} onChange={(v) => updateCell(activeCell.id, { excavationDepthM: v })} min={0} max={200} step={0.5} unit="m" />
            </Field>
            <Field label="Borde libre" hint="Separación entre la cota de residuos y el borde de la celda.">
              <NumberField value={activeConfig.freeboardM ?? 0} onChange={(v) => updateCell(activeCell.id, { freeboardM: v })} min={0} max={5} step={0.05} unit="m" />
            </Field>
            <Field label="Cota de fondo">
              <NumberField value={activeConfig.baseElevationM} onChange={(v) => updateCell(activeCell.id, { baseElevationM: v })} min={-500} max={6000} step={0.5} unit="m s. n. m." />
            </Field>
            <Field label="Número de bermas">
              <NumberField value={activeConfig.bermCount} onChange={(v) => updateCell(activeCell.id, { bermCount: Math.round(v) })} min={0} max={20} step={1} />
            </Field>
            <Field label="Ancho de berma">
              <NumberField value={activeConfig.bermWidthM} onChange={(v) => updateCell(activeCell.id, { bermWidthM: v })} min={0} max={30} step={0.5} unit="m" />
            </Field>
            <Field label="Secuencia">
              <NumberField value={activeConfig.sequenceOrder} onChange={(v) => updateCell(activeCell.id, { sequenceOrder: Math.round(v) })} min={1} max={99} step={1} />
            </Field>
            {activeSummary?.effective === "ramp" || activeConfig.method === "ramp" ? (
              <>
                <Field label="Ancho de rampa" hint="Vía interna: 6 m permanente; 5 m temporal.">
                  <NumberField value={activeConfig.rampWidthM ?? 0} onChange={(v) => updateCell(activeCell.id, { rampWidthM: v })} min={0} max={30} step={0.5} unit="m" />
                </Field>
                <Field label="Pendiente de rampa" hint="Máximo permanente 8 % (≤3000 m s. n. m.); temporal excepcional >10 % en tramos cortos.">
                  <NumberField value={activeConfig.rampGradePct ?? 0} onChange={(v) => updateCell(activeCell.id, { rampGradePct: v })} min={0} max={20} step={0.5} unit="%" />
                </Field>
                <Field label="Longitud de rampa" hint="0 = se deriva del desnivel y la pendiente.">
                  <NumberField value={activeConfig.rampLengthM ?? 0} onChange={(v) => updateCell(activeCell.id, { rampLengthM: v })} min={0} max={2000} step={1} unit="m" />
                </Field>
              </>
            ) : null}
          </FormGrid>

          {activeSummary ? (
            <Callout
              tone={activeSummary.matches ? "success" : "warn"}
              title={
                activeSummary.matches
                  ? `Método coherente: ${activeSummary.effectiveLabel}`
                  : `Método declarado ${activeSummary.declaredLabel} · geometría efectiva ${activeSummary.effectiveLabel}`
              }
            >
              {CELL_METHOD_SPECS[activeSummary.effective].description}
            </Callout>
          ) : null}
          <Field label="Notas de la celda">
            <TextArea value={activeConfig.notes} rows={2} onChange={(event) => updateCell(activeCell.id, { notes: event.target.value })} placeholder="Condiciones locales, restricciones de operación, drenaje…" />
          </Field>

          <div className="cell-summary-grid">
            <div><span>Método declarado / efectivo</span><strong>{activeSummary?.declaredLabel} / {activeSummary?.effectiveLabel}</strong></div>
            <div><span>Corte / relleno</span><strong>{fmt(activeCell.cutDepthM, 1)} / {fmt(activeCell.fillHeightM, 1)} m</strong></div>
            <div><span>Borde libre / altura útil</span><strong>{fmt(activeCell.freeboardM, 2)} / {fmt(activeCell.designHeightM, 1)} m</strong></div>
            <div><span>Cota de terreno / corona</span><strong>{fmt(activeCell.groundElevationM, 1)} / {fmt(activeCell.topElevationM, 1)} m</strong></div>
            <div><span>Corona</span><strong>{fmt(activeCell.topLengthM, 1)} × {fmt(activeCell.topWidthM, 1)} m</strong></div>
            <div><span>Área de fondo / terreno</span><strong>{fmt(activeCell.bottomAreaM2)} / {fmt(activeCell.groundAreaM2)} m²</strong></div>
            <div><span>Área de barrera</span><strong>{fmt(activeCell.liningAreaM2)} m²</strong></div>
            <div><span>Área de cobertura final</span><strong>{fmt(activeCell.finalCoverAreaM2)} m²</strong></div>
            <div><span>Volumen bruto / diseño</span><strong>{fmt(activeCell.grossVolumeM3)} / {fmt(activeCell.designWasteVolumeM3)} m³</strong></div>
            <div><span>Corte / relleno (volumen)</span><strong>{fmt(activeCell.cutVolumeM3)} / {fmt(activeCell.aboveGradeVolumeM3)} m³</strong></div>
            {activeSummary?.effective === "ramp" || activeConfig.method === "ramp" ? (
              <div><span>Rampa (ancho / pendiente / longitud)</span><strong>{fmt(activeCell.rampWidthM, 1)} m / {fmt(activeCell.rampGradePct, 1)} % / {fmt(activeCell.rampLengthM, 1)} m</strong></div>
            ) : null}
            <div><span>Capacidad de residuos</span><strong>{fmt(activeCapacity?.wasteVolumeM3 ?? 0)} m³</strong></div>
            <div><span>Tonelaje</span><strong>{fmt(activeCapacity?.tonnageT ?? 0)} t</strong></div>
          </div>

          <ProgressBar
            value={(activeCapacity?.fillFraction ?? 0) * 100}
            max={100}
            showValue
            label={`Avance de llenado simulado · cota ${fmt(activeCapacity?.topElevationM ?? activeCell.baseElevationM, 1)} m`}
            tone={(activeCapacity?.fillFraction ?? 0) >= 1 ? "leaf" : "amber"}
          />

          {activeCell.warnings.length || activeCell.methodChecks.length ? (
            <Callout
              tone={activeCell.methodChecks.some((check) => check.severity === "warning") ? "warn" : "info"}
              title={`Advertencias de ${activeCell.name}`}
            >
              <ul className="compact-list">
                {activeCell.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                {activeCell.methodChecks.map((check) => (
                  <li key={check.id}>
                    <strong>{check.title}:</strong> {check.detail}
                    {check.reference ? <em> ({check.reference})</em> : null}
                  </li>
                ))}
              </ul>
            </Callout>
          ) : null}

          <ChartCard
            title="Perfil área–altura y volumen acumulado"
            subtitle="El pivote es la cota de terreno: bajo ella el corte se ensancha; sobre ella el relleno se estrecha. Las líneas marcan terreno y cota de diseño."
            height={220}
            legend={[
              { label: "Área horizontal (m²)", color: CHART_COLORS.blue },
              { label: "Volumen acumulado (m³)", color: CHART_COLORS.leaf },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profileWithVolume} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="cell-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.36} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="height" type="number" domain={[0, Math.max(activeCell.heightM, 0.1)]} {...axisProps} tickFormatter={(v) => `${fmt(Number(v), 0)} m`} />
                <YAxis yAxisId="left" {...axisProps} tickFormatter={(v) => fmt(Number(v))} width={54} />
                <YAxis yAxisId="right" orientation="right" {...axisProps} tickFormatter={(v) => fmt(Number(v))} width={54} />
                <Tooltip content={<ChartTooltip />} />
                {activeCell.cutDepthM > 0.05 && activeCell.cutDepthM < activeCell.heightM ? (
                  <ReferenceLine x={activeCell.cutDepthM} yAxisId="left" stroke={CHART_COLORS.amber} strokeDasharray="4 3" label={{ value: "terreno", position: "insideTopRight", fill: CHART_COLORS.amber, fontSize: 10 }} />
                ) : null}
                {activeCell.designHeightM < activeCell.heightM ? (
                  <ReferenceLine x={activeCell.designHeightM} yAxisId="left" stroke={CHART_COLORS.leaf} strokeDasharray="2 2" label={{ value: "diseño", position: "insideBottomRight", fill: CHART_COLORS.leaf, fontSize: 10 }} />
                ) : null}
                <Area yAxisId="left" type="monotone" dataKey="area" name="Área" stroke={CHART_COLORS.blue} fill="url(#cell-area)" strokeWidth={1.8} isAnimationActive={false} />
                <Area yAxisId="right" type="monotone" dataKey="volume" name="Volumen" stroke={CHART_COLORS.leaf} fill="none" strokeWidth={1.8} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <InlineNote tone="amber">
            <TriangleAlert size={13} /> El perfil es un prisma de caras planas con escalones de berma. No representa curvas de nivel topográficas ni intersecciones reales entre celdas. El balance de tierras es volumétrico y no sustituye el diseño de préstamos ni la cubicación topográfica.
          </InlineNote>
        </Panel>
      ) : null}

      <Panel
        title="Sistema de capas e impermeabilización"
        eyebrow={`${model.params.geometry.layers.length} capa(s)`}
        description="Active o desactive capas para ver su efecto en el volumen de barrera. El espesor se usa en el cálculo y en la sección 3D."
        flush
        actions={<Btn size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addLayer}>Agregar capa</Btn>}
      >
        <DataTable
          columns={layerColumns}
          rows={model.params.geometry.layers}
          rowKey={(row) => row.id}
          activeKey={layerId}
          onRowClick={(row) => setLayerId(row.id)}
        />
      </Panel>

      {layer ? (
        <Panel title={`Edición · ${layer.name}`} eyebrow="Capa del sistema" description="Los valores de permeabilidad son referencias de guía; verifique el diseño específico y los ensayos.">
          <FormGrid columns={3}>
            <Field label="Nombre">
              <TextField value={layer.name} onChange={(event) => updateLayer(layer.id, { name: event.target.value })} />
            </Field>
            <Field label="Categoría">
              <SelectField value={layer.category} onChange={(value) => updateLayer(layer.id, { category: value as LayerCategory })} options={CATEGORY_OPTIONS} />
            </Field>
            <Field label="Espesor" hint="Se usa en el volumen de barrera y en la sección 3D.">
              <NumberField value={layer.thicknessMm} onChange={(v) => updateLayer(layer.id, { thicknessMm: v })} min={0} max={5000} step={0.5} unit="mm" />
            </Field>
            <Field label="Material" className="span-2">
              <TextField value={layer.material} onChange={(event) => updateLayer(layer.id, { material: event.target.value })} />
            </Field>
            <Field label="Función">
              <TextField value={layer.function} onChange={(event) => updateLayer(layer.id, { function: event.target.value })} />
            </Field>
            <Field label="Referencia" className="span-2">
              <TextField value={layer.reference} onChange={(event) => updateLayer(layer.id, { reference: event.target.value })} />
            </Field>
            <div className="field">
              <span className="field-label">Estado</span>
              <ToggleLine label="Capa activa" checked={layer.enabled} onChange={(value) => updateLayer(layer.id, { enabled: value })} />
            </div>
          </FormGrid>
          <Field label="Notas">
            <TextArea value={layer.notes} rows={2} onChange={(event) => updateLayer(layer.id, { notes: event.target.value })} />
          </Field>
          <div className="layer-foot">
            <Reference>{layer.reference || "Sin referencia declarada"}</Reference>
            <span className="layer-volume">
              Volumen calculado: <strong>{fmt(model.geometry.layerVolumes.find((v) => v.layerId === layer.id)?.volumeM3 ?? 0)} m³</strong>
            </span>
          </div>
        </Panel>
      ) : null}

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Layers3 size={14} /> {cells.length} celdas · {fmt(model.geometry.grossVolumeM3)} m³ brutos · {fmtPct(model.waste.usedPct, 0)} de capacidad usada
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" onClick={() => exportCapacityCsv(model, project)}>Exportar capacidad CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("capacidad")}>Continuar a capacidad</Btn>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteCell)}
        onClose={() => setPendingDeleteCell(null)}
        title="Eliminar celda"
        description="Se eliminará la celda del escenario activo. La capacidad y la secuencia de llenado se recalcularán."
        confirmLabel="Eliminar celda"
        onConfirm={() => {
          if (pendingDeleteCell) {
            deleteCell(pendingDeleteCell);
            pushToast({ kind: "info", title: "Celda eliminada", detail: "El modelo se recalculó con las celdas restantes." });
          }
          setPendingDeleteCell(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteLayer)}
        onClose={() => setPendingDeleteLayer(null)}
        title="Eliminar capa"
        description="La capa dejará de descontarse del volumen y de mostrarse en la sección 3D."
        confirmLabel="Eliminar capa"
        onConfirm={() => {
          if (pendingDeleteLayer) deleteLayer(pendingDeleteLayer);
          setPendingDeleteLayer(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingBulkMethod)}
        onClose={() => setPendingBulkMethod(null)}
        title="Aplicar método a todas las celdas"
        description={
          pendingBulkMethod
            ? `Se aplicará el preset de ${CELL_METHOD_SPECS[pendingBulkMethod].label} a todas las celdas: profundidad de corte, cota de fondo, altura, talud, bermas, borde libre y parámetros de rampa. Las dimensiones de fondo se conservan. La capacidad, el 3D y los informes se recalcularán.`
            : ""
        }
        confirmLabel="Aplicar método"
        onConfirm={() => {
          if (pendingBulkMethod) {
            applyMethodToAllCells(pendingBulkMethod);
            pushToast({
              kind: "info",
              title: `Método ${CELL_METHOD_SPECS[pendingBulkMethod].label} aplicado`,
              detail: "La geometría, la capacidad y el balance de tierras se recalcularon para todas las celdas.",
            });
          }
          setPendingBulkMethod(null);
        }}
      />
    </div>
  );
}
