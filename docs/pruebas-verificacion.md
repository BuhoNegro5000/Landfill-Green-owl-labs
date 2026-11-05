# Pruebas y verificación

**Fecha de la sesión de verificación:** 2026-10-28/29; actualización normativa y E2E: 2026-11-04  
**Entorno:** Windows, Next.js 14.2.35, Node.js local, navegador de escritorio, servidor de desarrollo en `http://localhost:3100/`.

---

## 1. Resumen

| Nivel | Resultado |
|---|---|
| Compilación de producción | **Correcta** |
| Pruebas unitarias Vitest | **20/20 aprobadas** |
| Pruebas E2E Playwright | **7/7 aprobadas** |
| Autopruebas de referencia GO-ENGINE | **8/8 aprobadas** |
| Módulos recorridos en navegador | **18/18** |
| Persistencia tras recarga | **Verificada** |
| Generación de PDF | **Verificada** (24 páginas en el caso de prueba) |
| Exportaciones CSV/JSON/PNG | **Verificadas con archivos reales** |
| Importación y CRUD documental | **Verificadas** |
| Modo compacto y responsive | **Verificados** |

La verificación de navegador combina la sesión manual documentada en la sección 4 con una suite E2E automatizada de Playwright (sección 3.2). La suite recorre el arranque, los 18 módulos, el cambio de proyecto y escenario, la biblioteca normativa, la exportación JSON, la expansión de la barra lateral contraída y la navegación móvil. No se comparan píxeles del canvas WebGL porque el renderizado puede variar sin que falle la lógica de la aplicación.

---

## 2. Pruebas unitarias

Comando:

```bash
npx vitest run
```

Resultado:

```text
Test Files  1 passed (1)
Tests       20 passed (20)
```

### 2.1 Casos

| # | Caso | Qué comprueba | Tolerancia |
|---|---|---|---|
| 1 | Trinchera MINAM — prismoidal exacto | `Σ h/6 (A1 + 4Am + A2)` = 1 075.8333 m³ | 1×10⁻⁶ |
| 2 | Trinchera MINAM — fórmula de tronco | Reproduce 1 068.52 m³ del manual y confirma diferencia < 1 % | 0.1 m³ |
| 3 | Inversión volumen → altura | `heightForVolume` recupera el volumen objetivo | 1×10⁻⁵ |
| 4 | Referencia Honduras 2014 | 698 062.5 m³ con los datos del manual | 0.5 m³ |
| 5 | Cierre de capacidad | `V_res + V_cob = V_útil`; `T = V_res·ρ/1000`; suma por celda | 1×10⁻⁶ |
| 6 | Manning | `D=0.20 m`, `S=0.01`, `n=0.013` → ≈32.8 L/s | 0.1 L/s |
| 7 | Talud infinito | `β=18.43°`, `φ'=30°`, `c'=0`, seco → FS = √3 | 1×10⁻⁶ |
| 8 | IPCC FOD | Integral de CH₄ ≈ potencial último; cola final < 0.1 % | 0.5 % |
| 9 | Balance hídrico | `R + ET + I = P`; tratado + no tratado = generado | 1×10⁻⁶ |
| 10 | OAT — orden | Base reproducida; filas ordenadas por impacto absoluto; población baja → más vida útil | 1×10⁻⁹ |
| 11 | OAT — factores | Los factores aplicados coinciden con las etiquetas (población ±20 %, densidad ±15 %, precipitación ±25 %) | 1×10⁻⁶ |
| 12 | Monte Carlo | Misma semilla → mismos percentiles; P10 ≤ P50 ≤ P90 | Exacta |
| 13 | Autopruebas de la app | Las 8 verificaciones de referencia aprueban | Según caso |
| 14 | Biblioteca normativa | 13 documentos únicos, fecha de contraste 2026-11-04 y estados válidos | Exacta |
| 15 | Fuentes oficiales | Las 8 normas peruanas verificadas citan `gob.pe` o `elperuano.pe`; Ley 32212 y D.S. 014-2017 localizados | Exacta |
| 16 | Localización — matriz | El sitio demostrativo aprueba y reporta un porcentaje de cumplimiento | Exacta |
| 17 | Localización — población | 320 m a un centro poblado → «no cumple» | Exacta |
| 18 | Localización — aeródromo | 8.5 km → «observado» en la franja 4–13 km | Exacta |
| 19 | Localización — sin dato | Una exclusión no declarada se reporta como «sin dato», no como cumplimiento | Exacta |
| 20 | Localización — restricción dura | Una exclusión marcada detiene la verificación y emite error | Exacta |

