# Green Owl Landfill 3D

**Green Owl Labs** — Laboratorio de diseño y simulación de rellenos sanitarios.

Aplicación web local para dimensionar, simular y documentar un relleno sanitario: geometría de celdas, capacidad, balance de residuos, lixiviados, biogás, operación, geotecnia conceptual, clausura, escenarios, sensibilidad, resultados e informes PDF. El visor 3D es parte del espacio de trabajo y se recalcula con el modelo activo.

> **Alcance:** herramienta de ingeniería preliminar y trazabilidad. No sustituye levantamientos topográficos, estudios geotécnicos e hidrogeológicos, caracterización de residuos, diseño de detalle, firmas profesionales ni verificación legal vigente.

---

## Estado de la entrega

| Elemento | Estado |
|---|---|
| Compilación de producción (`npm run build`) | Correcta |
| Pruebas unitarias (`npx vitest run`) | 26/26 aprobadas |
| Autopruebas de referencia del motor | 11/11 aprobadas |
| Pruebas E2E (`npm run test:e2e`) | 8/8 aprobadas en Chromium |
| Módulos de interfaz | 18/18 navegables y funcionales |
| Persistencia local | Activa, clave `green-owl-landfill-3d` |
| Informe PDF | Generado en el navegador, 19 secciones configurables |
| Exportaciones | JSON de proyecto, respaldo completo, CSV y PNG |
| Biblioteca normativa | 13 documentos con estado de verificación (contraste 2026-11-04) |
| Identidad visual | Logo oficial de Green Owl Labs en `public/gowl-mark.png` y favicon `public/favicon.png` |
| Verificación de navegador | Manual y automatizada, `docs/pruebas-verificacion.md` |

La aplicación **no tiene backend, cuentas, sincronización ni telemetría**. Los proyectos, escenarios, documentos y preferencias viven en el `localStorage` del navegador.

---

## Qué incluye

- **Proyectos:** tres casos demostrativos sintéticos, creación de proyectos propios, duplicado, archivo, eliminación y restauración de demostraciones.
- **Emplazamiento:** datos físicos, hidrogeológicos, climáticos y territoriales con calidad de dato declarada (`medido`, `estimado`, `supuesto`, `faltante`), alertas de revisión y **verificación declarativa de localización** (distancias, pendiente y exclusiones de la R.M. 165-2021 y del art. 110 del D.S. 014-2017-MINAM).
- **Modelo 3D:** celdas con dimensiones reales sobre una implantación esquemática, terreno con excavaciones, avance del llenado por año, liner por capas con exageración visual etiquetada, red de lixiviados, pozas y tratamiento, drenaje pluvial y poza de sedimentación, red de biogás y antorcha, vías, acceso, garita, báscula, edificios administrativos, cerco perimetral, barrera vegetal, pozos de monitoreo, etiquetas, curvas, corte y captura PNG.
- **Celdas y capas:** métodos de trinchera, área y rampa con presets que cambian la geometría real; corte y relleno con pivote en la cota de terreno, bermas, taludes, borde libre, rampa de acceso, secuencia y capas de impermeabilización con espesor real y referencia documental.
- **Capacidad:** volumen bruto geométrico y volumen bruto de diseño (con borde libre), descuento de liner y reserva de infraestructura, cobertura como fracción volumétrica, densidad inicial o estabilizada, tonelaje, capacidad por celda y **balance de tierras** entre excavación y cobertura.
- **Residuos:** proyección geométrica de población y generación, cobertura de recolección, recuperación, composición, balance anual y vida útil con agotamiento fraccional.
- **Lixiviados:** balance hídrico anual, liberación de humedad, áreas activas/cerradas, almacenamiento, tratamiento, Manning a sección llena, método suizo y fórmula racional.
- **Biogás:** modelo IPCC de descomposición de primer orden, separación CH₄/biogás, captura, oxidación, emisión, antorcha y energía potencial.
- **Operación:** año de inicio, frente de trabajo, cobertura diaria vinculada a capas, secuencia de celdas, avance anual y diagnóstico de celdas activas.
- **Geotecnia:** revisión conceptual de talud infinito con casos base, interfaz, seco y saturado. No es un análisis de estabilidad global.
- **Clausura:** cobertura final por capas, cronograma, posclausura, monitoreo y reserva por asentamiento.
- **Escenarios:** clones independientes del escenario base, metadatos, comparación de indicadores y deltas.
- **Sensibilidad:** análisis uno a la vez (OAT) y Monte Carlo reproducible con percentiles P10/P50/P90.
- **Resultados:** síntesis técnica, costos declarados, VPN, comparación y hallazgos de validación.
- **Informes:** PDF local de 19 secciones con datos reales, tablas, captura 3D, supuestos, métodos y biblioteca normativa.
- **Métodos y normativa:** catálogo de formulaciones con páginas de fuente, pruebas en vivo y biblioteca documental con estado de verificación explícito.
- **Configuración:** preferencias del visor, modo compacto, reducción de movimiento, diagnóstico, almacenamiento, respaldo e importación.

