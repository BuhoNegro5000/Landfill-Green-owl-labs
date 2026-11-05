import type { RawDocument } from "@/lib/types";

/**
 * Fecha de contraste con fuentes oficiales. Actualizar cuando se revise la biblioteca.
 * La verificación se limita a vigencia y modificatorias publicadas; no sustituye
 * la lectura del texto consolidado ni la opinión de un profesional habilitado.
 */
const ACCESSED = "2026-11-04";

/**
 * Biblioteca documental. Cada entrada declara su estado con evidencia:
 * - "vigente-verificado": dispositivo publicado y vigente, con modificatorias identificadas.
 * - "referencia-historica": derogado o sustituido; se conserva por trazabilidad.
 * - "pendiente-verificacion": no se ha contrastado la versión oficial.
 * Los manuales técnicos se clasifican como referencia y no como requisito legal.
 */
export const DEFAULT_DOCUMENTS: RawDocument[] = [
  {
    id: "doc-pe-dl1278",
    title: "Ley de Gestión Integral de Residuos Sólidos",
    kind: "norma",
    number: "Decreto Legislativo N.° 1278",
    date: "2016-12-23",
    issuer: "Poder Ejecutivo — Perú",
    article: "Marco general; modificado por la Ley N.° 32212",
    sourceUrl: "https://www.gob.pe/institucion/minam/normas-legales/3610-1278",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability: "Marco general para la gestión y disposición final de residuos sólidos municipales en Perú.",
    classification: "requisito-legal",
    notes:
      "Vigente. La Ley N.° 32212 (publicada el 21-12-2024) modificó 28 artículos e incorporó los artículos 66-A, 66-B, 66-C, 70-A y 85-A. La adecuación del Reglamento seguía pendiente a noviembre de 2026. Leer el texto consolidado antes de citar artículos.",
  },
  {
    id: "doc-pe-reglamento",
    title: "Reglamento del Decreto Legislativo N.° 1278",
    kind: "norma",
    number: "Decreto Supremo N.° 014-2017-MINAM",
    date: "2017-12-20",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Reglamento; modificado por D.S. 001-2022-MINAM",
    sourceUrl: "https://www.gob.pe/institucion/minam/normas-legales/3695-014-2017-minam",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability: "Disposiciones reglamentarias de gestión integral de residuos, incluyendo infraestructura de disposición final.",
    classification: "requisito-legal",
    notes:
      "Vigente. Modificado por el D.S. 001-2022-MINAM (publicado el 09-01-2022). El proyecto de modificación publicado mediante R.M. 00188-2025-MINAM no consta aprobado a noviembre de 2026. Verificar el texto consolidado y los artículos aplicables antes de usarlo como obligación.",
  },
  {
    id: "doc-pe-ley32212",
    title: "Ley que modifica el D.L. 1278 y la Ley N.° 26793 para fortalecer la gestión de residuos sólidos",
    kind: "norma",
    number: "Ley N.° 32212",
    date: "2024-12-21",
    issuer: "Congreso de la República — Perú",
    article: "Artículos 1–3 y disposiciones complementarias",
    sourceUrl: "https://busquedas.elperuano.pe/dispositivo/NL/2356497-1",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability:
      "Economía circular, material de descarte, competencias municipales y regionales, valorización, SIGERSOL y financiamiento de infraestructura.",
    classification: "requisito-legal",
    notes:
      "Publicada el 21-12-2024. Ordenó adecuar el Reglamento del D.L. 1278 en 120 días calendario; a noviembre de 2026 la adecuación reglamentaria seguía pendiente. Modifica también la Ley N.° 26793 (FONAM).",
  },
  {
    id: "doc-pe-ds001-2022",
    title: "Decreto Supremo que modifica el Reglamento del D.L. 1278 y el Reglamento de la Ley N.° 29419",
    kind: "norma",
    number: "Decreto Supremo N.° 001-2022-MINAM",
    date: "2022-01-09",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Artículos 2 y 3",
    sourceUrl: "https://busquedas.elperuano.pe/dispositivo/NL/2028907-1",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability:
      "Modifica el D.S. 014-2017-MINAM en planes de gestión, SIGERSOL, infraestructura de residuos, recicladores y áreas degradadas.",
    classification: "requisito-legal",
    notes:
      "Vigente. Es la modificatoria principal del Reglamento. Debe leerse junto con el D.S. 014-2017-MINAM; la Ley N.° 32212 amplió por un año algunos plazos de adecuación de áreas degradadas.",
  },
  {
    id: "doc-pe-ds001-2024",
    title: "Decreto Supremo que establece la adecuación ambiental de las actividades de residuos sólidos",
    kind: "norma",
    number: "Decreto Supremo N.° 001-2024-MINAM",
    date: "2024-01-05",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Artículos 1–5 y anexos",
    sourceUrl: "https://www.gob.pe/institucion/minam/normas-legales/5003014-0001-2024-minam",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability:
      "Instrumentos de gestión ambiental correctivos (diagnóstico preliminar y PAMA) para infraestructuras de residuos sólidos existentes.",
    classification: "requisito-legal",
    notes:
      "Vigente, modificado por el D.S. 001-2025-MINAM. Regula la adecuación ambiental; no fija parámetros de diseño, espesores ni límites de estabilidad. Su aplicación depende de la categoría y antigüedad de la infraestructura.",
  },
  {
    id: "doc-pe-ds001-2025",
    title: "Decreto Supremo que modifica el D.S. 001-2024-MINAM y dicta disposiciones para la adecuación de actividades de residuos sólidos",
    kind: "norma",
    number: "Decreto Supremo N.° 001-2025-MINAM",
    date: "2025-01-13",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Artículos 1–3",
    sourceUrl: "https://www.gob.pe/institucion/minam/normas-legales/6374082-001-2025-minam",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability:
      "Ajusta plazos y disposiciones para la adecuación ambiental de infraestructuras y actividades de residuos sólidos.",
    classification: "requisito-legal",
    notes:
      "Vigente. Modifica el artículo 1 y la Segunda Disposición Complementaria Final del D.S. 001-2024-MINAM. No sustituye al Reglamento del D.L. 1278.",
  },
  {
    id: "doc-pe-ley27314",
    title: "Ley General de Residuos Sólidos (referencia histórica)",
    kind: "norma",
    number: "Ley N.° 27314",
    date: "2000-07-20",
    issuer: "Congreso de la República — Perú",
    article: "Texto derogado",
    sourceUrl: "https://www.gob.pe/minam",
    accessedAt: ACCESSED,
    status: "referencia-historica",
    applicability: "Marco previo citado por la Guía MINAM 2011. Sustituido por el D.L. 1278.",
    classification: "requisito-legal",
    notes:
      "Derogada por el D.L. 1278 (2016). Se conserva únicamente por trazabilidad de la guía de 2011; no se usa para fijar obligaciones vigentes.",
  },
  {
    id: "doc-pe-reglamento2004",
    title: "Reglamento de la Ley N.° 27314 (referencia histórica)",
    kind: "norma",
    number: "Decreto Supremo N.° 057-2004-PCM",
    date: "2004-07-22",
    issuer: "Presidencia del Consejo de Ministros — Perú",
    article: "Texto derogado",
    sourceUrl: "https://www.gob.pe/minam",
    accessedAt: ACCESSED,
    status: "referencia-historica",
    applicability: "Reglamento citado en la Guía MINAM 2011, incluida la cobertura final de 0.50 m.",
    classification: "requisito-legal",
    notes:
      "Derogado y sustituido por el D.S. 014-2017-MINAM. La cita de cobertura final se conserva como referencia técnica de la guía; no se declara vigente ni aplicable automáticamente.",
  },
  {
    id: "doc-guide-minam-2019",
    title:
      "Guía para el diseño y construcción de infraestructuras para disposición final de residuos sólidos municipales",
    kind: "guia",
    number: "MINAM — 2019",
    date: "2019",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Capítulos 6, 12 y 13; Cuadros N.° 43 a 48",
    sourceUrl: "https://www.gob.pe/institucion/minam/publicaciones",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability:
      "Criterios de selección de área, impermeabilización, drenaje de lixiviados, captura de biogás, cobertura final e instalaciones complementarias.",
    classification: "recomendacion-tecnica",
    notes:
      "Guía técnica vigente; no es una norma y no crea obligaciones por sí misma. Se usa como referencia de diseño. Cuando reproduce el artículo 114 del D.S. 014-2017-MINAM (barrera de 0,40 m y geomembrana de 1,2 mm) la cita se marca como requisito legal. Fuente consultada: PDF de 116 páginas cargado por el usuario.",
  },
  {
    id: "doc-rm165-2021",
    title:
      "Guía para la identificación de zonas potenciales para infraestructura de disposición final de residuos sólidos municipales (documento propuesta)",
    kind: "guia",
    number: "R.M. N.° 165-2021-MINAM",
    date: "2021",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Tablas 1, 2 y 6; fase de evaluación",
    sourceUrl: "https://www.gob.pe/institucion/minam/publicaciones",
    accessedAt: ACCESSED,
    status: "pendiente-verificacion",
    applicability:
      "Criterios de restricción y exclusión para identificar zonas potenciales: 500 m a poblaciones y agua, 1 km a fallas, franja de aeródromos y pendiente < 25 %.",
    classification: "recomendacion-tecnica",
    notes:
      "El archivo consultado se identifica como “documento propuesta” de 2021 y no consta su aprobación como norma. Se usa como referencia metodológica; las distancias que reproduce del artículo 110 del D.S. 014-2017-MINAM se contrastan por separado. Verificar la versión oficial antes de citarla como disposición vigente.",
  },
  {
    id: "doc-guide-minam",
    title: "Guía de Diseño, Construcción, Operación, Mantenimiento y Cierre de Relleno Sanitario Mecanizado",
    kind: "guia",
    number: "MINAM — 2011",
    date: "2011",
    issuer: "Ministerio del Ambiente — Perú",
    article: "Capítulos 3 y 4",
    sourceUrl: "https://sinia.minam.gob.pe/sites/default/files/sinia/archivos/public/docs/2645.pdf",
    accessedAt: ACCESSED,
    status: "referencia-historica",
    applicability: "Métodos de dimensionamiento, balance hídrico, drenaje, biogás y operación. Fuente de fórmulas y valores de referencia.",
    classification: "recomendacion-tecnica",
    notes:
      "Documento técnico de 2011. Sus referencias normativas internas corresponden a la normativa entonces vigente (Ley N.° 27314 y D.S. 057-2004-PCM, hoy sustituidos) y deben actualizarse.",
  },
  {
    id: "doc-guide-honduras",
    title: "Manual de Construcción y Operación de Rellenos Sanitarios en Honduras",
    kind: "guia",
    number: "SERNA / GIZ / AGCI — 2014",
    date: "2014-06",
    issuer: "SERNA Honduras, GIZ y AGCI",
    article: "Capítulos 2, 3 y 4",
    sourceUrl:
      "https://www.cnpml-honduras.org/wp-content/uploads/2025/09/Manual-de-Construccion-y-Operacion-de-Rellenos-Sanitarios-en-Honduras.pdf",
    accessedAt: ACCESSED,
    status: "referencia-historica",
    applicability: "Criterios de selección de sitio, celda tipo, vida útil con densidad inicial/final, impermeabilización y operación.",
    classification: "recomendacion-tecnica",
    notes:
      "Documento técnico de Honduras. Sus umbrales (p. ej., 3 m al nivel freático, 60 cm de arcilla) se usan como referencias de revisión, no como requisitos legales peruanos.",
  },
  {
    id: "doc-ipcc-2006",
    title: "2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 5, Ch. 3",
    kind: "metodo",
    number: "IPCC 2006",
    date: "2006",
    issuer: "Intergovernmental Panel on Climate Change",
    article: "Ecuaciones 3.1–3.3",
    sourceUrl: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html",
    accessedAt: ACCESSED,
    status: "vigente-verificado",
    applicability: "Modelo de descomposición de primer orden para estimar metano de residuos dispuestos.",
    classification: "recomendacion-tecnica",
    notes: "Metodología internacional de referencia. Los parámetros DOC, k y DOCf deben justificarse localmente.",
  },
];

