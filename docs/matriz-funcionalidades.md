# Matriz de funcionalidades implementadas

**Green Owl Landfill 3D 1.0.0 · GO-ENGINE 1.0.0**

Esta matriz describe lo que la aplicación **hace realmente**, distinguiendo cálculo, persistencia, salida documental y campos declarativos. No se listan controles decorativos: los campos que no alteran el motor están identificados como declarativos y se conservan porque alimentan el informe, la validación o la trazabilidad.

## Leyenda

| Estado | Significado |
|---|---|
| **Calculado** | Alimenta uno o más motores y actualiza resultados, gráficos, 3D o validación. |
| **Persistido** | Se guarda en el proyecto/escenario y sobrevive a la recarga. |
| **Declarativo** | Se registra y reporta, pero no cambia el resultado del motor. Se etiqueta en la interfaz. |
| **Documental** | Genera archivo, PDF, CSV, PNG o biblioteca. |

---

## Matriz por módulo

| # | Módulo | Funcionalidad implementada | Estado | Salida / persistencia |
|---|---|---|---|---|
| 01 | **Proyectos** (`inicio`) | KPIs del proyecto activo; biblioteca de proyectos con métricas calculadas; abrir proyecto; crear proyecto; duplicar; archivar/restaurar; eliminar con confirmación; restaurar demostraciones; ruta de trabajo sugerida. | Calculado · Persistido | `localStorage`; navegación al proyecto |
| 02 | **Emplazamiento** | Metadatos del proyecto; país, región, ubicación y coordenadas; área, cota, uso de suelo, accesos, áreas sensibles; geología, hidrogeología, profundidad al freático, permeabilidad; clima (P anual, P máxima mensual/diaria, ET, escorrentía); PGA; material de cobertura; riesgos; calidad por campo; completitud ponderada y alertas; **verificación de localización** con distancias a poblaciones, agua superficial, infraestructura, áreas agrícolas, granjas, fallas y aeródromos, pendiente y nueve exclusiones territoriales (R.M. 165-2021 / art. 110 del D.S. 014-2017-MINAM). | Calculado · Persistido · Declarativo | Validación; informe; 3D no georreferenciado |
| 03 | **Modelo 3D** | Visor Three.js con celdas, terreno, excavaciones, residuos por año, liner por capas, red de lixiviados, pozas y tratamiento, drenaje pluvial y poza de sedimentación, pozos y red de biogás, antorcha, vías y accesos, garita, báscula, edificios administrativos, cerco perimetral, barrera vegetal, pozos de monitoreo, etiquetas, curvas, rejilla, sombras, flujo/gas animado, plano de corte, rotación, vistas iso/planta/frente/lateral/corte, selección de celda, avance temporal con reproducción, captura PNG 1600×900. | Calculado · Visual | PNG; selección y año en store |
| 04 | **Celdas y capas** | Parámetros geométricos del escenario; agregar, duplicar, reordenar y eliminar celdas; método constructivo con preset real (trinchera, área, rampa) y método efectivo derivado del corte/relleno; editar dimensiones, talud, profundidad de corte, borde libre, cota, bermas, rampa, secuencia y notas; advertencias y verificaciones por celda; perfil área-altura/volumen con líneas de terreno y diseño; agregar, editar, habilitar y eliminar capas; exportar capacidad CSV. | Calculado · Persistido | Geometría, capacidad, balance de tierras, 3D, CSV |
| 05 | **Capacidad** | Factor de utilización; reserva de infraestructura; relación de cobertura; base de densidad inicial/estabilizada; densidades; descomposición volumen geométrico → bruto de diseño (borde libre) → liner → infraestructura → útil → residuos/cobertura; excavación de celdas y rampas; balance de tierras; cierre volumétrico; capacidad por celda; curva volumen-elevación; exportar CSV. | Calculado | Capacidad, vida útil, 3D, CSV |
| 06 | **Residuos** | Población, per cápita, cobertura de recolección, recuperación, crecimientos, horizonte, base de densidad; composición con validación de suma 100 %; balance anual generado/recolectado/recuperado/dispuesto; vida útil con agotamiento fraccional; tabla y gráfico; exportar CSV. | Calculado · Persistido | Vida útil, lixiviados, biogás, costos, CSV |
| 07 | **Lixiviados** | Modo de área expuesta (operación/manual); área manual; humedad de ingreso; capacidad de campo; factor de infiltración en áreas cerradas; retención; coeficiente suizo K; capacidad de tratamiento; diámetro, pendiente y Manning; permeabilidad de barrera; balance anual; tratamiento y déficit; almacenamiento; Manning; método suizo; fórmula racional; fuga Darcy de referencia; exportar CSV. | Calculado | Caudal, almacenamiento, validación, CSV |
| 08 | **Biogás** | DOC, DOCf, MCF, k, fracción CH₄, captación en operación y clausura, oxidación, antorcha, eficiencia eléctrica, LHV, temperatura de referencia, años de posclausura, pozos declarados; potencial último; año y caudal pico; captura, oxidación, emisión, quema y energía; diagnóstico por pozo; exportar CSV. | Calculado | CH₄, energía, costos, validación, CSV |
| 09 | **Operación** | Año de inicio; frente de trabajo; cobertura diaria sincronizada con la capa `daily-cover`; celdas activas declaradas (diagnóstico); pasadas de compactación (declarativo); modo de secuencia (declarativo); reproducción por año; secuencia de celdas; operación año a año; cota máxima; exportar CSV. | Calculado · Declarativo | Lixiviados, cronología, 3D, CSV |
| 10 | **Geotecnia** | Ángulo promedio ponderado del talud; peso unitario; profundidad de falla; c' y φ'; cohesión y fricción de interfaz; relación de freático; casos base, interfaz, seco y saturado; FS, banda, esfuerzos y presión de poros; SVG esquemático; advertencia de alcance. | Calculado · Conceptual | Validación; informe; gráfico |
| 11 | **Clausura** | Año de cierre anticipado opcional; años de posclausura; reserva por asentamiento; capas finales editables/habilitables; tareas con fechas, responsables y avance; puntos de monitoreo con estado; programa trimestral; volumen de cobertura; exportar cronograma CSV. | Calculado · Persistido | Cobertura, cronograma, validación, CSV |
| 12 | **Escenarios** | Crear escenario estándar o personalizado; duplicar; marcar como base; eliminar; editar nombre, color, descripción; comparar indicadores; tabla de deltas; restablecer parámetros desde la base; exportar comparación CSV. | Calculado · Persistido | Escenarios independientes, CSV |
| 13 | **Sensibilidad** | OAT con nueve variables y perturbaciones declaradas; tornado por indicador; Monte Carlo con iteraciones y semilla; P10/P50/P90/media de vida útil, lixiviados y CH₄; exportar OAT y Monte Carlo CSV. | Calculado · Conceptual | Tablas, gráficos, CSV |
| 14 | **Resultados** | Síntesis por sistema; KPIs de capacidad, vida útil, VPN, costo unitario, lixiviados, CH₄ y FS; costos CAPEX/OPEX/tratamiento/ingreso/tasa; costo anual; comparación contra base; hallazgos de validación con filtro por severidad; exportar proyecto, costos CSV y comparación. | Calculado · Documental | Vista integrada; JSON/CSV |
| 15 | **Informes** | Selección de 19 secciones; incluir/excluir captura 3D; responsable técnico; observaciones; validación de contenido mínimo; captura WebGL; generación PDF local; metadatos del último informe; advertencias de alcance. | Documental | PDF con tablas e imágenes |
| 16 | **Métodos** | Catálogo de 20 métodos; filtros por proyecto/categoría/estado; fórmula, variables, fuente, páginas, supuestos, limitaciones, función del motor y caso de prueba; ejecución de 11 autopruebas en vivo; tabla de 31 valores de referencia; fuentes citadas; exportar métodos y selección CSV. | Documental · Verificación | Catálogo, pruebas, CSV |
| 17 | **Normativa** | Biblioteca con 13 documentos iniciales (8 vigentes verificados, 4 referencias históricas y 1 pendiente); estadísticas por estado y clasificación; alta, edición y eliminación; URL oficial; estado de verificación; clasificación; exportar biblioteca/selección CSV; restaurar biblioteca; advertencia cuando haya pendientes. | Persistido · Documental | Biblioteca local, CSV |
| 18 | **Configuración** | Preferencias completas del visor; vistas; toggles de escena; exageración de capas; animaciones; corte; rotación; modo compacto; reducción de movimiento; exportar proyecto JSON; respaldo completo; importar JSON con documentos opcionales; diagnóstico de 8 pruebas; uso de almacenamiento; restablecer espacio; restaurar demos. | Persistido · Documental | JSON, preferencias, diagnóstico |

