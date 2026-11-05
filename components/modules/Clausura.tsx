"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  Download,
  Droplets,
  Eye,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/uid";
import { fmt, fmtCompact, fmtDate, fmtPct } from "@/lib/format";
import { toCsv, downloadText, safeFileName } from "@/lib/exporters";
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
  StatusPill,
  TextArea,
  TextField,
  Toggle,
  type TableColumn,
} from "@/components/ui";
import { ChartCard, ChartTooltip, CHART_COLORS, axisProps } from "@/components/ui/charts";
import type { ClosureTaskView } from "@/lib/engine/closure";
import type { ClosureLayer, MonitoringPoint } from "@/lib/types";
import { closureCoverage } from "@/lib/engine/closure";
import { FormGrid, InlineNote, OptionalNumberField, Reference } from "./shared";

type PendingDelete = { kind: "task" | "point" | "layer"; id: string } | null;

const POINT_TYPES: { value: MonitoringPoint["type"]; label: string }[] = [
  { value: "lixiviados", label: "Lixiviados" },
  { value: "aguas-subterraneas", label: "Aguas subterráneas" },
  { value: "aguas-superficiales", label: "Aguas superficiales" },
  { value: "biogas", label: "Biogás" },
  { value: "asentamiento", label: "Asentamiento" },
  { value: "drenaje", label: "Drenaje" },
];

const STATUS_OPTIONS: { value: MonitoringPoint["status"]; label: string }[] = [
  { value: "ok", label: "Operativo" },
  { value: "alerta", label: "Alerta" },
  { value: "sin-datos", label: "Sin datos" },
];

