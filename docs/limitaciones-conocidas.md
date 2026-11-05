# Limitaciones conocidas

**Green Owl Landfill 3D 1.0.0 · GO-ENGINE 1.0.0**

Las limitaciones están agrupadas por dominio. Cada una indica qué **no** debe concluirse y cómo se mitiga o declara en la aplicación.

---

## 1. Alcance general

| Limitación | Consecuencia | Mitigación en la app |
|---|---|---|
| Herramienta de ingeniería preliminar | No es un diseño ejecutivo ni un estudio firmado. | Advertencias en inicio, métodos, resultados e informe. |
| Datos demostrativos sintéticos | Las cifras no representan un sitio real. | Etiqueta “Demostración” y notas de alcance. |
| Sin calibración de campo | Los parámetros son declarados, no inferidos. | Calidad de dato y sección de supuestos. |
| Sin validación legal automática | No declara cumplimiento normativo. | Normativa con estado de verificación explícito. |
| Sin backend | No hay colaboración, historial ni recuperación remota. | Respaldo JSON local. |
| Informe sin firma digital | No sustituye un documento firmado por profesional habilitado. | Bloque de firma y advertencia de emisión local. |

---

## 2. Geometría y modelo 3D

| Limitación | Detalle |
|---|---|
| **Implantación esquemática** | Las celdas conservan sus dimensiones reales, pero se colocan en una grilla sintética sin solape. No hay coordenadas geográficas ni orientación real. |
| **Infraestructura auxiliar esquemática** | Vías, garita, báscula, edificios, pozas, antorcha, cerco, vegetación y pozos de monitoreo se ubican de forma ilustrativa alrededor de las celdas; no responden a un levantamiento ni a un diseño de detalle. |
| **Redes sin cálculo hidráulico** | La red de lixiviados y biogás y el drenaje pluvial representan trazado y jerarquía; no dimensionan tuberías, pendientes ni pérdidas. |
| **Sin detección de interferencias** | No se comprueba el choque entre vías, edificios, redes y celdas ni la distancia real entre componentes. |
| **Terreno no topográfico** | La superficie del visor es una representación; no es un TIN ni un levantamiento. |
| **Excavaciones simplificadas** | Se representan como huecos de la celda; no modelan taludes de excavación, bermas de terreno ni geología. |
| **Intersecciones entre celdas** | No se detectan ni descuentan volúmenes compartidos. |
| **Perfil volumen-elevación** | Suma el volumen de cada celda a una cota; no corrige solapes ni geometría del terreno. |
| **Bermas** | Se modelan como escalones horizontales de ancho constante. No siguen curvas de nivel reales. |
| **Capas exageradas** | El factor visual puede alterar la apariencia del liner. Los espesores de cálculo y del informe permanecen reales y así se indica. |
| **Animación de flujo y gas** | Es conceptual; no resuelve hidráulica ni transporte. |
| **Selección 3D** | Depende de raycast sobre la geometría simplificada; no identifica capas individuales. |
| **Captura PNG** | Requiere `preserveDrawingBuffer` y un contexto WebGL disponible. Si falla, el informe se genera sin imagen. |
| **Responsive** | A ≤1080 px se ocultan los paneles laterales del modelo para priorizar el canvas; el control temporal permanece y los ajustes de escena están en Configuración. |

---

## 3. Capacidad y residuos

| Limitación | Detalle |
|---|---|
| **Cubicación no topográfica** | El volumen proviene de la geometría idealizada, no de un MDT. |
| **Sin asentamientos** | No se descuenta capacidad por consolidación diferencial. |
| **Sin pérdida por inestabilidad** | No se reduce volumen por deslizamientos o deformaciones. |
| **Densidad constante** | La densidad se mantiene en la base seleccionada; no varía por año, profundidad ni compactación. |
| **Cobertura como fracción volumétrica** | No se calcula a partir de la geometría real de cada capa operativa. |
| **Crecimiento geométrico** | Población y generación crecen a tasa constante; no hay cambios de política, migración ni escenarios demográficos. |
| **Horizonte acotado** | El balance se limita a 10–80 años según el código. Si la capacidad no se agota, la vida útil es el horizonte, no un valor infinito. |
| **Asignación secuencial** | Las celdas se llenan en orden; no hay optimización logística ni apertura simultánea arbitraria. |
| **Celdas sin residuos** | Una celda sin volumen asignado no aparece llena en el 3D, aunque su geometría exista. |

---

## 4. Lixiviados

