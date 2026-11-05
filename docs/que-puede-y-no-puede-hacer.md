# Qué puedes y qué no puedes hacer con Green Owl Landfill 3D

**Green Owl Landfill 3D 1.0.0 · GO-ENGINE 1.0.0**

Este documento responde una pregunta concreta: **¿la aplicación sirve para diseñar un relleno sanitario manual, semimecanizado o mecanizado?**

Respuesta corta: **sí para prediseño, dimensionamiento preliminar y trazabilidad técnica; no para diseño ejecutivo, aprobación legal ni construcción.**

---

## 1. Respuesta por tipo de relleno

| Tipo | ¿Se puede prediseñar aquí? | Cómo se representa | Límite principal |
|---|---|---|---|
| **Mecanizado** | **Sí, con mayor madurez** | Plantilla «Relleno mecanizado»: celdas tipo área, 4 unidades, operación con compactación y balance anual. | No genera planos, ni diseño de detalle de vías, drenajes o taludes. |
| **Semimecanizado** | **Sí, como prediseño** | Plantilla «Trinchera / manual» y celdas tipo trinchera; permite densidad y geometría de trinchera. | No distingue formalmente la maquinaria ni el grado de mecanización; el usuario debe justificarlo. |
| **Manual** | **Sí, solo como prefactibilidad** | Celdas tipo trinchera, densidad manual (400–500 kg/m³ como referencia), menor altura y volumen. | El motor y las guías son de base mecanizada; no valida criterios constructivos manuales ni operación con personal. |
| **Celda transitoria** | **Sí, con advertencia** | Tipo de instalación `celda-transitoria`; la validación avisa si el caudal supera 50 t/día o la vida útil excede el límite de la guía. | No reemplaza la justificación sanitaria ni el expediente de emergencia. |
| **Planta integral** | **Sí, como escenario de capacidad** | Plantilla con rampas, recuperación y 6 celdas; permite descontar recuperación y evaluar tonelaje dispuesto. | No diseña la planta de separación, compostaje ni valorización. |

### Lo importante sobre los métodos

- La geometría de celda admite **trinchera (`trench`)**, **área (`area`)** y **rampa (`ramp`)**.
- La biblioteca de métodos y la validación citan criterios de la Guía MINAM 2019 y del Manual de Honduras 2014, pero **no existe un código de diseño manual completo** dentro de la app.
- Para un relleno manual o semimecanizado, la app te ayuda a cubrir el **balance de masa, volumen, vida útil, lixiviados, biogás y cierre**; no te exime de definir altura de celda, taludes, compactación, cobertura diaria y operación según la práctica local.
- Para un relleno mecanizado, la app está más alineada con las guías MINAM 2011/2019 y con el Manual de Honduras 2014.

---

## 2. Lo que sí puedes hacer hoy

### 2.1 Proyecto y emplazamiento

- Crear, duplicar, archivar y eliminar proyectos.
- Trabajar con tres proyectos demostrativos o crear uno desde plantilla.
- Declarar país, región, ubicación, coordenadas, área, cota, uso de suelo, accesos y áreas sensibles.
- Registrar geología, hidrogeología, profundidad al freático, permeabilidad, clima, escorrentía, PGA y material de cobertura.
- Asignar **calidad de dato** por campo (`medido`, `estimado`, `supuesto`, `faltante`) y obtener completitud ponderada.
- **Verificar la localización** contra distancias y exclusiones de la R.M. 165-2021 y del art. 110 del D.S. 014-2017-MINAM:
  - poblaciones, agua superficial, infraestructura y áreas agrícolas ≥ 500 m;
  - granjas 5–10 km; fallas ≥ 1 km; aeródromos con franjas de 4 y 13 km;
  - pendiente < 25 % (25–30 % observado);
  - nueve exclusiones territoriales.
- Ver restricciones duras y un porcentaje de cumplimiento **que no es un puntaje de aptitud**.

### 2.2 Geometría y capacidad

