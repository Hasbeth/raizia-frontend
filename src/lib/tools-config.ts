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
  example?: string;
  why?: string;
};

export type Step = { id: string; title: string; intro: string; fields: Field[]; optionalDetails?: boolean; condition?: "urgente" | "representacion" };

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
  "Como agente oficioso de alguien que no puede defenderse",
  "Como apoderado de otra persona",
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

const detail = (name: string, label: string, hint: string, required = false): Field => ({ name, label, hint, required, type: "textarea", rows: 3 });
const judgmentStep: Step = {
  id: "fallo", title: "La decisión del juez", intro: "Ten a mano el fallo y el aviso de que lo recibiste.",
  fields: [
    { name: "juzgado", label: "¿Qué juzgado dictó el fallo?", type: "text", required: true },
    { name: "radicado", label: "¿Cuál es el número del caso?", type: "text", required: true, hint: "Se llama radicado. Cópialo del fallo." },
    { name: "fechaFallo", label: "¿Qué fecha tiene el fallo?", type: "text", required: true },
    { name: "fechaNotificacion", label: "¿Cuándo te notificaron el fallo?", type: "text", required: true, hint: "Usa año-mes-día, por ejemplo 2026-11-20. Es la fecha en que te comunicaron la decisión." },
    { name: "accionado", label: "¿Contra qué entidad o persona fue la tutela?", type: "text", required: true },
    { name: "contactoAccionado", label: "¿Conoces su dirección o correo judicial?", type: "text" },
  ],
};
export const DESACATO: ToolConfig = {
  kind: "desacato", slug: "incidente-de-desacato", group: "acciones", name: "Incidente de desacato",
  short: "Ya hay una orden de tutela y no la cumplen.", description: "Pide al juzgado que haga cumplir la orden que ya dio. La sanción depende de lo que el juez compruebe.",
  badge: "Necesitas un fallo que ordene protegerte", minutes: 15, fileName: "Incidente-de-desacato",
  steps: [personStep("¿Quién pide el cumplimiento?"), judgmentStep, factsStep("Cuenta lo ocurrido después del fallo, con fechas."), {
    id: "incumplimiento", title: "Lo que falta por cumplir", intro: "Compara la orden con lo que hizo la entidad.", fields: [
      detail("ordenFallo", "¿Qué ordenó el juez y en qué plazo?", "Copia la orden exacta del fallo.", true),
      detail("cumplido", "¿Qué parte sí cumplieron?", "Di cuándo. Si no cumplieron nada, escríbelo."),
      detail("incumplido", "¿Qué parte sigue sin cumplirse?", "Di qué falta y desde cuándo.", true),
      detail("actuaciones", "¿Qué has pedido desde el fallo y qué respondieron?", "Cuenta las gestiones y sus fechas."),
      detail("peligro", "¿Qué riesgo hay mientras no cumplen?", "Cuenta solo lo que te ocurre."),
      detail("tercero", "¿La entidad dice que otro debe hacerlo?", "Si culpa a un operador u otro tercero, copia lo que dijo."),
      detail("peticiones", "¿Necesitas pedir algo más para hacer cumplir el fallo?", "Se propondrán las solicitudes de cumplimiento para que las revises."), EVIDENCE, ATTACHMENTS,
    ],
  }, contactStep], warnings: [DRAFT_WARNING, "Presenta el incidente ante el juzgado que conoció la tutela en primera instancia. No sirve para cambiar lo que ordenó el fallo."], confirmations: [DRAFT],
};
export const IMPUGNACION: ToolConfig = {
  kind: "impugnacion", slug: "impugnacion-de-tutela", group: "acciones", name: "Impugnación del fallo de tutela",
  short: "Pide que otro juez revise el fallo.", description: "Sirve para explicar con qué parte del fallo no estás de acuerdo y pedir su revisión en segunda instancia.",
  badge: "3 días desde la notificación", minutes: 15, fileName: "Impugnacion-de-tutela",
  steps: [personStep("¿Quién pide la revisión?"), judgmentStep, factsStep("Resume los hechos que el juez debe revisar."), {
    id: "inconformidad", title: "Lo que debe revisar otro juez", intro: "No necesitas palabras difíciles. Explica tu desacuerdo.", fields: [
      detail("decisionFallo", "¿Qué decidió el fallo?", "Copia o resume la decisión.", true),
      detail("desacuerdo", "¿Con qué parte no estás de acuerdo?", "Señala la parte de la decisión.", true),
      detail("razones", "¿Por qué no estás de acuerdo?", "Relaciona tus razones con los hechos y pruebas.", true),
      detail("peticiones", "¿Qué le pides al juez que revisará el fallo?", "Di qué decisión pides cambiar, revocar o completar.", true), EVIDENCE, ATTACHMENTS,
    ],
  }, contactStep], warnings: [DRAFT_WARNING, "El artículo 31 del Decreto 2591 de 1991 da 3 días siguientes a la notificación para impugnar. Preséntala ante el juzgado que dictó el fallo; no esperes a que venza el plazo. La impugnación no suspende su cumplimiento."], confirmations: [DRAFT],
};

