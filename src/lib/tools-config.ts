/**
 * Definición de los asistentes de documentos.
 * La misma definición guía el formulario y valida los datos en el servidor.
 * Para agregar una herramienta: añade su configuración aquí y su esquema en `docgen.ts`.
 *
 * Las referencias legales de este archivo se verificaron contra los textos
 * oficiales cargados en la biblioteca (Constitución, Leyes 21/1991, 393/1997,
 * 472/1998, 1437/2011 y 1755/2015, y Decreto 2591/1991).
 */

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "email" | "tel" | "checkboxes";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: string[];
  /** Ocupa media fila en pantallas anchas. */
  half?: boolean;
  rows?: number;
};

export type Step = { id: string; title: string; intro: string; fields: Field[] };

export type ToolConfig = {
  kind: string;
  slug: string;
  group: "solicitudes" | "acciones";
  name: string;
  short: string;
  description: string;
  /** Aviso corto visible en la tarjeta (p. ej. requisitos previos). */
  badge?: string;
  minutes: number;
  fileName: string;
  steps: Step[];
  /** Advertencias que la persona debe leer antes de generar el documento. */
  warnings: string[];
  /** Declaraciones que debe aceptar expresamente. */
  confirmations: { name: string; label: string }[];
};

const DOC_ID_TYPES = [
  "Cédula de ciudadanía",
  "Tarjeta de identidad",
  "Cédula de extranjería",
  "NIT",
  "Otro documento",
];

const CAPACITY = [
  "En nombre propio",
  "Como autoridad o representante de una comunidad",
  "En representación de otra persona",
];

const FACTS_HINT = "Cuenta solo lo que sabes que ocurrió. RAIZIA ordena tus palabras, pero no agrega hechos.";
const DRAFT = { name: "revisado", label: "Entiendo que es un borrador y que debo revisarlo antes de presentarlo." };
const DRAFT_WARNING = "Este es un borrador. Léelo completo y corrige lo que haga falta antes de presentarlo.";
const FACTS_WARNING =
  "El documento incluye únicamente los hechos y solicitudes que escribiste. RAIZIA no verifica que sean ciertos ni suficientes.";
const RECEIPT_WARNING =
  "Guarda una copia con constancia de radicación (sello, número o correo de confirmación): desde esa fecha se cuentan los plazos.";

const contactStep: Step = {
  id: "contacto",
  title: "¿Dónde recibes la respuesta?",
  intro: "Indica al menos un medio de contacto. Allí te notificarán las decisiones.",
  fields: [
    { name: "direccion", label: "Dirección", type: "text", placeholder: "Barrio, vereda, resguardo o dirección" },
    { name: "correo", label: "Correo electrónico", type: "email", half: true },
    { name: "telefono", label: "Teléfono", type: "tel", half: true },
  ],
};

const personStep = (title: string): Step => ({
  id: "persona",
  title,
  intro: "Estos datos identifican a quien firma el documento.",
  fields: [
    { name: "nombre", label: "Nombre completo", type: "text", required: true },
    { name: "tipoDocumento", label: "Tipo de documento", type: "select", options: DOC_ID_TYPES, required: true, half: true },
    { name: "numeroDocumento", label: "Número de documento", type: "text", required: true, half: true },
    { name: "calidad", label: "¿En qué calidad actúas?", type: "select", options: CAPACITY, required: true },
    {
      name: "comunidad",
      label: "Comunidad, resguardo u organización",
      type: "text",
      hint: "Complétalo si actúas a nombre de una comunidad o de otra persona (escribe su nombre).",
    },
    { name: "ciudad", label: "Municipio desde donde escribes", type: "text", required: true },
  ],
});

const factsStep = (intro: string, extra: Field[] = []): Step => ({
  id: "hechos",
  title: "¿Qué ocurrió?",
  intro,
  fields: [{ name: "hechos", label: "Hechos", type: "textarea", required: true, rows: 8, hint: FACTS_HINT }, ...extra],
});

const ATTACHMENTS: Field = { name: "anexos", label: "Documentos que adjuntas", type: "textarea", rows: 3, hint: "Uno por línea." };
const EVIDENCE: Field = {
  name: "pruebas",
  label: "Pruebas que adjuntas",
  type: "textarea",
  rows: 4,
  hint: "Una por línea: documentos, fotos, videos, respuestas recibidas, testigos.",
};

/* ------------------------- Solicitudes ante entidades ------------------------- */

