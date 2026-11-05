# Datos pendientes

**Green Owl Landfill 3D 1.0.0**

Este documento separa tres cosas que no deben confundirse:

1. **Datos sintéticos de demostración:** permiten probar la aplicación, no describen un sitio real.
2. **Parámetros pendientes de calibración:** existen en el modelo, pero requieren caracterización o ensayos.
3. **Normativa con estado de verificación:** la biblioteca distingue vigencia contrastada, verificación pendiente y referencia histórica; ninguna entrada sustituye la lectura del texto oficial.

---

## 1. Estado de los proyectos incluidos

Los tres proyectos son **demostrativos y sintéticos**:

| Proyecto | Región declarada | Población | Horizonte | Advertencia |
|---|---|---:|---:|---|
| Relleno Sanitario Valle Verde | Junín, Perú | 185 000 | 20 años | Datos sintéticos; no es un emplazamiento real. |
| Relleno Mecanizado La Ceiba | Atlántida, Honduras | 68 000 | 18 años | Clima húmedo y freático somero generan alertas deliberadas. |
| Planta Integral Norte Piura | Piura, Perú | 320 000 | 22 años | Datos sintéticos; no representa una instalación existente. |

Las coordenadas, responsables, costos, caudales y condiciones de sitio son valores de demostración. **No deben usarse en un expediente, inversión o decisión ambiental.**

---

## 2. Biblioteca normativa: verificación pendiente

La biblioteca inicial contiene **13 documentos** (8 vigentes verificados, 4 referencias históricas y 1 con verificación pendiente), contrastados con fuentes oficiales el **4 de noviembre de 2026**:

| Documento | Estado en la app | Clasificación | Verificación / observación |
|---|---|---|---|
| Decreto Legislativo N.° 1278 — Ley de Gestión Integral de Residuos Sólidos (Perú) | `vigente-verificado` | Requisito legal | Vigente. Modificado por la Ley N.° 32212 (2024). Leer el texto consolidado. |
| Decreto Supremo N.° 014-2017-MINAM — Reglamento del D.L. 1278 | `vigente-verificado` | Requisito legal | Vigente. Modificado por el D.S. 001-2022-MINAM. El proyecto de modificación de 2025–2026 no consta aprobado. |
| Ley N.° 32212 — Modifica el D.L. 1278 y la Ley N.° 26793 | `vigente-verificado` | Requisito legal | Publicada el 21-12-2024. Ordenó adecuar el Reglamento en 120 días; adecuación pendiente. |
| Decreto Supremo N.° 001-2022-MINAM — Modifica el Reglamento del D.L. 1278 | `vigente-verificado` | Requisito legal | Vigente. Modificatoria principal del D.S. 014-2017-MINAM. |
| Decreto Supremo N.° 001-2024-MINAM — Adecuación ambiental de actividades de residuos sólidos | `vigente-verificado` | Requisito legal | Vigente. Regula IGA correctivos (diagnóstico preliminar y PAMA). |
| Decreto Supremo N.° 001-2025-MINAM — Modifica el D.S. 001-2024-MINAM | `vigente-verificado` | Requisito legal | Vigente. Ajusta plazos y disposiciones de adecuación ambiental. |
| Guía MINAM 2019 — Diseño y construcción de infraestructuras para disposición final | `vigente-verificado` | Recomendación técnica | Guía técnica vigente de 116 páginas. Aporta criterios de barrera, geomembrana, gas y drenaje; cuando reproduce el D.S. 014-2017-MINAM se cita como requisito legal. |
| R.M. N.° 165-2021-MINAM (anexo) — Identificación de zonas potenciales | `pendiente-verificacion` | Recomendación técnica | Documento propuesta de 44 páginas. No consta en el archivo su aprobación como norma; se usa como referencia metodológica para la verificación de localización. |
| Ley N.° 27314 — Ley General de Residuos Sólidos | `referencia-historica` | Requisito legal | Derogada por el D.L. 1278; se conserva por trazabilidad de la guía 2011. |
| Decreto Supremo N.° 057-2004-PCM — Reglamento de la Ley 27314 | `referencia-historica` | Requisito legal | Derogado y sustituido por el D.S. 014-2017-MINAM; la cobertura de 0.50 m se conserva como referencia técnica. |
| Guía MINAM 2011 — Relleno Sanitario Mecanizado | `referencia-historica` | Recomendación técnica | Documento técnico de 2011; sus referencias normativas internas están desactualizadas. |
| Manual Honduras 2014 — Construcción y Operación de Rellenos Sanitarios | `referencia-historica` | Recomendación técnica | Aplicabilidad al sitio y a la jurisdicción; no es norma peruana. |
| IPCC 2006 — Vol. 5, Cap. 3 | `vigente-verificado` | Recomendación técnica | Metodología vigente; `DOC`, `DOCf`, `MCF`, `F` y `k` deben justificarse localmente. |

