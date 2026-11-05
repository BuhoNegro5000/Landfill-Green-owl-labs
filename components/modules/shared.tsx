"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Info, MinusCircle } from "lucide-react";
import type { DataQuality } from "@/lib/types";
import type { Issue as ModelIssue } from "@/lib/engine/validation";
import { useStore } from "@/lib/store";
import { useModel } from "@/components/ModelProvider";
import { DATA_QUALITY_LABEL } from "@/lib/siteFields";
import { Badge, Btn, Field, NumberField, SelectField, cn } from "@/components/ui";

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function FormGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return <div className={cn("form-grid", `form-grid-${columns}`, className)}>{children}</div>;
}

export function PanelGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return <div className={cn("panel-grid", `panel-grid-${columns}`, className)}>{children}</div>;
}

export function Stack({ children, gap = 12, className }: { children: ReactNode; gap?: number; className?: string }) {
  return (
    <div className={cn("stack", className)} style={{ gap }}>
      {children}
    </div>
  );
}

export function MiniStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

export function InlineNote({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "leaf" | "amber" | "danger" }) {
  return <div className={cn("inline-note", `inline-note-${tone}`)}>{children}</div>;
}

/* -------------------------------------------------------------------------- */
/* Data quality                                                                */
/* -------------------------------------------------------------------------- */

const QUALITY_TONE: Record<DataQuality, "leaf" | "blue" | "amber" | "red" | "neutral"> = {
  measured: "leaf",
  estimated: "blue",
  assumed: "amber",
  missing: "red",
};

export function QualityBadge({ quality }: { quality: DataQuality }) {
  return <Badge tone={QUALITY_TONE[quality]}>{DATA_QUALITY_LABEL[quality]}</Badge>;
}

