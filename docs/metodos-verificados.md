# Métodos verificados

**GO-ENGINE 1.0.0**

Este documento describe las formulaciones implementadas, su fuente, la función de código que las ejecuta y el tipo de verificación aplicada. La distinción es importante:

- **Validado con ejemplo documentado:** reproduce un caso numérico publicado.
- **Verificado por balance:** la suma, conservación o inversión interna cierra dentro de tolerancia.
- **Conceptual:** implementa una formulación clásica con alcance limitado; no es un modelo de diseño detallado.
- **Referencia:** se reproduce o cita un valor de la guía, sin convertirlo en límite legal.

Ninguna verificación interna equivale a certificación, calibración de campo ni cumplimiento normativo.

---

## 1. Catálogo implementado

| ID | Método | Categoría | Fuente | Función | Estado |
|---|---|---|---|---|---|
| `prismoid` | Volumen de celda por integración prismoidal | Geometría | MINAM 2011, pp. 58–59 | `geometry.cellVolumeZeroTo` / `computeGeometry` | Validado con ejemplo |
| `slice` | Integración por secciones con bermas | Geometría | GO-ENGINE | `geometry.cellGeometry` / `heightForVolume` | Verificado por balance |
| `capacity` | Capacidad útil y tonelaje | Residuos | MINAM 2011 pp. 60–63; Honduras 2014 pp. 33–35, 46–49 | `capacity.computeCapacity` | Verificado por balance |
| `honduras-capacity` | Capacidad preliminar requerida | Residuos | Honduras 2014, pp. 33–35 | Referencia comparativa | Referencia |
| `waste-balance` | Balance anual y vida útil | Residuos | MINAM 2011 pp. 61–63; Honduras 2014 pp. 46–50 | `waste.computeWasteBalance` | Verificado por balance |
| `water-balance` | Balance hídrico y lixiviados | Lixiviados | MINAM 2011, pp. 73–77 | `leachate.computeLeachate` | Verificado por balance |
| `swiss` | Método suizo | Lixiviados | MINAM 2011, p. 80 | `leachate.computeLeachate` | Referencia |
| `rational` | Fórmula racional de escorrentía | Hidráulica | MINAM 2011, pp. 69–71 | `leachate.computeLeachate` | Referencia |
| `manning` | Manning a sección llena | Hidráulica | MINAM 2011, p. 72 | `leachate.manningFullPipeCapacity` | Referencia |
| `ipcc-fod` | Descomposición de primer orden | Biogás | IPCC 2006, Vol. 5, Cap. 3 | `gas.computeGas` | Verificado por balance |
| `infinite-slope` | Talud infinito | Geotecnia | GO-ENGINE | `geotech.computeGeotech` | Verificado por balance |
| `oat` | Sensibilidad uno a la vez | Análisis | GO-ENGINE | `sensitivity.computeSensitivity` | Conceptual |
| `monte-carlo` | Monte Carlo | Análisis | GO-ENGINE | `sensitivity.runMonteCarlo` | Conceptual |
| `closure-cover` | Cobertura final | Geometría | Honduras 2014 pp. 50–52, 88; MINAM 2011 p. 64 | `closure.computeClosure` | Referencia |
| `reference-values` | Valores de referencia documentados | Geometría | Honduras 2014 / MINAM 2011 | `validation.validateModel` | Referencia |
| `site-selection` | Verificación de localización y exclusiones | Análisis | R.M. 165-2021 (anexo) Tabla 6; D.S. 014-2017-MINAM art. 110; Guía MINAM 2019 pp. 12–13 | `siteSelection.assessSiteSelection` / `validation.validateModel` | Validado con ejemplo |
| `barrier-gas-2019` | Barrera de fondo y captura de biogás | Geometría | Guía MINAM 2019 pp. 13, §12.9 y Cuadro N.° 43 (p. 165) | `validation.validateModel` | Validado con ejemplo |

---

## 2. Geometría y volumen

### 2.1 Integración prismoidal exacta

Para una celda rectangular con dimensiones que varían linealmente con la altura, el área horizontal es cuadrática en `z`. El volumen se integra por intervalos de berma:

```text
V = Σ (h_i / 6) · (A_1 + 4·A_m + A_2)
```

donde `A_1`, `A_m` y `A_2` son las áreas al inicio, medio y fin de cada intervalo. Las bermas se modelan como escalones horizontales de ancho `b` cada `H/n`.

**Caso MINAM 2011, p. 59.** Trinchera con corona 76 × 7 m, fondo 73.5 × 4.5 m y altura 2.5 m.

| Cálculo | Resultado |
|---|---:|
| Motor: prismoidal exacto | **1 075.83 m³** |
| Manual: `V = h/3 · (ab + cd + √(ab·cd))` | **1 068.52 m³** |
| Diferencia | **+0.68 %** |

La fórmula del manual es una aproximación de tronco; el motor integra el prismoidal exacto. Los dos valores se reportan por separado y **no se presenta el motor como reproducción exacta del manual**. La aritmética del manual sí se reproduce en la autoprueba `minam-frustum`.

**Inversión volumen → altura.** `heightForVolume` resuelve por bisección 40 iteraciones. La prueba unitaria exige error sub-milimétrico en el volumen recuperado.

**Limitación:** no es una cubicación topográfica. No usa un TIN, no modela intersecciones entre celdas ni irregularidades del terreno.

### 2.2 Área de liner y capas

- Área de fondo: `L_fondo · W_fondo`.
- Área lateral: integración del perímetro por intervalos, multiplicada por la longitud inclinada `√(1 + s²)`; incluye la superficie horizontal de cada berma.
- Área de liner: fondo + lateral.
- Capas de cobertura diaria/intermedia/final/vegetación: área de coronación.
- Volumen de capa: área aplicable × espesor real en metros.

Los espesores del cálculo son reales. La exageración de capas del visor 3D es solo visual y está etiquetada como tal.

---

## 3. Capacidad y residuos

### 3.1 Capacidad

```text
V_disponible = V_bruto · FU − V_liner − V_infra
V_residuos   = V_disponible / (1 + r_cobertura)
V_cobertura  = V_residuos · r_cobertura
T            = V_residuos · ρ / 1000
```

- `FU`: factor de utilización volumétrica, configurable.
- `V_infra`: porcentaje del volumen bruto, configurable.
- `r_cobertura`: relación **volumétrica** de cobertura, no másica.
- `ρ`: densidad inicial compactada o estabilizada, según la base seleccionada.

**Cierre comprobado:** `V_residuos + V_cobertura = V_disponible` y `T = V_residuos · ρ / 1000`, con tolerancia `1×10⁻⁶`.

**Referencia Honduras 2014.** La fórmula preliminar:

```text
V = 365 · 1.25 · Vida · Población · ppc · Cobertura / 600
```

Con 120 000 hab, 0.75 kg/hab/día, 85 % de cobertura y 12 años se obtienen **698 063 m³**. Se usa como referencia comparativa, no como cálculo principal.

**Limitación:** estimación volumétrica de diseño. No incorpora asentamientos diferenciales, pérdida de capacidad por inestabilidad ni levantamiento topográfico.

### 3.2 Balance anual

```text
Población_t = Población_0 · (1 + i)^t
ppc_t       = ppc_0 · (1 + g)^t
Generado_t  = Población_t · ppc_t · 365 / 1000
Recolectado_t = Generado_t · cobertura
Recuperado_t  = Recolectado_t · recuperación
Dispuesto_t   = Recolectado_t − Recuperado_t
Volumen_t     = Dispuesto_t · 1000 / ρ
```

El agotamiento se detecta cuando el volumen dispuesto supera el remanente. El año de agotamiento se interpola con la fracción del año en que se llena la capacidad. Si el volumen anual excede el remanente, solo se dispone la fracción que cabe.

**Verificación:** masa generada = recolectada + no recolectada; dispuesta = recolectada − recuperada; vida útil = año de agotamiento − año de inicio.

**Limitación:** crecimiento geométrico constante; no modela migración interdistrital, cambios de política, recirculación ni densidad variable en el tiempo.

### 3.3 Asignación a celdas

