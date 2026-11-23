import type { ToolData } from "./tools-config";
export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type ConversationProposal = { campo: string; valor: string; cita_literal: string };
export type ConversationResult = { respuesta: string; pregunta: string | null; campoPregunta?: string; propuestas: ConversationProposal[]; faltan: string[]; peligro: boolean; respaldo?: boolean };
export type ConversationState = {
  mode: "conversation" | "steps"; mensajes: ConversationMessage[]; propuestas: ConversationProposal[];
  draft: string; preguntados: Record<string, number>; contexto?: string; notice: string; peligro: boolean;
};
export { CONVERSATION_FIELDS } from "./conversation-catalog";
import { CONVERSATION_FIELDS, conversationFields } from "./conversation-catalog";
export const CONVERSATION_QUESTIONS: Record<string, string> = {
  hechos: "¿Qué pasó?", accionado: "¿Quién te está afectando?", actuaciones: "¿Qué has intentado para resolverlo?",
  cuando: "¿Cuándo pasó?", medidaProvisional: "¿Hay peligro para tu vida o tu salud si esperas?",
  medida: "¿Qué necesitas que hagan ahora?", razonMedida: "¿Por qué no puedes esperar?",
  pretensiones: "¿Qué quieres que ordene el juez?", pruebas: "¿Qué pruebas tienes, si tienes alguna?",
};
export const CONVERSATION_FALLBACK = "No pude organizar tu mensaje ahora. Lo que escribiste se conserva en este dispositivo; puedes continuar paso a paso y revisarlo después.";
export const emptyConversation = (mode: ConversationState["mode"] = "steps"): ConversationState => ({ mode, mensajes: [], propuestas: [], draft: "", preguntados: {}, notice: "", peligro: false });
const normalizeQuote = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[.!?,;:…]+$/u, "").replace(/\s+/g, "");
const hasUserQuote = (mensajes: ConversationMessage[], quote: string) => !!normalizeQuote(quote) && mensajes.some(m => m.role === "user" && normalizeQuote(m.content).includes(normalizeQuote(quote)));
export function restoreConversation(value: unknown): ConversationState {
  if (!value || typeof value !== "object") return emptyConversation();
  const v = value as Partial<ConversationState>;
  const message = (m: ConversationMessage) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.length <= 2000;
  const mensajes = Array.isArray(v.mensajes) ? v.mensajes.filter(message) : [];
  return { ...emptyConversation(v.mode === "conversation" ? "conversation" : "steps"), mensajes,
    propuestas: Array.isArray(v.propuestas) ? v.propuestas.filter(p => p && CONVERSATION_FIELDS.includes(p.campo) && typeof p.valor === "string" && p.valor.length <= 8000 && typeof p.cita_literal === "string" && hasUserQuote(mensajes, p.cita_literal)) : [],
    draft: typeof v.draft === "string" ? v.draft.slice(0, 2000) : "",
    preguntados: Object.fromEntries(CONVERSATION_FIELDS.map(k => [k, Math.min(2, Math.max(0, Number(v.preguntados?.[k]) || 0))])),
    contexto: CONVERSATION_FIELDS.includes(v.contexto || "") ? v.contexto : undefined,
    notice: typeof v.notice === "string" ? v.notice.slice(0, 600) : "", peligro: v.peligro === true,
  };
}
export function conversationRequest(state: ConversationState, data: ToolData, kind = "tutela") {
  // Recorta solo el contexto que viaja. El historial local completo se conserva.
  const mensajes: ConversationMessage[] = [];
  let length = 0;
  for (const m of [...state.mensajes].reverse()) {
    if (mensajes.length >= 16 || length + m.content.length > 16000) break;
    mensajes.unshift(m); length += m.content.length;
  }
  return { kind, mensajes, confirmados: Object.fromEntries(Object.entries(data).filter(([k, v]) => conversationFields(kind).some(f => f.name === k) && typeof v === "string")), preguntados: state.preguntados, contexto: state.contexto };
}
export function receiveConversation(state: ConversationState, result: ConversationResult): ConversationState {
  const question = result.pregunta && result.campoPregunta && CONVERSATION_FIELDS.includes(result.campoPregunta) ? result.campoPregunta : Object.keys(CONVERSATION_QUESTIONS).find(k => CONVERSATION_QUESTIONS[k] === result.pregunta);
  const propuestas = [...state.propuestas];
  // El servidor valida la limpieza del valor; aquí conservamos su cita y exigimos aceptación explícita.
  for (const p of result.propuestas) if (CONVERSATION_FIELDS.includes(p.campo) && p.valor.trim() && p.valor.length <= 2000 && hasUserQuote(state.mensajes, p.cita_literal) && !propuestas.some(v => v.campo === p.campo && v.valor === p.valor)) propuestas.push(p);
  return { ...state, propuestas, mensajes: [...state.mensajes, { role: "assistant", content: [result.respuesta, result.pregunta].filter(Boolean).join(" ") }],
    preguntados: question ? { ...state.preguntados, [question]: (state.preguntados[question] || 0) + 1 } : state.preguntados,
    peligro: state.peligro || result.peligro, mode: result.respaldo ? "steps" : state.mode, notice: result.respaldo ? result.respuesta : "" };
}
/** Solo se llama desde una aceptación explícita; la llegada de IA no toca data. */
export function acceptConversationProposal(data: ToolData, proposal: ConversationProposal): ToolData {
  if (!CONVERSATION_FIELDS.includes(proposal.campo)) return data;
  const value = proposal.campo === "hechosAdicionales" && data.hechosAdicionales ? `${data.hechosAdicionales}\n${proposal.valor}` : proposal.valor;
  return { ...data, [proposal.campo]: value };
}