### 2.1 Lo que no se afirma

- No se afirma que el texto original de 2016 o 2017 siga literalmente vigente: el D.L. 1278 fue modificado por la Ley N.° 32212 y el Reglamento por el D.S. 001-2022-MINAM.
- No se cita un artículo como obligación concreta sin haber leído el texto consolidado; la biblioteca registra el dispositivo y su modificatoria, no reemplaza el articulado.
- No se convierten en requisitos legales los valores técnicos de las guías: 3 m al freático, 60 cm de arcilla, 0.50 m de cobertura final, talud 1H:3V, cobertura diaria 15–20 cm, etc.
- No se aplican umbrales peruanos a un proyecto hondureño ni viceversa sin declararlo.
- No se presenta la R.M. 165-2021 como norma aprobada: se consultó como documento propuesta y la app la marca `pendiente-verificacion`.
- La verificación de localización no mide distancias ni interpreta cartografía: compara los valores declarados por el usuario y no emite un puntaje de aptitud.

### 2.2 Antes de usar la biblioteca

1. Abrir la URL oficial y confirmar la versión consolidada y sus modificatorias.
2. Registrar número, fecha, artículo y fecha de consulta.
3. Cambiar el estado solo con evidencia de contraste.
4. Si la norma no aplica al proyecto, mantenerla como referencia histórica o retirarla.
5. Revisar el informe PDF: la sección normativa imprime el estado real, incluidas las advertencias.
6. Para el proyecto peruano, revisar también la Ley N.° 32212 y el D.S. 001-2024-MINAM, modificado por el D.S. 001-2025-MINAM.

> **Migración de la biblioteca:** al abrir una sesión creada con una versión anterior, la app reemplaza los documentos canónicos por la biblioteca de 13 entradas y conserva los documentos agregados por el usuario. La migración se ejecuta una sola vez al actualizar el esquema de `localStorage` (versión 1 → 3).

---

## 3. Datos de emplazamiento requeridos

La app declara **12 campos** de calidad de dato. Para un proyecto real, todos deberían pasar de `supuesto`/`faltante` a `medido` o `estimado` con fuente.

| Campo | Uso en el modelo | Dato mínimo requerido |
|---|---|---|
| Topografía y pendientes | Huella, cotas, excavaciones, 3D | Levantamiento topográfico o MDT; curvas, cotas y pendientes. |
| Geología del emplazamiento | Revisión de aptitud, capas | Mapa geológico, perfiles, descripción de materiales. |
| Geotecnia y ensayos de suelo | Talud, barrera, estabilidad | Ensayos de corte, granulometría, límites, compactación, permeabilidad. |
| Hidrogeología y nivel freático | Separación al freático, lixiviados | Niveles piezométricos estacionales, dirección de flujo, acuíferos. |
| Permeabilidad del suelo | Fuga, barrera natural | Ensayos in situ y de laboratorio; unidad y método. |
| Hidrología superficial y escorrentía | Balance hídrico, drenaje | Cuenca aportante, caudales, coeficientes, drenaje existente. |
| Precipitación y evapotranspiración | Lixiviados, diseño | Serie histórica, máximos mensuales/diarios, ET local. |
| Disponibilidad de material de cobertura | Capacidad, clausura | Volumen, calidad, distancia, permisos y costo. |
| Accesos y vías internas | Operación, costos | Trazado, capacidad, pendientes, distancia. |
| Uso de suelo y áreas sensibles | Aptitud, validación | Zonificación, viviendas, cuerpos de agua, áreas protegidas. |
| Riesgos naturales y condicionantes sociales | Validación, alertas | Sismo, inundación, erosión, remoción, conflictos. |
| Aceptación y consulta comunitaria | Validación social | Actas, acuerdos, consulta previa cuando aplique. |

