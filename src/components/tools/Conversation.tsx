"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { speak, stopSpeaking } from "@/lib/speech";
import { recognitionConstructor, type Recognition } from "@/lib/dictation";
import { EMERGENCY_NOTICE, explicitDanger } from "@/lib/emergency";
import { TOOLS, type ToolData } from "@/lib/tools-config";
import { acceptConversationProposal, CONVERSATION_FIELDS, CONVERSATION_FALLBACK, conversationRequest, receiveConversation, type ConversationState, type ConversationResult, type ConversationProposal } from "@/lib/tools-conversation";
import { ToolFields } from "./ToolFields";

type Props = { kind?: string; state: ConversationState; onChange: Dispatch<SetStateAction<ConversationState>>; data: ToolData; onData: (data: ToolData) => void; onAccept: (proposal: ConversationProposal) => void; onReview: () => void };

/** Las propuestas siguen separadas de las respuestas aceptadas, también en revisión. */
export function ConversationNotes({ kind = "tutela", state, onChange, data, onAccept }: Pick<Props, "kind" | "state" | "onChange" | "data" | "onAccept">) {
  const fields = TOOLS[kind].steps.flatMap(s => s.fields);
  const remove = (index: number) => onChange(prev => ({ ...prev, propuestas: prev.propuestas.filter((_, i) => i !== index) }));
  return <section aria-label="Revisar lo conversado" className="space-y-4">
    <h3 className="text-xl text-forest-900">Revisar lo conversado</h3>
    <p>Estas propuestas no se incluyen hasta que las aceptes. Puedes corregirlas o descartarlas.</p>
    {state.propuestas.map((p, i) => <div key={`${p.campo}-${i}`} className="card space-y-3 p-4">
      <label htmlFor={`propuesta-chat-${i}`} className="label">{fields.find(f => f.name === p.campo)?.label}</label>
      {!!data[p.campo] && <p className="whitespace-pre-wrap"><strong>{p.campo === "hechosAdicionales" ? "Ya incluido (se agregará al final): " : "Dato confirmado que cambiaría: "}</strong>{String(data[p.campo])}</p>}
      <blockquote className="border-l-2 border-forest-300 pl-3 whitespace-pre-wrap">Tus palabras: «{p.cita_literal}»</blockquote>
      <textarea id={`propuesta-chat-${i}`} className="input" maxLength={8000} value={p.valor} onChange={e => onChange(prev => ({ ...prev, propuestas: prev.propuestas.map((item, n) => n === i ? { ...item, valor: e.target.value } : item) }))} />
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!p.valor.trim()} className="btn btn-primary" onClick={() => { onAccept(p); remove(i); }}>{data[p.campo] && p.campo !== "hechosAdicionales" ? "Aceptar este cambio" : "Aceptar e incluir"}</button><button type="button" className="btn btn-secondary" onClick={() => remove(i)}>Descartar propuesta</button></div>
    </div>)}
    {kind === "tutela" && <details><summary className="cursor-pointer py-3 font-semibold">Mis palabras completas: elegir otros hechos adicionales</summary>
      <p className="mb-3">Elige solo lo importante para tu documento. Se mostrará como propuesta antes de incluirlo.</p>
      {state.mensajes.filter(m => m.role === "user").map((m, i) => <div key={i} className="my-3 rounded-xl border border-line p-4"><p className="whitespace-pre-wrap">{m.content}</p><button type="button" className="btn btn-secondary mt-2" onClick={() => onChange(prev => ({ ...prev, propuestas: prev.propuestas.some(p => p.campo === "hechosAdicionales" && p.cita_literal === m.content) ? prev.propuestas : [...prev.propuestas, { campo: "hechosAdicionales", valor: m.content, cita_literal: m.content }] }))}>Proponer como hecho adicional</button></div>)}
      {state.draft && <p className="whitespace-pre-wrap">Texto sin enviar (vuelve al chat para completarlo): {state.draft}</p>}
    </details>}
  </section>;
}

