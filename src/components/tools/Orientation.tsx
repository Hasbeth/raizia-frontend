"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, LoaderCircle, Mic, Volume2 } from "lucide-react";
import type { OrientationResult, Route } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/speech";
import { recognitionConstructor, type Recognition } from "@/lib/dictation";
import { loadProfile } from "../chat/ProfileStep";
import { RouteCards } from "./RouteCards";
import { explicitDanger, EMERGENCY_NOTICE } from "@/lib/emergency";
import { saveCase } from "@/lib/case-context";
import type { ConversationMessage } from "@/lib/tools-conversation";

type Mechanism = { id: string; title: string; tool?: { slug: string; name: string; label: string }; medidaProvisional: boolean; porque: string };
type Turn = { respuesta: string; mecanismo: Mechanism | null; avanzar: boolean; peligro: boolean };
const GREETING = "¿No sabes qué mecanismo necesitas? Cuéntame con tus palabras qué pasó y vemos cómo ayudarte.";
const STORE = "raizia.borrador.orientador";

/** Del relato libre al mecanismo: conversa primero y lleva el caso a la herramienta sin repetirlo. */
export function Orientation() {
  const router = useRouter();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [mechanism, setMechanism] = useState<Mechanism | null>(null);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [danger, setDanger] = useState(false);
  const [routes, setRoutes] = useState<OrientationResult | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [listening, setListening] = useState(false);
  const request = useRef<AbortController | null>(null);
  const voice = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { const saved = JSON.parse(window.sessionStorage.getItem(STORE) || "null"); if (Array.isArray(saved?.messages)) { setMessages(saved.messages); setMechanism(saved.mechanism || null); } } catch { /* sin almacenamiento */ }
    });
    return () => { window.cancelAnimationFrame(frame); request.current?.abort(); voice.current?.abort(); stopSpeaking(); };
  }, []);
  useEffect(() => {
    try { if (messages.length) window.sessionStorage.setItem(STORE, JSON.stringify({ messages, mechanism })); } catch { /* sin almacenamiento */ }
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, mechanism]);

  const prepare = (m: Mechanism, list: ConversationMessage[]) => {
    if (!m.tool) return;
    try { saveCase(window.sessionStorage, list, m.medidaProvisional); window.sessionStorage.removeItem(STORE); } catch { /* sin almacenamiento */ }
    router.push(`/herramientas/${m.tool.slug}`);
  };
  const send = async (value = draft) => {
    const text = value.trim();
    if (!text || working) return;
    const sent: ConversationMessage[] = [...messages, { role: "user", content: text.slice(0, 2000) }];
    voice.current?.stop(); setMessages(sent); setDraft(""); setError(""); setRoutes(null); stopSpeaking();
    if (explicitDanger(text)) { setDanger(true); setMessages([...sent, { role: "assistant", content: `${EMERGENCY_NOTICE} ¿Estás a salvo ahora?` }]); return; }
    const controller = new AbortController(); request.current = controller; setWorking(true);
    const timer = window.setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch("/api/tools/acompanar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: sent.slice(-16) }), signal: controller.signal });
      const body = await res.json() as Turn & { error?: string };
      if (!res.ok || typeof body.respuesta !== "string") throw new Error(body.error || "orientacion");
      const list: ConversationMessage[] = [...sent, { role: "assistant", content: body.respuesta }];
      setMessages(list); if (body.mecanismo) setMechanism(body.mecanismo); if (body.peligro) setDanger(true);
      if (body.avanzar && body.mecanismo?.tool) prepare(body.mecanismo, list);
    } catch (e) {
      setDraft(text); setMessages(messages);
      setError(e instanceof Error && e.message !== "orientacion" && e.name !== "AbortError" ? e.message : "Se me dificultó responder. Tu mensaje sigue aquí; intenta de nuevo.");
    } finally { window.clearTimeout(timer); if (request.current === controller) { request.current = null; setWorking(false); } }
  };
  const showRoutes = async () => {
    const story = messages.filter(m => m.role === "user").map(m => m.content).join("\n").slice(0, 8000);
    setLoadingRoutes(true); setError("");
    try {
      const res = await fetch("/api/tools/orientar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: story, profile: loadProfile() }) });
      if (!res.ok) throw new Error("rutas");
      setRoutes(await res.json() as OrientationResult);
    } catch { setError("No pude cargar los caminos ahora. Puedes seguir conversando."); }
    finally { setLoadingRoutes(false); }
  };
  const dictate = () => {
    if (listening) { voice.current?.stop(); return; }
    const Constructor = recognitionConstructor();
    if (!Constructor) { setError("Este navegador no permite dictado. Puedes escribir."); return; }
    const recognition = new Constructor(); voice.current = recognition;
    recognition.lang = "es-CO"; recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = event => {
      const pieces: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) pieces.push(event.results[i][0].transcript);
      if (pieces.length) setDraft(previous => `${previous} ${pieces.join(" ")}`.trim().slice(0, 2000));
    };
    recognition.onerror = () => { setListening(false); setError("No pude escuchar. Revisa el permiso del micrófono o escribe."); };
    recognition.onend = () => setListening(false);
    try { recognition.start(); setListening(true); } catch { setError("No se pudo iniciar el micrófono. Puedes escribir."); }
  };
  const restart = () => {
    request.current?.abort(); stopSpeaking(); setMessages([]); setMechanism(null); setRoutes(null); setDraft(""); setError(""); setDanger(false);
    try { window.sessionStorage.removeItem(STORE); } catch { /* sin almacenamiento */ }
  };
  const bubble = (m: ConversationMessage, i: number) => <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-3xl rounded-tr-lg bg-forest-700 px-5 py-3 text-paper" : "max-w-[92%] rounded-3xl rounded-tl-lg border border-line bg-paper px-5 py-3"}>
    <p className="sr-only">{m.role === "user" ? "Tú:" : "RAIZIA:"}</p><p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{m.content}</p>
    {m.role === "assistant" && <button type="button" onClick={() => speak(m.content)} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-forest-700"><Volume2 size={16} />Escuchar</button>}
  </div>;

  return <div className="mx-auto w-full max-w-2xl">
    <div className="flex items-center justify-between"><Link href="/herramientas" className="btn btn-ghost btn-sm -ml-3 text-muted"><ArrowLeft size={16} />Herramientas</Link>{!!messages.length && <button type="button" className="btn btn-ghost btn-sm" onClick={restart}>Empezar de nuevo</button>}</div>
    <p className="eyebrow mt-5">Orientación</p>
    <h1 className="mt-2 text-3xl text-forest-900 md:text-4xl">Cuéntame qué pasó</h1>
    <p className="mt-2 text-sm text-muted">Lo que escribes se envía a Gemini para orientarte. No escribas tu cédula ni datos que no hagan falta.</p>
    {danger && <p role="alert" className="mt-4 rounded-2xl border border-clay p-4 font-semibold">{EMERGENCY_NOTICE} <a href="tel:123" className="underline">Llamar al 123</a></p>}
    <div role="log" aria-live="polite" aria-label="Conversación" className="mt-6 flex flex-col gap-3">
      {bubble({ role: "assistant", content: GREETING }, -1)}
      {messages.map(bubble)}
      {working && <p role="status" className="flex items-center gap-2 text-muted"><LoaderCircle size={16} className="animate-spin" />Pensando en lo que me cuentas…</p>}
      <div ref={end} />
    </div>
    {mechanism?.tool && !working && <section className="card mt-5 p-5" aria-label="Camino recomendado">
      <p className="eyebrow">Camino que podemos evaluar</p><h2 className="mt-1 text-2xl text-forest-900">{mechanism.title}</h2>
      {mechanism.porque && <p className="mt-2">{mechanism.porque}</p>}
      {mechanism.medidaProvisional && <p className="mt-2 font-medium">Por la urgencia, se le puede pedir al juez una medida provisional. Él decide si la concede.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="btn btn-primary" onClick={() => prepare(mechanism, messages)}>{mechanism.tool.label}<ArrowRight size={17} /></button>
        <button type="button" className="btn btn-secondary" disabled={loadingRoutes} onClick={() => void showRoutes()}>{loadingRoutes ? "Buscando…" : "Ver caminos y fuentes"}</button></div>
    </section>}
    {!!routes?.routes.length && <section className="mt-6"><h2 className="mb-4 text-2xl text-forest-900">Caminos según tu situación</h2><RouteCards routes={routes.routes as Route[]} story={messages.filter(m => m.role === "user").map(m => m.content).join("\n")} /></section>}
    <form className="mt-5" onSubmit={e => { e.preventDefault(); void send(); }}>
      <label htmlFor="relato" className="sr-only">Lo que quieres contar</label>
      <textarea id="relato" rows={3} maxLength={2000} value={draft} disabled={working} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Escribe como hablas…" className="input !rounded-3xl !p-4 !text-[1.0625rem]" />
      {error && <p role="alert" className="mt-2 font-medium text-[#9b2c1f]">{error}</p>}
      <div className="mt-3 flex gap-2"><button type="submit" disabled={working || !draft.trim()} className="btn btn-primary"><ArrowUp size={17} />Enviar</button><button type="button" className="btn btn-secondary" onClick={dictate}><Mic size={16} />{listening ? "Detener" : "Dictar"}</button></div>
    </form>
    <p className="mt-5 text-sm text-muted">Es orientación general, no una decisión jurídica.</p>
  </div>;
}
