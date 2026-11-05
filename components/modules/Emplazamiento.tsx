"use client";

import { Building2, ClipboardCheck, Droplets, Gauge, MapPin, Mountain, Ruler, Wind } from "lucide-react";
import { useModel } from "@/components/ModelProvider";
import { useActiveProject, useStore } from "@/lib/store";
import { SITE_FIELDS } from "@/lib/siteFields";
import { SITE_EXCLUSIONS, siteCriterionStatusLabel } from "@/lib/siteSelection";
import type { SiteCriterionResult, SiteExclusionResult } from "@/lib/siteSelection";
import type { FacilityType, SiteExclusions, SiteSelectionData } from "@/lib/types";
import {
  Badge,
  Btn,
  Callout,
  DataTable,
  Field,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  Panel,
  ProgressBar,
  SelectField,
  TextArea,
  TextField,
  type TableColumn,
} from "@/components/ui";
import { fmt, fmtPct } from "@/lib/format";
import { DataQualitySelect, FormGrid, IssueList, LogField, OptionalNumberField, QualityBadge } from "./shared";

const FACILITY_OPTIONS: { value: FacilityType; label: string }[] = [
  { value: "relleno-sanitario", label: "Relleno sanitario" },
  { value: "relleno-mecanizado", label: "Relleno mecanizado" },
  { value: "celda-transitoria", label: "Celda transitoria" },
  { value: "planta-integral", label: "Planta integral de residuos" },
];

const GROUPS = [
  { id: "físico", label: "Datos físicos" },
  { id: "hidrogeológico", label: "Hidrogeología y aguas" },
  { id: "climático", label: "Clima y balance hídrico" },
  { id: "territorial", label: "Territorio y entorno" },
] as const;

