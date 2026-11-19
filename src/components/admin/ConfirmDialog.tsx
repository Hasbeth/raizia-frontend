"use client";

import { useId, useState } from "react";
import { Dialog } from "./Dialog";
import { errorMessage } from "./api";

export function ConfirmDialog({ title, description, onConfirm, onClose }: {
  title: string; description: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try { await onConfirm(); onClose(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return (
    <Dialog title={title} titleId={id} descriptionId={`${id}-description`} onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-7">
        <p id={`${id}-description`} className="break-words leading-relaxed text-muted">{description}</p>
        <div aria-live="polite">{error && <p className="notice notice-error" role="alert">{error}</p>}</div>
        <div className="flex flex-wrap justify-end gap-3">
          <button autoFocus type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={confirm}>{busy ? "Eliminando…" : "Eliminar"}</button>
        </div>
      </div>
    </Dialog>
  );
}
