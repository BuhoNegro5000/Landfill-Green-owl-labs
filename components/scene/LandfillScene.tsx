"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Box,
  Compass,
  Crosshair,
  Eye,
  Grid3X3,
  Maximize2,
  Move3D,
  RotateCcw,
  ScanLine,
  Scissors,
  Tag,
} from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { useStore, type SceneView } from "@/lib/store";
import { CELL_METHOD_SPECS } from "@/lib/engine/cellMethods";
import { cellDimensionAt, heightForVolume, type CellGeometry } from "@/lib/engine/geometry";
import type { Layer } from "@/lib/types";
import { layoutCells, CELL_COLORS, hexToNumber } from "@/lib/sceneLayout";
import { buildSiteInfrastructure, siteHalfFor } from "./siteInfrastructure";
import { registerSceneCapture, clearSceneCapture } from "@/lib/sceneBridge";
import { fmt, fmtPct } from "@/lib/format";

interface BuiltCell {
  id: string;
  name: string;
  fillPct: number;
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
}

const VIEW_OPTIONS: { value: SceneView; label: string }[] = [
  { value: "iso", label: "Iso" },
  { value: "top", label: "Planta" },
  { value: "front", label: "Frente" },
  { value: "side", label: "Lateral" },
  { value: "section", label: "Corte" },
];

