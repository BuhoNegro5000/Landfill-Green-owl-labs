"use client";

import {
  BookOpen,
  Boxes,
  Box,
  ChevronLeft,
  ClipboardCheck,
  Droplets,
  FileText,
  Flame,
  Gauge,
  GitCompareArrows,
  Layers3,
  LayoutDashboard,
  LineChart,
  MapPin,
  Mountain,
  Recycle,
  Scale,
  Settings,
  Sprout,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS, MODULE_META, type ModuleId } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { useModel } from "@/components/ModelProvider";
import { OwlMark } from "@/components/Brand";
import { BRAND } from "@/lib/defaults";

const ICONS: Record<ModuleId, LucideIcon> = {
  inicio: LayoutDashboard,
  emplazamiento: MapPin,
  modelo: Box,
  celdas: Layers3,
  capacidad: Gauge,
  residuos: Recycle,
  lixiviados: Droplets,
  biogas: Flame,
  operacion: Truck,
  geotecnia: Mountain,
  clausura: Sprout,
  escenarios: GitCompareArrows,
  sensibilidad: LineChart,
  resultados: ClipboardCheck,
  informes: FileText,
  metodos: BookOpen,
  normativa: Scale,
  configuracion: Settings,
};

export default function Sidebar() {
  const activeModule = useStore((s) => s.activeModule);
  const setModule = useStore((s) => s.setModule);
  const navCollapsed = useStore((s) => s.navCollapsed);
  const toggleNav = useStore((s) => s.toggleNav);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const { model } = useModel();
  const errors = model.issues.filter((i) => i.severity === "error").length;
  const warnings = model.issues.filter((i) => i.severity === "warning").length;

  const badgeFor = (id: ModuleId) => {
    if (id !== "resultados") return null;
    if (errors > 0) return { text: String(errors), tone: "error" as const };
    if (warnings > 0) return { text: String(warnings), tone: "warn" as const };
    return { text: "OK", tone: "ok" as const };
  };

  return (
    <>
      <aside className="nav-rail" aria-label="Navegación del laboratorio">
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="brand-lockup">
              <OwlMark size={34} />
              <div className="brand-copy">
                <div className="wordmark">
                  <span className="wordmark-main">
                    Green <em>Owl</em>
                  </span>
                  <span className="wordmark-sub">Landfill 3D</span>
                </div>
                <span className="brand-tagline">{BRAND.engine}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="nav-collapse"
            onClick={toggleNav}
            title={navCollapsed ? "Expandir navegación" : "Contraer navegación"}
            aria-label={navCollapsed ? "Expandir navegación" : "Contraer navegación"}
            aria-expanded={!navCollapsed}
          >
            <ChevronLeft size={13} style={{ transform: navCollapsed ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
          </button>

          <nav className="nav-scroll">
            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.title}>
                <div className="nav-group-title">{group.title}</div>
                {group.items.map((id) => {
                  const meta = MODULE_META[id];
                  const Icon = ICONS[id];
                  const badge = badgeFor(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`nav-item ${activeModule === id ? "is-active" : ""}`}
                      onClick={() => {
                        setModule(id);
                        setMobileNav(false);
                      }}
                      aria-current={activeModule === id ? "page" : undefined}
                      title={navCollapsed ? meta.label : undefined}
                    >
                      <span className="nav-icon"><Icon size={15} strokeWidth={1.8} /></span>
                      <span className="nav-label">{meta.label}</span>
                      {badge ? <span className={`nav-badge ${badge.tone === "ok" ? "is-ok" : ""}`}>{badge.text}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="nav-group">
              <div className="nav-group-title">Sistema</div>
              <button
                type="button"
                className={`nav-item ${activeModule === "configuracion" ? "is-active" : ""}`}
                aria-current={activeModule === "configuracion" ? "page" : undefined}
                onClick={() => {
                  setModule("configuracion");
                  setMobileNav(false);
                }}
                title={navCollapsed ? MODULE_META.configuracion.label : undefined}
              >
                <span className="nav-icon"><Settings size={15} strokeWidth={1.8} /></span>
                <span className="nav-label">Configuración</span>
              </button>
            </div>
          </nav>

          <div className="nav-foot">
            <div className="save-state" style={{ padding: "3px 8px" }}>
              <span className="dot" />
              <span>Persistencia local · sin backend</span>
            </div>
            <div className="save-state" style={{ padding: "0 8px", color: "rgba(147,160,151,.45)" }}>
              <span>{BRAND.product} · v{BRAND.version}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
