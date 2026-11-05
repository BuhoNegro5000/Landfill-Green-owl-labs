"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArchiveRestore,
  Camera,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FolderOpen,
  Gauge,
  HardDrive,
  Info,
  Layers3,
  MonitorCog,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { storageEstimate, useStore, type SceneView } from "@/lib/store";
import { runSelfTests, selfTestSummary } from "@/lib/selfTest";
import { exportBackupJson, exportProjectJson, readJsonFile } from "@/lib/exporters";
import { fmt, fmtCompact, fmtDateTime } from "@/lib/format";
import { useActiveProject } from "@/lib/store";
import type { RawDocument } from "@/lib/types";
import { uid } from "@/lib/uid";
import {
  Badge,
  Btn,
  Callout,
  ConfirmDialog,
  Field,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  Panel,
  RangeField,
  Segmented,
} from "@/components/ui";
import { FormGrid, InlineNote, MiniStat, ToggleLine } from "./shared";

const VIEWS: { value: SceneView; label: string }[] = [
  { value: "iso", label: "Isométrica" },
  { value: "top", label: "Planta" },
  { value: "front", label: "Frontal" },
  { value: "side", label: "Lateral" },
  { value: "section", label: "Sección" },
];

function isDocument(value: unknown): value is RawDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<RawDocument>;
  return typeof doc.title === "string" && typeof doc.number === "string" && typeof doc.issuer === "string";
}

function normalizeDocument(value: RawDocument): RawDocument {
  return {
    id: uid("doc"),
    title: value.title,
    kind: value.kind ?? "otro",
    number: value.number,
    date: value.date ?? "",
    issuer: value.issuer,
    article: value.article ?? "Por verificar",
    sourceUrl: value.sourceUrl ?? "",
    accessedAt: value.accessedAt ?? new Date().toISOString().slice(0, 10),
    status: value.status ?? "pendiente-verificacion",
    applicability: value.applicability ?? "",
    classification: value.classification ?? "recomendacion-tecnica",
    notes: value.notes ?? "",
  };
}