export function Conversation({ kind = "tutela", state, onChange, data, onData, onAccept, onReview }: Props) {
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const started = useRef(false);
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const alive = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; pending.current?.abort(); recognition.current?.abort(); stopSpeaking(); };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [state.mensajes.length]);
  const danger = state.peligro || explicitDanger(state.draft) || state.mensajes.some(m => m.role === "user" && explicitDanger(m.content));
  const deliver = async (sent: ConversationState) => {
    setWorking(true);
    const controller = new AbortController(); pending.current = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, 28000); });
      const result = await Promise.race([(async () => {
        const response = await fetch("/api/tools/conversar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(conversationRequest(sent, data, kind)), signal: controller.signal });
        const body = await response.json() as ConversationResult;
        if ((!response.ok && response.status !== 429) || typeof body.respuesta !== "string" || body.respuesta.length > 1000 || !(body.pregunta === null || typeof body.pregunta === "string" && body.pregunta.length <= 240) || !Array.isArray(body.propuestas) || body.propuestas.length > 16 || body.propuestas.some(p => !p || typeof p.campo !== "string" || typeof p.valor !== "string" || typeof p.cita_literal !== "string")) throw new Error("response");
        return body;
      })(), timeout]);
      if (alive.current) {
        // Lo dicho llena solo campos vacíos; nada confirmado se reemplaza y todo se revisa antes del documento.
        const fill = result.propuestas.filter(p => !String(dataRef.current[p.campo] ?? "").trim());
        if (fill.length) onData(fill.reduce(acceptConversationProposal, dataRef.current));
        onChange(prev => receiveConversation(prev, { ...result, propuestas: result.propuestas.filter(p => !fill.includes(p)) }));
        setComplete(!result.respaldo && !result.faltan.length);
      }
    } catch {
      if (alive.current) onChange(prev => ({ ...prev, mode: "steps", notice: CONVERSATION_FALLBACK }));
    } finally { clearTimeout(timer); if (alive.current) setWorking(false); }
  };
  // Un caso que llega de otro flujo continúa aquí sin que la persona lo repita.
  useEffect(() => {
    if (started.current || state.mensajes.at(-1)?.role !== "user") return;
    started.current = true;
    void deliver(state);
    // Solo al abrir la conversación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const send = async () => {
    if (working || !state.draft.trim()) return;
    recognition.current?.stop();
    const sent: ConversationState = { ...state, draft: "", notice: "", peligro: danger, mensajes: [...state.mensajes, { role: "user", content: state.draft.trim() }] };
    if (explicitDanger(state.draft)) {
      onChange({ ...sent, peligro: true, mensajes: [...sent.mensajes, { role: "assistant", content: `${EMERGENCY_NOTICE} ¿Estás a salvo ahora?` }] });
      return;
    }
    onChange(sent);
    await deliver(sent);
  };
  const dictate = () => {
    if (listening) { recognition.current?.stop(); return; }
    const Constructor = recognitionConstructor();
    if (!Constructor) { setVoiceNotice("Este navegador no permite dictado. Puedes escribir tu mensaje."); return; }
    const voice = new Constructor(); recognition.current = voice;
    voice.lang = "es-CO"; voice.continuous = true; voice.interimResults = false;
    voice.onresult = event => {
      if (!alive.current) return;
      const pieces: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) pieces.push(event.results[i][0].transcript);
      if (pieces.length) onChange(prev => ({ ...prev, draft: `${prev.draft} ${pieces.join(" ")}`.trim().slice(0, 2000) }));
    };
    voice.onerror = () => { if (alive.current) { setListening(false); setVoiceNotice("No pude escuchar. Revisa el permiso del micrófono o escribe tu mensaje."); } };
    voice.onend = () => { if (alive.current) setListening(false); };
    try { voice.start(); setListening(true); setVoiceNotice("El dictado usa el servicio de voz de tu navegador. Revisa el texto antes de enviarlo."); }
    catch { setVoiceNotice("No se pudo iniciar el micrófono. Puedes escribir."); }
  };
  return <section className="space-y-5" aria-label="Conversación sobre tu tutela">
    <p className="rounded-xl bg-sand p-4">Lo que escribes se envía a Gemini para ayudarte a organizar tu caso. Evita datos que no sean necesarios.</p>
    <p>Cuenta lo que quieras, cambia de tema o corrige. Puedes decir «no sé». No escribas cédula ni datos sensibles; el documento se pide en su pantalla.</p>
    {danger && <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-4 font-semibold text-red-950">{EMERGENCY_NOTICE}</p>}
    {state.contexto && <p className="text-sm text-muted">Estabas respondiendo: {TOOLS[kind].steps.flatMap(s => s.fields).find(f => f.name === state.contexto)?.label}. Puedes contar algo distinto.</p>}
    <div role="log" aria-label="Mensajes de la conversación" aria-live="polite" className="space-y-3">
      {!state.mensajes.length && <p className="card p-4">Te escucho. ¿Qué te gustaría contarme?</p>}
      {state.mensajes.map((m, i) => <div key={i} className={`rounded-2xl border border-line p-4 ${m.role === "user" ? "bg-forest-50" : "bg-paper"}`}><p className="text-sm font-semibold">{m.role === "user" ? "Tú" : "RAIZIA"}</p><p className="mt-1 whitespace-pre-wrap">{m.content}</p><button type="button" className="btn btn-ghost mt-1" onClick={() => speak(m.content)}>Escuchar</button></div>)}
      {working && <p role="status">Pensando en lo que me cuentas…</p>}
      <div ref={endRef} />
    </div>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void send(); }}>
      <label className="label" htmlFor="conversacion-mensaje">Lo que quieres contar</label>
      <textarea id="conversacion-mensaje" className="input min-h-32" maxLength={2000} value={state.draft} onChange={e => onChange(prev => ({ ...prev, draft: e.target.value }))} />
      <p className="text-sm text-muted">{state.draft.length} de 2000 caracteres por mensaje. Puedes seguir en otro mensaje.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className="btn btn-primary" disabled={working || !state.draft.trim()}>Enviar mensaje</button><button type="button" className="btn btn-secondary" disabled={working} onClick={dictate}>{listening ? "Detener dictado" : "Dictar"}</button></div>
      {voiceNotice && <p role="status">{voiceNotice}</p>}
    </form>
    <details className="card p-5"><summary className="cursor-pointer py-2 text-xl font-semibold">Lo que voy entendiendo</summary>
      <p className="my-3">Revisa los datos por etapa. Los cambios solo se incluyen cuando los aceptas.</p>
      {TOOLS[kind].steps.map(step => {
        const fields = step.fields.filter(f => CONVERSATION_FIELDS.includes(f.name) && data[f.name]);
        return fields.length ? <section key={step.id} className="my-4"><h3 className="font-semibold">{step.title}</h3>{fields.map(f => <div key={f.name} className="my-2"><p className="whitespace-pre-wrap">{f.label}: {String(data[f.name])}</p><details><summary className="cursor-pointer py-2 font-semibold">Corregir</summary><ToolFields fields={[f]} data={data} onChange={(name, value) => onData({ ...data, [name]: value })} /></details></div>)}</section> : null;
      })}
      <ConversationNotes kind={kind} state={state} onChange={onChange} data={data} onAccept={onAccept} />
    </details>
    <button type="button" className={`btn w-full ${complete ? "btn-primary" : "btn-secondary"}`} disabled={working} onClick={onReview}>Revisar mis datos y preparar el documento</button>
  </section>;
}
