/** Modelo común para vista previa y Word. Citas comprobadas en staging (scripts/verificar-citas-herramientas.mjs). */
import { TOOLS, noEvidence, type ToolData } from "./tools-config";
export type DocumentSection = { id: string; title: string; paragraphs: string[] };
export type DocumentModel = { title: string; date: string; addressee: string[]; reference: string[]; intro: string; sections: DocumentSection[]; signature: string[]; missing: string[]; email: string };
export const value = (v: unknown): string => (Array.isArray(v) ? v.join("\n") : String(v ?? "")).trim();
export const entries = (v: unknown): string[] => value(v).split(/\r?\n/).map(s => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
export const gap = (label: string) => `[completar: ${label}]`;
const field = (d: ToolData, key: string, label: string) => value(d[key]) || gap(label);
const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ordinals = ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo", "Duodécimo", "Decimotercero", "Decimocuarto", "Decimoquinto", "Decimosexto", "Decimoséptimo", "Decimoctavo", "Decimonoveno"];
export function ordinal(index: number, feminine = false): string {
  let word = ordinals[index];
  if (!word) {
    const tens = ["", "", "Vigésimo", "Trigésimo", "Cuadragésimo", "Quincuagésimo", "Sexagésimo", "Septuagésimo", "Octogésimo", "Nonagésimo"];
    const n = index + 1;
    word = n < 100 ? `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ordinals[n % 10 - 1].toLowerCase()}` : ""}` : `Numeral ${n}`;
  }
  return feminine ? word.replace(/o\b/g, "a") : word;
}
const enumerate = (items: string[], feminine = false) => items.map((s, i) => `${ordinal(i, feminine)}. ${s}`);
const take = (d: ToolData, key: string, label: string) => entries(d[key]).length ? entries(d[key]) : [gap(label)];
const petitionLaw = "Artículo 23 de la Constitución Política y Ley 1755 de 2015: derecho a presentar peticiones respetuosas y obtener respuesta de fondo.";
const tutelaLaw = "Artículo 86 de la Constitución Política y Decreto 2591 de 1991: protección de derechos fundamentales.";
function requests(d: ToolData, key: string, judicial: boolean, defaultResponsible = "", optionalDetails = false): string[] {
  return enumerate(take(d, key, "qué solicito").map((text, i) => {
    if (!judicial) return text;
    const at = (key: string, label: string) => entries(d[key])[i] || (key === "responsables" ? defaultResponsible : "") || gap(`${label} del pedido ${i + 1}`);
    if (optionalDetails) {
      const details = [["plazos", "Plazo solicitado"], ["verificaciones", "Verificación del cumplimiento"], ["hechosApoyo", "Hechos de apoyo"], ["pruebasApoyo", "Pruebas de apoyo"]]
        .flatMap(([field, label]) => entries(d[field])[i] ? [`${label}: ${entries(d[field])[i]}.`] : []);
      return `${text}\nResponsable: ${at("responsables", "responsable")}.${details.length ? ` ${details.join(" ")}` : ""}`;
    }
    return `${text}\nResponsable: ${at("responsables", "responsable")}. Plazo solicitado: ${at("plazos", "plazo")}. Verificación del cumplimiento: ${at("verificaciones", "cómo comprobar el cumplimiento")}.\nHechos de apoyo: ${at("hechosApoyo", "números de los hechos")}. Pruebas de apoyo: ${at("pruebasApoyo", "números de las pruebas")}.`;
  }), true);
}
function evidence(d: ToolData, allowNone = false): string[] {
  if (allowNone && noEvidence(d)) return [value(d.pruebas)];
  return enumerate(take(d, "pruebas", "pruebas disponibles o indicar que no cuento con ellas").map((p, i) => allowNone && !entries(d.demuestra)[i] ? p : `${p}. Demuestra: ${entries(d.demuestra)[i] || gap(`qué demuestra la prueba ${i + 1}`)}.`));
}
function notifications(d: ToolData, judicial: boolean): string[] {
  const labels: Record<string, string> = { direccion: "Dirección", correo: "Correo", telefono: "Teléfono" };
  const contacts = Object.keys(labels).filter(k => value(d[k])).map(k => `${labels[k]}: ${value(d[k])}`);
  return ["Recibiré respuesta y notificaciones en:", ...(contacts.length ? contacts : [gap("medio de contacto")]), ...(judicial ? [`Parte accionada: ${field(d, "contactoAccionado", "dirección o correo judicial de la parte accionada")}`] : [])];
}
export function buildModel(kind: string, d: ToolData, now = new Date()): DocumentModel {
  const config = TOOLS[kind];
  if (!Object.hasOwn(TOOLS, kind)) throw new Error("Herramienta desconocida");
  const judicial = config.group === "acciones" && kind !== "grupo";
  const name = value(d.nombre) ? value(d.nombre).toUpperCase() : gap("nombre completo");
  const capacity = field(d, "calidad", "calidad en que actúo");
  const age = kind === "tutela" && !value(d.edadDeclarada) ? "" : `, ${field(d, "edadDeclarada", "indicar si soy mayor o menor de edad")}`;
  const identity = `${name}${age}, identificado(a) con ${field(d, "tipoDocumento", "tipo de documento")} número ${field(d, "numeroDocumento", "número de documento")}, actuando ${capacity.toLowerCase()}${value(d.comunidad) && (kind !== "tutela" || capacity !== "En nombre propio") ? `, por ${value(d.comunidad)}` : ""}`;
  const sections: DocumentSection[] = [];
  const add = (id: string, title: string, paragraphs: string[]) => sections.push({ id, title: `${roman[sections.length]}. ${title}`, paragraphs });
  const facts = () => add("hechos", "HECHOS", enumerate(take(d, "hechos", "hechos con fechas, lugar y consecuencias")));
  const annexes = () => add("anexos", "ANEXOS", take(d, "anexos", "lista exacta de anexos o indicar que no adjunto documentos"));
  const proofs = () => add("pruebas", "PRUEBAS", evidence(d, kind === "tutela"));
  const notify = () => add("notificaciones", "NOTIFICACIONES", notifications(d, judicial));
  const legal = (texts: string[]) => add("fundamentos", "FUNDAMENTOS DE DERECHO", texts);
  let intro = `Yo, ${identity}, respetuosamente presento ${config.name.toLowerCase()} con base en los hechos y solicitudes que expongo a continuación.`;
  let addressee = judicial ? ["Señor(a) JUEZ (REPARTO)", kind === "tutela" ? value(d.lugarHechos) || field(d, "ciudad", "municipio desde donde presento la tutela") : field(d, "lugarHechos", "municipio donde ocurrió la vulneración"), "E. S. D."] : [field(d, "entidad", "entidad destinataria"), field(d, "funcionario", "dependencia destinataria"), field(d, "ciudadEntidad", "ciudad de la entidad")];
  const subject = value(d.asunto) || (kind === "tutela" ? entries(d.pretensiones)[0] : "");
  const reference = [`REFERENCIA: ${config.name.toUpperCase()}${kind === "peticion" ? ". ART. 23 C.P." : kind === "tutela" ? " (Art. 86 C.P.)" : ""}`, `ASUNTO: ${subject || gap("resumen de lo que solicito")}`];
  if (judicial) reference.push(`Accionante: ${name}`, `Accionado: ${field(d, "accionado", "parte accionada")}`);
  if (["desacato", "impugnacion"].includes(kind)) {
    addressee = [field(d, "juzgado", "juzgado que dictó el fallo"), "E. S. D."];
    reference.push(`Radicado: ${field(d, "radicado", "radicado de la tutela")}`);
    intro += ` Me refiero al fallo de fecha ${field(d, "fechaFallo", "fecha del fallo")}, notificado el ${field(d, "fechaNotificacion", "fecha de notificación")}.`;
  }
  if (kind === "peticion") {
    facts(); add("peticiones", "PETICIÓN", enumerate([...take(d, "peticiones", "qué solicito"), ...entries(d.peticionesAdicionales)], true));
    const tipo = value(d.tipoPeticion);
    const days = /información|documentos/i.test(tipo) ? 10 : /Consulta/.test(tipo) ? 30 : 15;
    legal([petitionLaw, `Artículo 14 de la Ley 1755 de 2015: para esta modalidad, el término ordinario de respuesta es de ${days} días siguientes a la recepción, salvo norma legal especial.`]);
    if (value(d.consideraciones)) add("consideraciones", "CONSIDERACIONES", entries(d.consideraciones));
    annexes(); notify();
  } else if (kind === "tutela") {
    if (!/^En nombre propio$/i.test(capacity)) reference.push(`Persona o comunidad representada: ${field(d, "comunidad", "a nombre de quién presento la tutela")}`);
    facts();
    if (value(d.hechosAdicionales)) add("hechosAdicionales", "HECHOS ADICIONALES", entries(d.hechosAdicionales));
    add("procedencia", "PROCEDENCIA", [
      `Legitimación por activa: actúo ${capacity.toLowerCase()}. ${/^En nombre propio$/i.test(capacity) ? "Solicito la protección de mis derechos." : `A nombre de: ${field(d, "comunidad", "persona o comunidad representada")}. ${field(d, "representacion", "fundamento de la representación o agencia oficiosa")}`}`,
      `Legitimación por pasiva: dirijo esta acción contra ${field(d, "accionado", "responsable")}. Relato sobre la afectación: ${value(d.relacionAccionado) || field(d, "hechos", "qué hizo o dejó de hacer la parte accionada")}.`,
      `Inmediatez: fecha y continuidad de la afectación según mi respuesta: ${field(d, "cuando", "cuándo pasó y si sigue pasando")}.${value(d.motivoAhora) ? ` Motivo para acudir ahora: ${value(d.motivoAhora)}.` : ""}`,
      `Subsidiariedad: gestiones, respuestas y posibilidad de obtener una solución según lo informado: ${field(d, "actuaciones", "gestiones previas o por qué no fue posible hacerlas y si hay otro camino eficaz")}.${value(d.otrosMedios) ? ` Otros medios de defensa: ${value(d.otrosMedios)}.` : ""}`,
      `Perjuicio irremediable: ${value(d.peligro) || (d.medidaProvisional === "No" ? "Respondí que no hay peligro para mi vida o mi salud si espero." : d.medidaProvisional === "Sí" ? `Existe un riesgo grave que no permite esperar el trámite ordinario. ${field(d, "razonMedida", "por qué no puedo esperar")}` : gap("si hay peligro al esperar"))}.`,
      ...(value(d.proteccionEspecial) ? [`Especial protección: ${value(d.proteccionEspecial)}.`] : []),
    ]);
    add("derechos", "DERECHOS VULNERADOS", [...take(d, "derechos", "derechos afectados"), ...entries(d.otroDerecho), `Afectación relatada: ${value(d.explicacion) || field(d, "hechos", "cómo afectan los hechos a cada derecho")}`]);
    add("pretensiones", "PRETENSIONES", requests(d, "pretensiones", true, value(d.accionado), true));
    if (value(d.medidaProvisional) === "Sí") add("medida", "MEDIDA PROVISIONAL", [`Con fundamento en el artículo 7 del Decreto 2591 de 1991, solicito: ${field(d, "medida", "medida urgente concreta")}. No puede esperar porque: ${field(d, "razonMedida", "razón de la urgencia y prueba que la respalda")}.`]);
    legal([tutelaLaw]); proofs();
    add("competencia", "COMPETENCIA", [`Solicito conocer de esta acción conforme al artículo 37 del Decreto 2591 de 1991. Presento esta tutela desde ${field(d, "ciudad", "municipio desde donde presento la tutela")}.${value(d.lugarHechos) ? ` Según lo que indiqué, la vulneración o amenaza ocurrió en ${value(d.lugarHechos)}.` : ""}`]);
    add("juramento", "JURAMENTO", [value(d.juramento) === "si" ? "Bajo la gravedad del juramento manifiesto que no he presentado otra tutela por los mismos hechos y derechos, conforme al artículo 37 del Decreto 2591 de 1991." : "Confirmación pendiente: marca la casilla del juramento antes de descargar."]);
    notify();
  } else if (kind === "desacato") {
    add("hechos", "HECHOS", enumerate([...take(d, "hechos", "hechos con fechas"), `Orden del fallo: ${field(d, "ordenFallo", "orden exacta del fallo y plazo")}`, `Cumplimiento parcial: ${field(d, "cumplido", "qué se cumplió, con fechas, o indicar que nada")}`, `Pendiente: ${field(d, "incumplido", "qué sigue sin cumplirse, con fechas")}`, `Gestiones y respuesta: ${field(d, "actuaciones", "gestiones realizadas y respuesta recibida")}`, `Riesgo actual: ${field(d, "peligro", "riesgo actual o indicar que no lo conozco")}`, ...(value(d.tercero) ? [`Explicación de la entidad sobre terceros: ${value(d.tercero)}`] : [])]));
    add("peticiones", "PETICIÓN", enumerate([
      "Solicito admitir el incidente y requerir al responsable del cumplimiento y al representante legal de la entidad para que informen y acrediten lo actuado.",
      "Solicito verificar y declarar el incumplimiento que se encuentre probado y ordenar el cumplimiento inmediato e integral de las órdenes pendientes del fallo.",
      "Solicito adoptar medidas para evitar la repetición del incumplimiento y, si se acredita responsabilidad por desacato, imponer las sanciones que correspondan con respeto del debido proceso.",
      "Solicito mantener la competencia hasta el restablecimiento completo del derecho y exigir prueba verificable del cumplimiento.", ...entries(d.peticiones),
    ], true));
    legal(["Artículos 27 y 52 del Decreto 2591 de 1991: cumplimiento del fallo y trámite incidental de desacato. La sanción requiere valoración judicial de la responsabilidad."]);
    add("consideraciones", "CONSIDERACIONES", ["Solicito valorar el cumplimiento respecto de la totalidad de la orden, incluido su alcance continuo si así fue dispuesto en el fallo.", ...(value(d.tercero) ? ["Solicito que las dificultades con terceros informadas por la entidad no se trasladen a la persona protegida y que se adopten medidas para cumplir el fallo."] : []), ...entries(d.consideraciones)]);
    proofs(); annexes(); notify();
  } else if (kind === "impugnacion") {
    facts(); add("decision", "FALLO IMPUGNADO", take(d, "decisionFallo", "qué decidió el fallo"));
    add("desacuerdo", "MOTIVOS DE INCONFORMIDAD", [`No estoy de acuerdo con: ${field(d, "desacuerdo", "parte de la decisión que controvierto")}`, `Razones: ${field(d, "razones", "por qué considero equivocada esa decisión, según los hechos y pruebas")}`]);
    add("peticiones", "SOLICITUD A LA SEGUNDA INSTANCIA", requests(d, "peticiones", false));
    legal(["Artículo 31 del Decreto 2591 de 1991: el fallo puede impugnarse dentro de los tres días siguientes a su notificación, sin perjuicio de su cumplimiento inmediato."]);
    proofs(); annexes(); notify();
  } else if (kind === "grupo") {
    addressee = ["FICHA PARA REVISIÓN CON ABOGADO"];
    intro = `Yo, ${identity}, organizo esta información para recibir apoyo jurídico. Esta ficha no es una demanda; la acción de grupo requiere abogado (artículo 49 de la Ley 472 de 1998).`;
    facts(); add("grupo", "GRUPO AFECTADO", [`Personas: ${field(d, "numeroPersonas", "número aproximado de personas")}`, `Criterios comunes: ${field(d, "criterios", "criterios que identifican al grupo")}`, `Responsable: ${field(d, "accionado", "presunto responsable")}`]);
    add("danos", "DAÑOS Y PERJUICIOS", [`Fecha: ${field(d, "fechaDano", "fecha del daño o de su cesación")}`, ...take(d, "perjuicios", "daños individuales"), `Estimación: ${field(d, "estimacion", "estimación, si se conoce")}`]);
    legal(["Artículos 46 a 49 de la Ley 472 de 1998: indemnización de perjuicios individuales por causa común, grupo de al menos veinte personas, plazo de dos años y representación por abogado."]); proofs(); notify();
  } else {
    facts();
    if (kind === "consulta-previa") add("proyecto", "PROYECTO Y AFECTACIÓN", [field(d, "proyecto", "proyecto o medida"), `Responsable: ${field(d, "responsableProyecto", "responsable del proyecto")}`, `Lugar: ${field(d, "ubicacion", "territorio afectado")}`]);
    if (["cumplimiento", "reclamacion"].includes(kind) && (kind === "cumplimiento" || !value(d.tipoReclamacion).startsWith("Antes de una acción popular"))) add("norma", "DEBER CUYO CUMPLIMIENTO SOLICITO", [`Norma o acto indicado por la persona, pendiente de comprobación: ${field(d, "norma", "norma, artículo y deber concreto")}`]);
    if (kind === "popular") add("derechos", "DERECHOS COLECTIVOS Y AFECTACIÓN", [...take(d, "derechos", "derechos colectivos afectados"), ...entries(d.otroDerecho), field(d, "explicacion", "cómo se afectan")]);
    if (judicial) add("previa", kind === "cumplimiento" ? "RENUENCIA" : "RECLAMACIÓN PREVIA", [field(d, kind === "cumplimiento" ? "renuencia" : "reclamacion", "solicitud previa y respuesta, o motivo para no presentarla"), ...entries(d.urgencia)]);
    add("peticiones", judicial ? "PRETENSIONES" : "PETICIÓN", requests(d, judicial ? "pretensiones" : "peticiones", judicial));
    const laws: Record<string, string[]> = {
      "consulta-previa": [petitionLaw, "Artículo 6 del Convenio 169 de la OIT, aprobado por la Ley 21 de 1991: consulta de medidas susceptibles de afectar directamente a los pueblos interesados."],
      acompanamiento: [petitionLaw],
      reclamacion: [petitionLaw, value(d.tipoReclamacion).startsWith("Antes de una acción popular") ? "Artículo 144 de la Ley 1437 de 2011: solicitud previa de medidas de protección de derechos colectivos." : "Artículo 8 de la Ley 393 de 1997: reclamación previa para constituir la renuencia."],
      popular: ["Artículo 88 de la Constitución Política, artículos 4 y siguientes de la Ley 472 de 1998 y artículo 144 de la Ley 1437 de 2011: protección de derechos colectivos."],
      cumplimiento: ["Artículo 87 de la Constitución Política y Ley 393 de 1997, en particular sus artículos 8 y 10: cumplimiento de un deber legal o administrativo y prueba de renuencia."],
    };
    legal(laws[kind]); if (judicial) proofs(); else annexes();
    if (kind === "cumplimiento") add("juramento", "JURAMENTO", [value(d.juramento) === "si" ? "Bajo la gravedad del juramento manifiesto que no he presentado otra solicitud respecto de los mismos hechos o derechos ante otra autoridad (artículo 10 de la Ley 393 de 1997)." : gap("confirmar juramento sobre otra solicitud por los mismos hechos o derechos")]);
    notify();
  }
  // Las ediciones explícitas prevalecen. Se tratan como texto, nunca como HTML.
  for (const section of sections) if (typeof d[`edicion_${section.id}`] === "string") section.paragraphs = [value(d[`edicion_${section.id}`]) || gap(`contenido de ${section.title}`)];
  const date = `${field(d, "ciudad", "ciudad")}, ${value(d.fechaDocumento) || now.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" })}`;
  const signature = ["Atentamente,", "______________________________", name, `${field(d, "tipoDocumento", "tipo de documento")} n.º ${field(d, "numeroDocumento", "número de documento")}`];
  const email = `Asunto: Remisión de ${config.name}${value(d.radicado) ? ` — ${value(d.radicado)}` : ""}\n\nCordial saludo:\n\nYo, ${identity}, remito el documento adjunto para su trámite. Respetuosamente solicito confirmación de recibo y número de radicación. Si falta algún documento o dato, solicito que me lo informen para completarlo a tiempo.\n\n${notifications(d, false).join("\n")}\n\nAtentamente,\n${name}`;
  const full = [date, ...addressee, ...reference, intro, ...sections.flatMap(s => s.paragraphs), ...signature, email].join("\n");
  return { title: config.name, date, addressee, reference, intro, sections, signature, email, missing: [...new Set(full.match(/\[completar: [^\]]+\]/g) || [])] };
}