export const PETICION: ToolConfig = {
  kind: "peticion",
  slug: "derecho-de-peticion",
  group: "solicitudes",
  name: "Derecho de petición",
  short: "Pide información, documentos o una actuación a una entidad.",
  description:
    "Sirve para solicitar a una autoridad información, copias de documentos, que haga algo que le corresponde o que resuelva una queja. La entidad está obligada a responder de fondo.",
  minutes: 10,
  fileName: "Derecho-de-peticion",
  steps: [
    personStep("¿Quién presenta la petición?"),
    {
      id: "destinatario",
      title: "¿A quién va dirigida?",
      intro: "Escribe la entidad que debe responder. Si conoces la dependencia o el funcionario, mejor.",
      fields: [
        { name: "entidad", label: "Entidad", type: "text", required: true, placeholder: "Por ejemplo: Alcaldía de…, Corporación Autónoma Regional…" },
        { name: "funcionario", label: "Dependencia o funcionario", type: "text" },
        { name: "ciudadEntidad", label: "Ciudad de la entidad", type: "text" },
      ],
    },
    factsStep("Cuenta los hechos en orden, con tus palabras. Un hecho por párrafo; incluye fechas y lugares si los recuerdas."),
    {
      id: "peticiones",
      title: "¿Qué solicitas?",
      intro: "Sé concreto: qué quieres que la entidad haga, entregue o responda.",
      fields: [
        {
          name: "tipoPeticion",
          label: "Tipo de petición",
          type: "select",
          required: true,
          options: [
            "Solicitud de información",
            "Solicitud de documentos o copias",
            "Solicitud de que se realice una actuación",
            "Consulta a la entidad",
            "Queja o reclamo",
          ],
          hint: "El tipo determina el plazo legal de respuesta que se cita en el documento.",
        },
        {
          name: "peticiones",
          label: "Peticiones",
          type: "textarea",
          required: true,
          rows: 6,
          hint: "Una petición por línea. Por ejemplo: «Que se me entregue copia del acta de…».",
        },
        ATTACHMENTS,
      ],
    },
    contactStep,
  ],
  warnings: [
    DRAFT_WARNING,
    FACTS_WARNING,
    RECEIPT_WARNING,
    "Si la entidad no responde en el plazo legal, puedes acudir a la personería, a la Defensoría del Pueblo o evaluar una acción de tutela.",
  ],
  confirmations: [DRAFT],
};

export const CONSULTA_PREVIA: ToolConfig = {
  kind: "consulta-previa",
  slug: "solicitud-consulta-previa",
  group: "solicitudes",
  name: "Solicitud sobre consulta previa",
  short: "Pide que se garantice la consulta frente a un proyecto o medida.",
  description:
    "Petición para informar que un proyecto, obra, actividad o medida afecta a la comunidad y solicitar que se garantice el derecho a la consulta previa.",
  minutes: 12,
  fileName: "Solicitud-consulta-previa",
  steps: [
    personStep("¿Quién presenta la solicitud?"),
    {
      id: "destinatario",
      title: "¿A quién va dirigida?",
      intro: "Suele dirigirse a la autoridad encargada de la consulta previa o a la entidad que autoriza el proyecto.",
      fields: [
        {
          name: "entidad",
          label: "Entidad",
          type: "text",
          required: true,
          placeholder: "Dirección de la Autoridad Nacional de Consulta Previa — Ministerio del Interior",
          hint: "Verifica el nombre y la dirección de la entidad antes de enviar el documento.",
        },
        { name: "ciudadEntidad", label: "Ciudad de la entidad", type: "text" },
      ],
    },
    {
      id: "proyecto",
      title: "¿Qué proyecto o medida les afecta?",
      intro: "Describe lo que saben: de qué se trata, quién lo adelanta y dónde.",
      fields: [
        { name: "proyecto", label: "Proyecto, obra, actividad o medida", type: "textarea", required: true, rows: 4 },
        { name: "responsableProyecto", label: "Empresa o entidad que lo adelanta", type: "text" },
        { name: "ubicacion", label: "Lugar", type: "text", required: true, placeholder: "Territorio, resguardo, vereda, municipio" },
      ],
    },
    {
      id: "hechos",
      title: "¿Cómo afecta a la comunidad?",
      intro: "Explica los hechos y la afectación: territorio, sitios sagrados, cultura, agua, formas de vida. Un hecho por párrafo.",
      fields: [{ name: "hechos", label: "Hechos y afectación", type: "textarea", required: true, rows: 8, hint: FACTS_HINT }],
    },
    {
      id: "peticiones",
      title: "¿Qué solicitan?",
      intro: "Escribe las solicitudes concretas, una por línea.",
      fields: [
        {
          name: "peticiones",
          label: "Peticiones",
          type: "textarea",
          required: true,
          rows: 6,
          hint: "Por ejemplo: «Que se informe si existe un trámite de consulta previa para este proyecto» o «Que se convoque a las autoridades de la comunidad».",
        },
        ATTACHMENTS,
      ],
    },
    contactStep,
  ],
  warnings: [
    DRAFT_WARNING,
    "RAIZIA no determina si la consulta previa procede en tu caso. Eso depende de la afectación directa a la comunidad; puedes leer los criterios de la Corte Constitucional en la biblioteca (por ejemplo, la Sentencia SU-123 de 2018).",
    "Conviene que la solicitud se presente con el respaldo de las autoridades propias de la comunidad.",
    RECEIPT_WARNING,
  ],
  confirmations: [DRAFT],
};

