export const TUTELA_PORTAL = "https://procesojudicial.ramajudicial.gov.co/TutelaEnLinea";
export const SUPERSALUD_PORTAL = "https://superargo.supersalud.gov.co/2/formularioWeb/pqrd.php";
export type HealthLevel = "urgente" | "grave" | "ordinario";
export type HealthCase = { level: HealthLevel; eps: string };
type Data = Record<string, string | string[] | undefined>;

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SUBJECT = /\beps\b|insulina|medicament|medicina|formula medica|cita (?:medica|con|de)|cirugia|especialista|remision|dialisis|quimioterapia|radioterapia|tratamiento|\bexamen(?:es)?\b/;
const BARRIER = /\bno (?:me |nos |le |les )?(?:dan|da|entregan|entrega|autorizan|autoriza|hay|quieren|atienden|atiende|cubren|cubre|pagan|paga)\b|neg(?:aron|ado|ando)|niegan?\b|demora|sin (?:medicament|medicina|insulina|cita|tratamiento)|hay que esperar|me queda|se me acab|no responden/;
const SIGNS = /dolor (?:fuerte )?(?:en|del) (?:el )?pecho|no (?:puedo|puede) respirar|(?:me|le) cuesta respirar|ahog(?:o|a|ando)|desmay|convuls|inconscient|no (?:reacciona|despierta)|sangr(?:ado|ando|a mucho)|fiebre (?:alta|muy alta)|vomit\w* (?:mucho|sin parar|sangre)|confundid|se (?:me|le) (?:durmio|paralizo)|no (?:puedo|puede) hablar|descompens/;
const OUT = /(?:se me acabo|se le acabo|ya no (?:tengo|tiene)|no me queda nada|estoy sin|esta sin)[^.]{0,30}(?:insulina|medicament|medicina)|sin insulina/;
const SERIOUS = /insulina|dialisis|quimioterapia|radioterapia|cancer|embaraz|oxigeno|trasplante|vih|(?:me|le|nos) queda(?:n)? (?:para )?(?:\w+ )?dias?|a \w+ dias de quedar|casi no me queda|se me va a acabar/;
const NAMES = ["Nueva EPS", "Sanitas", "Sura", "Salud Total", "Compensar", "Famisanar", "Coosalud", "Mutual Ser", "Emssanar", "Asmet Salud", "Capital Salud", "Savia Salud", "Aliansalud", "Cajacopi", "Capresoca", "Comfenalco", "Comfachocó", "Comfaoriente", "Dusakawi", "Mallamas", "Anas Wayuu", "Pijaos Salud", "Salud Mía"];

/** Solo toma la EPS que la persona nombró; nunca la adivina. */
export function extractEps(text: string): string {
  const t = fold(text);
  const known = NAMES.find(name => new RegExp(`\\b${fold(name)}\\b`).test(t));
  if (known) return known;
  return text.match(/\bEPS\s+((?:[A-ZÁÉÍÓÚÑ][\p{L}]+)(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}]+)?)/u)?.[0].trim() || "";
}
export function hasDangerSigns(text: string): boolean {
  const t = fold(text);
  const affirmed = t.replace(/\b(?:no|sin|nunca)\s+(?:tengo|tiene|hay|siento|presento|presenta)\s+[^.,;]{0,40}/g, " ");
  return SIGNS.test(affirmed) || OUT.test(t);
}
export function detectHealthCase(text: string): HealthCase | null {
  const t = fold(text);
  if (!SUBJECT.test(t) || !(BARRIER.test(t) || hasDangerSigns(text))) return null;
  return { level: hasDangerSigns(text) ? "urgente" : SERIOUS.test(t) ? "grave" : "ordinario", eps: extractEps(text) };
}
const pick = (data: Data, name: string, label: string) => {
  const value = data[name];
  return typeof value === "string" && value.trim() ? value.trim() : `[completar: ${label}]`;
};
/** Reutiliza lo ya contado; lo que falta queda marcado, sin inventarlo. */
export function buildClaimDraft(story: string, data: Data = {}): string {
  const eps = (typeof data.accionado === "string" && !/supersalud|superintendencia/i.test(data.accionado) && data.accionado.trim()) || extractEps(story) || "[completar: nombre de la EPS]";
  const facts = [typeof data.hechos === "string" ? data.hechos : "", typeof data.actuaciones === "string" ? data.actuaciones : ""].map(s => s.trim()).filter(Boolean).join("\n") || story.trim();
  return `Señores
SUPERINTENDENCIA NACIONAL DE SALUD

Asunto: Reclamo contra ${eps} por barrera de acceso a un servicio de salud

Yo, ${pick(data, "nombre", "nombre completo")}, identificado(a) con ${pick(data, "tipoDocumento", "tipo de documento")} número ${pick(data, "numeroDocumento", "número de documento")}, presento este reclamo.

LO QUE PASÓ
${facts}

LO QUE SOLICITO
1. Que se requiera a ${eps} para que garantice de forma oportuna y completa el servicio o medicamento ordenado por mi médico.
2. Que, si vivo lejos del lugar de entrega, se revise una forma de entrega o el transporte que corresponda.
3. Que me informen por escrito lo actuado y el número de radicado.

PRUEBAS QUE ADJUNTO
${typeof data.pruebas === "string" && data.pruebas.trim() ? data.pruebas.trim() : "[completar: fórmula u orden médica, fechas de reclamo y respuestas recibidas]"}

DATOS PARA RESPONDERME
Correo: ${pick(data, "correo", "correo")}
Teléfono: ${pick(data, "telefono", "teléfono")}
Dirección o vereda: ${pick(data, "direccion", "dirección o vereda")}

Firma: ______________________`;
}
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Documento que Word abre directamente. */
export function claimDocument(text: string): string {
  return `<html><head><meta charset="utf-8"><title>Reclamo Supersalud</title></head><body style="font-family:Arial;font-size:12pt;white-space:pre-wrap">${escapeHtml(text)}</body></html>`;
}

type CitationSource = { n: number; title: string; heading?: string };
/** Convierte el número de una fuente en una referencia que se entiende. */
export function citationLabel(source?: CitationSource, n?: number): string {
  if (!source) return `Fuente ${n ?? ""}`.trim();
  if (/^Ruta RAIZIA/i.test(source.title)) {
    const topic = source.title.replace(/^Ruta RAIZIA\s*—\s*/i, "").split(/[:,]/)[0].trim();
    return `Guía RAIZIA: ${topic}`;
  }
  const name = source.title.split(/\s+—\s+/)[0].trim();
  const article = source.heading?.match(/art[ií]culo\s+(\d+[A-Za-z]?)/i)?.[1];
  return article && !/art\./i.test(name) ? `${name}, art. ${article}` : name;
}
export function readableCitations(text: string, sources: CitationSource[] = []): string {
  return text.replace(/\s*(?:\[\d{1,2}\]\s*)+/g, match => {
    const labels = [...new Set([...match.matchAll(/\[(\d{1,2})\]/g)].map(m => sources.find(s => s.n === Number(m[1]))).filter(Boolean).map(s => citationLabel(s)))];
    return labels.length ? ` (${labels.join("; ")}) ` : " ";
  }).replace(/\s+([.,;:])/g, "$1").trim();
}
