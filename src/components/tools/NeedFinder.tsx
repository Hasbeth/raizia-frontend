"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { NEEDS } from "@/lib/tools-journey";
import { TOOLS } from "@/lib/tools-config";
export function NeedFinder() {
  const [selected, setSelected] = useState<number | null>(null);
  const need = selected === null ? null : NEEDS[selected];
  return <section className="tools-flow mt-8" aria-label="Elige lo que necesitas resolver">
    <div className="grid gap-3 sm:grid-cols-2">{NEEDS.map((item, i) => <button key={item.kind + i} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={`flex min-h-20 items-center justify-between gap-4 rounded-2xl border p-5 text-left text-lg font-medium transition-colors ${selected === i ? "border-forest-700 bg-forest-800 text-paper" : "border-line bg-paper text-forest-900 hover:border-forest-500"}`}>{item.label}<ArrowRight size={20} className="shrink-0" /></button>)}</div>
    {need && <div className="card mt-5 border-forest-300 p-6" aria-live="polite"><p className="eyebrow">Un camino posible</p><h2 className="mt-2 text-2xl text-forest-900">{TOOLS[need.kind].name}</h2><p className="mt-3">{need.why}</p><p className="mt-3 text-muted"><strong>Cuándo puede no servir:</strong> {need.avoid}</p><div className="mt-5 flex flex-wrap gap-3"><Link className="btn btn-primary" href={`/herramientas/${TOOLS[need.kind].slug}`}>Conocer este paso <ArrowRight size={18} /></Link><Link className="btn btn-secondary" href="/herramientas/orientacion"><Compass size={18} />{need.orientation ? "Ya presenté una petición" : "Necesito orientación"}</Link></div></div>}
  </section>;
}