export const RECLAMACION: ToolConfig = {
  kind: "reclamacion",
  slug: "reclamacion-previa",
  group: "solicitudes",
  name: "Reclamación previa a la autoridad",
  short: "El paso obligatorio antes de una acción popular o de cumplimiento.",
  description:
    "Antes de acudir al juez con una acción popular o una acción de cumplimiento, la ley exige pedirle primero a la autoridad que actúe. Este escrito deja constancia de esa solicitud.",
  badge: "Paso previo",
  minutes: 8,
  fileName: "Reclamacion-previa",
  steps: [
    personStep("¿Quién presenta la reclamación?"),
    {
      id: "destinatario",
      title: "¿A quién va dirigida?",
      intro: "Es la autoridad que debe proteger el derecho colectivo o cumplir la norma.",
      fields: [
        { name: "entidad", label: "Entidad", type: "text", required: true },
        { name: "funcionario", label: "Dependencia o funcionario", type: "text" },
        { name: "ciudadEntidad", label: "Ciudad de la entidad", type: "text" },
      ],
    },
    {
      id: "tipo",
      title: "¿Para qué acción es el paso previo?",
      intro: "El plazo que tiene la autoridad cambia según la acción que piensas presentar después.",
      fields: [
        {
          name: "tipoReclamacion",
          label: "Tipo de reclamación",
          type: "select",
          required: true,
          options: [
            "Antes de una acción popular: pedir medidas para proteger un derecho colectivo",
            "Antes de una acción de cumplimiento: pedir que se cumpla una norma o un acto administrativo",
          ],
        },
        {
          name: "norma",
          label: "Norma o acto administrativo que no se cumple",
          type: "text",
          hint: "Solo para la acción de cumplimiento. Escribe el nombre y el artículo tal como aparecen en el documento.",
        },
      ],
    },
    factsStep("Cuenta qué está pasando y desde cuándo. Un hecho por párrafo."),
    {
      id: "peticiones",
      title: "¿Qué le pides a la autoridad?",
      intro: "Las medidas concretas que debe tomar, una por línea.",
      fields: [{ name: "peticiones", label: "Solicitudes", type: "textarea", required: true, rows: 6 }, ATTACHMENTS],
    },
    contactStep,
  ],
  warnings: [
    DRAFT_WARNING,
    "Guarda la copia radicada: es la prueba de que cumpliste este requisito y tendrás que adjuntarla a la acción.",
    "Acción popular: si la autoridad no atiende la reclamación dentro de los quince (15) días siguientes, o se niega, puedes acudir al juez (artículo 144 de la Ley 1437 de 2011).",
    "Acción de cumplimiento: puedes acudir al juez si la autoridad se ratifica en el incumplimiento o no contesta dentro de los diez (10) días siguientes (artículo 8 de la Ley 393 de 1997).",
  ],
  confirmations: [DRAFT],
};

export const ACOMPANAMIENTO: ToolConfig = {
  kind: "acompanamiento",
  slug: "solicitud-de-acompanamiento",
  group: "solicitudes",
  name: "Solicitud de acompañamiento",
  short: "Pide orientación o intervención a la Defensoría, la personería o la Procuraduría.",
  description:
    "Escrito para pedir al Ministerio Público que oriente, acompañe o intervenga ante una situación que afecta los derechos de una persona o de la comunidad.",
  minutes: 8,
  fileName: "Solicitud-de-acompanamiento",
  steps: [
    personStep("¿Quién presenta la solicitud?"),
    {
      id: "destinatario",
      title: "¿A qué entidad acudes?",
      intro: "Las tres hacen parte del Ministerio Público y atienden sin costo.",
      fields: [
        {
          name: "entidad",
          label: "Entidad",
          type: "select",
          required: true,
          options: ["Defensoría del Pueblo", "Personería municipal o distrital", "Procuraduría General de la Nación"],
        },
        { name: "ciudadEntidad", label: "Regional o municipio", type: "text" },
      ],
    },
    factsStep("Cuenta la situación en orden y con fechas. Un hecho por párrafo."),
    {
      id: "peticiones",
      title: "¿Qué apoyo necesitas?",
      intro: "Por ejemplo: orientación, acompañamiento a una reunión, verificación en el territorio o intervención ante otra entidad.",
      fields: [{ name: "peticiones", label: "Solicitudes", type: "textarea", required: true, rows: 5, hint: "Una por línea." }, ATTACHMENTS],
    },
    contactStep,
  ],
  warnings: [DRAFT_WARNING, FACTS_WARNING, RECEIPT_WARNING],
  confirmations: [DRAFT],
};

/* ----------------------------- Acciones ante jueces ---------------------------- */

export const RIGHTS = [
  "Dignidad humana (artículo 1 de la Constitución)",
  "Diversidad étnica y cultural (artículo 7 de la Constitución)",
  "Vida (artículo 11 de la Constitución)",
  "Igualdad y no discriminación (artículo 13 de la Constitución)",
  "Derecho de petición (artículo 23 de la Constitución)",
  "Debido proceso (artículo 29 de la Constitución)",
  "Seguridad social (artículo 48 de la Constitución)",
  "Salud (artículo 49 de la Constitución y Ley Estatutaria 1751 de 2015)",
  "Educación (artículo 67 de la Constitución)",
  "Consulta previa (Convenio 169 de la OIT, aprobado por la Ley 21 de 1991)",
];