// Datos que evitan afirmaciones supuestas y permiten órdenes verificables.
for (const tool of [PETICION, CONSULTA_PREVIA, RECLAMACION, ACOMPANAMIENTO, TUTELA, POPULAR, CUMPLIMIENTO, GRUPO, DESACATO, IMPUGNACION]) {
  const person = tool.steps.find(s => s.id === "persona")!;
  person.fields.push({ name: "edadDeclarada", label: "¿Eres mayor o menor de edad?", type: "select", options: ["Mayor de edad", "Menor de edad"] });
  person.fields.push({ name: "asunto", label: "En una frase, ¿qué necesitas resolver?", type: "text", example: "Pedir copia de un documento." });
  for (const step of tool.steps) if (step.fields.some(f => f.name === "pruebas")) step.fields.push(detail("demuestra", "¿Qué demuestra cada prueba?", "Una línea por prueba, en el mismo orden. Ejemplo: la carta demuestra que pedí una respuesta."));
  if (["tutela", "popular", "cumplimiento"].includes(tool.kind)) {
    if (tool.kind !== "tutela") tool.steps.find(s => s.id === "hechos")!.fields.push({ name: "lugarHechos", label: "¿En qué municipio ocurrió?", type: "text" });
    const claims = tool.steps.find(s => s.fields.some(f => f.name === "pretensiones"))!;
    claims.fields.push(
      detail("responsables", "¿Quién debe cumplir cada pedido?", "Una línea por pedido, en el mismo orden."),
      detail("plazos", "¿En cuánto tiempo pides que cumplan cada pedido?", "Una línea por pedido. Es tu solicitud; el juez decide el plazo."),
      detail("verificaciones", "¿Cómo sabrás que cumplieron cada pedido?", "Una línea por pedido. Ejemplo: recibir el documento solicitado."),
      detail("hechosApoyo", "¿Qué hechos apoyan cada pedido?", "Escribe los números de los hechos. Una línea por pedido. Ejemplo: 1, 2."),
      detail("pruebasApoyo", "¿Qué pruebas apoyan cada pedido?", "Escribe los números de las pruebas. Una línea por pedido. Ejemplo: 1."),
    );
  }
}
TUTELA.steps.splice(3, 0, {
  id: "procedencia", title: "Por qué necesitas ayuda del juez", intro: "Estas respuestas explican por qué la tutela puede servirte.", fields: [
    detail("representacion", "Si actúas por alguien más, ¿por qué no puede hacerlo esa persona?", "Di a quién representas y cómo estás autorizado. Si actúas por ti, puedes saltar."),
    detail("relacionAccionado", "¿Qué hizo o dejó de hacer esa entidad?", "Explica qué puede hacer para resolverlo."),
    { name: "lugarHechos", label: "¿En qué municipio ocurrió?", type: "text" },
    { name: "cuando", label: "¿Cuándo pasó?", type: "text", hint: "Indica la fecha o lo más cercano que recuerdes." },
    detail("motivoAhora", "¿Por qué buscas ayuda del juez ahora?", "Si pasó tiempo, explica por qué esperaste."),
    detail("otrosMedios", "¿Hay otro camino para resolverlo? ¿Por qué no basta?", "Puedes decir que no lo sabes. No inventes trámites."),
    detail("peligro", "¿Hay peligro si esperas?", "Explica qué puede pasar y por qué es urgente; si no hay peligro, dilo."),
    detail("proteccionEspecial", "¿Hay algo de tu situación que requiera más cuidado?", "Por ejemplo: niñez, edad avanzada, discapacidad, pertenencia a un pueblo étnico o enfermedad grave. Si no aplica, dilo."),
    { name: "medidaProvisional", label: "¿Necesitas una orden urgente mientras el juez decide?", type: "select", options: ["No", "Sí"], hint: "Se llama medida provisional. Solo pídela si no puedes esperar al fallo." },
    detail("medida", "Si pediste una orden urgente, ¿qué debe hacerse?", "Si respondiste No, puedes saltar."),
    detail("razonMedida", "¿Por qué esa orden no puede esperar?", "Indica también qué prueba muestra la urgencia. Si no pediste la medida, salta."),
  ],
});
PETICION.steps.find(s => s.id === "peticiones")!.fields.push(detail("consideraciones", "¿Quieres explicar algo más sobre lo que pides?", "Es opcional. No agregues hechos que no conozcas."));
PETICION.steps.find(s => s.id === "peticiones")!.fields.push({ name: "peticionesAdicionales", label: "¿Quieres incluir alguno de estos pedidos?", type: "checkboxes", options: [
  "Que se responda de fondo y por separado cada petición.",
  "Que se entregue constancia de radicación y se informe el estado del trámite.",
  "Que se informe si falta un documento para poder completarlo.",
  "Que se notifique la respuesta por el medio de contacto indicado.",
] });
for (const tool of [CONSULTA_PREVIA, ACOMPANAMIENTO]) tool.steps.find(s => s.id === "peticiones")!.fields.unshift({ ...PETICION.steps.find(s => s.id === "peticiones")!.fields.find(f => f.name === "tipoPeticion")!, required: false });

