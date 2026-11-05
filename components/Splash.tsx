"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, Check, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { OwlMark, Wordmark } from "@/components/Brand";
import { BRAND } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import { runSelfTests, selfTestSummary } from "@/lib/selfTest";
import { Btn } from "@/components/ui";

type StepState = "pending" | "active" | "done" | "warn";

interface BootStep {
  id: string;
  label: string;
  detail: string;
  state: StepState;
}

const INITIAL_STEPS: BootStep[] = [
  { id: "storage", label: "Espacio de trabajo local", detail: "Comprobando persistencia del navegador…", state: "pending" },
  { id: "engine", label: "Motor de cálculo GO-ENGINE", detail: "Ejecutando verificaciones de referencia…", state: "pending" },
  { id: "webgl", label: "Contexto gráfico WebGL", detail: "Creando el visor tridimensional…", state: "pending" },
  { id: "data", label: "Proyectos y escenarios", detail: "Cargando el espacio de trabajo…", state: "pending" },
];

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export default function Splash({ hydrated, onEnter }: { hydrated: boolean; onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [steps, setSteps] = useState<BootStep[]>(INITIAL_STEPS);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [engineOk, setEngineOk] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;
  const runningRef = useRef(false);

  const updateStep = (id: string, patch: Partial<BootStep>) => {
    setSteps((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      const gl = renderer.getContext();
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      const gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "GPU no identificada";
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x03110b, 0);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x03110b, 0.034);
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
      camera.position.set(16, 11, 18);
      camera.lookAt(0, 1.5, 0);

      scene.add(new THREE.HemisphereLight(0xc4eda8, 0x04170f, 1.15));
      const sun = new THREE.DirectionalLight(0xd9efc7, 1.3);
      sun.position.set(12, 18, 6);
      scene.add(sun);

      const group = new THREE.Group();
      group.rotation.y = -0.45;
      scene.add(group);

      const terrainGeometry = new THREE.PlaneGeometry(52, 52, 44, 44);
      terrainGeometry.rotateX(-Math.PI / 2);
      const position = terrainGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const dist = Math.sqrt(x * x + z * z);
        const falloff = Math.max(0, Math.min(1, (dist - 8) / 30));
        const height =
          (Math.sin(x * 0.24) * Math.cos(z * 0.21) * 0.62 + Math.sin(x * 0.09 + z * 0.12) * 0.9) * falloff;
        position.setY(i, height + 0.15);
      }
      terrainGeometry.computeVertexNormals();
      const terrain = new THREE.LineSegments(
        new THREE.WireframeGeometry(terrainGeometry),
        new THREE.LineBasicMaterial({ color: 0x3e8f63, transparent: true, opacity: 0.2 }),
      );
      group.add(terrain);

      const dustGeometry = new THREE.BufferGeometry();
      const dust: number[] = [];
      for (let i = 0; i < 520; i++) {
        dust.push((Math.random() - 0.5) * 65, Math.random() * 18 + 0.5, (Math.random() - 0.5) * 65);
      }
      dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dust, 3));
      const dustPoints = new THREE.Points(
        dustGeometry,
        new THREE.PointsMaterial({ color: 0x79ce4c, size: 0.055, transparent: true, opacity: 0.55, sizeAttenuation: true }),
      );
      scene.add(dustPoints);

      // Stylised stepped landfill: each ring is a contour/bench of the model.
      const rings = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const radius = 7.9 - i * 0.86;
        const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.64, 0, Math.PI * 2);
        const points = curve.getPoints(72).map((p) => new THREE.Vector3(p.x, 0.4 + i * 0.72, p.y));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.LineLoop(
          geometry,
          new THREE.LineBasicMaterial({
            color: i === 6 ? 0xc4eda8 : 0x79ce4c,
            transparent: true,
            opacity: i === 6 ? 0.9 : 0.36,
          }),
        );
        rings.add(line);
      }
      group.add(rings);

      const beaconGeometry = new THREE.SphereGeometry(0.09, 8, 8);
      const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xc4eda8 });
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        beacon.position.set(Math.cos(angle) * 8, 1.1 + (i % 3) * 0.6, Math.sin(angle) * 5.1);
        group.add(beacon);
      }

      const resize = () => {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        renderer?.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed || !renderer) return;
        frame = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        group.rotation.y = -0.45 + elapsed * 0.045;
        rings.position.y = Math.sin(elapsed * 0.6) * 0.02;
        dustPoints.rotation.y = elapsed * 0.012;
        camera.position.x = 16 + Math.sin(elapsed * 0.13) * 1.6;
        camera.position.y = 11 + Math.cos(elapsed * 0.17) * 0.55;
        camera.lookAt(0, 2.4, 0);
        renderer.render(scene, camera);
      };
      animate();

      updateStep("webgl", {
        state: "done",
        detail: `${gpu.replace("ANGLE (", "").replace(")", "")} · contexto creado`,
      });
      setWebglOk(true);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resizeObserver?.disconnect();
        terrainGeometry.dispose();
        dustGeometry.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            const material = object.material;
            if (Array.isArray(material)) material.forEach((m) => m.dispose());
            else material?.dispose();
          }
        });
        renderer?.dispose();
      };
    } catch (error) {
      setWebglOk(false);
      updateStep("webgl", {
        state: "warn",
        detail: `WebGL no disponible (${(error as Error).message.slice(0, 70)}). Se usará la vista esquemática 2D.`,
      });
      return () => {
        disposed = true;
        renderer?.dispose();
      };
    }
  }, [attempt]);

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    let cancelled = false;

    const run = async () => {
      setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: "pending" })));
      setProgress(4);
      setReady(false);

      // 1. Storage probe
      updateStep("storage", { state: "active" });
      await sleep(280);
      let storageDetail = "";
      let storageOk = true;
      try {
        const key = "__green_owl_probe__";
        window.localStorage.setItem(key, "ok");
        storageOk = window.localStorage.getItem(key) === "ok";
        window.localStorage.removeItem(key);
        const bytes = new Blob([JSON.stringify(useStore.getState().projects)]).size;
        storageDetail = storageOk
          ? `Persistencia local disponible · ${(bytes / 1024).toFixed(1)} kB de proyectos`
          : "El navegador bloqueó localStorage. La sesión no se conservará.";
      } catch {
        storageOk = false;
        storageDetail = "El navegador bloqueó localStorage. La sesión no se conservará.";
      }
      updateStep("storage", { state: storageOk ? "done" : "warn", detail: storageDetail });
      if (cancelled) return;
      setProgress(26);

      // 2. Engine verification (real calculations)
      updateStep("engine", { state: "active" });
      const start = performance.now();
      await sleep(240);
      let tests = [] as ReturnType<typeof runSelfTests>;
      try {
        tests = runSelfTests();
      } catch {
        tests = [];
      }
      const summary = selfTestSummary(tests);
      const elapsed = Math.max(1, performance.now() - start);
      setEngineOk(summary.ok);
      updateStep("engine", {
        state: summary.ok ? "done" : "warn",
        detail: summary.ok
          ? `${summary.passed}/${summary.total} pruebas de referencia aprobadas · ${elapsed.toFixed(0)} ms`
          : `${summary.failed} de ${summary.total} verificaciones requieren revisión`,
      });
      if (cancelled) return;
      setProgress(56);

      // 3. Hydration of persisted workspace
      updateStep("data", { state: "active" });
      const waitStart = Date.now();
      while (!hydratedRef.current && Date.now() - waitStart < 4000) {
        await sleep(120);
        if (cancelled) return;
      }
      const state = useStore.getState();
      const scenarios = state.projects.reduce((sum, p) => sum + p.scenarios.length, 0);
      updateStep("data", {
        state: "done",
        detail: `${state.projects.length} proyecto(s) · ${scenarios} escenario(s) · persistencia local`,
      });
      setProgress(82);

      await sleep(260);
      if (cancelled) return;
      setProgress(100);
      setSteps((current) => current.map((s) => (s.state === "pending" || s.state === "active" ? { ...s, state: "done" } : s)));
      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") onEnter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, onEnter]);

  const retry = () => {
    runningRef.current = false;
    setAttempt((v) => v + 1);
  };

  return (
    <div className="splash">
      <canvas ref={canvasRef} className="splash-canvas" aria-hidden="true" />

      <div className="splash-content">
        <div className="splash-brand-block">
          <div className="splash-lockup">
            <OwlMark size={62} glow />
            <div>
              <Wordmark />
              <span style={{ display: "block", fontSize: 8.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8fa192", marginTop: 5 }}>
                Environmental engineering laboratory
              </span>
            </div>
          </div>
          <h1 className="splash-title">
            Diseño que se puede
            <br />
            <span>verificar.</span>
          </h1>
          <p className="splash-sub">
            Laboratorio local para dimensionar, simular y documentar rellenos sanitarios. Cada resultado conserva su
            fórmula, sus supuestos y la página exacta de la fuente técnica.
          </p>
          <div className="splash-badges">
            <span><i /> {BRAND.engine}</span>
            <span><i /> Cálculo 100 % local</span>
            <span><i /> Sin servidor</span>
            <span><i /> Trazabilidad por página</span>
          </div>
          <div className="splash-ready-note">
            Los proyectos de demostración son sintéticos. No representan instalaciones reales ni sustituyen estudios de campo.
          </div>
        </div>

        <div className="splash-console">
          <div className="console-head">
            <span className="console-title">Verificación de arranque</span>
            <span className="console-version">v{BRAND.version} · GO-ENGINE {BRAND.engine.split(" ")[1]}</span>
          </div>

          <div className="splash-progress">
            <div className="splash-progress-head">
              <span>{ready ? "Sistema listo" : "Inicializando componentes"}</span>
              <span>{progress} %</span>
            </div>
            <div className="splash-progress-track">
              <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="splash-steps">
            {steps.map((step) => (
              <div key={step.id} className={`splash-step is-${step.state}`}>
                <span className="step-icon">
                  {step.state === "done" ? (
                    <Check size={10} strokeWidth={3} />
                  ) : step.state === "active" ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : step.state === "warn" ? (
                    <TriangleAlert size={9} />
                  ) : (
                    "·"
                  )}
                </span>
                <div className="step-copy">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {!webglOk || !engineOk ? (
            <div className="splash-ready-note" style={{ color: webglOk ? "#e8c07a" : "#e8c07a" }}>
              {!webglOk
                ? "El visor 3D se sustituirá por una vista esquemática. El resto del laboratorio funciona con normalidad."
                : "Una verificación del motor no alcanzó la tolerancia esperada. Revise el módulo Métodos antes de usar resultados."}
            </div>
          ) : null}

          <div className="splash-enter-row">
            {!ready ? (
              <Btn variant="secondary" className="splash-enter" icon={<ShieldCheck size={14} />} disabled>
                Verificando integridad…
              </Btn>
            ) : (
              <Btn variant="primary" className="splash-enter" iconRight={<ArrowRight size={14} />} onClick={onEnter}>
                Entrar al laboratorio
              </Btn>
            )}
            {ready && (!webglOk || !engineOk) ? (
              <Btn variant="ghost" size="md" icon={<RefreshCw size={14} />} onClick={retry} aria-label="Reintentar verificación" />
            ) : null}
          </div>
          {ready ? <div className="splash-ready-note">Pulse Enter para entrar. Los datos se guardan en este navegador.</div> : null}
        </div>
      </div>

      <footer className="splash-footer">
        <span>© 2026 Green Owl Labs · {BRAND.product}</span>
        <span>Persistencia local · Sin telemetría · Sin backend</span>
      </footer>
    </div>
  );
}