export const DOC_STATUS_LABEL: Record<RawDocument["status"], string> = {
  "vigente-verificado": "Vigente verificado",
  "pendiente-verificacion": "Verificación pendiente",
  "referencia-historica": "Referencia histórica",
};

/**
 * Reemplaza los documentos canónicos por su versión actual y conserva los
 * documentos aportados por el usuario. Se usa al migrar el almacenamiento local
 * cuando cambia la biblioteca base.
 */
export function reconcileDocuments(existing: RawDocument[] | undefined): RawDocument[] {
  if (!existing?.length) return DEFAULT_DOCUMENTS;
  const canonicalIds = new Set(DEFAULT_DOCUMENTS.map((doc) => doc.id));
  const custom = existing.filter((doc) => !canonicalIds.has(doc.id));
  return [...DEFAULT_DOCUMENTS, ...custom];
}

export const DOC_CLASS_LABEL: Record<RawDocument["classification"], string> = {
  "requisito-legal": "Requisito legal",
  "recomendacion-tecnica": "Recomendación técnica",
  "parametro-configurable": "Parámetro configurable",
  "supuesto-modelo": "Supuesto del modelo",
};

export function normativeStats(docs: RawDocument[]) {
  return {
    total: docs.length,
    verified: docs.filter((d) => d.status === "vigente-verificado").length,
    pending: docs.filter((d) => d.status === "pendiente-verificacion").length,
    historical: docs.filter((d) => d.status === "referencia-historica").length,
    legal: docs.filter((d) => d.classification === "requisito-legal").length,
  };
}