/** Derechos e intereses colectivos del artículo 4 de la Ley 472 de 1998 (selección). */
export const COLLECTIVE_RIGHTS = [
  "Goce de un ambiente sano (literal a)",
  "Moralidad administrativa (literal b)",
  "Equilibrio ecológico y manejo y aprovechamiento racional de los recursos naturales (literal c)",
  "Goce del espacio público y defensa de los bienes de uso público (literal d)",
  "Defensa del patrimonio público (literal e)",
  "Defensa del patrimonio cultural de la Nación (literal f)",
  "Seguridad y salubridad públicas (literal g)",
  "Acceso a una infraestructura de servicios que garantice la salubridad pública (literal h)",
  "Acceso a los servicios públicos y a que su prestación sea eficiente y oportuna (literal j)",
  "Seguridad y prevención de desastres previsibles técnicamente (literal l)",
];

export const TUTELA: ToolConfig = {
  kind: "tutela",
  slug: "tutela",
  group: "acciones",
  name: "Acción de tutela",
  short: "Protección urgente de derechos fundamentales.",
  description:
    "Sirve para pedir a un juez que proteja de inmediato derechos fundamentales vulnerados o amenazados, cuando no hay otro medio eficaz para defenderlos. No requiere abogado.",
  minutes: 15,
  fileName: "Borrador-accion-de-tutela",
  steps: [
    personStep("¿Quién presenta la tutela?"),
    {
      id: "accionado",
      title: "¿Contra quién se dirige?",
      intro: "Es la entidad o persona que, según tú, está vulnerando o amenazando los derechos.",
      fields: [
        { name: "accionado", label: "Entidad o persona accionada", type: "text", required: true },
        { name: "contactoAccionado", label: "Dirección o correo de la entidad", type: "text", hint: "Ayuda al juzgado a notificarla." },
      ],
    },
    factsStep("Cuenta los hechos en orden y con fechas. Un hecho por párrafo.", [
      {
        name: "actuaciones",
        label: "¿Qué has hecho antes para resolverlo?",
        type: "textarea",
        rows: 4,
        hint: "Es importante: peticiones, reclamos o reuniones previas y qué respuesta recibiste.",
      },
    ]),
    {
      id: "derechos",
      title: "¿Qué derechos consideras vulnerados?",
      intro: "Marca los que apliquen a tu caso. Si tienes dudas, elige los más evidentes y busca orientación.",
      fields: [
        { name: "derechos", label: "Derechos fundamentales", type: "checkboxes", options: RIGHTS, required: true },
        { name: "otroDerecho", label: "Otro derecho", type: "text", hint: "Escríbelo si no está en la lista." },
        {
          name: "explicacion",
          label: "¿Por qué consideras que se vulneran?",
          type: "textarea",
          rows: 4,
          hint: "Explica con tus palabras cómo te afectan los hechos.",
        },
      ],
    },
    {
      id: "pretensiones",
      title: "¿Qué le pides al juez?",
      intro: "Escribe las órdenes concretas que esperas. Por ejemplo: «Que se ordene a la entidad responder la petición radicada el…».",
      fields: [{ name: "pretensiones", label: "Pretensiones", type: "textarea", required: true, rows: 5, hint: "Una por línea." }, EVIDENCE],
    },
    contactStep,
  ],
  warnings: [
    "Este es un borrador para ayudarte a organizar tu caso. Revísalo con apoyo jurídico (Defensoría del Pueblo, personería o consultorio jurídico) antes de presentarlo.",
    "La tutela procede cuando no existe otro medio de defensa eficaz o para evitar un perjuicio irremediable. RAIZIA no evalúa si tu caso cumple esos requisitos.",
    "El documento no incluye jurisprudencia ni argumentos que no hayas escrito: la sección de fundamentos cita solo las normas básicas de la acción y los derechos que marcaste.",
    "Presentar dos tutelas por los mismos hechos y derechos puede acarrear sanciones.",
  ],
  confirmations: [
    DRAFT,
    { name: "juramento", label: "Declaro bajo juramento que no he presentado otra tutela por los mismos hechos y derechos." },
  ],
};