La **completitud ponderada** de la app asigna 1.0 a medido, 0.6 a estimado, 0.3 a supuesto y 0 a faltante. Es un indicador de completitud, **no de aptitud**.

### 3.1 Datos para la verificación de localización

La matriz de localización (R.M. 165-2021 / art. 110 del D.S. 014-2017-MINAM) requiere que el usuario declare, con fuente cartográfica o de campo:

| Dato | Referencia | Uso |
|---|---|---|
| Distancia a centros poblados | ≥ 500 m | Criterio con restricción dura |
| Distancia a agua superficial | ≥ 500 m | Criterio con restricción dura |
| Distancia a infraestructura existente | ≥ 500 m | Criterio con restricción dura |
| Distancia a áreas agrícolas | ≥ 500 m | Criterio con restricción dura |
| Distancia a granjas porcinas/avícolas | 5–10 km | Observación si < 5 km |
| Distancia a fallas geológicas | ≥ 1 km | Criterio con restricción dura |
| Distancia a aeródromos | < 4 km no cumple; 4–13 km observado; ≥ 13 km cumple | Franja de verificación |
| Pendiente del terreno | < 25 % (25–30 % observado) | Criterio técnico |
| Nueve exclusiones territoriales | Sin superposición | Restricción dura si se declara |

Sin estos datos la aplicación reporta **«sin dato»**; no supone cumplimiento. La verificación es declarativa y no reemplaza el modelamiento SIG ni la inspección de campo.

---

## 4. Parámetros técnicos pendientes de calibración

### 4.1 Residuos y capacidad

| Parámetro | Valor demo | Requiere |
|---|---|---|
| Población servida | 68 000–320 000 | Censo, proyección y área de servicio. |
| Generación per cápita | 0.55–0.65 kg/hab/día | Estudio de caracterización local. |
| Cobertura de recolección | 80–92 % | Registros municipales. |
| Tasa de recuperación | 5–12 % | Caracterización de reciclables y capacidad de separación. |
| Densidad inicial | 700–900 kg/m³ | Ensayos de compactación y práctica operativa. |
| Densidad estabilizada | 850–1 000 kg/m³ | Asentamientos medidos o literatura local. |
| Relación de cobertura | 18–22 % | Diseño operativo y disponibilidad de material. |
| Composición | Orgánico 48–58 % | Estudio de composición con temporada y muestra. |

La densidad es el parámetro con mayor efecto sobre tonelaje y vida útil. La base inicial/estabilizada debe declararse y justificarse.

### 4.2 Lixiviados

| Parámetro | Valor demo | Requiere |
|---|---|---|
| Humedad de ingreso | 45–65 % | Caracterización por temporada. |
| Capacidad de campo | 28–32 % | Ensayos de retención. |
| Factor de infiltración de cobertura | 0.10–0.25 | Diseño de cobertura y ensayos. |
| Coeficiente de escorrentía | 0.30–0.45 | Hidrología local y cobertura. |
| Coeficiente suizo K | 0.15–0.25 | Densidad y compactación; la guía cita rangos, no un valor único. |
| Capacidad de tratamiento | 30–90 m³/día | Diseño de planta y caudales reales. |
| Diámetro/pendiente/Manning | 200–250 mm; 0.8–1.2 %; 0.013 | Diseño hidráulico y material de tubería. |
| Permeabilidad de barrera | 1×10⁻¹² m/s | Ensayos de geomembrana/barrera y control de calidad. |

No se modela flujo no saturado ni transporte de contaminantes. Para diseño de tratamiento se requiere caracterización de DQO, DBO, SST, nitrógeno, metales y caudales.

### 4.3 Biogás

