"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  Download,
  ExternalLink,
  FilePlus2,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Btn,
  Callout,
  ConfirmDialog,
  DataTable,
  Field,
  Kpi,
  KpiGrid,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  SelectField,
  TextArea,
  TextField,
  type TableColumn,
} from "@/components/ui";
import { useStore, useActiveProject } from "@/lib/store";
import { DOC_CLASS_LABEL, DOC_STATUS_LABEL, normativeStats } from "@/lib/normative";
import { downloadText, safeFileName, toCsv } from "@/lib/exporters";
import { fmtDate } from "@/lib/format";
import { uid } from "@/lib/uid";
import type { RawDocument } from "@/lib/types";
import { MiniStat } from "./shared";

const KIND_LABEL: Record<RawDocument["kind"], string> = {
  norma: "Norma",
  guia: "Guía técnica",
  metodo: "Método",
  otro: "Otro",
};

const STATUS_TONE: Record<RawDocument["status"], "leaf" | "amber" | "neutral"> = {
  "vigente-verificado": "leaf",
  "pendiente-verificacion": "amber",
  "referencia-historica": "neutral",
};

function newDocument(): RawDocument {
  return {
    id: uid("doc"),
    title: "",
    kind: "norma",
    number: "",
    date: new Date().toISOString().slice(0, 10),
    issuer: "",
    article: "Por verificar en el texto oficial",
    sourceUrl: "",
    accessedAt: new Date().toISOString().slice(0, 10),
    status: "pendiente-verificacion",
    applicability: "",
    classification: "requisito-legal",
    notes: "",
  };
}

