"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";

const ICONS = {
  ok: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
};

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
            <span className="toast-icon">
              <Icon size={14} />
            </span>
            <div className="toast-body">
              <strong>{toast.title}</strong>
              {toast.detail ? <p>{toast.detail}</p> : null}
            </div>
            <button type="button" className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Cerrar aviso">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
