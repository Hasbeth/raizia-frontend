import { TOOLS, validateTool, type ToolData } from "./tools-config";
import { buildModel, entries, value } from "./document-model";
export type QualityIssue = { level: "red" | "amber"; field: string; message: string };
export function reviewQuality(kind: string, data: ToolData): { level: "red" | "amber" | "green"; issues: QualityIssue[]; missing: string[] } {
  const issues: QualityIssue[] = Object.entries(validateTool(TOOLS[kind], data)).map(([field, message]) => ({ level: "red", field, message }));
  const warn = (field: string, message: string) => issues.push({ level: "amber", field, message });
  entries(data.hechos).forEach((fact, i) => {
    if (!/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(fact)) warn("hechos", `Hecho ${i + 1}: agrega la fecha o explica que no la recuerdas.`);
  });
  const claims = entries(data.pretensiones || data.peticiones);
  claims.forEach((claim, i) => {
    if (claim.length < 24 || /^(?:que )?(?:se )?(?:respeten? mis derechos|me ayuden|se haga justicia)[.!]?$/i.test(claim)) warn(data.pretensiones ? "pretensiones" : "peticiones", `Pedido ${i + 1}: explica qué necesitas que hagan o entreguen.`);
    if (["tutela", "popular", "cumplimiento"].includes(kind)) {
      for (const [field, source, label] of [["hechosApoyo", "hechos", "hecho"], ["pruebasApoyo", "pruebas", "prueba"]]) {
        const line = entries(data[field])[i] || "";
        const refs = line.split(/[,; ]+/).filter(Boolean);
        if (!refs.length || refs.some(ref => !/^\d+$/.test(ref) || Number(ref) < 1 || Number(ref) > entries(data[source]).length)) warn(field, `Pedido ${i + 1}: señala al menos un ${label} existente que lo apoye.`);
      }
      for (const [field, label] of [["responsables", "quién debe cumplir"], ["plazos", "en qué plazo lo pides"], ["verificaciones", "cómo se comprueba el cumplimiento"]]) if (!entries(data[field])[i]) warn(field, `Pedido ${i + 1}: falta ${label}.`);
    }
  });
  entries(data.pruebas).forEach((_, i) => { if (!entries(data.demuestra)[i]) warn("demuestra", `Prueba ${i + 1}: explica qué demuestra.`); });
  if (kind === "tutela" && (!value(data.actuaciones) || /^(no|ninguna|no hice nada)[.!]?$/i.test(value(data.actuaciones)))) warn("actuaciones", "No aparece una gestión previa. Explica qué intentaste o por qué no pudiste hacerlo; esto no impide continuar.");
  if (kind === "tutela" && value(data.medidaProvisional) === "Sí" && (!value(data.medida) || !value(data.razonMedida))) warn("medida", "La orden urgente necesita una medida concreta y una razón apoyada en pruebas.");
  const missing = buildModel(kind, data).missing;
  if (missing.length) warn("", `Hay ${missing.length} datos por completar en el documento o el correo.`);
  if (Object.keys(data).some(k => k.startsWith("edicion_"))) warn("", "Editaste secciones: comprueba que cada pedido siga apoyado en hechos y pruebas. El semáforo revisa las respuestas; no puede validar tus cambios jurídicos.");
  return { level: issues.some(i => i.level === "red") ? "red" : issues.length ? "amber" : "green", issues, missing };
}
