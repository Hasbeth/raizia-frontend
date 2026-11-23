"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TOOLS, type ToolData } from "@/lib/tools-config";
import { conversationRequest, emptyConversation, type ConversationMessage } from "@/lib/tools-conversation";
import { explicitDanger, EMERGENCY_NOTICE } from "@/lib/emergency";

type Action = "ayuda" | "orientacion" | "revision" | "siguiente";
type Result = { respuesta: string; pregunta?: string | null; ejemplo?: string; peligro?: boolean;
  pasos?: { texto: string; fuente: number; cita_literal: string }[];
  mejoras?: { campo: string; mensaje: string; cita_literal: string }[]; alternativa?: string | null;
  sources?: { n: number; title: string; documentId: number; officialUrl: string }[] };
export function ToolHelp({ kind, data, field, action = "ayuda", editField }: {
  kind: string; data: ToolData; field?: string; action?: Action; editField?: (field: string) => void;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const labels = { ayuda: "No entiendo / Ayúdame", orientacion: "Orientarme sobre este camino", revision: "Revisión final con IA", siguiente: "Consultar qué sigue con fuentes" };
  const ask = async (text: string) => {
    if (busy.current) return;
    const next: ConversationMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next); setDraft("");
    if (explicitDanger(text)) { setResult({ respuesta: EMERGENCY_NOTICE, pregunta: "¿Estás a salvo ahora?", peligro: true }); return; }
    busy.current = true; setWorking(true);
    const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/tools/conversar", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...conversationRequest({ ...emptyConversation(), mensajes: next, contexto: field }, data, kind), accion: action }) });
      if (!response.ok) throw new Error("unavailable");
      const body = await response.json() as Result;
      if (typeof body.respuesta !== "string") throw new Error("invalid");
      if (!controller.signal.aborted) {
        setResult(body); setMessages([...next, { role: "assistant", content: [body.respuesta, body.ejemplo, body.pregunta].filter(Boolean).join(" ").slice(0, 2000) }]);
      }
    } catch {
      setResult({ respuesta: "Ahora no pude ayudarte con IA. Puedes seguir paso a paso; tus respuestas se conservan." });
    } finally { clearTimeout(timer); busy.current = false; setWorking(false); }
  };
  return <section className="rounded-2xl border border-line bg-paper p-4" aria-label={labels[action]}>
    <button type="button" className="btn btn-secondary" disabled={working} onClick={() => void ask(labels[action])}>{working ? "Consultando…" : labels[action]}</button>
    {result && <div className="mt-4 space-y-3" aria-live="polite">
      {messages.filter(m => m.role === "assistant").slice(0, -1).map((m, i) => <p key={i} className="text-sm text-muted">{m.content}</p>)}
      <p role={result.peligro ? "alert" : "status"}>{result.respuesta}</p>
      {result.ejemplo && <p>{result.ejemplo} Es solo un ejemplo; usa lo que realmente te pasó.</p>}
      {!!result.pasos?.length && <ol className="list-decimal space-y-3 pl-5">{result.pasos.map((p, i) => <li key={i}>{p.texto} [{p.fuente}]<details><summary className="cursor-pointer py-2">Ver cita literal</summary><blockquote>{p.cita_literal}</blockquote></details></li>)}</ol>}
      {result.mejoras?.slice(0, 3).map((m, i) => <div key={i} className="rounded-xl bg-sand p-3"><p>{m.mensaje}</p>{m.cita_literal && <blockquote className="my-2">Tu texto: «{m.cita_literal}»</blockquote>}<button type="button" className="btn btn-secondary" onClick={() => editField?.(m.campo)}>Quiero revisar este dato</button></div>)}
      {result.alternativa && TOOLS[result.alternativa] && <p>Puedes explorar <Link className="underline" href={`/herramientas/${TOOLS[result.alternativa].slug}`}>{TOOLS[result.alternativa].name}</Link>. Tus respuestas de esta herramienta se conservan.</p>}
      {result.sources?.map(s => <p key={s.n} className="text-sm"><Link className="underline" href={`/biblioteca/${s.documentId}`}>[{s.n}] {s.title}</Link>{/^https?:\/\//.test(s.officialUrl || "") && <> · <a className="underline" href={s.officialUrl} target="_blank" rel="noreferrer">Fuente oficial</a></>}</p>)}
      {result.pregunta && <p>{result.pregunta}</p>}
      {action === "ayuda" && <form onSubmit={e => { e.preventDefault(); if (draft.trim()) void ask(draft.trim()); }} className="space-y-2">
        <label className="label" htmlFor={`ayuda-${field}`}>Seguir preguntando sobre esta respuesta</label>
        <textarea id={`ayuda-${field}`} className="input" value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} />
        <button className="btn btn-secondary" type="submit" disabled={working || !draft.trim()}>Enviar duda</button>
      </form>}
    </div>}
  </section>;
}