| Limitación | Detalle |
|---|---|
| **Sin flujo no saturado** | No resuelve movimiento capilar, preferencial ni recirculación. |
| **Sin transporte de contaminantes** | No estima concentraciones, plumas niattenuación. |
| **Balance anual** | No hay serie mensual completa; el pico mensual es una aproximación con la lluvia máxima. |
| **Humedad inicial no usada** | `initialMoisturePct` existe en el esquema, pero el cálculo actual usa solo humedad de ingreso y capacidad de campo. |
| **Densidad de cobertura no usada** | `coverDensityKgM3` no interviene en el volumen de lixiviados. |
| **Área cerrada derivada** | `closedAreaFraction` no se expone; el área cerrada se infiere del avance de llenado. |
| **Manning a sección llena** | No verifica flujo parcial, aireación, obstrucción ni línea de energía. |
| **Fuga Darcy** | Estimación de orden de magnitud; no modela defectos localizados ni gradiente real. |
| **Método suizo y racional** | Indicadores comparativos; no reemplazan un diseño hidrológico/hidráulico. |
| **Tratamiento como capacidad fija** | No modela eficiencia de planta, lagunas, lodos ni cumplimiento de límites de vertido. |

Para diseño definitivo se requiere HELP/HYDRUS o modelo hidrogeológico calibrado, caracterización de lixiviado y diseño hidráulico de detalle.

---

## 5. Biogás

| Limitación | Detalle |
|---|---|
| **Parámetros no calibrados** | `DOC`, `DOCf`, `MCF`, `F` y `k` son declarados; no se derivan de pruebas locales. |
| **Sin fases biológicas** | No distingue aerobia, acetogénica y metanogénica; aplica FOD desde el año de disposición. |
| **Sin migración lateral** | No modela gas que escapa por lados, superficie o suelos. |
| **Sin variación estacional** | No hay cambios de temperatura, presión o humedad. |
| **Captura como eficiencia** | No diseña pozos, colectores, sopladores ni red de vacío. |
| **Caudal pico aproximado** | Es el promedio del año de mayor generación, no un caudal instantáneo de diseño. |
| **Energía potencial** | Usa LHV y eficiencia declarados; no es un estudio de factibilidad eléctrica. |
| **Oxidación y antorcha** | Factores supuestos; no resultados de monitoreo. |

---

## 6. Geotecnia

| Limitación | Detalle |
|---|---|
| **Solo talud infinito** | Mecanismos traslacionales superficiales paralelos al talud. |
| **Sin fallas circulares** | No analiza superficies curvas, cuñas profundas ni estabilidad global. |
| **Sin capacidad de soporte** | No evalúa fundaciones, asentamientos ni licuación. |
| **Sin análisis pseudo-estático** | La PGA se registra, pero no se aplica al FS. |
| **Sin flujo real** | La presión de poros usa una relación simplificada de freático. |
| **Umbrales internos** | Las bandas de FS son criterios de revisión, no límites normativos. |
| **Interfaz geosintética** | Requiere ensayos específicos; los valores demo son supuestos. |

La verificación definitiva requiere campaña geotécnica, ensayos de interfaz y software especializado.

---

## 7. Clausura

| Limitación | Detalle |
|---|---|
| **Cobertura horizontal** | Se aplica sobre el área de coronación; no sigue la topografía final. |
| **Sin erosión ni pandeo** | No modela estabilidad de la cobertura, erosión hídrica ni viento. |
| **Asentamiento como reserva** | Porcentaje volumétrico, no distribución espacial ni consolidación. |
| **Cronograma relativo** | Las tareas se programan en meses respecto del cierre; no es un cronograma contractual con recursos. |
| **Monitoreo declarativo** | Los estados y límites son datos del usuario; no hay validación de laboratorio. |
| **Cierre declarado** | El año anticipado es una decisión del usuario; no certifica el cierre técnico. |

---

## 8. Costos y análisis

| Limitación | Detalle |
|---|---|
| **Costos declarados** | CAPEX, OPEX, tratamiento e ingresos son entradas; no son estimaciones de mercado. |
| **Sin posclausura ni remediación** | No se incluyen en el VPN. |
| **Sin impuestos ni financiamiento** | No modela deuda, inflación, depreciación ni obligaciones fiscales. |
| **VPN simple** | Descuenta flujos anuales desde el año 1; no modela calendarios intraanuales. |
| **Sensibilidad OAT** | No captura interacciones ni correlaciones. Los rangos son exploración. |
| **Monte Carlo supuesto** | Distribuciones normales truncadas e independientes, no inferencia de datos de campo. |
| **Sin valor social/ambiental** | No monetiza externalidades, salud, emisiones ni aceptación social. |

---

## 9. Informes y exportaciones

| Limitación | Detalle |
|---|---|
| **PDF local** | Se genera en el navegador; no hay servidor, sello de tiempo certificado ni firma digital. |
| **Paginación variable** | El número de páginas depende de secciones activas, textos e imágenes. |
| **Captura opcional** | Si WebGL no expone el canvas, el PDF se genera sin imagen y se avisa. |
| **CSV con separador `;` y BOM** | Optimizado para Excel en español; otros programas pueden requerir ajuste. |
| **JSON sin migración automática** | Esquema versión 1; cambios futuros de estructura requerirán migración. |
| **Importación mínima** | Valida estructura básica; no ejecuta un esquema Zod completo sobre cada proyecto importado. |
| **Sin historial de versiones** | Solo se conserva el estado actual y el respaldo que el usuario descargue. |