- Definir celdas con largo, ancho, altura, talud, bermas, cota base, tipo (trinchera, área, rampa) y forma (excavada o montículo).
- Agregar, duplicar, reordenar y eliminar celdas.
- Calcular volumen por integración prismoidal, área de liner, huella y perfil volumen–elevación.
- Editar el sistema de capas: subrasante, arcilla, geomembrana, geotextil, drenaje, protección, residuos, cobertura diaria, intermedia y final.
- Calcular capacidad bruta, descuentos, volumen útil y tonelaje.
- Proyectar la vida útil con agotamiento fraccional y asignación secuencial por celda.

### 2.3 Residuos y operación

- Población, generación per cápita, cobertura de recolección, recuperación, crecimientos y horizonte.
- Composición de residuos con validación de suma 100 %.
- Balance anual generado / recolectado / recuperado / dispuesto.
- Densidad inicial y estabilizada; sensibilidad al parámetro de densidad.
- Secuencia de celdas y operación año a año; avance del llenado en el 3D.
- Diagnóstico de celdas activas declaradas.

### 2.4 Lixiviados

- Balance hídrico anual: precipitación, evapotranspiración, escorrentía, infiltración, retención y lixiviado generado.
- Área expuesta de operación o área manual declarada.
- Coeficiente suizo, fórmula racional y Manning.
- Diámetro, pendiente y capacidad de conducción.
- Capacidad de tratamiento, déficit y almacenamiento.
- Fuga Darcy de referencia y permeabilidad de barrera.

### 2.5 Biogás

- Metodología IPCC 2006 FOD: DOC, DOCf, MCF, k, fracción de CH₄.
- Potencial último, año pico, caudal pico y serie anual.
- Captación en operación y clausura, oxidación, quema y energía potencial.
- Diagnóstico de pozos declarados.
- Contraste con el umbral de 200 t/día de la Guía MINAM 2019 para captura centralizada.

### 2.6 Geotecnia, clausura y costos

- Talud infinito conceptual con casos base, interfaz, seco y saturado; FS, banda y presión de poros.
- Cobertura final, reserva por asentamiento, cronograma de tareas y puntos de monitoreo.
- CAPEX, OPEX, tratamiento, ingreso por energía y VPN simple.
- Comparación de escenarios y análisis de sensibilidad OAT + Monte Carlo.

### 2.7 Modelo 3D e informes

- Visor con celdas, terreno, excavaciones, residuos por año, liner por capas, red de lixiviados, pozas y tratamiento, drenaje pluvial, red de biogás, antorcha, vías, acceso, garita, báscula, edificios, cerco, barrera vegetal y pozos de monitoreo.
- Vistas isométrica, planta, frente, lateral y corte; selección de celda; reproducción temporal.
- Captura PNG y PDF local de 19 secciones configurables.
- Exportación JSON, respaldo completo y CSV de los módulos.

### 2.8 Trazabilidad

- Cada método declara fórmula, variables, fuente, páginas, supuestos, limitaciones y caso de prueba.
- Biblioteca de 13 documentos con estado de verificación: 8 vigentes, 4 históricos y 1 pendiente.
- Validación con errores, advertencias e información, con referencia cuando aplica.

---

## 3. Lo que no puedes hacer (o no debes concluir)

### 3.1 Diseño ejecutivo y legal

- **No genera planos de construcción**, perfiles, secciones de detalle, cubicaciones contractuales ni especificaciones técnicas.
- **No sustituye un expediente técnico** ni un estudio de impacto ambiental.
- **No declara cumplimiento normativo automático**: cita documentos y páginas, pero la vigencia y el articulado deben verificarse en la fuente oficial.
- **No tiene firma digital** ni sello de tiempo; el PDF es un documento de trabajo.
- **No reemplaza la revisión y firma de un profesional habilitado**.

### 3.2 Datos y campo

- No mide distancias, pendientes ni áreas: la verificación de localización es **declarativa**.
- No procesa topografía real (DXF, GeoTIFF, TIN) ni imágenes satelitales.
- No calibra densidad, permeabilidad, DOC, k ni captación con datos de campo.
- No valida la calidad de los datos: solo registra la calidad declarada.
- No modela la variabilidad estacional completa ni series mensuales continuas.

