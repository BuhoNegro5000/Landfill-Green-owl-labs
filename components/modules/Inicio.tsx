"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Boxes,
  Copy,
  Database,
  FolderPlus,
  HardDrive,
  MapPin,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useStore, storageEstimate } from "@/lib/store";
import { scenarioSummary } from "@/lib/engine/model";
import { Badge, Btn, ConfirmDialog, EmptyState, Kpi, KpiGrid, PageHeader, Panel, ProgressBar } from "@/components/ui";
import { fmt, fmtCompact, fmtDateTime, fmtPct, fmtUsd } from "@/lib/format";
import { BRAND } from "@/lib/defaults";
import { OwlMark } from "@/components/Brand";

export default function Inicio() {
  const projects = useStore((s) => s.projects);
  const documents = useStore((s) => s.documents);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const setModule = useStore((s) => s.setModule);
  const setDialog = useStore((s) => s.setDialog);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const archiveProject = useStore((s) => s.archiveProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const restoreDemos = useStore((s) => s.restoreDemos);
  const pushToast = useStore((s) => s.pushToast);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const live = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const bytes = storageEstimate(projects, documents);

  const rows = useMemo(
    () =>
      projects.map((project) => {
        const base = project.scenarios.find((s) => s.isBase) ?? project.scenarios[0];
        return { project, base, summary: scenarioSummary(project, base) };
      }),
    [projects],
  );

  const activeRow = rows.find((row) => row.project.id === activeProjectId) ?? rows[0];
  const totalScenarios = projects.reduce((sum, p) => sum + p.scenarios.length, 0);
  const demoCount = projects.filter((p) => p.isDemo).length;
  const deleteTarget = projects.find((p) => p.id === pendingDelete) ?? null;

  const openProject = (id: string) => {
    setActiveProject(id);
    setModule("emplazamiento");
  };

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Laboratorio · espacio de trabajo"
        title="Proyectos de relleno sanitario"
        description="Cada proyecto conserva sus escenarios, geometría, sistemas y trazabilidad. La persistencia es local al navegador: no existe backend ni sincronización."
        actions={
          <>
            <Btn variant="secondary" icon={<RotateCcw size={14} />} onClick={() => {
              const count = restoreDemos();
              pushToast({
                kind: count ? "ok" : "info",
                title: count ? "Casos demostrativos restaurados" : "Los casos demostrativos ya existen",
                detail: count ? `${count} proyecto(s) agregado(s).` : "No se agregó ningún proyecto duplicado.",
              });
            }}>
              Restaurar demos
            </Btn>
            <Btn variant="primary" icon={<FolderPlus size={14} />} onClick={() => setDialog("new-project")}>
              Nuevo proyecto
            </Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi
          label="Proyectos activos"
          value={String(live.length)}
          hint={`${demoCount} caso(s) demostrativo(s) · ${archived.length} archivado(s)`}
          tone="leaf"
          icon={<Boxes size={15} />}
        />
        <Kpi label="Escenarios modelados" value={String(totalScenarios)} hint="Cada escenario recalcula todos los motores" tone="blue" />
        <Kpi
          label="Capacidad del proyecto activo"
          value={activeRow ? fmtCompact(activeRow.summary.capacityT) : "—"}
          unit="t"
          hint={activeRow ? `${fmt(activeRow.summary.capacityM3)} m³ de residuos` : undefined}
        />
        <Kpi
          label="Almacenamiento local"
          value={`${(bytes / 1024).toFixed(1)}`}
          unit="kB"
          hint="localStorage · sin servidor"
          tone="amber"
          icon={<HardDrive size={15} />}
        />
      </KpiGrid>

      {activeRow ? (
        <Panel
          title="Proyecto activo"
          eyebrow="Contexto de cálculo"
          description="Todos los módulos operan sobre el proyecto y escenario seleccionados en la barra superior."
          actions={
            <Btn variant="primary" size="sm" iconRight={<ArrowRight size={13} />} onClick={() => setModule("emplazamiento")}>
              Abrir emplazamiento
            </Btn>
          }
        >
          <div className="active-project">
            <div className="active-project-brand">
              <OwlMark size={46} />
              <div>
                <h3>{activeRow.project.name}</h3>
                <p>{activeRow.project.descriptor || BRAND.descriptor}</p>
                <div className="tag-row">
                  {activeRow.project.tags.map((tag) => (
                    <Badge key={tag} tone="outline">{tag}</Badge>
                  ))}
                  {activeRow.project.isDemo ? <Badge tone="blue">Demostración</Badge> : <Badge tone="leaf">Proyecto propio</Badge>}
                </div>
              </div>
            </div>
            <div className="active-project-grid">
              <div>
                <span>Ubicación</span>
                <strong>{activeRow.project.location}</strong>
                <small>{activeRow.project.region} · {activeRow.project.country}</small>
              </div>
              <div>
                <span>Vida útil simulada</span>
                <strong>{fmt(activeRow.summary.lifeYears, 1)} años</strong>
                <small>{activeRow.summary.exhaustionYear ? `Agotamiento en ${fmt(activeRow.summary.exhaustionYear, 1)}` : "No agotada en el horizonte"}</small>
              </div>
              <div>
                <span>Lixiviado generado</span>
                <strong>{fmtCompact(activeRow.summary.leachateM3)} m³</strong>
                <small>Pico de diseño {fmt(activeRow.summary.peakLeachateLps, 2)} L/s</small>
              </div>
              <div>
                <span>Metano generado</span>
                <strong>{fmtCompact(activeRow.summary.ch4T)} t</strong>
                <small>Energía potencial {fmt(activeRow.summary.energyMWh)} MWh</small>
              </div>
              <div>
                <span>Validación</span>
                <strong>{activeRow.summary.usedPct > 100 ? "Revisar" : "Modelo calculado"}</strong>
                <small>Uso volumétrico {fmtPct(activeRow.summary.usedPct, 0)}</small>
              </div>
              <div>
                <span>Última escritura</span>
                <strong>{fmtDateTime(activeRow.project.updatedAt)}</strong>
                <small>Versión {activeRow.project.version}</small>
              </div>
            </div>
            <div className="active-project-foot">
              <div>
                <span className="field-label">Llenado de capacidad</span>
                <ProgressBar value={activeRow.summary.usedPct} max={100} showValue tone={activeRow.summary.usedPct >= 100 ? "amber" : "leaf"} />
              </div>
              <div className="active-project-cost">
                <span>VPN declarado</span>
                <strong>{fmtUsd(activeRow.summary.npvUsd)}</strong>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Biblioteca de proyectos"
        eyebrow={`${projects.length} proyecto(s)`}
        description="Seleccione un proyecto para trabajar. Las acciones no alteran los escenarios de otros proyectos."
        flush
      >
        <div className="project-grid">
          {rows.map(({ project, base, summary }) => {
            const active = project.id === activeProjectId;
            return (
              <article key={project.id} className={`project-card ${active ? "is-active" : ""} ${project.archived ? "is-archived" : ""}`}>
                <button type="button" className="project-card-main" onClick={() => openProject(project.id)}>
                  <div className="project-card-head">
                    <div>
                      <div className="tag-row">
                        <Badge tone={project.isDemo ? "blue" : "leaf"} dot>{project.isDemo ? "Demostración" : "Propio"}</Badge>
                        {project.archived ? <Badge tone="neutral">Archivado</Badge> : null}
                        {active ? <Badge tone="leaf">Activo</Badge> : null}
                      </div>
                      <h3>{project.name}</h3>
                      <p>{project.descriptor || `${project.region} · ${project.country}`}</p>
                    </div>
                    <span className="project-card-arrow"><ArrowRight size={15} /></span>
                  </div>
                  <div className="project-card-location">
                    <MapPin size={12} />
                    <span>{project.location} · {project.region}</span>
                  </div>
                  <div className="project-card-metrics">
                    <div><span>Capacidad</span><strong>{fmtCompact(summary.capacityT)} t</strong></div>
                    <div><span>Vida útil</span><strong>{fmt(summary.lifeYears, 1)} a</strong></div>
                    <div><span>Escenarios</span><strong>{project.scenarios.length}</strong></div>
                    <div><span>Lixiviado</span><strong>{fmtCompact(summary.leachateM3)} m³</strong></div>
                  </div>
                  <div className="project-card-foot">
                    <span>{base.name} · horizonte {project.horizonYears} años</span>
                    <span>{fmtDateTime(project.updatedAt)}</span>
                  </div>
                </button>
                <div className="project-card-actions">
                  <Btn size="sm" variant="ghost" icon={<Copy size={12} />} onClick={() => duplicateProject(project.id)} title="Duplicar proyecto">Duplicar</Btn>
                  <Btn size="sm" variant="ghost" icon={<Archive size={12} />} onClick={() => archiveProject(project.id)} title={project.archived ? "Restaurar" : "Archivar"}>
                    {project.archived ? "Restaurar" : "Archivar"}
                  </Btn>
                  <Btn size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => setPendingDelete(project.id)} title="Eliminar proyecto">Eliminar</Btn>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <div className="home-bottom-grid">
        <Panel title="Datos y trazabilidad" eyebrow="Sin backend" description="La aplicación no inventa datos de campo ni declara cumplimiento legal automático.">
          <div className="home-note-list">
            <div><Database size={15} /><span><strong>Persistencia local.</strong> Proyectos y documentos viven en localStorage. Exporte un respaldo desde Configuración.</span></div>
            <div><Sparkles size={15} /><span><strong>Escenarios independientes.</strong> Cada escenario guarda una copia completa de parámetros y se recalcula con los mismos motores.</span></div>
            <div><HardDrive size={15} /><span><strong>Alcance declarado.</strong> Los casos demostrativos son sintéticos y no representan instalaciones reales.</span></div>
          </div>
          <div className="tag-row" style={{ marginTop: 12 }}>
            <Badge tone="leaf">{BRAND.engine}</Badge>
            <Badge tone="neutral">Versión {BRAND.version}</Badge>
            <Badge tone="amber">Normativa con estado de verificación explícito</Badge>
          </div>
        </Panel>
        <Panel title="Ruta recomendada" eyebrow="Flujo de trabajo" description="Orden sugerido para un dimensionamiento defendible.">
          <ol className="workflow-list">
            <li><span>01</span><div><strong>Emplazamiento</strong><p>Declare cada dato y su calidad. Revise alertas hidrogeológicas.</p></div></li>
            <li><span>02</span><div><strong>Celdas y capas</strong><p>Defina geometría, bermas y barreras con espesores reales.</p></div></li>
            <li><span>03</span><div><strong>Residuos y capacidad</strong><p>Contraste generación, densidad, cobertura y vida útil.</p></div></li>
            <li><span>04</span><div><strong>Sistemas y cierre</strong><p>Lixiviados, biogás, operación, geotecnia y clausura.</p></div></li>
            <li><span>05</span><div><strong>Escenarios e informe</strong><p>Compare alternativas y genere el PDF con sus limitaciones.</p></div></li>
          </ol>
        </Panel>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FolderPlus size={22} />}
          title="No hay proyectos"
          description="Cree un proyecto nuevo o restaure los casos demostrativos."
          action={<Btn variant="primary" onClick={() => setDialog("new-project")}>Crear proyecto</Btn>}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setPendingDelete(null)}
        title="Eliminar proyecto"
        description={`Se eliminará «${deleteTarget?.name ?? ""}» y todos sus escenarios de este navegador. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setPendingDelete(null);
          pushToast({ kind: "info", title: "Proyecto eliminado", detail: "Puede restaurar los casos demostrativos desde este módulo." });
        }}
      >
        <p className="modal-warning">Exporte un respaldo JSON si necesita conservar los datos.</p>
      </ConfirmDialog>
    </div>
  );
}