---

## Funciones transversales

| Función | Implementación | Verificación |
|---|---|---|
| Cambio de proyecto | Selector en topbar; resetea escenario activo, celda y año; conserva el módulo actual salvo `inicio`. | Navegación de proyectos |
| Cambio de escenario | Selector en topbar; cada escenario tiene parámetros completos e independientes. | Cambio base → conservador y regreso |
| Autoguardado | Zustand `persist` escribe en `localStorage` en cada cambio de estado persistido. | Recarga de página conserva edición |
| Estado de guardado | Topbar muestra última escritura; Configuración muestra bytes, cuota y revisión. | Inspección visual y de store |
| Validación | `validateModel` genera errores, advertencias e información por módulo, con referencia cuando aplica. | Panel de hallazgos y CSV |
| Recuperación de errores | `ModelProvider` cae al escenario base si un escenario falla; `ModuleBoundary` muestra panel de recuperación. | Revisión de código y pruebas de navegación |
| Navegación | 18 módulos agrupados en Laboratorio, Sistemas, Análisis y Documentación; sidebar colapsable; menú móvil. | Recorrido de los 18 módulos |
| Escena persistente | Dock 3D al costado de los módulos; pantalla completa en Modelo 3D; oculto en anchos ≤1080 sin perder el acceso desde Modelo/Configuración. | Verificación responsive |
| Toasts y diálogos | Confirmaciones para eliminación, restablecimiento y creación; avisos de exportación/importación. | CRUD de normativa e importación |
| Accesibilidad básica | Etiquetas ARIA en iconos, switches y campos; navegación por teclado; reducción de movimiento. | Revisión de componentes |
| Formato | Números, fechas y moneda en español; unidades SI internas. | Vistas y PDF |