export default function Configuracion() {
  const { project, model } = useModel();
  const activeProject = useActiveProject();
  const projects = useStore((s) => s.projects);
  const documents = useStore((s) => s.documents);
  const scene = useStore((s) => s.scene);
  const display = useStore((s) => s.display);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const revision = useStore((s) => s.revision);
  const setScene = useStore((s) => s.setScene);
  const setView = useStore((s) => s.setView);
  const resetScene = useStore((s) => s.resetScene);
  const setDisplay = useStore((s) => s.setDisplay);
  const resetWorkspace = useStore((s) => s.resetWorkspace);
  const importProjectData = useStore((s) => s.importProjectData);
  const addDocument = useStore((s) => s.addDocument);
  const pushToast = useStore((s) => s.pushToast);
  const setModule = useStore((s) => s.setModule);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [importing, setImporting] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [tests, setTests] = useState(() => runSelfTests());
  const [storage, setStorage] = useState<{ usage: number | null; quota: number | null }>({ usage: null, quota: null });
  const [localBytes, setLocalBytes] = useState<number | null>(null);

  const testSummary = selfTestSummary(tests);
  const backupBytes = useMemo(() => storageEstimate(projects, documents), [projects, documents]);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const result = await navigator.storage?.estimate?.();
        if (alive && result) setStorage({ usage: result.usage ?? null, quota: result.quota ?? null });
      } catch {
        if (alive) setStorage({ usage: null, quota: null });
      }
      try {
        const raw = localStorage.getItem("green-owl-landfill-3d");
        if (alive) setLocalBytes(raw ? new Blob([raw]).size : 0);
      } catch {
        if (alive) setLocalBytes(null);
      }
    };
    void read();
    return () => {
      alive = false;
    };
  }, [revision, projects.length, documents.length]);

  const runDiagnostics = () => {
    setTests(runSelfTests());
    pushToast({ kind: "ok", title: "Diagnóstico ejecutado", detail: `${testSummary.total} pruebas del motor recalculadas.` });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const payload = await readJsonFile(file);
      const result = importProjectData(payload);
      if (!result.ok) {
        pushToast({ kind: "error", title: "Importación rechazada", detail: result.message });
        return;
      }
      const raw = payload as { documents?: unknown[] };
      let docsAdded = 0;
      if (includeDocs && Array.isArray(raw.documents)) {
        for (const candidate of raw.documents) {
          if (!isDocument(candidate)) continue;
          addDocument(normalizeDocument(candidate));
          docsAdded += 1;
        }
      }
      pushToast({
        kind: "ok",
        title: "Respaldo importado",
        detail: `${result.message}${docsAdded ? ` ${docsAdded} documento(s) agregados.` : ""}`,
      });
    } catch (error) {
      pushToast({ kind: "error", title: "No se pudo leer el archivo", detail: (error as Error).message });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Sistema · Configuración"
        title="Preferencias, respaldo y diagnóstico"
        description="Ajustes del visor y de la interfaz, estado del almacenamiento local, exportación de respaldos y verificación del motor. Todo se ejecuta en este navegador."
        actions={
          <>
            <Btn variant="outline" icon={<Download size={14} />} onClick={() => exportBackupJson(projects, documents)}>Exportar respaldo</Btn>
            <Btn variant="primary" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? "Importando…" : "Importar respaldo"}
            </Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Almacenamiento local" value={localBytes === null ? "—" : fmtCompact(localBytes)} unit="bytes" hint="Clave de persistencia del navegador" tone="blue" />
        <Kpi label="Proyectos" value={String(projects.length)} hint={`${projects.reduce((sum, p) => sum + p.scenarios.length, 0)} escenarios en total`} tone="leaf" />
        <Kpi label="Biblioteca documental" value={String(documents.length)} hint={`${documents.filter((d) => d.status === "pendiente-verificacion").length} pendientes de verificación`} tone="amber" />
        <Kpi label="Motor" value={model.engineVersion} hint={`${testSummary.passed}/${testSummary.total} pruebas aprobadas`} tone={testSummary.ok ? "leaf" : "danger"} />
      </KpiGrid>

      <Callout tone="info" title="Persistencia exclusivamente local">
        Proyectos, escenarios, documentos y preferencias se guardan en <strong>localStorage</strong> de este navegador. No
        hay backend, cuenta, sincronización ni telemetría. Limpiar los datos del navegador elimina el trabajo no respaldado.
      </Callout>

      <div className="split-grid">
        <Panel
          title="Vista 3D"
          eyebrow="Escena"
          description="Los cambios se aplican al visor de este módulo y al modelo a pantalla completa. Las capas del liner se exageran solo en la vista 3D."
          actions={<Btn size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => { resetScene(); pushToast({ kind: "ok", title: "Vista restablecida", detail: "Se recuperaron los valores predeterminados de la escena." }); }}>Restablecer</Btn>}
        >
          <Field label="Vista de cámara" hint="La vista seleccionada se aplica al visor activo; el botón de restablecer recupera la isométrica.">
            <Segmented value={scene.view} onChange={(value) => setView(value)} options={VIEWS} ariaLabel="Vista de cámara" />
          </Field>
          <div className="settings-toggle-grid">
            <ToggleLine label="Terreno" description="Superficie esquemática y excavaciones" checked={scene.showTerrain} onChange={(checked) => setScene({ showTerrain: checked })} />
            <ToggleLine label="Residuos" description="Volumen de llenado por año" checked={scene.showWaste} onChange={(checked) => setScene({ showWaste: checked })} />
            <ToggleLine label="Liner y capas" description="Espesores exagerados para visualización" checked={scene.showLiner} onChange={(checked) => setScene({ showLiner: checked })} />
            <ToggleLine label="Drenaje" description="Tuberías y flujo de lixiviados" checked={scene.showPipes} onChange={(checked) => setScene({ showPipes: checked })} />
            <ToggleLine label="Pozos de biogás" description="Pozos y colectores" checked={scene.showWells} onChange={(checked) => setScene({ showWells: checked })} />
            <ToggleLine label="Antorcha" description="Quema de biogás capturado" checked={scene.showFlare} onChange={(checked) => setScene({ showFlare: checked })} />
            <ToggleLine label="Etiquetas" description="Nombres y cotas de celdas" checked={scene.showLabels} onChange={(checked) => setScene({ showLabels: checked })} />
            <ToggleLine label="Curvas de nivel" description="Contornos esquemáticos del terreno" checked={scene.showContours} onChange={(checked) => setScene({ showContours: checked })} />
            <ToggleLine label="Rejilla" description="Grilla de referencia del suelo" checked={scene.showGrid} onChange={(checked) => setScene({ showGrid: checked })} />
            <ToggleLine label="Sombras" description="Iluminación con sombras dinámicas" checked={scene.shadows} onChange={(checked) => setScene({ shadows: checked })} />
          </div>
          <div className="settings-sliders">
            <Field label="Exageración de capas" hint="Factor visual del liner. No modifica los espesores reales del modelo ni del informe.">
              <NumberField
                value={scene.layerExaggeration}
                onChange={(value) => setScene({ layerExaggeration: value })}
                min={1}
                max={30}
                step={1}
                unit="×"
              />
            </Field>
          </div>
          <div className="settings-toggle-grid">
            <ToggleLine label="Animación de flujo" description="Movimiento del agua en tuberías" checked={scene.animFlow} onChange={(checked) => setScene({ animFlow: checked })} />
            <ToggleLine label="Animación de gas" description="Movimiento del biogás en pozos" checked={scene.animGas} onChange={(checked) => setScene({ animGas: checked })} />
            <ToggleLine label="Rotación automática" description="Órbita continua de la cámara" checked={scene.autoRotate} onChange={(checked) => setScene({ autoRotate: checked })} />
            <ToggleLine label="Plano de corte" description="Corte vertical para inspeccionar el relleno" checked={scene.clipEnabled} onChange={(checked) => setScene({ clipEnabled: checked })} />
          </div>
          <RangeField
            label="Posición del plano de corte"
            value={scene.clipPosition}
            min={0}
            max={1}
            step={0.01}
            digits={2}
            onChange={(value) => setScene({ clipPosition: value })}
            hint="0 = un extremo del modelo; 1 = el extremo opuesto. Solo aplica con el plano de corte activo."
          />
          <InlineNote tone="neutral">
            La exageración actual es {fmt(scene.layerExaggeration, 0)}×. En el informe, la tabla de capas conserva los
            espesores reales en milímetros.
          </InlineNote>
        </Panel>

        <Panel title="Interfaz" eyebrow="Accesibilidad y densidad" description="Preferencias de presentación que no alteran los cálculos ni el modelo.">
          <ToggleLine
            label="Modo compacto"
            description="Reduce espacios y tamaños de encabezado en el espacio de trabajo."
            checked={display.compact}
            onChange={(checked) => setDisplay({ compact: checked })}
          />
          <ToggleLine
            label="Reducir movimiento"
            description="Desactiva transiciones y animaciones CSS de la interfaz. No detiene las animaciones WebGL del visor; use los controles de escena."
            checked={display.reduceMotion}
            onChange={(checked) => setDisplay({ reduceMotion: checked })}
          />
          <InlineNote tone="neutral">
            El modo compacto se aplica al instante y se conserva al recargar. La reducción de movimiento respeta además la
            preferencia del sistema operativo.
          </InlineNote>
          <div className="inline-stat-block">
            <MiniStat label="Tema" value="Bosque profundo" hint="Identidad Green Owl Labs" />
            <MiniStat label="Idioma" value="Español" hint="Unidades internas en SI" />
            <MiniStat label="Densidad" value={display.compact ? "Compacta" : "Normal"} hint="Afecta solo la presentación" />
            <MiniStat label="Movimiento" value={display.reduceMotion ? "Reducido" : "Normal"} hint="CSS de la interfaz" />
          </div>
          <div className="settings-preview">
            <Camera size={15} />
            <div>
              <strong>Vista previa del visor</strong>
              <p>El modelo 3D se muestra en el panel derecho de los módulos. Ábralo a pantalla completa para orbitar, seleccionar celdas y capturar imágenes.</p>
            </div>
            <Btn size="sm" variant="secondary" onClick={() => setModule("modelo")}>Abrir 3D</Btn>
          </div>
        </Panel>
      </div>

      <div className="split-grid">
        <Panel title="Proyecto activo" eyebrow="Datos" description="El respaldo del proyecto incluye todos sus escenarios y la biblioteca documental, pero no descarga el PDF ni capturas.">
          <div className="inline-stat-block">
            <MiniStat label="Proyecto" value={activeProject.name} hint={`${activeProject.region}, ${activeProject.country}`} />
            <MiniStat label="Escenarios" value={String(activeProject.scenarios.length)} hint={`Base: ${activeProject.scenarios.find((s) => s.isBase)?.name ?? "—"}`} />
            <MiniStat label="Horizonte" value={`${activeProject.horizonYears} años`} hint={`Versión ${activeProject.version}`} />
            <MiniStat label="Actualizado" value={fmtDateTime(activeProject.updatedAt)} hint={`Guardado local: ${fmtDateTime(lastSavedAt)}`} />
          </div>
          <div className="row-actions">
            <Btn variant="outline" size="sm" icon={<FileJson size={12} />} onClick={() => exportProjectJson(project, documents)}>Exportar proyecto JSON</Btn>
            <Btn variant="secondary" size="sm" icon={<FolderOpen size={12} />} onClick={() => setModule("inicio")}>Gestionar proyectos</Btn>
          </div>
          <InlineNote tone="amber">
            El proyecto exportado conserva el formato Green Owl Landfill 3D. Al importarlo se le asigna un identificador nuevo
            si ya existe uno igual.
          </InlineNote>
        </Panel>

        <Panel title="Respaldo e importación" eyebrow="Continuidad" description="Exporte un respaldo completo antes de limpiar el navegador o cambiar de equipo. La importación agrega proyectos; no reemplaza los existentes.">
          <div className="inline-stat-block">
            <MiniStat label="Respaldo estimado" value={fmtCompact(backupBytes)} hint="Bytes del JSON de proyectos y documentos" />
            <MiniStat label="Uso del navegador" value={storage.usage === null ? "—" : fmtCompact(storage.usage)} hint={storage.quota ? `Cuota declarada: ${fmtCompact(storage.quota)}` : "El navegador no informó la cuota"} />
            <MiniStat label="Última escritura" value={fmtDateTime(lastSavedAt)} hint="Persistencia automática" />
            <MiniStat label="Revisión" value={String(revision)} hint="Contador de cambios de estado" />
          </div>
          <ToggleLine
            label="Importar biblioteca documental"
            description="Si el respaldo contiene documentos, se agregan con identificadores nuevos."
            checked={includeDocs}
            onChange={setIncludeDocs}
          />
          <div className="row-actions">
            <Btn variant="primary" icon={<Download size={13} />} onClick={() => exportBackupJson(projects, documents)}>Descargar respaldo completo</Btn>
            <Btn variant="secondary" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? "Importando…" : "Seleccionar archivo JSON"}
            </Btn>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Seleccionar respaldo JSON"
            onChange={(event) => void onImport(event.target.files?.[0])}
          />
          <InlineNote tone="neutral">
            La importación valida la estructura mínima de cada proyecto. Los archivos ajenos al formato pueden ser rechazados
            sin modificar el espacio de trabajo.
          </InlineNote>
        </Panel>
      </div>

      <Panel
        title="Diagnóstico del motor"
        eyebrow={`${testSummary.passed} aprobadas · ${testSummary.failed} fallidas`}
        description="Pruebas ejecutadas sobre las funciones reales de cálculo. Se repiten al abrir este panel y al presionar el botón."
        actions={<Btn size="sm" variant="outline" icon={<Activity size={12} />} onClick={runDiagnostics}>Ejecutar diagnóstico</Btn>}
      >
        <div className="diagnostic-grid">
          {tests.map((test) => (
            <div key={test.id} className={`diagnostic-card ${test.passed ? "is-ok" : "is-fail"}`}>
              <div className="diagnostic-head">
                {test.passed ? <CheckCircle2 size={14} /> : <Gauge size={14} />}
                <strong>{test.name}</strong>
                <Badge tone={test.passed ? "leaf" : "red"}>{test.passed ? "OK" : "Falla"}</Badge>
              </div>
              <p>{test.detail}</p>
              <div className="diagnostic-values">
                <span>Esperado: {test.expected}</span>
                <span>Obtenido: {test.actual}</span>
                <span>Tolerancia: {test.tolerance}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="callout-inline">
          <ShieldCheck size={14} />
          <span>Una prueba aprobada confirma la aritmética del caso documentado; no valida los datos del proyecto ni el cumplimiento normativo.</span>
        </div>
      </Panel>

      <div className="split-grid">
        <Panel title="Almacenamiento local" eyebrow="Transparencia" description="Estado del almacenamiento del navegador y del autoguardado.">
          <div className="storage-bar">
            <div>
              <HardDrive size={16} />
              <div>
                <strong>{localBytes === null ? "No disponible" : `${fmt(localBytes)} bytes`}</strong>
                <span>Clave «green-owl-landfill-3d»</span>
              </div>
            </div>
            <Badge tone={localBytes === null ? "red" : "leaf"} dot>{localBytes === null ? "Sin acceso" : "Activo"}</Badge>
          </div>
          <div className="storage-bar">
            <div>
              <Database size={16} />
              <div>
                <strong>{fmtCompact(backupBytes)} bytes estimados</strong>
                <span>Proyectos y documentos serializados</span>
              </div>
            </div>
            <Badge tone="blue" dot>Local</Badge>
          </div>
          <div className="storage-bar">
            <div>
              <Save size={16} />
              <div>
                <strong>{fmtDateTime(lastSavedAt)}</strong>
                <span>Última escritura automática</span>
              </div>
            </div>
            <Badge tone="leaf" dot>Guardado</Badge>
          </div>
          <InlineNote tone="amber">
            Si el navegador está en modo privado o bloquea el almacenamiento, los cambios pueden perderse al cerrar la
            pestaña. Use un respaldo JSON para conservar el trabajo.
          </InlineNote>
        </Panel>

        <Panel title="Zona de riesgo" eyebrow="Acciones destructivas" description="Estas acciones no se pueden deshacer desde la interfaz.">
          <div className="danger-zone">
            <div>
              <Trash2 size={16} />
              <div>
                <strong>Restablecer espacio de trabajo</strong>
                <p>Reemplaza proyectos, escenarios y biblioteca por los casos demostrativos incluidos. No borra las preferencias de escena ni de interfaz.</p>
              </div>
            </div>
            <Btn variant="danger" onClick={() => setPendingReset(true)}>Restablecer todo</Btn>
          </div>
          <div className="danger-zone">
            <div>
              <ArchiveRestore size={16} />
              <div>
                <strong>Restaurar demostraciones</strong>
                <p>Vuelve a agregar los proyectos demostrativos que falten, sin eliminar los proyectos propios.</p>
              </div>
            </div>
            <Btn
              variant="secondary"
              onClick={() => {
                const count = useStore.getState().restoreDemos();
                pushToast({
                  kind: count ? "ok" : "info",
                  title: count ? "Demostraciones restauradas" : "Sin cambios",
                  detail: count ? `${count} proyecto(s) agregados.` : "Los proyectos demostrativos ya estaban presentes.",
                });
              }}
            >
              Restaurar demos
            </Btn>
          </div>
          <Callout tone="danger" title="Antes de restablecer">
            Exporte un respaldo completo. El restablecimiento reemplaza los proyectos y la biblioteca documental por los
            valores iniciales; no hay papelera ni historial de versiones.
          </Callout>
        </Panel>
      </div>

      <Panel title="Notas del sistema" eyebrow="Alcance" description="Limitaciones conocidas de la aplicación y del entorno local.">
        <div className="report-quality-grid">
          <div><MonitorCog size={15} /><strong>Sin backend</strong><p>No hay cuentas, sincronización, colaboración ni recuperación desde servidor.</p></div>
          <div><Layers3 size={15} /><strong>3D esquemático</strong><p>El terreno no es un levantamiento topográfico y las capas se exageran para visualizarse.</p></div>
          <div><SlidersHorizontal size={15} /><strong>Parámetros declarados</strong><p>Los resultados dependen de los datos introducidos y de los supuestos documentados.</p></div>
          <div><Info size={15} /><strong>Normativa verificable</strong><p>Las entradas pendientes no se presentan como requisitos vigentes.</p></div>
        </div>
        <div className="inline-stat-block">
          <MiniStat label="Versión" value="Green Owl Landfill 3D 1.0.0" />
          <MiniStat label="Motor" value={model.engineVersion} />
          <MiniStat label="Persistencia" value="localStorage" hint="Sin servidor" />
          <MiniStat label="Pruebas" value={`${testSummary.passed}/${testSummary.total}`} hint={testSummary.ok ? "Sin fallas" : "Revisar"} />
        </div>
        <InlineNote tone="neutral">
          Para reportar un problema, incluya el proyecto exportado, la versión del motor y los pasos para reproducirlo.
          No adjunte datos confidenciales sin autorización.
        </InlineNote>
      </Panel>

      <ConfirmDialog
        open={pendingReset}
        title="Restablecer espacio de trabajo"
        description="Se reemplazarán todos los proyectos, escenarios y la biblioteca documental por los valores iniciales."
        confirmLabel="Restablecer todo"
        onClose={() => setPendingReset(false)}
        onConfirm={() => {
          resetWorkspace();
          pushToast({ kind: "ok", title: "Espacio de trabajo restablecido", detail: "Se recuperaron los proyectos y documentos iniciales." });
          setPendingReset(false);
        }}
      >
        <p className="muted-small">Exporte un respaldo completo antes de continuar. Esta acción no se puede deshacer.</p>
      </ConfirmDialog>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Save size={14} /> Guardado local: {fmtDateTime(lastSavedAt)} · {projects.length} proyectos · {documents.length} documentos
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportBackupJson(projects, documents)}>Exportar respaldo</Btn>
          <Btn variant="primary" size="sm" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()} disabled={importing}>Importar</Btn>
        </div>
      </div>
    </div>
  );
}