export const TOOL_LIST: ToolConfig[] = [
  PETICION,
  CONSULTA_PREVIA,
  RECLAMACION,
  ACOMPANAMIENTO,
  TUTELA,
  POPULAR,
  CUMPLIMIENTO,
  GRUPO,
  DESACATO,
  IMPUGNACION,
];

export const TOOLS: Record<string, ToolConfig> = Object.fromEntries(TOOL_LIST.map((t) => [t.kind, t]));

export function toolBySlug(slug: string): ToolConfig | undefined {
  return TOOL_LIST.find((t) => t.slug === slug);
}

export type ToolData = Record<string, string | string[]>;

// Conserva el orden de la entrevista v2 para recuperar respuestas parciales antiguas.
export const LEGACY_TUTELA_FIELDS = ["hechos", ...TUTELA.steps.flatMap(s => s.fields.map(f => f.name)).filter(name => name !== "hechos")];
const tutelaFields = Object.fromEntries(TUTELA.steps.flatMap(s => s.fields).map(f => [f.name, f]));
const shortField = (name: string, changes: Partial<Field> = {}): Field => ({ ...tutelaFields[name], ...changes });
const shortStep = (id: string, title: string, fields: Field[], condition?: Step["condition"]): Step => ({ id, title, intro: "", fields, condition });
TUTELA.steps = [
  shortStep("hechos", "¿Qué pasó?", [shortField("hechos")]),
  shortStep("accionado", "¿Quién te está afectando?", [shortField("accionado", { hint: "Escribe el nombre de la entidad o de la persona." })]),
  shortStep("actuaciones", "¿Ya le pediste una solución? ¿Qué te respondieron?", [shortField("actuaciones", { required: true, hint: "Cuenta qué intentaste y la respuesta. Si no lo hiciste, di por qué. Si hay otro camino, explica si te puede ayudar a tiempo." })]),
  shortStep("cuando", "¿Cuándo pasó y sigue pasando?", [shortField("cuando", { type: "textarea", required: true, hint: "Di la fecha que recuerdes y si el problema continúa. Si esperaste para pedir ayuda, cuenta por qué." })]),
  shortStep("peligro", "¿Hay peligro para tu vida o tu salud si esperas?", [shortField("medidaProvisional", { required: true, options: ["No", "Sí"], hint: "Si dices Sí, podrás pedir una medida urgente mientras el juez decide." })]),
  shortStep("medida", "¿Qué medida urgente necesitas y por qué no puedes esperar?", [shortField("medida", { required: true, label: "¿Qué necesitas que hagan ahora?", hint: "Escribe la medida urgente que pides." }), shortField("razonMedida", { required: true, label: "¿Por qué no puedes esperar?", hint: "Cuenta qué puede pasar si esperas y qué lo demuestra, si lo sabes." })], "urgente"),
  shortStep("derechos", "¿Qué derechos te están afectando?", [shortField("derechos", { hint: "Las opciones marcadas por el relato son una SUGERENCIA. Puedes cambiarlas; confirma solo las que correspondan." })]),
  shortStep("pretensiones", "¿Qué quieres que ordene el juez?", [shortField("pretensiones")]),
  shortStep("pruebas", "¿Qué pruebas tienes?", [shortField("pruebas", { required: true, hint: "Haz una lista. Puedes escribir: ninguna por ahora." })]),
  shortStep("persona", "Tu nombre completo", [shortField("nombre"), shortField("calidad", { options: [CAPACITY[0], CAPACITY[2], CAPACITY[1]] })]),
  shortStep("representacion", "¿A nombre de quién presentas la tutela?", [shortField("comunidad", { required: true, label: "Nombre de la persona o comunidad", hint: "Escribe a quién representas." })], "representacion"),
  shortStep("documento", "Tu documento", [shortField("numeroDocumento"), shortField("tipoDocumento")]),
  shortStep("municipio", "¿En qué municipio estás?", [shortField("ciudad")]),
  shortStep("contacto", "¿Dónde te avisamos?", [shortField("correo", { hint: "Basta un correo o un teléfono." }), shortField("telefono")]),
];
const essentialNames = new Set(TUTELA.steps.flatMap(s => s.fields.map(f => f.name)));
// Detalle opcional de conversación: no añade preguntas al camino corto.
tutelaFields.hechosAdicionales = { name: "hechosAdicionales", label: "Hechos adicionales que aceptaste incluir", type: "textarea", hint: "Incluye solo lo que quieres que aparezca en el documento." };
TUTELA.steps.push({ id: "detalles", title: "Agregar más detalles (opcional)", intro: "Completa solo lo que sabes. Los datos pendientes se resaltarán en el borrador.", optionalDetails: true, fields: Object.values(tutelaFields).filter(f => !essentialNames.has(f.name) && !["hechosApoyo", "pruebasApoyo"].includes(f.name)).map(f => ({ ...f, required: false })) });

