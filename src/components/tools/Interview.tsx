"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ListChecks,
  LoaderCircle,
  Pencil,
  SkipForward,
  Volume2,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { speak, stopSpeaking } from "@/lib/speech";
import { entries } from "@/lib/document-model";
import type { OrientationResult, Route } from "@/lib/types";
import { RouteCards } from "./RouteCards";
import { DocumentReview } from "./DocumentReview";
import { loadProfile } from "../chat/ProfileStep";
import { clearToolDrafts, draftKey, readDraft, type SavedDraft } from "@/lib/tools-draft";
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
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-forest-700 hover:bg-forest-50"
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
  const storageKey = draftKey(kind);
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
  const [orientationNotice, setOrientationNotice] = useState("");
  const triaged = useRef("");
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [storageMessage, setStorageMessage] = useState("");
  const restoredAnswer = useRef<{ answer: string; picked: string[] } | null>(null);
  const requestEpoch = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const story = useRef("");

  const done = idx >= questions.length;
  const current = done ? null : questions[idx];
  useEffect(() => () => { requestEpoch.current++; pendingRequest.current?.abort(); }, []);
  useEffect(() => () => stopSpeaking(), [idx]);
  const request = (url: string, body: object) => {
    pendingRequest.current?.abort();
    const controller = new AbortController(); pendingRequest.current = controller;
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setSaved(readDraft(window.localStorage, kind));
        story.current = window.sessionStorage.getItem("raizia.relato") || "";
        window.sessionStorage.removeItem("raizia.relato");
      } catch { setStorageMessage("No se puede guardar en este navegador. Mantén esta página abierta."); }
      setCanSpeak("speechSynthesis" in window);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [kind]);
  useEffect(() => {
    if (!ready || saved) return;
    try {
      if (!Object.keys(data).length && !draft && !picked.length && idx === 0) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, JSON.stringify({ version: 2, kind, data, index: idx, answer: draft, picked }));
    } catch {
      const frame = window.requestAnimationFrame(() => setStorageMessage("No se pudo guardar el avance. Mantén esta página abierta."));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [data, draft, picked, idx, kind, ready, saved, storageKey]);

  /* Al cambiar de pregunta: carga la respuesta previa y enfoca el campo. */
  useEffect(() => {
    if (!ready || !current || saved) return;
    const frame = window.requestAnimationFrame(() => {
      const prev = data[current.field.name];
      const restored = restoredAnswer.current;
      restoredAnswer.current = null;
      setPicked(restored?.picked || (Array.isArray(prev) ? prev : []));
      setDraft(
        restored ? restored.answer : typeof prev === "string" && prev
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
  }, [idx, ready, saved]);

  useEffect(() => {
    if (proposal || probe || redirect || done) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [proposal, probe, redirect, done]);

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
      let following = idx + 1;
      while (following < questions.length && (
        (["medida", "razonMedida"].includes(questions[following].field.name) && next.medidaProvisional !== "Sí") ||
        (questions[following].field.name === "representacion" && next.calidad === "En nombre propio")
      )) following++;
      setIdx(following);
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
    const epoch = requestEpoch.current;
    setWorking(true);
    try {
      const res = await request("/api/tools/orientar", { text: story, current: kind, profile: loadProfile() });
      const body = (await res.json()) as OrientationResult;
      if (epoch !== requestEpoch.current) return;
      setOrientationNotice([body.emergency, body.notice].filter(Boolean).join(" "));
      if (!body.fits && body.routes.length) setRedirect(body.routes);
    } catch {
      /* sin orientación: se continúa con normalidad */
    } finally {
      if (epoch === requestEpoch.current) setWorking(false);
    }
    if (epoch === requestEpoch.current) advance(next);
  };

  const submit = async (raw: string | string[]) => {
    if (!current || working) return;
    const epoch = requestEpoch.current;
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
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      setError("Ese correo no parece completo. Revísalo, por favor.");
      return;
    }
    const validation = validateTool(config, { ...data, [f.name]: value });
    if (validation[f.name] && f.name !== "direccion") { setError(validation[f.name]); return; }
    setError("");
    const organize = typeof value === "string" ? organizeKind(f.name) : null;
    if (organize && typeof value === "string" && value !== data[f.name]) {
      // 1. ¿Falta algo importante? La IA puede hacer hasta dos preguntas de seguimiento.
      setWorking(true);
      try {
        const res = await request("/api/tools/organizar", { text: value, kind: organize, step: "preguntas" });
        const body = (await res.json()) as { questions?: string[] };
        if (epoch !== requestEpoch.current) return;
        if (body.questions?.length) {
          setProbe({ original: value, questions: body.questions, kind: organize });
          setDraft("");
          return;
        }
      } catch {
        /* sin IA: se continúa sin preguntas de seguimiento */
      } finally {
        if (epoch === requestEpoch.current) setWorking(false);
      }
      if (epoch !== requestEpoch.current) return;
      await draftNarrative(value, organize);
      return;
    }
    accept(value);
  };

  /** 2. Redacta el relato en limpio y lo muestra para que la persona lo confirme. */
  const draftNarrative = async (text: string, organize: "hechos" | "peticiones") => {
    const epoch = requestEpoch.current;
    setWorking(true);
    try {
      const res = await request("/api/tools/organizar", { text, kind: organize });
      const body = (await res.json()) as { text: string; organized: boolean };
      if (epoch !== requestEpoch.current) return;
      if (body.organized && body.text.trim() !== text) {
        setProposal({ original: text, organized: body.text.trim() });
        return;
      }
    } catch {
      /* sin IA: se usa el texto tal como lo escribió la persona */
    } finally {
      if (epoch === requestEpoch.current) setWorking(false);
    }
    if (epoch === requestEpoch.current) accept(text);
  };

  const answerProbe = async (extra: string) => {
    if (!probe || working) return;
    const merged = extra.trim() ? `${probe.original}\n${extra.trim()}` : probe.original;
    const kindOf = probe.kind;
    if (probe.questions.length > 1) { setProbe({ ...probe, original: merged, questions: probe.questions.slice(1) }); setDraft(""); return; }
    setProbe(null);
    setDraft(merged);
    await draftNarrative(merged, kindOf);
  };

  const edit = (i: number) => {
    setResume(done ? questions.length : Math.max(idx, i));
    setIdx(i);
  };

  const restart = () => {
    stopSpeaking();
    requestEpoch.current++; pendingRequest.current?.abort(); setWorking(false);
    setData({}); setDraft(""); setPicked([]); setSaved(null); setError("");
    setProposal(null); setProbe(null); setRedirect(null); story.current = ""; triaged.current = "";
    restoredAnswer.current = null;
    try { clearToolDrafts(window.localStorage); clearToolDrafts(window.sessionStorage); window.sessionStorage.removeItem("raizia.relato"); }
    catch { setStorageMessage("No pudimos borrar el almacenamiento. Usa los ajustes de este navegador."); }
    setIdx(0); setResume(null);
  };
  const resumeSaved = () => {
    if (!saved) return;
    restoredAnswer.current = { answer: saved.answer, picked: saved.picked };
    setData(saved.data); setIdx(Math.min(saved.index, questions.length)); setDraft(saved.answer); setPicked(saved.picked); setSaved(null);
  };
  const stages = questions.flatMap((q, i) => i === 0 || q.stepId !== questions[i - 1].stepId ? [i] : []);
  const stage = done ? stages.length + 1 : stages.filter(i => i <= idx).length;
  const progress = Math.round(stage / (stages.length + 1) * 100);
  const field: Field | undefined = current?.field;
  const multiline = field?.type === "textarea";
  const entityHints =
    field && field.type === "text" && (field.name === "entidad" || field.name === "accionado")
      ? suggestEntities(`${String(data.hechos || "")} ${String(data.proyecto || "")}`, String(data.ciudad || ""))
      : [];

  return (
    <div className="tools-flow mx-auto w-full max-w-3xl">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted">{storageMessage || "Tu avance queda en este dispositivo."}</p><button type="button" onClick={restart} className="btn btn-secondary">Borrar mis datos</button></div>
      <p className="mt-4 text-sm font-semibold text-forest-700">Etapa {stage} de {stages.length + 1} · {done ? "Revisión y documento" : config.steps.find(s => s.id === current?.stepId)?.title}</p>
      <div className="mt-4 flex items-center gap-3" role="progressbar" aria-label="Avance por etapas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-forest-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-muted tabular-nums">
          {Math.min(idx + (done ? 0 : 1), questions.length)} de {questions.length}
        </span>
      </div>

      <div className="mt-8 space-y-5" aria-live="polite">
        {orientationNotice && <p role="alert" className="card p-4">{orientationNotice}</p>}
        <Bot>
          <p>
            Hola. Te voy a hacer unas preguntas, <strong className="font-semibold">una por una</strong>, para preparar
            tu documento. Responde con tus palabras; no importa si hay errores.
          </p>
        </Bot>

        {ready && saved && <section className="card p-6" aria-label="Retomar avance"><h2 className="text-2xl text-forest-900">Hay un avance guardado</h2><p className="mt-3">Si es tuyo, puedes retomarlo. Si este dispositivo lo usó otra persona, bórralo para empezar.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={resumeSaved} className="btn btn-primary">Retomar mi avance</button><button type="button" onClick={restart} className="btn btn-secondary">Borrar y empezar</button></div></section>}
        {ready && !saved && idx > 0 && !done && <button type="button" className="btn btn-ghost" onClick={() => setIdx(idx - 1)}><ArrowLeft size={16} /> Volver a la pregunta anterior</button>}

        {/* El relato no corresponde a este documento: se muestra el camino adecuado */}
        {ready && redirect && (
          <div className="animate-rise space-y-4">
            <Bot>
              <p>
                <strong className="font-semibold">Espera un momento.</strong> Por lo que me cuentas, «{config.name}» no
                parece el camino adecuado para tu caso. Te sugiero esto:
              </p>
            </Bot>
            <div className="sm:pl-[2.6rem]">
              <RouteCards routes={redirect} story={String(data.hechos || "")} />
              <button type="button" onClick={() => setRedirect(null)} className="btn btn-ghost btn-sm mt-3 text-muted">
                Seguir con {config.name.toLowerCase()} de todos modos
              </button>
            </div>
          </div>
        )}

        {/* Pregunta actual */}
        {ready && !saved && field && !redirect && (
          <div key={`q-${idx}`} className="space-y-4">
            <Bot text={canSpeak ? askFor(field) : undefined}>
              <p>{askFor(field)}</p>
              {field.hint && <p className="mt-1.5 text-[0.9375rem] text-muted">{field.hint}</p>}
              <p className="mt-3 text-sm text-muted">Ejemplo: {field.example || field.placeholder || (field.name === "hechos" ? "El [fecha], pedí [qué] a [entidad] en [lugar]. Me respondió [respuesta]. Esto me afecta en [consecuencia]." : field.type === "select" || field.type === "checkboxes" ? field.options?.[0] : "Escribe solo lo que sabes. Si falta un dato, puedes decir que no lo recuerdas.")}</p>
              <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 font-semibold">¿Por qué te pregunto esto?</summary><p className="text-sm">{field.why || (current?.stepId === "procedencia" ? "El juez necesita entender por qué buscas su ayuda ahora y si otro camino puede protegerte a tiempo." : current?.stepId === "persona" ? "Estos datos permiten identificar a quien presenta y firma el documento." : current?.stepId === "contacto" ? "Aquí recibirás la respuesta. Basta un medio de contacto." : "Tu respuesta ayuda a explicar y apoyar lo que pides. Si falta, se señalará para que puedas completarlo.")}</p></details>
            </Bot>

            {["responsables", "plazos", "verificaciones", "hechosApoyo", "pruebasApoyo", "demuestra"].includes(field.name) && <aside className="rounded-2xl border border-line bg-sand/50 p-5"><p className="font-semibold">Para ayudarte a recordar</p>{(field.name === "demuestra" ? ["pruebas"] : ["pretensiones", ...(field.name === "hechosApoyo" ? ["hechos"] : field.name === "pruebasApoyo" ? ["pruebas"] : [])]).map(key => <div key={key} className="mt-3"><p className="text-sm font-semibold text-muted">{key === "pretensiones" ? "Tus pedidos" : key === "hechos" ? "Tus hechos" : "Tus pruebas"}</p><ol className="mt-1 list-decimal space-y-2 pl-5">{entries(data[key]).map((text, i) => <li key={i}>{text}</li>)}</ol></div>)}</aside>}

            {proposal ? (
              <div className="animate-rise space-y-4">
                <Bot text={canSpeak ? proposal.organized : undefined}>
                  <p className="font-semibold">Así lo ordené. ¿Dice lo mismo que tú quisiste decir?</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-clay">
                    {proposal.organized.split("\n").map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-sm text-muted">Compara la propuesta con tus palabras. Acepta solo si conserva todo y no agrega nada.</p>
                </Bot>
                <div className="grid gap-2.5 sm:pl-[2.6rem] sm:grid-cols-3">
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
              <div className="grid gap-2.5 sm:pl-[2.6rem]">
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
              <div className="space-y-2.5 sm:pl-[2.6rem]">
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
                className="space-y-3 sm:pl-[2.6rem]"
              >
                {probe && (
                  <div className="animate-rise sm:-ml-[2.6rem]">
                    <Bot text={canSpeak ? probe.questions[0] : undefined}>
                      <p className="font-semibold">Gracias. Para que quede más claro, cuéntame también:</p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-clay">
                        {probe.questions.slice(0, 1).map((q) => (
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
              <p role="alert" className="sm:pl-[2.6rem] text-[0.9375rem] font-medium text-[#9b2c1f]">
                {error}
              </p>
            )}
            {probe && !working && (
              <div className="sm:pl-[2.6rem]">
                <button type="button" onClick={() => answerProbe("")} className="btn btn-ghost btn-sm text-muted">
                  <SkipForward size={15} />
                  No lo sé: continuar
                </button>
              </div>
            )}
            {!proposal && !probe && !field.required && (
              <div className="sm:pl-[2.6rem]">
                <button type="button" onClick={() => accept(field.type === "checkboxes" ? [] : "")} className="btn btn-ghost btn-sm text-muted">
                  <SkipForward size={15} />
                  No aplica o no lo sé: saltar
                </button>
              </div>
            )}
          </div>
        )}

        {ready && !saved && done && <DocumentReview kind={kind} data={data} onChange={setData} editField={name => { const i = questions.findIndex(q => q.field.name === name); if (i >= 0) edit(i); }} />}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