export const POPULAR: ToolConfig = {
  kind: "popular",
  slug: "accion-popular",
  group: "acciones",
  name: "Acción popular",
  short: "Protección de derechos que pertenecen a toda la comunidad.",
  description:
    "Sirve para pedir a un juez que evite un daño, haga cesar una amenaza o restituya las cosas cuando se afectan derechos colectivos como el ambiente sano, el agua, el espacio público o el patrimonio cultural. Puede presentarla cualquier persona, sin abogado.",
  badge: "Requiere reclamación previa a la autoridad",
  minutes: 15,
  fileName: "Borrador-accion-popular",
  steps: [
    personStep("¿Quién presenta la acción?"),
    {
      id: "accionado",
      title: "¿Quién es el presunto responsable?",
      intro: "La persona, empresa o autoridad que causa la amenaza o el daño. Si no lo sabes con certeza, escribe lo que conozcas.",
      fields: [
        { name: "accionado", label: "Presunto responsable", type: "text", required: true },
        { name: "contactoAccionado", label: "Dirección o correo del responsable", type: "text" },
      ],
    },
    factsStep("Cuenta los hechos, acciones u omisiones que amenazan o dañan a la comunidad. Un hecho por párrafo."),
    {
      id: "derechos",
      title: "¿Qué derechos colectivos están en riesgo?",
      intro: "Marca los que apliquen. La lista proviene del artículo 4 de la Ley 472 de 1998.",
      fields: [
        { name: "derechos", label: "Derechos e intereses colectivos", type: "checkboxes", options: COLLECTIVE_RIGHTS, required: true },
        { name: "otroDerecho", label: "Otro derecho colectivo", type: "text", hint: "Escríbelo si no está en la lista." },
        { name: "explicacion", label: "¿Cómo se afectan?", type: "textarea", rows: 4 },
      ],
    },
    {
      id: "reclamacion",
      title: "¿Ya le pediste a la autoridad que actuara?",
      intro: "Si la acción se dirige contra una autoridad, la ley exige haberle pedido antes que tome medidas y esperar quince días.",
      fields: [
        {
          name: "reclamacion",
          label: "Reclamación previa",
          type: "textarea",
          rows: 4,
          hint: "Indica la fecha, la entidad y la respuesta recibida (o que no respondió). Puedes prepararla con la herramienta «Reclamación previa a la autoridad».",
        },
        {
          name: "urgencia",
          label: "Si no la presentaste por un peligro inminente, explícalo",
          type: "textarea",
          rows: 3,
          hint: "La ley permite prescindir del requisito cuando existe inminente peligro de un perjuicio irremediable, pero debe sustentarse.",
        },
      ],
    },
    {
      id: "pretensiones",
      title: "¿Qué le pides al juez?",
      intro: "Las medidas concretas para evitar el daño, hacer cesar la amenaza o restituir las cosas a su estado anterior.",
      fields: [{ name: "pretensiones", label: "Pretensiones", type: "textarea", required: true, rows: 5, hint: "Una por línea." }, EVIDENCE],
    },
    contactStep,
  ],
  warnings: [
    "Este es un borrador para organizar el caso. Cuando la acción popular se presenta sin abogado, la Defensoría del Pueblo puede intervenir: busca su orientación antes de radicarla.",
    "Si se dirige contra una autoridad, antes debes pedirle que adopte medidas y esperar quince (15) días; solo se prescinde ante un peligro inminente de perjuicio irremediable, que debe sustentarse (artículo 144 de la Ley 1437 de 2011).",
    "La acción popular protege derechos de la comunidad. Para reclamar la indemnización de perjuicios sufridos por un grupo de personas existe la acción de grupo.",
    "El documento no incluye jurisprudencia ni argumentos que no hayas escrito.",
  ],
  confirmations: [DRAFT],
};

export const CUMPLIMIENTO: ToolConfig = {
  kind: "cumplimiento",
  slug: "accion-de-cumplimiento",
  group: "acciones",
  name: "Acción de cumplimiento",
  short: "Exige que una autoridad cumpla una ley o un acto administrativo.",
  description:
    "Sirve para pedir a un juez que ordene a una autoridad cumplir una norma con fuerza de ley o un acto administrativo que está dejando de aplicar.",
  badge: "Requiere reclamación previa a la autoridad",
  minutes: 12,
  fileName: "Borrador-accion-de-cumplimiento",
  steps: [
    personStep("¿Quién presenta la acción?"),
    {
      id: "accionado",
      title: "¿Qué autoridad incumple?",
      intro: "La autoridad (o el particular con funciones públicas) que debe cumplir la norma.",
      fields: [
        { name: "accionado", label: "Autoridad que incumple", type: "text", required: true },
        { name: "contactoAccionado", label: "Dirección o correo de la autoridad", type: "text" },
      ],
    },
    {
      id: "norma",
      title: "¿Qué norma no se está cumpliendo?",
      intro: "Identifícala con precisión. Si es un acto administrativo (una resolución, un acuerdo), debes adjuntar copia.",
      fields: [
        {
          name: "norma",
          label: "Norma con fuerza de ley o acto administrativo incumplido",
          type: "textarea",
          required: true,
          rows: 3,
          hint: "Escribe el nombre y el artículo tal como aparecen en el documento. RAIZIA no completa ni corrige este dato.",
        },
      ],
    },
    factsStep("Cuenta los hechos que muestran el incumplimiento. Un hecho por párrafo."),
    {
      id: "renuencia",
      title: "¿Le pediste a la autoridad que cumpliera?",
      intro: "Es un requisito: haber reclamado el cumplimiento directamente y que la autoridad se ratificara o no contestara en diez días.",
      fields: [
        {
          name: "renuencia",
          label: "Reclamación previa (renuencia)",
          type: "textarea",
          required: true,
          rows: 4,
          hint: "Indica la fecha de la solicitud y la respuesta. Si no la presentaste por un peligro inminente de perjuicio irremediable, explícalo aquí.",
        },
      ],
    },
    {
      id: "pretensiones",
      title: "¿Qué le pides al juez?",
      intro: "Normalmente, que ordene a la autoridad cumplir el deber que está omitiendo.",
      fields: [{ name: "pretensiones", label: "Pretensiones", type: "textarea", required: true, rows: 4, hint: "Una por línea." }, EVIDENCE],
    },
    contactStep,
  ],
  warnings: [
    "Este es un borrador. Revísalo con apoyo jurídico (Defensoría del Pueblo, personería o consultorio jurídico) antes de presentarlo.",
    "No procede para proteger derechos que pueden garantizarse con la acción de tutela, ni para exigir normas que establezcan gastos (artículo 9 de la Ley 393 de 1997).",
    "Debes adjuntar la prueba de la reclamación previa a la autoridad (artículos 8 y 10 de la Ley 393 de 1997).",
    "Se presenta ante los jueces administrativos del domicilio de quien la interpone (artículo 3 de la Ley 393 de 1997).",
  ],
  confirmations: [
    DRAFT,
    {
      name: "juramento",
      label: "Declaro bajo juramento que no he presentado otra solicitud por los mismos hechos o derechos ante ninguna otra autoridad.",
    },
  ],
};

