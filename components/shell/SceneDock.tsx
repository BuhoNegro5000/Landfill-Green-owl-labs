"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight, Box, Camera, Maximize2 } from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { useStore } from "@/lib/store";
import { fmt, fmtPct } from "@/lib/format";
import { Btn } from "@/components/ui";
import { captureScene } from "@/lib/sceneBridge";

const LandfillScene = dynamic(() => import("@/components/scene/LandfillScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Cargando visor…</div>,
});

export default function SceneDock({ wide = false }: { wide?: boolean }) {
  const { model, scenario } = useModel();
  const setModule = useStore((s) => s.setModule);
  const setDialog = useStore((s) => s.setDialog);
  const pushToast = useStore((s) => s.pushToast);
  const selectedCellId = useStore((s) => s.selectedCellId);

  const selected = model.capacity.cells.find((c) => c.cellId === selectedCellId) ?? null;

  const onCapture = () => {
    const data = captureScene({ width: 1600, height: 900 });
    if (!data) {
      pushToast({
        kind: "warn",
        title: "Captura no disponible",
        detail: "El navegador no expuso el lienzo WebGL. Abra el módulo Modelo 3D para usar su captura.",
      });
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = `green-owl-vista-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    pushToast({ kind: "ok", title: "Vista exportada", detail: "PNG generado desde el visor 3D." });
  };

  return (
    <aside className={`scene-dock ${wide ? "is-wide" : ""}`} aria-label="Vista tridimensional del modelo">
      <div className="scene-dock-head">
        <span className="scene-dock-title">
          <span className="live-dot" /> Modelo en vivo
        </span>
        <div className="scene-dock-actions">
          <button type="button" className="icon-button" onClick={onCapture} title="Capturar PNG" aria-label="Capturar PNG">
            <Camera size={13} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setModule("modelo")}
            title="Abrir modelo 3D"
            aria-label="Abrir modelo 3D"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="scene-frame">
        <LandfillScene compact showToolbar={false} />
      </div>

      <div className="scene-dock-kpis">
        <div className="scene-mini-kpi">
          <span>Capacidad</span>
          <strong>{fmt(model.capacity.totalTonnageT)} <small>t</small></strong>
        </div>
        <div className="scene-mini-kpi">
          <span>Vida útil</span>
          <strong>{fmt(model.waste.operatingYears, 1)} <small>años</small></strong>
        </div>
        <div className="scene-mini-kpi">
          <span>Llenado</span>
          <strong>{fmtPct(model.waste.usedPct, 0)}</strong>
        </div>
        <div className="scene-mini-kpi">
          <span>Lixiviado</span>
          <strong>{fmt(model.leachate.totalLeachateM3)} <small>m³</small></strong>
        </div>
      </div>

      <div className="scene-dock-foot">
        <span className="scene-dock-context">
          <Box size={11} /> {scenario.name}
          {selected ? ` · ${selected.name}` : ""}
        </span>
        <button type="button" className="scene-dock-link" onClick={() => setModule("modelo")}>
          Abrir 3D <ArrowUpRight size={11} />
        </button>
      </div>

      {selected ? (
        <Btn
          size="sm"
          variant="secondary"
          className="scene-dock-cta"
          onClick={() => setModule("celdas")}
          icon={<ArrowUpRight size={12} />}
        >
          Editar {selected.name}
        </Btn>
      ) : (
        <Btn size="sm" variant="ghost" className="scene-dock-cta" onClick={() => setDialog("help")}>
          Alcance del visor
        </Btn>
      )}
    </aside>
  );
}
