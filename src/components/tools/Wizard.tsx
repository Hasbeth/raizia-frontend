"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Download,
  LoaderCircle,
  MessagesSquare,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import { TOOLS, validateTool, type Field, type ToolData } from "@/lib/tools-config";

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string | string[];
  error?: string;
  onChange: (v: string | string[]) => void;
}) {
  const id = `campo-${field.name}`;
  const describedBy = [field.hint ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  const common = {
    id,
    name: field.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: `input ${error ? "!border-[#c0503f] !shadow-[0_0_0_3px_#fbeeeb]" : ""}`,
  };

  if (field.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="sm:col-span-2" aria-describedby={describedBy || undefined}>
        <legend className="label">
          {field.label}
          {field.required && <span className="text-clay"> *</span>}
        </legend>
        <div className="mt-1 grid gap-2">
          {field.options!.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[0.9375rem] leading-snug transition-colors ${
                  checked ? "border-forest-600 bg-forest-50" : "border-line-strong bg-paper hover:border-forest-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter((x) => x !== opt) : [...selected, opt])}
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-forest-700"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-2 text-sm font-medium text-[#9b2c1f]">
            {error}
          </p>
        )}
      </fieldset>
    );
  }

  const text = typeof value === "string" ? value : "";
  return (
    <div className={field.half ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="label">
        {field.label}
        {field.required ? (
          <span className="text-clay"> *</span>
        ) : (
          <span className="font-normal text-faint"> · opcional</span>
        )}
      </label>
      {field.type === "textarea" ? (
        <textarea {...common} rows={field.rows || 4} value={text} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <select {...common} value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecciona una opción</option>
          {field.options!.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.type}
          value={text}
          placeholder={field.placeholder}
          autoComplete={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "off"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.hint && (
        <p id={`${id}-ayuda`} className="hint">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-[#9b2c1f]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Wizard({ kind, onSwitch }: { kind: string; onSwitch?: () => void }) {
  const config = TOOLS[kind];
  const storageKey = `raizia.borrador.${kind}`;
  const total = config.steps.length + 1; // + revisión
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ToolData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loaded = useRef(false);

  // El borrador se conserva solo en esta pestaña, por si la página se recarga.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
          setData(JSON.parse(raw));
        } else {
          // Si la persona ya indicó su comunidad en el asistente, se propone aquí (puede cambiarla).
          const perfil = JSON.parse(window.localStorage.getItem("raizia.perfil.v1") || "null");
          const comunidad = [perfil?.community, perfil?.territory].filter(Boolean).join(", ");
          if (comunidad) setData({ comunidad });
        }
      } catch {
        /* sin almacenamiento */
      }
      loaded.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* sin almacenamiento */
    }
  }, [data, storageKey]);

  const goTo = (n: number) => {
    setStep(n);
    setState("idle");
    window.requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const next = () => {
    const current = config.steps[step];
    const found = validateTool(config, data, current.id);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`campo-${first}`)?.focus();
      return;
    }
    goTo(step + 1);
  };

  const generate = async () => {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/tools/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...Object.fromEntries(config.confirmations.map((c) => [c.name, confirmed[c.name] ? "si" : ""])),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "No fue posible generar el documento.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setState("done");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "No fue posible generar el documento.");
    }
  };

  const restart = () => {
    setData({});
    setConfirmed({});
    setErrors({});
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      /* sin almacenamiento */
    }
    goTo(0);
  };

  const isReview = step === config.steps.length;
  const current = config.steps[step];
  const allConfirmed = config.confirmations.every((c) => confirmed[c.name]);
  const labels = [...config.steps.map((s) => s.title), "Revisa y descarga"];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/herramientas" className="btn btn-ghost btn-sm -ml-3 text-muted">
        <ArrowLeft size={16} />
        Herramientas
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">{config.name}</p>
        {onSwitch && (
          <button type="button" onClick={onSwitch} className="btn btn-secondary btn-sm">
            <MessagesSquare size={15} />
            Prefiero que me pregunten
          </button>
        )}
      </div>

      {/* Progreso */}
      <div className="mt-4" aria-hidden="true">
        <div className="flex gap-1.5">
          {labels.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-forest-500" : i === step ? "bg-forest-700" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted" role="status">
        Paso {step + 1} de {total}
      </p>

      <div key={step} className="animate-rise">
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl text-forest-900 outline-none md:text-4xl">
          {isReview ? "Revisa y descarga" : current.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          {isReview
            ? "Comprueba que todo esté correcto. Puedes volver a cualquier paso para corregirlo."
            : current.intro}
        </p>

        {!isReview ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="mt-8"
          >
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              {current.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={data[f.name] ?? (f.type === "checkboxes" ? [] : "")}
                  error={errors[f.name]}
                  onChange={(v) => {
                    setData((d) => ({ ...d, [f.name]: v }));
                    if (errors[f.name]) {
                      setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== f.name)));
                    }
                  }}
                />
              ))}
            </div>
            <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
              <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} className="btn btn-secondary">
                <ArrowLeft size={16} />
                Atrás
              </button>
              <button type="submit" className="btn btn-primary">
                {step === config.steps.length - 1 ? "Revisar" : "Continuar"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8">
            <div className="card divide-y divide-line">
              {config.steps.map((s, i) => (
                <section key={s.id} className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-sans text-base font-semibold tracking-normal text-forest-900">{s.title}</h2>
                    <button type="button" onClick={() => goTo(i)} className="btn btn-ghost btn-sm -mt-1.5 -mr-2 shrink-0">
                      <Pencil size={14} />
                      Editar
                    </button>
                  </div>
                  <dl className="mt-3 space-y-3 text-[0.9375rem]">
                    {s.fields.map((f) => {
                      const v = data[f.name];
                      const shown = Array.isArray(v) ? v : String(v ?? "").trim();
                      if (!shown || (Array.isArray(shown) && !shown.length)) return null;
                      return (
                        <div key={f.name}>
                          <dt className="text-xs font-semibold tracking-wide text-faint uppercase">{f.label}</dt>
                          <dd className="mt-0.5 leading-relaxed whitespace-pre-line text-ink">
                            {Array.isArray(shown) ? (
                              <ul className="list-disc pl-5 marker:text-clay">
                                {shown.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            ) : (
                              shown
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </div>

            <div className="notice mt-6">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Antes de descargar, ten presente:</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  {config.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {config.confirmations.map((c) => (
                <label
                  key={c.name}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-[0.9375rem] leading-snug transition-colors ${
                    confirmed[c.name] ? "border-forest-600 bg-forest-50" : "border-line-strong bg-paper"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!confirmed[c.name]}
                    onChange={(e) => setConfirmed((x) => ({ ...x, [c.name]: e.target.checked }))}
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-forest-700"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            <div aria-live="polite">
              {state === "error" && (
                <div className="notice notice-error mt-5" role="alert">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <p>{message}</p>
                </div>
              )}
              {state === "done" && (
                <div className="notice notice-info mt-5">
                  <CircleCheck size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Tu documento se descargó en formato Word.</p>
                    <p className="mt-1">
                      Ábrelo, revísalo y ajústalo. Si no lo encuentras, mira en la carpeta de
                      descargas o vuelve a generarlo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <button type="button" onClick={() => goTo(step - 1)} className="btn btn-secondary">
                <ArrowLeft size={16} />
                Atrás
              </button>
              <div className="flex flex-wrap gap-2.5">
                {state === "done" && (
                  <button type="button" onClick={restart} className="btn btn-ghost">
                    Empezar otro
                  </button>
                )}
                <button
                  type="button"
                  onClick={generate}
                  disabled={!allConfirmed || state === "loading"}
                  className="btn btn-accent"
                >
                  {state === "loading" ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : state === "done" ? (
                    <Check size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  {state === "loading" ? "Generando…" : state === "done" ? "Descargar de nuevo" : "Generar documento Word"}
                </button>
              </div>
            </div>
            {!allConfirmed && (
              <p className="mt-3 text-right text-sm text-muted">
                Marca las casillas de confirmación para habilitar la descarga.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
