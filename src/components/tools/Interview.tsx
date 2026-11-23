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
import { ToolHelp } from "./ToolHelp";
import { DocumentReview } from "./DocumentReview";
import { Conversation, ConversationNotes } from "./Conversation";
import { acceptConversationProposal, emptyConversation, restoreConversation, type ConversationState, type ConversationProposal } from "@/lib/tools-conversation";
import { EMERGENCY_NOTICE, explicitDanger } from "@/lib/emergency";
import { ToolFields } from "./ToolFields";
import { loadProfile } from "../chat/ProfileStep";
import { takeCase, type CaseHandoff } from "@/lib/case-context";
import { detectHealthCase } from "@/lib/health-route";
import { clearToolDrafts, draftKey, readDraft, type SavedDraft, type ParkedAnswers } from "@/lib/tools-draft";
import {
  askFor,
  ENTITY_REASSURANCE,
  organizeKind,
  suggestEntities,
  TOOLS,
  validateTool,
  interviewQuestions,
  migrateTutelaDraft,
  tutelaDefaults,
  suggestRights,
  optionLabel,
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

export function Interview({ kind, onSwitch, initialMode = "steps" }: { kind: string; onSwitch?: () => void; initialMode?: ConversationState["mode"] }) {
  const config = TOOLS[kind];
  const storageKey = draftKey(kind);
  const [data, setData] = useState<ToolData>(() => kind === "tutela" ? tutelaDefaults() : {});
  const [conversation, setConversation] = useState(() => emptyConversation(initialMode));
  const [parked, setParked] = useState<ParkedAnswers>({});
  const chatting = conversation.mode === "conversation";
  const questions = useMemo(() => interviewQuestions(config, data), [config, data]);
  const [idx, setIdx] = useState(0);
  const [resume, setResume] = useState<number | "revision" | null>(null);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  // Caminos sugeridos cuando el relato no corresponde a esta herramienta.
  const [redirect, setRedirect] = useState<Route[] | null>(null);
  const fitAttempts = useRef({ failed: false, count: 0, running: false });
  const fitRequest = useRef<AbortController | null>(null);
  const [safetyPause, setSafetyPause] = useState(false);
  const safetyAccepted = useRef("");
  const triaged = useRef("");
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [storageMessage, setStorageMessage] = useState("");
  const restoredAnswer = useRef<{ answer: string; picked: string[] } | null>(null);
  const answerFor = useRef<string | null>(null);
  const requestEpoch = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const story = useRef("");
  const incomingCase = useRef<CaseHandoff | null>(null);
  const skipFilled = useRef(false);
  const firstMissing = (values: ToolData) => {
    const list = interviewQuestions(config, values);
    const index = list.findIndex(q => q.fields.some(f => f.required && !hasValue(values[f.name])));
    return index < 0 ? list.length : index;
  };
  const startCase = (handoff: CaseHandoff) => {
    setConversation({ ...emptyConversation("conversation"), mensajes: handoff.mensajes });
    if (kind === "tutela" && handoff.medida) setData(previous => ({ ...previous, medidaProvisional: "Sí" }));
  };

  const done = idx >= questions.length;
  const current = done ? null : questions[idx];
  const questionId = current?.stepId || "revision";
  useEffect(() => () => { requestEpoch.current++; pendingRequest.current?.abort(); fitRequest.current?.abort(); }, []);
  useEffect(() => () => stopSpeaking(), [idx]);
  const request = (url: string, body: object) => {
    pendingRequest.current?.abort();
    const controller = new AbortController(); pendingRequest.current = controller;
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const existing = readDraft(window.localStorage, kind);
        const handoff = takeCase(window.sessionStorage);
        setSaved(existing);
        // Si ya había un borrador, la persona decide; el caso nuevo espera a «empezar de nuevo».
        if (handoff && existing) incomingCase.current = handoff;
        else if (handoff) startCase(handoff);
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
    // No guarda el texto de la pantalla anterior bajo la pregunta recién abierta.
    if (kind === "tutela" && questionId !== "revision" && answerFor.current !== questionId) return;
    try {
      const answered = Object.keys(data).some(key => kind !== "tutela" || !["calidad", "tipoDocumento"].includes(key));
      if (!answered && !draft && !picked.length && idx === 0 && !conversation.draft && !conversation.mensajes.length) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, JSON.stringify({ version: kind === "tutela" ? 3 : 2, kind, data, index: idx, questionId, answer: draft, picked, conversation, parked }));
    } catch {
      const frame = window.requestAnimationFrame(() => setStorageMessage("No se pudo guardar el avance. Mantén esta página abierta."));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [data, draft, picked, idx, kind, ready, saved, storageKey, questionId, conversation, parked]);

  /* Al cambiar de pregunta: carga la respuesta previa y enfoca el campo. */
  useEffect(() => {
    if (!ready || !current || saved) return;
    const frame = window.requestAnimationFrame(() => {
      const prev = data[current.field.name];
      answerFor.current = current.stepId;
      const restored = restoredAnswer.current;
      restoredAnswer.current = null;
      setPicked(restored?.picked || (Array.isArray(prev) ? prev : kind === "tutela" && current.field.name === "derechos" ? suggestRights(String(data.hechos || "")) : []));
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
    if (skipFilled.current) {
      const pending = firstMissing(next);
      setIdx(pending);
      if (pending >= interviewQuestions(config, next).length) skipFilled.current = false;
      return;
    }
    const q = questions[idx];
    if (kind === "tutela") {
      const nextQuestions = interviewQuestions(config, next);
      const position = nextQuestions.findIndex(question => question.stepId === q.stepId);
      // Tras editar una respuesta en revisión, muestra cualquier condicional nueva.
      const pendingConditional = nextQuestions.findIndex(question => {
        const step = config.steps.find(s => s.id === question.stepId);
        return step?.condition && question.fields.some(f => !hasValue(next[f.name]));
      });
      setIdx(resume === "revision" ? pendingConditional >= 0 ? pendingConditional : nextQuestions.length : position + 1);
      if (!(resume === "revision" && pendingConditional >= 0)) setResume(null);
      return;
    }
    const lastOfStep = idx === questions.length - 1 || questions[idx + 1].stepId !== q.stepId;
    if (q.stepId === "contacto" && lastOfStep && validateTool(config, next, "contacto").direccion) {
      setError("Necesito al menos una forma de contactarte: dirección, correo o teléfono.");
      setIdx(questions.findIndex((x) => x.field.name === "direccion"));
      return;
    }
    if (resume !== null) {
      setIdx(resume === "revision" ? questions.length : resume);
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
    setParked(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== current.stepId)));
    const next = { ...data, [current.field.name]: value };
    setData(next);
    setProposal(null);
    // Una aceptación avanza de inmediato; la orientación no comparte bloqueo ni abort con la entrevista.
    advance(next);
    if (typeof value === "string" && value && ["hechos", "hechosAdicionales", "actuaciones", "pruebas"].includes(current.field.name)) maybeCheckFit(next);
  };

  const maybeCheckFit = (next: ToolData) => {
    const facts = [next.hechos, next.hechosAdicionales, next.actuaciones, next.pruebas].filter(Boolean).join("\n");
    const state = fitAttempts.current;
    if (facts.length < 12 || state.running || state.count >= 2 || state.count > 0 && !state.failed || facts === triaged.current || explicitDanger(facts)) return;
    triaged.current = facts; state.count++; state.running = true;
    void checkFit(facts);
  };
  const checkFit = async (facts: string) => {
    const epoch = requestEpoch.current;
    const controller = new AbortController(); fitRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/tools/orientar", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ text: facts, current: kind, profile: loadProfile(), background: true }) });
      const body = await res.json() as OrientationResult;
      if (epoch !== requestEpoch.current) return;
      fitAttempts.current.failed = !res.ok || body.fallback === true;
      if (!fitAttempts.current.failed && !body.fits && body.routes?.length) setRedirect(body.routes);
    } catch { if (epoch === requestEpoch.current) fitAttempts.current.failed = true; }
    finally { clearTimeout(timer); if (epoch === requestEpoch.current) fitAttempts.current.running = false; }
  };

  const submit = async (raw: string | string[]) => {
    if (!current || working) return;
    const f = current.field;
    const value = Array.isArray(raw) ? raw : raw.trim();
    if (typeof value === "string" && value !== safetyAccepted.current && explicitDanger(value)) { setSafetyPause(true); return; }
    if (kind === "tutela" && current.fields.length > 1) {
      const next = { ...data, [f.name]: value };
      const errors = validateTool(config, next, current.stepId);
      if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return; }
      setError(""); accept(value); return;
    }
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
    accept(value);
  };

  /** 2. Redacta el relato en limpio y lo muestra para que la persona lo confirme. */
  const draftNarrative = async (text: string, organize: "hechos" | "peticiones") => {
    const epoch = requestEpoch.current;
    if (explicitDanger(text) && text !== safetyAccepted.current) { setSafetyPause(true); return; }
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
    restoredAnswer.current = parked[questions[i]?.stepId] || null;
    setResume(done ? "revision" : Math.max(idx, i));
    setIdx(i);
  };

  const restart = () => {
    stopSpeaking();
    requestEpoch.current++; pendingRequest.current?.abort(); fitRequest.current?.abort(); fitAttempts.current = { failed: false, count: 0, running: false }; setSafetyPause(false); setWorking(false);
    setData(kind === "tutela" ? tutelaDefaults() : {}); setDraft(""); setPicked([]); setSaved(null); setError("");
    setProposal(null); setProbe(null); setRedirect(null); story.current = ""; triaged.current = "";
    setConversation(emptyConversation());
    setParked({});
    restoredAnswer.current = null;
    try { clearToolDrafts(window.localStorage); clearToolDrafts(window.sessionStorage); window.sessionStorage.removeItem("raizia.relato"); }
    catch { setStorageMessage("No pudimos borrar el almacenamiento. Usa los ajustes de este navegador."); }
    setIdx(0); setResume(null); skipFilled.current = false;
    if (incomingCase.current) { startCase(incomingCase.current); incomingCase.current = null; }
  };
  const resumeSaved = () => {
    if (!saved) return;
    incomingCase.current = null;
    const restored = kind === "tutela" ? migrateTutelaDraft(saved) : saved;
    restoredAnswer.current = { answer: restored.answer, picked: restored.picked };
    setConversation(restoreConversation(saved.conversation));
    setParked(Object.fromEntries(Object.entries(saved.parked || {}).filter(([, v]) => v && typeof v.answer === "string" && Array.isArray(v.picked) && v.picked.every(item => typeof item === "string"))));
    setData(restored.data); setIdx(Math.min(restored.index, interviewQuestions(config, restored.data).length)); setDraft(restored.answer); setPicked(restored.picked); setSaved(null);
  };
  const stages = questions.flatMap((q, i) => i === 0 || q.stepId !== questions[i - 1].stepId ? [i] : []);
  const stage = done ? stages.length + 1 : stages.filter(i => i <= idx).length;
  const progress = kind === "tutela" ? Math.round(Math.min(idx + 1, questions.length) / questions.length * 100) : Math.round(stage / (stages.length + 1) * 100);
  const field: Field | undefined = current?.field;
  const updateChatData = (next: ToolData) => {
    const nextQuestions = interviewQuestions(config, next);
    const position = done ? nextQuestions.length : nextQuestions.findIndex(q => q.stepId === current?.stepId);
    const answer = field && next[field.name] !== data[field.name] && typeof next[field.name] === "string" ? String(next[field.name]) : draft;
    if (position >= 0 && position !== idx) {
      restoredAnswer.current = { answer, picked };
      setIdx(position);
    }
    setDraft(answer);
    setData(next);
    setParked(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => {
      const name = questions.find(q => q.stepId === key)?.field.name;
      return !name || next[name] === data[name];
    })));
  };
  const acceptChat = (p: ConversationProposal) => {
    const next = acceptConversationProposal(data, p);
    updateChatData(next);
    if (["hechos", "hechosAdicionales", "actuaciones", "pruebas"].includes(p.campo)) maybeCheckFit(next);
  };
  const changeMode = (mode: ConversationState["mode"], context?: string) => {
    stopSpeaking();
    if (mode === "conversation" && current && (draft.trim() || picked.length) && JSON.stringify(current.field.type === "checkboxes" ? picked : draft) !== JSON.stringify(data[current.field.name])) {
      setParked(previous => ({ ...previous, [current.stepId]: { answer: draft, picked } }));
    }
    setConversation(previous => ({ ...previous, mode, contexto: context }));
  };
  const prompt = current?.title || (field ? askFor(field) : "");
  const multiline = field?.type === "textarea";
  const baseHints =
    field && field.type === "text" && (field.name === "entidad" || field.name === "accionado")
      ? suggestEntities(`${String(data.hechos || "")} ${String(data.proyecto || "")}`, String(data.ciudad || ""))
      : [];
  // En salud, la tutela apunta a la EPS nombrada; Supersalud no se sugiere como accionada.
  const healthCase = kind === "tutela" && field?.name === "accionado" ? detectHealthCase(String(data.hechos || "")) : null;
  const entityHints = healthCase ? [...(healthCase.eps ? [{ name: healthCase.eps, why: "Es la EPS que nombraste y debe garantizar el servicio." }] : []), ...baseHints.filter(h => !/superintendencia|supersalud/i.test(h.name))] : baseHints;

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
      {ready && !saved && <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Cómo quieres contar tu caso"><button type="button" className="btn btn-secondary min-h-16 w-full" aria-pressed={chatting} disabled={working} onClick={() => changeMode("conversation")}>Contarlo conversando</button><button type="button" className="btn btn-secondary min-h-16 w-full" aria-pressed={!chatting} onClick={() => changeMode("steps")}>Responder paso a paso</button></div>}
      {conversation.notice && <p className="notice mt-4" role="status">{conversation.notice}</p>}
      {!chatting && (conversation.peligro || explicitDanger(draft) || explicitDanger(conversation.draft)) && <p className="notice mt-4" role="alert">{EMERGENCY_NOTICE}</p>}
      {!chatting && <>
      <p className="mt-4 text-sm font-semibold text-forest-700">{kind !== "tutela" && `Etapa ${stage} de ${stages.length + 1} · `}{done ? "Revisión y documento" : config.steps.find(s => s.id === current?.stepId)?.title}</p>
      <div className="mt-4 flex items-center gap-3" role="progressbar" aria-label={kind === "tutela" ? "Avance por preguntas" : "Avance por etapas"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-forest-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-muted tabular-nums">
          {kind === "tutela" && (done ? "Completadas " : "Pregunta ")}{Math.min(idx + (done ? 0 : 1), questions.length)} de {questions.length}
        </span>
      </div>

      </>}
      <div className="mt-8 space-y-5" aria-live="polite">
        {ready && !saved && <ToolHelp kind={kind} data={data} action="orientacion" />}
        {safetyPause && <section role="alert" className="notice"><p>{EMERGENCY_NOTICE}</p><p>¿Estás a salvo ahora?</p><button type="button" className="btn btn-secondary" onClick={() => { safetyAccepted.current = draft.trim(); setSafetyPause(false); setConversation(previous => ({ ...previous, peligro: true })); }}>Sí, estoy a salvo y quiero continuar</button><p>Si no, busca atención urgente. Tu texto sigue aquí sin incluirse en el documento.</p></section>}
        {!chatting && <Bot>
          <p>
            Hola. Te voy a hacer unas preguntas, <strong className="font-semibold">una por una</strong>, para preparar
            tu documento. Responde con tus palabras; no importa si hay errores.
          </p>
        </Bot>}
        {ready && !saved && chatting && <Conversation kind={kind} state={conversation} onChange={setConversation} data={data} onData={updateChatData} onAccept={acceptChat} onReview={() => { const parkedAnswer = Object.keys(parked).length > 0; skipFilled.current = !parkedAnswer; setIdx(parkedAnswer ? questions.length : firstMissing(data)); changeMode("steps"); }} />}

        {ready && saved && <section className="card p-6" aria-label="Retomar avance"><h2 className="text-2xl text-forest-900">Hay un avance guardado</h2><p className="mt-3">Si es tuyo, puedes retomarlo. Si este dispositivo lo usó otra persona, bórralo para empezar.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={resumeSaved} className="btn btn-primary">Retomar mi avance</button><button type="button" onClick={restart} className="btn btn-secondary">Borrar y empezar</button></div></section>}
        {ready && !saved && !chatting && idx > 0 && !done && <button type="button" className="btn btn-ghost" onClick={() => setIdx(idx - 1)}><ArrowLeft size={16} /> Volver a la pregunta anterior</button>}

        {/* El relato no corresponde a este documento: se muestra el camino adecuado */}
        {ready && !chatting && redirect && (
          <div className="animate-rise space-y-4">
            <Bot>
              <p>
                Con lo que has contado, también podrías explorar estos caminos. Puedes seguir con «{config.name}» y conservar tus respuestas:
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
        {ready && !saved && !chatting && field && !safetyPause && (
          <div key={`q-${idx}`} className="space-y-4">
            {kind === "tutela" && <button type="button" className="btn btn-secondary" disabled={working} onClick={() => changeMode("conversation", field.name)}>Quiero contar algo más</button>}
            <Bot text={canSpeak ? prompt : undefined}>
              <p>{prompt}</p>
              {field.hint && <p className="mt-1.5 text-[0.9375rem] text-muted">{field.hint}</p>}
              <p className="mt-3 text-sm text-muted">Ejemplo: {field.example || field.placeholder || (field.name === "hechos" ? "El [fecha], pedí [qué] a [entidad] en [lugar]. Me respondió [respuesta]. Esto me afecta en [consecuencia]." : field.type === "select" || field.type === "checkboxes" ? field.options?.[0] : "Escribe solo lo que sabes. Si falta un dato, puedes decir que no lo recuerdas.")}</p>
              <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 font-semibold">¿Por qué te pregunto esto?</summary><p className="text-sm">{field.why || (current?.stepId === "procedencia" ? "El juez necesita entender por qué buscas su ayuda ahora y si otro camino puede protegerte a tiempo." : current?.stepId === "persona" ? "Estos datos permiten identificar a quien presenta y firma el documento." : current?.stepId === "contacto" ? "Aquí recibirás la respuesta. Basta un medio de contacto." : "Tu respuesta ayuda a explicar y apoyar lo que pides. Si falta, se señalará para que puedas completarlo.")}</p></details>
            </Bot>

            <ToolHelp key={`help-${field.name}`} kind={kind} data={data} field={field.name} />
            {organizeKind(field.name) && draft.trim() && <button type="button" className="btn btn-secondary" disabled={working} onClick={() => void draftNarrative(draft, organizeKind(field.name)!)}>Ordenar mi respuesta con IA</button>}

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
            ) : current && current.fields.length > 1 ? (
              <form className="space-y-4 sm:pl-[2.6rem]" onSubmit={e => { e.preventDefault(); void submit(draft); }}>
                <ToolFields fields={current.fields} data={{ ...data, [field.name]: draft }} disabled={working} onChange={(name, value) => { if (name === field.name) setDraft(value); else setData(previous => ({ ...previous, [name]: value })); setError(""); }} />
                <button type="submit" className="btn btn-primary w-full" disabled={working}>Continuar</button>
              </form>
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
                {kind === "tutela" && field.name === "derechos" && <p className="rounded-xl bg-amber-50 p-4 text-amber-950">SUGERENCIA según tu relato. Revisa lo marcado, cambia lo que necesites y confirma tu elección.</p>}
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
                      {kind === "tutela" ? optionLabel(field.name, o) : o}
                    </button>
                  );
                })}
                <button type="button" onClick={() => submit(picked)} className="btn btn-primary !min-h-12 w-full">
                  {kind === "tutela" && field.name === "derechos" ? "Confirmar estos derechos" : "Continuar"}
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
            {!proposal && !probe && !field.required && current?.fields.length === 1 && (
              <div className="sm:pl-[2.6rem]">
                <button type="button" onClick={() => accept(field.type === "checkboxes" ? [] : "")} className="btn btn-ghost btn-sm text-muted">
                  <SkipForward size={15} />
                  No aplica o no lo sé: saltar
                </button>
              </div>
            )}
          </div>
        )}

        {ready && !saved && !chatting && done && <>
          {Object.entries(parked).map(([key, answer]) => {
            const index = questions.findIndex(q => q.stepId === key);
            return index < 0 ? null : <section key={key} className="card p-5"><h3 className="font-semibold">Respuesta que dejaste sin confirmar: {questions[index].title}</h3><p className="my-3 whitespace-pre-wrap">{answer.picked.length ? answer.picked.join(", ") : answer.answer}</p><button type="button" className="btn btn-secondary" onClick={() => edit(index)}>Volver a completar esta respuesta</button></section>;
          })}
          {kind === "tutela" && <section className="card space-y-4 p-5">
            <label htmlFor="algo-mas-tutela" className="label">¿Hay algo más que consideres importante?</label><p>Es opcional. Revisa y acepta lo que quieras incluir como hechos adicionales.</p>
            <textarea id="algo-mas-tutela" className="input" maxLength={2000} value={conversation.draft} onChange={e => setConversation(prev => ({ ...prev, draft: e.target.value }))} />
            <button type="button" className="btn btn-secondary" disabled={!conversation.draft.trim()} onClick={() => setConversation(prev => ({ ...prev, draft: "", mensajes: [...prev.mensajes, { role: "user", content: prev.draft.trim() }], propuestas: [...prev.propuestas, { campo: "hechosAdicionales", valor: prev.draft.trim(), cita_literal: prev.draft.trim() }] }))}>Revisar como hecho adicional</button>
            <ConversationNotes kind={kind} state={conversation} onChange={setConversation} data={data} onAccept={acceptChat} />
          </section>}
          {kind !== "tutela" && <ConversationNotes kind={kind} state={conversation} onChange={setConversation} data={data} onAccept={acceptChat} />}
          <DocumentReview kind={kind} data={data} onChange={setData} editField={name => { const i = questions.findIndex(q => q.fields.some(f => f.name === name)); if (i >= 0) edit(i); }} />
        </>}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