export const GRUPO: ToolConfig = {
  kind: "grupo",
  slug: "accion-de-grupo",
  group: "acciones",
  name: "Acción de grupo",
  short: "Indemnización para veinte o más personas afectadas por una misma causa.",
  description:
    "Permite reclamar la indemnización de los perjuicios que una misma causa ocasionó a un grupo de al menos veinte personas. Como debe presentarla un abogado, aquí se prepara una ficha del caso para llevarla a un abogado, a la Defensoría o a la personería.",
  badge: "Requiere abogado · se genera una ficha del caso",
  minutes: 15,
  fileName: "Ficha-accion-de-grupo",
  steps: [
    {
      ...personStep("¿Quién coordina al grupo?"),
      intro: "La persona de contacto que reúne la información de los afectados.",
    },
    {
      id: "grupo",
      title: "¿Quiénes son los afectados?",
      intro: "El grupo debe estar integrado al menos por veinte personas que sufrieron perjuicios por la misma causa.",
      fields: [
        { name: "numeroPersonas", label: "Número aproximado de personas afectadas", type: "text", required: true },
        {
          name: "criterios",
          label: "¿Qué tienen en común?",
          type: "textarea",
          required: true,
          rows: 4,
          hint: "Los criterios para identificar al grupo: por ejemplo, familias de una misma vereda afectadas por un mismo hecho.",
        },
      ],
    },
    {
      id: "accionado",
      title: "¿Quién causó el daño?",
      intro: "La persona, empresa o entidad presuntamente responsable.",
      fields: [{ name: "accionado", label: "Presunto responsable", type: "text", required: true }],
    },
    factsStep("Cuenta la causa común del daño, en orden y con fechas. Un hecho por párrafo.", [
      {
        name: "fechaDano",
        label: "¿Cuándo ocurrió el daño o cuándo cesó?",
        type: "text",
        required: true,
        hint: "Es clave: la acción debe promoverse dentro de los dos años siguientes.",
      },
    ]),
    {
      id: "perjuicios",
      title: "¿Qué perjuicios sufrieron?",
      intro: "Describe los daños de cada persona o familia: cultivos, viviendas, salud, ingresos.",
      fields: [
        { name: "perjuicios", label: "Perjuicios", type: "textarea", required: true, rows: 6 },
        { name: "estimacion", label: "Valor estimado de los perjuicios", type: "text", hint: "Solo si lo conocen. El abogado lo precisará." },
        EVIDENCE,
      ],
    },
    contactStep,
  ],
  warnings: [
    "Este documento NO es una demanda: es una ficha para organizar el caso. La acción de grupo debe ejercerse por conducto de abogado (artículo 49 de la Ley 472 de 1998).",
    "El Defensor del Pueblo y los personeros pueden interponer acciones de grupo en nombre de quien lo solicite o se encuentre en situación de desamparo o indefensión (artículo 48 de la Ley 472 de 1998).",
    "La acción de grupo busca exclusivamente el reconocimiento y pago de la indemnización de los perjuicios (artículo 46).",
    "Debe promoverse dentro de los dos (2) años siguientes a la fecha en que se causó el daño o cesó la acción que lo causa (artículo 47). No dejes pasar el tiempo.",
  ],
  confirmations: [
    { name: "revisado", label: "Entiendo que esta ficha no es una demanda y que la acción debe presentarla un abogado." },
  ],
};

export const TOOL_LIST: ToolConfig[] = [
  PETICION,
  CONSULTA_PREVIA,
  RECLAMACION,
  ACOMPANAMIENTO,
  TUTELA,
  POPULAR,
  CUMPLIMIENTO,
  GRUPO,
];

export const TOOLS: Record<string, ToolConfig> = Object.fromEntries(TOOL_LIST.map((t) => [t.kind, t]));

export function toolBySlug(slug: string): ToolConfig | undefined {
  return TOOL_LIST.find((t) => t.slug === slug);
}

export type ToolData = Record<string, string | string[]>;

/* --------------------------- Entrevista conversacional --------------------------- */

/**
 * Preguntas en lenguaje muy sencillo para la entrevista guiada (una por dato).
 * Si un campo no tiene pregunta propia, se usa su etiqueta.
 */
