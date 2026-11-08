import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const NAV_LABELS = [
  "Proyectos",
  "Emplazamiento",
  "Modelo 3D",
  "Celdas y capas",
  "Capacidad",
  "Residuos",
  "Lixiviados",
  "Biogás",
  "Operación",
  "Geotecnia",
  "Clausura",
  "Escenarios",
  "Sensibilidad",
  "Resultados",
  "Informes",
  "Métodos",
  "Normativa",
  "Configuración",
];

function navRail(page: Page): Locator {
  return page.getByRole("complementary", { name: "Navegación del laboratorio" });
}

function navItem(page: Page, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return navRail(page).getByRole("button", { name: new RegExp(`^${escaped}`) });
}

async function enterLab(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar al laboratorio" }).click();
  await expect(page.locator("main.workspace")).toBeVisible();
  await expect(navRail(page)).toBeVisible();
}

async function openModule(page: Page, label: string): Promise<void> {
  const item = navItem(page, label);
  await item.click();
  await expect(item).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".breadcrumb strong")).toHaveText(label);
  await expect(page.locator(".module-content")).toBeVisible();
}

function kpi(page: Page, label: string): Locator {
  return page.locator(".kpi").filter({
    has: page.locator(".kpi-label", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }),
  });
}

test("arranque: el splash verifica componentes y entra al laboratorio", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1.splash-title")).toContainText("Diseño que se puede");
  await expect(page.locator("h1.splash-title")).toContainText("verificar.");
  await expect(page.getByText("Verificación de arranque")).toBeVisible();
  await expect(page.getByText("Sistema listo")).toBeVisible();

  await page.getByRole("button", { name: "Entrar al laboratorio" }).click();

  await expect(page.locator("main.workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proyectos de relleno sanitario" })).toBeVisible();
  await expect(page.getByText("Persistencia local · sin backend")).toBeVisible();
  await expect(navRail(page).getByRole("img", { name: "Green Owl Labs" })).toBeVisible();
});

test("navegación: los 18 módulos abren su encabezado sin errores", async ({ page }) => {
  await enterLab(page);

  for (const label of NAV_LABELS) {
    await openModule(page, label);
  }

  await expect(navItem(page, "Configuración")).toHaveAttribute("aria-current", "page");
});

test("contexto: el cambio de proyecto y escenario persiste tras recargar", async ({ page }) => {
  await enterLab(page);

  const projectSwitcher = page.locator(".switcher-button").filter({ hasText: "Proyecto" }).first();
  await expect(projectSwitcher).toContainText("Relleno Sanitario Valle Verde");
  await projectSwitcher.click();
  await page.locator(".switcher-item").filter({ hasText: "Relleno Mecanizado La Ceiba" }).click();
  await expect(projectSwitcher).toContainText("Relleno Mecanizado La Ceiba");

  const scenarioSwitcher = page.locator(".switcher-button").filter({ hasText: "Escenario" }).first();
  await scenarioSwitcher.click();
  await page.locator(".switcher-item").filter({ hasText: "Conservador" }).click();
  await expect(scenarioSwitcher).toContainText("Conservador");

  await page.reload();
  await page.getByRole("button", { name: "Entrar al laboratorio" }).click();
  await expect(page.locator("main.workspace")).toBeVisible();

  await expect(page.locator(".switcher-button").filter({ hasText: "Proyecto" }).first()).toContainText(
    "Relleno Mecanizado La Ceiba",
  );
  await expect(page.locator(".switcher-button").filter({ hasText: "Escenario" }).first()).toContainText("Conservador");
});

test("normativa: 13 documentos con estado verificado y fuente oficial", async ({ page }) => {
  await enterLab(page);
  await openModule(page, "Normativa");

  await expect(page.getByRole("heading", { name: "Biblioteca documental" })).toBeVisible();
  await expect(kpi(page, "Documentos").locator(".kpi-value")).toHaveText("13");
  await expect(kpi(page, "Vigentes verificados").locator(".kpi-value")).toHaveText("8");
  await expect(kpi(page, "Verificación pendiente").locator(".kpi-value")).toHaveText("1");
  await expect(kpi(page, "Referencias históricas").locator(".kpi-value")).toHaveText("4");

  const table = page.locator("table.data-table");
  await expect(table.locator("tbody tr")).toHaveCount(13);

  const rowByTitle = (title: RegExp) =>
    table.locator("tbody tr").filter({ has: page.locator("td strong", { hasText: title }) });

  const ley32212 = rowByTitle(/^Ley que modifica el D\.L\. 1278/);
  await expect(ley32212).toContainText("Vigente verificado");
  await expect(ley32212.getByRole("link", { name: /Abrir fuente de/ })).toHaveAttribute(
    "href",
    "https://busquedas.elperuano.pe/dispositivo/NL/2356497-1",
  );

  const reglamento = rowByTitle(/^Reglamento del Decreto Legislativo N\.° 1278$/);
  await expect(reglamento).toContainText("Vigente verificado");
  await expect(reglamento.getByRole("link", { name: /Abrir fuente de/ })).toHaveAttribute(
    "href",
    "https://www.gob.pe/institucion/minam/normas-legales/3695-014-2017-minam",
  );

  await page.getByLabel("Estado").selectOption("referencia-historica");
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(table).toContainText("Ley N.° 27314");
  await expect(table).toContainText("Guía de Diseño, Construcción, Operación, Mantenimiento y Cierre de Relleno Sanitario Mecanizado");
});