La matriz detallada está en [`docs/matriz-funcionalidades.md`](docs/matriz-funcionalidades.md).

### Métodos constructivos con consecuencias reales

Cambiar el método de una celda no cambia solo la etiqueta. El preset de **trinchera**, **área** o **rampa** ajusta profundidad de corte, altura, cota de fondo, talud, bermas, borde libre y rampa; y el motor recalcula volumen, huella, área de barrera, área de cobertura, capacidad, 3D, validación, informe y balance de tierras.

El **método efectivo** se deriva de la geometría: sin corte = área; sin relleno = trinchera; con corte y relleno = rampa/combinado. Si el método declarado no coincide, se emite una advertencia con referencia documental. Los presets son puntos de partida técnicos, no límites legales ni diseños óptimos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| UI | React 18.3.1, TypeScript 5.7.2, Tailwind CSS 3.4.17 |
| Estado | Zustand 5.0.2 con `persist` |
| 3D | Three.js 0.169.0 |
| Gráficos | Recharts 2.13.3 |
| PDF | jsPDF 2.5.2 + jspdf-autotable 3.8.4 |
| Validación | Zod 3.23.8 |
| Pruebas | Vitest 2.1.8 |
| Iconos | Lucide React (SVG) |

---

## Puesta en marcha

Requiere Node.js 18.17 o superior.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. En el entorno de verificación se usó el puerto `3100` para evitar colisiones:

```bash
npm run dev -- --port 3100
```

Compilación y pruebas:

```bash
npm run build
npm test
npm run test:e2e
```

Las pruebas E2E usan Playwright con el Chrome instalado en el equipo (`channel: "chrome"`). Si no está disponible, instale Chromium con `npx playwright install chromium` y ajuste `playwright.config.ts`.

---

## Despliegue en Vercel

La aplicación es un proyecto Next.js 14 con salida estática: solo se prerenderizan `/` y `/_not-found`, no usa API routes, backend, variables de entorno ni servicios externos. Por eso **no requiere `vercel.json`** ni configuración especial.

1. En Vercel, elija **Add New → Project** e importe `BuhoNegro5000/Landfill-Green-owl-labs`.
2. Mantenga el preset **Next.js**, directorio raíz `./`, build `npm run build`, install `npm install` y Node.js **20.x**.
3. No agregue variables de entorno. Despliegue.
4. Tras el despliegue, verifique splash, creación de proyecto, persistencia al recargar, visor 3D e informe PDF.

Cada `push` a `main` genera un despliegue de producción si el repositorio está conectado. Los datos siguen siendo **locales a cada navegador**: Vercel solo sirve los archivos estáticos; no hay base de datos ni sincronización entre visitantes. Guía detallada: [`docs/despliegue-vercel.md`](docs/despliegue-vercel.md).

---

## Persistencia y respaldo

- Clave de `localStorage`: **`green-owl-landfill-3d`**.
- Se persisten proyectos, escenarios, documentos, proyecto/escenario activo, módulo activo, preferencias de escena y preferencias de interfaz.
- `skipHydration: true` evita desajustes de hidratación; `AppRoot` llama a `hydrateStore()` una sola vez al montar.
- El esquema persistido usa **versión 4**. Al migrar desde la versión 1 se actualizan los documentos canónicos de la biblioteca normativa; desde la versión 2 se incorporan los controles de escena (vías, edificios, drenaje, pozas, biogás, monitoreo, cerco y vegetación); desde la versión 3 se completan los campos de método constructivo, borde libre y rampa, y se normalizan las etiquetas de forma. Los documentos agregados por el usuario se conservan.
- Exportaciones reales:
  - **Proyecto JSON** con formato `green-owl-landfill-3d` y versión de esquema 1.
  - **Respaldo completo** con formato `green-owl-landfill-3d-backup`.
  - **CSV** de residuos, lixiviados, biogás, capacidad, escenarios, validación, costos, cronograma, sensibilidad y métodos.
  - **PNG** de la vista 3D a 1600 × 900.
