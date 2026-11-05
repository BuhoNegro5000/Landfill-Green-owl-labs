import * as THREE from "three";
import type { CellGeometry } from "@/lib/engine/geometry";
import type { CellPlacement } from "@/lib/sceneLayout";

/**
 * Infraestructura complementaria del relleno. Se dibuja en la misma escena que
 * las celdas, con dimensiones exageradas solo donde es necesario para que sea
 * legible a escala de anteproyecto. Las posiciones son una implantación
 * esquemática, no un replanteo topográfico.
 */

export interface InfrastructureFlags {
  showRoads: boolean;
  showBuildings: boolean;
  showDrainage: boolean;
  showPonds: boolean;
  showPipes: boolean;
  showGasNetwork: boolean;
  showFlare: boolean;
  showMonitoring: boolean;
  showFence: boolean;
  showVegetation: boolean;
  showLabels: boolean;
  shadows: boolean;
}

export interface InfrastructureInput {
  root: THREE.Group;
  labelsGroup: THREE.Group;
  placements: Map<string, CellPlacement>;
  cells: CellGeometry[];
  layout: { minX: number; maxX: number; minZ: number; maxZ: number };
  extent: number;
  areaHa: number;
  flags: InfrastructureFlags;
  compact: boolean;
  clippingPlanes: THREE.Plane[];
  track: <T extends { dispose: () => void }>(item: T) => T;
  makeLabel: (text: string, sub: string, accent?: string, width?: number) => { sprite: THREE.Sprite; texture: THREE.CanvasTexture };
  flowMaterials: THREE.MeshBasicMaterial[];
  flareObjects: THREE.Object3D[];
  labelTextures: THREE.CanvasTexture[];
}

const COLOR = {
  asphalt: 0x2c332e,
  asphaltLine: 0xd8d2a8,
  concrete: 0x8b928a,
  building: 0xb9c2b4,
  roof: 0x5c6a5c,
  roofAccent: 0x3d6b52,
  glass: 0x9ec9c4,
  metal: 0x7a8a82,
  darkMetal: 0x4a554e,
  water: 0x274c55,
  leachate: 0x7a5a2a,
  pipe: 0x4fa8c7,
  gasPipe: 0xc89b3c,
  fence: 0x5a675d,
  tree: 0x2f6b3c,
  trunk: 0x5a4632,
  soil: 0x4a4234,
  warning: 0xd8a33a,
};

function mat(
  track: InfrastructureInput["track"],
  color: number,
  options: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return track(
    new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.85,
      metalness: options.metalness ?? 0.05,
      ...options,
    }),
  );
}

function box(
  track: InfrastructureInput["track"],
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(
  track: InfrastructureInput["track"],
  material: THREE.Material,
  radius: number,
  height: number,
  x: number,
  y: number,
  z: number,
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, height, segments)), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pipe(
  track: InfrastructureInput["track"],
  material: THREE.Material,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
): THREE.Mesh {
  const direction = to.clone().sub(from);
  const length = Math.max(direction.length(), 0.01);
  const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, length, 8)), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function addLabel(
  input: InfrastructureInput,
  text: string,
  sub: string,
  position: THREE.Vector3,
  accent = "#c4eda8",
  width?: number,
): void {
  if (!input.flags.showLabels) return;
  const label = input.makeLabel(text, sub, accent, width);
  label.sprite.position.copy(position);
  input.labelsGroup.add(label.sprite);
  input.labelTextures.push(label.texture);
}

