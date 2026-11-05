"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from "immer";
import type {
  CellConfig,
  Layer,
  Project,
  RawDocument,
  Scenario,
  ScenarioKind,
  ScenarioParams,
  SiteData,
} from "@/lib/types";
import { blankProject, demoProjects, defaultScenarioParams, makeScenario, standardScenarios } from "@/lib/defaults";
import { DEFAULT_DOCUMENTS, reconcileDocuments } from "@/lib/normative";
import { buildProject, type NewProjectInput } from "@/lib/templates";
import { uid } from "@/lib/uid";
import type { ModuleId } from "@/lib/nav";

export type SceneView = "iso" | "top" | "front" | "side" | "section";
export type ToastKind = "ok" | "info" | "warn" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
}

export interface SceneSettings {
  view: SceneView;
  viewNonce: number;
  showTerrain: boolean;
  showWaste: boolean;
  showLiner: boolean;
  showPipes: boolean;
  showWells: boolean;
  showFlare: boolean;
  showRoads: boolean;
  showBuildings: boolean;
  showDrainage: boolean;
  showPonds: boolean;
  showGasNetwork: boolean;
  showMonitoring: boolean;
  showFence: boolean;
  showVegetation: boolean;
  showLabels: boolean;
  showContours: boolean;
  showGrid: boolean;
  clipEnabled: boolean;
  clipPosition: number;
  explode: number;
  layerExaggeration: number;
  autoRotate: boolean;
  animFlow: boolean;
  animGas: boolean;
  shadows: boolean;
}

interface PersistedWorkspace {
  projects: Project[];
  documents: RawDocument[];
  activeProjectId: string;
  activeScenarioId: string;
  activeModule: ModuleId;
  navCollapsed: boolean;
  scene: SceneSettings;
  display: { compact: boolean; reduceMotion: boolean };
  lastSavedAt: string;
}

interface NewScenarioInput {
  name: string;
  kind: ScenarioKind;
  description?: string;
}

interface ImportResult {
  ok: boolean;
  message: string;
  count: number;
}

interface AppState {
  projects: Project[];
  documents: RawDocument[];
  activeProjectId: string;
  activeScenarioId: string;
  activeModule: ModuleId;
  selectedCellId: string | null;
  operationYearIndex: number | null;
  navCollapsed: boolean;
  mobileNavOpen: boolean;
  scene: SceneSettings;
  display: { compact: boolean; reduceMotion: boolean };
  activeDialog: "new-project" | "new-scenario" | "help" | null;
  toasts: Toast[];
  lastSavedAt: string;
  revision: number;

  setModule: (module: ModuleId) => void;
  setActiveProject: (id: string) => void;
  setActiveScenario: (id: string) => void;
  setSelectedCell: (id: string | null) => void;
  setOperationYear: (index: number | null) => void;
  toggleNav: () => void;
  setMobileNav: (open: boolean) => void;
  setDialog: (dialog: AppState["activeDialog"]) => void;
  setScene: (patch: Partial<SceneSettings>) => void;
  setView: (view: SceneView) => void;
  resetScene: () => void;
  setDisplay: (patch: Partial<AppState["display"]>) => void;

