# Arquitectura de implementación

**Green Owl Landfill 3D 1.0.0 · GO-ENGINE 1.0.0**

Este documento describe cómo está construida la aplicación: capas, flujo de datos, límites entre cálculo e interfaz, persistencia, visor 3D, generación de informes, pruebas y mapa de archivos.

El principio rector es una separación estricta:

```text
Datos del proyecto y escenario
        ↓
Motor de cálculo puro (TypeScript, sin React)
        ↓
Resultados tipados + hallazgos de validación
        ↓
Interfaz · Visor 3D · Exportaciones · Informe PDF
```

La interfaz **no calcula** indicadores de ingeniería. Solo presenta resultados del motor y envía cambios de parámetros al store.

---

## 1. Capas de la aplicación

| Capa | Ubicación | Responsabilidad | Depende de |
|---|---|---|---|
| Entrada Next.js | `app/` | Documento HTML, metadatos, estilos globales. | — |
| Arranque e hidratación | `components/AppRoot.tsx`, `Splash.tsx` | Rehidratar `localStorage`, mostrar comprobaciones y entrar al espacio de trabajo. | Store |
| Estado global | `lib/store.ts` | Proyectos, escenarios, documentos, preferencias, acciones e importación. | Zustand, Immer, defaults |
| Contexto de modelo | `components/ModelProvider.tsx` | Calcular una vez por proyecto/escenario y compartir el resultado. | Motor |
| Motor | `lib/engine/` | Geometría, capacidad, residuos, lixiviados, biogás, geotecnia, clausura, costos, validación, sensibilidad. | Solo TypeScript |
| Verificación de localización | `lib/siteSelection.ts` | Criterios, exclusiones y evaluación declarativa del sitio (R.M. 165-2021 / art. 110). | Solo TypeScript |
| Interfaz | `components/shell/`, `components/modules/` | Navegación, formularios, tablas, gráficos, diálogos. | Store, contexto, UI |
| Visor 3D | `components/scene/`, `lib/sceneLayout.ts`, `lib/sceneBridge.ts` | Celdas, capas, avance del llenado, infraestructura auxiliar y captura PNG. | Three.js, resultados |
| Informes | `lib/report.ts` | PDF local de 19 secciones con jsPDF + autotable. | Motor, métodos, normativa |
| Exportaciones | `lib/exporters.ts` | JSON, respaldo, CSV y descargas reales. | Motor, store |
| Pruebas | `tests/engine.test.ts`, `lib/selfTest.ts` | Regresión numérica y autopruebas en vivo. | Motor |

---

## 2. Flujo de cálculo

### 2.1 Orquestación

`lib/engine/model.ts` expone dos funciones principales:

- `computeCore(params, horizonYears)`: ejecuta el pipeline sin validación.
- `computeModel(project, scenario)`: ejecuta `computeCore` y añade `validateModel()` y `engineVersion`.
- `scenarioSummary(project, scenario)`: versión reducida para comparar escenarios y alimentar tablas.

Orden del pipeline en `computeCore`:

```text
computeGeometry(params.geometry)
        ↓
computeCapacity(geometría, capas, residuos, descuentos)
        ↓
computeWasteBalance(residuos, capacidad, celdas, año inicial, horizonte)
        ↓  (refleja el llenado simulado en las celdas de capacidad)
computeClosure(params, geometría, volumen de cobertura, año de agotamiento)
        ↓
computeLeachate(sitio, lixiviados, residuos, geometría, parámetros, frente)
        ↓
computeGeotech(parámetros con talud promedio ponderado)
        ↓
computeGas(parámetros, residuos, año de cierre)
        ↓
buildOperation(residuos, año de cierre, posclausura)
        ↓
computeCosts(residuos, lixiviados, biogás)
        ↓
computeSiteCompleteness(sitio)
        ↓
assessSiteSelection(sitio)        ← criterios, exclusiones y restricciones duras
        ↓
validateModel(...)   ← solo en computeModel
```

### 2.2 Contratos entre módulos

Cada motor recibe primitivas o subobjetos tipados y devuelve una interfaz exportada:

| Motor | Entrada principal | Salida |
|---|---|---|
| `geometry.ts` | `GeometryParams` | `GeometryResult` con celdas, capas, perfil, corte/relleno y rampa |
| `cellMethods.ts` | `CellConfig`, método declarado | especificación, preset, método efectivo y verificaciones |
| `capacity.ts` | `GeometryResult`, capas, `WasteParams` | `CapacityResult` con volumen de diseño, borde libre, tierras y tonelaje |
| `waste.ts` | `WasteParams`, `CapacityResult`, celdas | `WasteResult` con serie anual y asignación por celda |
| `leachate.ts` | sitio, `LeachateParams`, `WasteResult` | `LeachateResult` con balance, caudales y dimensionamiento |
| `gas.ts` | `GasParams`, `WasteResult`, año de cierre | `GasResult` con serie IPCC, captura y energía |
| `geotech.ts` | `GeotechParams` | `GeotechResult` con FS y casos |
| `closure.ts` | `ScenarioParams`, geometría, volumen de cobertura | `ClosureResult` |
| `sensitivity.ts` | función de evaluación y parámetros | OAT y Monte Carlo |
| `validation.ts` | resultados completos | `Issue[]` (`error`, `warn`, `info`) |
| `siteSelection.ts` | sitio y exclusiones | `SiteSelectionResult` con cumplimiento y restricciones duras |

Ninguno de estos archivos importa React, Zustand ni componentes. Esto permite:

1. Probar cada fórmula de forma aislada.
2. Reutilizar el mismo resultado en UI, 3D, CSV y PDF.
3. Detectar dependencias ocultas o efectos secundarios.

### 2.3 Modelo activo y memoización

`ModelProvider` selecciona el proyecto y escenario activos del store y memoiza:

```ts
useMemo(() => computeModel(project, scenario), [project, scenario])
```

El resultado se comparte mediante `useModel()`. Si el motor lanzara una excepción inesperada, el proveedor calcula el escenario base y muestra un aviso en lugar de dejar la pantalla vacía. El motor está diseñado para no lanzar excepciones con entradas de usuario; la validación reporta problemas como hallazgos.

`useScenarioSummaries()` calcula un resumen por escenario para comparaciones. No sustituye al modelo activo: es una vista agregada.

---

## 3. Estado y persistencia

### 3.1 Store

`lib/store.ts` usa Zustand con `persist` e Immer.

Estado persistido:

- `projects` (proyectos, escenarios y parámetros completos)
- `documents` (biblioteca normativa editable)
- `activeProjectId`, `activeScenarioId`, `activeModule`
- `navCollapsed`
- `scene` (vista, capas visibles, recorte, exageración, animaciones y toggles de vías, edificios, drenaje, pozas, biogás, monitoreo, cerco y vegetación)
- `display` (modo compacto, reducción de movimiento)
- `lastSavedAt`

Estado **no** persistido:

- `activeDialog`, `toasts`, `mobileNavOpen`
- `selectedCellId`, `operationYearIndex`
- `revision` (contador de cambios en memoria)

### 3.2 Hidratación

- `skipHydration: true` evita que el HTML del servidor y el primer render del cliente difieran.
- `AppRoot` llama a `hydrateStore()` una sola vez al montar.
- La entrada al workspace se habilita cuando `useStore.persist.hasHydrated()` es verdadero o cuando finaliza la rehidratación.
- Clave de almacenamiento: **`green-owl-landfill-3d`**, versión de esquema **3**. La migración desde la versión 1 actualiza los documentos canónicos; desde la versión 2 incorpora los nuevos controles de escena (vías, edificios, drenaje, pozas, biogás, monitoreo, cerco y vegetación) sin perder los documentos del usuario.

### 3.3 Acciones

Las acciones se agrupan en:

- **Navegación y escena:** `setModule`, `setActiveProject`, `setActiveScenario`, `setScene`, `setView`, `resetScene`.
- **Edición:** `updateProjectMeta`, `updateSite`, `updateScenarioParams` (receta Immer), `updateCell`, `addCell`, `duplicateCell`, `deleteCell`, `reorderCell`, `addLayer`, `updateLayer`, `deleteLayer`.
- **Proyectos:** `createProject`, `duplicateProject`, `archiveProject`, `deleteProject`, `restoreDemos`, `importProjectData`, `resetWorkspace`.
- **Escenarios:** `addScenario`, `duplicateScenario`, `deleteScenario`, `setBaseScenario`, `resetScenarioToBase`.
- **Documentos:** `addDocument`, `updateDocument`, `deleteDocument`, `resetDocuments`.
- **Avisos:** `pushToast`, `dismissToast`.

Toda edición actualiza `lastSavedAt` y `revision`; la persistencia la realiza el middleware.