function building(
  input: InfrastructureInput,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  options: { roof?: number; body?: number; annex?: boolean } = {},
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = box(
    input.track,
    mat(input.track, options.body ?? COLOR.building, { roughness: 0.7 }),
    width,
    height,
    depth,
    0,
    height / 2,
    0,
  );
  group.add(body);

  const roof = box(
    input.track,
    mat(input.track, options.roof ?? COLOR.roof, { roughness: 0.8 }),
    width + 1.4,
    0.35,
    depth + 1.4,
    0,
    height + 0.18,
    0,
  );
  group.add(roof);

  // Windows and door on the south facade (positive z).
  const glass = mat(input.track, COLOR.glass, { roughness: 0.2, metalness: 0.4, emissive: 0x14302a, emissiveIntensity: 0.25 });
  const windowCount = Math.max(1, Math.round(width / 3.5));
  for (let i = 0; i < windowCount; i++) {
    const wx = -width / 2 + (i + 0.5) * (width / windowCount);
    group.add(box(input.track, glass, 1.1, 1.0, 0.08, wx, height * 0.62, depth / 2 + 0.02));
  }
  group.add(box(input.track, mat(input.track, COLOR.darkMetal), 1.2, height * 0.72, 0.1, 0, height * 0.36, depth / 2 + 0.04));

  if (options.annex) {
    group.add(
      box(
        input.track,
        mat(input.track, 0x9aa79a),
        width * 0.45,
        height * 0.62,
        depth * 0.6,
        width * 0.62,
        height * 0.31,
        -depth * 0.1,
      ),
    );
  }
  return group;
}

function pond(
  input: InfrastructureInput,
  x: number,
  z: number,
  topWidth: number,
  topDepth: number,
  depth: number,
  waterColor: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const berm = mat(input.track, COLOR.soil, { roughness: 1 });
  const liner = mat(input.track, 0x1f2a24, { roughness: 1 });
  const water = trackMaterial(input.track, waterColor);
  const bermHeight = Math.max(0.6, Math.min(depth * 0.4, 1.4));

  // Lámina de impermeabilización y superficie líquida a nivel de terreno.
  const bottom = new THREE.Mesh(input.track(new THREE.PlaneGeometry(topWidth, topDepth)), liner);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.03;
  group.add(bottom);
  const surface = new THREE.Mesh(input.track(new THREE.PlaneGeometry(topWidth - 1.8, topDepth - 1.8)), water);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.06;
  group.add(surface);

  // Berma perimetral que contiene el líquido.
  group.add(box(input.track, berm, topWidth + 2.4, bermHeight, 1.2, 0, bermHeight / 2, topDepth / 2 + 0.6));
  group.add(box(input.track, berm, topWidth + 2.4, bermHeight, 1.2, 0, bermHeight / 2, -topDepth / 2 - 0.6));
  group.add(box(input.track, berm, 1.2, bermHeight, topDepth + 2.4, topWidth / 2 + 0.6, bermHeight / 2, 0));
  group.add(box(input.track, berm, 1.2, bermHeight, topDepth + 2.4, -topWidth / 2 - 0.6, bermHeight / 2, 0));

  return group;
}

function trackMaterial(track: InfrastructureInput["track"], color: number): THREE.MeshStandardMaterial {
  return track(
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.86,
      emissive: color,
      emissiveIntensity: 0.12,
    }),
  );
}

export function siteHalfFor(areaHa: number, spanX: number, spanZ: number): number {
  return Math.max(
    Math.sqrt(Math.max(areaHa * 10_000, 400)) / 2,
    Math.max(spanX, spanZ) * 0.74,
    Math.max(spanX, spanZ) / 2 + 58,
  );
}