### 2.2 Autopruebas de referencia

Se ejecutan en el splash, en **Métodos**, en **Configuración** y dentro de Vitest:

| ID | Prueba | Esperado | Obtenido |
|---|---|---|---|
| `prismoid` | Volumen prismoidal exacto | 1 075.83 m³ | 1 075.83 m³ |
| `minam-frustum` | Fórmula de tronco MINAM | 1 068.52 m³ | 1 068.52 m³ |
| `honduras-capacity` | Capacidad preliminar Honduras | 698 063 m³ | 698 063 m³ |
| `capacity-balance` | Cierre volumétrico y másico | ΔV y ΔT ≈ 0 | < 1×10⁻⁶ |
| `manning` | Manning a sección llena | ≈32.8 L/s | 32.80 L/s |
| `infinite-slope` | Talud infinito | 1.732 | 1.732 |
| `ipcc-fod` | Conservación de masa CH₄ | Potencial último | Integral coincide |
| `water-balance` | Cierre hídrico y tratamiento | 100 % y Δ = 0 | 100 % y Δ < 1×10⁻⁶ |

**Interpretación:** una autoprueba aprobada confirma la aritmética del caso documentado. No valida los datos del proyecto, la calidad del sitio ni el cumplimiento normativo.

---

## 3. Compilación

```bash
npm run build
```

Resultado de la sesión:

```text
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (4/4)
Route (app)  /  ●  Static
```

La compilación incluye verificación de tipos TypeScript y lint de Next.js.

### 3.1 Re-ejecución final (2026-10-29, sesión anterior)

Después de incorporar la prueba de regresión de factores OAT y cerrar la documentación, se volvieron a ejecutar ambas comprobaciones:

```text
npx vitest run  →  1 archivo, 13/13 pruebas aprobadas
npm run build   →  compilado correctamente, tipos y lint sin errores
                   ruta / estática; First Load JS 89.2 kB
```

### 3.2 Actualización normativa, localización y E2E (2026-11-04)

Se actualizó la biblioteca normativa a **13 documentos** contrastados con fuentes oficiales (8 vigentes verificados, 1 pendiente y 4 históricos) y se añadieron pruebas de integridad documental y de verificación de localización. También se incorporó la suite E2E.

```text
npx vitest run      →  1 archivo, 20/20 pruebas aprobadas
npm run test:e2e    →  7/7 pruebas aprobadas (Chrome instalado, canal `chrome`)
npm run build       →  compilación correcta, tipos y lint sin errores
```

La suite E2E usa `playwright.config.ts`, arranca o reutiliza `http://localhost:3100` y cubre:

| # | Flujo | Comprobación |
|---|---|---|
| 1 | Arranque | Splash, «Sistema listo» y entrada al workspace |
| 2 | Navegación | Los 18 módulos actualizan breadcrumb, `aria-current` y contenido |
| 3 | Contexto | Cambio a La Ceiba + Conservador y persistencia tras recarga |
| 4 | Normativa | 13 documentos, 8 vigentes, 1 pendiente, 4 históricos, enlaces oficiales y filtro |
| 5 | Respaldo | Descarga JSON con 3 proyectos y 13 documentos |
| 6 | Barra lateral | Contraer y volver a expandir con el botón visible y `aria-expanded` correcto |
| 7 | Responsive | Menú móvil a 390 px, navegación a Normativa y cierre automático |

La suite no valida el contenido visual del canvas WebGL: en automatización el contexto gráfico puede degradarse y el splash activa la vista esquemática sin afectar los cálculos.

---

## 4. Verificación funcional en navegador

### 4.1 Navegación y módulos

| Elemento | Evidencia | Estado |
|---|---|---|
| Splash | Comprobaciones de almacenamiento, motor, WebGL y datos; autopruebas 8/8 | Correcto |
| Entrada al laboratorio | Transición al workspace; proyecto demo activo | Correcto |
| 18 módulos | Recorrido completo: Proyectos, Emplazamiento, Modelo 3D, Celdas, Capacidad, Residuos, Lixiviados, Biogás, Operación, Geotecnia, Clausura, Escenarios, Sensibilidad, Resultados, Informes, Métodos, Normativa, Configuración | Correcto |
| Navegación a Resultados | Badge de hallazgos y acceso desde topbar/sidebar | Correcto |
| Cambio de proyecto | Selector y carga de escenario base | Correcto |
| Cambio de escenario | Base → Conservador → Base | Correcto |