export default function Clausura() {
  const { model, project } = useModel();
  const updateScenarioParams = useStore((s) => s.updateScenarioParams);
  const setModule = useStore((s) => s.setModule);
  const pushToast = useStore((s) => s.pushToast);
  const closure = model.closure;
  const params = model.params.closure;
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const coverage = closureCoverage(params);

  const materialGap = model.params.site.coverMaterialAvailableM3 - closure.totalCoverMaterialM3;

  const layerVolume = (layer: ClosureLayer) => closure.coverAreaM2 * (layer.thicknessMm / 1000);

  const taskColumns: TableColumn<ClosureTaskView>[] = [
    {
      key: "done",
      label: "Hecho",
      width: "58px",
      render: (row) => (
        <Toggle
          compact
          checked={row.done}
          ariaLabel={`Marcar ${row.name}`}
          onChange={(checked) => updateScenarioParams((draft) => {
            const task = draft.closure.tasks.find((item) => item.id === row.id);
            if (task) task.done = checked;
          })}
        />
      ),
    },
    {
      key: "name",
      label: "Tarea",
      render: (row) => (
        <TextField
          aria-label={`Nombre de la tarea ${row.name}`}
          value={row.name}
          onChange={(event) => updateScenarioParams((draft) => {
            const task = draft.closure.tasks.find((item) => item.id === row.id);
            if (task) task.name = event.target.value;
          })}
        />
      ),
    },
    {
      key: "startMonth",
      label: "Inicio (mes)",
      width: "112px",
      render: (row) => (
        <NumberField
          compact
          ariaLabel={`Mes de inicio de ${row.name}`}
          value={row.startMonth}
          min={-60}
          max={360}
          step={1}
          onChange={(value) => updateScenarioParams((draft) => {
            const task = draft.closure.tasks.find((item) => item.id === row.id);
            if (task) task.startMonth = Math.round(value);
          })}
        />
      ),
    },
    {
      key: "durationMonths",
      label: "Duración",
      width: "100px",
      render: (row) => (
        <NumberField
          compact
          ariaLabel={`Duración de ${row.name}`}
          value={row.durationMonths}
          min={1}
          max={240}
          step={1}
          unit="m"
          onChange={(value) => updateScenarioParams((draft) => {
            const task = draft.closure.tasks.find((item) => item.id === row.id);
            if (task) task.durationMonths = Math.max(1, Math.round(value));
          })}
        />
      ),
    },
    {
      key: "responsible",
      label: "Responsable",
      render: (row) => (
        <TextField
          aria-label={`Responsable de ${row.name}`}
          value={row.responsible}
          onChange={(event) => updateScenarioParams((draft) => {
            const task = draft.closure.tasks.find((item) => item.id === row.id);
            if (task) task.responsible = event.target.value;
          })}
        />
      ),
    },
    { key: "phase", label: "Fase", render: (row) => <Badge tone={row.phase === "posclausura" ? "neutral" : "blue"}>{row.phase}</Badge> },
    { key: "dates", label: "Programado", render: (row) => `${fmtDate(row.startDate)} → ${fmtDate(row.endDate)}` },
    {
      key: "actions",
      label: "",
      width: "46px",
      render: (row) => (
        <button type="button" className="icon-button" aria-label={`Eliminar ${row.name}`} onClick={(event) => { event.stopPropagation(); setPendingDelete({ kind: "task", id: row.id }); }}>
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  const pointColumns: TableColumn<MonitoringPoint>[] = [
    {
      key: "name",
      label: "Punto",
      render: (row) => (
        <TextField
          aria-label={`Nombre del punto ${row.name}`}
          value={row.name}
          onChange={(event) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.name = event.target.value;
          })}
        />
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (row) => (
        <SelectField
          ariaLabel={`Tipo de ${row.name}`}
          value={row.type}
          onChange={(value) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.type = value as MonitoringPoint["type"];
          })}
          options={POINT_TYPES}
        />
      ),
    },
    {
      key: "frequency",
      label: "Frecuencia",
      render: (row) => (
        <TextField
          aria-label={`Frecuencia de ${row.name}`}
          value={row.frequency}
          onChange={(event) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.frequency = event.target.value;
          })}
        />
      ),
    },
    {
      key: "parameters",
      label: "Parámetros",
      render: (row) => (
        <TextField
          aria-label={`Parámetros de ${row.name}`}
          value={row.parameters}
          onChange={(event) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.parameters = event.target.value;
          })}
        />
      ),
    },
    {
      key: "lastValue",
      label: "Último valor",
      render: (row) => (
        <TextField
          aria-label={`Último valor de ${row.name}`}
          value={row.lastValue}
          onChange={(event) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.lastValue = event.target.value;
          })}
        />
      ),
    },
    {
      key: "referenceLimit",
      label: "Referencia",
      render: (row) => (
        <TextField
          aria-label={`Referencia de ${row.name}`}
          value={row.referenceLimit}
          onChange={(event) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.referenceLimit = event.target.value;
          })}
        />
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (row) => (
        <SelectField
          ariaLabel={`Estado de ${row.name}`}
          value={row.status}
          onChange={(value) => updateScenarioParams((draft) => {
            const point = draft.closure.monitoringPoints.find((item) => item.id === row.id);
            if (point) point.status = value as MonitoringPoint["status"];
          })}
          options={STATUS_OPTIONS}
        />
      ),
    },
    { key: "pill", label: "Lectura", width: "104px", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "actions",
      label: "",
      width: "46px",
      render: (row) => (
        <button type="button" className="icon-button" aria-label={`Eliminar ${row.name}`} onClick={() => setPendingDelete({ kind: "point", id: row.id })}>
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  const layerColumns: TableColumn<ClosureLayer>[] = [
    {
      key: "enabled",
      label: "Activa",
      width: "62px",
      render: (row) => (
        <Toggle
          compact
          checked={row.enabled}
          ariaLabel={`Activar ${row.name}`}
          onChange={(checked) => updateScenarioParams((draft) => {
            const layer = draft.closure.finalCoverLayers.find((item) => item.id === row.id);
            if (layer) layer.enabled = checked;
          })}
        />
      ),
    },
    {
      key: "name",
      label: "Capa",
      render: (row) => (
        <TextField
          aria-label={`Nombre de la capa ${row.name}`}
          value={row.name}
          onChange={(event) => updateScenarioParams((draft) => {
            const layer = draft.closure.finalCoverLayers.find((item) => item.id === row.id);
            if (layer) layer.name = event.target.value;
          })}
        />
      ),
    },
    {
      key: "thicknessMm",
      label: "Espesor",
      width: "118px",
      render: (row) => (
        <NumberField
          compact
          ariaLabel={`Espesor de ${row.name}`}
          value={row.thicknessMm}
          min={0}
          max={2000}
          step={10}
          unit="mm"
          onChange={(value) => updateScenarioParams((draft) => {
            const layer = draft.closure.finalCoverLayers.find((item) => item.id === row.id);
            if (layer) layer.thicknessMm = value;
          })}
        />
      ),
    },
    {
      key: "material",
      label: "Material",
      render: (row) => (
        <TextField
          aria-label={`Material de ${row.name}`}
          value={row.material}
          onChange={(event) => updateScenarioParams((draft) => {
            const layer = draft.closure.finalCoverLayers.find((item) => item.id === row.id);
            if (layer) layer.material = event.target.value;
          })}
        />
      ),
    },
    {
      key: "function",
      label: "Función",
      render: (row) => (
        <TextField
          aria-label={`Función de ${row.name}`}
          value={row.function}
          onChange={(event) => updateScenarioParams((draft) => {
            const layer = draft.closure.finalCoverLayers.find((item) => item.id === row.id);
            if (layer) layer.function = event.target.value;
          })}
        />
      ),
    },
    { key: "volume", label: "Volumen estimado", align: "right", render: (row) => `${fmt(layerVolume(row))} m³` },
    {
      key: "actions",
      label: "",
      width: "46px",
      render: (row) => (
        <button type="button" className="icon-button" aria-label={`Eliminar ${row.name}`} onClick={() => setPendingDelete({ kind: "layer", id: row.id })}>
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  const chartData = params.finalCoverLayers.map((layer) => ({
    name: layer.name,
    espesor: layer.thicknessMm,
  }));

  const addTask = () =>
    updateScenarioParams((draft) => {
      draft.closure.tasks.push({
        id: uid("task"),
        name: "Nueva tarea de cierre",
        startMonth: 0,
        durationMonths: 3,
        responsible: "Por asignar",
        category: "cierre",
        done: false,
      });
    });

  const addPoint = () =>
    updateScenarioParams((draft) => {
      draft.closure.monitoringPoints.push({
        id: uid("mon"),
        name: "Nuevo punto de monitoreo",
        type: "lixiviados",
        frequency: "Mensual",
        parameters: "Definir parámetros",
        responsible: "Por asignar",
        lastValue: "Sin lectura",
        referenceLimit: "Definir referencia",
        status: "sin-datos",
      });
    });

  const addLayer = () =>
    updateScenarioParams((draft) => {
      draft.closure.finalCoverLayers.push({
        id: uid("fc"),
        name: "Nueva capa de cobertura",
        thicknessMm: 200,
        material: "Definir material",
        function: "Definir función",
        enabled: true,
      });
    });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    updateScenarioParams((draft) => {
      if (pendingDelete.kind === "task") draft.closure.tasks = draft.closure.tasks.filter((t) => t.id !== pendingDelete.id);
      if (pendingDelete.kind === "point") draft.closure.monitoringPoints = draft.closure.monitoringPoints.filter((p) => p.id !== pendingDelete.id);
      if (pendingDelete.kind === "layer") draft.closure.finalCoverLayers = draft.closure.finalCoverLayers.filter((l) => l.id !== pendingDelete.id);
    });
    pushToast({ kind: "ok", title: "Elemento eliminado", detail: "El cambio se guardó en el escenario activo." });
    setPendingDelete(null);
  };

  const exportClosureCsv = () => {
    const rows = closure.tasks.map((task) => ({
      tarea: task.name,
      fase: task.phase,
      inicio: task.startDate,
      fin: task.endDate,
      responsable: task.responsible,
      estado: task.done ? "Completada" : "Pendiente",
    }));
    downloadText(
      toCsv(
        [
          { key: "tarea", label: "Tarea" },
          { key: "fase", label: "Fase" },
          { key: "inicio", label: "Inicio" },
          { key: "fin", label: "Fin" },
          { key: "responsable", label: "Responsable" },
          { key: "estado", label: "Estado" },
        ],
        rows,
      ),
      `${safeFileName(project.name)}-clausura.csv`,
      "text/csv;charset=utf-8",
    );
  };

  const schedulePreview = useMemo(() => closure.monthlySchedule.slice(0, 16), [closure.monthlySchedule]);

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 10 · Clausura"
        title="Cierre, cobertura final y posclausura"
        description="El cierre se estima a partir del agotamiento de la capacidad o de un año declarado. La cobertura final, el cronograma y el monitoreo son parámetros del escenario sujetos a revisión técnica."
        actions={
          <>
            <Btn variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => setModule("geotecnia")}>Volver a geotecnia</Btn>
            <Btn variant="primary" icon={<ArrowRight size={14} />} onClick={() => setModule("escenarios")}>Continuar a escenarios</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Año de cierre" value={closure.closureYear ? fmt(closure.closureYear, 1) : "—"} hint={params.earlyClosureYear !== null ? "Año declarado por el usuario" : "Derivado del agotamiento de capacidad"} tone="blue" icon={<CalendarCheck size={15} />} />
        <Kpi label="Cobertura final" value={fmt(closure.finalCoverThicknessMm)} unit="mm" hint={`${fmt(closure.coverAreaM2)} m² de coronación`} tone="leaf" icon={<Sprout size={15} />} />
        <Kpi label="Material total requerido" value={fmtCompact(closure.totalCoverMaterialM3)} unit="m³" hint={`Cobertura final + reserva por asentamiento`} tone="amber" />
        <Kpi label="Avance de tareas" value={fmtPct(coverage, 0)} hint={`${params.tasks.filter((t) => t.done).length} de ${params.tasks.length} completadas`} tone={coverage >= 100 ? "leaf" : "default"} icon={<ClipboardCheck size={15} />} />
      </KpiGrid>

      <div className="split-grid">
        <Panel title="Parámetros de cierre" eyebrow="Escenario activo" description="El año anticipado reemplaza el cierre derivado del agotamiento. La reserva por asentamiento incrementa el material de cobertura.">
          <FormGrid columns={2}>
            <OptionalNumberField
              label="Año de cierre anticipado"
              value={params.earlyClosureYear}
              onChange={(value) => updateScenarioParams((draft) => { draft.closure.earlyClosureYear = value === null ? null : Math.round(value); })}
              min={2000}
              max={2200}
              step={1}
              hint="Dejar vacío para usar el año de agotamiento calculado."
            />
            <Field label="Años de posclausura">
              <NumberField value={params.postClosureYears} onChange={(value) => updateScenarioParams((draft) => { draft.closure.postClosureYears = Math.max(0, Math.round(value)); })} min={0} max={100} step={1} unit="años" />
            </Field>
            <Field label="Reserva por asentamiento">
              <NumberField value={params.settlementAllowancePct} onChange={(value) => updateScenarioParams((draft) => { draft.closure.settlementAllowancePct = value; })} min={0} max={30} step={0.5} unit="%" />
            </Field>
            <Field label="Revegetación declarada" className="span-2">
              <TextArea
                rows={3}
                value={params.revegetation}
                onChange={(event) => updateScenarioParams((draft) => { draft.closure.revegetation = event.target.value; })}
              />
            </Field>
          </FormGrid>
          <div className="capacity-facts">
            <div><span>Fin de posclausura</span><strong>{closure.postClosureEndYear ?? "—"}</strong></div>
            <div><span>Volumen de cobertura final</span><strong>{fmt(closure.finalCoverVolumeM3)} m³</strong></div>
            <div><span>Reserva por asentamiento</span><strong>{fmt(closure.settlementAllowanceM3)} m³</strong></div>
            <div><span>Disponibilidad declarada</span><strong>{fmt(model.params.site.coverMaterialAvailableM3)} m³</strong></div>
          </div>
          <InlineNote tone={materialGap < 0 ? "amber" : "leaf"}>
            {materialGap < 0
              ? `Déficit de ${fmt(Math.abs(materialGap))} m³ de material de cobertura frente a la disponibilidad declarada.`
              : `Superávit declarado de ${fmt(materialGap)} m³ de material de cobertura.`}
          </InlineNote>
        </Panel>

        <Panel title="Cobertura final" eyebrow="Capas" description="Los espesores son reales y alimentan el volumen de cobertura. La habilitación de una capa cambia el espesor total y el requerimiento de material.">
          <div className="capacity-facts">
            <div><span>Área de aplicación</span><strong>{fmt(closure.coverAreaM2)} m²</strong></div>
            <div><span>Espesor habilitado</span><strong>{fmt(closure.finalCoverThicknessMm)} mm</strong></div>
            <div><span>Volumen final</span><strong>{fmt(closure.finalCoverVolumeM3)} m³</strong></div>
            <div><span>Puntos en alerta</span><strong>{closure.alerts}</strong></div>
          </div>
          <ProgressBar value={params.finalCoverLayers.filter((l) => l.enabled).length} max={Math.max(params.finalCoverLayers.length, 1)} showValue label="Capas habilitadas" tone="leaf" />
          <Callout tone="info" title="Espesor mínimo de referencia">
            MINAM 2011 cita una cobertura final no menor de 0,50 m; el espesor aplicable debe confirmarse con el diseño y la normativa vigente. Esta aplicación no impone un mínimo legal.
          </Callout>
          <div className="tag-row">
            <Reference>MINAM 2011, p. 64</Reference>
            <Reference>Honduras 2014, pp. 50–52</Reference>
          </div>
        </Panel>
      </div>

      <Panel
        title="Capas de cobertura final"
        eyebrow={`${params.finalCoverLayers.length} capa(s)`}
        description="Edite el espesor, el material y la función. El volumen estimado usa el área de coronación del modelo."
        actions={<Btn size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addLayer}>Agregar capa</Btn>}
        flush
      >
        <DataTable columns={layerColumns} rows={params.finalCoverLayers} rowKey={(row) => row.id} dense />
      </Panel>

      <Panel
        title="Cronograma de tareas"
        eyebrow={`${params.tasks.length} tarea(s)`}
        description="Los meses son relativos al año de cierre; los negativos corresponden a actividades previas. El estado se guarda en el escenario."
        actions={<Btn size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addTask}>Agregar tarea</Btn>}
        flush
      >
        <DataTable columns={taskColumns} rows={closure.tasks} rowKey={(row) => row.id} dense maxHeight={460} />
      </Panel>

      <Panel
        title="Monitoreo de posclausura"
        eyebrow={`${params.monitoringPoints.length} punto(s)`}
        description="Registre puntos, frecuencia, parámetros y estado. Una alerta o un punto sin datos se reporta en la validación del modelo."
        actions={<Btn size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addPoint}>Agregar punto</Btn>}
        flush
      >
        <DataTable columns={pointColumns} rows={params.monitoringPoints} rowKey={(row) => row.id} dense maxHeight={420} />
      </Panel>

      <div className="split-grid">
        <ChartCard
          title="Espesor de la cobertura final"
          subtitle="Milímetros por capa declarada. Solo las capas habilitadas suman al espesor total."
          height={240}
          legend={[{ label: "Espesor (mm)", color: CHART_COLORS.leaf }]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v} mm`} />
              <YAxis type="category" dataKey="name" {...axisProps} width={132} />
              <Tooltip content={<ChartTooltip unit="mm" />} />
              <Bar dataKey="espesor" name="Espesor" fill={CHART_COLORS.leaf} isAnimationActive={false} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel title="Programa trimestral" eyebrow="Primeros 4 años" description="Vista de control del cronograma; las tareas se repiten mientras estén dentro de su ventana de ejecución.">
          <div className="schedule-list">
            {schedulePreview.map((slot) => (
              <div key={slot.month} className="schedule-row">
                <span>{slot.label}</span>
                <strong>{slot.tasks.length ? slot.tasks.join(" · ") : "Sin tareas programadas"}</strong>
              </div>
            ))}
          </div>
          <InlineNote tone={closure.alerts > 0 ? "amber" : "leaf"}>
            {closure.alerts > 0
              ? `${closure.alerts} punto(s) de monitoreo requieren atención antes de declarar el cierre operativo.`
              : "Todos los puntos de monitoreo están operativos según el registro declarado."}
          </InlineNote>
        </Panel>
      </div>

      <Panel title="Alcance de la clausura" eyebrow="Trazabilidad" description="El módulo organiza el cierre declarado; no certifica el cierre definitivo ni el cumplimiento legal.">
        <Callout tone="warn" title="Cierre declarado, no certificado">
          La cobertura final, el cronograma y el monitoreo son datos del escenario. No sustituyen el plan de cierre aprobado, la estabilidad de la cobertura, el control de erosión ni la verificación de la autoridad competente.
        </Callout>
        <div className="callout-inline">
          <Droplets size={14} />
          <span>El monitoreo de lixiviados y aguas subterráneas debe coordinarse con el balance hídrico y el plan de tratamiento del módulo de lixiviados.</span>
        </div>
      </Panel>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar elemento"
        description="La acción elimina el elemento del escenario activo. No afecta a otros escenarios."
        confirmLabel="Eliminar"
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        <p className="muted-small">Verifique que el elemento no sea necesario para el cronograma o el informe antes de continuar.</p>
      </ConfirmDialog>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Eye size={14} /> {closure.tasks.filter((t) => t.done).length}/{closure.tasks.length} tareas · {params.monitoringPoints.length} puntos · {closure.alerts} alerta(s)
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={exportClosureCsv}>Exportar cronograma CSV</Btn>
          <Btn variant="primary" onClick={() => setModule("escenarios")}>Continuar a escenarios</Btn>
        </div>
      </div>
    </div>
  );
}