### 3.4 Importación

`importProjectData(payload)` acepta:

- Un proyecto único (`{ project }` o el objeto directo).
- Una lista (`{ projects: [...] }` o un arreglo).
- Un respaldo con la misma forma.

La normalización actual valida estructura básica (nombre, escenarios con `params`), asigna identificadores nuevos a escenarios, garantiza un escenario base y limita el horizonte a 5–60 años. **No ejecuta una validación Zod completa del esquema**, lo que está documentado como limitación.

La importación **agrega** proyectos; no reemplaza los existentes. Un identificador repetido recibe uno nuevo.

---

## 4. Interfaz y navegación

### 4.1 Shell

`components/shell/AppShell.tsx` compone:

- `Sidebar` con grupos de navegación (`NAV_GROUPS`).
- `Topbar` con proyecto, escenario, estado de guardado y acciones.
- `SceneDock` con el visor 3D acoplado, salvo en el módulo `modelo`.
- `ModuleView` con un `switch` explícito sobre los 18 módulos.
- `ModuleBoundary`: barrera de error por módulo para que un fallo aislado no tumbe el workspace.
- `Dialogs` y `Toasts`.

`lib/nav.ts` es la fuente única de verdad de:

- `MODULES`: 18 identificadores.
- `MODULE_META`: etiqueta, nombre corto, eyebrow y descripción.
- `NAV_GROUPS`: agrupación visual.
- `MODEL_MODULES`: módulos a pantalla completa (`modelo`).
- `WIDE_MODULES`: módulos que ocupan más ancho (`metodos`, `normativa`, `informes`, `sensibilidad`, `resultados`, `escenarios`).

### 4.2 Módulos

Cada módulo consume `useModel()` y el store. No recalcula fórmulas. Los controles son declarativos y los campos numéricos confirman con Enter o blur; los cambios se reflejan en el modelo, el 3D, las tablas y las exportaciones.

Componentes compartidos:

- `components/ui/index.tsx`: botones, campos, tarjetas, tablas, badges, callouts, pestañas, etc.
- `components/ui/charts.tsx`: gráficos Recharts con estilo común.
- `components/modules/shared.tsx`: bloques reutilizables entre módulos (KPI, encabezados, tablas de resultados).

### 4.3 Responsive

- A menos de 1080 px el workspace pasa a columna y el `SceneDock` se coloca arriba con altura fija.
- El módulo `modelo` conserva el canvas a pantalla completa y oculta los paneles laterales para priorizar la vista.
- A menos de 860 px los formularios pasan a una columna.
- El control temporal del modelo permanece visible; los ajustes de escena están disponibles en Configuración.

---

## 5. Visor 3D

### 5.1 Componentes

- `components/scene/LandfillScene.tsx`: renderer Three.js, cámara, luces, geometría, etiquetas, animaciones y captura.
- `components/scene/siteInfrastructure.ts`: vías, acceso, garita, báscula, edificios, lixiviados, drenaje pluvial, biogás, monitoreo, cerco, vegetación y rótulos del sitio.
- `components/modules/Modelo.tsx`: espacio de trabajo a pantalla completa, controles de cámara, año de operación y captura.
- `components/shell/SceneDock.tsx`: versión acoplada con KPIs y accesos.
- `lib/sceneLayout.ts`: implantación sintética sin solape; conserva dimensiones reales y usa dos columnas hasta seis celdas.
- `lib/sceneBridge.ts`: registro global de una función de captura.

### 5.2 Geometría

- Cada celda se construye como prisma rectangular con taludes, bermas y excavación según `GeometryResult`.
- La implantación asigna posiciones en una grilla; **no** usa coordenadas geográficas.
- El terreno es una representación, no un TIN topográfico.
- El llenado por año usa `waste.cellAllocation` para altura y fracción por celda.
- Las capas del liner se dibujan con espesor real y una exageración visual configurable, etiquetada en la interfaz.
- `siteInfrastructure.ts` añade la infraestructura auxiliar: vías perimetrales y de acceso, garita, báscula, edificios administrativos, recolección y poza de lixiviados, tratamiento, drenaje pluvial con poza de sedimentación, red de biogás con antorcha, pozos de monitoreo, cerco y barrera vegetal. Es una implantación **esquemática**, no un diseño de detalle.

### 5.3 Captura

`LandfillScene` crea el renderer con `preserveDrawingBuffer: true` y registra:

