"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api, errorMessage, jsonRequest } from "./api";

export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", jsonRequest("POST", { password: form.get("password") }));
      router.refresh();
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  }
  return (
    <section className="card mx-auto w-full max-w-md p-6 shadow-soft sm:p-9" aria-labelledby="login-title">
      <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700"><LockKeyhole size={23} aria-hidden="true" /></div>
      <p className="eyebrow">Administración</p>
      <h1 id="login-title" className="mt-3 font-display text-3xl text-forest-900">Cuidemos la biblioteca</h1>
      <p className="mt-3 leading-relaxed text-muted">Ingresa para agregar, revisar y organizar los documentos de RAIZIA.</p>
      <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={busy}>
        <div>
          <label className="label" htmlFor="admin-password">Contraseña</label>
          <div className="relative">
            <input id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={busy} className="input pr-14" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
            <button type="button" className="btn btn-ghost btn-icon absolute top-0.5 right-1" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
              {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div aria-live="polite">{error && <p id="login-error" role="alert" className="notice notice-error">{error}</p>}</div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      </form>
      <p className="hint mt-5 text-center">Acceso privado para quienes administran la biblioteca.</p>
    </section>
  );
}