Los volúmenes anuales se asignan en orden de `sequenceOrder`. Cada celda recibe volumen hasta su capacidad de residuos; la elevación se obtiene invirtiendo la curva volumen-altura. Esto alimenta la animación 3D, la cota máxima y el estado de celdas activas/cerradas.

---

## 4. Lixiviados

### 4.1 Balance hídrico anual

```text
P = R + ET + I
I = I_activo + I_cerrado
L = I + H_residuos
H_residuos = m_dispuesta · (w_ingreso − CC)
```

- `P`: precipitación sobre área activa + cerrada.
- `R`: escorrentía = `P · C`.
- `ET`: evapotranspiración solo sobre área cerrada, limitada a `P − R`.
- `I_activo`: `P_activo − R_activo`.
- `I_cerrado`: `(P_cerrado − R_cerrado − ET) · f_infiltración`.
- `H_residuos`: liberación de humedad de la masa dispuesta en el año.
- `m_dispuesta`: toneladas dispuestas.
- `w_ingreso`: humedad de ingreso.
- `CC`: capacidad de campo.

**Verificación:** `(R + ET + I) / P = 100 %` en la suma anual, tolerancia 0.5 %; y `tratado + no tratado = generado`, tolerancia `1×10⁻⁶ m³`.

**Limitación:** no resuelve flujo no saturado, flujo preferencial, recirculación ni variación mensual completa. No sustituye HELP, HYDRUS ni un modelo hidrogeológico calibrado. La humedad inicial y la densidad de cobertura existen en el esquema, pero no intervienen en el cálculo actual.

### 4.2 Caudal y almacenamiento

- Caudal medio: `L / (365 · 86 400) · 1000` en L/s.
- Pico mensual: infiltración del mes máximo más liberación de humedad / 12, sobre 30 días.
- Evento de tormenta: `P_24h · área_expuesta · (1 − C)`.
- Almacenamiento recomendado: `caudal medio diario · días de retención + evento máximo`.

### 4.3 Manning a sección llena

```text
A = π·D²/4
R = D/4
Q = (1/n) · A · R^(2/3) · S^(1/2)
```

Caso de referencia: `D = 0.20 m`, `S = 0.01`, `n = 0.013` → **32.8 L/s**. La prueba unitaria exige ±0.1 L/s.

**Limitación:** flujo permanente y uniforme, sección llena. No verifica flujo parcial, aireación, obstrucción ni línea de energía.

### 4.4 Método suizo

```text
Q = P · A · K / 31 536 000
```

`P` en mm/año, `A` en m², `K` adimensional. Se muestra como indicador comparativo. `K` es configurable; la guía cita rangos según compactación, no un valor único obligatorio.

### 4.5 Fórmula racional

```text
Q_p = C · i · A / 3 600 000
i = P_24h / 24
```

`Q_p` en m³/s, `i` en mm/h, `A` en m². Se muestra como caudal de escorrentía de tormenta, no como caudal de lixiviados.

### 4.6 Fuga de referencia por el fondo

```text
Q_fuga = k_barrera · A_fondo · 365 · 86 400
```

Estimación Darcy de orden de magnitud. No modela transporte de contaminantes, gradiente real ni defectos localizados.

---

## 5. Biogás — IPCC 2006 FOD

### 5.1 Potencial y generación

```text
DDOCm = W · DOC · DOCf · MCF · F
CH₄(t) = Σ_x W_x · DOC · DOCf · MCF · F · (1 − e^(−k)) · e^(−k·(t−x)) · 16/12
```

- `W`: masa dispuesta en el año `x`.
- `DOC`: carbono orgánico degradable.
- `DOCf`: fracción de DOC que se descompone.
- `MCF`: factor de corrección de metano.
- `F`: fracción de CH₄ en el gas generado.
- `k`: constante de decaimiento, 1/año.
- `16/12`: conversión de carbono a metano.

El volumen se obtiene con gas ideal:

```text
ρ_CH4 = P · M / (R · T)
V_CH4 = m_CH4 · 1000 / ρ_CH4
V_biogás = V_CH4 / fracción_CH4
```