export default function Emplazamiento() {
  const { model } = useModel();
  const project = useActiveProject();
  const updateProjectMeta = useStore((s) => s.updateProjectMeta);
  const updateSite = useStore((s) => s.updateSite);
  const setModule = useStore((s) => s.setModule);
  const site = model.params.site;
  const completeness = model.completeness;
  const issues = model.issues.filter((i) => i.module === "site");
  const selection = site.siteSelection ?? {};
  const assessment = model.siteSelection;

  const updateSelection = (patch: Partial<SiteSelectionData>) =>
    updateSite({ siteSelection: { ...selection, ...patch } });

  const setExclusion = (key: keyof SiteExclusions, raw: string) => {
    const value = raw === "si" ? true : raw === "no" ? false : undefined;
    updateSite({
      siteSelection: {
        ...selection,
        exclusions: { ...(selection.exclusions ?? {}), [key]: value },
      },
    });
  };

  const statusTone = (status: string) =>
    status === "cumple" ? "leaf" : status === "observado" ? "amber" : status === "no-cumple" ? "red" : "neutral";

  const criterionColumns: TableColumn<SiteCriterionResult>[] = [
    { key: "label", label: "Criterio" },
    { key: "requirement", label: "Referencia" },
    { key: "displayValue", label: "Valor declarado", align: "right" },
    {
      key: "status",
      label: "Estado",
      align: "center",
      render: (row) => <Badge tone={statusTone(row.status)}>{siteCriterionStatusLabel(row.status)}</Badge>,
    },
    { key: "source", label: "Fuente", className: "cell-muted" },
  ];

  const exclusionColumns: TableColumn<SiteExclusionResult>[] = [
    { key: "label", label: "Exclusión" },
    {
      key: "status",
      label: "Estado",
      align: "center",
      render: (row) => <Badge tone={statusTone(row.status)}>{siteCriterionStatusLabel(row.status)}</Badge>,
    },
    { key: "source", label: "Fuente", className: "cell-muted" },
  ];

  const setQuality = (key: string, value: string) =>
    updateSite({ dataQuality: { ...site.dataQuality, [key]: value as typeof site.dataQuality[string] } });

  return (
    <div className="module-stack">
      <PageHeader
        eyebrow="Módulo 01 · Sítio"
        title="Emplazamiento y calidad del dato"
        description="Registre los datos físicos, hidrogeológicos, climáticos y territoriales. Cada campo tiene una calidad declarada; la completitud no equivale a aptitud del sitio."
        actions={
          <>
            <Btn variant="secondary" onClick={() => setModule("modelo")}>Ver en 3D</Btn>
            <Btn variant="primary" onClick={() => setModule("celdas")}>Continuar a celdas</Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi
          label="Completitud declarada"
          value={fmtPct(completeness.pct, 0)}
          hint={`${completeness.total - completeness.missing}/${completeness.total} campos con algún dato`}
          tone={completeness.pct >= 70 ? "leaf" : completeness.pct >= 40 ? "amber" : "danger"}
          icon={<ClipboardCheck size={15} />}
        />
        <Kpi label="Datos medidos" value={String(completeness.measured)} hint={`${completeness.estimated} estimados · ${completeness.assumed} supuestos`} tone="blue" />
        <Kpi label="Datos faltantes" value={String(completeness.missing)} hint={completeness.missingLabels.slice(0, 2).join(", ") || "Sin faltantes"} tone={completeness.missing ? "amber" : "leaf"} />
        <Kpi label="Separación al freático" value={fmt(Math.min(...model.geometry.cells.map((c) => c.baseElevationM)) - (model.params.geometry.terrainBaseElevationM - site.waterTableDepthM), 1)} unit="m" hint="Fondo de celda más bajo vs. nivel freático" tone="leaf" icon={<Droplets size={15} />} />
        <Kpi
          label="Verificación de localización"
          value={fmtPct(assessment.compliancePct, 0)}
          hint={`${assessment.counts.cumple} cumplen · ${assessment.counts.observado} observados · ${assessment.counts["sin-dato"]} sin dato`}
          tone={assessment.status === "no-apto" ? "danger" : assessment.status === "observado" ? "amber" : assessment.status === "incompleto" ? "amber" : "leaf"}
          icon={<MapPin size={15} />}
        />
        <Kpi
          label="Restricciones detectadas"
          value={String(assessment.hardStops)}
          hint={assessment.statusLabel}
          tone={assessment.hardStops > 0 ? "danger" : "leaf"}
        />
      </KpiGrid>

      <Panel title="Identificación del proyecto" eyebrow="Metadatos" description="Estos datos aparecen en el informe PDF. Los cambios de país, región y ubicación se sincronizan con el emplazamiento.">
        <FormGrid columns={2}>
          <Field label="Nombre del proyecto" required>
            <TextField value={project.name} onChange={(e) => updateProjectMeta({ name: e.target.value })} />
          </Field>
          <Field label="Descriptor">
            <TextField value={project.descriptor ?? ""} onChange={(e) => updateProjectMeta({ descriptor: e.target.value })} />
          </Field>
          <Field label="País" required>
            <TextField value={project.country} onChange={(e) => updateProjectMeta({ country: e.target.value })} />
          </Field>
          <Field label="Región / departamento" required>
            <TextField value={project.region} onChange={(e) => updateProjectMeta({ region: e.target.value })} />
          </Field>
          <Field label="Ubicación del emplazamiento" required>
            <TextField value={project.location} onChange={(e) => updateProjectMeta({ location: e.target.value })} />
          </Field>
          <Field label="Responsable técnico">
            <TextField value={project.responsible} onChange={(e) => updateProjectMeta({ responsible: e.target.value })} />
          </Field>
          <OptionalNumberField label="Latitud" value={project.latitude} onChange={(value) => updateProjectMeta({ latitude: value })} unit="°" min={-90} max={90} />
          <OptionalNumberField label="Longitud" value={project.longitude} onChange={(value) => updateProjectMeta({ longitude: value })} unit="°" min={-180} max={180} />
          <Field label="Versión del documento">
            <TextField value={project.version} onChange={(e) => updateProjectMeta({ version: e.target.value })} />
          </Field>
          <Field label="Referencia normativa declarada" hint="Texto libre. Las normas no verificadas se mantienen explícitamente como pendientes.">
            <TextField value={project.regulationRef} onChange={(e) => updateProjectMeta({ regulationRef: e.target.value })} />
          </Field>
          <Field label="Sistema de unidades" hint="El motor calcula siempre en SI. La selección imperial es solo de presentación y no convierte todos los campos todavía.">
            <SelectField
              value={project.unitSystem}
              onChange={(value) => updateProjectMeta({ unitSystem: value as typeof project.unitSystem })}
              options={[
                { value: "SI", label: "Sistema Internacional (SI)" },
                { value: "IMPERIAL_DISPLAY", label: "Imperial (solo presentación)" },
              ]}
            />
          </Field>
          <Field label="Tipo de instalación">
            <SelectField
              value={site.facilityType}
              onChange={(value) => updateSite({ facilityType: value as FacilityType })}
              options={FACILITY_OPTIONS}
            />
          </Field>
        </FormGrid>
        <Field label="Notas y alcance" hint="Objetivo, limitaciones conocidas y fuentes de datos.">
          <TextArea value={project.notes} onChange={(e) => updateProjectMeta({ notes: e.target.value })} rows={3} />
        </Field>
      </Panel>

      <Panel title="Datos del sitio" eyebrow="Parámetros del escenario activo" description="Los campos de esta sección pertenecen al escenario seleccionado. Cambie de escenario para evaluar hipótesis distintas.">
        <div className="site-group">
          <div className="site-group-head"><MapPin size={15} /><div><h3>Localización y capacidad territorial</h3><p>Superficie, cota y distancia a cuerpos de agua.</p></div></div>
          <FormGrid columns={3}>
            <Field label="Área disponible" hint="Área total declarada para la implantación.">
              <NumberField value={site.areaHa} onChange={(v) => updateSite({ areaHa: v })} min={0.1} max={2000} step={0.5} unit="ha" />
            </Field>
            <Field label="Cota del terreno">
              <NumberField value={site.elevationMasl} onChange={(v) => updateSite({ elevationMasl: v })} min={-100} max={6000} step={1} unit="m s. n. m." />
            </Field>
            <Field label="Distancia a cuerpo de agua" hint="Distancia horizontal declarada al receptor superficial más cercano.">
              <NumberField value={site.distanceToWaterM} onChange={(v) => updateSite({ distanceToWaterM: v })} min={0} max={50_000} step={10} unit="m" />
            </Field>
            <Field label="Uso de suelo">
              <TextField value={site.landUse} onChange={(e) => updateSite({ landUse: e.target.value })} />
            </Field>
            <Field label="Accesos">
              <TextField value={site.access} onChange={(e) => updateSite({ access: e.target.value })} />
            </Field>
            <Field label="Áreas sensibles">
              <TextField value={site.sensitiveAreas} onChange={(e) => updateSite({ sensitiveAreas: e.target.value })} />
            </Field>
          </FormGrid>
        </div>

        <div className="site-group">
          <div className="site-group-head"><Mountain size={15} /><div><h3>Geología e hidrogeología</h3><p>El nivel freático y la permeabilidad condicionan la barrera y la separación mínima.</p></div></div>
          <FormGrid columns={3}>
            <Field label="Geología" className="span-2">
              <TextField value={site.geology} onChange={(e) => updateSite({ geology: e.target.value })} />
            </Field>
            <Field label="Hidrogeología">
              <TextField value={site.hydrogeology} onChange={(e) => updateSite({ hydrogeology: e.target.value })} />
            </Field>
            <Field label="Profundidad al nivel freático" hint="Profundidad al nivel freático más alto registrado.">
              <NumberField value={site.waterTableDepthM} onChange={(v) => updateSite({ waterTableDepthM: v })} min={0} max={300} step={0.5} unit="m" />
            </Field>
            <LogField
              label="Permeabilidad natural del suelo"
              value={site.permeabilityMs}
              onChange={(v) => updateSite({ permeabilityMs: v })}
              min={-14}
              max={-2}
              hint="Valor de campo o estimado. La referencia técnica sugiere ≤ 1×10⁻⁵ cm/s entre fondo y freático."
            />
            <Field label="PGA declarada" hint="Se registra como dato; el análisis pseudo-estático no está implementado.">
              <NumberField value={site.seismicPga} onChange={(v) => updateSite({ seismicPga: v })} min={0} max={2} step={0.01} unit="g" />
            </Field>
            <Field label="Fuente de material de cobertura" className="span-2">
              <TextField value={site.coverMaterialSource} onChange={(e) => updateSite({ coverMaterialSource: e.target.value })} />
            </Field>
            <Field label="Disponibilidad declarada" hint="Volumen de material de cobertura disponible.">
              <NumberField value={site.coverMaterialAvailableM3} onChange={(v) => updateSite({ coverMaterialAvailableM3: v })} min={0} max={10_000_000} step={1000} unit="m³" />
            </Field>
          </FormGrid>
        </div>

        <div className="site-group">
          <div className="site-group-head"><Wind size={15} /><div><h3>Clima y balance hídrico</h3><p>Precipitación, evapotranspiración y escorrentía alimentan el módulo de lixiviados.</p></div></div>
          <FormGrid columns={3}>
            <Field label="Precipitación media anual">
              <NumberField value={site.rainfallMmYr} onChange={(v) => updateSite({ rainfallMmYr: v })} min={0} max={12_000} step={10} unit="mm/año" />
            </Field>
            <Field label="Precipitación máxima mensual">
              <NumberField value={site.maxMonthlyRainfallMm} onChange={(v) => updateSite({ maxMonthlyRainfallMm: v })} min={0} max={3000} step={5} unit="mm/mes" />
            </Field>
            <Field label="Precipitación máxima diaria">
              <NumberField value={site.maxDailyRainfallMm} onChange={(v) => updateSite({ maxDailyRainfallMm: v })} min={0} max={1000} step={1} unit="mm/día" />
            </Field>
            <Field label="Evapotranspiración anual">
              <NumberField value={site.evapotranspirationMmYr} onChange={(v) => updateSite({ evapotranspirationMmYr: v })} min={0} max={5000} step={10} unit="mm/año" />
            </Field>
            <Field label="Coeficiente de escorrentía" hint="Fracción de la lluvia que escurre; 0–1.">
              <NumberField value={site.runoffCoefficient} onChange={(v) => updateSite({ runoffCoefficient: v })} min={0} max={1} step={0.01} />
            </Field>
            <Field label="Riesgos declarados" className="span-2">
              <TextField value={site.risks} onChange={(e) => updateSite({ risks: e.target.value })} />
            </Field>
          </FormGrid>
        </div>
      </Panel>

      <Panel
        title="Verificación de localización"
        eyebrow="R.M. N.° 165-2021-MINAM · Art. 110 del D.S. 014-2017-MINAM"
        description="Matriz declarativa de distancias, pendiente y exclusiones. El resultado es una verificación preliminar: no sustituye el modelamiento SIG, la validación de campo ni el pronunciamiento de la autoridad."
      >
        <div className="quality-summary">
          <div>
            <span className="field-label">Cumplimiento declarado de la matriz</span>
            <ProgressBar
              value={assessment.compliancePct}
              max={100}
              showValue
              tone={assessment.status === "no-apto" ? "danger" : assessment.status === "observado" || assessment.status === "incompleto" ? "amber" : "leaf"}
            />
          </div>
          <div className="quality-tags">
            <Badge tone={statusTone(assessment.status === "no-apto" ? "no-cumple" : assessment.status === "apto-precaucion" ? "cumple" : "observado")}>
              {assessment.statusLabel}
            </Badge>
            <Badge tone="outline">{assessment.criteria.length + assessment.exclusions.length} criterios</Badge>
          </div>
        </div>
        <p className="panel-lede">{assessment.headline}</p>

        <FormGrid columns={3}>
          <OptionalNumberField
            label="Distancia a centros poblados"
            value={selection.distanceToPopulationM ?? null}
            onChange={(value) => updateSelection({ distanceToPopulationM: value })}
            unit="m"
            min={0}
            max={100_000}
            step={50}
            hint="Referencia legal: ≥ 500 m."
          />
          <OptionalNumberField
            label="Distancia a infraestructura existente"
            value={selection.distanceToInfrastructureM ?? null}
            onChange={(value) => updateSelection({ distanceToInfrastructureM: value })}
            unit="m"
            min={0}
            max={100_000}
            step={50}
            hint="Embalses, represas u obras hidroeléctricas: ≥ 500 m."
          />
          <OptionalNumberField
            label="Distancia a áreas agrícolas"
            value={selection.distanceToAgricultureM ?? null}
            onChange={(value) => updateSelection({ distanceToAgricultureM: value })}
            unit="m"
            min={0}
            max={100_000}
            step={50}
            hint="Referencia de la R.M. 165-2021: ≥ 500 m."
          />
          <OptionalNumberField
            label="Distancia a granjas porcinas/avícolas"
            value={selection.distanceToFarmsM ?? null}
            onChange={(value) => updateSelection({ distanceToFarmsM: value })}
            unit="m"
            min={0}
            max={100_000}
            step={100}
            hint="Franja de referencia: 5 000–10 000 m (D.S. 029-2007-AG, art. 52)."
          />
          <OptionalNumberField
            label="Distancia a fallas geológicas"
            value={selection.distanceToFaultsM ?? null}
            onChange={(value) => updateSelection({ distanceToFaultsM: value })}
            unit="m"
            min={0}
            max={100_000}
            step={100}
            hint="Referencia: ≥ 1 000 m."
          />
          <OptionalNumberField
            label="Distancia a aeródromos"
            value={selection.distanceToAirportM ?? null}
            onChange={(value) => updateSelection({ distanceToAirportM: value })}
            unit="m"
            min={0}
            max={200_000}
            step={500}
            hint="Guía MINAM 2019: ≥ 13 000 m. La franja 4–13 km requiere estudio de riesgo operacional."
          />
          <OptionalNumberField
            label="Pendiente predominante"
            value={selection.slopePct ?? null}
            onChange={(value) => updateSelection({ slopePct: value })}
            unit="%"
            min={0}
            max={100}
            step={0.5}
            hint="Criterio técnico: < 25 %, con flexibilidad verificable en campo."
          />
          <Field label="Distancia a agua superficial" hint="Se reutiliza el dato de la sección anterior; referencia ≥ 500 m.">
            <NumberField value={site.distanceToWaterM} onChange={(v) => updateSite({ distanceToWaterM: v })} min={0} max={100_000} step={50} unit="m" />
          </Field>
        </FormGrid>

        <div className="site-group">
          <div className="site-group-head">
            <MapPin size={15} />
            <div>
              <h3>Exclusiones de localización</h3>
              <p>Marque “Sí” solo si el área se superpone con la exclusión. “Sin dato” no equivale a cumplimiento.</p>
            </div>
          </div>
          <FormGrid columns={3}>
            {SITE_EXCLUSIONS.map((exclusion) => {
              const value = selection.exclusions?.[exclusion.id];
              return (
                <Field key={exclusion.id} label={exclusion.label} hint={exclusion.source}>
                  <SelectField
                    ariaLabel={`Exclusión: ${exclusion.label}`}
                    value={value === true ? "si" : value === false ? "no" : ""}
                    onChange={(raw) => setExclusion(exclusion.id, raw)}
                    options={[
                      { value: "", label: "Sin dato" },
                      { value: "no", label: "No se superpone" },
                      { value: "si", label: "Sí (excluye)" },
                    ]}
                  />
                </Field>
              );
            })}
          </FormGrid>
        </div>

        <DataTable
          columns={criterionColumns}
          rows={assessment.criteria}
          rowKey={(row) => row.id}
          dense
          empty="Sin criterios evaluados."
        />

        <div style={{ height: 10 }} />
        <DataTable
          columns={exclusionColumns}
          rows={assessment.exclusions}
          rowKey={(row) => row.id}
          dense
          empty="Sin exclusiones evaluadas."
        />

        <Callout tone="warn" title="Alcance de la verificación">
          {assessment.disclaimer} Las distancias deben provenir de cartografía oficial (INEI, ANA, INGEMMET, SERNANP,
          MINCUL, MIDAGRI) y verificarse en campo. Esta matriz no reemplaza el estudio de selección de área ni el IGA.
        </Callout>
      </Panel>

      <Panel
        title="Calidad del dato por campo"
        eyebrow={`${completeness.measured} medidos · ${completeness.estimated} estimados · ${completeness.assumed} supuestos · ${completeness.missing} faltantes`}
        description="Declare honestamente el origen de cada dato. El informe usa esta matriz y el motor la reporta como completitud."
      >
        <div className="quality-grid">
          {GROUPS.map((group) => (
            <div className="quality-group" key={group.id}>
              <div className="quality-group-head">
                <span>{group.label}</span>
                <Badge tone="outline">{SITE_FIELDS.filter((f) => f.group === group.id).length} campos</Badge>
              </div>
              {SITE_FIELDS.filter((field) => field.group === group.id).map((field) => {
                const quality = (site.dataQuality?.[field.key] ?? "missing") as typeof site.dataQuality[string];
                return (
                  <div className="quality-row" key={field.key}>
                    <div>
                      <strong>{field.label}</strong>
                      <QualityBadge quality={quality} />
                    </div>
                    <DataQualitySelect label={field.label} value={quality} onChange={(next) => setQuality(field.key, next)} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="quality-summary">
          <div>
            <span className="field-label">Completitud ponderada</span>
            <ProgressBar value={completeness.pct} max={100} showValue tone={completeness.pct >= 70 ? "leaf" : "amber"} />
          </div>
          <div className="quality-tags">
            <Badge tone="leaf">Medido = 1,0</Badge>
            <Badge tone="blue">Estimado = 0,6</Badge>
            <Badge tone="amber">Supuesto = 0,3</Badge>
            <Badge tone="red">Faltante = 0</Badge>
          </div>
        </div>
      </Panel>

      <Panel title="Alertas de emplazamiento" eyebrow="Validación del motor" description="Los umbrales son referencias técnicas de las guías citadas, no requisitos legales automáticos.">
        <IssueList issues={issues} emptyMessage="Sin alertas de emplazamiento con los datos actuales." />
        <Callout tone="warn" title="La ausencia de alertas no demuestra aptitud del sitio">
          La validación compara parámetros declarados contra referencias técnicas. No reemplaza estudios de suelos, hidrogeología,
          topografía, evaluación de impacto ambiental ni la revisión de la autoridad competente.
        </Callout>
      </Panel>

      <div className="module-footer-actions">
        <div className="module-footer-meta">
          <Gauge size={14} /> Motor {model.engineVersion} · {fmt(model.params.geometry.footprintAreaM2)} m² de huella modelada
          <Ruler size={14} /> Área declarada {fmt(site.areaHa, 2)} ha
          <Building2 size={14} /> {site.facilityType}
        </div>
        <Btn variant="primary" onClick={() => setModule("celdas")}>Continuar a celdas y capas</Btn>
      </div>
    </div>
  );
}
