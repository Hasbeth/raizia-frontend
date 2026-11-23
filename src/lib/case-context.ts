import type { ConversationMessage } from "./tools-conversation";

export type CaseHandoff = { mensajes: ConversationMessage[]; medida: boolean };
// Con este prefijo, «Borrar mis datos» también elimina el caso en curso.
const KEY = "raizia.borrador.caso";
const ACCEPT = "Sí, ayúdame a prepararlo.";

/** El caso viaja en el almacenamiento de la pestaña, nunca por la dirección web. */
export function saveCase(storage: Pick<Storage, "setItem">, mensajes: ConversationMessage[], medida = false) {
  const recent = mensajes.filter(m => m.content.trim()).map(m => ({ role: m.role, content: m.content.slice(0, 2000) })).slice(-15);
  while (recent[0]?.role === "assistant") recent.shift();
  if (!recent.length) return;
  if (recent.at(-1)?.role === "assistant") recent.push({ role: "user", content: ACCEPT });
  storage.setItem(KEY, JSON.stringify({ mensajes: recent, medida }));
}
export function takeCase(storage: Pick<Storage, "getItem" | "removeItem">): CaseHandoff | null {
  try {
    const raw = storage.getItem(KEY);
    storage.removeItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CaseHandoff>;
    const mensajes = Array.isArray(value.mensajes) ? value.mensajes.filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.length <= 2000) : [];
    return mensajes.length ? { mensajes, medida: value.medida === true } : null;
  } catch { return null; }
}
