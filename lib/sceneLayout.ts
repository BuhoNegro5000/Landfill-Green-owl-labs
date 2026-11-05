import type { CellGeometry } from "@/lib/engine/geometry";

export interface CellPlacement {
  cellId: string;
  x: number;
  z: number;
  /** Maximum plan dimension, used for the terrain hole and camera framing. */
  spanX: number;
  spanZ: number;
}

/**
 * Plan-view layout for the 3D viewer. Cells are rectangular prisms whose real
 * dimensions are preserved; the viewer only assigns a non-overlapping position
 * on a synthetic grid so that every cell can be inspected.
 */
export function layoutCells(cells: CellGeometry[]): {
  placements: Map<string, CellPlacement>;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const placements = new Map<string, CellPlacement>();
  if (cells.length === 0) {
    return { placements, minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
  }
  const columns = cells.length <= 2 ? cells.length : cells.length <= 6 ? 2 : 3;
  const rows = Math.ceil(cells.length / columns);
  const gap = 14;
  const maxSpanX = Math.max(...cells.map((c) => Math.max(c.bottomLengthM, c.topLengthM, 1)));
  const maxSpanZ = Math.max(...cells.map((c) => Math.max(c.bottomWidthM, c.topWidthM, 1)));
  const totalX = columns * maxSpanX + (columns - 1) * gap;
  const totalZ = rows * maxSpanZ + (rows - 1) * gap;

  cells.forEach((cell, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const spanX = Math.max(cell.bottomLengthM, cell.topLengthM, 1);
    const spanZ = Math.max(cell.bottomWidthM, cell.topWidthM, 1);
    const x = col * (maxSpanX + gap) + maxSpanX / 2 - totalX / 2;
    const z = row * (maxSpanZ + gap) + maxSpanZ / 2 - totalZ / 2;
    placements.set(cell.id, { cellId: cell.id, x, z, spanX, spanZ });
  });

  return {
    placements,
    minX: -totalX / 2,
    maxX: totalX / 2,
    minZ: -totalZ / 2,
    maxZ: totalZ / 2,
  };
}

export const CELL_COLORS = {
  pit: "#3f5142",
  wall: "#56664f",
  wasteEmpty: "#6f8065",
  wastePartial: "#c89b3c",
  wasteFull: "#79ce4c",
  selected: "#c4eda8",
  linerClay: "#8c6a4b",
  linerMembrane: "#3b7c9e",
  linerDrainage: "#d8a33a",
  linerProtection: "#88958c",
  pipe: "#4fa8c7",
  well: "#b7c6ba",
  flare: "#e07a3f",
} as const;

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}
