"use client";

import { useMemo, useState } from "react";
import {
  Beaker,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FlaskConical,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Btn,
  Callout,
  DataTable,
  Field,
  Formula,
  Kpi,
  KpiGrid,
  PageHeader,
  Panel,
  SearchInput,
  SelectField,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  type TableColumn,
} from "@/components/ui";
import {
  METHODS,
  REFERENCE_VALUES,
  SOURCES,
  type MethodCategory,
  type MethodRecord,
  type ValidationStatus,
} from "@/lib/methods";
import { runSelfTests, selfTestSummary, type SelfTestResult } from "@/lib/selfTest";
import { downloadText, safeFileName, toCsv } from "@/lib/exporters";
import { useStore, useActiveProject } from "@/lib/store";
import { MiniStat } from "./shared";

const VALIDATION_LABEL: Record<ValidationStatus, string> = {
  "validado-con-ejemplo": "Validado con ejemplo",
  "verificado-por-balance": "Verificado por balance",
  conceptual: "Conceptual",
  referencia: "Referencia documental",
};

const VALIDATION_TONE: Record<ValidationStatus, "leaf" | "blue" | "amber" | "neutral"> = {
  "validado-con-ejemplo": "leaf",
  "verificado-por-balance": "leaf",
  conceptual: "blue",
  referencia: "neutral",
};

const CATEGORIES: MethodCategory[] = ["Geometría", "Residuos", "Lixiviados", "Hidráulica", "Biogás", "Geotecnia", "Análisis"];