  updateProjectMeta: (patch: Partial<Project>) => void;
  updateSite: (patch: Partial<SiteData>) => void;
  updateScenarioMeta: (patch: Partial<Pick<Scenario, "name" | "description" | "color" | "kind">>) => void;
  updateScenarioParams: (recipe: (draft: ScenarioParams) => void) => void;
  setHorizon: (years: number) => void;
  updateCell: (cellId: string, patch: Partial<CellConfig>) => void;
  addCell: () => void;
  duplicateCell: (cellId: string) => void;
  deleteCell: (cellId: string) => void;
  reorderCell: (cellId: string, direction: -1 | 1) => void;
  addLayer: () => void;
  updateLayer: (layerId: string, patch: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;

  createProject: (input: NewProjectInput) => string;
  duplicateProject: (id: string) => string | null;
  archiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  restoreDemos: () => number;
  importProjectData: (payload: unknown) => ImportResult;
  resetWorkspace: () => void;

  addScenario: (input: NewScenarioInput) => string | null;
  duplicateScenario: (id: string) => string | null;
  deleteScenario: (id: string) => void;
  setBaseScenario: (id: string) => void;
  resetScenarioToBase: () => void;

  addDocument: (doc: RawDocument) => void;
  updateDocument: (id: string, patch: Partial<RawDocument>) => void;
  deleteDocument: (id: string) => void;
  resetDocuments: () => void;

  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const DEFAULT_SCENE: SceneSettings = {
  view: "iso",
  viewNonce: 0,
  showTerrain: true,
  showWaste: true,
  showLiner: true,
  showPipes: true,
  showWells: true,
  showFlare: true,
  showRoads: true,
  showBuildings: true,
  showDrainage: true,
  showPonds: true,
  showGasNetwork: true,
  showMonitoring: true,
  showFence: true,
  showVegetation: true,
  showLabels: true,
  showContours: true,
  showGrid: true,
  clipEnabled: false,
  clipPosition: 0.5,
  explode: 0,
  layerExaggeration: 8,
  autoRotate: false,
  animFlow: true,
  animGas: true,
  shadows: true,
};

const FIRST_PROJECTS = demoProjects();
const stamp = () => new Date().toISOString();

function findProject(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

function fallbackScenario(project: Project, scenarioId: string): Scenario {
  return project.scenarios.find((s) => s.id === scenarioId) ?? project.scenarios.find((s) => s.isBase) ?? project.scenarios[0];
}

function normalizeImportedProject(value: unknown, existingIds: Set<string>): Project | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Project>;
  if (typeof candidate.name !== "string" || !Array.isArray(candidate.scenarios) || candidate.scenarios.length === 0) return null;
  if (!candidate.scenarios.every((s) => s && typeof s === "object" && "params" in s)) return null;
  const clone = structuredClone(candidate) as Project;
  clone.id = existingIds.has(clone.id) ? uid("prj") : clone.id || uid("prj");
  clone.scenarios = clone.scenarios.map((s) => ({
    ...s,
    id: uid("scn"),
    isBase: Boolean(s.isBase),
  }));
  if (!clone.scenarios.some((s) => s.isBase)) clone.scenarios[0].isBase = true;
  clone.archived = Boolean(clone.archived);
  clone.isDemo = false;
  clone.updatedAt = stamp();
  clone.createdAt = clone.createdAt || stamp();
  clone.horizonYears = Math.min(60, Math.max(5, Number(clone.horizonYears) || 20));
  return clone;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: FIRST_PROJECTS,
      documents: DEFAULT_DOCUMENTS,
      activeProjectId: FIRST_PROJECTS[0].id,
      activeScenarioId: FIRST_PROJECTS[0].scenarios.find((s) => s.isBase)?.id ?? FIRST_PROJECTS[0].scenarios[0].id,
      activeModule: "inicio",
      selectedCellId: null,
      operationYearIndex: null,
      navCollapsed: false,
      mobileNavOpen: false,
      scene: DEFAULT_SCENE,
      display: { compact: false, reduceMotion: false },
      activeDialog: null,
      toasts: [],
      lastSavedAt: stamp(),
      revision: 0,

      setModule: (module) => set({ activeModule: module, mobileNavOpen: false, activeDialog: null }),
      setActiveProject: (id) =>
        set((state) => {
          const project = findProject(state.projects, id);
          if (!project) return state;
          const scenario = project.scenarios.find((s) => s.isBase) ?? project.scenarios[0];
          return {
            activeProjectId: id,
            activeScenarioId: scenario.id,
            selectedCellId: null,
            operationYearIndex: null,
            activeModule: state.activeModule === "inicio" ? "emplazamiento" : state.activeModule,
            revision: state.revision + 1,
          };
        }),
      setActiveScenario: (id) =>
        set((state) => {
          const project = findProject(state.projects, state.activeProjectId);
          if (!project?.scenarios.some((s) => s.id === id)) return state;
          return { activeScenarioId: id, operationYearIndex: null, selectedCellId: null, revision: state.revision + 1 };
        }),
      setSelectedCell: (id) => set({ selectedCellId: id }),
      setOperationYear: (index) => set({ operationYearIndex: index }),
      toggleNav: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      setDialog: (dialog) => set({ activeDialog: dialog }),
      setScene: (patch) => set((state) => ({ scene: { ...state.scene, ...patch } })),
      setView: (view) => set((state) => ({ scene: { ...state.scene, view, viewNonce: state.scene.viewNonce + 1 } })),
      resetScene: () => set((state) => ({ scene: { ...DEFAULT_SCENE, viewNonce: state.scene.viewNonce + 1 } })),
      setDisplay: (patch) => set((state) => ({ display: { ...state.display, ...patch } })),

      updateProjectMeta: (patch) =>
        set((state) => {
          const now = stamp();
          const projects = state.projects.map((p) => {
            if (p.id !== state.activeProjectId) return p;
            const next = { ...p, ...patch, updatedAt: now };
            if (
              patch.country !== undefined ||
              patch.region !== undefined ||
              patch.location !== undefined ||
              patch.latitude !== undefined ||
              patch.longitude !== undefined
            ) {
              next.scenarios = p.scenarios.map((s) =>
                s.id === state.activeScenarioId
                  ? {
                      ...s,
                      params: {
                        ...s.params,
                        site: {
                          ...s.params.site,
                          country: patch.country ?? s.params.site.country,
                          region: patch.region ?? s.params.site.region,
                          location: patch.location ?? s.params.site.location,
                          latitude: patch.latitude !== undefined ? patch.latitude : s.params.site.latitude,
                          longitude: patch.longitude !== undefined ? patch.longitude : s.params.site.longitude,
                        },
                      },
                    }
                  : s,
              );
            }
            return next;
          });
          return { projects, lastSavedAt: now, revision: state.revision + 1 };
        }),

      updateSite: (patch) =>
        set((state) => {
          const now = stamp();
          const projects = state.projects.map((p) =>
            p.id !== state.activeProjectId
              ? p
              : {
                  ...p,
                  country: patch.country ?? p.country,
                  region: patch.region ?? p.region,
                  location: patch.location ?? p.location,
                  latitude: patch.latitude !== undefined ? patch.latitude : p.latitude,
                  longitude: patch.longitude !== undefined ? patch.longitude : p.longitude,
                  updatedAt: now,
                  scenarios: p.scenarios.map((s) =>
                    s.id === state.activeScenarioId
                      ? { ...s, params: { ...s.params, site: { ...s.params.site, ...patch } } }
                      : s,
                  ),
                },
          );
          return { projects, lastSavedAt: now, revision: state.revision + 1 };
        }),

      updateScenarioMeta: (patch) =>
        set((state) => {
          const now = stamp();
          return {
            lastSavedAt: now,
            revision: state.revision + 1,
            projects: state.projects.map((p) =>
              p.id !== state.activeProjectId
                ? p
                : {
                    ...p,
                    updatedAt: now,
                    scenarios: p.scenarios.map((s) => (s.id === state.activeScenarioId ? { ...s, ...patch } : s)),
                  },
            ),
          };
        }),

      updateScenarioParams: (recipe) =>
        set((state) => {
          const now = stamp();
          return {
            lastSavedAt: now,
            revision: state.revision + 1,
            projects: state.projects.map((p) =>
              p.id !== state.activeProjectId
                ? p
                : {
                    ...p,
                    updatedAt: now,
                    scenarios: p.scenarios.map((s) =>
                      s.id !== state.activeScenarioId ? s : { ...s, params: produce(s.params, recipe) },
                    ),
                  },
            ),
          };
        }),

      setHorizon: (years) =>
        set((state) => ({
          lastSavedAt: stamp(),
          revision: state.revision + 1,
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId
              ? { ...p, horizonYears: Math.min(60, Math.max(5, Math.round(years))), updatedAt: stamp() }
              : p,
          ),
        })),

      updateCell: (cellId, patch) =>
        get().updateScenarioParams((draft) => {
          const cell = draft.geometry.cells.find((c) => c.id === cellId);
          if (cell) Object.assign(cell, patch);
        }),

      addCell: () =>
        set((state) => {
          const now = stamp();
          return {
            lastSavedAt: now,
            revision: state.revision + 1,
            projects: state.projects.map((p) => {
              if (p.id !== state.activeProjectId) return p;
              return {
                ...p,
                updatedAt: now,
                scenarios: p.scenarios.map((s) => {
                  if (s.id !== state.activeScenarioId) return s;
                  const cells = s.params.geometry.cells;
                  const last = cells[cells.length - 1];
                  const index = cells.length;
                  const newCell: CellConfig = last
                    ? {
                        ...structuredClone(last),
                        id: uid("cell"),
                        name: `Celda ${String.fromCharCode(65 + (index % 26))}${index >= 26 ? index : ""}`,
                        sequenceOrder: index + 1,
                      }
                    : {
                        id: uid("cell"),
                        name: "Celda A",
                        method: "area",
                        shape: "excavated",
                        bottomLengthM: 90,
                        bottomWidthM: 60,
                        heightM: 10,
                        slopeHtoV: 2.5,
                        excavationDepthM: 4,
                        baseElevationM: s.params.geometry.terrainBaseElevationM - 4,
                        bermCount: 1,
                        bermWidthM: 3,
                        sequenceOrder: 1,
                        notes: "",
                      };
                  return {
                    ...s,
                    params: {
                      ...s.params,
                      geometry: { ...s.params.geometry, cells: [...cells, newCell] },
                    },
                  };
                }),
              };
            }),
          };
        }),

      duplicateCell: (cellId) =>
        set((state) => {
          const now = stamp();
          return {
            lastSavedAt: now,
            revision: state.revision + 1,
            projects: state.projects.map((p) => {
              if (p.id !== state.activeProjectId) return p;
              return {
                ...p,
                updatedAt: now,
                scenarios: p.scenarios.map((s) => {
                  if (s.id !== state.activeScenarioId) return s;
                  const cells = s.params.geometry.cells;
                  const original = cells.find((c) => c.id === cellId);
                  if (!original) return s;
                  const copy: CellConfig = {
                    ...structuredClone(original),
                    id: uid("cell"),
                    name: `${original.name} copia`.slice(0, 24),
                    sequenceOrder: cells.length + 1,
                  };
                  return {
                    ...s,
                    params: { ...s.params, geometry: { ...s.params.geometry, cells: [...cells, copy] } },
                  };
                }),
              };
            }),
          };
        }),

      deleteCell: (cellId) =>
        set((state) => {
          const now = stamp();
          return {
            activeProjectId: state.activeProjectId,
            selectedCellId: state.selectedCellId === cellId ? null : state.selectedCellId,
            lastSavedAt: now,
            revision: state.revision + 1,
            projects: state.projects.map((p) => {
              if (p.id !== state.activeProjectId) return p;
              return {
                ...p,
                updatedAt: now,
                scenarios: p.scenarios.map((s) => {
                  if (s.id !== state.activeScenarioId) return s;
                  const cells = s.params.geometry.cells.filter((c) => c.id !== cellId).map((c, i) => ({ ...c, sequenceOrder: i + 1 }));
                  return { ...s, params: { ...s.params, geometry: { ...s.params.geometry, cells } } };
                }),
              };
            }),
          };
        }),

      reorderCell: (cellId, direction) =>
        get().updateScenarioParams((draft) => {
          const sorted = [...draft.geometry.cells].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
          const index = sorted.findIndex((c) => c.id === cellId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= sorted.length) return;
          const [moved] = sorted.splice(index, 1);
          sorted.splice(target, 0, moved);
          draft.geometry.cells = sorted.map((c, i) => ({ ...c, sequenceOrder: i + 1 }));
        }),

      addLayer: () =>
        get().updateScenarioParams((draft) => {
          draft.geometry.layers.push({
            id: uid("layer"),
            name: "Nueva capa",
            category: "protection",
            thicknessMm: 200,
            material: "Definir material",
            function: "Definir función",
            notes: "",
            reference: "Sin referencia declarada",
            enabled: true,
          });
        }),

      updateLayer: (layerId, patch) =>
        get().updateScenarioParams((draft) => {
          const layer = draft.geometry.layers.find((l) => l.id === layerId);
          if (layer) Object.assign(layer, patch);
        }),

      deleteLayer: (layerId) =>
        get().updateScenarioParams((draft) => {
          draft.geometry.layers = draft.geometry.layers.filter((l) => l.id !== layerId);
        }),

      createProject: (input) => {
        const project = buildProject(input);
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
          activeScenarioId: project.scenarios.find((s) => s.isBase)?.id ?? project.scenarios[0].id,
          activeModule: "emplazamiento",
          activeDialog: null,
          selectedCellId: null,
          operationYearIndex: null,
          lastSavedAt: stamp(),
          revision: state.revision + 1,
        }));
        get().pushToast({ kind: "ok", title: "Proyecto creado", detail: "Complete los datos del emplazamiento y verifique las alertas." });
        return project.id;
      },

      duplicateProject: (id) => {
        const source = findProject(get().projects, id);
        if (!source) return null;
        const copy = structuredClone(source);
        copy.id = uid("prj");
        copy.name = `${source.name} — copia`;
        copy.isDemo = false;
        copy.archived = false;
        copy.createdAt = stamp();
        copy.updatedAt = stamp();
        copy.scenarios = copy.scenarios.map((s) => ({ ...s, id: uid("scn") }));
        set((state) => ({ projects: [copy, ...state.projects], lastSavedAt: stamp(), revision: state.revision + 1 }));
        get().pushToast({ kind: "ok", title: "Proyecto duplicado", detail: copy.name });
        return copy.id;
      },

      archiveProject: (id) =>
        set((state) => ({
          lastSavedAt: stamp(),
          projects: state.projects.map((p) => (p.id === id ? { ...p, archived: !p.archived, updatedAt: stamp() } : p)),
        })),

      deleteProject: (id) =>
        set((state) => {
          const remaining = state.projects.filter((p) => p.id !== id);
          const projects = remaining.length ? remaining : [blankProject()];
          const active = projects.find((p) => p.id === state.activeProjectId) ?? projects[0];
          const scenario = fallbackScenario(active, state.activeProjectId === active.id ? state.activeScenarioId : "");
          return {
            projects,
            activeProjectId: active.id,
            activeScenarioId: scenario.id,
            selectedCellId: null,
            operationYearIndex: null,
            lastSavedAt: stamp(),
            revision: state.revision + 1,
          };
        }),

      restoreDemos: () => {
        const current = get().projects;
        const existingNames = new Set(current.map((p) => p.name));
        const additions = demoProjects().filter((p) => !existingNames.has(p.name));
        if (additions.length) {
          set((state) => ({
            projects: [...additions, ...state.projects],
            lastSavedAt: stamp(),
            revision: state.revision + 1,
          }));
        }
        return additions.length;
      },

      importProjectData: (payload) => {
        try {
          const raw = payload as { project?: unknown; projects?: unknown[]; data?: unknown };
          const candidates: unknown[] = raw?.projects
            ? raw.projects
            : Array.isArray(payload)
              ? payload
              : raw?.project
                ? [raw.project]
                : [payload];
          const existing = new Set(get().projects.map((p) => p.id));
          const imported = candidates
            .map((c) => normalizeImportedProject(c, existing))
            .filter((p): p is Project => Boolean(p));
          if (!imported.length) {
            return { ok: false, message: "El archivo no contiene un proyecto reconocible de Green Owl Landfill 3D.", count: 0 };
          }
          set((state) => ({
            projects: [...imported, ...state.projects],
            activeProjectId: imported[0].id,
            activeScenarioId: imported[0].scenarios.find((s) => s.isBase)?.id ?? imported[0].scenarios[0].id,
            activeModule: "inicio",
            lastSavedAt: stamp(),
            revision: state.revision + 1,
          }));
          return { ok: true, message: `${imported.length} proyecto(s) importado(s).`, count: imported.length };
        } catch (error) {
          return { ok: false, message: `No se pudo leer el archivo: ${(error as Error).message}`, count: 0 };
        }
      },

      resetWorkspace: () => {
        const projects = demoProjects();
        set({
          projects,
          documents: DEFAULT_DOCUMENTS,
          activeProjectId: projects[0].id,
          activeScenarioId: projects[0].scenarios.find((s) => s.isBase)?.id ?? projects[0].scenarios[0].id,
          activeModule: "inicio",
          selectedCellId: null,
          operationYearIndex: null,
          lastSavedAt: stamp(),
          revision: 0,
        });
      },

      addScenario: (input) => {
        const state = get();
        const project = findProject(state.projects, state.activeProjectId);
        const active = project ? fallbackScenario(project, state.activeScenarioId) : null;
        if (!project || !active) return null;
        const params =
          input.kind === "personalizado"
            ? structuredClone(active.params)
            : structuredClone(
                standardScenarios(active.params, active.params.operation.startYear).find((s) => s.kind === input.kind)?.params ??
                  active.params,
              );
        const scenario = makeScenario(input.name.trim() || "Escenario", input.kind, params);
        scenario.isBase = false;
        scenario.description = input.description?.trim() || scenario.description;
        const nameExists = project.scenarios.some((s) => s.name.toLowerCase() === scenario.name.toLowerCase());
        if (nameExists) scenario.name = `${scenario.name} (${project.scenarios.length + 1})`;
        set((s) => ({
          lastSavedAt: stamp(),
          revision: s.revision + 1,
          activeScenarioId: scenario.id,
          activeDialog: null,
          operationYearIndex: null,
          projects: s.projects.map((p) =>
            p.id !== state.activeProjectId ? p : { ...p, scenarios: [...p.scenarios, scenario], updatedAt: stamp() },
          ),
        }));
        get().pushToast({ kind: "ok", title: "Escenario creado", detail: `${scenario.name} parte del escenario activo.` });
        return scenario.id;
      },

      duplicateScenario: (id) => {
        const state = get();
        const project = findProject(state.projects, state.activeProjectId);
        const source = project?.scenarios.find((s) => s.id === id);
        if (!project || !source) return null;
        const copy: Scenario = {
          ...structuredClone(source),
          id: uid("scn"),
          name: `${source.name} — copia`,
          isBase: false,
          kind: source.kind === "base" ? "personalizado" : source.kind,
        };
        set((s) => ({
          lastSavedAt: stamp(),
          revision: s.revision + 1,
          activeScenarioId: copy.id,
          projects: s.projects.map((p) =>
            p.id !== state.activeProjectId ? p : { ...p, scenarios: [...p.scenarios, copy], updatedAt: stamp() },
          ),
        }));
        return copy.id;
      },

      deleteScenario: (id) =>
        set((state) => {
          const project = findProject(state.projects, state.activeProjectId);
          if (!project) return state;
          const scenario = project.scenarios.find((s) => s.id === id);
          if (!scenario || scenario.isBase || project.scenarios.length <= 1) return state;
          const remaining = project.scenarios.filter((s) => s.id !== id);
          const activeScenarioId = state.activeScenarioId === id ? (remaining.find((s) => s.isBase) ?? remaining[0]).id : state.activeScenarioId;
          return {
            activeScenarioId,
            lastSavedAt: stamp(),
            revision: state.revision + 1,
            projects: state.projects.map((p) =>
              p.id !== state.activeProjectId ? p : { ...p, scenarios: remaining, updatedAt: stamp() },
            ),
          };
        }),

      setBaseScenario: (id) =>
        set((state) => {
          const project = findProject(state.projects, state.activeProjectId);
          if (!project || !project.scenarios.some((s) => s.id === id)) return state;
          return {
            lastSavedAt: stamp(),
            revision: state.revision + 1,
            projects: state.projects.map((p) =>
              p.id !== state.activeProjectId
                ? p
                : { ...p, scenarios: p.scenarios.map((s) => ({ ...s, isBase: s.id === id })), updatedAt: stamp() },
            ),
          };
        }),

      resetScenarioToBase: () =>
        set((state) => {
          const project = findProject(state.projects, state.activeProjectId);
          if (!project) return state;
          const base = project.scenarios.find((s) => s.isBase);
          if (!base) return state;
          return {
            lastSavedAt: stamp(),
            revision: state.revision + 1,
            projects: state.projects.map((p) =>
              p.id !== state.activeProjectId
                ? p
                : {
                    ...p,
                    scenarios: p.scenarios.map((s) =>
                      s.id === state.activeScenarioId && !s.isBase
                        ? { ...s, params: structuredClone(base.params) }
                        : s,
                    ),
                  },
            ),
          };
        }),

      addDocument: (doc) =>
        set((state) => ({ documents: [doc, ...state.documents], lastSavedAt: stamp(), revision: state.revision + 1 })),
      updateDocument: (id, patch) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
          lastSavedAt: stamp(),
          revision: state.revision + 1,
        })),
      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          lastSavedAt: stamp(),
          revision: state.revision + 1,
        })),
      resetDocuments: () =>
        set({ documents: DEFAULT_DOCUMENTS, lastSavedAt: stamp(), revision: get().revision + 1 }),

      pushToast: (toast) => {
        const id = uid("toast");
        set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }));
        if (typeof window !== "undefined") {
          window.setTimeout(() => get().dismissToast(id), 4200);
        }
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "green-owl-landfill-3d",
      version: 3,
      skipHydration: true,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedWorkspace;
        let next = state;
        if (version < 2) {
          next = { ...next, documents: reconcileDocuments(next.documents) };
        }
        if (version < 3) {
          next = { ...next, scene: { ...DEFAULT_SCENE, ...(next.scene ?? {}) } };
        }
        return next;
      },
      partialize: (state) => ({
        projects: state.projects,
        documents: state.documents,
        activeProjectId: state.activeProjectId,
        activeScenarioId: state.activeScenarioId,
        activeModule: state.activeModule,
        navCollapsed: state.navCollapsed,
        scene: state.scene,
        display: state.display,
        lastSavedAt: state.lastSavedAt,
      }),
    },
  ),
);

export function hydrateStore(): void {
  if (typeof window === "undefined") return;
  void useStore.persist.rehydrate();
}

export function useActiveProject(): Project {
  return useStore((state) => state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0]);
}

export function useActiveScenario(): Scenario {
  const project = useActiveProject();
  const scenarioId = useStore((state) => state.activeScenarioId);
  return project.scenarios.find((s) => s.id === scenarioId) ?? project.scenarios.find((s) => s.isBase) ?? project.scenarios[0];
}

export function useProjectStorageLabel(): string {
  return useStore((state) => (state.activeScenarioId ? "local" : "local"));
}

export function storageEstimate(projects: Project[], documents: RawDocument[]): number {
  try {
    return new Blob([JSON.stringify({ projects, documents })]).size;
  } catch {
    return JSON.stringify({ projects, documents }).length;
  }
}