const ASKS: Record<string, string> = {
  nombre: "¿Cómo te llamas? Escribe tu nombre completo.",
  tipoDocumento: "¿Qué documento de identidad tienes?",
  numeroDocumento: "¿Cuál es el número de tu documento?",
  calidad: "¿Para quién es este documento?",
  comunidad: "¿Cómo se llama tu comunidad, resguardo u organización?",
  ciudad: "¿En qué municipio estás?",
  entidad: "¿A qué entidad le vas a escribir? Si no lo sabes, abajo te doy ideas según lo que me contaste.",
  funcionario: "¿Sabes a qué oficina o persona de esa entidad va dirigido? Si no lo sabes, sáltalo: no es obligatorio.",
  ciudadEntidad: "¿En qué ciudad o municipio queda esa entidad?",
  hechos: "Cuéntame qué pasó. Escribe como hablas, sin preocuparte por la forma: yo lo ordeno después.",
  tipoPeticion: "¿Qué necesitas de la entidad?",
  peticiones: "¿Qué quieres pedir? Dímelo con tus palabras.",
  anexos: "¿Vas a entregar papeles, fotos u otros documentos junto con este escrito? Dime cuáles.",
  direccion: "¿A qué dirección te pueden enviar la respuesta?",
  correo: "¿Tienes correo electrónico? Escríbelo.",
  telefono: "¿Cuál es tu número de teléfono?",
  accionado: "¿Contra quién es? Escribe el nombre de la entidad, empresa o persona.",
  contactoAccionado: "¿Sabes la dirección o el correo de esa entidad o persona?",
  actuaciones: "¿Ya hiciste algo para resolverlo? Por ejemplo, una carta, una queja o una reunión. Cuéntame qué pasó.",
  derechos: "¿Qué derechos crees que se están afectando? Puedes tocar varios.",
  otroDerecho: "¿Hay otro derecho que no está en la lista? Escríbelo.",
  explicacion: "¿Cómo te afecta esto a ti o a tu comunidad?",
  pretensiones: "¿Qué quieres que el juez ordene? Dímelo con tus palabras.",
  pruebas: "¿Qué pruebas tienes? Por ejemplo: documentos, fotos, videos o personas que vieron lo que pasó.",
  proyecto: "¿Qué proyecto, obra o decisión los está afectando? Cuéntame lo que sepas.",
  responsableProyecto: "¿Sabes qué empresa o entidad lo está haciendo?",
  ubicacion: "¿En qué lugar está pasando? Di el territorio, resguardo, vereda o municipio.",
  tipoReclamacion: "¿Qué acción piensas presentar después?",
  norma: "¿Qué norma o decisión no se está cumpliendo? Escribe el nombre y el artículo como aparecen en el papel.",
  reclamacion: "¿Ya le pediste a la autoridad que hiciera algo? Dime cuándo fue y qué respondió.",
  urgencia: "Si no se lo pediste porque hay un peligro muy urgente, explícame cuál es.",
  renuencia: "¿Cuándo le pediste a la autoridad que cumpliera y qué te respondió?",
  numeroPersonas: "¿Cuántas personas resultaron afectadas, más o menos?",
  criterios: "¿Qué tienen en común esas personas? Por ejemplo: viven en la misma vereda.",
  fechaDano: "¿Cuándo pasó el daño, o cuándo terminó?",
  perjuicios: "¿Qué perdieron o qué daño sufrieron las personas?",
  estimacion: "¿Saben cuánto dinero vale ese daño, más o menos?",
};

export function askFor(field: Field): string {
  return ASKS[field.name] || field.label;
}

/** Relatos que la IA local puede ordenar (siempre con confirmación de la persona). */
export function organizeKind(fieldName: string): "hechos" | "peticiones" | null {
  if (fieldName === "hechos") return "hechos";
  if (fieldName === "peticiones" || fieldName === "pretensiones") return "peticiones";
  return null;
}

/** Sugiere, a partir de una consulta del chat, la herramienta que podría servir. */
export function suggestTool(message: string): { slug: string; name: string } | null {
  const t = message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const rules: [RegExp, ToolConfig][] = [
    [/\btutela\b/, TUTELA],
    [/consulta previa|sin consultar|sin preguntar|no nos consultaron|no nos preguntaron/, CONSULTA_PREVIA],
    [/no (se )?cumple|incumpl|accion de cumplimiento/, CUMPLIMIENTO],
    [/accion popular|contamin|deforest|\btala\b|basura|derechos? colectivos?/, POPULAR],
    [/accion de grupo|indemniza/, GRUPO],
    [/no (me |nos )?(responde|contesta)|peticion|solicitud|pedir (informacion|copia)|derecho de peticion/, PETICION],
  ];
  const hit = rules.find(([re]) => re.test(t));
  return hit ? { slug: hit[1].slug, name: hit[1].name } : null;
}

/** Devuelve los errores por campo (vacío si todo está bien). */
export function validateTool(config: ToolConfig, data: ToolData, onlyStep?: string): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const step of config.steps) {
    if (onlyStep && step.id !== onlyStep) continue;
    for (const f of step.fields) {
      const v = data[f.name];
      const empty = Array.isArray(v) ? v.every((x) => !String(x ?? "").trim()) : !String(v ?? "").trim();
      if (f.required && empty) {
        errors[f.name] = f.type === "checkboxes" ? "Marca al menos una opción." : "Este dato es necesario.";
      } else if (!empty && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) {
        errors[f.name] = "Revisa el correo electrónico.";
      } else if (!empty && typeof v === "string" && v.length > 8000) {
        errors[f.name] = "El texto es demasiado largo.";
      }
    }
    if (step.id === "contacto") {
      const any = ["direccion", "correo", "telefono"].some((k) => String(data[k] ?? "").trim());
      if (!any) errors.direccion = "Indica al menos un medio de contacto.";
    }
  }
  return errors;
}

