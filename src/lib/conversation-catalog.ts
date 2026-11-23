import { TOOLS, askFor, stepApplies, type ToolData } from "./tools-config";

// Identidad y contacto se completan en el dispositivo, fuera del contexto de IA.
const privateFields = new Set(["nombre", "tipoDocumento", "numeroDocumento", "correo", "telefono", "direccion", "contactoAccionado", "radicado", "representacion", "comunidad", "ciudad", "calidad", "edadDeclarada"]);
export const conversationFields = (kind: string) => Object.hasOwn(TOOLS, kind)
  ? TOOLS[kind].steps.flatMap(s => s.fields).filter(f => !privateFields.has(f.name) && f.type !== "checkboxes") : [];
export const CONVERSATION_FIELDS = [...new Set(Object.keys(TOOLS).flatMap(k => conversationFields(k).map(f => f.name)))];
const plainQuestions: Record<string, string> = {
  hechos: "¿Qué pasó?", accionado: "¿Quién te está afectando?", actuaciones: "¿Qué has intentado para resolverlo?",
  cuando: "¿Cuándo pasó?", medidaProvisional: "¿Hay peligro para tu vida o tu salud si esperas?",
  medida: "¿Qué necesitas que hagan ahora?", razonMedida: "¿Por qué no puedes esperar?",
  pretensiones: "¿Qué quieres que ordene el juez?", pruebas: "¿Qué pruebas tienes, si tienes alguna?",
};
export function conversationQuestions(kind: string, data: ToolData = {}): Record<string, string> {
  const fields = new Set(conversationFields(kind).map(f => f.name));
  if (kind === "tutela") return Object.fromEntries(Object.entries(plainQuestions).filter(([k]) => !["medida", "razonMedida"].includes(k) || data.medidaProvisional === "Sí"));
  const selected = TOOLS[kind]?.steps.filter(s => !s.optionalDetails && stepApplies(s, data)).flatMap(s => s.fields) || [];
  return Object.fromEntries(selected.filter(f => fields.has(f.name)).map(f => [f.name, plainQuestions[f.name] || askFor(f).match(/¿[^?]+\?/)?.[0] || `¿Qué puedes contar sobre ${f.label.toLowerCase()}?`]));
}