```ts
registerSceneCapture((options) => captureRef.current?.(options) ?? null)
```

`captureScene({ width, height })` devuelve un data URL PNG o `null`. Se usa para:

- Exportación PNG a 1600 × 900.
- Imagen opcional del informe PDF.

Si el contexto WebGL no está disponible, la captura devuelve `null` y el informe se genera sin imagen, con aviso. El puente se limpia al desmontar el visor.

### 5.4 Interacción

- Selección de celda por raycast.
- Vistas isométrica, superior, frontal, lateral y corte.
- Recorte, capas visibles, rejilla, curvas, etiquetas, sombras, rotación automática y animaciones de flujo/gas.
- Toggles independientes para vías y accesos, edificios, drenaje pluvial, pozas y tratamiento, red de biogás, monitoreo, cerco perimetral y barrera vegetal; «Etiquetas» oculta todas las etiquetas, incluidas las de celda.
- `scene.explode` existe en el estado, pero **no tiene efecto geométrico ni control expuesto**; no debe presentarse como funcionalidad activa.

---

## 6. Informe PDF

`lib/report.ts` genera el documento en el navegador con jsPDF y autotable. No hay servidor ni firma digital.

### 6.1 Secciones

`REPORT_SECTIONS` define 19 secciones:

1. `resumen` — Resumen ejecutivo
2. `proyecto` — Identificación del proyecto
3. `emplazamiento` — Emplazamiento y calidad del dato
4. `geometria` — Geometría general
5. `celdas` — Celdas y bermas
6. `capas` — Sistema de impermeabilización y capas
7. `capacidad` — Capacidad y tonelaje
8. `residuos` — Balance anual de residuos
9. `lixiviados` — Balance hídrico y lixiviados
10. `biogas` — Biogás y metano
11. `operacion` — Operación y secuencia
12. `geotecnia` — Revisión geotécnica conceptual
13. `clausura` — Clausura y posclausura
14. `escenarios` — Comparación de escenarios
15. `sensibilidad` — Sensibilidad e incertidumbre
16. `resultados` — Resultados, costos y validación
17. `metodos` — Métodos, trazabilidad y verificación
18. `normativa` — Biblioteca normativa
19. `supuestos` — Supuestos, limitaciones y firma

### 6.2 Entradas

`ReportOptions` contiene:

- `sections`: banderas por sección.
- `include3d`: si se inserta la captura.
- `preparedBy`, `observations`.
- `screenshotDataUrl`: captura opcional.
- `documents`: biblioteca normativa vigente en el store.

### 6.3 Trazabilidad

El informe imprime:

- Proyecto, escenario, fecha y responsable declarado.
- Calidad de dato del emplazamiento.
- Parámetros y supuestos relevantes.
- Métodos con páginas de fuente.
- Hallazgos de validación.
- Estado de verificación de cada documento normativo.
- Limitaciones y bloque de firma.
- Versión del motor y advertencia de emisión local.

El número de páginas es variable y depende de las secciones activas, la longitud de textos y la presencia de imágenes. No se promete un número fijo.

---

## 7. Exportaciones

`lib/exporters.ts` implementa descargas reales en el cliente:

| Exportación | Formato | Contenido |
|---|---|---|
| Proyecto | JSON `green-owl-landfill-3d` | Proyecto activo y documentos opcionales |
| Respaldo | JSON `green-owl-landfill-3d-backup` | Todos los proyectos y documentos |
| Residuos | CSV | Serie anual, masa, volumen y vida útil |
| Lixiviados | CSV | Balance, caudales, tratamiento y almacenamiento |
| Biogás | CSV | Generación, captura, emisión y energía |
| Capacidad | CSV | Celdas, volúmenes y tonelaje |
| Escenarios | CSV | Comparación de indicadores |
| Validación | CSV | Hallazgos |
| Costos, cronograma, sensibilidad, métodos | CSV | Tablas del módulo correspondiente |
| Vista 3D | PNG 1600 × 900 | Captura del canvas |

Los CSV usan separador `;` y BOM para compatibilidad con Excel en español. Los nombres de archivo se sanean con `safeFileName()`.

No existen exportaciones simuladas ni botones que solo muestren un aviso: cada acción produce un archivo descargable o un PDF real.

---

## 8. Pruebas y verificación

### 8.1 Vitest

`tests/engine.test.ts` contiene **26 pruebas**. Los casos se agrupan así:

