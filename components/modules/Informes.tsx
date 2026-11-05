"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Layers3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { captureScene } from "@/lib/sceneBridge";
import { generateReport, REPORT_SECTIONS, type ReportOptions, type ReportSectionFlags } from "@/lib/report";
import { fmt, fmtDate } from "@/lib/format";
import {
  Badge,
  Btn,
  Callout,
  Field,
  Kpi,
  KpiGrid,
  PageHeader,
  Panel,
  TextArea,
  TextField,
} from "@/components/ui";
import { InlineNote, MiniStat, ToggleLine } from "./shared";

function allSections(enabled: boolean): ReportSectionFlags {
  return Object.fromEntries(REPORT_SECTIONS.map((section) => [section.id, enabled])) as ReportSectionFlags;
}

export default function Informes() {
  const { project, scenario, model } = useModel();
  const documents = useStore((s) => s.documents);
  const pushToast = useStore((s) => s.pushToast);

  const [sections, setSections] = useState<ReportSectionFlags>(() => allSections(true));
  const [include3d, setInclude3d] = useState(true);
  const [preparedBy, setPreparedBy] = useState(project.responsible);
  const [observations, setObservations] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<{ fileName: string; pages: number } | null>(null);

  const enabledCount = useMemo(
    () => REPORT_SECTIONS.filter((section) => sections[section.id]).length,
    [sections],
  );

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!sections.resumen && !sections.proyecto) missing.push("Al menos un resumen o la identificación del proyecto");
    if (!preparedBy.trim()) missing.push("El nombre del responsable técnico");
    return missing;
  }, [sections, preparedBy]);

  const refreshCapture = () => {
    setCapturing(true);
    window.setTimeout(() => {
      const data = captureScene({ width: 1600, height: 900 });
      setScreenshot(data);
      setCapturing(false);
      if (data) {
        pushToast({ kind: "ok", title: "Captura 3D actualizada", detail: "La imagen se usará en la sección de geometría." });
      } else {
        pushToast({
          kind: "warn",
          title: "Captura no disponible",
          detail: "El navegador no expuso el lienzo WebGL. El informe puede generarse sin imagen.",
        });
      }
    }, 30);
  };

  const generate = async () => {
    if (missingRequired.length) {
      setError(missingRequired.join(". "));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let shot: string | null = null;
      if (include3d) {
        shot = screenshot ?? captureScene({ width: 1600, height: 900 });
        if (!shot) {
          pushToast({
            kind: "warn",
            title: "Informe sin captura 3D",
            detail: "El navegador no permitió exportar el lienzo. Las demás secciones se incluyen.",
          });
        }
      }
      const options: ReportOptions = {
        sections,
        include3d,
        preparedBy: preparedBy.trim(),
        observations: observations.trim(),
        screenshotDataUrl: shot,
        documents,
      };
      const result = await generateReport(project, scenario, model, options);
      setLastReport(result);
      pushToast({
        kind: "ok",
        title: "Informe generado",
        detail: `${result.fileName} · ${result.pages} páginas. El PDF se descargó desde este navegador.`,
      });
    } catch (err) {
      const message = (err as Error).message || "Error desconocido al generar el PDF.";
      setError(message);
      pushToast({ kind: "error", title: "No se pudo generar el informe", detail: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 14 · Informes"
        title="Documento técnico local"
        description="PDF generado en el navegador con los datos reales del proyecto, la captura 3D y la trazabilidad de métodos. No se envía a un servidor ni se firma digitalmente."
        actions={
          <>
            <Btn variant="outline" icon={<Camera size={14} />} onClick={refreshCapture} disabled={capturing}>
              {capturing ? "Capturando…" : "Actualizar captura"}
            </Btn>
            <Btn variant="primary" icon={busy ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} onClick={generate} disabled={busy}>
              {busy ? "Generando PDF…" : "Generar informe PDF"}
            </Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Secciones incluidas" value={`${enabledCount}`} unit={`/ ${REPORT_SECTIONS.length}`} hint="Seleccione el contenido en el panel inferior" tone="leaf" />
        <Kpi label="Escenario" value={scenario.name} hint={scenario.isBase ? "Escenario base" : "Escenario derivado"} tone="blue" />
        <Kpi label="Documentos normativos" value={String(documents.length)} hint={`${documents.filter((d) => d.status === "pendiente-verificacion").length} con verificación pendiente`} tone="amber" />
        <Kpi label="Último informe" value={lastReport ? String(lastReport.pages) : "—"} unit={lastReport ? "páginas" : ""} hint={lastReport ? lastReport.fileName : "Aún no generado en esta sesión"} tone="default" />
      </KpiGrid>

      {error ? <Callout tone="danger" title="El informe no se generó">{error}</Callout> : null}

      <div className="split-grid">
        <Panel
          title="Datos de emisión"
          eyebrow="Identificación"
          description="El responsable y las observaciones se imprimen en el documento. El nombre del proyecto y el escenario provienen del modelo activo."
        >
          <Field label="Responsable técnico" hint="Se usa en la portada y en el bloque de firma. No se valida como profesión habilitada.">
            <TextField value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} placeholder="Nombre y especialidad" maxLength={90} />
          </Field>
          <Field label="Observaciones del responsable" hint="Se incluyen en el resumen ejecutivo. Puede dejar el campo vacío.">
            <TextArea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              rows={5}
              placeholder="Alcance del estudio, limitaciones conocidas, decisiones pendientes…"
              maxLength={2000}
            />
          </Field>
          <ToggleLine
            label="Incluir captura del modelo 3D"
            description="Se inserta en la sección de geometría. Si el navegador bloquea el lienzo, el informe continúa sin imagen."
            checked={include3d}
            onChange={setInclude3d}
          />
          <InlineNote tone="neutral">
            El PDF se descarga automáticamente al terminar. No se guarda una copia en el almacenamiento local ni en la nube.
          </InlineNote>
        </Panel>

        <Panel
          title="Vista previa de la captura"
          eyebrow={screenshot ? "Guardada en memoria" : "Sin captura"}
          description="La imagen se genera desde el visor 3D de este módulo. No es una vista cartográfica ni una ortofoto."
          actions={<Btn size="sm" variant="outline" icon={<Camera size={12} />} onClick={refreshCapture} disabled={capturing}>Capturar</Btn>}
        >
          {screenshot ? (
            <div className="report-shot">
              <img src={screenshot} alt="Captura del modelo tridimensional del relleno" />
              <div className="report-shot-foot">
                <span><ImageIcon size={12} /> Captura WebGL de la vista actual</span>
                <button type="button" className="link-button" onClick={() => setScreenshot(null)}>Quitar</button>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 28 }}>
              <Camera size={20} />
              <h3>Sin captura 3D</h3>
              <p>Capture la vista actual o genere el informe: si la opción está activa, se intentará capturar en ese momento.</p>
            </div>
          )}
          <div className="inline-stat-block">
            <MiniStat label="Proyecto" value={project.name} hint={`${project.region}, ${project.country}`} />
            <MiniStat label="Horizonte" value={`${project.horizonYears} años`} hint="Motor del informe" />
            <MiniStat label="Actualizado" value={fmtDate(project.updatedAt)} hint={`Versión ${project.version}`} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Contenido del informe"
        eyebrow={`${enabledCount} de ${REPORT_SECTIONS.length} secciones`}
        description="Desactive las secciones que no correspondan al alcance. La numeración del PDF se ajusta automáticamente al contenido incluido."
        actions={
          <>
            <Btn size="sm" variant="ghost" onClick={() => setSections(allSections(true))}>Todas</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setSections(allSections(false))}>Ninguna</Btn>
          </>
        }
      >
        <div className="report-section-grid">
          {REPORT_SECTIONS.map((section, index) => (
            <ToggleLine
              key={section.id}
              label={`${String(index + 1).padStart(2, "0")} · ${section.title}`}
              checked={sections[section.id]}
              onChange={(checked) => setSections((current) => ({ ...current, [section.id]: checked }))}
            />
          ))}
        </div>
        <InlineNote tone="amber">
          Desactivar «Métodos» también omite la verificación en vivo del motor dentro del PDF. La sección de supuestos y
          limitaciones es independiente y se recomienda mantenerla.
        </InlineNote>
      </Panel>

      <div className="split-grid">
        <Panel title="Qué incluye el documento" eyebrow="Trazabilidad" description="Cada sección se alimenta del modelo activo y de la biblioteca documental local.">
          <div className="check-list">
            {[
              "Portada, contenido y resumen ejecutivo con indicadores clave.",
              "Identificación, emplazamiento y calidad declarada de cada dato.",
              "Geometría, celdas, bermas y capas con espesores reales.",
              "Capacidad, balance anual de residuos, lixiviados y biogás.",
              "Operación, geotecnia conceptual, clausura y monitoreo.",
              "Comparación de escenarios, sensibilidad OAT y resultados económicos.",
              "Métodos, pruebas de referencia, referencias y biblioteca normativa.",
              "Supuestos, limitaciones y bloques de firma sin validez legal automática.",
            ].map((item) => (
              <div key={item} className="check-line">
                <Check size={12} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <InlineNote tone="neutral">
            El informe no incluye un anexo topográfico, ensayos de laboratorio, registros fotográficos ni planos firmados.
            Esos documentos deben adjuntarse por separado.
          </InlineNote>
        </Panel>

        <Panel title="Advertencias de emisión" eyebrow="Antes de descargar" description="El documento declara su alcance; no certifica cumplimiento ni aptitud.">
          <Callout tone="warn" title="Documento generado localmente">
            La validez del informe depende de la calidad de los datos introducidos. Las normas peruanas marcadas como
            pendientes no se citan como requisitos vigentes y la geotecnia es solo un chequeo conceptual.
          </Callout>
          <div className="assumption-list">
            <p>El PDF no se firma digitalmente ni incorpora sello de tiempo externo.</p>
            <p>La captura 3D conserva la exageración de capas del visor; la tabla de capas mantiene los espesores reales.</p>
            <p>Los costos son datos declarados por el usuario y no una estimación de mercado.</p>
            <p>La biblioteca documental se incluye con el estado de verificación que tenga en este navegador.</p>
          </div>
          <div className="row-actions">
            <Btn variant="primary" icon={busy ? <Loader2 size={13} className="spin" /> : <Download size={13} />} onClick={generate} disabled={busy}>
              {busy ? "Generando…" : "Generar y descargar PDF"}
            </Btn>
          </div>
        </Panel>
      </div>

      {lastReport ? (
        <Panel title="Informe generado en esta sesión" eyebrow="Resultado" description="El archivo se descargó automáticamente. Esta tarjeta no conserva el PDF ni permite volver a descargarlo.">
          <div className="inline-stat-block">
            <MiniStat label="Archivo" value={lastReport.fileName} />
            <MiniStat label="Páginas" value={String(lastReport.pages)} />
            <MiniStat label="Estado" value="Descargado" hint="Verifique la carpeta de descargas del navegador" />
          </div>
          <InlineNote tone="leaf">
            <CheckCircle2 size={13} /> El PDF se construyó con jsPDF en el navegador y no salió de este equipo.
          </InlineNote>
        </Panel>
      ) : null}

      <Panel title="Controles de calidad del documento" eyebrow="Revisión" description="Compruebe estos puntos antes de entregar el PDF.">
        <div className="report-quality-grid">
          <div>
            <FileCheck2 size={15} />
            <strong>Datos verificados</strong>
            <p>Revise la calidad declarada del emplazamiento y los hallazgos de validación.</p>
          </div>
          <div>
            <Layers3 size={15} />
            <strong>Geometría y capas</strong>
            <p>Confirme que las dimensiones, bermas y espesores correspondan al diseño revisado.</p>
          </div>
          <div>
            <ShieldCheck size={15} />
            <strong>Normativa</strong>
            <p>No cite entradas con verificación pendiente como obligaciones vigentes.</p>
          </div>
          <div>
            <Badge tone="outline">Motor {model.engineVersion}</Badge>
            <strong>Reproducibilidad</strong>
            <p>El informe registra la versión del motor y la fecha de generación.</p>
          </div>
        </div>
        <InlineNote tone="neutral">
          Se incluyen {fmt(enabledCount)} secciones, {documents.length} documentos y {fmt(model.issues.length)} hallazgos de
          validación. El resumen ejecutivo reporta el conteo de errores y advertencias.
        </InlineNote>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <FileText size={14} /> {project.name} · {scenario.name} · {enabledCount} secciones · {documents.length} documentos
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Camera size={13} />} onClick={refreshCapture} disabled={capturing}>Actualizar captura</Btn>
          <Btn variant="primary" icon={busy ? <Loader2 size={13} className="spin" /> : <FileText size={13} />} onClick={generate} disabled={busy}>
            {busy ? "Generando…" : "Generar PDF"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