| Parámetro | Valor demo | Requiere |
|---|---|---|
| DOC | 0.15–0.18 | Composición y fracción orgánica degradable. |
| DOCf | 0.5 | Literatura/local; IPCC propone valores por defecto. |
| MCF | 0.8–1.0 | Condición anaerobia del relleno. |
| k | 0.05–0.08 1/año | Clima, humedad y pruebas de campo. |
| Fracción CH₄ | 0.50–0.56 | Medición de gas. |
| Captación | 45–70 % operación; 70–88 % clausura | Diseño y pruebas de pozos. |
| Oxidación | 8–15 % | Cobertura y condiciones. |
| Antorcha/energía | 95–98 %; 30–38 % | Tecnología y eficiencia real. |
| Pozos declarados | 10–20 | Diseño de captura, radio de influencia, succión. |

El “caudal pico” es el promedio del año de mayor generación; no sustituye un caudal instantáneo de diseño.

### 4.4 Geotecnia

| Parámetro | Valor demo | Requiere |
|---|---|---|
| Peso unitario | 15–17 kN/m³ | Ensayos. |
| Cohesión efectiva | 3–8 kPa | Corte directo/triaxial. |
| Fricción efectiva | 24–28° | Corte directo/triaxial. |
| Interfaz geosintética | 20–24°, c=0 | Ensayos de interfaz. |
| Relación de freático | 0.2–0.5 | Piezometría. |
| Profundidad de falla | 6–9 m | Perfil estratigráfico. |
| PGA | 0.10–0.35 | Estudio sísmico local. |

El análisis pseudo-estático no está implementado. La PGA solo se registra. Para estabilidad global se requiere un estudio geotécnico con métodos de equilibrio límite o elementos finitos.

### 4.5 Clausura y costos

| Parámetro | Valor demo | Requiere |
|---|---|---|
| Capas finales | 7 capas, 1 751 mm habilitados | Diseño específico y requisitos aplicables. |
| Asentamiento | 5–6 % | Ensayos o experiencia local. |
| Posclausura | 25–30 años | Requisito aplicable y plan de monitoreo. |
| Monitoreo | 5 puntos demo | Plan aprobado, límites y laboratorio. |
| CAPEX | USD 4.8–22 M | Presupuesto real. |
| OPEX | USD 16–22/t | Costos locales. |
| Tratamiento | USD 6–9/m³ | Cotización y tecnología. |
| Ingreso energía | USD 70–95/MWh | Contrato o tarifa. |
| Tasa de descuento | 8–9 % | Política financiera. |

CAPEX, OPEX, tratamiento e ingresos son **datos declarados por el usuario**. No son estimaciones de mercado de Green Owl Labs.

---

## 5. Datos que el informe debe declarar como faltantes

El PDF incluye una sección de supuestos y limitaciones. Antes de emitirlo, verifique que declare:

- Proyecto y escenario exactos.
- Fecha y responsable técnico.
- Calidad de los datos de sitio.
- Parámetros de densidad, cobertura y humedad.
- Métodos usados y sus páginas de fuente.
- Hallazgos de validación (errores, advertencias, información).
- Normativa con su estado de verificación y sus modificatorias.
- Limitaciones del modelo y ausencia de firma digital.

---

## 6. Lista de verificación antes de un uso real

- [ ] Sustituir todos los datos sintéticos.
- [ ] Adjuntar topografía, geotecnia, hidrogeología y caracterización.
- [ ] Verificar la normativa aplicable en fuente oficial.
- [ ] Justificar densidad, cobertura, humedad, DOC y k.
- [ ] Revisar la separación al nivel freático y la barrera.
- [ ] Confirmar el diseño hidráulico y la capacidad de tratamiento.
- [ ] Revisar estabilidad global con un estudio especializado.
- [ ] Confirmar el plan de cierre, posclausura y monitoreo.
- [ ] Revisar costos con cotizaciones reales.
- [ ] Hacer revisar y firmar por profesional habilitado.
- [ ] Exportar y conservar un respaldo JSON y el PDF.

Mientras algún elemento siga pendiente, los resultados deben presentarse como **estimación preliminar**, no como diseño aprobado.