- Integración prismoidal de la trinchera MINAM y comparación con la fórmula de tronco (2 casos).
- Inversión volumen–altura.
- Reproducción de la referencia de Honduras 2014.
- Cierre volumétrico y másico del modelo.
- Manning a sección llena.
- Talud infinito con FS = √3 en el caso de referencia.
- Conservación de masa de metano en el horizonte de decaimiento.
- Cierre del balance hídrico y partición de tratamiento.
- Ordenamiento de variables OAT y conservación del escenario base.
- Factores declarados por variante OAT.
- Reproducibilidad de Monte Carlo con la misma semilla.
- Aprobación de las autopruebas de referencia.
- Integridad de la biblioteca normativa (13 documentos, estados y fecha de contraste).
- Fuente oficial de las 8 normas peruanas verificadas.
- Verificación de localización: matriz del sitio demostrativo, distancia a población, franja aeroportuaria, distinción «sin dato» y exclusión como restricción dura (5 casos).
- Diferenciación real de métodos: trinchera, área y rampa cambian volumen, huella y áreas.
- Presets de método y detección de incoherencia entre etiqueta y geometría.
- Borde libre descontado del volumen de diseño y reportado aparte.
- Longitud/cuña de rampa y balance de tierras con signo correcto.

Comando:

```bash
npx vitest run
```

### 8.2 Autopruebas en vivo

`lib/selfTest.ts` ejecuta **11 verificaciones** de referencia dentro de la aplicación:

- Geometría prismoidal.
- Capacidad y balance.
- Lixiviados.
- Biogás.
- Geotecnia.
- Validación.
- Sensibilidad.
- Coherencia general del modelo.

Se muestran en Métodos, Configuración y en el informe. No sustituyen a Vitest: son una comprobación de humo del motor empaquetado.

### 8.3 Verificación de navegador

La evidencia funcional está en [`pruebas-verificacion.md`](pruebas-verificacion.md). Incluye navegación por los 18 módulos, edición de parámetros, persistencia, Monte Carlo, PDF, CSV/JSON/PNG, importación y biblioteca normativa.

La suite automatizada vive en `tests/e2e/app.spec.ts` y se ejecuta con `npm run test:e2e`. Usa Playwright con el Chrome instalado (`channel: "chrome"`), reutiliza el servidor de desarrollo en `http://localhost:3100` y cubre siete flujos: arranque, navegación de los 18 módulos, persistencia de proyecto/escenario, biblioteca normativa, respaldo JSON, expansión de la barra lateral contraída y menú móvil. No compara píxeles del canvas WebGL.

---

## 9. Decisiones de diseño relevantes

| Decisión | Motivo | Consecuencia |
|---|---|---|
| Motores puros sin React | Testabilidad y trazabilidad | La UI no puede introducir fórmulas propias. |
| Un solo `computeModel` por escenario activo | Evitar cálculos divergentes entre módulos | Cambios de parámetro recalculan todo el pipeline. |
| Persistencia solo local | Aplicación sin backend ni cuentas | El respaldo JSON es la única recuperación. |
| Normativa con estado explícito | No inventar vigencia ni artículos | Cada entrada declara vigencia verificada, referencia histórica o verificación pendiente. |
| Geometría 3D esquemática | Separar cálculo de representación | No hay georreferenciación ni TIN. |
| PDF en cliente | Operación local sin servidor | Sin firma digital ni sello de tiempo. |
| Sensibilidad OAT + Monte Carlo | Explorar incertidumbre de forma reproducible | Distribuciones normales truncadas e independientes. |
| Validación como hallazgos | No bloquear la exploración | El usuario debe leer errores y advertencias. |

---

## 10. Mapa de archivos

