"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Copy, Info, Minus, Plus, Search, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("panel", className)}>
      {title || actions ? (
        <div className="panel-head">
          <div className="min-w-0">
            {eyebrow ? <div className="panel-eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {description ? <p className="panel-description">{description}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(flush ? "panel-body panel-body-flush" : "panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <div>
        <h3>{title}</h3>
        {hint ? <p>{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Kpi({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "default" | "leaf" | "amber" | "danger" | "blue";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("kpi", `kpi-${tone}`, className)}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon ? <span className="kpi-icon">{icon}</span> : null}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value">{value}</span>
        {unit ? <span className="kpi-unit">{unit}</span> : null}
      </div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </div>
  );
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("kpi-grid", className)}>{children}</div>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("divider", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Buttons & badges                                                            */
/* -------------------------------------------------------------------------- */

export function Btn({
  children,
  variant = "secondary",
  size = "md",
  className,
  icon,
  iconRight,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  icon?: ReactNode;
  iconRight?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("btn", `btn-${variant}`, `btn-${size}`, className)}
      {...props}
    >
      {icon ? <span className="btn-icon">{icon}</span> : null}
      {children ? <span className="btn-label">{children}</span> : null}
      {iconRight ? <span className="btn-icon">{iconRight}</span> : null}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "leaf" | "amber" | "red" | "blue" | "outline";
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge-${tone}`, className)}>
      {dot ? <span className="badge-dot" /> : null}
      {children}
    </span>
  );
}

export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="source-tag">{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* Form controls                                                               */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  children,
  className,
  required,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label className={cn("field", className)} htmlFor={htmlFor}>
      <span className="field-label">
        {label}
        {required ? <span className="field-required">*</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function parseDraft(raw: string): number | null {
  const clean = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (clean === "" || clean === "-" || clean === ".") return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function displayDraft(value: number, step: number): string {
  if (!Number.isFinite(value)) return "";
  if (step >= 1) return String(Math.round(value * 1e6) / 1e6).replace(".", ",");
  const decimals = Math.min(6, Math.max(1, Math.ceil(-Math.log10(step))));
  return value.toFixed(decimals).replace(/\.?0+$/, "").replace(".", ",");
}

export function NumberField({
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  disabled,
  placeholder,
  className,
  inputClassName,
  compact,
  ariaLabel,
  onCommit,
}: {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  ariaLabel?: string;
  onCommit?: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => displayDraft(value, step));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(displayDraft(value, step));
      setInvalid(false);
    }
  }, [value, step, focused]);

  const commit = (raw: string) => {
    const parsed = parseDraft(raw);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setInvalid(false);
    setDraft(displayDraft(next, step));
    onChange(next);
    onCommit?.(next);
  };

  const nudge = (direction: -1 | 1) => {
    const base = parseDraft(draft) ?? value;
    let next = base + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(Number(next.toFixed(8)));
    setDraft(displayDraft(next, step));
    setInvalid(false);
  };

  return (
    <div className={cn("number-field", compact && "number-field-compact", invalid && "is-invalid", disabled && "is-disabled", className)}>
      <input
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={cn("input number-input", inputClassName)}
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onBlur={(event) => {
          setFocused(false);
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit((event.target as HTMLInputElement).value);
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            setDraft(displayDraft(value, step));
            setInvalid(false);
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      {unit ? <span className="number-unit">{unit}</span> : null}
      {!compact ? (
        <span className="number-steppers">
          <button type="button" tabIndex={-1} aria-label="Disminuir" onClick={() => nudge(-1)} disabled={disabled}>
            <Minus size={11} strokeWidth={2} />
          </button>
          <button type="button" tabIndex={-1} aria-label="Aumentar" onClick={() => nudge(1)} disabled={disabled}>
            <Plus size={11} strokeWidth={2} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
  digits,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  hint?: string;
  digits?: number;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="range-field">
      <div className="range-head">
        <span className="field-label">{label}</span>
        <span className="range-value">
          {digits !== undefined ? value.toFixed(digits).replace(".", ",") : value.toLocaleString("es-PE")} {unit}
        </span>
      </div>
      <input
        aria-label={label}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ background: `linear-gradient(to right, var(--leaf-500) 0%, var(--leaf-500) ${pct}%, rgba(255,255,255,0.09) ${pct}%, rgba(255,255,255,0.09) 100%)` }}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  ariaLabel?: string;
}) {
  return (
    <div className={cn("select-wrap", className)}>
      <select
        aria-label={ariaLabel}
        className="input select-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="select-chevron" size={14} />
    </div>
  );
}

export function TextField({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input className={cn("input", className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return <textarea className={cn("input textarea", className)} {...props} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  compact,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const content = (
    <>
      <span className={cn("switch", checked && "is-on", compact && "switch-compact")} aria-hidden="true">
        <span className="switch-knob" />
      </span>
      {label ? (
        <span className="switch-text">
          <span>{label}</span>
          {description ? <small>{description}</small> : null}
        </span>
      ) : null}
    </>
  );
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label ?? "Alternar"}
      disabled={disabled}
      className={cn("toggle", disabled && "is-disabled")}
      onClick={() => onChange(!checked)}
    >
      {content}
    </button>
  );
}

export function CheckOption({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button type="button" className={cn("check-option", checked && "is-checked")} onClick={() => onChange(!checked)}>
      <span className={cn("check-box", checked && "is-checked")}>{checked ? <Check size={12} strokeWidth={3} /> : null}</span>
      <span>
        <span className="check-label">{label}</span>
        {description ? <span className="check-description">{description}</span> : null}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("segmented", size === "sm" && "segmented-sm", className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn("segmented-item", value === option.value && "is-active")}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("search-wrap", className)}>
      <Search size={14} className="search-icon" />
      <input
        className="input search-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
      />
      {value ? (
        <button type="button" className="search-clear" onClick={() => onChange("")} aria-label="Limpiar búsqueda">
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                                */
/* -------------------------------------------------------------------------- */

export interface TableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  maxHeight,
  dense,
  empty = "Sin datos.",
  activeKey,
  footer,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  maxHeight?: number;
  dense?: boolean;
  empty?: string;
  activeKey?: string | null;
  footer?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="table-empty">{empty}</div>;
  }
  return (
    <div className="table-wrap" style={maxHeight ? { maxHeight } : undefined}>
      <table className={cn("data-table", dense && "data-table-dense")}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width, textAlign: column.align }} className={column.className}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = rowKey(row, index);
            return (
              <tr
                key={key}
                className={cn(onRowClick && "is-clickable", activeKey === key && "is-active")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }} className={column.className}>
                    {column.render ? column.render(row, index) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "leaf",
  height = 6,
  label,
  showValue,
}: {
  value: number;
  max?: number;
  tone?: "leaf" | "amber" | "danger" | "blue" | "neutral";
  height?: number;
  label?: string;
  showValue?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="progress-block">
      {label || showValue ? (
        <div className="progress-head">
          <span>{label}</span>
          {showValue ? <span>{pct.toFixed(1).replace(".", ",")} %</span> : null}
        </div>
      ) : null}
      <div className={cn("progress", `progress-${tone}`)} style={{ height }}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "warn" | "danger" | "success" | "neutral";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const icons = {
    info: <Info size={15} />,
    warn: <AlertTriangle size={15} />,
    danger: <XCircle size={15} />,
    success: <CheckCircle2 size={15} />,
    neutral: <Info size={15} />,
  };
  return (
    <div className={cn("callout", `callout-${tone}`)}>
      <div className="callout-icon">{icons[tone]}</div>
      <div className="callout-body">
        <strong>{title}</strong>
        {children ? <div className="callout-text">{children}</div> : null}
      </div>
      {action ? <div className="callout-action">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={item.label} className="legend-item">
          <i style={{ background: item.color, borderStyle: item.dashed ? "dashed" : "solid" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const pushToast = useStore((s) => s.pushToast);
  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          pushToast({ kind: "ok", title: "Copiado", detail: "Texto copiado al portapapeles." });
        } catch {
          pushToast({ kind: "error", title: "No se pudo copiar", detail: "El navegador bloqueó el portapapeles." });
        }
      }}
      title={label}
      aria-label={label}
    >
      <Copy size={12} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  eyebrow,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  eyebrow?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="modal-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="modal-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className={cn("modal", `modal-${size}`)}>
        <div className="modal-head">
          <div>
            {eyebrow ? <div className="panel-eyebrow">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "danger",
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Btn>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs & disclosure                                                           */
/* -------------------------------------------------------------------------- */

const TabsContext = createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <TabsContext.Provider value={{ value, setValue: onChange }}>
      <div className={cn("tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children }: { children: ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ctx?.value === value}
      className={cn("tab", ctx?.value === value && "is-active")}
      onClick={() => ctx?.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className="tab-panel">{children}</div>;
}

export function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("accordion", open && "is-open")}>
      <button type="button" className="accordion-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <div>
          <span className="accordion-title">{title}</span>
          {subtitle ? <span className="accordion-subtitle">{subtitle}</span> : null}
        </div>
        <div className="accordion-right">
          {right}
          <ChevronDown size={15} className="accordion-chevron" />
        </div>
      </button>
      {open ? <div className="accordion-body" id={id}>{children}</div> : null}
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <div className="formula">{children}</div>;
}

export function InlineStat({ label, value, tone }: { label: string; value: string; tone?: "leaf" | "amber" | "danger" }) {
  return (
    <div className="inline-stat">
      <span>{label}</span>
      <strong className={tone ? `text-${tone}` : undefined}>{value}</strong>
    </div>
  );
}

export function StatusPill({ status }: { status: "ok" | "alerta" | "sin-datos" }) {
  const map = {
    ok: { tone: "leaf" as const, label: "Operativo" },
    alerta: { tone: "amber" as const, label: "Alerta" },
    "sin-datos": { tone: "neutral" as const, label: "Sin datos" },
  };
  return <Badge tone={map[status].tone} dot>{map[status].label}</Badge>;
}
