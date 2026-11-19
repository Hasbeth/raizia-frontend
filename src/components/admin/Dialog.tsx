"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({ title, titleId, descriptionId, onClose, children, wide = false }: {
  title: string; titleId: string; descriptionId?: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-3xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-forest-950/55 ${wide ? "max-w-3xl max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:rounded-none" : "max-w-lg"}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-paper px-5 py-4 sm:px-7">
        <h2 id={titleId} className="font-display text-xl text-forest-900 sm:text-2xl">{title}</h2>
        <button type="button" className="btn btn-ghost btn-icon shrink-0" aria-label="Cerrar ventana" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>
      {children}
    </dialog>
  );
}