export function DataQualitySelect({
  value,
  onChange,
  label,
}: {
  value: DataQuality;
  onChange: (quality: DataQuality) => void;
  label: string;
}) {
  return (
    <SelectField
      ariaLabel={`Calidad del dato: ${label}`}
      value={value}
      onChange={(next) => onChange(next as DataQuality)}
      options={[
        { value: "measured", label: "Medido" },
        { value: "estimated", label: "Estimado" },
        { value: "assumed", label: "Supuesto" },
        { value: "missing", label: "Faltante" },
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Numeric helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Permeability is entered as a base-10 exponent because mm-scale inputs cannot show 1e-9. */
export function LogField({
  label,
  value,
  onChange,
  min = -15,
  max = -2,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  const exponent = value > 0 && Number.isFinite(value) ? Math.log10(value) : min;
  return (
    <Field
      label={label}
      hint={hint ?? `Valor actual: ${value > 0 ? value.toExponential(2) : "sin dato"} m/s. Se edita como exponente de base 10.`}
    >
      <div className="log-field">
        <span className="log-prefix">1 × 10</span>
        <NumberField
          ariaLabel={`${label}: exponente en base 10`}
          value={Number(exponent.toFixed(2))}
          onChange={(next) => onChange(10 ** Math.min(max, Math.max(min, next)))}
          min={min}
          max={max}
          step={0.1}
          unit="m/s"
        />
      </div>
    </Field>
  );
}

export function OptionalNumberField({
  label,
  value,
  onChange,
  unit,
  placeholder = "Sin dato",
  hint,
  min,
  max,
  step = 0.0001,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    const clean = raw.trim().replace(/\s/g, "").replace(",", ".");
    if (!clean) {
      onChange(null);
      return;
    }
    const parsed = Number(clean);
    if (!Number.isFinite(parsed)) {
      setDraft(value === null ? "" : String(value));
      return;
    }
    onChange(Math.min(max ?? parsed, Math.max(min ?? parsed, parsed)));
  };

  return (
    <Field label={label} hint={hint}>
      <div className="number-field">
        <input
          className="input number-input"
          inputMode="decimal"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit((event.target as HTMLInputElement).value);
            }
          }}
        />
        {unit ? <span className="number-unit">{unit}</span> : null}
        <button
          type="button"
          className="number-clear"
          title="Borrar dato"
          aria-label="Borrar dato"
          onClick={() => {
            setDraft("");
            onChange(null);
          }}
        >
          <MinusCircle size={12} />
        </button>
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const SEVERITY_ICON = {
  error: <AlertTriangle size={14} />,
  warning: <AlertTriangle size={14} />,
  info: <Info size={14} />,
};

const SEVERITY_LABEL = { error: "Error", warning: "Advertencia", info: "Información" } as const;
const SEVERITY_TONE = { error: "red", warning: "amber", info: "blue" } as const;

export function IssueList({
  issues,
  limit,
  compact,
  emptyMessage = "Sin hallazgos de validación.",
}: {
  issues: ModelIssue[];
  limit?: number;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const shown = typeof limit === "number" ? issues.slice(0, limit) : issues;
  if (!shown.length) {
    return (
      <div className="issue-empty">
        <CheckCircle2 size={16} />
        <span>{emptyMessage}</span>
      </div>
    );
  }
  return (
    <ul className={cn("issue-list", compact && "is-compact")}>
      {shown.map((issue) => (
        <li key={issue.id} className={cn("issue-item", `is-${issue.severity}`)}>
          <span className="issue-icon">{SEVERITY_ICON[issue.severity]}</span>
          <div className="issue-copy">
            <div className="issue-head">
              <strong>{issue.title}</strong>
              <Badge tone={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
            </div>
            <p>{issue.detail}</p>
            <div className="issue-meta">
              <span>{issue.module}</span>
              {issue.reference ? <span>{issue.reference}</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IssueSummary({ issues }: { issues: ModelIssue[] }) {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;
  return (
    <div className="issue-summary">
      <span className="issue-count is-error">{errors} error(es)</span>
      <span className="issue-count is-warning">{warnings} advertencia(s)</span>
      <span className="issue-count is-info">{info} información</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Waste composition                                                           */
/* -------------------------------------------------------------------------- */

const COMPOSITION_KEYS = [
  { key: "organic", label: "Orgánico" },
  { key: "paper", label: "Papel y cartón" },
  { key: "plastic", label: "Plásticos" },
  { key: "glass", label: "Vidrio" },
  { key: "metal", label: "Metales" },
  { key: "other", label: "Otros" },
] as const;

export function CompositionEditor() {
  const { model } = useModel();
  const update = useStore((s) => s.updateScenarioParams);
  const composition = model.params.waste.composition;
  const total = COMPOSITION_KEYS.reduce((sum, item) => sum + composition[item.key], 0);
  const valid = Math.abs(total - 100) < 0.5;

  return (
    <div className="composition-editor">
      <FormGrid columns={3}>
        {COMPOSITION_KEYS.map((item) => (
          <Field key={item.key} label={item.label}>
            <NumberField
              value={composition[item.key]}
              min={0}
              max={100}
              step={0.5}
              unit="%"
              onChange={(value) =>
                update((draft) => {
                  draft.waste.composition[item.key] = value;
                })
              }
            />
          </Field>
        ))}
      </FormGrid>
      <div className={cn("composition-total", valid ? "is-ok" : "is-bad")}>
        <span>Suma de fracciones</span>
        <strong>{total.toFixed(1).replace(".", ",")} %</strong>
        <span>{valid ? "Composición válida" : "Debe sumar 100 % (±0,5)"}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function ToggleLine({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle-line">
      <div>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn("switch", checked && "is-on")}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function FormulaHint({ children }: { children: ReactNode }) {
  return (
    <div className="formula-hint">
      <CircleHelp size={13} />
      <span>{children}</span>
    </div>
  );
}

export function ExportButton({
  label = "Exportar CSV",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Btn variant="outline" size="sm" onClick={onClick}>
      {label}
    </Btn>
  );
}

export function Reference({ children }: { children: ReactNode }) {
  return <span className="source-tag">{children}</span>;
}