```text
app/
  layout.tsx            Metadatos y carga de estilos
  page.tsx              Monta AppRoot
  globals.css           Sistema visual responsive

components/
  AppRoot.tsx           Hidratación, splash y proveedor
  Splash.tsx            Pantalla de entrada y comprobaciones
  ModelProvider.tsx     Contexto del modelo activo
  Brand.tsx             Identidad oficial de Green Owl Labs (PNG) y wordmark del producto
  shell/
    AppShell.tsx        Composición y enrutado por módulo
    Sidebar.tsx         Navegación agrupada
    Topbar.tsx          Proyecto, escenario y guardado
    SceneDock.tsx       Visor acoplado y KPIs
    Dialogs.tsx         Nuevo proyecto/escenario, ayuda
    Toasts.tsx          Avisos transitorios
  modules/              18 pantallas
  scene/
    LandfillScene.tsx   Renderer, geometría y captura
    siteInfrastructure.ts Vías, edificios, redes, pozas, cerco y etiquetas
  ui/
    index.tsx           Componentes base
    charts.tsx          Gráficos

lib/
  engine/
    geometry.ts         Prismas, taludes, bermas, corte/relleno, rampa, capas, perfil
    cellMethods.ts      Métodos, presets, método efectivo y verificaciones
    capacity.ts         Volumen de diseño, borde libre, tierras, cobertura, tonelaje
    waste.ts            Proyección anual y vida útil
    leachate.ts         Balance hídrico e hidráulica
    gas.ts              IPCC FOD, captura, energía
    geotech.ts          Talud infinito conceptual
    closure.ts          Cobertura final y cronograma
    sensitivity.ts      OAT y Monte Carlo
    validation.ts       Errores, advertencias e información
    model.ts            Orquestación
    density.ts          Utilidades de densidad
  siteSelection.ts      Criterios, exclusiones y evaluación del sitio
  store.ts              Zustand + persistencia + importación
  types.ts              Contratos de datos
  defaults.ts           Proyectos demo y parámetros
  templates.ts          Creación de proyectos
  methods.ts            Métodos, fuentes y valores de referencia
  normative.ts          Biblioteca documental
  report.ts             PDF de 19 secciones
  exporters.ts          JSON, CSV y descargas
  selfTest.ts           Autopruebas
  sceneLayout.ts        Implantación 2D→3D
  sceneBridge.ts        Puente de captura
  siteFields.ts         Campos y completitud del sitio
  nav.ts                Módulos y navegación
  format.ts             Formato numérico y de fechas
  uid.ts                Identificadores

tests/
  engine.test.ts        26 pruebas Vitest
  e2e/app.spec.ts       8 pruebas Playwright

scripts/
  extract-sources.mjs   Extracción de texto de fuentes

docs/
  arquitectura.md       Este documento
  matriz-funcionalidades.md
  metodos-verificados.md
  pruebas-verificacion.md
  datos-pendientes.md
  limitaciones-conocidas.md
  sources/              PDF y texto extraído
```

---

## 11. Cómo extender la aplicación

### Añadir un parámetro

1. Agregar el campo a la interfaz correspondiente en `lib/types.ts`.
2. Definir un valor por defecto en `lib/defaults.ts`.
3. Incorporarlo en el motor puro que lo consume.
4. Exponerlo en el módulo con un control declarativo.
5. Añadir una prueba de regresión si cambia un resultado de referencia.
6. Actualizar métodos, supuestos y, si aplica, el informe.

### Añadir un método

1. Implementarlo en `lib/engine/` sin dependencias de React.
2. Registrar fórmula, fuente y páginas en `lib/methods.ts`.
3. Añadir un valor de referencia verificable.
4. Incorporarlo a `lib/selfTest.ts` y a `tests/engine.test.ts`.
5. Documentar supuestos y limitaciones.

### Añadir una sección al informe

1. Agregar el identificador y título a `REPORT_SECTIONS`.
2. Implementar el bloque con `sectionEnabled()` y `heading()`.
3. Actualizar la interfaz de selección de secciones.
4. Verificar que el PDF se genere con y sin la sección.

### Añadir un documento normativo

1. Agregar el registro en `lib/normative.ts` con estado de verificación.
2. No declarar vigencia sin contraste oficial.
3. Incluir URL, fecha de consulta y clasificación.
4. Verificar la sección normativa del PDF.

---

## 12. Límites arquitectónicos declarados

- No hay backend, autenticación, auditoría ni sincronización.
- No hay migración automática de esquemas persistidos.
- La importación valida estructura básica, no el esquema completo.
- El visor 3D no es georreferenciado ni topográfico.
- El informe no tiene firma digital.
- La biblioteca normativa no certifica cumplimiento.
- La aplicación no reemplaza un proyecto de ingeniería de detalle.

Estos límites se detallan en [`limitaciones-conocidas.md`](limitaciones-conocidas.md) y [`datos-pendientes.md`](datos-pendientes.md).

---

**Green Owl Labs** · Green Owl Landfill 3D 1.0.0 · Motor GO-ENGINE 1.0.0