/* ------------------------- Orientación sobre la entidad ------------------------- */

export type EntityHint = { name: string; why: string };

/**
 * Guía general para quien no sabe a qué entidad acudir. Son orientaciones
 * comunes, no una regla de competencia: la persona debe confirmarlas.
 * {m} se reemplaza por el municipio que indicó.
 */
const ENTITY_GUIDE: { match: RegExp; hints: EntityHint[] }[] = [
  {
    match: /salud|hospital|medic|eps|enferm|medicament|cita|puesto de salud|vacun/,
    hints: [
      { name: "Secretaría de Salud de {m}", why: "Responde por la atención en salud en el municipio." },
      { name: "Superintendencia Nacional de Salud", why: "Recibe quejas contra las EPS y los hospitales." },
    ],
  },
  {
    match: /escuela|colegio|profesor|docente|educa|estudi|matricul|alimentacion escolar/,
    hints: [{ name: "Secretaría de Educación de {m}", why: "Responde por escuelas, docentes y cupos." }],
  },
  {
    match: /contamin|\brio\b|\bagua\b|bosque|tala|deforest|quema|basura|mina|mineri|ambient|animales|pesca/,
    hints: [
      { name: "Corporación Autónoma Regional de tu departamento", why: "Es la autoridad ambiental de la región." },
      { name: "Autoridad Nacional de Licencias Ambientales (ANLA)", why: "Vigila los proyectos grandes que tienen licencia ambiental." },
    ],
  },
  {
    match: /consulta previa|sin consultar|sin preguntar|no nos consultaron|proyecto|obra|empresa|carretera|represa|exploracion/,
    hints: [
      {
        name: "Dirección de la Autoridad Nacional de Consulta Previa — Ministerio del Interior",
        why: "Se encarga de los procesos de consulta previa.",
      },
    ],
  },
  {
    match: /tierra|resguardo|titul|lindero|predio|territorio|ampliacion|saneamiento|invas/,
    hints: [{ name: "Agencia Nacional de Tierras", why: "Se encarga de la titulación de tierras y de los resguardos." }],
  },
  {
    match: /acueducto|alcantarill|energia|\bluz\b|\bgas\b|recibo|factura|servicio publico/,
    hints: [
      { name: "La empresa que presta el servicio", why: "Primero se reclama ante la empresa." },
      { name: "Superintendencia de Servicios Públicos Domiciliarios", why: "Vigila a las empresas de servicios públicos." },
    ],
  },
  {
    match: /victima|desplaza|conflicto armado|reparacion/,
    hints: [{ name: "Unidad para las Víctimas", why: "Atiende y repara a las víctimas del conflicto armado." }],
  },
  {
    match: /amenaz|proteccion|peligro|lider|seguridad/,
    hints: [
      { name: "Unidad Nacional de Protección", why: "Evalúa el riesgo y brinda medidas de protección." },
      { name: "Fiscalía General de la Nación", why: "Recibe las denuncias por amenazas y otros delitos." },
    ],
  },
  {
    match: /cedula|registro civil|tarjeta de identidad|documento de identidad/,
    hints: [{ name: "Registraduría Nacional del Estado Civil", why: "Expide los documentos de identidad." }],
  },
  {
    match: /cabildo|autoridad tradicional|asuntos indigenas|registro de la comunidad|gobernador indigena/,
    hints: [
      {
        name: "Dirección de Asuntos Indígenas, Rom y Minorías — Ministerio del Interior",
        why: "Atiende los asuntos de los pueblos indígenas ante el Gobierno nacional.",
      },
    ],
  },
  {
    match: /via|calle|puente|parque|alumbrado|alcald|municipio|vereda/,
    hints: [{ name: "Alcaldía de {m}", why: "Responde por las obras y los servicios del municipio." }],
  },
];

export const ENTITY_FALLBACK: EntityHint[] = [
  { name: "Personería de {m}", why: "Orienta sin costo y vigila a las entidades del municipio." },
  { name: "Defensoría del Pueblo", why: "Orienta y defiende los derechos de las personas y comunidades." },
  { name: "Alcaldía de {m}", why: "Es la entidad más cercana para los asuntos del municipio." },
];

/** Nota verificada con el artículo 21 de la Ley 1755 de 2015. */
export const ENTITY_REASSURANCE =
  "Si te equivocas de entidad, no pierdes tu petición: la entidad que no es competente debe enviarla a la que corresponde dentro de los cinco días siguientes y avisarte (artículo 21 de la Ley 1755 de 2015).";

export function suggestEntities(story: string, municipality: string): EntityHint[] {
  const t = story
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const m = municipality.trim() || "tu municipio";
  const found: EntityHint[] = [];
  for (const g of ENTITY_GUIDE) {
    if (!t || !g.match.test(t)) continue;
    for (const h of g.hints) if (!found.some((x) => x.name === h.name)) found.push(h);
  }
  const list = (found.length ? found.slice(0, 3) : []).concat(
    ENTITY_FALLBACK.filter((f) => !found.some((x) => x.name === f.name)).slice(0, found.length ? 1 : 3),
  );
  return list.map((h) => ({ name: h.name.replace("{m}", m), why: h.why }));
}