---

## 10. Persistencia y seguridad

| Limitación | Detalle |
|---|---|
| **Solo `localStorage`** | La cuota depende del navegador; puede agotarse con muchos proyectos o documentos. |
| **Sin cifrado** | Los datos quedan legibles para el perfil del navegador. No usar para información confidencial sin controles adicionales. |
| **Modo privado** | El almacenamiento puede borrarse al cerrar la pestaña. |
| **Sin cuentas** | No hay autenticación, permisos por rol ni auditoría de cambios. |
| **Sin sincronización** | Cambiar de equipo requiere exportar e importar JSON. |
| **Sin telemetría** | No se envían datos a Green Owl Labs ni a terceros. |
| **Sin papelera** | Eliminar un proyecto o restablecer el espacio no se puede deshacer. |

---

## 11. Normativa y responsabilidad

- La biblioteca contiene **13 documentos**: 8 vigentes contrastados con fuente oficial, 4 referencias históricas y 1 con verificación pendiente al 2026-11-04. La vigencia se limita al dispositivo y sus modificatorias identificadas; el articulado debe leerse en el texto consolidado.
- La **R.M. 165-2021-MINAM** se consultó como *documento propuesta*: no consta en el archivo su aprobación como norma. Se usa como referencia metodológica y se marca `pendiente-verificacion`.
- La **Guía MINAM 2019** se usa para los criterios vigentes de barrera de fondo, geomembrana y captura de biogás; cuando reproduce el D.S. 014-2017-MINAM se cita como requisito legal.
- Los valores de las guías (3 m al freático, 60 cm de arcilla, 0.50 m de cobertura, 1H:3V, 15–20 cm de cobertura diaria, etc.) son **recomendaciones técnicas o rangos observados**, no requisitos legales automáticos.
- La **verificación de localización** es declarativa: compara los valores y exclusiones que el usuario ingresa, no mide distancias ni interpreta cartografía. El porcentaje de cumplimiento es una ayuda de despacho, **no un puntaje de aptitud**, y una exclusión marcada o una distancia bajo el mínimo detiene la verificación.
- La aplicación no determina la aptitud del sitio ni la viabilidad ambiental.
- Los resultados no constituyen asesoría legal, financiera ni de ingeniería de detalle.
- El usuario es responsable de verificar la normativa aplicable, sustituir datos sintéticos y obtener revisión profesional.

---

## 12. Compatibilidad y rendimiento

| Elemento | Comportamiento |
|---|---|
| **WebGL** | Requerido para el visor 3D y la captura PNG. Sin WebGL se muestra una vista de planta de respaldo. |
| **Navegadores** | Probado en navegador de escritorio basado en Chromium. No se garantiza paridad en navegadores antiguos. |
| **Móvil** | Interfaz responsive; el visor 3D puede reducir calidad o funciones por límites del dispositivo. |
| **Modelos grandes** | Muchas celdas, capas o años pueden aumentar el tiempo de reconstrucción del 3D y el tamaño del PDF. |
| **Impresión** | El PDF es el artefacto previsto; la impresión directa de la interfaz no está optimizada. |

---

## 13. Resumen de riesgos de mal uso

| Mal uso | Riesgo | Respuesta correcta |
|---|---|---|
| Tomar los demos como sitio real | Diseño inválido | Reemplazar datos y revisar calidad. |
| Usar el FS de talud infinito como estabilidad global | Subestimar mecanismos profundos | Estudio geotécnico especializado. |
| Usar el lixiviado anual como diseño de planta | Caudal pico insuficiente | Serie mensual, hidrología y diseño de detalle. |
| Usar el CH₄ como diseño de captura | Pozos y red inadequados | Pruebas de campo y diseño de vacuum. |
| Citar una referencia histórica como vigente | Incumplimiento o error legal | Verificar la versión consolidada en la fuente oficial. |
| Presentar el PDF como documento firmado | Falta de validez formal | Revisión y firma profesional. |
| No respaldar | Pérdida de trabajo | Exportar JSON con frecuencia. |

---

## 14. Mejoras futuras recomendadas

No forman parte de la versión 1.0.0:

- Importación de topografía (DXF/CSV/GeoTIFF) y generación de TIN.
- Modelo de asentamiento y consolidación.
- Acoplamiento con HELP/HYDRUS o motor de flujo no saturado.
- Diseño geométrico de pozos y red de biogás.
- Análisis de estabilidad global (equilibrio límite 2D/3D).
- Series mensuales de clima y balance hídrico continuo.
- Historial de versiones, auditoría y firma digital.
- Backend opcional con control de acceso y sincronización.
- Pruebas de regresión visual y matriz multi-navegador para la suite E2E existente.

Mientras estas mejoras no existan, la aplicación debe usarse como **laboratorio preliminar y herramienta de trazabilidad**, no como sustituto de un proyecto de ingeniería completo.
