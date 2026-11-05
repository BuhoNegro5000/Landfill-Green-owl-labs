"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Project, Scenario } from "@/lib/types";
import { computeModel, scenarioSummary, type ComputedModel, type ScenarioSummary } from "@/lib/engine/model";
import { useActiveProject, useActiveScenario } from "@/lib/store";

interface ModelContextValue {
  project: Project;
  scenario: Scenario;
  model: ComputedModel;
  error: string | null;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const project = useActiveProject();
  const scenario = useActiveScenario();

  const value = useMemo<ModelContextValue>(() => {
    try {
      return { project, scenario, model: computeModel(project, scenario), error: null };
    } catch (error) {
      // The engine should not throw on user input; if it does, surface it instead of
      // leaving the whole workspace blank.
      const fallback = computeModel(project, project.scenarios.find((s) => s.isBase) ?? project.scenarios[0]);
      return {
        project,
        scenario,
        model: fallback,
        error: `No se pudo calcular este escenario: ${(error as Error).message}. Se muestra el escenario base.`,
      };
    }
  }, [project, scenario]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel(): ModelContextValue {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel debe usarse dentro de ModelProvider");
  return ctx;
}

export function useScenarioSummaries(): ScenarioSummary[] {
  const project = useActiveProject();
  return useMemo(() => project.scenarios.map((s) => scenarioSummary(project, s)), [project]);
}