function frustumGeometry(bottomL: number, bottomW: number, topL: number, topW: number, height: number): THREE.BufferGeometry {
  const bl = Math.max(bottomL, 0.01) / 2;
  const bw = Math.max(bottomW, 0.01) / 2;
  const tl = Math.max(topL, 0.01) / 2;
  const tw = Math.max(topW, 0.01) / 2;
  const h = Math.max(height, 0.001);
  const positions = new Float32Array([
    -bl, 0, -bw, bl, 0, -bw, bl, 0, bw, -bl, 0, bw,
    -tl, h, -tw, tl, h, -tw, tl, h, tw, -tl, h, tw,
  ]);
  const indices = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function benchRingGeometry(innerL: number, innerW: number, outerL: number, outerW: number): THREE.BufferGeometry {
  const il = Math.max(innerL, 0.01) / 2;
  const iw = Math.max(innerW, 0.01) / 2;
  const ol = Math.max(outerL, 0.01) / 2;
  const ow = Math.max(outerW, 0.01) / 2;
  const positions = new Float32Array([
    -il, 0, -iw, il, 0, -iw, il, 0, iw, -il, 0, iw,
    -ol, 0, -ow, ol, 0, -ow, ol, 0, ow, -ol, 0, ow,
  ]);
  const indices = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function rectangle(width: number, depth: number, y = 0): THREE.BufferGeometry {
  const w = width / 2;
  const d = depth / 2;
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  void w;
  void d;
  return geometry;
}

function labelSprite(text: string, sub: string, accent = "#c4eda8", width = 30): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(6, 26, 18, 0.92)";
    ctx.strokeStyle = "rgba(196, 237, 168, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const r = 20;
    ctx.roundRect(3, 3, canvas.width - 6, canvas.height - 6, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(20, 26, 7, 62);
    ctx.font = "650 46px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#f6faf3";
    ctx.fillText(text.slice(0, 30), 44, 62);
    ctx.font = "500 31px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#b8c2b9";
    ctx.fillText(sub.slice(0, 42), 44, 112);
    ctx.font = "600 22px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(196, 237, 168, 0.85)";
    ctx.fillText("GREEN OWL · GO-ENGINE", 44, 158);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, width * 0.3125, 1);
  return { sprite, texture };
}

const LINER_COLORS: Record<Layer["category"], string> = {
  subgrade: "#7c887f",
  clay: CELL_COLORS.linerClay,
  geomembrane: CELL_COLORS.linerMembrane,
  geotextile: "#88958c",
  drainage: CELL_COLORS.linerDrainage,
  protection: "#a7b0a8",
  waste: CELL_COLORS.wastePartial,
  "daily-cover": "#8d7b5a",
  "intermediate-cover": "#9a8a68",
  "final-cover": "#6f8065",
  vegetation: "#3e9b2e",
};

function buildPlanFallback(
  cells: CellGeometry[],
  fills: Map<string, number>,
): { viewBox: string; items: { id: string; name: string; x: number; y: number; w: number; h: number; fill: number }[] } {
  const layout = layoutCells(cells);
  const pad = 30;
  const width = layout.maxX - layout.minX + pad * 2;
  const height = layout.maxZ - layout.minZ + pad * 2;
  const items = cells.map((cell) => {
    const place = layout.placements.get(cell.id);
    const w = Math.max(cell.bottomLengthM, cell.topLengthM);
    const h = Math.max(cell.bottomWidthM, cell.topWidthM);
    return {
      id: cell.id,
      name: cell.name,
      x: (place?.x ?? 0) - layout.minX + pad - w / 2,
      y: (place?.z ?? 0) - layout.minZ + pad - h / 2,
      w,
      h,
      fill: fills.get(cell.id) ?? 0,
    };
  });
  return { viewBox: `0 0 ${width} ${height}`, items };
}

export default function LandfillScene({
  compact = false,
  showToolbar = true,
  className,
}: {
  compact?: boolean;
  showToolbar?: boolean;
  className?: string;
}) {
  const { model } = useModel();
  const scene = useStore((s) => s.scene);
  const setScene = useStore((s) => s.setScene);
  const setView = useStore((s) => s.setView);
  const resetScene = useStore((s) => s.resetScene);
  const selectedCellId = useStore((s) => s.selectedCellId);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const operationYearIndex = useStore((s) => s.operationYearIndex);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [measure, setMeasure] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; detail: string } | null>(null);
  const captureRef = useRef<((options?: { width?: number; height?: number }) => string | null) | null>(null);
  const builtRef = useRef<BuiltCell[]>([]);

  const annualIndex = useMemo(() => {
    const annual = model.waste.cellAllocation.annual;
    if (!annual.length) return -1;
    if (operationYearIndex === null) return annual.length - 1;
    return Math.max(0, Math.min(annual.length - 1, operationYearIndex));
  }, [model.waste.cellAllocation.annual, operationYearIndex]);

  const fillVolumes = useMemo(() => {
    const map = new Map<string, number>();
    const alloc = model.waste.cellAllocation.annual[annualIndex];
    for (const cell of model.geometry.cells) {
      const volume = alloc?.cellVolumes[cell.id];
      if (volume !== undefined) map.set(cell.id, volume);
      else map.set(cell.id, model.waste.cellAllocation.cellSummary.find((c) => c.cellId === cell.id)?.filledVolumeM3 ?? 0);
    }
    return map;
  }, [annualIndex, model.geometry.cells, model.waste.cellAllocation]);

  const fillFractions = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of model.capacity.cells) {
      const volume = fillVolumes.get(cell.cellId) ?? 0;
      map.set(cell.cellId, cell.wasteVolumeM3 > 0 ? Math.min(1, volume / cell.wasteVolumeM3) : 0);
    }
    return map;
  }, [fillVolumes, model.capacity.cells]);

  const displayExtent = useMemo(() => {
    if (!model.geometry.cells.length) return 40;
    const layout = layoutCells(model.geometry.cells);
    return Math.max(layout.maxX - layout.minX, layout.maxZ - layout.minZ, 40);
  }, [model.geometry.cells]);

  const yearLabel = model.waste.annual[annualIndex]?.year ?? model.waste.annual[0]?.year ?? "—";
  const phaseLabel =
    model.waste.annual[annualIndex]?.capacityExhausted
      ? "Capacidad agotada"
      : annualIndex >= 0
        ? "Operación"
        : "Sin datos";

  useEffect(() => {
    registerSceneCapture((options) => captureRef.current?.(options) ?? null);
    return () => clearSceneCapture();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      setError((err as Error).message || "WebGL no disponible");
      return;
    }

    setError(null);
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = scene.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;

    const sceneRoot = new THREE.Scene();
    sceneRoot.background = new THREE.Color(0x0a1a14);
    sceneRoot.fog = new THREE.FogExp2(0x0e2119, 0.00045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 8000);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 18;
    controls.maxDistance = 2400;
    controls.autoRotate = scene.autoRotate;
    controls.autoRotateSpeed = 0.55;
    controls.screenSpacePanning = false;

    const hemi = new THREE.HemisphereLight(0xe4f2d4, 0x1a2b20, 1.55);
    sceneRoot.add(hemi);
    const sun = new THREE.DirectionalLight(0xf7f5e4, 2.7);
    sun.position.set(260, 420, 190);
    sun.castShadow = scene.shadows;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 2200;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.6;
    sceneRoot.add(sun);
    const fill = new THREE.DirectionalLight(0xa9c9b2, 0.75);
    fill.position.set(-260, 160, -220);
    sceneRoot.add(fill);

    const cells = model.geometry.cells;
    const layout = layoutCells(cells);
    const spanX = Math.max(layout.maxX - layout.minX, 80);
    const spanZ = Math.max(layout.maxZ - layout.minZ, 80);
    const extent = Math.max(spanX, spanZ);
    const groundElevation = model.params.geometry.terrainBaseElevationM;
    const topElevation = Math.max(
      groundElevation + 8,
      ...cells.map((c) => c.topElevationM),
      ...cells.map((c) => c.baseElevationM + 4),
    );
    const modelHeight = Math.max(topElevation - Math.min(groundElevation, ...cells.map((c) => c.baseElevationM)), 6);
    const centerY = (modelHeight * 0.42);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100000);
    const clipEnabled = scene.clipEnabled;
    const clipZMin = layout.minZ - 30;
    const clipZMax = layout.maxZ + 30;
    clipPlane.constant = clipZMin + (clipZMax - clipZMin) * Math.min(1, Math.max(0, scene.clipPosition));
    const clippingPlanes = clipEnabled ? [clipPlane] : [];

    const root = new THREE.Group();
    sceneRoot.add(root);

    const cellGroupById = new Map<string, THREE.Group>();
    const pickMeshes: THREE.Object3D[] = [];
    const flowMaterials: THREE.MeshBasicMaterial[] = [];
    const flareObjects: THREE.Object3D[] = [];
    const decorativeLabelTextures: THREE.CanvasTexture[] = [];
    const disposables: { dispose: () => void }[] = [];

    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    // ---------------------------------------------------------------------
    // Terrain with openings for excavated cells.
    // ---------------------------------------------------------------------
    const terrainShape = new THREE.Shape();
    const siteHalf = siteHalfFor(model.params.site.areaHa, spanX, spanZ);
    // Fit the shadow frustum to the site so large landscapes do not show
    // clipped or smeared shadow regions.
    const shadowExtent = Math.ceil(siteHalf + 90);
    sun.shadow.camera.left = -shadowExtent;
    sun.shadow.camera.right = shadowExtent;
    sun.shadow.camera.top = shadowExtent;
    sun.shadow.camera.bottom = -shadowExtent;
    sun.shadow.camera.updateProjectionMatrix();
    // Labels are rendered in world units; scale them with the site so they stay
    // legible without covering the whole model.
    const labelScale = Math.min(3.6, Math.max(1.4, siteHalf / 85));
    const margin = Math.max(extent * 0.55, 70, siteHalf + 45 - extent / 2);
    const minX = layout.minX - margin;
    const maxX = layout.maxX + margin;
    const minZ = layout.minZ - margin;
    const maxZ = layout.maxZ + margin;
    terrainShape.moveTo(minX, -maxZ);
    terrainShape.lineTo(maxX, -maxZ);
    terrainShape.lineTo(maxX, -minZ);
    terrainShape.lineTo(minX, -minZ);
    terrainShape.closePath();

    const fills = fillVolumes;
    for (const cell of cells) {
      const place = layout.placements.get(cell.id);
      if (!place || cell.cutDepthM <= 0.05) continue;
      const relativeGround = groundElevation - cell.baseElevationM;
      if (relativeGround <= 0 || relativeGround > cell.cutDepthM + 0.05) continue;
      const zGround = Math.min(relativeGround, cell.heightM);
      const holeL = Math.max(1, cellDimensionAt(cell, zGround, "length")) + 1.2;
      const holeW = Math.max(1, cellDimensionAt(cell, zGround, "width")) + 1.2;
      const hole = new THREE.Path();
      const hx = holeL / 2;
      const hz = holeW / 2;
      hole.moveTo(place.x - hx, -(place.z - hz));
      hole.lineTo(place.x + hx, -(place.z - hz));
      hole.lineTo(place.x + hx, -(place.z + hz));
      hole.lineTo(place.x - hx, -(place.z + hz));
      hole.closePath();
      terrainShape.holes.push(hole);
    }

    const terrainGeometry = track(new THREE.ShapeGeometry(terrainShape, 12));
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainMaterial = track(
      new THREE.MeshStandardMaterial({
        color: 0x6f6a4c,
        roughness: 0.96,
        metalness: 0.02,
        side: THREE.DoubleSide,
        clippingPlanes,
        clipShadows: clipEnabled,
      }),
    );
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.receiveShadow = true;
    terrain.position.y = 0;
    terrain.visible = scene.showTerrain;
    root.add(terrain);

    // Site boundary (approximate square derived from the declared area).
    const siteSide = Math.sqrt(Math.max(model.params.site.areaHa * 10_000, 100));
    const boundaryHalf = Math.max(siteSide / 2, siteHalf) * 1.015;
    const boundaryPoints = [
      new THREE.Vector3(-boundaryHalf, 0.25, -boundaryHalf),
      new THREE.Vector3(boundaryHalf, 0.25, -boundaryHalf),
      new THREE.Vector3(boundaryHalf, 0.25, boundaryHalf),
      new THREE.Vector3(-boundaryHalf, 0.25, boundaryHalf),
      new THREE.Vector3(-boundaryHalf, 0.25, -boundaryHalf),
    ];
    const boundaryGeometry = track(new THREE.BufferGeometry().setFromPoints(boundaryPoints));
    const boundaryMaterial = track(
      new THREE.LineDashedMaterial({
        color: 0x79ce4c,
        transparent: true,
        opacity: 0.42,
        dashSize: 7,
        gapSize: 5,
      }),
    );
    const boundary = new THREE.Line(boundaryGeometry, boundaryMaterial);
    boundary.computeLineDistances();
    root.add(boundary);

    if (scene.showGrid) {
      const grid = new THREE.GridHelper(Math.max(extent * 1.7, siteHalf * 2.2, 220), 22, 0x2d5a3f, 0x183326);
      grid.position.y = 0.03;
      const gridMaterial = grid.material;
      if (Array.isArray(gridMaterial)) {
        gridMaterial.forEach((m) => {
          m.transparent = true;
          m.opacity = 0.55;
        });
      } else {
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.55;
      }
      root.add(grid);
    }

    // ---------------------------------------------------------------------
    // Cells
    // ---------------------------------------------------------------------
    const labelsGroup = new THREE.Group();
    labelsGroup.visible = scene.showLabels;
    root.add(labelsGroup);

    for (const cell of cells) {
      const place = layout.placements.get(cell.id);
      if (!place) continue;
      const cfg = model.params.geometry.cells.find((c) => c.id === cell.id);
      if (!cfg) continue;

      const group = new THREE.Group();
      group.position.set(place.x, cell.baseElevationM - groundElevation, place.z);
      group.userData.cellId = cell.id;
      root.add(group);
      cellGroupById.set(cell.id, group);

      const fillVolume = fills.get(cell.id) ?? 0;
      const fillPct = fillFractions.get(cell.id) ?? 0;
      const fillHeight = Math.max(0, Math.min(cell.heightM, heightForVolume(cfg, fillVolume)));
      const selected = selectedCellId === cell.id;
      const layers = model.params.geometry.layers.filter((l) => l.enabled);
      const linerThickness = layers.reduce((s, l) => s + Math.max(0.02, (l.thicknessMm / 1000) * scene.layerExaggeration * 0.08), 0);

      // Excavation shell (walls + benches), drawn step by step along the berms.
      const berms = Math.max(0, cell.bermCount);
      const interval = berms > 0 ? cell.heightM / berms : cell.heightM;
      // Cut walls and above-grade fill slopes use different materials so the
      // effective method is visible in 3D.
      const cutMaterial = track(
        new THREE.MeshStandardMaterial({
          color: hexToNumber(CELL_COLORS.wall),
          roughness: 0.92,
          metalness: 0.03,
          transparent: true,
          opacity: selected ? 0.62 : 0.5,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: clipEnabled,
        }),
      );
      const fillMaterial = track(
        new THREE.MeshStandardMaterial({
          color: hexToNumber(CELL_COLORS.wasteEmpty),
          roughness: 0.9,
          metalness: 0.02,
          transparent: true,
          opacity: selected ? 0.5 : 0.38,
          side: THREE.DoubleSide,
          clippingPlanes,
          clipShadows: clipEnabled,
        }),
      );
      const edgeColor = selected ? hexToNumber(CELL_COLORS.selected) : 0x8aa080;
      const edgeMaterial = track(
        new THREE.LineBasicMaterial({
          color: edgeColor,
          transparent: true,
          opacity: selected ? 0.95 : 0.55,
          clippingPlanes,
        }),
      );

      for (let i = 0; i < Math.max(berms, 1); i++) {
        const z0 = i * interval;
        const z1 = Math.min((i + 1) * interval, cell.heightM);
        const topZ = Math.max(z0, z1 - 0.001);
        const bottomL = cellDimensionAt(cfg, z0, "length");
        const bottomW = cellDimensionAt(cfg, z0, "width");
        const topL = cellDimensionAt(cfg, topZ, "length");
        const topW = cellDimensionAt(cfg, topZ, "width");
        if (bottomL <= 0 || bottomW <= 0) continue;
        const geometry = track(frustumGeometry(bottomL, bottomW, Math.max(topL, 0.4), Math.max(topW, 0.4), z1 - z0));
        const material = (z0 + z1) / 2 <= cell.cutDepthM + 1e-6 ? cutMaterial : fillMaterial;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = z0;
        mesh.castShadow = scene.shadows;
        mesh.receiveShadow = true;
        mesh.userData.cellId = cell.id;
        group.add(mesh);
        pickMeshes.push(mesh);

        const edges = new THREE.LineSegments(track(new THREE.EdgesGeometry(geometry, 28)), edgeMaterial);
        edges.position.y = z0;
        group.add(edges);
      }

      // Horizontal bench shelves.
      for (let i = 1; i <= berms; i++) {
        const z = Math.min(i * interval, cell.heightM);
        if (z >= cell.heightM - 1e-6) continue;
        const innerL = cellDimensionAt(cfg, z - 0.001, "length");
        const innerW = cellDimensionAt(cfg, z - 0.001, "width");
        const outerL = cellDimensionAt(cfg, z, "length");
        const outerW = cellDimensionAt(cfg, z, "width");
        const geometry = track(benchRingGeometry(innerL, innerW, outerL, outerW));
        const ring = new THREE.Mesh(geometry, z <= cell.cutDepthM + 1e-6 ? cutMaterial : fillMaterial);
        ring.position.y = z;
        ring.receiveShadow = true;
        group.add(ring);
      }

      // Top cap when there is an above-grade fill: excavated-only cells remain open.
      if (cell.fillHeightM > 0.05 && fillPct < 0.995) {
        const topPlate = new THREE.Mesh(
          track(rectangle(cell.topLengthM, cell.topWidthM)),
          track(
            new THREE.MeshStandardMaterial({
              color: hexToNumber(CELL_COLORS.wasteEmpty),
              roughness: 0.9,
              transparent: true,
              opacity: 0.36,
              side: THREE.DoubleSide,
              clippingPlanes,
            }),
          ),
        );
        topPlate.position.y = cell.heightM;
        group.add(topPlate);
      }

      // Liner stack at the bottom.
      if (scene.showLiner) {
        let y = 0.06;
        for (const layer of layers) {
          const actual = layer.thicknessMm / 1000;
          const visual = Math.min(0.65, Math.max(0.025, actual * scene.layerExaggeration * 0.08));
          const plate = new THREE.Mesh(
            track(rectangle(Math.max(cell.bottomLengthM - 0.8, 1), Math.max(cell.bottomWidthM - 0.8, 1), visual / 2)),
            track(
              new THREE.MeshStandardMaterial({
                color: hexToNumber(LINER_COLORS[layer.category] ?? "#88958c"),
                roughness: 0.55,
                metalness: layer.category === "geomembrane" ? 0.55 : 0.08,
                transparent: true,
                opacity: 0.92,
                side: THREE.DoubleSide,
                clippingPlanes,
              }),
            ),
          );
          plate.position.y = y;
          group.add(plate);
          y += visual;
          if (y > Math.min(cell.heightM * 0.55, linerThickness + 1.8)) break;
        }
      }

      // Waste body up to the simulated fill elevation.
      if (scene.showWaste) {
        if (fillHeight > 0.05) {
          const fillColor = new THREE.Color(CELL_COLORS.wastePartial).lerp(new THREE.Color(CELL_COLORS.wasteFull), Math.min(1, fillPct));
          const wasteMaterial = track(
            new THREE.MeshStandardMaterial({
              color: fillColor,
              roughness: 0.82,
              metalness: 0.04,
              transparent: true,
              opacity: 0.96,
              side: THREE.DoubleSide,
              clippingPlanes,
              clipShadows: clipEnabled,
            }),
          );
          const intervals = Math.max(1, Math.ceil(fillHeight / Math.max(interval, 0.5)));
          for (let i = 0; i < intervals; i++) {
            const z0 = (i * fillHeight) / intervals;
            const z1 = ((i + 1) * fillHeight) / intervals;
            const bottomL = cellDimensionAt(cfg, z0, "length") - 0.35;
            const bottomW = cellDimensionAt(cfg, z0, "width") - 0.35;
            const topL = cellDimensionAt(cfg, Math.max(z0, z1 - 0.001), "length") - 0.35;
            const topW = cellDimensionAt(cfg, Math.max(z0, z1 - 0.001), "width") - 0.35;
            if (bottomL <= 0 || bottomW <= 0) continue;
            const geometry = track(frustumGeometry(bottomL, bottomW, Math.max(topL, 0.3), Math.max(topW, 0.3), z1 - z0));
            const body = new THREE.Mesh(geometry, wasteMaterial);
            body.position.y = z0 + 0.02;
            body.castShadow = scene.shadows;
            body.receiveShadow = true;
            body.userData.cellId = cell.id;
            group.add(body);
            pickMeshes.push(body);
          }
          const cap = new THREE.Mesh(
            track(rectangle(Math.max(cellDimensionAt(cfg, fillHeight, "length") - 0.35, 0.4), Math.max(cellDimensionAt(cfg, fillHeight, "width") - 0.35, 0.4))),
            track(
              new THREE.MeshStandardMaterial({
                color: fillColor,
                roughness: 0.72,
                metalness: 0.03,
                side: THREE.DoubleSide,
                clippingPlanes,
              }),
            ),
          );
          cap.position.y = fillHeight + 0.03;
          cap.receiveShadow = true;
          cap.userData.cellId = cell.id;
          group.add(cap);
          pickMeshes.push(cap);
        } else {
          // Empty pit floor.
          const floor = new THREE.Mesh(
            track(rectangle(cell.bottomLengthM, cell.bottomWidthM)),
            track(
              new THREE.MeshStandardMaterial({
                color: 0x2a3b2e,
                roughness: 1,
                side: THREE.DoubleSide,
                clippingPlanes,
              }),
            ),
          );
          floor.position.y = 0.02;
          floor.receiveShadow = true;
          floor.userData.cellId = cell.id;
          group.add(floor);
          pickMeshes.push(floor);
        }
      }

      // Access ramp for combined/ramp cells. Preliminary wedge surface from
      // the terrain down to the cell bottom.
      if (cell.rampVolumeM3 > 0 && cell.rampWidthM > 0 && cell.rampLengthM > 0 && cell.cutDepthM > 0.05) {
        const maxRun = Math.max(cell.groundLengthM * 0.95, cell.bottomLengthM * 0.95, 4);
        const run = Math.min(cell.rampLengthM, maxRun);
        const rampWidth = Math.min(cell.rampWidthM, Math.max(cell.groundWidthM * 0.7, 2));
        const startX = -Math.max(cell.groundLengthM, cell.bottomLengthM) / 2 + 0.8;
        const endX = startX + run;
        const halfW = rampWidth / 2;
        const vertices = new Float32Array([
          startX, cell.cutDepthM, -halfW,
          startX, cell.cutDepthM, halfW,
          endX, 0, halfW,
          endX, 0, -halfW,
        ]);
        const rampGeometry = track(new THREE.BufferGeometry());
        rampGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
        rampGeometry.setIndex([0, 1, 2, 0, 2, 3]);
        rampGeometry.computeVertexNormals();
        const rampMaterial = track(
          new THREE.MeshStandardMaterial({
            color: 0x9b8a5a,
            roughness: 0.88,
            metalness: 0.02,
            transparent: true,
            opacity: selected ? 0.9 : 0.72,
            side: THREE.DoubleSide,
            clippingPlanes,
            clipShadows: clipEnabled,
          }),
        );
        const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);
        rampMesh.userData.cellId = cell.id;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);
        pickMeshes.push(rampMesh);
        const rampEdges = new THREE.LineSegments(
          track(new THREE.EdgesGeometry(rampGeometry, 20)),
          track(new THREE.LineBasicMaterial({ color: 0xe8c07a, transparent: true, opacity: 0.75, clippingPlanes })),
        );
        group.add(rampEdges);
      }

      // Contour rings for each bench elevation.
      if (scene.showContours) {
        for (let i = 0; i <= Math.max(berms, 1); i++) {
          const z = Math.min((i * cell.heightM) / Math.max(berms, 1), cell.heightM);
          if (i === 0 && cell.cutDepthM > 0.05) continue;
          const L = cellDimensionAt(cfg, z, "length");
          const W = cellDimensionAt(cfg, z, "width");
          if (L <= 0 || W <= 0) continue;
          const pts = [
            new THREE.Vector3(-L / 2, z + 0.04, -W / 2),
            new THREE.Vector3(L / 2, z + 0.04, -W / 2),
            new THREE.Vector3(L / 2, z + 0.04, W / 2),
            new THREE.Vector3(-L / 2, z + 0.04, W / 2),
            new THREE.Vector3(-L / 2, z + 0.04, -W / 2),
          ];
          const contour = new THREE.Line(
            track(new THREE.BufferGeometry().setFromPoints(pts)),
            track(
              new THREE.LineBasicMaterial({
                color: selected ? 0xc4eda8 : 0x79ce4c,
                transparent: true,
                opacity: selected ? 0.62 : 0.28,
                clippingPlanes,
              }),
            ),
          );
          group.add(contour);
        }
      }

      // Leachate collection pipes along the floor.
      if (scene.showPipes) {
        const pipeMaterial = track(
          new THREE.MeshBasicMaterial({
            color: hexToNumber(CELL_COLORS.pipe),
            transparent: true,
            opacity: 0.85,
            clippingPlanes,
          }),
        );
        flowMaterials.push(pipeMaterial);
        const pipeY = Math.max(0.4, linerThickness + 0.25);
        const pipeLength = Math.max(cell.bottomLengthM - 2, 2);
        for (const offset of [-0.22, 0.22]) {
          const geometry = track(new THREE.CylinderGeometry(0.28, 0.28, pipeLength, 8));
          geometry.rotateZ(Math.PI / 2);
          const pipe = new THREE.Mesh(geometry, pipeMaterial);
          pipe.position.set(0, pipeY + group.position.y, cell.bottomWidthM * offset);
          pipe.position.y = pipeY;
          group.add(pipe);
        }
      }

      // Gas wells on the filled surface.
      if (scene.showWells && fillPct > 0.08) {
        const wellMaterial = track(
          new THREE.MeshStandardMaterial({
            color: hexToNumber(CELL_COLORS.well),
            roughness: 0.42,
            metalness: 0.6,
            clippingPlanes,
          }),
        );
        const count = compact ? 2 : Math.max(2, Math.min(4, Math.round(model.params.gas.wellCount / Math.max(cells.length, 1))));
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0 : i / (count - 1) - 0.5;
          const x = t * Math.max(cellDimensionAt(cfg, fillHeight, "length") - 8, 2);
          const z = ((i % 2) - 0.5) * Math.max(cellDimensionAt(cfg, fillHeight, "width") * 0.36, 2);
          const wellHeight = Math.max(4, model.params.gas.wellDepthM * 0.7);
          const geometry = track(new THREE.CylinderGeometry(0.36, 0.36, wellHeight, 8));
          const well = new THREE.Mesh(geometry, wellMaterial);
          well.position.set(x, fillHeight + wellHeight / 2 + 0.2, z);
          group.add(well);
          const head = new THREE.Mesh(
            track(new THREE.BoxGeometry(1.5, 0.5, 1.5)),
            track(new THREE.MeshStandardMaterial({ color: 0x2e9fbe, roughness: 0.4, metalness: 0.45, clippingPlanes })),
          );
          head.position.set(x, fillHeight + wellHeight + 0.4, z);
          group.add(head);
        }
      }

      // Selected cell marker.
      if (selected) {
        const ringMaterial = track(new THREE.LineBasicMaterial({ color: 0xc4eda8, transparent: true, opacity: 0.9 }));
        const pts = [
          new THREE.Vector3(-cell.topLengthM / 2 - 1, cell.heightM + 0.6, -cell.topWidthM / 2 - 1),
          new THREE.Vector3(cell.topLengthM / 2 + 1, cell.heightM + 0.6, -cell.topWidthM / 2 - 1),
          new THREE.Vector3(cell.topLengthM / 2 + 1, cell.heightM + 0.6, cell.topWidthM / 2 + 1),
          new THREE.Vector3(-cell.topLengthM / 2 - 1, cell.heightM + 0.6, cell.topWidthM / 2 + 1),
          new THREE.Vector3(-cell.topLengthM / 2 - 1, cell.heightM + 0.6, -cell.topWidthM / 2 - 1),
        ];
        const ring = new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), ringMaterial);
        group.add(ring);
      }

      // Measurement annotation.
      if (measure) {
        const dimMaterial = track(new THREE.LineBasicMaterial({ color: 0xe8c07a, transparent: true, opacity: 0.9 }));
        const y = Math.max(fillHeight, 0) + 1.4;
        const L = cellDimensionAt(cfg, Math.min(fillHeight + 0.2, cell.heightM), "length");
        const W = cellDimensionAt(cfg, Math.min(fillHeight + 0.2, cell.heightM), "width");
        const dimPts = [
          new THREE.Vector3(-L / 2, y, -W / 2 - 2),
          new THREE.Vector3(L / 2, y, -W / 2 - 2),
        ];
        group.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(dimPts)), dimMaterial));
        const dim = labelSprite(`${fmt(L, 1)} m`, `${cell.name} · ancho ${fmt(W, 1)} m`, "#e8c07a", 18 * labelScale);
        dim.sprite.position.set(group.position.x, group.position.y + y + 2, group.position.z - W / 2 - 2);
        dim.sprite.scale.set(18 * labelScale, 6 * labelScale, 1);
        labelsGroup.add(dim.sprite);
        decorativeLabelTextures.push(dim.texture);
      }

      // Cell label.
      const label = labelSprite(
        cell.name,
        `${CELL_METHOD_SPECS[cell.effectiveMethod].shortLabel} · ${fmtPct(fillPct * 100, 0)} llenado · cota ${fmt(cell.baseElevationM + fillHeight, 1)} m`,
        "#c4eda8",
        30 * labelScale,
      );
      label.sprite.position.set(
        group.position.x,
        group.position.y + Math.max(cell.heightM, fillHeight) + 9,
        group.position.z,
      );
      if (compact) label.sprite.scale.set(24 * labelScale, 7.5 * labelScale, 1);
      labelsGroup.add(label.sprite);
      decorativeLabelTextures.push(label.texture);

      builtRef.current.push({
        id: cell.id,
        name: cell.name,
        fillPct,
        matrix: new THREE.Matrix4(),
        position: group.position.clone(),
      });
    }

    // ---------------------------------------------------------------------
    // Infraestructura complementaria del sitio
    // ---------------------------------------------------------------------
    buildSiteInfrastructure({
      root,
      labelsGroup,
      placements: layout.placements,
      cells,
      layout,
      extent,
      areaHa: model.params.site.areaHa,
      compact,
      flags: {
        showRoads: scene.showRoads,
        showBuildings: scene.showBuildings,
        showDrainage: scene.showDrainage,
        showPonds: scene.showPonds,
        showPipes: scene.showPipes,
        showGasNetwork: scene.showGasNetwork,
        showFlare: scene.showFlare,
        showMonitoring: scene.showMonitoring,
        showFence: scene.showFence,
        showVegetation: scene.showVegetation,
        showLabels: scene.showLabels,
        shadows: scene.shadows,
      },
      clippingPlanes,
      track,
      makeLabel: (text, sub, accent, width) => labelSprite(text, sub, accent, (width ?? 30) * labelScale),
      flowMaterials,
      flareObjects,
      labelTextures: decorativeLabelTextures,
    });

    // ---------------------------------------------------------------------
    // Camera
    // ---------------------------------------------------------------------
    const targetY = Math.max(centerY, modelHeight * 0.3);
    const setCameraForView = (view: SceneView) => {
      const d = Math.max(extent * 1.25, siteHalf * 1.05, 140);
      const positions: Record<SceneView, [number, number, number]> = {
        iso: [d * 1.1, d * 0.62, d * 1.1],
        top: [0.01, d * 1.9, 0.01],
        front: [0, d * 0.45, d * 1.6],
        side: [d * 1.65, d * 0.48, 0],
        section: [d * 1.35, d * 0.32, 0],
      };
      const [x, y, z] = positions[view];
      camera.position.set(x, y, z);
      controls.target.set(0, targetY, 0);
      controls.update();
    };
    setCameraForView(scene.view);

    // ---------------------------------------------------------------------
    // Interactions
    // ---------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    };

    const hitCell = (event: PointerEvent): { cellId: string; name: string; fill: number } | null => {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickMeshes, false);
      for (const hit of hits) {
        const cellId = hit.object.userData.cellId as string | undefined;
        if (!cellId) continue;
        const cell = cells.find((c) => c.id === cellId);
        if (!cell) continue;
        return { cellId, name: cell.name, fill: fillFractions.get(cellId) ?? 0 };
      }
      return null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const hit = hitCell(event);
      if (!hit) {
        setTooltip(null);
        return;
      }
      const rect = host.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        name: hit.name,
        detail: `${fmtPct(hit.fill * 100, 0)} de llenado · clic para seleccionar`,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown) return;
      const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (moved > 5) return;
      const hit = hitCell(event);
      setSelectedCell(hit?.cellId ?? null);
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(host);

    // Screenshot capture for the PDF report and PNG export.
    captureRef.current = (options) => {
      const w = Math.max(640, Math.round(options?.width ?? 1600));
      const h = Math.max(480, Math.round(options?.height ?? 1000));
      const previousSize = renderer.getSize(new THREE.Vector2());
      const previousRatio = renderer.getPixelRatio();
      const previousAspect = camera.aspect;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(sceneRoot, camera);
      const url = canvas.toDataURL("image/png");
      renderer.setPixelRatio(previousRatio);
      renderer.setSize(previousSize.x, previousSize.y, false);
      camera.aspect = previousAspect;
      camera.updateProjectionMatrix();
      return url;
    };

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      controls.update();
      if (scene.animFlow) {
        for (let i = 0; i < flowMaterials.length; i++) {
          flowMaterials[i].opacity = 0.55 + Math.sin(t * 2.2 + i * 0.4) * 0.35;
        }
      }
      for (let i = 0; i < flareObjects.length; i++) {
        const object = flareObjects[i];
        if (object instanceof THREE.PointLight) {
          object.intensity = scene.animGas ? 14 + Math.sin(t * 8.4) * 8 : 18;
        } else if (object instanceof THREE.Mesh && scene.animGas) {
          const s = 0.86 + Math.sin(t * 7.2) * 0.14;
          object.scale.set(s, 0.86 + Math.sin(t * 5.8) * 0.2, s);
        }
      }
      renderer.render(sceneRoot, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      decorativeLabelTextures.forEach((t) => t.dispose());
      for (const item of disposables) item.dispose();
      renderer.dispose();
      captureRef.current = null;
      builtRef.current = [];
      setTooltip(null);
    };
  }, [
    model,
    scene.view,
    scene.viewNonce,
    scene.showWaste,
    scene.showLiner,
    scene.showPipes,
    scene.showWells,
    scene.showFlare,
    scene.showRoads,
    scene.showBuildings,
    scene.showDrainage,
    scene.showPonds,
    scene.showGasNetwork,
    scene.showMonitoring,
    scene.showFence,
    scene.showVegetation,
    scene.showLabels,
    scene.showContours,
    scene.showGrid,
    scene.showTerrain,
    scene.clipEnabled,
    scene.clipPosition,
    scene.explode,
    scene.layerExaggeration,
    scene.autoRotate,
    scene.animFlow,
    scene.animGas,
    scene.shadows,
    selectedCellId,
    setSelectedCell,
    annualIndex,
    fillFractions,
    fillVolumes,
    measure,
    compact,
  ]);

  const fallback = useMemo(() => buildPlanFallback(model.geometry.cells, fillFractions), [model.geometry.cells, fillFractions]);

  const onScreenshot = useCallback(() => {
    const url = captureRef.current?.({ width: 1920, height: 1200 });
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `green-owl-modelo-${Date.now()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  if (model.geometry.cells.length === 0) {
    return (
      <div className={className ? `scene-host ${className}` : "scene-host"}>
        <div className="scene-empty">
          <div style={{ textAlign: "center", maxWidth: 340 }}>
            <Box size={22} style={{ color: "var(--leaf-400)", margin: "0 auto 10px" }} />
            <strong style={{ display: "block", fontSize: 13 }}>Sin celdas para visualizar</strong>
            <span style={{ display: "block", marginTop: 6, fontSize: 10, color: "var(--muted)" }}>
              Agregue al menos una celda en el módulo Celdas y capas para construir el modelo tridimensional.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={hostRef} className={className ? `scene-host ${className}` : "scene-host"}>
      <div className="scene-canvas-wrap">
        <canvas ref={canvasRef} className="scene-canvas" aria-label="Modelo tridimensional del relleno sanitario" />

        {error ? (
          <div className="scene-fallback">
            <svg viewBox={fallback.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Vista esquemática en planta">
              <rect x="0" y="0" width="100%" height="100%" fill="#061712" />
              {fallback.items.map((item) => (
                <g key={item.id}>
                  <rect
                    x={item.x}
                    y={item.y}
                    width={item.w}
                    height={item.h}
                    rx={2}
                    fill={item.fill > 0.995 ? "rgba(121,206,76,0.32)" : item.fill > 0 ? "rgba(200,155,60,0.28)" : "rgba(111,128,101,0.12)"}
                    stroke={item.id === selectedCellId ? "#c4eda8" : "#6f8065"}
                    strokeWidth={item.id === selectedCellId ? 2 : 0.8}
                    onClick={() => setSelectedCell(item.id)}
                    style={{ cursor: "pointer" }}
                  />
                  <text x={item.x + 4} y={item.y + 12} fill="#cbd2cb" fontSize={Math.max(item.w * 0.045, 7)} fontFamily="Inter, sans-serif">
                    {item.name} · {fmtPct(item.fill * 100, 0)}
                  </text>
                </g>
              ))}
            </svg>
            <div className="scene-fallback-note">
              WebGL no disponible ({error.slice(0, 80)}). Se muestra la vista esquemática en planta; las dimensiones y los
              cálculos no cambian.
            </div>
          </div>
        ) : null}

        <div className="scene-hud">
          {showToolbar ? (
            <div className="scene-toolbar">
              <div className="scene-toolgroup">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`scene-tool ${scene.view === option.value ? "is-active" : ""}`}
                    onClick={() => setView(option.value)}
                    title={`Vista ${option.label}`}
                    aria-pressed={scene.view === option.value}
                  >
                    {option.label}
                  </button>
                ))}
                <button type="button" className="scene-tool" onClick={resetScene} title="Restablecer vista">
                  <RotateCcw size={12} />
                </button>
              </div>
              <div className="scene-toolgroup">
                <button
                  type="button"
                  className={`scene-tool ${scene.showGrid ? "is-active" : ""}`}
                  onClick={() => setScene({ showGrid: !scene.showGrid })}
                  title="Cuadrícula"
                >
                  <Grid3X3 size={12} />
                </button>
                <button
                  type="button"
                  className={`scene-tool ${scene.showLabels ? "is-active" : ""}`}
                  onClick={() => setScene({ showLabels: !scene.showLabels })}
                  title="Etiquetas"
                >
                  <Tag size={12} />
                </button>
                <button
                  type="button"
                  className={`scene-tool ${measure ? "is-active" : ""}`}
                  onClick={() => setMeasure((v) => !v)}
                  title="Medidas"
                >
                  <Crosshair size={12} />
                </button>
                <button
                  type="button"
                  className={`scene-tool ${scene.clipEnabled ? "is-active" : ""}`}
                  onClick={() => setScene({ clipEnabled: !scene.clipEnabled })}
                  title="Plano de corte"
                >
                  <Scissors size={12} />
                </button>
                <button type="button" className="scene-tool" onClick={onScreenshot} title="Captura PNG">
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          ) : null}

          {!compact ? (
            <div className="scene-compass" aria-label="Orientación norte">
              <span>N</span>
              <Compass size={20} />
            </div>
          ) : null}

          {!compact ? (
            <div className="scene-legend">
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.wasteFull }} />Residuos estabilizados</span>
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.wastePartial }} />Llenado parcial</span>
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.wall }} />Talud / berma</span>
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.linerMembrane }} />Geomembrana</span>
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.pipe }} />Lixiviados</span>
              <span className="scene-legend-item"><i style={{ background: CELL_COLORS.flare }} />Antorcha / biogás</span>
              <span className="scene-legend-item"><i style={{ background: "#8b928a" }} />Vías y edificios</span>
              <span className="scene-legend-item"><i style={{ background: "#3a3b24" }} />Poza de lixiviados</span>
              <span className="scene-legend-item"><i style={{ background: "#2f5f66" }} />Canal pluvial</span>
            </div>
          ) : null}

          <div className="scene-scale">
            <span className="scene-scale-bar" style={{ width: 62 }} />
            <span>{fmt(Math.max(10, Math.round(displayExtent / 6) / 10) * 10, 0)} m aprox.</span>
          </div>

          {!compact ? (
            <div className="scene-hint">
              Arrastre para orbitar · rueda para acercar · clic en una celda para seleccionarla
            </div>
          ) : null}

          <div className="scene-scale" style={{ left: "auto", right: 12, bottom: compact ? 10 : 32 }}>
            <span style={{ color: "var(--leaf-300)", fontWeight: 700 }}>{yearLabel}</span>
            <span>{phaseLabel}</span>
          </div>

          {tooltip ? (
            <div className="scene-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <strong>{tooltip.name}</strong>
              <span>{tooltip.detail}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