test("respaldo: la exportación JSON contiene proyectos y biblioteca normativa", async ({ page }) => {
  await enterLab(page);
  await openModule(page, "Configuración");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar respaldo completo", exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^green-owl-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const payload = JSON.parse(await readFile(filePath!, "utf8")) as {
    format: string;
    projects: unknown[];
    documents: Array<{ accessedAt: string }>;
  };

  expect(payload.format).toBe("green-owl-landfill-3d-backup");
  expect(payload.projects).toHaveLength(3);
  expect(payload.documents).toHaveLength(13);
  expect(payload.documents.every((doc) => doc.accessedAt === "2026-11-04")).toBe(true);
});

test("navegación: la barra contraída se puede expandir de nuevo", async ({ page }) => {
  await enterLab(page);

  await page.getByRole("button", { name: "Contraer navegación" }).click();
  await expect(page.locator(".app-root")).toHaveClass(/nav-collapsed/);

  const expand = page.getByRole("button", { name: "Expandir navegación" });
  await expect(expand).toBeVisible();
  await expand.click();

  await expect(page.locator(".app-root")).not.toHaveClass(/nav-collapsed/);
  await expect(page.getByRole("button", { name: "Contraer navegación" })).toBeVisible();
});

test("métodos: cambiar el método de una celda altera geometría, volumen y balance de tierras", async ({ page }) => {
  await enterLab(page);
  await openModule(page, "Celdas y capas");

  const volumeKpi = kpi(page, "Volumen bruto");
  const balanceKpi = kpi(page, "Balance de tierras");
  const volumeBefore = await volumeKpi.locator(".kpi-value").innerText();
  const balanceBefore = await balanceKpi.locator(".kpi-value").innerText();

  const table = page.locator("table.data-table");
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow).toContainText("Área");
  await expect(firstRow).toContainText(/0[.,]0 \/ 12[.,]0 m/);

  const editor = page.locator("section.panel").filter({ hasText: "Edición ·" });
  const methodSelect = editor.getByLabel("Método constructivo");
  await expect(methodSelect).toHaveValue("area");
  await methodSelect.selectOption("ramp");

  await expect(methodSelect).toHaveValue("ramp");
  await expect(firstRow).toContainText("Rampa");
  await expect(firstRow).toContainText(/5[.,]4 \/ 6[.,]6 m/);
  await expect(editor.getByText("Rampa (ancho / pendiente / longitud)")).toBeVisible();
  await expect(editor.getByText(/6[.,]0 m \/ 8[.,]0 % \/ 67[.,]5 m/)).toBeVisible();
  await expect(editor.getByText("Método coherente: Rampa / combinado")).toBeVisible();

  await expect
    .poll(async () => volumeKpi.locator(".kpi-value").innerText())
    .not.toBe(volumeBefore);
  await expect
    .poll(async () => balanceKpi.locator(".kpi-value").innerText())
    .not.toBe(balanceBefore);

  await page.reload();
  await page.getByRole("button", { name: "Entrar al laboratorio" }).click();
  await expect(page.locator("main.workspace")).toBeVisible();
  await openModule(page, "Celdas y capas");
  await expect(table.locator("tbody tr").first()).toContainText("Rampa");
});

test.describe("responsive", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("móvil: el menú lateral abre, navega y se cierra", async ({ page }) => {
    await enterLab(page);

    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(page.locator(".app-root")).toHaveClass(/mobile-nav-open/);

    await openModule(page, "Normativa");
    await expect(page.getByRole("heading", { name: "Biblioteca documental" })).toBeVisible();
    await expect(page.locator(".app-root")).not.toHaveClass(/mobile-nav-open/);
  });
});
