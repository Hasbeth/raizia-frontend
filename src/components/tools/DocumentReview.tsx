"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildModel } from "@/lib/document-model";
import { reviewQuality } from "@/lib/tools-quality";
import { TOOLS, stepApplies, type ToolData } from "@/lib/tools-config";
import { ToolFields } from "./ToolFields";
import { JOURNEY } from "@/lib/tools-journey";
import { addBusinessDays, deadlineDays } from "@/lib/tools-deadlines";

function Marked({ text }: { text: string }) {
  return <>{text.split(/(\[completar: [^\]]+\])/g).map((part, i) => part.startsWith("[completar:") ? <mark key={i}>{part}</mark> : part)}</>;
}
export function DocumentReview({ kind, data, onChange, editField }: { kind: string; data: ToolData; onChange: (next: ToolData) => void; editField: (field: string) => void }) {
  const config = TOOLS[kind];
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const optionalFields = config.steps.filter(step => step.optionalDetails).flatMap(step => step.fields);
  const editAnswer = (name: string) => {
    if (optionalFields.some(field => field.name === name)) {
      if (detailsRef.current) detailsRef.current.open = true;
      document.getElementById(`dato-${name}`)?.focus();
    } else editField(name);
  };
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(kind === "impugnacion" ? String(data.fechaNotificacion || "") : "");
  const [phase, setPhase] = useState<"quality" | "preview">("quality");
  // Fija la misma fecha visible que se envía al generador, incluso al cambiar de día.
  const [date] = useState(() => new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" }));
  const prepared = useMemo(() => ({ ...data, fechaDocumento: date, ...Object.fromEntries(config.confirmations.map(c => [c.name, confirmed[c.name] ? "si" : ""])) }), [data, date, config, confirmed]);
  const model = buildModel(kind, prepared), quality = reviewQuality(kind, prepared);
  const primaryIssues = quality.issues.slice(0, 3), extraIssues = quality.issues.slice(3);
  const issueList = (issues: typeof quality.issues) => <ul className="mt-4 space-y-2">{issues.map((issue, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2"><span className="flex-1">{issue.message}</span>{issue.field && <button type="button" onClick={() => editAnswer(issue.field)} className="btn btn-secondary">Revisar</button>}</li>)}</ul>;
  const journey = JOURNEY[kind];
  const days = deadlineDays(kind, String(data.tipoPeticion || data.tipoReclamacion || ""));
  const estimated = days === null ? null : addBusinessDays(startDate, days);
  const generate = async () => {
    setWorking(true); setMessage("");
    try {
      const response = await fetch(`/api/tools/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prepared) });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error || "No se pudo preparar el Word. Intenta de nuevo."); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${config.fileName}.docx`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000); setDownloaded(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo descargar."); } finally { setWorking(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(model.email); setMessage("Correo copiado. Revisa los datos por completar antes de enviarlo."); } catch { setMessage("Selecciona el texto del correo y cópialo. Tu navegador no permitió copiarlo automáticamente."); } };
  return <div className="space-y-6">
    <section className="card p-5 sm:p-7" aria-labelledby="revision-calidad">
      <p className="eyebrow">Revisamos contigo</p><h2 id="revision-calidad" className="mt-2 text-2xl text-forest-900">Antes de preparar tu documento</h2>
      <p className={`mt-4 rounded-xl border p-4 font-semibold ${quality.level === "red" ? "border-red-300 bg-red-50 text-red-900" : quality.level === "amber" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-forest-300 bg-forest-50 text-forest-900"}`} role="status">{quality.level === "red" ? "Rojo · faltan respuestas obligatorias" : quality.level === "amber" ? "Amarillo · hay puntos para revisar" : "Verde · no encontramos datos pendientes"}</p>
      <p className="mt-3 text-sm text-muted">Es una ayuda para revisar, no una decisión sobre tu caso. Los avisos amarillos permiten continuar.</p>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Revisar mis respuestas</summary>{config.steps.filter(step => !step.optionalDetails && stepApplies(step, data)).map(step => <div key={step.id} className="my-3"><h3 className="text-lg text-forest-900">{step.title}</h3><div className="mt-2 grid gap-2">{step.fields.map(field => <button key={field.name} type="button" className="btn btn-secondary !justify-start !text-left" onClick={() => editAnswer(field.name)}>Cambiar: {field.label}</button>)}</div></div>)}</details>
      {issueList(primaryIssues)}
      <details ref={detailsRef} className="mt-4"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Agregar más detalles (opcional)</summary>
        {issueList(extraIssues)}
        {quality.missing.length > 0 && <div className="mt-4"><p className="font-semibold">Datos por completar ({quality.missing.length})</p><ul className="space-y-2">{quality.missing.map(item => <li key={item}><mark>{item}</mark></li>)}</ul></div>}
        {optionalFields.length > 0 && <><p className="my-4 text-sm text-muted">Completa solo lo que sabes. El plazo es el que tú pides; no se propone ninguno automáticamente.</p><ToolFields fields={optionalFields} data={data} onChange={(name, value) => onChange({ ...data, [name]: value })} /></>}
      </details>
      {phase === "quality" && <button type="button" className="btn btn-primary mt-5" onClick={() => setPhase("preview")}>Ver y editar el documento</button>}
    </section>
    {phase === "preview" && <>
      <div><h2 className="text-2xl text-forest-900">Así quedará tu documento</h2><p className="mt-2 text-muted">Lee cada sección. Puedes editarla aquí o volver a tus respuestas. El Word usará este mismo texto; los saltos de página dependen del programa con que lo abras.</p></div>
      <article className="document-preview" aria-label="Vista previa del documento">
        <p><Marked text={model.date} /></p><div className="my-6">{model.addressee.map((line, i) => <p key={i}><Marked text={line} /></p>)}</div>
        <div className="my-6 font-bold">{model.reference.map((line, i) => <p key={i}><Marked text={line} /></p>)}</div><p><Marked text={model.intro} /></p>
        {model.sections.map(section => <section key={section.id} className="mt-7"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="!font-serif text-base font-bold">{section.title}</h3><button type="button" className="btn btn-ghost !font-sans" onClick={() => setEditing(editing === section.id ? null : section.id)}>{editing === section.id ? "Terminar edición" : "Editar sección"}</button></div>
          {editing === section.id ? <><label htmlFor={`edicion-${section.id}`} className="sr-only">Editar {section.title}</label><textarea id={`edicion-${section.id}`} className="input mt-3 min-h-60" maxLength={16000} value={typeof data[`edicion_${section.id}`] === "string" ? String(data[`edicion_${section.id}`]) : section.paragraphs.join("\n\n")} onChange={event => onChange({ ...data, [`edicion_${section.id}`]: event.target.value })} /><button type="button" className="btn btn-secondary mt-2" onClick={() => { const next = { ...data }; delete next[`edicion_${section.id}`]; onChange(next); }}>Restaurar desde mis respuestas</button></> : section.paragraphs.map((text, i) => <p key={i} className="mt-3 whitespace-pre-line"><Marked text={text} /></p>)}
        </section>)}
        <div className="mt-12">{model.signature.map((text, i) => <p key={i}><Marked text={text} /></p>)}</div><p className="mt-10 text-center text-sm">El Word incluye numeración automática de páginas.</p>
      </article>
      <section className="card p-6"><h2 className="text-2xl text-forest-900">Correo para enviar el documento</h2><p className="mt-2 text-muted">Adjunta el Word revisado. Confirma el correo oficial de la entidad o del juzgado.</p><label className="sr-only" htmlFor="correo-remision">Correo de remisión listo para copiar</label><textarea id="correo-remision" readOnly value={model.email} className="input mt-4 min-h-64" /><button type="button" onClick={copy} className="btn btn-secondary mt-3">Copiar correo</button></section>
      <div className="space-y-3">{config.confirmations.map(c => <label key={c.name} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4"><input className="mt-1 h-5 w-5 accent-forest-700" type="checkbox" checked={!!confirmed[c.name]} onChange={e => setConfirmed({ ...confirmed, [c.name]: e.target.checked })} /><span>{c.label}</span></label>)}</div>
      <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Recuerda antes de presentar</summary><ul className="list-disc space-y-2 pl-5">{config.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>
      <button type="button" className="btn btn-accent w-full !min-h-14" disabled={working || quality.level === "red" || !config.confirmations.every(c => confirmed[c.name])} onClick={generate}>{working ? "Preparando…" : "Descargar documento Word"}</button>
      {!config.confirmations.every(c => confirmed[c.name]) && <p className="text-sm text-muted">Confirma las declaraciones para descargar. Los datos amarillos se pueden completar después.</p>}
    </>}
    {message && <p role="status" className="notice">{message}</p>}
    {downloaded && <section className="rounded-[2rem] border border-forest-300 bg-forest-50 p-6 sm:p-8" aria-labelledby="que-sigue"><p className="eyebrow">Tu siguiente paso</p><h2 id="que-sigue" className="mt-2 text-3xl text-forest-900">Qué sigue</h2><p className="mt-4">La descarga se inició. Busca el archivo en Descargas, revisa los datos resaltados y firma el documento.</p><ol className="mt-5 list-decimal space-y-4 pl-5"><li>{journey.where}{kind === "tutela" && <p className="mt-2 font-semibold">Opción digital: busca «Tutela en Línea» en el sitio oficial de la Rama Judicial.</p>}</li><li>Guarda el documento enviado y la constancia: número de radicación, fecha, sello o correo de recibo. Una foto también te ayuda a conservarla.</li><li>{journey.term}</li></ol>
      {days !== null && <div className="mt-5 rounded-2xl bg-paper p-5"><label htmlFor="fecha-radicacion" className="label">{kind === "impugnacion" ? "Fecha de notificación del fallo" : "Fecha en que recibieron tu documento"}</label><input id="fecha-radicacion" type="date" value={startDate} className="input" onChange={e => setStartDate(e.target.value)} /><p className="mt-3" role="status">{estimated ? `Fecha estimada: ${estimated} (${days} días hábiles, desde el día siguiente).` : "Elige una fecha válida para calcular una estimación."}</p><p className="mt-2 text-sm text-muted">Se excluyen sábados, domingos y festivos nacionales de Colombia. Confirma con la entidad o el juzgado: cierres locales, suspensiones o prórrogas pueden cambiar la fecha. No esperes al último día.</p></div>}
      <h3 className="mt-6 text-xl text-forest-900">Si no responden o el problema sigue</h3><p className="mt-2">{journey.next}</p><Link className="btn btn-primary mt-4" href={`/herramientas/${TOOLS[kind === "reclamacion" && String(data.tipoReclamacion).startsWith("Antes de una acción popular") ? "popular" : journey.nextKind].slug}`}>Conocer el siguiente paso</Link>{kind === "tutela" && <Link className="btn btn-secondary mt-3 ml-2" href={`/herramientas/${TOOLS.impugnacion.slug}`}>Revisar impugnación</Link>}
    </section>}
  </div>;
}
