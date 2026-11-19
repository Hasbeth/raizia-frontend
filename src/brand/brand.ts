/**
 * Identidad de marca de RAIZIA — punto único de edición.
 *
 * Textos de marca: este archivo.
 * Colores, tipografías, radios y sombras: `src/app/globals.css` (bloque @theme).
 * Logotipo: `src/components/Logo.tsx`.
 *
 * Cuando lleguen los manuales institucionales, basta con ajustar estos tres
 * lugares para que toda la aplicación adopte las nuevas directrices.
 */
export const brand = {
  name: "RAIZIA",
  tagline: "Nuestras raíces, nuestros derechos.",
  description:
    "Plataforma inteligente de orientación jurídica y protección de derechos colectivos.",
  /** Nota de contexto. No implica respaldo institucional oficial. */
  context:
    "Proyecto académico independiente, desarrollado en el marco de ALUNA IA, iniciativa de la Universidad del Magdalena. No constituye un servicio ni una posición institucional oficial.",
  disclaimer:
    "RAIZIA ofrece orientación general basada en documentos oficiales. No reemplaza la asesoría de un abogado, de la Defensoría del Pueblo ni de las autoridades propias de cada comunidad.",
} as const;

export const nav = [
  { href: "/", label: "Inicio" },
  { href: "/asistente", label: "Asistente jurídico" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/herramientas", label: "Herramientas" },
] as const;

export const suggestedQuestions = [
  "¿Qué es la consulta previa y cuándo es obligatoria?",
  "Una entidad no responde mi solicitud, ¿qué puedo hacer?",
  "¿Qué derechos tenemos sobre nuestro territorio y los resguardos?",
  "¿Cuándo puedo presentar una acción de tutela?",
  "¿Qué es la jurisdicción especial indígena?",
  "¿Cómo se protegen las lenguas y la cultura de los pueblos indígenas?",
] as const;