export function buildSiteInfrastructure(input: InfrastructureInput): void {
  const { root, track, flags, layout, extent, cells, placements } = input;
  if (!cells.length) return;

  const spanX = Math.max(layout.maxX - layout.minX, 1);
  const spanZ = Math.max(layout.maxZ - layout.minZ, 1);
  const siteHalf = siteHalfFor(input.areaHa, spanX, spanZ);
  const eastX = layout.maxX + 22;
  const westX = layout.minX - 54;
  const southZ = layout.maxZ + 30;
  const northZ = layout.minZ - 24;
  const centerZ = (layout.minZ + layout.maxZ) / 2;

  const asphalt = mat(track, COLOR.asphalt, { roughness: 1 });
  const concrete = mat(track, COLOR.concrete, { roughness: 0.92 });
  const metal = mat(track, COLOR.metal, { roughness: 0.42, metalness: 0.55 });
  const darkMetal = mat(track, COLOR.darkMetal, { roughness: 0.5, metalness: 0.5 });
  const pipeMat = track(
    new THREE.MeshBasicMaterial({ color: COLOR.pipe, transparent: true, opacity: 0.78, clippingPlanes: input.clippingPlanes }),
  );
  input.flowMaterials.push(pipeMat);
  const gasPipeMat = mat(track, COLOR.gasPipe, { roughness: 0.45, metalness: 0.35, clippingPlanes: input.clippingPlanes });
  const white = mat(track, COLOR.asphaltLine, { roughness: 0.8 });

  // -----------------------------------------------------------------------
  // Vías de acceso y circulación interna
  // -----------------------------------------------------------------------
  if (flags.showRoads) {
    const gateZ = southZ + 16;
    const accessLength = Math.max(siteHalf - gateZ + 8, 24);
    const access = box(track, asphalt, 8, 0.1, accessLength, 0, 0.05, gateZ + accessLength / 2 - 2);
    root.add(access);
    for (let i = 0; i < accessLength; i += 9) {
      root.add(box(track, white, 0.22, 0.02, 3.4, 0, 0.12, gateZ + i));
    }

    // Anillo interno alrededor de las celdas.
    const ringOffset = 15;
    const ringW = 5.5;
    const rMinX = layout.minX - ringOffset;
    const rMaxX = layout.maxX + ringOffset;
    const rMinZ = layout.minZ - ringOffset;
    const rMaxZ = layout.maxZ + ringOffset;
    root.add(box(track, asphalt, rMaxX - rMinX, 0.08, ringW, (rMinX + rMaxX) / 2, 0.04, rMinZ));
    root.add(box(track, asphalt, rMaxX - rMinX, 0.08, ringW, (rMinX + rMaxX) / 2, 0.04, rMaxZ));
    root.add(box(track, asphalt, ringW, 0.08, rMaxZ - rMinZ, rMinX, 0.04, (rMinZ + rMaxZ) / 2));
    root.add(box(track, asphalt, ringW, 0.08, rMaxZ - rMinZ, rMaxX, 0.04, (rMinZ + rMaxZ) / 2));

    // Conexión del acceso con el anillo y con el área administrativa.
    root.add(box(track, asphalt, 8, 0.08, Math.max(gateZ - rMaxZ + 4, 8), 0, 0.04, (gateZ + rMaxZ) / 2));
    root.add(box(track, asphalt, 26, 0.08, 6, -30, 0.04, southZ + 8));

    // Estacionamiento y plataforma de maniobras.
    root.add(box(track, asphalt, 22, 0.08, 13, -64, 0.04, southZ + 24));
    for (let i = 0; i < 4; i++) {
      root.add(box(track, white, 0.15, 0.02, 5, -73 + i * 5, 0.12, southZ + 24));
    }
  }

  // -----------------------------------------------------------------------
  // Zona de ingreso, pesaje y edificios complementarios
  // -----------------------------------------------------------------------
  if (flags.showBuildings) {
    const gateZ = southZ + 16;
    // Garita y portón.
    root.add(building(input, -8.5, gateZ, 4.2, 4.2, 3.4, { roof: COLOR.roofAccent }));
    const gatePost = mat(track, 0x3a423b, { roughness: 0.6, metalness: 0.4 });
    root.add(box(track, gatePost, 0.35, 3.2, 0.35, -2.4, 1.6, gateZ - 3.4));
    root.add(box(track, gatePost, 0.35, 3.2, 0.35, 5.4, 1.6, gateZ - 3.4));
    root.add(box(track, mat(track, COLOR.warning, { roughness: 0.7 }), 7.8, 0.22, 0.22, 1.5, 3.0, gateZ - 3.4));
    addLabel(input, "Acceso, garita y báscula", "Control de ingreso y pesaje", new THREE.Vector3(-2, 6.4, gateZ), "#c4eda8", 20);

    // Báscula para camiones.
    const scale = box(track, mat(track, 0x55605a, { roughness: 0.5, metalness: 0.45 }), 15, 0.35, 3.6, 0, 0.2, southZ + 2);
    root.add(scale);
    root.add(box(track, mat(track, COLOR.warning), 15, 0.05, 0.2, 0, 0.4, southZ + 2));
    root.add(building(input, 9.5, southZ + 2, 3.4, 3.4, 3.0, { roof: COLOR.roofAccent }));

    // Oficina administrativa, almacén, vestidores y comedor.
    const admin = building(input, -52, southZ + 27, 18, 10, 4.4, { annex: true });
    root.add(admin);
    addLabel(input, "Zona administrativa", "Oficina · almacén · servicios", new THREE.Vector3(-52, 8.2, southZ + 27), "#c4eda8", 20);

    const warehouse = building(input, -27, southZ + 30, 16, 9, 5.2, { roof: 0x4d5a4e });
    root.add(warehouse);

    const services = building(input, -72, southZ + 24, 12, 8, 3.4, { roof: 0x51604f });
    root.add(services);

    // Grupo electrógeno y tanque de combustible.
    root.add(building(input, 22, southZ + 26, 6, 5, 3.2, { roof: 0x5b5f52 }));
    root.add(cylinder(track, metal, 1.6, 4.2, 30, 2.1, southZ + 26, 14));
  }

  // -----------------------------------------------------------------------
  // Sistema de lixiviados: recolección, poza, tratamiento
  // -----------------------------------------------------------------------
  if (flags.showPipes) {
    // Colector principal desde el pie de las celdas hacia la poza.
    const pondZ = southZ + 8;
    const pondX = westX + 26;
    const sumpX = pondX + 20;
    const sumpZ = pondZ - 20;
    root.add(pipe(track, pipeMat, new THREE.Vector3(eastX - 18, 0.55, centerZ), new THREE.Vector3(sumpX, 0.55, sumpZ), 0.42));
    root.add(pipe(track, pipeMat, new THREE.Vector3(sumpX, 0.55, sumpZ), new THREE.Vector3(pondX + 8, 0.55, pondZ), 0.42));
    // Colectores secundarios a lo largo del pie de cada fila de celdas.
    for (const cell of cells) {
      const place = placements.get(cell.id);
      if (!place) continue;
      root.add(
        pipe(
          track,
          pipeMat,
          new THREE.Vector3(place.x - spanX * 0.12, 0.45, place.z + place.spanZ / 2 + 2),
          new THREE.Vector3(sumpX, 0.5, sumpZ),
          0.24,
        ),
      );
    }
  }

  if (flags.showPonds) {
    const pondX = westX + 26;
    const pondZ = southZ + 8;
    const leachatePond = pond(input, pondX, pondZ, 38, 26, 3.6, COLOR.leachate);
    root.add(leachatePond);
    addLabel(input, "Poza de lixiviados", "Almacenamiento temporal · HDPE", new THREE.Vector3(pondX - 26, 5.6, pondZ), "#e8c07a", 18);

    // Caja de bombeo junto a la poza.
    root.add(building(input, pondX + 24, pondZ + 15, 4.2, 4.2, 3.0, { roof: COLOR.roofAccent }));
    root.add(pipe(track, pipeMat, new THREE.Vector3(pondX + 16, 0.5, pondZ), new THREE.Vector3(pondX + 24, 0.5, pondZ + 13), 0.3));

    // Tren de tratamiento: tanque de igualación, reactor y tanque de lodos.
    const treatmentZ = pondZ + 38;
    root.add(cylinder(track, metal, 3.4, 6.4, pondX - 6, 3.2, treatmentZ, 18));
    root.add(cylinder(track, metal, 2.8, 5.6, pondX + 3, 2.8, treatmentZ, 18));
    root.add(cylinder(track, darkMetal, 2.2, 4.2, pondX + 11, 2.1, treatmentZ, 16));
    root.add(building(input, pondX + 2, treatmentZ + 10, 10, 6, 3.6, { roof: 0x4d5a4e }));
    root.add(pipe(track, pipeMat, new THREE.Vector3(pondX + 24, 0.5, pondZ + 15), new THREE.Vector3(pondX - 6, 0.5, treatmentZ - 3), 0.28));
    addLabel(input, "Tratamiento de lixiviados", "Igualación · reactor · lodos", new THREE.Vector3(pondX + 24, 8.2, treatmentZ + 4), "#4fa8c7", 17);
  }

  // -----------------------------------------------------------------------
  // Drenaje superficial: canal perimetral y poza de sedimentación
  // -----------------------------------------------------------------------
  if (flags.showDrainage) {
    const inset = siteHalf - 12;
    const channelWidth = 1.5;
    const channelY = 0.2;
    const channelMat = mat(track, 0x6f7a70, { roughness: 0.95 });
    const waterMat = trackMaterial(track, 0x2f5f66);
    const segments = [
      { w: 2 * inset, d: channelWidth, x: 0, z: -inset },
      { w: 2 * inset, d: channelWidth, x: 0, z: inset },
      { w: channelWidth, d: 2 * inset, x: -inset, z: 0 },
      { w: channelWidth, d: 2 * inset, x: inset, z: 0 },
    ];
    for (const segment of segments) {
      root.add(box(track, channelMat, segment.w, 0.34, segment.d, segment.x, channelY, segment.z));
      const water = new THREE.Mesh(track(new THREE.PlaneGeometry(Math.max(segment.w - 0.4, 0.2), Math.max(segment.d - 0.35, 0.2))), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(segment.x, channelY + 0.19, segment.z);
      root.add(water);
    }

    const sedPond = pond(input, eastX + 12, southZ + 26, 20, 13, 1.8, 0x2d5660);
    root.add(sedPond);
    addLabel(input, "Poza de sedimentación", "Control de sólidos y erosión", new THREE.Vector3(eastX + 4, 3.6, southZ + 34), "#4fa8c7", 18);
  }

  // -----------------------------------------------------------------------
  // Red de biogás: colector, estación de sopladores y antorcha
  // -----------------------------------------------------------------------
  const flareX = eastX + 14;
  const flareZ = northZ + 18;
  if (flags.showGasNetwork) {
    // Colector principal paralelo al borde este de las celdas.
    root.add(pipe(track, gasPipeMat, new THREE.Vector3(eastX - 4, 1.1, northZ + 4), new THREE.Vector3(eastX - 4, 1.1, southZ - 2), 0.3));
    root.add(pipe(track, gasPipeMat, new THREE.Vector3(eastX - 4, 1.1, flareZ), new THREE.Vector3(flareX, 1.1, flareZ), 0.3));
    // Ramales hacia las celdas y estación de sopladores.
    for (const cell of cells) {
      const place = placements.get(cell.id);
      if (!place) continue;
      const branchZ = Math.max(layout.minZ + 4, Math.min(layout.maxZ - 4, place.z));
      root.add(pipe(track, gasPipeMat, new THREE.Vector3(eastX - 4, 1.1, branchZ), new THREE.Vector3(place.x + place.spanX / 2 + 5, 1.1, branchZ), 0.18));
    }
    root.add(building(input, eastX + 2, southZ - 6, 8, 6, 3.4, { roof: 0x4d5a4e }));
    addLabel(input, "Estación de biogás", "Sopladores · manifold", new THREE.Vector3(eastX + 30, 6.6, southZ - 2), "#c89b3c", 17);
  }

  if (flags.showGasNetwork) {
    // Antorcha centralizada.
    const stack = cylinder(track, mat(track, 0x59645b, { roughness: 0.4, metalness: 0.65 }), 0.75, 18, flareX, 9, flareZ, 12);
    root.add(stack);
    root.add(cylinder(track, metal, 1.5, 0.5, flareX, 0.3, flareZ, 14));
    const flameMaterial = track(
      new THREE.MeshStandardMaterial({
        color: 0xe07a3f,
        emissive: 0xd4683c,
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const flame = new THREE.Mesh(track(new THREE.ConeGeometry(1.7, 4.2, 12)), flameMaterial);
    flame.position.set(flareX, 19.8, flareZ);
    root.add(flame);
    input.flareObjects.push(flame);
    if (flags.showFlare) {
      const light = new THREE.PointLight(0xe07a3f, 22, 70, 2);
      light.position.set(flareX, 20, flareZ);
      root.add(light);
      input.flareObjects.push(light);
    } else {
      flame.visible = false;
    }
    addLabel(input, "Antorcha centralizada", "Quema de biogás", new THREE.Vector3(flareX, 23.5, flareZ), "#e07a3f", 18);
  }

  // -----------------------------------------------------------------------
  // Pozos de monitoreo
  // -----------------------------------------------------------------------
  if (flags.showMonitoring) {
    const monitoring = [
      [-siteHalf + 22, -siteHalf + 22],
      [siteHalf - 22, -siteHalf + 22],
      [-siteHalf + 22, siteHalf - 22],
      [siteHalf - 22, siteHalf - 22],
      [0, -siteHalf + 16],
      [0, siteHalf - 16],
    ];
    const wellMat = mat(track, 0x8ea6a0, { roughness: 0.4, metalness: 0.5 });
    for (const [x, z] of monitoring) {
      root.add(cylinder(track, wellMat, 0.28, 2.0, x, 1.0, z, 10));
      root.add(box(track, mat(track, COLOR.warning), 0.75, 0.35, 0.75, x, 2.15, z));
    }
    addLabel(input, "Pozos de monitoreo", "6 puntos · agua y biogás", new THREE.Vector3(siteHalf - 22, 4.2, -siteHalf + 22), "#a7b0a8", 18);
  }

  // -----------------------------------------------------------------------
  // Cerco perimetral y barrera vegetal
  // -----------------------------------------------------------------------
  if (flags.showFence) {
    const postMaterial = mat(track, COLOR.fence, { roughness: 0.7, metalness: 0.35 });
    const postGeometry = track(new THREE.BoxGeometry(0.28, 2.3, 0.28));
    const step = 18;
    const perimeter = 8 * siteHalf;
    const count = Math.max(24, Math.floor(perimeter / step));
    const posts = new THREE.InstancedMesh(postGeometry, postMaterial, count);
    posts.castShadow = true;
    const matrix = new THREE.Matrix4();
    let index = 0;
    const side = 2 * siteHalf;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const perimeterPos = t * perimeter;
      let x = 0;
      let z = 0;
      if (perimeterPos < side) {
        x = -siteHalf + perimeterPos;
        z = -siteHalf;
      } else if (perimeterPos < side * 2) {
        x = siteHalf;
        z = -siteHalf + (perimeterPos - side);
      } else if (perimeterPos < side * 3) {
        x = siteHalf - (perimeterPos - side * 2);
        z = siteHalf;
      } else {
        x = -siteHalf;
        z = siteHalf - (perimeterPos - side * 3);
      }
      matrix.makeTranslation(x, 1.15, z);
      posts.setMatrixAt(index++, matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    root.add(posts);

    // Alambres horizontales.
    const wireMaterial = track(
      new THREE.LineBasicMaterial({ color: 0x8a9a8f, transparent: true, opacity: 0.5, clippingPlanes: input.clippingPlanes }),
    );
    for (const height of [0.65, 1.35, 2.0]) {
      const points = [
        new THREE.Vector3(-siteHalf, height, -siteHalf),
        new THREE.Vector3(siteHalf, height, -siteHalf),
        new THREE.Vector3(siteHalf, height, siteHalf),
        new THREE.Vector3(-siteHalf, height, siteHalf),
        new THREE.Vector3(-siteHalf, height, -siteHalf),
      ];
      const geometry = track(new THREE.BufferGeometry().setFromPoints(points));
      root.add(new THREE.Line(geometry, wireMaterial));
    }
  }

  if (flags.showVegetation) {
    const treeMaterial = mat(track, COLOR.tree, { roughness: 0.9 });
    const trunkMaterial = mat(track, COLOR.trunk, { roughness: 1 });
    const canopyGeometry = track(new THREE.ConeGeometry(2.4, 5.6, 7));
    const trunkGeometry = track(new THREE.CylinderGeometry(0.28, 0.34, 2.0, 6));
    let seed = 19;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 34; i++) {
      const angle = (i / 34) * Math.PI * 2 + random() * 0.12;
      // Deja libre el acceso sur (ángulo cercano a +Z).
      if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)) - Math.PI / 2) < 0.16) continue;
      const radius = siteHalf + 8 + random() * 26;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.7 + random() * 0.7;
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, 1.0 * scale, z);
      trunk.scale.setScalar(scale);
      trunk.castShadow = true;
      root.add(trunk);
      const canopy = new THREE.Mesh(canopyGeometry, treeMaterial);
      canopy.position.set(x, (2.0 + 2.8) * scale, z);
      canopy.scale.setScalar(scale);
      canopy.castShadow = true;
      root.add(canopy);
    }
    addLabel(input, "Barrera vegetal", "Cerco vivo perimetral", new THREE.Vector3(-siteHalf - 10, 8, -siteHalf - 12), "#3e9b2e", 18);
  }

  // -----------------------------------------------------------------------
  // Etiquetas de orientación: se mantienen pocas para no tapar el modelo.
  // El nombre del proyecto ya aparece en la barra superior y en el informe.
  // -----------------------------------------------------------------------
}