export function stepApplies(step: Step, data: ToolData): boolean {
  if (step.condition === "urgente") return data.medidaProvisional === "Sí";
  if (step.condition === "representacion") return !!data.calidad && data.calidad !== "En nombre propio";
  return true;
}

export type InterviewQuestion = { field: Field; fields: Field[]; stepId: string; title?: string };
export function interviewQuestions(config: ToolConfig, data: ToolData): InterviewQuestion[] {
  if (config.kind === "tutela") return config.steps.filter(s => !s.optionalDetails && stepApplies(s, data)).map(s => ({ field: s.fields[0], fields: s.fields, stepId: s.id, title: s.title }));
  const all = config.steps.flatMap(s => s.fields.map(field => ({ field, fields: [field], stepId: s.id })));
  return [...all.filter(q => q.field.name === "hechos"), ...all.filter(q => q.field.name !== "hechos")];
}

export function tutelaDefaults(data: ToolData = {}): ToolData {
  return { ...data, calidad: data.calidad || "En nombre propio", tipoDocumento: data.tipoDocumento || DOC_ID_TYPES[0] };
}

export function optionLabel(name: string, option: string): string {
  if (name === "calidad") return option === CAPACITY[0] ? "Para mí" : option === CAPACITY[1] ? "Para mi comunidad" : "Para otra persona";
  if (name !== "derechos") return option;
  const simple = ["Vivir con dignidad", "Mi cultura y mi pueblo", "Mi vida", "Trato igual, sin discriminación", "Recibir respuesta a lo que pido", "Un proceso justo", "Mi seguridad social", "Mi salud", "Estudiar", "Que consulten a mi comunidad"];
  return simple[RIGHTS.indexOf(option)] || option;
}