### 4.2 Edición y recálculo

Prueba persistente: cambiar la altura de una celda de **10 m a 12 m**.

| Indicador | Antes | Después |
|---|---:|---:|
| Volumen bruto | 333 000 m³ | 372 336 m³ |
| Capacidad | 115 641 t | 133 436 t |
| Vida útil | 9.9 años | 11.2 años |

Después se restauró la altura a 10 m. El cambio se conservó tras recargar la página, lo que confirma la persistencia.

Prueba de escenario: Base → Conservador.

| Indicador | Base | Conservador |
|---|---:|---:|
| Vida útil | 9.9 años | 9.1 años |
| Lixiviado total | 230 642 m³ | 275 538 m³ |

Después se regresó al escenario base.

### 4.3 Monte Carlo

Configuración de la prueba: **200 iteraciones**, semilla **20260101**.

| Indicador | P10 | P50 | P90 |
|---|---:|---:|---:|
| Vida útil (años) | 8.8 | 10.0 | 11.6 |
| Lixiviado (m³) | 199 750 | 245 529 | 304 173 |
| CH₄ generado (t) | 4 141.1 | 5 005.5 | 5 728.3 |

El CSV descargado, `relleno-mecanizado-la-ceiba-monte-carlo-200-20260101.csv`, contiene las columnas P10, P50, P90 y Media con valores reales. La repetición con la misma semilla produce los mismos percentiles en la prueba unitaria.

### 4.4 Persistencia, importación y CRUD

| Prueba | Evidencia | Estado |
|---|---|---|
| Persistencia tras recarga | Edición de celda y escenario activo conservados | Correcto |
| Exportar proyecto JSON | Archivo de 63 000 bytes; `format: green-owl-landfill-3d`; payload real | Correcto |
| Exportar respaldo completo | `green-owl-backup-2026-10-29.json`, 299 763 bytes | Correcto |
| Importar proyecto | Proyecto importado, duplicado y eliminado con confirmación | Correcto |
| Normativa — alta | Documento agregado; contador 13 → 14; estado pendiente | Correcto |
| Normativa — baja | Documento eliminado; contador 14 → 13 | Correcto |
| Modo compacto | Clase `.app-root.is-compact`; `display.compact: true` persistido; revertido | Correcto |

### 4.5 Informes y exportaciones

| Artefacto | Evidencia | Estado |
|---|---|---|
| PDF completo | 24 páginas, 182 919 bytes, 2 imágenes; portada, tablas y secciones | Correcto |
| PDF de sesión anterior | 252 809 bytes | Correcto |
| Vista previa del PDF | Abierta correctamente en el visor del navegador | Correcto |
| CSV de residuos, lixiviados, biogás, capacidad, escenarios, validación, costos, cronograma y sensibilidad | Archivos con encabezados y datos del modelo activo | Correcto |
| PNG 3D | 1600 × 900; terreno, celdas, vías, edificios, pozas, biogás, cerco y etiquetas visibles | Correcto |
| Captura para informe | Imagen WebGL insertada en el PDF | Correcto |

### 4.6 Visor 3D

| Prueba | Evidencia | Estado |
|---|---|---|
| Inicialización del renderer | Canvas con dimensiones reales, no 300 × 150 | Correcto |
| Lectura de píxeles | `readPixels` devuelve contenido no vacío | Correcto |
| Exportación PNG | Imagen 1600 × 900 con geometría visible | Correcto |
| Selección de celda | Raycast y panel de celda seleccionada | Correcto |
| Controles de escena | Vistas, toggles, corte, rotación, exageración, año | Correctos |
| Capas exageradas | Aviso visible: solo afecta la vista, no el cálculo | Correcto |
| Infraestructura auxiliar | Vías, acceso, garita, báscula, edificios, pozas, drenaje pluvial, biogás, monitoreo, cerco y vegetación visibles y con toggles propios | Correcto |
| Etiquetas | «Etiquetas» oculta las etiquetas de celda y las de infraestructura | Correcto |

### 4.7 Responsive y accesibilidad