### 3.3 Ingeniería de detalle

- **Geotecnia:** solo talud infinito; no analiza fallas circulares, estabilidad global, capacidad de soporte, asentamientos ni licuación.
- **Hidráulica:** Manning a sección llena; no diseña redes, cámaras, bombeo, vertederos ni control de erosión.
- **Lixiviados:** no resuelve flujo no saturado, transporte de contaminantes, recirculación ni eficiencia real de planta.
- **Biogás:** no diseña pozos, colectores, sopladores, red de vacío ni antorcha; el caudal pico es un promedio anual.
- **Clausura:** cobertura horizontal simplificada; no modela erosión, pandeo, asentamiento diferencial ni estabilidad de la cobertura.
- **Vías y edificios:** el 3D es una implantación esquemática, no un diseño geométrico ni estructural.
- **Interferencias:** no detecta choques entre redes, vías, edificios y celdas.

### 3.4 Métodos manual y semimecanizado

- No existe un módulo específico de **operación manual**: no calcula cuadrillas, rendimiento, compactación manual, altura de frente ni cobertura con material local.
- No distingue formalmente **semimecanizado** de mecanizado; el usuario debe declarar y justificar la maquinaria y la densidad.
- Las referencias de densidad y talud son rangos técnicos, no límites legales.
- La Guía MINAM 2019 está orientada a infraestructura mecanizada; para manual y semimecanizado se usa como referencia, no como receta.

### 3.5 Costos y financiamiento

- CAPEX, OPEX, tratamiento e ingresos son **datos declarados**, no cotizaciones.
- No incluye impuestos, financiamiento, inflación, depreciación, posclausura ni remediación.
- No monetiza externalidades sociales o ambientales.

### 3.6 Operación del software

- Sin backend, cuentas, colaboración, auditoría ni sincronización.
- Solo `localStorage`: la cuota del navegador puede agotarse.
- Sin historial de versiones; el respaldo JSON es la única recuperación.
- El 3D requiere WebGL; sin WebGL se muestra una vista de planta de respaldo.

---

## 4. Flujo mínimo para un prediseño defendible

1. **Proyecto y emplazamiento:** crear el proyecto, declarar área, cota, clima, geología, hidrogeología y calidad de dato.
2. **Localización:** completar distancias, pendiente y exclusiones; resolver restricciones duras antes de seguir.
3. **Celdas y capas:** elegir trinchera, área o rampa; definir dimensiones, taludes, bermas y sistema de impermeabilización.
4. **Residuos:** población, per cápita, cobertura, recuperación, composición y densidades.
5. **Capacidad:** revisar volumen útil, tonelaje y vida útil; ajustar celdas si no cierra.
6. **Lixiviados y biogás:** revisar caudales, tratamiento, captura y energía.
7. **Operación y clausura:** secuencia, cobertura final, monitoreo y cronograma.
8. **Geotecnia:** revisar el FS conceptual y declarar que no es estabilidad global.
9. **Escenarios y sensibilidad:** comparar base, conservador y alternativas.
10. **Informe:** generar el PDF, revisar supuestos y limitaciones, y hacerlo revisar por un profesional.

---

## 5. Conclusión

La aplicación **sí sirve** para:

- prefactibilidad y prediseño de rellenos manuales, semimecanizados y mecanizados;
- dimensionamiento preliminar de celdas, capacidad, vida útil, lixiviados, biogás y cierre;
- verificación declarativa de localización;
- comparación de escenarios y trazabilidad de fórmulas y fuentes;
- comunicación técnica mediante 3D, tablas y PDF.

La aplicación **no sirve** para:

- aprobar un relleno sanitario;
- emitir planos o especificaciones de construcción;
- sustituir estudios de campo, geotecnia, hidrogeología, hidráulica o gas;
- certificar cumplimiento legal;
- operar el relleno.

**Regla práctica:** si el documento va a una autoridad, a un inversionista o a construcción, debe pasar por revisión profesional y por los estudios de detalle que la app no cubre.
