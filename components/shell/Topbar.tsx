"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  FolderPlus,
  Menu,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useStore, useActiveProject, useActiveScenario } from "@/lib/store";
import { useModel } from "@/components/ModelProvider";
import { MODULE_META } from "@/lib/nav";
import { fmtDateTime } from "@/lib/format";
import { OwlMark } from "@/components/Brand";
import type { ScenarioKind } from "@/lib/types";

const KIND_LABEL: Record<ScenarioKind, string> = {
  base: "Base",
  conservador: "Conservador",
  "generacion-elevada": "Generación elevada",
  "mayor-recuperacion": "Mayor recuperación",
  precipitaciones: "Precipitaciones",
  "optimizacion-capacidad": "Optimización",
  "clausura-anticipada": "Clausura anticipada",
  personalizado: "Personalizado",
};

function Popover({
  open,
  onClose,
  children,
  align = "left",
  width,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`switcher-popover ${align === "right" ? "align-right" : ""}`} style={width ? { width } : undefined}>
      {children}
    </div>
  );
}

export default function Topbar() {
  const project = useActiveProject();
  const scenario = useActiveScenario();
  const { model } = useModel();
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const setActiveScenario = useStore((s) => s.setActiveScenario);
  const setModule = useStore((s) => s.setModule);
  const setDialog = useStore((s) => s.setDialog);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const activeModule = useStore((s) => s.activeModule);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const [projectOpen, setProjectOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const errors = model.issues.filter((i) => i.severity === "error").length;
  const warnings = model.issues.filter((i) => i.severity === "warning").length;
  const meta = MODULE_META[activeModule];
  const activeProjects = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir navegación">
          <Menu size={16} />
        </button>

        <div className="breadcrumb">
          <span>Laboratorio</span>
          <span>/</span>
          <strong>{meta.label}</strong>
        </div>

        <div className="topbar-divider" />

        <div className="switcher">
          <button type="button" className="switcher-button" onClick={() => { setProjectOpen((v) => !v); setScenarioOpen(false); }} aria-haspopup="listbox" aria-expanded={projectOpen}>
            <OwlMark size={22} />
            <span className="switcher-copy">
              <span className="switcher-caption">Proyecto</span>
              <span className="switcher-label">{project.name}</span>
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6 }} />
          </button>
          <Popover open={projectOpen} onClose={() => setProjectOpen(false)} width={350}>
            <div className="switcher-popover-header">Proyectos · {projects.length} · almacenamiento local</div>
            {activeProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`switcher-item ${p.id === activeProjectId ? "is-active" : ""}`}
                onClick={() => {
                  setActiveProject(p.id);
                  setProjectOpen(false);
                }}
              >
                <span className="switcher-dot" style={{ background: p.isDemo ? "#3B7C9E" : "#79CE4C", color: p.isDemo ? "#3B7C9E" : "#79CE4C" }} />
                <span className="switcher-item-copy">
                  <strong>{p.name}</strong>
                  <small>
                    {p.region} · {p.scenarios.length} escenario(s) · {p.isDemo ? "demostración" : "proyecto propio"}
                  </small>
                </span>
                {p.id === activeProjectId ? <Check size={13} style={{ color: "var(--leaf-400)" }} /> : null}
              </button>
            ))}
            {archived.length ? (
              <>
                <div className="switcher-popover-header" style={{ marginTop: 4 }}>Archivados</div>
                {archived.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="switcher-item"
                    onClick={() => {
                      setActiveProject(p.id);
                      setProjectOpen(false);
                    }}
                  >
                    <span className="switcher-dot" style={{ background: "#5A665F" }} />
                    <span className="switcher-item-copy">
                      <strong>{p.name}</strong>
                      <small>Archivado · {p.region}</small>
                    </span>
                  </button>
                ))}
              </>
            ) : null}
            <button
              type="button"
              className="switcher-item switcher-item-add"
              onClick={() => {
                setProjectOpen(false);
                setDialog("new-project");
              }}
            >
              <FolderPlus size={15} />
              <span className="switcher-item-copy">
                <strong>Nuevo proyecto</strong>
                <small>Plantilla mecanizada, trinchera, integral o vacía</small>
              </span>
            </button>
          </Popover>
        </div>

        <div className="switcher">
          <button type="button" className="switcher-button" onClick={() => { setScenarioOpen((v) => !v); setProjectOpen(false); }} aria-haspopup="listbox" aria-expanded={scenarioOpen}>
            <span className="switcher-dot" style={{ background: scenario.color, color: scenario.color }} />
            <span className="switcher-copy">
              <span className="switcher-caption">Escenario</span>
              <span className="switcher-label">{scenario.name}</span>
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6 }} />
          </button>
          <Popover open={scenarioOpen} onClose={() => setScenarioOpen(false)} width={340} align="right">
            <div className="switcher-popover-header">Escenarios de {project.name}</div>
            {project.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`switcher-item ${s.id === scenario.id ? "is-active" : ""}`}
                onClick={() => {
                  setActiveScenario(s.id);
                  setScenarioOpen(false);
                }}
              >
                <span className="switcher-dot" style={{ background: s.color, color: s.color }} />
                <span className="switcher-item-copy">
                  <strong>{s.name}</strong>
                  <small>
                    {s.isBase ? "Escenario base · " : ""}
                    {KIND_LABEL[s.kind]}
                  </small>
                </span>
                {s.id === scenario.id ? <Check size={13} style={{ color: "var(--leaf-400)" }} /> : null}
              </button>
            ))}
            <button
              type="button"
              className="switcher-item switcher-item-add"
              onClick={() => {
                setScenarioOpen(false);
                setDialog("new-scenario");
              }}
            >
              <Sparkles size={15} />
              <span className="switcher-item-copy">
                <strong>Nuevo escenario</strong>
                <small>Parte de los parámetros del escenario activo</small>
              </span>
            </button>
            <button
              type="button"
              className="switcher-item"
              style={{ marginTop: 2 }}
              onClick={() => {
                setScenarioOpen(false);
                setModule("escenarios");
              }}
            >
              <GitCompareIcon />
              <span className="switcher-item-copy">
                <strong>Comparar escenarios</strong>
                <small>Capacidad, vida útil, lixiviados, biogás y costos</small>
              </span>
            </button>
          </Popover>
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className={`status-pill ${errors > 0 ? "error" : warnings > 0 ? "warn" : ""} is-clickable`}
          onClick={() => setModule("resultados")}
          title="Abrir validación del modelo"
        >
          {errors > 0 ? <ShieldAlert size={13} /> : warnings > 0 ? <TriangleAlert size={13} /> : <ShieldCheck size={13} />}
          <span className="status-label">{errors > 0 ? "Errores" : warnings > 0 ? "Advertencias" : "Validación"}</span>
          <strong>{errors > 0 ? errors : warnings > 0 ? warnings : "OK"}</strong>
        </button>

        <span className="save-state" title={`Última escritura en almacenamiento local: ${fmtDateTime(lastSavedAt)}`}>
          <span className="dot" />
          <span>Guardado local · {fmtDateTime(lastSavedAt).split(", ")[1] ?? fmtDateTime(lastSavedAt)}</span>
        </span>

        <button type="button" className="icon-button" onClick={() => setModule("configuracion")} title="Configuración" aria-label="Configuración">
          <Settings size={15} />
        </button>
        <button type="button" className="icon-button" onClick={() => setDialog("help")} title="Ayuda y alcance" aria-label="Ayuda y alcance">
          <CircleHelp size={15} />
        </button>
      </div>
    </header>
  );
}

function GitCompareIcon() {
  return <span style={{ width: 15, height: 15, display: "grid", placeItems: "center", fontSize: 10, color: "var(--leaf-300)" }}>⇄</span>;
}
