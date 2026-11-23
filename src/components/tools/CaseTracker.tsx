"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addBusinessDays, parseDate } from "@/lib/tools-deadlines";
import { TOOLS } from "@/lib/tools-config";

export const TUTELA_ONLINE = "https://procesojudicial.ramajudicial.gov.co/TutelaEnLinea";
type Tracking = { radicada: string; expediente: string; juzgado: string; medida: string; notificada: string; decision: string };
const EMPTY: Tracking = { radicada: "", expediente: "", juzgado: "", medida: "", notificada: "", decision: "" };
const KEY = "raizia.borrador.seguimiento.tutela";
const longDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** La vacancia judicial puede cambiar la atención del despacho: se advierte sin suponer el resultado. */
export function crossesJudicialRecess(start: string, end: string) {
  const from = parseDate(start), to = parseDate(end);
  if (!from || !to) return false;
  for (let y = from.getUTCFullYear() - 1; y <= to.getUTCFullYear(); y++) {
    const a = Date.UTC(y, 11, 20), b = Date.UTC(y + 1, 0, 10);
    if (from.getTime() <= b && to.getTime() >= a) return true;
  }
  return false;
}

export function CaseTracker() {
  const [form, setForm] = useState<Tracking>(EMPTY);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { const saved = window.localStorage.getItem(KEY); if (saved) setForm({ ...EMPTY, ...JSON.parse(saved) }); } catch { /* sin almacenamiento */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const update = (name: keyof Tracking, value: string) => {
    const next = { ...form, [name]: value };
    setForm(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sigue funcionando en pantalla */ }
  };
  const fallo = form.radicada ? addBusinessDays(form.radicada, 10) : null;
  const impugnar = form.notificada ? addBusinessDays(form.notificada, 3) : null;
  const text = (name: keyof Tracking, label: string) => <div><label htmlFor={`seguimiento-${name}`} className="label">{label}</label><input id={`seguimiento-${name}`} className="input" maxLength={120} value={form[name]} onChange={e => update(name, e.target.value)} /></div>;
  const date = (name: keyof Tracking, label: string) => <div><label htmlFor={`seguimiento-${name}`} className="label">{label}</label><input id={`seguimiento-${name}`} type="date" className="input" value={form[name]} onChange={e => update(name, e.target.value)} /></div>;
  const select = (name: keyof Tracking, label: string, options: string[]) => <div><label htmlFor={`seguimiento-${name}`} className="label">{label}</label><select id={`seguimiento-${name}`} className="input" value={form[name]} onChange={e => update(name, e.target.value)}><option value="">Aún no sé</option>{options.map(o => <option key={o}>{o}</option>)}</select></div>;
  return <section className="mt-5 rounded-2xl bg-paper p-5" aria-labelledby="seguimiento-tutela">
    <h3 id="seguimiento-tutela" className="text-xl text-forest-900">Seguir mi tutela</h3>
    <p className="mt-1 text-sm text-muted">Se guarda solo en este dispositivo. Usa «Borrar mis datos» si lo compartes.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {date("radicada", "Fecha en que la presentaste")}{text("expediente", "Número de expediente o radicado")}{text("juzgado", "Juzgado")}
      {select("medida", "¿Qué pasó con la medida provisional?", ["No la pedí", "Sin decidir", "La concedieron", "La negaron"])}
      {date("notificada", "Fecha en que te notificaron el fallo")}{select("decision", "¿Qué decidió el juez?", ["A mi favor", "En parte", "En contra"])}
    </div>
    <div className="mt-4 space-y-3" role="status">
      {fallo && <p><strong>Fallo, fecha orientativa:</strong> hasta el {longDate(fallo)}, contando 10 días hábiles sin festivos. El juzgado puede contarlo distinto.</p>}
      {form.medida === "Sin decidir" && <p>La medida provisional puede decidirse antes del fallo. Si la situación de salud empeora, no esperes: ve a urgencias.</p>}
      {impugnar && form.decision !== "A mi favor" && <p><strong>Para impugnar:</strong> tienes hasta el {longDate(impugnar)} (3 días siguientes a la notificación). Confirma la fecha con el juzgado y no esperes al último día.</p>}
      {form.decision === "A mi favor" && <p>La entidad debe cumplir sin demora y en el plazo que diga el fallo. Si no cumple, puedes pedirle al juzgado que lo haga cumplir.</p>}
      {fallo && crossesJudicialRecess(form.radicada, fallo) && <p>Estas fechas cruzan la vacancia judicial de fin de año. Pregunta en el juzgado o en la personería cómo se está contando.</p>}
      <p className="text-sm text-muted">Son fechas de ayuda, no una garantía. Pueden cambiar por cierres, suspensiones o la forma de notificar.</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {form.decision && form.decision !== "A mi favor" && <Link className="btn btn-primary" href={`/herramientas/${TOOLS.impugnacion.slug}`}>Preparar impugnación</Link>}
      {form.decision && form.decision !== "En contra" && <Link className="btn btn-secondary" href={`/herramientas/${TOOLS.desacato.slug}`}>Si no cumplen: desacato</Link>}
    </div>
  </section>;
}