- La importación agrega proyectos; no reemplaza los existentes. Un proyecto con identificador repetido recibe uno nuevo.

**Importante:** limpiar los datos del navegador, usar modo privado o cambiar de equipo sin respaldo puede eliminar el trabajo. No existe recuperación desde servidor ni papelera.

---

## Arquitectura

```text
app/                    Entrada Next.js y estilos globales
components/
  Splash.tsx            Arranque, comprobaciones y entrada
  AppRoot.tsx           Hidratación, splash y proveedor del modelo
  ModelProvider.tsx     Cálculo memoizado + manejo de respaldo
  shell/                Sidebar, topbar, escena acoplada, diálogos, toasts
  modules/              18 pantallas del laboratorio
  scene/                Visor Three.js y geometría 3D
  ui/                   Sistema de componentes y gráficos
lib/
  engine/               Motores de cálculo independientes de React
  store.ts              Estado global, persistencia e importación
  report.ts             Informe PDF de 19 secciones
  exporters.ts          JSON, CSV y descargas
  defaults.ts           Proyectos demo y parámetros iniciales
  methods.ts            Catálogo de métodos y valores de referencia
  normative.ts          Biblioteca documental
  selfTest.ts           Verificación de referencia en vivo
tests/                  Pruebas Vitest del motor
docs/                   Documentación de implementación y fuentes
```

Flujo de cálculo:

```text
Proyecto + Escenario
        ↓
computeModel()
  ├─ computeGeometry()     volumen, celdas, capas, perfil
  ├─ computeCapacity()     volumen útil, cobertura, tonelaje
  ├─ computeWasteBalance() proyección anual y vida útil
  ├─ computeLeachate()     balance hídrico, hidráulica, tratamiento
  ├─ computeGas()          IPCC FOD, captura, emisión, energía
  ├─ computeGeotech()      talud infinito conceptual
  ├─ computeClosure()      cobertura final y cronograma
  ├─ costos y operación
  └─ validateModel()       errores, advertencias e información
        ↓
UI · 3D · CSV · PDF
```

Los motores no importan React ni el store. Reciben parámetros y devuelven resultados tipados; esto permite probarlos de forma aislada.

Detalle ampliado: [`docs/arquitectura.md`](docs/arquitectura.md).

---

## Disciplina de trazabilidad

La aplicación separa explícitamente:

| Categoría | Tratamiento |
|---|---|
| Requisito legal | Solo si la fuente está verificada; cada entrada declara `vigente-verificado`, `referencia-historica` o `pendiente-verificacion`. |
| Recomendación técnica | Valores de guías (Honduras 2014, MINAM 2011) usados como referencia de revisión. |
| Parámetro configurable | Dato del proyecto editable por el usuario. |
| Supuesto del modelo | Hipótesis declarada en el módulo, el método y el informe. |

No se inventan artículos, espesores legales, límites ni vigencias. Los valores citados se muestran con documento y página; cuando no se ha contrastado la fuente oficial, se marca como pendiente.

---

## Documentación

- [Matriz de funcionalidades](docs/matriz-funcionalidades.md)
- [Qué puedes y qué no puedes hacer](docs/que-puede-y-no-puede-hacer.md)
- [Métodos verificados](docs/metodos-verificados.md)
- [Pruebas y verificación](docs/pruebas-verificacion.md)
- [Datos pendientes](docs/datos-pendientes.md)
- [Limitaciones conocidas](docs/limitaciones-conocidas.md)
- [Arquitectura de implementación](docs/arquitectura.md)
- Fuentes de referencia: `docs/sources/` (PDF y texto extraído)

---

## Advertencia de uso

Los proyectos demostrativos son **sintéticos**. No representan instalaciones reales ni condiciones de campo. Los resultados dependen por completo de los datos introducidos y de los supuestos declarados. Antes de usar una cifra para diseño, permiso, inversión o cumplimiento:

1. Verifique la normativa aplicable en su versión oficial vigente.
2. Sustituya los datos demostrativos por estudios de sitio, caracterización y ensayos.
3. Revise los hallazgos de validación y las limitaciones del método.
4. Haga revisar el modelo por un profesional habilitado.
