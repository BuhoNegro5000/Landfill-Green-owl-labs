"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  CalendarClock,
  Camera,
  ChevronsLeft,
  ChevronsRight,
  Crosshair,
  Eye,
  EyeOff,
  Layers3,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Settings2,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useModel } from "@/components/ModelProvider";
import { useStore, type SceneView } from "@/lib/store";
import { Badge, Btn, Callout, ProgressBar, RangeField, Segmented } from "@/components/ui";
import { fmt, fmtDateTime, fmtPct } from "@/lib/format";
import { captureScene } from "@/lib/sceneBridge";
import { ToggleLine } from "./shared";

const LandfillScene = dynamic(() => import("@/components/scene/LandfillScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Inicializando visor tridimensional…</div>,
});

const VIEW_OPTIONS: { value: SceneView; label: string }[] = [
  { value: "iso", label: "Iso" },
  { value: "top", label: "Planta" },
  { value: "front", label: "Frente" },
  { value: "side", label: "Lateral" },
  { value: "section", label: "Corte" },
];

export default function Modelo() {
  const { model, project, scenario, error } = useModel();
  const scene = useStore((s) => s.scene);
  const setScene = useStore((s) => s.setScene);
  const setView = useStore((s) => s.setView);
  const resetScene = useStore((s) => s.resetScene);
  const selectedCellId = useStore((s) => s.selectedCellId);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const operationYearIndex = useStore((s) => s.operationYearIndex);
  const setOperationYear = useStore((s) => s.setOperationYear);
  const setModule = useStore((s) => s.setModule);
  const pushToast = useStore((s) => s.pushToast);
  const [playing, setPlaying] = useState(false);

  const operation = model.operation;
  const lastIndex = Math.max(0, operation.length - 1);
  const selectedIndex = operationYearIndex === null ? lastIndex : Math.max(0, Math.min(lastIndex, operationYearIndex));
  const yearRow = operation[selectedIndex];
  const selectedCell = model.capacity.cells.find((c) => c.cellId === selectedCellId) ?? null;
  const selectedGeometry = model.geometry.cells.find((c) => c.id === selectedCellId) ?? null;

  useEffect(() => {
    if (!playing || operation.length <= 1) return;
    const timer = window.setInterval(() => {
      const current = useStore.getState().operationYearIndex;
      const index = current === null ? lastIndex : current;
      if (index >= lastIndex) {
        setPlaying(false);
        return;
      }
      setOperationYear(index + 1);
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, lastIndex, operation.length, setOperationYear]);

  const cells = useMemo(
    () =>
      [...model.geometry.cells].sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((cell) => {
        const cap = model.capacity.cells.find((c) => c.cellId === cell.id);
        return { cell, fill: cap?.fillFraction ?? 0, elevation: cap?.topElevationM ?? cell.baseElevationM };
      }),
    [model.geometry.cells, model.capacity.cells],
  );

  const onCapture = () => {
    const data = captureScene({ width: 1600, height: 900 });
    if (!data) {
      pushToast({ kind: "warn", title: "Captura no disponible", detail: "El navegador no expuso el lienzo WebGL. Use el botón de captura del visor." });
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = `green-owl-modelo-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    pushToast({ kind: "ok", title: "Captura exportada", detail: "PNG generado desde el visor 3D." });
  };

  return (
    <div className="model-workspace">
      <div className="model-scene-fill">
        <LandfillScene />
      </div>

      <div className="model-overlay-left">
        <div className="glass-panel">
          <div className="glass-head">
            <span className="glass-title">Modelo activo</span>
            <Badge tone="leaf">{model.engineVersion}</Badge>
          </div>
          <div className="glass-body overlay-scroll">
            <div className="overlay-project">
              <strong>{project.name}</strong>
              <span>{scenario.name} · {project.region}, {project.country}</span>
            </div>
            <div className="model-metrics">
              <div className="model-metric"><span>Volumen bruto</span><strong>{fmt(model.geometry.grossVolumeM3)} <small>m³</small></strong></div>
              <div className="model-metric"><span>Capacidad</span><strong>{fmt(model.capacity.totalTonnageT)} <small>t</small></strong></div>
              <div className="model-metric"><span>Vida útil</span><strong>{fmt(model.waste.operatingYears, 1)} <small>años</small></strong></div>
              <div className="model-metric"><span>Llenado</span><strong>{fmtPct(model.waste.usedPct, 0)}</strong></div>
            </div>
            <div className="overlay-divider" />
            <div className="cell-tree">
              {cells.map(({ cell, fill, elevation }) => (
                <button
                  key={cell.id}
                  type="button"
                  className={`cell-tree-item ${selectedCellId === cell.id ? "is-active" : ""}`}
                  onClick={() => setSelectedCell(selectedCellId === cell.id ? null : cell.id)}
                >
                  <span className="cell-swatch" style={{ background: fill >= 0.999 ? "#79CE4C" : fill > 0 ? "#C89B3C" : "#5A665F" }} />
                  <span className="cell-tree-copy">
                    <strong>{cell.name}</strong>
                    <span>{fill > 0 ? `${fmtPct(fill * 100, 0)} lleno · ${fmt(elevation, 1)} m s. n. m.` : "Sin residuos asignados"}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedCell ? (
          <div className="glass-panel">
            <div className="glass-head">
              <span className="glass-title">Celda seleccionada</span>
              <button type="button" className="icon-button" onClick={() => setSelectedCell(null)} aria-label="Deseleccionar celda">
                <EyeOff size={13} />
              </button>
            </div>
            <div className="glass-body">
              <div className="model-selected-head">
                <h3>{selectedCell.name}</h3>
                <span>Secuencia {selectedCell.sequenceOrder}</span>
              </div>
              <div className="model-selected-metrics">
                <div><span>Bruto</span><strong>{fmt(selectedCell.grossVolumeM3)} m³</strong></div>
                <div><span>Residuos</span><strong>{fmt(selectedCell.wasteVolumeM3)} m³</strong></div>
                <div><span>Tonelaje</span><strong>{fmt(selectedCell.tonnageT)} t</strong></div>
                <div><span>Cota superior</span><strong>{fmt(selectedCell.topElevationM, 1)} m</strong></div>
              </div>
              <ProgressBar value={selectedCell.fillFraction * 100} max={100} showValue label="Avance de llenado" tone={selectedCell.fillFraction >= 1 ? "leaf" : "amber"} />
              <div className="overlay-actions">
                <Btn
                  size="sm"
                  variant="secondary"
                  icon={<Layers3 size={12} />}
                  onClick={() => {
                    setModule("celdas");
                  }}
                >
                  Editar geometría
                </Btn>
                <Btn size="sm" variant="ghost" icon={<Crosshair size={12} />} onClick={() => setSelectedCell(selectedCell.cellId)}>
                  Centrar
                </Btn>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <Callout tone="danger" title="Cálculo de respaldo">{error}</Callout> : null}
      </div>

      <div className="model-overlay-right">
        <div className="glass-panel">
          <div className="glass-head">
            <span className="glass-title">Cámara</span>
            <button type="button" className="icon-button" onClick={resetScene} title="Restablecer vista" aria-label="Restablecer vista">
              <RotateCcw size={13} />
            </button>
          </div>
          <div className="glass-body">
            <Segmented
              size="sm"
              value={scene.view}
              onChange={(value) => setView(value)}
              options={VIEW_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              ariaLabel="Vista de cámara"
            />
            <div className="overlay-actions">
              <Btn size="sm" variant={scene.autoRotate ? "primary" : "secondary"} icon={<Sparkles size={12} />} onClick={() => setScene({ autoRotate: !scene.autoRotate })}>
                {scene.autoRotate ? "Rotando" : "Rotar"}
              </Btn>
              <Btn size="sm" variant={scene.clipEnabled ? "primary" : "secondary"} icon={<Scissors size={12} />} onClick={() => setScene({ clipEnabled: !scene.clipEnabled })}>
                Corte
              </Btn>
              <Btn size="sm" variant="secondary" icon={<Camera size={12} />} onClick={onCapture}>
                PNG
              </Btn>
            </div>
            {scene.clipEnabled ? (
              <RangeField label="Posición del plano de corte" value={scene.clipPosition} min={0} max={1} step={0.01} digits={2} onChange={(value) => setScene({ clipPosition: value })} />
            ) : null}
          </div>
        </div>

        <div className="glass-panel">
          <div className="glass-head">
            <span className="glass-title">Capas y lectura</span>
            <Settings2 size={13} style={{ color: "var(--muted)" }} />
          </div>
          <div className="glass-body overlay-toggles">
            <ToggleLine label="Terreno" checked={scene.showTerrain} onChange={(v) => setScene({ showTerrain: v })} />
            <ToggleLine label="Residuos" checked={scene.showWaste} onChange={(v) => setScene({ showWaste: v })} />
            <ToggleLine label="Liner" checked={scene.showLiner} onChange={(v) => setScene({ showLiner: v })} />
            <ToggleLine label="Drenaje de lixiviados" checked={scene.showPipes} onChange={(v) => setScene({ showPipes: v })} />
            <ToggleLine label="Pozas y tratamiento" checked={scene.showPonds} onChange={(v) => setScene({ showPonds: v })} />
            <ToggleLine label="Drenaje pluvial" checked={scene.showDrainage} onChange={(v) => setScene({ showDrainage: v })} />
            <ToggleLine label="Pozos de biogás" checked={scene.showWells} onChange={(v) => setScene({ showWells: v })} />
            <ToggleLine label="Red de biogás" checked={scene.showGasNetwork} onChange={(v) => setScene({ showGasNetwork: v })} />
            <ToggleLine label="Antorcha" checked={scene.showFlare} onChange={(v) => setScene({ showFlare: v })} />
            <ToggleLine label="Vías y accesos" checked={scene.showRoads} onChange={(v) => setScene({ showRoads: v })} />
            <ToggleLine label="Edificios" checked={scene.showBuildings} onChange={(v) => setScene({ showBuildings: v })} />
            <ToggleLine label="Monitoreo" checked={scene.showMonitoring} onChange={(v) => setScene({ showMonitoring: v })} />
            <ToggleLine label="Cerco perimetral" checked={scene.showFence} onChange={(v) => setScene({ showFence: v })} />
            <ToggleLine label="Barrera vegetal" checked={scene.showVegetation} onChange={(v) => setScene({ showVegetation: v })} />
            <ToggleLine label="Etiquetas" checked={scene.showLabels} onChange={(v) => setScene({ showLabels: v })} />
            <ToggleLine label="Curvas" checked={scene.showContours} onChange={(v) => setScene({ showContours: v })} />
            <ToggleLine label="Cuadrícula" checked={scene.showGrid} onChange={(v) => setScene({ showGrid: v })} />
            <ToggleLine label="Sombras" checked={scene.shadows} onChange={(v) => setScene({ shadows: v })} />
            <ToggleLine label="Flujo animado" checked={scene.animFlow} onChange={(v) => setScene({ animFlow: v })} />
            <ToggleLine label="Gas animado" checked={scene.animGas} onChange={(v) => setScene({ animGas: v })} />
          </div>
        </div>

        <div className="glass-panel">
          <div className="glass-head"><span className="glass-title">Exageración de capas</span></div>
          <div className="glass-body">
            <RangeField
              label="Factor visual"
              value={scene.layerExaggeration}
              min={1}
              max={20}
              step={0.5}
              digits={1}
              onChange={(value) => setScene({ layerExaggeration: value })}
              hint="Solo afecta la vista 3D. Los espesores de cálculo permanecen reales."
            />
          </div>
        </div>
      </div>

      <div className="model-overlay-bottom">
        <div className="glass-panel">
          <div className="glass-head">
            <span className="glass-title">
              <CalendarClock size={13} /> Avance de operación
            </span>
            <div className="overlay-actions">
              <button type="button" className="icon-button" onClick={() => setOperationYear(0)} title="Primer año" aria-label="Primer año">
                <ChevronsLeft size={14} />
              </button>
              <button type="button" className="icon-button" onClick={() => setPlaying((v) => !v)} title={playing ? "Pausar" : "Reproducir"} aria-label={playing ? "Pausar" : "Reproducir"}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button type="button" className="icon-button" onClick={() => setOperationYear(lastIndex)} title="Último año" aria-label="Último año">
                <ChevronsRight size={14} />
              </button>
              <button type="button" className="icon-button" onClick={() => { setOperationYear(null); setPlaying(false); }} title="Estado final" aria-label="Estado final">
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
          <div className="glass-body">
            <div className="scene-timebar">
              <label htmlFor="model-year">
                <strong>{yearRow ? yearRow.year : "—"}</strong>
                <span>{yearRow?.closurePhase ?? "Sin operación"}</span>
              </label>
              <input
                id="model-year"
                type="range"
                min={0}
                max={lastIndex}
                step={1}
                value={selectedIndex}
                onChange={(event) => {
                  setPlaying(false);
                  setOperationYear(Number(event.target.value));
                }}
              />
              <div className="timebar-meta">
                <span>{yearRow ? `${fmt(yearRow.wasteT)} t dispuestas` : "—"}</span>
                <span>{yearRow ? `${fmtPct(yearRow.fillPct, 0)} de capacidad` : ""}</span>
                <span>{operationYearIndex === null ? "Estado final" : "Año seleccionado"}</span>
              </div>
            </div>
            {yearRow ? (
              <div className="timebar-cells">
                {yearRow.cellStates.map((cell) => (
                  <span key={cell.cellId} className={`timebar-cell ${cell.fillPct > 0 ? "is-active" : ""}`}>
                    {cell.name} · {fmtPct(cell.fillPct, 0)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="model-corner-actions">
        <Btn size="sm" variant="secondary" icon={<ArrowLeft size={13} />} onClick={() => setModule("inicio")}>
          Proyectos
        </Btn>
        <span className="model-corner-note">
          <Eye size={12} /> Vista esquemática · capas exageradas
        </span>
      </div>

      <div className="model-corner-status">
        <Box size={12} /> {project.name} · {fmtDateTime(project.updatedAt)}
      </div>
    </div>
  );
}
