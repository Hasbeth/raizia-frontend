import type { ToolData } from "./tools-config";
import type { ConversationState } from "./tools-conversation";
export type ParkedAnswers = Record<string, { answer: string; picked: string[] }>;
export type SavedDraft = { version: 2 | 3; kind: string; data: ToolData; index: number; answer: string; picked: string[]; questionId?: string; conversation?: ConversationState; parked?: ParkedAnswers };
export const draftKey = (kind: string) => `raizia.borrador.v2.${kind}`;
export function readDraft(storage: Pick<Storage, "getItem">, kind: string): SavedDraft | null {
  try {
    const raw = storage.getItem(draftKey(kind));
    if (!raw || raw.length > 1000000) return null;
    const draft = JSON.parse(raw);
    if (![2, 3].includes(draft.version) || draft.kind !== kind || !Number.isInteger(draft.index) || draft.index < 0 || !draft.data || typeof draft.data !== "object" || Array.isArray(draft.data)) return null;
    if (Object.values(draft.data).some(v => typeof v !== "string" && !(Array.isArray(v) && v.every(x => typeof x === "string")))) return null;
    return { ...draft, answer: typeof draft.answer === "string" ? draft.answer : "", picked: Array.isArray(draft.picked) ? draft.picked.filter((v: unknown) => typeof v === "string") : [] };
  } catch { return null; }
}
export function clearToolDrafts(storage: Pick<Storage, "length" | "key" | "removeItem">) {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  keys.filter(k => k?.startsWith("raizia.borrador.")).forEach(k => storage.removeItem(k!));
}
