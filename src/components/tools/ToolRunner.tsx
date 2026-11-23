"use client";

import { useState } from "react";
import { Interview } from "./Interview";
import { TOOLS } from "@/lib/tools-config";
import { JOURNEY, NEEDS } from "@/lib/tools-journey";
import { speak } from "@/lib/speech";
import Link from "next/link";

/**
 * Cada herramienta se puede usar de dos maneras con los mismos datos:
 * como conversación (una pregunta a la vez) o como formulario tradicional.
 */
export function ToolRunner({ kind }: { kind: string }) {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"conversation" | "steps">("steps");
  const tool = TOOLS[kind], journey = JOURNEY[kind];
  if (started) return <Interview kind={kind} initialMode={mode} />;
  return <section className="tools-flow mx-auto max-w-2xl">
    <Link href="/herramientas" className="btn btn-ghost">Volver a Herramientas</Link>
    <div className="mt-5 rounded-[2rem] bg-forest-800 p-7 text-paper sm:p-10"><p className="eyebrow !text-forest-100">Antes de empezar · unos {tool.minutes} minutos</p><h1 className="mt-4 text-3xl sm:text-4xl">{tool.name}</h1><p className="mt-4 text-lg leading-relaxed">{tool.description}</p></div>
    <div className="card mt-5 space-y-5 p-6 sm:p-8">
      <div><h2 className="text-xl text-forest-900">Ten a mano</h2><p className="mt-2">{journey.before}</p></div>
      <div><h2 className="text-xl text-forest-900">Dónde se presenta</h2><p className="mt-2">{journey.where}</p></div>
      <div><h2 className="text-xl text-forest-900">Qué plazo tiene</h2><p className="mt-2">{journey.term}</p></div>
      <p className="rounded-xl bg-sand p-4">{NEEDS.find(n => n.kind === kind)?.avoid || tool.warnings[0]}</p>
      <p className="text-sm text-muted">Una pregunta a la vez. Puedes guardar y volver. El avance queda en este dispositivo; si lo compartes, usa «Borrar mis datos» al terminar.</p>
      {<div className="grid gap-3 sm:grid-cols-2"><button type="button" className="btn btn-primary min-h-16 w-full" onClick={() => { setMode("conversation"); setStarted(true); }}>Contarlo conversando</button><button type="button" className="btn btn-primary min-h-16 w-full" onClick={() => { setMode("steps"); setStarted(true); }}>Responder paso a paso</button></div>}
      <button type="button" className="btn btn-secondary" onClick={() => speak(`${tool.description} Ten a mano: ${journey.before} ${journey.where} ${journey.term}`)}>Escuchar</button>
    </div>
  </section>;
}