export default function Normativa() {
  const project = useActiveProject();
  const documents = useStore((s) => s.documents);
  const addDocument = useStore((s) => s.addDocument);
  const updateDocument = useStore((s) => s.updateDocument);
  const deleteDocument = useStore((s) => s.deleteDocument);
  const resetDocuments = useStore((s) => s.resetDocuments);
  const pushToast = useStore((s) => s.pushToast);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [classification, setClassification] = useState("todas");
  const [form, setForm] = useState<RawDocument | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RawDocument | null>(null);
  const [pendingReset, setPendingReset] = useState(false);

  const stats = useMemo(() => normativeStats(documents), [documents]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (status !== "todos" && doc.status !== status) return false;
      if (classification !== "todas" && doc.classification !== classification) return false;
      if (!needle) return true;
      return `${doc.title} ${doc.number} ${doc.issuer} ${doc.article} ${doc.applicability} ${doc.notes}`
        .toLowerCase()
        .includes(needle);
    });
  }, [documents, search, status, classification]);

  const openNew = () => {
    setForm(newDocument());
    setIsNew(true);
    setFormError(null);
  };

  const openEdit = (doc: RawDocument) => {
    setForm(structuredClone(doc));
    setIsNew(false);
    setFormError(null);
  };

  const save = () => {
    if (!form) return;
    if (form.title.trim().length < 4) {
      setFormError("El título debe tener al menos 4 caracteres.");
      return;
    }
    if (!form.number.trim()) {
      setFormError("Indique el número, la fecha o el identificador del documento.");
      return;
    }
    if (!form.issuer.trim()) {
      setFormError("Indique el emisor del documento.");
      return;
    }
    const clean: RawDocument = {
      ...form,
      title: form.title.trim(),
      number: form.number.trim(),
      issuer: form.issuer.trim(),
      article: form.article.trim() || "Por verificar",
      applicability: form.applicability.trim(),
      notes: form.notes.trim(),
      sourceUrl: form.sourceUrl.trim(),
    };
    if (isNew) {
      addDocument(clean);
      pushToast({ kind: "ok", title: "Documento agregado", detail: `${clean.title} · ${DOC_STATUS_LABEL[clean.status]}` });
    } else {
      updateDocument(clean.id, clean);
      pushToast({ kind: "ok", title: "Documento actualizado", detail: `${clean.title} · ${DOC_STATUS_LABEL[clean.status]}` });
    }
    setForm(null);
  };

  const exportDocs = () => {
    const rows = filtered.map((doc) => ({
      title: doc.title,
      kind: KIND_LABEL[doc.kind],
      number: doc.number,
      date: doc.date,
      issuer: doc.issuer,
      article: doc.article,
      status: DOC_STATUS_LABEL[doc.status],
      classification: DOC_CLASS_LABEL[doc.classification],
      applicability: doc.applicability,
      notes: doc.notes,
      url: doc.sourceUrl,
      accessedAt: doc.accessedAt,
    }));
    const csv = toCsv(
      [
        { key: "title", label: "Documento" },
        { key: "kind", label: "Tipo" },
        { key: "number", label: "Número / fecha" },
        { key: "date", label: "Fecha" },
        { key: "issuer", label: "Emisor" },
        { key: "article", label: "Artículo" },
        { key: "status", label: "Estado" },
        { key: "classification", label: "Clasificación" },
        { key: "applicability", label: "Aplicabilidad" },
        { key: "notes", label: "Notas" },
        { key: "url", label: "URL" },
        { key: "accessedAt", label: "Consultado" },
      ],
      rows,
    );
    downloadText(csv, `${safeFileName(project.name)}-biblioteca-normativa.csv`, "text/csv;charset=utf-8");
    pushToast({ kind: "ok", title: "Biblioteca exportada", detail: `${filtered.length} documento(s) con su estado de verificación.` });
  };

  const columns: TableColumn<RawDocument>[] = [
    {
      key: "title",
      label: "Documento",
      render: (doc) => (
        <span>
          <strong>{doc.title}</strong>
          <span className="muted-small"> · {doc.number}</span>
        </span>
      ),
    },
    { key: "kind", label: "Tipo", width: "110px", render: (doc) => KIND_LABEL[doc.kind] },
    { key: "issuer", label: "Emisor" },
    {
      key: "status",
      label: "Estado",
      width: "150px",
      render: (doc) => <Badge tone={STATUS_TONE[doc.status]} dot>{DOC_STATUS_LABEL[doc.status]}</Badge>,
    },
    {
      key: "classification",
      label: "Clasificación",
      width: "160px",
      render: (doc) => <Badge tone="outline">{DOC_CLASS_LABEL[doc.classification]}</Badge>,
    },
    { key: "article", label: "Artículo" },
    { key: "date", label: "Fecha", width: "110px", render: (doc) => fmtDate(doc.date) },
    {
      key: "actions",
      label: "",
      width: "112px",
      render: (doc) => (
        <span className="row-actions">
          {doc.sourceUrl ? (
            <a
              className="icon-button"
              href={doc.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title="Abrir fuente oficial"
              aria-label={`Abrir fuente de ${doc.title}`}
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink size={12} />
            </a>
          ) : null}
          <button type="button" className="icon-button" title="Editar documento" aria-label={`Editar ${doc.title}`} onClick={() => openEdit(doc)}>
            <Pencil size={12} />
          </button>
          <button type="button" className="icon-button" title="Eliminar documento" aria-label={`Eliminar ${doc.title}`} onClick={() => setPendingDelete(doc)}>
            <Trash2 size={12} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 16 · Normativa"
        title="Biblioteca documental"
        description="Documentos citados con estado de verificación explícito. Ninguna entrada se declara vigente sin contraste con la fuente oficial y sus modificaciones."
        actions={
          <>
            <Btn variant="outline" icon={<Download size={14} />} onClick={exportDocs}>Exportar biblioteca</Btn>
            <Btn variant="primary" icon={<FilePlus2 size={14} />} onClick={openNew}>Agregar documento</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Documentos" value={String(stats.total)} hint={`${stats.legal} clasificados como requisito legal`} tone="blue" />
        <Kpi label="Vigentes verificados" value={String(stats.verified)} hint="Contraste oficial declarado" tone="leaf" />
        <Kpi label="Verificación pendiente" value={String(stats.pending)} hint="No citar como obligación vigente" tone="amber" />
        <Kpi label="Referencias históricas" value={String(stats.historical)} hint="Se conservan por trazabilidad" tone="default" />
      </KpiGrid>

      {stats.pending > 0 ? (
        <Callout tone="warn" title="Hay entradas pendientes de verificación">
          {stats.pending} documento(s) figuran con verificación pendiente. El software las conserva como referencias de
          trabajo, no como requisitos legales aplicables. Confirme número, artículo, vigencia y modificaciones en la fuente
          oficial antes de citarlas.
        </Callout>
      ) : null}

      <Panel
        title="Estado de la biblioteca"
        eyebrow="Advertencia de uso"
        description="La clasificación distingue requisitos legales, recomendaciones técnicas, parámetros configurables y supuestos del modelo."
      >
        <div className="inline-stat-block">
          <MiniStat label="Requisitos legales" value={String(stats.legal)} hint="Verificar vigencia y articulado" />
          <MiniStat label="Recomendaciones" value={String(documents.filter((d) => d.classification === "recomendacion-tecnica").length)} hint="No son obligaciones automáticas" />
          <MiniStat label="Parámetros" value={String(documents.filter((d) => d.classification === "parametro-configurable").length)} hint="Configurables por el usuario" />
          <MiniStat label="Supuestos" value={String(documents.filter((d) => d.classification === "supuesto-modelo").length)} hint="Declarados en el modelo" />
        </div>
        <div className="callout-inline">
          <Landmark size={14} />
          <span>Una entrada «vigente verificada» significa que el usuario declaró el contraste oficial; el software no consulta portales ni valida la vigencia en tiempo real.</span>
        </div>
        <div className="callout-inline">
          <Scale size={14} />
          <span>La biblioteca no reemplaza la revisión legal ni la determinación de la autoridad competente.</span>
        </div>
      </Panel>

      <Panel
        title="Documentos registrados"
        eyebrow={`${filtered.length} de ${documents.length}`}
        description="Filtre por estado o clasificación, abra la fuente oficial o edite los metadatos. Eliminar un documento no afecta los cálculos."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar documento…" />
            <Btn size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => setPendingReset(true)}>Restaurar biblioteca</Btn>
          </>
        }
        flush
      >
        <div className="filter-bar filter-bar-pad">
          <div className="filter-select">
            <Field label="Estado">
              <SelectField
                value={status}
                onChange={setStatus}
                options={[
                  { value: "todos", label: "Todos los estados" },
                  { value: "vigente-verificado", label: "Vigente verificado" },
                  { value: "pendiente-verificacion", label: "Verificación pendiente" },
                  { value: "referencia-historica", label: "Referencia histórica" },
                ]}
              />
            </Field>
          </div>
          <div className="filter-select">
            <Field label="Clasificación">
              <SelectField
                value={classification}
                onChange={setClassification}
                options={[
                  { value: "todas", label: "Todas las clasificaciones" },
                  { value: "requisito-legal", label: "Requisito legal" },
                  { value: "recomendacion-tecnica", label: "Recomendación técnica" },
                  { value: "parametro-configurable", label: "Parámetro configurable" },
                  { value: "supuesto-modelo", label: "Supuesto del modelo" },
                ]}
              />
            </Field>
          </div>
          <div className="filter-actions">
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus("todos");
                setClassification("todas");
              }}
            >
              Limpiar filtros
            </Btn>
            <Btn size="sm" variant="outline" icon={<Download size={12} />} onClick={exportDocs}>Exportar selección</Btn>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(doc) => doc.id}
          dense
          maxHeight={520}
          empty="No hay documentos con los filtros seleccionados."
        />
      </Panel>

      <div className="split-grid">
        <Panel title="Cómo verificar una entrada" eyebrow="Procedimiento" description="Pasos mínimos antes de convertir una referencia en obligación.">
          <div className="check-list">
            {[
              "Localice el texto oficial en el portal del emisor o en el diario oficial.",
              "Confirme número, fecha, artículo y versiones modificatorias.",
              "Verifique el ámbito de aplicación y la autoridad competente.",
              "Registre la fecha de consulta y la URL estable.",
              "Cambie el estado a «Vigente verificado» solo después del contraste.",
              "Documente en notas cualquier duda o discrepancia encontrada.",
            ].map((item) => (
              <div key={item} className="check-line">
                <CheckCircle2 size={12} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Callout tone="info" title="Sin datos inventados">
            Las entradas peruanas incluidas por defecto están marcadas como pendientes o históricas. No se atribuyen
            artículos, espesores ni límites que no hayan sido contrastados.
          </Callout>
        </Panel>

        <Panel title="Clasificaciones" eyebrow="Glosario" description="La clasificación determina cómo debe leerse cada documento dentro del modelo.">
          <div className="report-quality-grid">
            <div><Scale size={15} /><strong>Requisito legal</strong><p>Obligación potencial; requiere verificación de vigencia y aplicación.</p></div>
            <div><BookMarked size={15} /><strong>Recomendación técnica</strong><p>Criterio de buena práctica de una guía; no es obligación automática.</p></div>
            <div><ShieldAlert size={15} /><strong>Parámetro configurable</strong><p>Valor editable que el usuario debe justificar para su sitio.</p></div>
            <div><Search size={15} /><strong>Supuesto del modelo</strong><p>Hipótesis de cálculo declarada; no es un dato medido ni una norma.</p></div>
          </div>
          <div className="assumption-list">
            <p>El estado «referencia histórica» conserva documentos citados por las guías originales, sin declararlos vigentes.</p>
            <p>El estado «vigente verificado» es una declaración del usuario, no una consulta automática a la autoridad.</p>
          </div>
        </Panel>
      </div>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <BookMarked size={14} /> {documents.length} documentos · {stats.pending} pendientes · {stats.verified} verificados
        </div>
        <div className="row-actions">
          <Btn variant="outline" size="sm" icon={<Download size={13} />} onClick={exportDocs}>Exportar biblioteca</Btn>
          <Btn variant="primary" icon={<Plus size={13} />} onClick={openNew}>Agregar documento</Btn>
        </div>
      </div>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={isNew ? "Agregar documento" : "Editar documento"}
        description="Registre solo información que pueda sustentar. Los campos vacíos se conservan como pendientes de completar."
        eyebrow="Biblioteca normativa"
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={save}>{isNew ? "Agregar" : "Guardar cambios"}</Btn>
          </>
        }
      >
        {form ? (
          <div className="stack" style={{ gap: 12 }}>
            <div className="form-grid form-grid-2">
              <Field label="Título" required className="span-2">
                <TextField
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Nombre completo del documento"
                  autoFocus
                />
              </Field>
              <Field label="Tipo">
                <SelectField
                  value={form.kind}
                  onChange={(value) => setForm({ ...form, kind: value as RawDocument["kind"] })}
                  options={(Object.keys(KIND_LABEL) as RawDocument["kind"][]).map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))}
                />
              </Field>
              <Field label="Número o identificador" required>
                <TextField value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder="Ej. Decreto Supremo N.° …" />
              </Field>
              <Field label="Fecha">
                <TextField type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </Field>
              <Field label="Emisor" required>
                <TextField value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} placeholder="Entidad que emite el documento" />
              </Field>
              <Field label="Artículo o sección">
                <TextField value={form.article} onChange={(event) => setForm({ ...form, article: event.target.value })} placeholder="Por verificar en el texto oficial" />
              </Field>
              <Field label="Estado de verificación">
                <SelectField
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value as RawDocument["status"] })}
                  options={(Object.keys(DOC_STATUS_LABEL) as RawDocument["status"][]).map((key) => ({ value: key, label: DOC_STATUS_LABEL[key] }))}
                />
              </Field>
              <Field label="Clasificación">
                <SelectField
                  value={form.classification}
                  onChange={(value) => setForm({ ...form, classification: value as RawDocument["classification"] })}
                  options={(Object.keys(DOC_CLASS_LABEL) as RawDocument["classification"][]).map((key) => ({ value: key, label: DOC_CLASS_LABEL[key] }))}
                />
              </Field>
              <Field label="Fecha de consulta">
                <TextField type="date" value={form.accessedAt} onChange={(event) => setForm({ ...form, accessedAt: event.target.value })} />
              </Field>
              <Field label="URL de la fuente" className="span-2" hint="Enlace directo al texto oficial o a la ficha institucional.">
                <TextField value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Aplicabilidad" className="span-2">
                <TextArea
                  rows={3}
                  value={form.applicability}
                  onChange={(event) => setForm({ ...form, applicability: event.target.value })}
                  placeholder="Qué aspecto del proyecto cubre y bajo qué condiciones."
                />
              </Field>
              <Field label="Notas y advertencias" className="span-2">
                <TextArea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Dudas, modificaciones, artículos no verificados…"
                />
              </Field>
            </div>
            {formError ? <Callout tone="danger" title="No se puede guardar">{formError}</Callout> : null}
            <Callout tone="info" title="Verificación pendiente por defecto">
              Un documento nuevo se guarda como «Verificación pendiente» salvo que usted cambie el estado de forma
              explícita. El estado no se actualiza automáticamente.
            </Callout>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar documento"
        description={pendingDelete ? `Se eliminará «${pendingDelete.title}» de la biblioteca local.` : undefined}
        confirmLabel="Eliminar documento"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteDocument(pendingDelete.id);
          pushToast({ kind: "ok", title: "Documento eliminado", detail: pendingDelete.title });
          setPendingDelete(null);
        }}
      >
        <p className="muted-small">La acción no modifica los cálculos del modelo ni los proyectos.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingReset}
        tone="primary"
        title="Restaurar biblioteca predeterminada"
        description="Se reemplazarán todos los documentos actuales por la biblioteca incluida en la aplicación."
        confirmLabel="Restaurar biblioteca"
        onClose={() => setPendingReset(false)}
        onConfirm={() => {
          resetDocuments();
          pushToast({ kind: "ok", title: "Biblioteca restaurada", detail: "Se recuperaron los documentos predeterminados con su estado original." });
          setPendingReset(false);
        }}
      >
        <p className="muted-small">Los documentos agregados o editados por usted se perderán. Exporte un respaldo antes de continuar.</p>
      </ConfirmDialog>
    </div>
  );
}
