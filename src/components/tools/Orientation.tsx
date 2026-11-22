"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Compass, LoaderCircle } from "lucide-react";
import type { OrientationResult } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/speech";
import { loadProfile } from "../chat/ProfileStep";
import { RouteCards } from "./RouteCards";
import { explicitDanger, EMERGENCY_NOTICE } from "@/lib/emergency";
import { appendOrientationAnswer, pendingOrientationQuestions } from "@/lib/orientation-flow";

/** Cada respuesta amplía únicamente las palabras aportadas por la persona. */
export function Orientation() {
  const [story, setStory] = useState("");
  const [analyzedStory, setAnalyzedStory] = useState("");
  const [result, setResult] = useState<OrientationResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const answered = useRef<string[]>([]);
  useEffect(() => () => { request.current?.abort(); stopSpeaking(); }, []);

  const orient = async (text = story) => {
    if ((!explicitDanger(text) && text.trim().length < 12) || text.length > 8000) {
      setError("Cuéntame qué pasó en un relato de entre 12 y 8000 caracteres.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(""); setLoading(true); setResult(null); stopSpeaking();
    try {
      const res = await fetch("/api/tools/orientar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, profile: loadProfile() }), signal: controller.signal,
      });
      if (!res.ok) throw new Error("orientacion");
      const body = await res.json() as OrientationResult;
      if (controller.signal.aborted) return;
      setResult({ ...body, preguntas: pendingOrientationQuestions(body.preguntas, answered.current) }); setAnalyzedStory(text); setAnswer("");
    } catch {
      if (!controller.signal.aborted) setError("No pude orientarte en este momento. Intenta de nuevo.");
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  };
  const question = result?.preguntas[0];
  const respond = (value: string) => {
    if (!value.trim() || loading || !question) return;
    const expanded = appendOrientationAnswer(analyzedStory, question, value);
    answered.current.push(question.texto);
    setStory(expanded); void orient(expanded);
  };
  const correct = () => {
    request.current?.abort(); request.current = null; setLoading(false);
    setResult(null); stopSpeaking(); input.current?.focus();
    answered.current = [];
  };
  const speech = result ? [result.emergency, result.notice, result.motiveNote, "Esto fue lo que entendí", ...result.entendi,
    question?.texto, ...result.routes.flatMap(r => [r.title, r.condition, r.why, ...r.steps]), ...(result.cases || [])].filter(Boolean).join(". ") : "";

  return <div className="mx-auto w-full max-w-2xl">
    <Link href="/herramientas" className="btn btn-ghost btn-sm -ml-3 text-muted"><ArrowLeft size={16} />Herramientas</Link>
    <p className="eyebrow mt-5">Orientación</p>
    <h1 className="mt-2 text-3xl text-forest-900 md:text-4xl">Cuéntame qué pasó y revisemos los caminos</h1>
    <p className="mt-3 text-lg leading-relaxed text-muted">No necesitas saber el nombre del documento ni de la entidad. Escribe como hablas.</p>
    <form onSubmit={e => { e.preventDefault(); void orient(); }} className="mt-7">
      <label htmlFor="relato" className="font-semibold">Qué pasó</label>
      <textarea ref={input} id="relato" rows={6} maxLength={8000} value={story} disabled={loading}
        onChange={e => { setStory(e.target.value); setResult(null); setError(""); answered.current = []; }}
        placeholder="Cuéntame lo que ocurrió, con tus propias palabras…" className="input mt-2 !rounded-3xl !p-5 !text-[1.0625rem]" />
      {error && <p role="alert" className="mt-2 font-medium text-[#9b2c1f]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary mt-4 w-full sm:w-auto">
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Compass size={18} />}
        {loading ? "Analizando tu caso…" : error ? "Reintentar" : "Orientarme"}
      </button>
      {loading && <p role="status" className="mt-2 text-sm">Analizando tu caso…</p>}
    </form>
    {explicitDanger(story) && !result?.emergency && <p role="alert" className="mt-4 rounded-2xl border border-clay p-4 font-semibold">{EMERGENCY_NOTICE} <a href="tel:123" className="underline">Llamar al 123</a></p>}
    {result && <section className="animate-rise mt-9" aria-live="polite" aria-busy={loading}>
      {result.emergency && <p role="alert" className="rounded-2xl border border-clay p-4 font-semibold">{result.emergency} <a href="tel:123" className="underline">Llamar al 123</a></p>}
      {result.notice && <p role="status" className="my-4 rounded-2xl bg-ochre-soft p-4">{result.notice}</p>}
      {result.limitNotice && <p className="my-3">{result.limitNotice}</p>}
      <h2 className="text-2xl text-forest-900">Esto fue lo que entendí</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">{result.entendi.map((text, i) => <li key={i}>{text}</li>)}</ul>
      <div className="my-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={correct}>No es así, corregir</button>
        <button type="button" className="btn btn-secondary" onClick={() => speak(speech)}>Escuchar</button>
        <button type="button" className="btn btn-ghost" onClick={stopSpeaking}>Detener lectura</button>
        <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void orient(analyzedStory)}>Reintentar análisis</button>
      </div>
      {result.general && <p className="mt-3">{result.general}</p>}
      {result.motiveNote && <p className="mt-3">{result.motiveNote}</p>}
      {question && <form className="card mt-6 p-5" onSubmit={e => { e.preventDefault(); respond(answer); }}>
        <label htmlFor="respuesta-orientacion" className="font-semibold text-forest-900">{question.texto}</label>
        {!!question.opciones?.length && <div className="my-3 flex flex-wrap gap-2">{question.opciones.map(option =>
          <button key={option} type="button" disabled={loading} className="btn btn-secondary" onClick={() => respond(option)}>{option}</button>)}</div>}
        <textarea id="respuesta-orientacion" className="input mt-3" rows={3} value={answer} maxLength={1500} onChange={e => setAnswer(e.target.value)} disabled={loading} />
        <button className="btn btn-primary mt-3" disabled={loading || !answer.trim()}>Responder y continuar</button>
      </form>}
      {!!result.routes.length && <><h2 className="mt-8 mb-4 text-2xl text-forest-900">Caminos según tu situación</h2><RouteCards routes={result.routes} story={analyzedStory} /></>}
      {!!result.cases?.length && <><h2 className="mt-8 text-2xl">Qué ha pasado en casos parecidos</h2>{result.cases.map((c, i) => <p className="mt-2" key={i}>{c}</p>)}</>}
      {!!result.sources.length && <details className="mt-5"><summary className="cursor-pointer font-semibold">Fuentes consultadas</summary>
        <ul className="mt-3 space-y-3">{result.sources.map(s => <li key={s.n}>
          <span className="chip chip-earth mr-2">{s.docType}</span>
          <Link className="underline" href={`/biblioteca/${s.documentId}#f-${s.chunkId}`}>[{s.n}] {s.title}</Link>
          {s.docDate && <span> · {s.docDate}</span>}
          {s.kind === "contexto" && <span> · Contexto</span>}
        </li>)}</ul>
      </details>}
      <p className="mt-5 text-sm text-muted">Es orientación general a partir de tu relato y las fuentes consultadas, no una decisión jurídica.</p>
    </section>}
  </div>;
}
