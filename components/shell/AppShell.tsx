"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import SceneDock from "@/components/shell/SceneDock";
import { Dialogs } from "@/components/shell/Dialogs";
import { Toasts } from "@/components/shell/Toasts";
import { useStore } from "@/lib/store";
import { MODEL_MODULES, WIDE_MODULES } from "@/lib/nav";
import { Btn, Callout } from "@/components/ui";
import Inicio from "@/components/modules/Inicio";
import Emplazamiento from "@/components/modules/Emplazamiento";
import Modelo from "@/components/modules/Modelo";
import Celdas from "@/components/modules/Celdas";
import Capacidad from "@/components/modules/Capacidad";
import Residuos from "@/components/modules/Residuos";
import Lixiviados from "@/components/modules/Lixiviados";
import Biogas from "@/components/modules/Biogas";
import Operacion from "@/components/modules/Operacion";
import Geotecnia from "@/components/modules/Geotecnia";
import Clausura from "@/components/modules/Clausura";
import Escenarios from "@/components/modules/Escenarios";
import Sensibilidad from "@/components/modules/Sensibilidad";
import Resultados from "@/components/modules/Resultados";
import Informes from "@/components/modules/Informes";
import Metodos from "@/components/modules/Metodos";
import Normativa from "@/components/modules/Normativa";
import Configuracion from "@/components/modules/Configuracion";

class ModuleBoundary extends Component<{ children: ReactNode; moduleId: string }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the failure in the console for diagnostics; the interface shows a recovery panel.
    console.error("Green Owl module error", error, info.componentStack);
  }

  componentDidUpdate(prev: { moduleId: string }) {
    if (prev.moduleId !== this.props.moduleId && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="module-stack">
          <Callout tone="danger" title="El módulo encontró un error inesperado">
            {this.state.error}. Los datos guardados no se han modificado. Cambie de módulo o recargue el navegador.
          </Callout>
          <Btn variant="secondary" onClick={() => this.setState({ error: null })}>
            Reintentar
          </Btn>
        </div>
      );
    }
    return this.props.children;
  }
}

function ModuleView({ id }: { id: string }) {
  switch (id) {
    case "inicio":
      return <Inicio />;
    case "emplazamiento":
      return <Emplazamiento />;
    case "modelo":
      return <Modelo />;
    case "celdas":
      return <Celdas />;
    case "capacidad":
      return <Capacidad />;
    case "residuos":
      return <Residuos />;
    case "lixiviados":
      return <Lixiviados />;
    case "biogas":
      return <Biogas />;
    case "operacion":
      return <Operacion />;
    case "geotecnia":
      return <Geotecnia />;
    case "clausura":
      return <Clausura />;
    case "escenarios":
      return <Escenarios />;
    case "sensibilidad":
      return <Sensibilidad />;
    case "resultados":
      return <Resultados />;
    case "informes":
      return <Informes />;
    case "metodos":
      return <Metodos />;
    case "normativa":
      return <Normativa />;
    case "configuracion":
      return <Configuracion />;
    default:
      return <Inicio />;
  }
}

export default function AppShell() {
  const activeModule = useStore((s) => s.activeModule);
  const navCollapsed = useStore((s) => s.navCollapsed);
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const display = useStore((s) => s.display);

  const isModel = MODEL_MODULES.includes(activeModule);
  const isWide = WIDE_MODULES.includes(activeModule);

  return (
    <div
      className={[
        "app-root",
        navCollapsed ? "nav-collapsed" : "",
        mobileNavOpen ? "mobile-nav-open" : "",
        display.compact ? "is-compact" : "",
        display.reduceMotion ? "reduce-motion" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar />
      {mobileNavOpen ? (
        <button type="button" className="mobile-nav-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileNav(false)} />
      ) : null}
      <div className="app-main">
        <Topbar />
        <main className={`workspace ${isModel ? "is-model" : ""} ${isWide ? "is-wide" : ""}`}>
          <div className="module-panel">
            <div className="module-content">
              <ModuleBoundary moduleId={activeModule}>
                <ModuleView id={activeModule} />
              </ModuleBoundary>
            </div>
          </div>
          {isModel ? null : <SceneDock wide={isWide} />}
        </main>
      </div>
      <Dialogs />
      <Toasts />
    </div>
  );
}
