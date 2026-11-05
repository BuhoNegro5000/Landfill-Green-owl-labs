"use client";

import { useEffect, useState } from "react";
import { Check, Database, FolderPlus, HardDrive, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useStore, useActiveProject } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";
import { projectMetaSchema, type ScenarioKind } from "@/lib/types";
import { Badge, Btn, Callout, CheckOption, Field, Modal, NumberField, SelectField, TextArea, TextField } from "@/components/ui";
import { BRAND } from "@/lib/defaults";

const SCENARIO_KINDS: { value: ScenarioKind; label: string }[] = [
  { value: "conservador", label: "Conservador" },
  { value: "generacion-elevada", label: "Generación elevada" },
  { value: "mayor-recuperacion", label: "Mayor recuperación" },
  { value: "precipitaciones", label: "Precipitaciones extremas" },
  { value: "optimizacion-capacidad", label: "Optimización de capacidad" },
  { value: "clausura-anticipada", label: "Clausura anticipada" },
  { value: "personalizado", label: "Personalizado (copia del activo)" },
];

export function Dialogs() {
  const dialog = useStore((s) => s.activeDialog);
  const setDialog = useStore((s) => s.setDialog);
  const close = () => setDialog(null);
  return (
    <>
      <NewProjectDialog open={dialog === "new-project"} onClose={close} />
      <NewScenarioDialog open={dialog === "new-scenario"} onClose={close} />
      <HelpDialog open={dialog === "help"} onClose={close} />
    </>
  );
}

