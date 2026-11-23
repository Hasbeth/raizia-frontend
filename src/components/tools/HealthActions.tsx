"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCase } from "@/lib/case-context";
import { buildClaimDraft, claimDocument, detectHealthCase, SUPERSALUD_PORTAL, TUTELA_PORTAL } from "@/lib/health-route";
import type { ConversationMessage } from "@/lib/tools-conversation";
import type { ToolData } from "@/lib/tools-config";

/** Caminos de salud: primero la atención médica; tutela y reclamo son documentos separados. */
export function HealthActions({ story, data, messages, inTutela = false }: { story: string; data?: ToolData; messages?: ConversationMessage[]; inTutela?: boolean }) {
  const router = useRouter();
  const health = detectHealthCase(story);
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  if (!health) return null;
  const urgent = health.level === "urgente", serious = urgent || health.level === "grave";
  const text = draft ?? "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNotice("Reclamo copiado. Pégalo en el formulario de Supersalud y completa lo marcado."); }
    catch { setNotice("Tu navegador no permitió copiar. Selecciona el texto y cópialo."); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([claimDocument(text)], { type: "application/msword" }));
    const link = document.createElement("a"); link.href = url; link.download = "Reclamo-Supersalud.doc"; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNotice("Descargaste el borrador. Todavía no se ha presentado.");
  };
  const prepareTutela = () => {
    try { saveCase(window.sessionStorage, messages?.length ? messages : [{ role: "user", content: story.slice(0, 2000) }], serious); } catch { /* sin almacenamiento */ }
    router.push("/herramientas/tutela");
  };
  return <section className="card mt-5 space-y-4 p-5" aria-label="Qué hacer con tu caso de salud">
    {urgent ? <div role="alert" className="rounded-2xl border border-red-400 bg-red-50 p-4 text-red-950">
      <p className="font-semibold">Primero tu salud: ve ya a urgencias o llama al 123.</p>
      <p className="mt-1">No esperes ningún papel. En urgencias deben atenderte aunque el trámite con la EPS esté pendiente. Los reclamos se hacen después o los puede hacer alguien de tu familia.</p>
      <a href="tel:123" className="btn btn-primary mt-3">Llamar al 123</a>
    </div> : <p className="rounded-2xl bg-ochre-soft p-4"><strong>Cuida tu salud mientras reclamas.</strong> No cambies ni dejes tu tratamiento por tu cuenta. Si te sientes muy mal, te falta el aire, te desmayas, tienes dolor fuerte en el pecho o se te acaba el medicamento, ve a urgencias o llama al 123.</p>}
    <div>
      <h3 className="text-xl text-forest-900">Lo que puedes hacer</h3>
      {serious ? <p className="mt-1">Como es un caso delicado, puedes hacer <strong>las dos cosas al mismo tiempo</strong>: la tutela y el reclamo a Supersalud. No tienes que esperar la respuesta del reclamo para presentar la tutela.</p>
        : <p className="mt-1">Puedes reclamar a tu EPS y a Supersalud. Si no solucionan o el problema afecta tu salud, puedes evaluar una tutela.</p>}
      {health.eps && <p className="mt-1">La tutela se dirige contra <strong>{health.eps}</strong>. Supersalud no va como demandada, salvo que los hechos muestren que ella misma falló.</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-line p-4"><h4 className="font-semibold">Acción de tutela</h4>
        <p className="mt-1 text-sm">{serious ? "Puedes pedirle al juez una medida provisional (art. 7 del Decreto 2591 de 1991). El juez decide si la concede." : "Le pide a un juez proteger tu derecho."}</p>
        <div className="mt-3 flex flex-wrap gap-2">{!inTutela && <button type="button" className="btn btn-primary" onClick={prepareTutela}>Preparar tutela</button>}<a className="btn btn-secondary" href={TUTELA_PORTAL} target="_blank" rel="noreferrer noopener">Abrir Tutela en Línea</a></div></div>
      <div className="rounded-2xl border border-line p-4"><h4 className="font-semibold">Reclamo a Supersalud</h4>
        <p className="mt-1 text-sm">Supersalud vigila a las EPS. Usamos lo que ya contaste.</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn btn-primary" onClick={() => setDraft(buildClaimDraft(story, data))}>Preparar reclamo</button><a className="btn btn-secondary" href={SUPERSALUD_PORTAL} target="_blank" rel="noreferrer noopener">Abrir Supersalud</a></div></div>
    </div>
    {draft !== null && <div><label htmlFor="borrador-reclamo" className="label">Borrador del reclamo (puedes editarlo)</label>
      <textarea id="borrador-reclamo" className="input min-h-72" value={text} maxLength={12000} onChange={e => setDraft(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn btn-secondary" onClick={() => void copy()}>Copiar</button><button type="button" className="btn btn-secondary" onClick={download}>Descargar Word</button></div></div>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <p className="text-sm text-muted">Nada de esto se ha presentado todavía. Solo queda radicado cuando lo envías en el portal y recibes un número o comprobante.</p>
  </section>;
}