export default function Metodos() {
  const project = useActiveProject();
  const pushToast = useStore((s) => s.pushToast);
  const [tab, setTab] = useState("catalogo");
  const [category, setCategory] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [onlyImplemented, setOnlyImplemented] = useState(false);
  const [tests, setTests] = useState<SelfTestResult[]>(() => runSelfTests());
  const [lastRun, setLastRun] = useState(() => new Date().toISOString());

  const summary = selfTestSummary(tests);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return METHODS.filter((method) => {
      if (category !== "todas" && method.category !== category) return false;
      if (status !== "todos" && method.validation !== status) return false;
      if (onlyImplemented && !method.implemented) return false;
      if (!needle) return true;
      return `${method.name} ${method.formula} ${method.sourceDoc} ${method.assumptions.join(" ")} ${method.limitations.join(" ")}`
        .toLowerCase()
        .includes(needle);
    });
  }, [category, status, search, onlyImplemented]);

  const grouped = useMemo(() => {
    const out: Record<string, MethodRecord[]> = {};
    for (const method of filtered) {
      out[method.category] = out[method.category] ?? [];
      out[method.category].push(method);
    }
    return out;
  }, [filtered]);

  const rerun = () => {
    setTests(runSelfTests());
    setLastRun(new Date().toISOString());
    pushToast({ kind: "ok", title: "Verificación ejecutada", detail: "Las pruebas se recalcularon en este navegador." });
  };

  const exportMethods = () => {
    const rows = filtered.map((method) => ({
      id: method.id,
      name: method.name,
      category: method.category,
      formula: method.formula,
      source: method.sourceDoc,
      pages: method.sourcePages,
      validation: VALIDATION_LABEL[method.validation],
      implemented: method.implemented ? "Sí" : "No",
      assumptions: method.assumptions.join(" | "),
      limitations: method.limitations.join(" | "),
      testCase: method.testCase,
      engineFunction: method.engineFunction,
      version: method.version,
    }));
    const csv = toCsv(
      [
        { key: "id", label: "ID" },
        { key: "name", label: "Método" },
        { key: "category", label: "Categoría" },
        { key: "formula", label: "Fórmula" },
        { key: "source", label: "Fuente" },
        { key: "pages", label: "Páginas" },
        { key: "validation", label: "Estado" },
        { key: "implemented", label: "Implementado" },
        { key: "assumptions", label: "Supuestos" },
        { key: "limitations", label: "Limitaciones" },
        { key: "testCase", label: "Caso de prueba" },
        { key: "engineFunction", label: "Función del motor" },
        { key: "version", label: "Versión" },
      ],
      rows,
    );
    downloadText(csv, `${safeFileName(project.name)}-metodos.csv`, "text/csv;charset=utf-8");
    pushToast({ kind: "ok", title: "Métodos exportados", detail: `${filtered.length} registros con supuestos y limitaciones.` });
  };

  const exportReferences = () => {
    const csv = toCsv(
      [
        { key: "parameter", label: "Parámetro" },
        { key: "value", label: "Valor" },
        { key: "source", label: "Fuente" },
        { key: "pages", label: "Páginas" },
        { key: "classification", label: "Clasificación" },
        { key: "usedIn", label: "Usado en" },
      ],
      REFERENCE_VALUES as unknown as Record<string, string>[],
    );
    downloadText(csv, `${safeFileName(project.name)}-valores-referencia.csv`, "text/csv;charset=utf-8");
    pushToast({ kind: "ok", title: "Referencias exportadas", detail: "Los valores son referencias técnicas, no límites legales automáticos." });
  };

  const testColumns: TableColumn<SelfTestResult>[] = [
    {
      key: "passed",
      label: "Estado",
      width: "104px",
      render: (row) => (
        <Badge tone={row.passed ? "leaf" : "red"} dot>
          {row.passed ? "Aprobada" : "Fallida"}
        </Badge>
      ),
    },
    {
      key: "name",
      label: "Prueba",
      render: (row) => (
        <span>
          <strong>{row.name}</strong>
          <span className="muted-small"> · {row.id}</span>
        </span>
      ),
    },
    { key: "expected", label: "Esperado" },
    { key: "actual", label: "Obtenido" },
    { key: "tolerance", label: "Tolerancia" },
    { key: "source", label: "Fuente" },
  ];

  const refColumns: TableColumn<(typeof REFERENCE_VALUES)[number]>[] = [
    { key: "parameter", label: "Parámetro", render: (row) => <strong>{row.parameter}</strong> },
    { key: "value", label: "Valor" },
    { key: "source", label: "Fuente" },
    { key: "pages", label: "Páginas" },
    { key: "classification", label: "Clasificación" },
    { key: "usedIn", label: "Uso en el modelo" },
  ];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 15 · Métodos"
        title="Trazabilidad del motor"
        description="Cada formulación declara variables, fuente, páginas, supuestos, limitaciones y prueba de referencia. La verificación se ejecuta en vivo sobre las funciones implementadas, sin valores precargados."
        actions={
          <>
            <Btn variant="outline" icon={<RefreshCw size={14} />} onClick={rerun}>Repetir verificación</Btn>
            <Btn variant="primary" icon={<Download size={14} />} onClick={exportMethods}>Exportar métodos</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Métodos registrados" value={String(METHODS.length)} hint={`${METHODS.filter((m) => m.implemented).length} implementados en el motor`} tone="leaf" />
        <Kpi label="Pruebas en vivo" value={`${summary.passed} / ${summary.total}`} hint={summary.ok ? "Todas aprobadas" : `${summary.failed} fallida(s)`} tone={summary.ok ? "leaf" : "danger"} />
        <Kpi label="Valores de referencia" value={String(REFERENCE_VALUES.length)} hint="Contrastados con el texto citado" tone="amber" />
        <Kpi label="Fuentes" value={String(Object.keys(SOURCES).length)} hint="Manuales técnicos, IPCC y documentación interna" tone="blue" />
      </KpiGrid>

      <Panel
        title="Estado de la verificación"
        eyebrow={summary.ok ? "Motor consistente" : "Revisar fallas"}
        description="Las pruebas se ejecutan sobre las funciones reales del motor. No sustituyen una validación externa con datos de campo."
        actions={<Badge tone={summary.ok ? "leaf" : "red"} dot>{summary.ok ? "Todas aprobadas" : `${summary.failed} falla(s)`}</Badge>}
      >
        <div className="inline-stat-block">
          <MiniStat label="Aprobadas" value={String(summary.passed)} hint="Dentro de la tolerancia declarada" />
          <MiniStat label="Fallidas" value={String(summary.failed)} hint={summary.failed ? "No use los resultados sin revisar" : "Sin fallas detectadas"} />
          <MiniStat label="Última ejecución" value={new Date(lastRun).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} hint="Hora local del navegador" />
          <MiniStat label="Proyecto" value={project.name} hint={`Escenario activo del laboratorio`} />
        </div>
        { summary.failed ? (
          <Callout tone="danger" title="Hay pruebas fallidas">
            Una prueba fallida indica que el resultado calculado no coincide con el valor de referencia o con el cierre de
            balance esperado. Documente el caso antes de usar el informe.
          </Callout>
        ) : (
          <Callout tone="success" title="Las pruebas de referencia coinciden">
            Esto verifica los casos documentados, no la validez de los datos introducidos ni la aptitud del sitio.
          </Callout>
        )}
      </Panel>

      <Tabs value={tab} onChange={setTab}>
        <TabList>
          <Tab value="catalogo">Catálogo</Tab>
          <Tab value="verificacion">Verificación</Tab>
          <Tab value="referencias">Valores de referencia</Tab>
          <Tab value="fuentes">Fuentes</Tab>
        </TabList>

        <TabPanel value="catalogo">
          <div className="module-stack">
            <Panel
              title="Filtros del catálogo"
              eyebrow={`${filtered.length} de ${METHODS.length} métodos`}
              description="La búsqueda cubre nombre, fórmula, fuente, supuestos y limitaciones."
            >
              <div className="filter-bar">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar método, fórmula o fuente…" />
                <div className="filter-select">
                  <Field label="Categoría">
                    <SelectField
                      value={category}
                      onChange={setCategory}
                      options={[{ value: "todas", label: "Todas las categorías" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
                    />
                  </Field>
                </div>
                <div className="filter-select">
                  <Field label="Estado">
                    <SelectField
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: "todos", label: "Todos los estados" },
                        { value: "validado-con-ejemplo", label: "Validado con ejemplo" },
                        { value: "verificado-por-balance", label: "Verificado por balance" },
                        { value: "conceptual", label: "Conceptual" },
                        { value: "referencia", label: "Referencia documental" },
                      ]}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className={`filter-chip ${onlyImplemented ? "is-active" : ""}`}
                  onClick={() => setOnlyImplemented((value) => !value)}
                  aria-pressed={onlyImplemented}
                >
                  <CheckCircle2 size={12} /> Solo implementados
                </button>
              </div>
              <div className="row-actions">
                <Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportMethods}>Exportar selección CSV</Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setCategory("todas");
                    setStatus("todos");
                    setOnlyImplemented(false);
                  }}
                >
                  Limpiar filtros
                </Btn>
              </div>
              <div className="callout-inline">
                <Search size={14} />
                <span>El catálogo incluye métodos de referencia que no son el cálculo principal (por ejemplo, la prospección preliminar de Honduras 2014).</span>
              </div>
            </Panel>

            {Object.keys(grouped).length === 0 ? (
              <Panel title="Sin resultados" eyebrow="Filtros">
                <p className="muted-small">Ningún método coincide con los filtros seleccionados.</p>
              </Panel>
            ) : (
              Object.entries(grouped).map(([group, methods]) => (
                <Panel key={group} title={group} eyebrow={`${methods.length} método(s)`} description={`Formulaciones y trazabilidad del grupo ${group}.`}>
                  <div className="method-grid">
                    {methods.map((method) => (
                      <article key={method.id} className="method-card">
                        <header className="method-head">
                          <div>
                            <h3>{method.name}</h3>
                            <span className="method-id">{method.id} · v{method.version}</span>
                          </div>
                          <div className="method-badges">
                            <Badge tone={VALIDATION_TONE[method.validation]}>{VALIDATION_LABEL[method.validation]}</Badge>
                            <Badge tone={method.implemented ? "leaf" : "neutral"} dot={method.implemented}>
                              {method.implemented ? "Implementado" : "Referencia"}
                            </Badge>
                          </div>
                        </header>
                        <Formula>{method.formula}</Formula>
                        <div className="method-meta">
                          <span><BookOpen size={11} /> {method.sourceDoc}</span>
                          <span>{method.sourcePages}</span>
                          <span>Resultado: {method.resultUnit}</span>
                        </div>
                        {method.variables.length ? (
                          <div className="method-variables">
                            {method.variables.map((variable) => (
                              <span key={variable.symbol}>
                                <code>{variable.symbol}</code> {variable.description} <small>{variable.unit}</small>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="method-copy">
                          <div>
                            <strong>Supuestos</strong>
                            <ul>
                              {method.assumptions.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <strong>Limitaciones</strong>
                            <ul>
                              {method.limitations.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                        </div>
                        <footer className="method-foot">
                          <span><Beaker size={11} /> {method.testCase}</span>
                          <span className="method-engine">Motor: {method.engineFunction}</span>
                          {method.sourceUrl ? (
                            <a href={method.sourceUrl} target="_blank" rel="noreferrer">
                              Abrir fuente <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="muted-small">Documentación interna</span>
                          )}
                        </footer>
                      </article>
                    ))}
                  </div>
                </Panel>
              ))
            )}
          </div>
        </TabPanel>

        <TabPanel value="verificacion">
          <div className="module-stack">
            <Panel
              title="Pruebas de referencia"
              eyebrow={`${summary.passed} aprobadas · ${summary.failed} fallidas`}
              description="Cada prueba compara un resultado calculado contra un valor documentado o un cierre de balance. La tolerancia se muestra explícitamente."
              actions={<Btn size="sm" variant="outline" icon={<RefreshCw size={12} />} onClick={rerun}>Ejecutar de nuevo</Btn>}
              flush
            >
              <DataTable columns={testColumns} rows={tests} rowKey={(row) => row.id} dense maxHeight={500} />
            </Panel>
            <Panel title="Qué significa cada prueba" eyebrow="Lectura" description="Las pruebas verifican aritmética y conservación, no calidad de datos.">
              <div className="assumption-list">
                <p><strong>Volumen prismoidal:</strong> la trinchera de MINAM 2011 se integra con la fórmula exacta (1 075.83 m³); el manual reporta 1 068.52 m³ con la fórmula de tronco, una diferencia de +0.68 % que se declara en el catálogo.</p>
                <p><strong>Capacidad preliminar:</strong> reproduce el orden de magnitud del ejemplo de Honduras 2014, con densidad fija de 600 kg/m³.</p>
                <p><strong>Cierre de capacidad:</strong> comprueba que residuos más cobertura igualan el volumen disponible y que la tonelada se deriva de la densidad.</p>
                <p><strong>Manning:</strong> verifica la capacidad a sección llena con D = 0.20 m, S = 0.01 y n = 0.013.</p>
                <p><strong>Talud infinito:</strong> verifica FS = 1.732 para β = 18.43°, φ′ = 30° y c′ = 0.</p>
                <p><strong>IPCC FOD:</strong> integra el decaimiento y lo compara con el potencial último de metano.</p>
                <p><strong>Balance hídrico:</strong> comprueba P = R + ET + I y la partición entre lixiviado tratado y no tratado.</p>
              </div>
              <Callout tone="info" title="Verificación interna, no certificación">
                Una prueba aprobada demuestra que la implementación reproduce el caso documentado en este entorno. No
                demuestra que los parámetros del proyecto sean correctos ni que el diseño cumpla una norma.
              </Callout>
            </Panel>
          </div>
        </TabPanel>

        <TabPanel value="referencias">
          <div className="module-stack">
            <Panel
              title="Valores de referencia"
              eyebrow={`${REFERENCE_VALUES.length} registros`}
              description="Valores citados de los manuales. Se clasifican como recomendación técnica, dato de diseño o rango observado; no son límites legales automáticos."
              actions={<Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportReferences}>Exportar CSV</Btn>}
              flush
            >
              <DataTable columns={refColumns} rows={REFERENCE_VALUES} rowKey={(row) => row.id} dense maxHeight={520} />
            </Panel>
            <Panel title="Clasificación de referencias" eyebrow="Cómo leer la tabla" description="La columna de clasificación evita confundir una recomendación con una obligación.">
              <div className="report-quality-grid">
                <div><Gauge size={15} /><strong>Recomendación técnica</strong><p>Criterio de buena práctica de la guía citada; no es una norma legal.</p></div>
                <div><FlaskConical size={15} /><strong>Dato de diseño</strong><p>Valor usado para dimensionar, con supuestos declarados.</p></div>
                <div><ShieldCheck size={15} /><strong>Rango observado</strong><p>Intervalo reportado en la fuente; requiere justificación local.</p></div>
              </div>
              <Callout tone="warn" title="No son límites automáticos">
                Antes de convertir una referencia en requisito, confirme la norma vigente, su ámbito de aplicación y la
                autoridad competente. El software no impone espesores ni distancias legales a partir de estas tablas.
              </Callout>
            </Panel>
          </div>
        </TabPanel>

        <TabPanel value="fuentes">
          <div className="module-stack">
            <Panel title="Fuentes citadas" eyebrow={`${Object.keys(SOURCES).length} documentos`} description="Cada método enlaza a una de estas fuentes. Los enlaces abren el documento original en otra pestaña.">
              <div className="source-list">
                {Object.entries(SOURCES).map(([key, source]) => (
                  <article key={key} className="source-card">
                    <div className="source-head">
                      <BookOpen size={15} />
                      <div>
                        <h3>{source.title}</h3>
                        <span>{source.issuer} · {source.year}</span>
                      </div>
                    </div>
                    <p>{source.note}</p>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Abrir documento original <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="muted-small">Documento interno del proyecto; no tiene URL pública.</span>
                    )}
                  </article>
                ))}
              </div>
              <Callout tone="info" title="Trazabilidad de páginas">
                Las páginas citadas corresponden a la numeración indicada en el registro del método. Cuando el PDF y la
                paginación impresa difieren, se indica entre paréntesis.
              </Callout>
            </Panel>
          </div>
        </TabPanel>
      </Tabs>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <FlaskConical size={14} /> {METHODS.length} métodos · {summary.passed}/{summary.total} pruebas aprobadas · {Object.keys(SOURCES).length} fuentes
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={exportMethods}>Exportar métodos</Btn>
          <Btn variant="primary" icon={<RefreshCw size={13} />} onClick={rerun}>Repetir verificación</Btn>
        </div>
      </div>
    </div>
  );
}