---

## Controles declarativos: qué no cambia el cálculo

La aplicación evita presentar estos campos como si fueran motores activos:

| Campo | Efecto real | Tratamiento en interfaz |
|---|---|---|
| `operation.compactionPasses` | No modifica la densidad; la densidad se define en Residuos. | Etiquetado como dato operativo declarado. |
| `operation.sequenceMode` | El motor asigna siempre por `sequenceOrder`; el modo no reordena. | Etiquetado como declarativo. |
| `operation.activeCellsPerYear` | Se contrasta con las celdas activas simuladas; no reordena la asignación. | Diagnóstico con alerta si la simulación supera lo declarado. |
| `geotech.seismicCoefficient` / `site.seismicPga` | Se registra la PGA; el análisis pseudo-estático no está implementado. | Advertencia explícita en Geotecnia y Métodos. |
| `site.dataQuality` | No altera fórmulas; alimenta completitud y alertas. | Selector por campo y badge de calidad. |
| `closure.tasks.done` | Alimenta el avance de tareas; no cambia volúmenes ni fechas del cronograma. | Progreso visible. |
| `monitoringPoints.status` | Genera alertas de clausura; no altera cálculos ambientales. | Estado editable y alertas. |
| `leachate.closedAreaFraction` | Campo interno no expuesto; el área cerrada se deriva del avance de llenado. | No se muestra como control. |
| `scene.explode` | Sin control en la interfaz y sin efecto geométrico actual. | No se expone. |

---

## Exportaciones y artefactos

| Artefacto | Contenido | Generación |
|---|---|---|
| Proyecto JSON | Proyecto completo, escenarios y documentos opcionales; `format: green-owl-landfill-3d`, `schemaVersion: 1`. | Cliente |
| Respaldo completo | Todos los proyectos y la biblioteca documental; `format: green-owl-landfill-3d-backup`. | Cliente |
| CSV de residuos | Población, generación, recolección, recuperación, disposición, densidad, volúmenes, llenado y remanente. | Cliente |
| CSV de lixiviados | Áreas, precipitación, escorrentía, ET, infiltración, humedad, lixiviado, tratamiento y caudales. | Cliente |
| CSV de biogás | CH₄ generado, biogás, captura, oxidación, emisión, quema y energía. | Cliente |
| CSV de capacidad | Celda, secuencia, volumen geométrico, bruto de diseño, borde libre, corte, relleno, rampa, liner, reserva, residuos, cobertura, tonelaje, llenado y cota. | Cliente |
| CSV de escenarios | Capacidad, vida útil, lixiviados, pico, CH₄, captura, energía, VPN y FS. | Cliente |
| CSV de validación | Severidad, módulo, hallazgo, detalle y referencia. | Cliente |
| CSV de costos | Año, OPEX, tratamiento, ingreso, neto y descontado. | Cliente |
| CSV de cronograma | Tareas de cierre/posclausura con fechas y responsables. | Cliente |
| CSV de sensibilidad | OAT y percentiles Monte Carlo. | Cliente |
| CSV de métodos/normativa | Catálogo o selección con metadatos y estado. | Cliente |
| PNG 3D | Vista actual a 1600 × 900. | WebGL |
| PDF | Informe técnico de 19 secciones con tablas, supuestos y captura. | jsPDF |

---

## Cobertura de la interfaz

- **18 módulos** con contenido real, sin pantallas placeholder.
- **Sin botones decorativos**: las acciones de navegación, edición, exportación, importación, captura y diagnóstico están conectadas a estado o motores.
- **Sin datos inventados de campo**: los casos demo están rotulados como sintéticos; la biblioteca normativa distingue referencia técnica, requisito legal y verificación pendiente.
- **Sin exports simulados**: los archivos se construyen con los datos del modelo activo y se descargan desde el navegador.

Las limitaciones que condicionan esta matriz se detallan en [`limitaciones-conocidas.md`](limitaciones-conocidas.md).
