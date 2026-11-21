"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  CircleCheck,
  Download,
  ListChecks,
  LoaderCircle,
  Pencil,
  SkipForward,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { speak } from "@/lib/speech";
import type { Route } from "@/lib/types";
import { RouteCards } from "./RouteCards";
import {
  askFor,
  ENTITY_REASSURANCE,
  organizeKind,
  suggestEntities,
  TOOLS,
  validateTool,
  type Field,
  type ToolData,
} from "@/lib/tools-config";

type Proposal = { original: string; organized: string };
type Probe = { original: string; questions: string[]; kind: "hechos" | "peticiones" };

function hasValue(v: string | string[] | undefined): boolean {
  return Array.isArray(v) ? v.length > 0 : !!String(v ?? "").trim();
}

function Bot({ children, text }: { children: React.ReactNode; text?: string }) {
  return (
    <div className="animate-rise flex gap-3">
      <LogoMark size={30} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-3xl rounded-tl-lg border border-line bg-paper px-5 py-3.5 text-[1.0625rem] leading-relaxed text-ink">
          {children}
        </div>
        {text && (
          <div>
            <button
              type="button"
              onClick={() => speak(text)}
              className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-forest-700 hover:bg-forest-50"
            >
              <Volume2 size={16} />
              Escuchar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Interview({ kind, onSwitch }: { kind: string; onSwitch?: () => void }) {
  const config = TOOLS[kind];
  const storageKey = `raizia.borrador.${kind}`;
  // La conversación empieza por el relato: es lo más natural y permite orientar después.
  const questions = useMemo(() => {
    const all = config.steps.flatMap((s) => s.fields.map((field) => ({ field, stepId: s.id })));
    return [...all.filter((q) => q.field.name === "hechos"), ...all.filter((q) => q.field.name !== "hechos")];
  }, [config]);

  const [data, setData] = useState<ToolData>({});
  const [idx, setIdx] = useState(0);
  const [resume, setResume] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  // Caminos sugeridos cuando el relato no corresponde a esta herramienta.
  const [redirect, setRedirect] = useState<Route[] | null>(null);
  const triaged = useRef("");
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const story = useRef("");

  const done = idx >= questions.length;
  const current = done ? null : questions[idx];

  /* Borrador de la pestaña, comunidad indicada en el asistente y relato traído del chat. */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let initial: ToolData = {};
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) initial = JSON.parse(raw);
        else {
          const perfil = JSON.parse(window.localStorage.getItem("raizia.perfil.v1") || "null");
          const comunidad = [perfil?.community, perfil?.territory].filter(Boolean).join(", ");
          if (comunidad) initial = { comunidad };
        }
        story.current = window.sessionStorage.getItem("raizia.relato") || "";
        window.sessionStorage.removeItem("raizia.relato");
      } catch {
        /* sin almacenamiento */
      }
      setData(initial);
      // Retoma en la primera pregunta obligatoria sin respuesta.
      const firstPending = questions.findIndex((q) => q.field.required && !hasValue(initial[q.field.name]));
      const start = Object.keys(initial).length > 1 ? (firstPending < 0 ? questions.length : firstPending) : 0;
      setIdx(start);
      setCanSpeak("speechSynthesis" in window);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey, questions]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* sin almacenamiento */
    }
  }, [data, ready, storageKey]);

  /* Al cambiar de pregunta: carga la respuesta previa y enfoca el campo. */
  useEffect(() => {
    if (!ready || !current) return;
    const frame = window.requestAnimationFrame(() => {
      const prev = data[current.field.name];
      setPicked(Array.isArray(prev) ? prev : []);
      setDraft(
        typeof prev === "string" && prev
          ? prev
          : current.field.name === "hechos" && story.current
            ? story.current
            : "",
      );
      setError("");
      setProposal(null);
      setProbe(null);
      inputRef.current?.focus({ preventScroll: true });
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
    // Solo debe ejecutarse al cambiar de pregunta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ready]);

  useEffect(() => {
    if (proposal || probe || redirect || done) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [proposal, probe, redirect, done, state]);

  const advance = (next: ToolData) => {
    const q = questions[idx];
    const lastOfStep = idx === questions.length - 1 || questions[idx + 1].stepId !== q.stepId;
    if (q.stepId === "contacto" && lastOfStep && validateTool(config, next, "contacto").direccion) {
      setError("Necesito al menos una forma de contactarte: dirección, correo o teléfono.");
      setIdx(questions.findIndex((x) => x.field.name === "direccion"));
      return;
    }
    if (resume !== null) {
      setIdx(resume);
      setResume(null);
    } else {
      setIdx(idx + 1);
    }
  };

  const accept = (value: string | string[]) => {
    if (!current) return;
    const next = { ...data, [current.field.name]: value };
    setData(next);
    setProposal(null);
    // Con el relato en la mano se comprueba si este documento es el camino correcto.
    if (current.field.name === "hechos" && typeof value === "string" && value && triaged.current !== value) {
      triaged.current = value;
      void checkFit(value, next);
      return;
    }
    advance(next);
  };

  const checkFit = async (story: string, next: ToolData) => {
    setWorking(true);
    try {
      const res = await fetch("/api/tools/orientar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story, current: kind }),
      });
      const body = (await res.json()) as { routes: Route[]; fits: boolean };
      if (!body.fits && body.routes.length) setRedirect(body.routes);
    } catch {
      /* sin orientación: se continúa con normalidad */
    } finally {
      setWorking(false);
    }
    advance(next);
  };

  const submit = async (raw: string | string[]) => {
    if (!current || working) return;
    const f = current.field;
    const value = Array.isArray(raw) ? raw : raw.trim();
    if (!hasValue(value)) {
      if (f.required) {
        setError(f.type === "checkboxes" ? "Toca al menos una opción para continuar." : "Necesito este dato para continuar.");
        return;
      }
      accept(Array.isArray(raw) ? [] : "");
      return;
    }
    // "No sé", "no", "ninguno"… no son un dato: se tratan como pregunta sin respuesta.
    if (typeof value === "string" && /^(?:no|no\s+(?:lo\s+)?s[eé]|no\s+(?:aplica|tengo|hay)|ningun[oa]|nada|n\/a)[.!]*$/i.test(value)) {
      if (!f.required) {
        accept("");
        return;
      }
      setDraft("");
      setError(
        f.name === "entidad" || f.name === "accionado"
          ? "No hay problema. Toca una de las opciones que te sugiero arriba; si tienes dudas, la Personería de tu municipio te orienta sin costo."
          : "No hay problema, pero necesito este dato para preparar el documento. Escribe lo que sepas.",
      );
      return;
    }
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      setError("Ese correo no parece completo. Revísalo, por favor.");
      return;
    }
    setError("");
    const organize = typeof value === "string" ? organizeKind(f.name) : null;
    if (organize && typeof value === "string" && value !== data[f.name]) {
      // 1. ¿Falta algo importante? La IA puede hacer hasta dos preguntas de seguimiento.
      setWorking(true);
      try {
        const res = await fetch("/api/tools/organizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value, kind: organize, step: "preguntas" }),
        });
        const body = (await res.json()) as { questions?: string[] };
        if (body.questions?.length) {
          setProbe({ original: value, questions: body.questions, kind: organize });
          setDraft("");
          return;
        }
      } catch {
        /* sin IA: se continúa sin preguntas de seguimiento */
      } finally {
        setWorking(false);
      }
      await draftNarrative(value, organize);
      return;
    }
    accept(value);
  };

  /** 2. Redacta el relato en limpio y lo muestra para que la persona lo confirme. */
  const draftNarrative = async (text: string, organize: "hechos" | "peticiones") => {
    setWorking(true);
    try {
      const res = await fetch("/api/tools/organizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, kind: organize }),
      });
      const body = (await res.json()) as { text: string; organized: boolean };
      if (body.organized && body.text.trim() !== text) {
        setProposal({ original: text, organized: body.text.trim() });
        return;
      }
    } catch {
      /* sin IA: se usa el texto tal como lo escribió la persona */
    } finally {
      setWorking(false);
    }
    accept(text);
  };

  const answerProbe = async (extra: string) => {
    if (!probe || working) return;
    const merged = extra.trim() ? `${probe.original}\n${extra.trim()}` : probe.original;
    const kindOf = probe.kind;
    setProbe(null);
    setDraft(merged);
    await draftNarrative(merged, kindOf);
  };

  const edit = (i: number) => {
    setResume(done ? questions.length : Math.max(idx, i));
    setState("idle");
    setIdx(i);
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
      const url = URL.createObjectURL(await res.blob());
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
    setState("idle");
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      /* sin almacenamiento */
    }
    setIdx(0);
    setResume(null);
  };

  const answered = questions.slice(0, Math.min(idx, questions.length));
  const allConfirmed = config.confirmations.every((c) => confirmed[c.name]);
  const progress = Math.round((Math.min(idx, questions.length) / questions.length) * 100);
  const field: Field | undefined = current?.field;
  const multiline = field?.type === "textarea";
  const entityHints =
    field && field.type === "text" && (field.name === "entidad" || field.name === "accionado")
      ? suggestEntities(`${String(data.hechos || "")} ${String(data.proyecto || "")}`, String(data.ciudad || ""))
      : [];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/herramientas" className="btn btn-ghost btn-sm -ml-3 text-muted">
        <ArrowLeft size={16} />
        Herramientas
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-forest-900 sm:text-3xl">{config.name}</h1>
        {onSwitch && (
          <button type="button" onClick={onSwitch} className="btn btn-secondary btn-sm">
            <ListChecks size={15} />
            Ver como formulario
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3" role="status" aria-label={`Avance: ${progress} por ciento`}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-forest-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-muted tabular-nums">
          {Math.min(idx + (done ? 0 : 1), questions.length)} de {questions.length}
        </span>
      </div>

      <div className="mt-8 space-y-5" aria-live="polite">
        <Bot>
          <p>
            Hola. Te voy a hacer unas preguntas, <strong className="font-semibold">una por una</strong>, para preparar
            tu documento. Responde con tus palabras; no importa si hay errores.
          </p>
        </Bot>

        {ready &&
          answered.map((q, i) => {
            const v = data[q.field.name];
            return (
              <div key={q.field.name} className="space-y-3">
                <Bot>
                  <p>{askFor(q.field)}</p>
                </Bot>
                <div className="flex justify-end">
                  <div className="max-w-[88%]">
                    <div
                      className={`rounded-3xl rounded-br-lg px-5 py-3 text-[1.0625rem] leading-relaxed whitespace-pre-line ${
                        hasValue(v) ? "bg-forest-700 text-paper" : "border border-dashed border-line-strong text-faint"
                      }`}
                    >
                      {Array.isArray(v) ? (
                        v.length ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {v.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        ) : (
                          "Sin respuesta"
                        )
                      ) : (
                        String(v ?? "").trim() || "Sin respuesta"
                      )}
                    </div>
                    <div className="mt-1 text-right">
                      <button
                        type="button"
                        onClick={() => edit(i)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-forest-700 hover:bg-forest-50"
                      >
                        <Pencil size={14} />
                        Cambiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {/* El relato no corresponde a este documento: se muestra el camino adecuado */}
        {ready && redirect && (
          <div className="animate-rise space-y-4">
            <Bot>
              <p>
                <strong className="font-semibold">Espera un momento.</strong> Por lo que me cuentas, «{config.name}» no
                parece el camino adecuado para tu caso. Te sugiero esto:
              </p>
            </Bot>
            <div className="pl-[2.6rem]">
              <RouteCards routes={redirect} story={String(data.hechos || "")} />
              <button type="button" onClick={() => setRedirect(null)} className="btn btn-ghost btn-sm mt-3 text-muted">
                Seguir con {config.name.toLowerCase()} de todos modos
              </button>
            </div>
          </div>
        )}

        {/* Pregunta actual */}
        {ready && field && !redirect && (
          <div key={`q-${idx}`} className="space-y-4">
            <Bot text={canSpeak ? askFor(field) : undefined}>
              <p>{askFor(field)}</p>
              {field.hint && <p className="mt-1.5 text-[0.9375rem] text-muted">{field.hint}</p>}
            </Bot>

            {proposal ? (
              <div className="animate-rise space-y-4">
                <Bot text={canSpeak ? proposal.organized : undefined}>
                  <p className="font-semibold">Así lo ordené. ¿Dice lo mismo que tú quisiste decir?</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-clay">
                    {proposal.organized.split("\n").map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-sm text-muted">No agregué nada: solo ordené tus palabras.</p>
                </Bot>
                <div className="grid gap-2.5 pl-[2.6rem] sm:grid-cols-3">
                  <button type="button" onClick={() => accept(proposal.organized)} className="btn btn-primary !min-h-12">
                    <Check size={17} />
                    Sí, está bien
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(proposal.organized);
                      setProposal(null);
                      // La versión corregida a mano se acepta tal cual.
                      setData((d) => ({ ...d, [field.name]: proposal.organized }));
                    }}
                    className="btn btn-secondary !min-h-12"
                  >
                    <Pencil size={16} />
                    Corregir
                  </button>
                  <button type="button" onClick={() => accept(proposal.original)} className="btn btn-secondary !min-h-12">
                    Usar mis palabras
                  </button>
                </div>
              </div>
            ) : field.type === "select" ? (
              <div className="grid gap-2.5 pl-[2.6rem]">
                {field.options!.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => submit(o)}
                    className={`min-h-13 rounded-2xl border px-5 py-3 text-left text-[1.0625rem] leading-snug transition-colors ${
                      data[field.name] === o
                        ? "border-forest-600 bg-forest-50 font-semibold text-forest-900"
                        : "border-line-strong bg-paper hover:border-forest-500 hover:bg-forest-50"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : field.type === "checkboxes" ? (
              <div className="space-y-2.5 pl-[2.6rem]">
                {field.options!.map((o) => {
                  const on = picked.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setPicked(on ? picked.filter((x) => x !== o) : [...picked, o]);
                        setError("");
                      }}
                      className={`flex min-h-13 w-full items-center gap-3 rounded-2xl border px-5 py-3 text-left text-[1.0625rem] leading-snug transition-colors ${
                        on ? "border-forest-600 bg-forest-50 text-forest-900" : "border-line-strong bg-paper hover:border-forest-500"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          on ? "border-forest-700 bg-forest-700 text-paper" : "border-line-strong"
                        }`}
                      >
                        {on && <Check size={15} />}
                      </span>
                      {o}
                    </button>
                  );
                })}
                <button type="button" onClick={() => submit(picked)} className="btn btn-primary !min-h-12 w-full">
                  Continuar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void (probe ? answerProbe(draft) : submit(draft));
                }}
                className="space-y-3 pl-[2.6rem]"
              >
                {probe && (
                  <div className="animate-rise -ml-[2.6rem]">
                    <Bot text={canSpeak ? probe.questions.join(" ") : undefined}>
                      <p className="font-semibold">Gracias. Para que quede más claro, cuéntame también:</p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-clay">
                        {probe.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </Bot>
                  </div>
                )}
                {entityHints.length > 0 && !probe && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted">
                      {String(data.hechos || "").trim() ? "Según lo que me contaste, podría ser:" : "Algunas opciones:"}
                    </p>
                    {entityHints.map((h) => (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => {
                          setDraft(h.name);
                          setError("");
                          inputRef.current?.focus();
                        }}
                        className="block w-full rounded-2xl border border-line-strong bg-paper px-5 py-3 text-left transition-colors hover:border-forest-500 hover:bg-forest-50"
                      >
                        <span className="block text-[1.0625rem] font-semibold text-forest-900">{h.name}</span>
                        <span className="block text-sm text-muted">{h.why}</span>
                      </button>
                    ))}
                    <p className="text-sm leading-relaxed text-muted">
                      Toca una opción para usarla o escribe otra. {field.name === "entidad" ? ENTITY_REASSURANCE : "Verifica el nombre antes de presentar el documento."}
                    </p>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-[1.6rem] border border-line-strong bg-paper p-2 shadow-soft focus-within:border-forest-500 focus-within:shadow-lift">
                  <label htmlFor="respuesta" className="sr-only">
                    Tu respuesta
                  </label>
                  {multiline ? (
                    <textarea
                      id="respuesta"
                      ref={inputRef}
                      rows={4}
                      value={draft}
                      disabled={working}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setError("");
                      }}
                      placeholder={probe ? "Responde aquí con lo que sepas…" : "Escribe aquí…"}
                      className="min-h-28 flex-1 resize-y bg-transparent px-3.5 py-2.5 text-[1.0625rem] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
                    />
                  ) : (
                    <input
                      id="respuesta"
                      ref={inputRef}
                      type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                      inputMode={field.name === "numeroDocumento" || field.name === "numeroPersonas" ? "numeric" : undefined}
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setError("");
                      }}
                      placeholder={field.placeholder || "Escribe aquí…"}
                      autoComplete="off"
                      className="min-h-12 flex-1 bg-transparent px-3.5 text-[1.0625rem] text-ink placeholder:text-faint focus:outline-none"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={working}
                    aria-label="Enviar respuesta"
                    className="btn btn-primary btn-icon !min-h-12 !w-12 shrink-0"
                  >
                    {working ? <LoaderCircle size={19} className="animate-spin" /> : <ArrowUp size={20} />}
                  </button>
                </div>
                {working && (
                  <p className="mt-2 text-sm text-muted" role="status">
                    Estoy ordenando lo que me contaste…
                  </p>
                )}
              </form>
            )}

            {error && (
              <p role="alert" className="pl-[2.6rem] text-[0.9375rem] font-medium text-[#9b2c1f]">
                {error}
              </p>
            )}
            {probe && !working && (
              <div className="pl-[2.6rem]">
                <button type="button" onClick={() => answerProbe("")} className="btn btn-ghost btn-sm text-muted">
                  <SkipForward size={15} />
                  No lo sé: continuar
                </button>
              </div>
            )}
            {!proposal && !probe && !field.required && (
              <div className="pl-[2.6rem]">
                <button type="button" onClick={() => accept(field.type === "checkboxes" ? [] : "")} className="btn btn-ghost btn-sm text-muted">
                  <SkipForward size={15} />
                  No aplica o no lo sé: saltar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cierre */}
        {ready && done && (
          <div className="space-y-5">
            <Bot>
              <p>
                <strong className="font-semibold">Ya tengo todo.</strong> Revisa tus respuestas arriba: puedes tocar
                «Cambiar» en cualquiera. Cuando estés conforme, descarga tu documento.
              </p>
            </Bot>
            <div className="notice">
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
            <div className="space-y-2.5">
              {config.confirmations.map((c) => (
                <label
                  key={c.name}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 leading-snug transition-colors ${
                    confirmed[c.name] ? "border-forest-600 bg-forest-50" : "border-line-strong bg-paper"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!confirmed[c.name]}
                    onChange={(e) => setConfirmed((x) => ({ ...x, [c.name]: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-forest-700"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            {state === "error" && (
              <div className="notice notice-error" role="alert">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <p>{message}</p>
              </div>
            )}
            {state === "done" && (
              <div className="notice notice-info">
                <CircleCheck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Tu documento se descargó en formato Word.</p>
                  <p className="mt-1">Búscalo en la carpeta de descargas, léelo completo y ajústalo si hace falta.</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {state === "done" && (
                <button type="button" onClick={restart} className="btn btn-ghost">
                  Empezar otro
                </button>
              )}
              <button
                type="button"
                onClick={generate}
                disabled={!allConfirmed || state === "loading"}
                className="btn btn-accent !min-h-13 !px-6 text-base"
              >
                {state === "loading" ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
                {state === "loading" ? "Generando…" : state === "done" ? "Descargar de nuevo" : "Descargar mi documento"}
              </button>
            </div>
            {!allConfirmed && (
              <p className="text-right text-sm text-muted">Marca las casillas para habilitar la descarga.</p>
            )}
          </div>
        )}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