function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProject = useStore((s) => s.createProject);
  const [templateId, setTemplateId] = useState("mecanizado");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Perú");
  const [region, setRegion] = useState("");
  const [location, setLocation] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");
  const [horizon, setHorizon] = useState(20);
  const [population, setPopulation] = useState(150_000);
  const [perCapita, setPerCapita] = useState(0.62);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
    setPopulation(template.population);
    setPerCapita(template.perCapita);
    setHorizon(template.horizon);
  }, [templateId, open]);

  const submit = () => {
    const parsed = projectMetaSchema.safeParse({
      name: name.trim() || "Proyecto sin nombre",
      country,
      region: region.trim(),
      location: location.trim(),
      unitSystem: "SI",
      regulationRef: "Por definir",
      responsible: responsible.trim(),
      notes,
      version: "0.1",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise los datos del proyecto.");
      return;
    }
    if (!Number.isFinite(population) || population < 500) {
      setError("La población servida debe ser al menos 500 habitantes.");
      return;
    }
    if (!Number.isFinite(perCapita) || perCapita < 0.1 || perCapita > 3) {
      setError("La generación per cápita debe estar entre 0,1 y 3,0 kg/hab/día.");
      return;
    }
    setError(null);
    createProject({
      name,
      country,
      region,
      location,
      responsible,
      notes,
      horizonYears: horizon,
      templateId,
      population,
      perCapitaKgDay: perCapita,
    });
    setName("");
    setRegion("");
    setLocation("");
    setResponsible("");
    setNotes("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo proyecto"
      description="Cree un proyecto con datos mínimos. Después complete el emplazamiento y declare la calidad de cada dato."
      eyebrow="Laboratorio · proyecto"
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={submit} icon={<FolderPlus size={14} />}>Crear proyecto</Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-grid form-grid-2">
          <Field label="Nombre del proyecto" required>
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Relleno Sanitario Municipal Norte" autoFocus />
          </Field>
          <Field label="País" required>
            <SelectField
              value={country}
              onChange={setCountry}
              options={[
                { value: "Perú", label: "Perú" },
                { value: "Honduras", label: "Honduras" },
                { value: "Otro", label: "Otro / por definir" },
              ]}
            />
          </Field>
          <Field label="Región / departamento" required>
            <TextField value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ej. Junín" />
          </Field>
          <Field label="Ubicación del emplazamiento" required>
            <TextField value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sector, distrito o coordenadas descriptivas" />
          </Field>
          <Field label="Responsable técnico" required>
            <TextField value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nombre y especialidad" />
          </Field>
          <Field label="Horizonte de evaluación" hint="5 a 60 años. El balance anual puede agotar la capacidad antes.">
            <NumberField value={horizon} onChange={setHorizon} min={5} max={60} step={1} unit="años" />
          </Field>
          <Field label="Población servida" hint="Dato inicial; puede modificarse por escenario.">
            <NumberField value={population} onChange={setPopulation} min={500} max={20_000_000} step={1000} unit="hab" />
          </Field>
          <Field label="Generación per cápita" hint="kg/hab/día del estudio de caracterización.">
            <NumberField value={perCapita} onChange={setPerCapita} min={0.1} max={3} step={0.01} unit="kg/hab/d" />
          </Field>
        </div>

        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Plantilla de partida</div>
          <div className="template-grid">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${templateId === template.id ? "is-active" : ""}`}
                onClick={() => setTemplateId(template.id)}
              >
                <span className="template-accent" style={{ background: template.accent }} />
                <span className="template-head">
                  <strong>{template.name}</strong>
                  <Badge tone={template.recommended ? "leaf" : "neutral"}>{template.tag}</Badge>
                </span>
                <span className="template-sub">{template.subtitle}</span>
                <span className="template-desc">{template.description}</span>
                <span className="template-meta">{template.horizon} años · {template.population.toLocaleString("es-PE")} hab</span>
                {templateId === template.id ? <span className="template-check"><Check size={11} /></span> : null}
              </button>
            ))}
          </div>
        </div>

        <Field label="Notas y alcance" hint="Los proyectos nuevos se guardan solo en este navegador.">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Objetivo del estudio, limitaciones conocidas, fuentes de datos…" />
        </Field>

        {error ? <Callout tone="danger" title="No se puede crear el proyecto">{error}</Callout> : null}

        <Callout tone="info" title="Persistencia y alcance">
          El proyecto se almacena en <strong>localStorage</strong> de este navegador. No se envía a ningún servidor. Exporte un
          respaldo JSON desde Configuración antes de limpiar los datos del navegador.
        </Callout>
      </div>
    </Modal>
  );
}

function NewScenarioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useActiveProject();
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const addScenario = useStore((s) => s.addScenario);
  const active = project.scenarios.find((s) => s.id === activeScenarioId) ?? project.scenarios[0];
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ScenarioKind>("conservador");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const submit = () => {
    if (name.trim().length < 2) {
      setError("Indique un nombre de al menos 2 caracteres.");
      return;
    }
    const id = addScenario({ name, kind, description });
    if (!id) {
      setError("No se pudo crear el escenario. Verifique el proyecto activo.");
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo escenario"
      description={`Se creará a partir de «${active.name}». Los cambios posteriores no alteran el escenario de origen.`}
      eyebrow="Análisis · escenario"
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={submit} icon={<Sparkles size={14} />}>Crear escenario</Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <Field label="Nombre del escenario" required>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Demanda alta 2040" autoFocus />
        </Field>
        <Field label="Tipo de escenario" hint="Los tipos predefinidos aplican un conjunto documentado de cambios respecto del escenario activo.">
          <SelectField value={kind} onChange={(v) => setKind(v as ScenarioKind)} options={SCENARIO_KINDS} />
        </Field>
        <Field label="Descripción / propósito">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="¿Qué decisión o hipótesis evalúa este escenario?" />
        </Field>
        {error ? <Callout tone="danger" title="No se puede crear el escenario">{error}</Callout> : null}
        <Callout tone="info" title="Independencia de escenarios">
          Cada escenario guarda una copia completa de parámetros y se recalcula con los mismos motores. No modifica el
          escenario base, salvo que usted lo designe explícitamente como base.
        </Callout>
      </div>
    </Modal>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alcance, datos y atajos"
      description={`${BRAND.product} · ${BRAND.engine}`}
      eyebrow="Ayuda"
      size="lg"
      footer={<Btn variant="primary" onClick={onClose}>Entendido</Btn>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div className="help-grid">
          <div className="help-card">
            <HardDrive size={16} />
            <strong>Datos locales</strong>
            <p>Proyectos, escenarios y documentos viven en el almacenamiento del navegador. No hay backend, cuentas ni telemetría.</p>
          </div>
          <div className="help-card">
            <Database size={16} />
            <strong>Sin datos inventados</strong>
            <p>Las normas peruanas figuran como verificación pendiente. Los manuales técnicos se citan como referencias, no como requisitos legales.</p>
          </div>
          <div className="help-card">
            <ShieldCheck size={16} />
            <strong>Resultados trazables</strong>
            <p>Cada motor declara fórmula, supuestos, limitaciones y fuente con página. Las verificaciones de referencia se ejecutan en vivo.</p>
          </div>
          <div className="help-card">
            <TriangleAlert size={16} />
            <strong>Límites del modelo</strong>
            <p>La geotecnia es un chequeo de talud infinito. El 3D es una representación; las capas se exageran para poder verse.</p>
          </div>
        </div>

        <Callout tone="warn" title="No es un documento firmado ni un estudio de campo">
          Esta herramienta ordena el dimensionamiento y hace explícitos los supuestos. No sustituye topografía, ensayos de
          suelo, estudios de hidrogeología, evaluación de impacto ambiental ni la firma de un profesional habilitado.
        </Callout>

        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Atajos y comportamiento</div>
          <ul className="help-list">
            <li><kbd>Enter</kbd> en la pantalla de arranque entra al laboratorio.</li>
            <li><kbd>Esc</kbd> cierra diálogos y menús desplegables.</li>
            <li>En el visor 3D: arrastre para orbitar, rueda para acercar y clic sobre una celda para seleccionarla.</li>
            <li>Los cambios se guardan automáticamente en el navegador; el indicador superior muestra la última escritura.</li>
            <li>Use Configuración para exportar un respaldo JSON antes de limpiar los datos del navegador.</li>
          </ul>
        </div>

        <div className="report-signature-line">
          <strong>{BRAND.company}</strong>
          <span>{BRAND.descriptor}</span>
          <span>Versión {BRAND.version} · Motor {BRAND.engine}</span>
        </div>
      </div>
    </Modal>
  );
}