/** Solo preselección visible; nunca incorpora derechos al documento sin confirmar. */
export function suggestRights(story: string): string[] {
  const text = story.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rules: [RegExp, number][] = [[/medic|\beps\b|salud|hospital|tratamiento/, 7], [/escuela|colegio|estudi|educa|matricula/, 8], [/discrimin|desigual/, 3], [/peticion|solicitud|no.*respond/, 4], [/consulta.*comunidad|consulta previa|no nos consultaron/, 9], [/amenaza.*vida|matar|riesgo.*vida/, 2]];
  return rules.filter(([rule]) => rule.test(text)).map(([, index]) => RIGHTS[index]);
}

export function noEvidence(data: ToolData): boolean {
  return /^(?:ningun[ao](?: por ahora)?|no (?:tengo|cuento con) pruebas(?: por ahora)?)[.!]?$/i.test(String(data.pruebas || "").trim());
}

/** Cambia índices v2 por pantallas estables sin perder campos ni texto sin enviar. */
export function migrateTutelaDraft(saved: { version: number; data: ToolData; index: number; answer: string; picked: string[]; questionId?: string }) {
  const data = tutelaDefaults(saved.data);
  let name: string | undefined;
  if (saved.version === 2) {
    name = LEGACY_TUTELA_FIELDS[saved.index];
    if (name && (saved.answer || saved.picked.length)) data[name] = name === "derechos" ? saved.picked : saved.answer;
  }
  const questions = interviewQuestions(TUTELA, data);
  const mapped = questions.findIndex(q => saved.version === 2 ? q.fields.some(f => f.name === name) : q.stepId === saved.questionId);
  // Si era un detalle opcional o la revisión, retoma la primera pantalla incompleta.
  const incomplete = questions.findIndex(q => Object.keys(validateTool(TUTELA, data, q.stepId)).length > 0);
  const index = mapped >= 0 ? mapped : incomplete >= 0 ? incomplete : questions.length;
  return { ...saved, version: 3 as const, data, index, questionId: questions[index]?.stepId || "revision", answer: saved.version === 3 ? saved.answer : String(data[questions[index]?.field.name] || ""), picked: saved.version === 3 ? saved.picked : Array.isArray(data.derechos) && questions[index]?.field.name === "derechos" ? data.derechos : [] };
}

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
  actuaciones: "¿Ya le pediste esto a la entidad? ¿Qué te respondió?",
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
    [/desacato|(?:tutela|fallo).*(?:no cumplen|incumpl)|ganamos.*tutela/, DESACATO],
    [/impugna|(?:fallo|tutela).*(?:no estoy de acuerdo|negaron)/, IMPUGNACION],
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
    if (!stepApplies(step, data)) continue;
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
      const any = (config.kind === "tutela" ? ["correo", "telefono"] : ["direccion", "correo", "telefono"]).some((k) => String(data[k] ?? "").trim());
      if (!any) errors[config.kind === "tutela" ? "correo" : "direccion"] = "Indica al menos un medio de contacto.";
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
