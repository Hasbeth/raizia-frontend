/** Constantes compartidas entre servidor y cliente (sin dependencias de Node). */

export const DOC_TYPES = [
  "Constitución",
  "Ley",
  "Decreto",
  "Resolución",
  "Sentencia",
  "Auto",
  "Convenio o tratado",
  "Directiva o circular",
  "Guía o informe",
  "Otro",
] as const;

export const STATUSES = ["borrador", "revision", "aprobado"] as const;
export type DocStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<DocStatus, string> = {
  borrador: "Borrador",
  revision: "En revisión",
  aprobado: "Aprobado",
};

/** Dominios desde los que el importador acepta documentos. */
export const OFFICIAL_DOMAINS = [
  "gov.co",
  "ramajudicial.gov.co",
  "ilo.org",
  "un.org",
  "ohchr.org",
  "oas.org",
  "corteidh.or.cr",
] as const;

export type Category = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string;
  keywords: string;
  sort: number;
  docCount: number;
};

export type CategoryNode = Category & { children: Category[] };

export type DocumentSummary = {
  id: number;
  title: string;
  entity: string;
  docType: string;
  docDate: string;
  officialUrl: string;
  summary: string;
  status: DocStatus;
  fileName: string;
  mime: string;
  fileSize: number;
  sourceKind: "upload" | "url";
  textChars: number;
  chunkCount: number;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  categories: { id: number; name: string; parentId: number | null }[];
  /** Fragmento resaltado cuando la búsqueda coincide con el contenido. */
  snippet?: string;
};

export type ChatSource = {
  n: number;
  documentId: number;
  chunkId: number;
  title: string;
  entity: string;
  docType: string;
  docDate: string;
  heading: string;
  excerpt: string;
  officialUrl: string;
};

export type ChatMeta = {
  type: "meta";
  /**
   * ia: respuesta con fuentes · conversacion: charla sin contenido jurídico ·
   * busqueda: solo apartados (IA no disponible) · sin_resultados: nada que mostrar.
   */
  mode: "ia" | "conversacion" | "busqueda" | "sin_resultados";
  topics: { id: number; name: string }[];
  sources: ChatSource[];
  model?: string;
  notice?: string;
  /** Herramienta que podría servir para dejar el caso por escrito. */
  tool?: { slug: string; name: string };
};

export type ChatEvent =
  | ChatMeta
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

/** Marcadores de resaltado usados por la búsqueda (se convierten a <mark> en la interfaz). */
export const MARK_OPEN = "\u0001";
export const MARK_CLOSE = "\u0002";

export function formatBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [, y, mo, d] = m;
  if (mo && d) return `${Number(d)} de ${months[Number(mo) - 1]} de ${y}`;
  if (mo) return `${months[Number(mo) - 1]} de ${y}`;
  return y;
}