| Prueba | Evidencia | Estado |
|---|---|---|
| Escritorio amplio | Sidebar, módulo y dock 3D visibles | Correcto |
| Ancho ≤1080 | Overlays del modelo ocultos; canvas a ancho completo; controles accesibles desde Modelo/Configuración | Correcto |
| Móvil | Menú lateral, topbar compacta y contenido apilado | Correcto |
| Modo compacto | Espaciado reducido y persistido | Correcto |
| Reducción de movimiento | Clase `reduce-motion` y respeto de preferencia del sistema | Correcto |
| Navegación por teclado | Campos numéricos confirman con Enter/blur; switches con rol y ARIA | Correcto |

### 4.8 Verificación de localización

| Prueba | Evidencia | Estado |
|---|---|---|
| Matriz de criterios | Distancias, pendiente y aeródromos comparados con la referencia; cada fila muestra estado y fuente | Correcto |
| Exclusiones territoriales | Nueve exclusiones con opción «sin dato / no / sí»; una exclusión marcada emite restricción dura | Correcto |
| Indicador de cumplimiento | `[cumple + 0,5·observado] / n × 100`, etiquetado como ayuda de despacho y no como aptitud | Correcto |
| Datos faltantes | Se reportan como «sin dato» y no suman cumplimiento | Correcto |
| Persistencia | Los valores y exclusiones sobreviven a la recarga y alimentan validación e informe | Correcto |

---

## 5. Limitaciones de la verificación

- **Capturas de pantalla del escritorio:** fallan cuando la ventana está oculta o minimizada. Por eso la verificación 3D se hizo con `readPixels` y con el PNG exportado, no con capturas de pantalla del sistema.
- **Cobertura E2E acotada:** la suite automatizada usa el Chrome instalado en el equipo y siete flujos críticos. No sustituye una matriz multi-navegador ni pruebas de regresión visual; el canvas WebGL se valida de forma manual con `readPixels` y PNG exportado.
- **Datos sintéticos:** las cifras de la verificación corresponden a los proyectos demo; no son resultados de un sitio real.
- **Localización declarativa:** la matriz compara lo que el usuario ingresa; no mide distancias ni interpreta cartografía oficial. El porcentaje de cumplimiento no es un puntaje de aptitud.
- **WebGL:** la captura depende de `preserveDrawingBuffer` y del navegador. Si el contexto no expone el canvas, el informe se genera sin imagen y se avisa al usuario.
- **PDF:** el número de páginas depende de las secciones activas, la longitud de textos y la disponibilidad de la captura.
- **Almacenamiento:** la cuota de `localStorage` depende del navegador. Proyectos grandes o muchos documentos pueden agotarla; la aplicación muestra el uso, pero no comprime ni migra datos.

---

## 6. Reproducción rápida

```bash
npm install
npx vitest run
npm run test:e2e
npm run build
npx next dev -p 3100
```

La suite E2E requiere Google Chrome instalado (`channel: "chrome"`). Si no está disponible, instale Chromium con `npx playwright install chromium` y cambie el canal en `playwright.config.ts`.

Luego:

1. Entrar al splash y confirmar 8/8 autopruebas.
2. Ejecutar `npm run test:e2e` y confirmar 7/7 flujos.
3. Abrir **Modelo 3D** y verificar el canvas y la captura PNG.
4. Editar una celda y comprobar el recálculo de volumen, capacidad y vida útil.
5. Cambiar de escenario y comparar.
6. Ejecutar Monte Carlo con 200 iteraciones y semilla 20260101.
7. Generar el PDF y revisar las 19 secciones.
8. Exportar proyecto, respaldo y CSV.
9. Recargar y confirmar la persistencia.

---

## 7. Registro de artefactos de la sesión

| Archivo | Tamaño / dato |
|---|---|
| Proyecto JSON | 63 000 bytes |
| Respaldo completo | 299 763 bytes |
| PNG 3D | 335 630 bytes · 1600 × 900 |
| PDF de sesión | 182 919 bytes · 24 páginas · 2 imágenes |
| PDF anterior | 252 809 bytes |
| CSV Monte Carlo | 200 iteraciones · semilla 20260101 · P10/P50/P90/Media |
| Reporte E2E | 7/7 pruebas · `npm run test:e2e` |
| Biblioteca normativa | 13 documentos · contraste 2026-11-04 |

Los archivos se generaron en la carpeta de descargas del navegador y no se versionan en el repositorio.