**Verificación de conservación:** 1 000 t dispuestas en un año; la integral del decaimiento en 221 años converge al potencial último `W · DOC · DOCf · MCF · F · 16/12` con error < 0.5 %. La última cola del horizonte es < 0.1 % del potencial.

### 5.2 Captura, oxidación, emisión y energía

```text
Capturado = CH₄ · eficiencia_captura
Oxidado   = (CH₄ − Capturado) · fracción_oxidación
Emitido   = CH₄ − Capturado − Oxidado
Quemado   = Capturado · eficiencia_antorcha
Energía   = Capturado · LHV · eficiencia_eléctrica / 3600
```

La eficiencia de captura cambia entre operación y clausura. La oxidación se aplica solo al metano no capturado; la antorcha, solo al capturado.

**Limitación:** no calibra `DOC` ni `k` con datos locales; no distingue fases aerobia/anaerobia; no modela migración lateral, variación estacional ni diseño hidráulico de pozos. El “caudal pico” es el promedio del año de mayor generación, no un caudal instantáneo de diseño.

---

## 6. Geotecnia — talud infinito

```text
σ = γ · z · cos²β
τ = γ · z · sinβ · cosβ
u = γ_w · m · z · cos²β
FS = [c' + (σ − u) · tanφ'] / τ
```

- `β`: ángulo del talud.
- `γ`: peso unitario.
- `z`: profundidad de la superficie de falla.
- `m`: relación de altura del nivel freático.
- `c'`, `φ'`: cohesión y fricción efectivas.

**Caso de referencia:** `β = 18.43°`, `φ' = 30°`, `c' = 0`, sin presión de poros → `FS = tan 30° / tan 18.43° = 1.732`.

Se evalúan cuatro casos: base, interfaz geosintética, seco y saturado. Las bandas `inestable < 1.0`, `revisar < 1.3`, `marginal < 1.5`, `aceptable ≥ 1.5` son **criterios internos de revisión**, no límites normativos.

**Limitación:** solo mecanismos traslacionales superficiales paralelos al talud. No analiza fallas circulares, cuñas profundas, capacidad de soporte, licuación ni estabilidad global. El análisis pseudo-estático no está implementado; la PGA solo se registra.

---

## 7. Clausura

```text
A_cierre = Σ A_coronación
e_total  = Σ espesores de capas habilitadas
V_cobertura = A_cierre · e_total
V_asentamiento = V_cobertura · factor_asentamiento
V_total = V_cobertura_residuos + V_cobertura_final + V_asentamiento
```

El año de cierre es el declarado por el usuario o, en su defecto, el techo del año de agotamiento. Las tareas se programan en meses relativos al cierre; las fases se clasifican como antes del cierre, cierre o posclausura.

**Limitación:** capas horizontales sobre el área de coronación; no modela pandeo, erosión, estabilidad de la cobertura ni asentamiento diferencial espacial. El espesor mínimo de 0.50 m citado por MINAM es una referencia técnica, no un requisito legal automático.

---

## 8. Costos y operación

### 8.1 Costos

```text
OPEX_t       = toneladas_dispuestas_t · costo_OPEX
Tratamiento_t = m³_tratados_t · costo_tratamiento
Ingreso_t    = MWh_t · ingreso_energía
Neto_t       = OPEX_t + Tratamiento_t − Ingreso_t
VPN          = CAPEX + Σ Neto_t / (1 + r)^t
Costo/t      = VPN / toneladas_totales
```

El CAPEX se registra en el año 0. No se incluyen posclausura, remediación, cierre financiero ni impuestos. Los costos son datos del usuario, no estimaciones de mercado.

### 8.2 Operación

- El año de inicio desplaza toda la serie.
- El frente de trabajo se suma al área expuesta del balance hídrico.
- La cobertura diaria se sincroniza con la capa `daily-cover` y su volumen.
- Las celdas activas declaradas se contrastan con la simulación; no reordenan la asignación.
- Las pasadas de compactación y el modo de secuencia son declarativos.

---

## 9. Sensibilidad e incertidumbre

### 9.1 OAT

Cada variable se perturba de forma independiente; el resto permanece en la base. Los factores aplicados coinciden con las etiquetas de la interfaz:

| Variable | Caso bajo | Caso alto |
|---|---:|---:|
| Población servida | −20 % | +20 % |
| Generación per cápita | −20 % | +20 % |
| Densidad de diseño | −15 % | +15 % |
| Tasa de recuperación | −20 % rel. | +20 % rel. |
| Precipitación anual | −25 % | +25 % |
| Factor de utilización | −0.10 absoluto | +0.10 absoluto |
| DOC | −25 % | +25 % |
| Constante k | −50 % | +50 % |
| Humedad de ingreso | −15 % rel. | +15 % rel. |

Indicadores: vida útil, lixiviado total, CH₄ total y almacenamiento. El orden del tornado usa el impacto absoluto máximo.

**Limitación:** no captura interacciones ni correlaciones. Los rangos son exploración, no intervalos de confianza.

### 9.2 Monte Carlo

Se muestrean cinco variables con distribución normal truncada e independiente:

| Variable | Coeficiente de variación | Límites |
|---|---:|---|
| Población | 8 % | mínimo 1 |
| Per cápita | 10 % | mínimo 0.05 |
| Precipitación | 15 % | mínimo 0 |
| DOC | 12 % | 0.01–0.50 |
| k | 20 % | 0.005–0.50 |

Generador `mulberry32` con semilla fija. Percentiles P10, P50, P90 y media. La misma semilla y el mismo número de iteraciones reproducen exactamente los resultados.

**Limitación:** las distribuciones son supuestos, no inferencia de datos de campo. No modela correlaciones ni tendencias climáticas.

---

## 10. Valores de referencia y clasificación

La aplicación cita 26 valores de las guías. Se clasifican como **recomendación técnica**, **dato de diseño** o **rango observado**; ninguno se aplica como límite legal automático. Ejemplos:

| Parámetro | Valor citado | Fuente | Clasificación |
|---|---|---|---|
| Talud de residuos mecanizado | 1H:3V (≈18.4°) | Honduras 2014, p. 43 | Recomendación técnica |
| Altura de celda mecanizada | 2–5 m | Honduras 2014, p. 42 | Recomendación técnica |
| Cobertura diaria | 15–20 cm | Honduras 2014 p. 42; MINAM p. 64 | Recomendación técnica |
| Densidad inicial mecanizada | 0.60–0.85 t/m³ | Honduras 2014, pp. 45–46 | Rango observado |
| Densidad final estabilizada | 0.80–1.00 t/m³ | Honduras 2014, pp. 45–46 | Rango observado |
| Cobertura | 20–25 % del volumen | Honduras p. 33; MINAM p. 63 | Dato de diseño |
| Separación al freático | ≥ 3 m | Honduras 2014, p. 40 | Recomendación técnica |
| Barrera mineral | 60 cm, k ≤ 1×10⁻⁷ cm/s | Honduras 2014, pp. 50–52 | Recomendación técnica |
| Geomembrana | ≥ 0.75 mm (HDPE ≥ 1.52 mm) | Honduras 2014, p. 51 | Recomendación técnica |
| Capa drenante | ≈60 cm de grava | MINAM 2011, p. 82 | Recomendación técnica |
| Espaciamiento de tuberías | 10–20 m | MINAM 2011, p. 82 | Recomendación técnica |
| Pendiente de fondo | 1–2 % | MINAM 2011, p. 82 | Recomendación técnica |
| Almacenamiento de lixiviados | 1–3 días de caudal pico | MINAM 2011, p. 83 | Recomendación técnica |
| CH₄ en biogás | 40–60 % | MINAM p. 87; Honduras p. 92 | Rango observado |
| Cobertura final | 0.50 m (referencia) | MINAM 2011, p. 64 | Recomendación técnica |
| Vida útil | ≥5 años; recomendable ≥10 | MINAM 2011, p. 62 | Recomendación técnica |

La tabla completa, con 26 entradas y uso en la aplicación, está en `lib/methods.ts` y en el módulo **Métodos**.

### 10.1 Verificación de localización (R.M. 165-2021 / art. 110)

La matriz compara los valores declarados por el usuario con las referencias de la R.M. N.° 165-2021-MINAM (anexo, Tabla 6) y del artículo 110 del D.S. 014-2017-MINAM, citado por la Guía MINAM 2019 (pp. 12–13):

| Criterio | Referencia | Tratamiento |
|---|---|---|
| Centros poblados | ≥ 500 m | Restricción dura si no cumple |
| Agua superficial | ≥ 500 m | Restricción dura si no cumple |
| Infraestructura existente | ≥ 500 m | Restricción dura si no cumple |
| Áreas agrícolas | ≥ 500 m | Restricción dura si no cumple |
| Granjas porcinas/avícolas | 5–10 km | Referencia; < 5 km se marca |
| Fallas geológicas | ≥ 1 km | Restricción dura si no cumple |
| Aeródromos | < 4 km no cumple; 4–13 km observado; ≥ 13 km cumple | Observación en la franja intermedia |
| Pendiente | < 25 % | Criterio técnico; 25–30 % observado |
| Nueve exclusiones territoriales | Sin superposición | Restricción dura si se declara superposición |

El indicador de cumplimiento es `[cumple + 0,5·observado] / n × 100`. **No es un puntaje de aptitud**: cada criterio pesa igual y una exclusión declarada detiene la verificación. Los datos faltantes se contabilizan como `sin dato`, nunca como cumplimiento.

La R.M. 165-2021 se consultó como **documento propuesta**; no consta en el archivo su aprobación como norma. Por eso se clasifica como `pendiente-verificacion` y se usa como referencia metodológica. El artículo 110 mantiene excepciones sujetas al IGA y a la autoridad competente.

### 10.2 Barrera de fondo y captura de biogás (Guía MINAM 2019)

- **Barrera mineral:** `e ≥ 0,40 m` y `k ≤ 1×10⁻⁶ cm/s`, o barrera geológica natural justificada.
- **Barrera sintética de reemplazo:** geomembrana HDPE `≥ 1,2 mm` protegida con geotextil no tejido.
- **Biogás:** con caudal pico `> 200 t/día` se exige captura y quema centralizada progresiva (Cuadro N.° 43); por debajo, captura y quema convencional con drenes verticales.
- **Clasificación:** un promedio `> 50 t/día` es incompatible con una celda transitoria.

Estas comprobaciones son binarias y se reportan con documento y página. No verifican instalación, traslape, ensayos de estanqueidad ni calidad de obra.

---

## 11. Evidencia de verificación

| Prueba | Resultado |
|---|---|
| Prismoidal exacto MINAM | 1 075.83 m³ |
| Fórmula de tronco MINAM | 1 068.52 m³ |
| Referencia Honduras | 698 063 m³ |
| Cierre volumétrico de capacidad | ΔV < 1×10⁻⁶ |
| Manning D=0.20, S=0.01, n=0.013 | ≈32.8 L/s |
| Talud infinito β=18.43°, φ'=30° | FS = 1.732 |
| IPCC FOD, 1 000 t | integral ≈ potencial último |
| Balance hídrico | cierre 100 % |
| OAT | base reproducida y orden por impacto |
| Monte Carlo | misma semilla → mismos percentiles |

Las autopruebas de la aplicación ejecutan **8/8** verificaciones; las pruebas Vitest ejecutan **20** casos y la suite Playwright **6** flujos E2E. El detalle está en [`pruebas-verificacion.md`](pruebas-verificacion.md).

---

## 12. Lo que el motor no hace

- No sustituye un levantamiento topográfico ni un modelo digital del terreno.
- No resuelve hidráulica espacial, flujo no saturado ni transporte de contaminantes.
- No diseña pozos de biogás, colectores, antorchas ni plantas de tratamiento.
- No analiza estabilidad global, fallas circulares, licuación ni sismo pseudo-estático.
- No certifica aptitud del sitio, cumplimiento legal ni viabilidad financiera.
- No calibra parámetros con datos de campo.
- No firma digitalmente el informe ni lo envía a un servidor.

Las consecuencias de estas limitaciones se desarrollan en [`limitaciones-conocidas.md`](limitaciones-conocidas.md).
