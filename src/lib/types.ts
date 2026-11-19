import type { CategoryNode, DocStatus, DocumentSummary } from "./constants";

export type DocumentMeta = {
  title?: string;
  entity?: string;
  docType?: string;
  docDate?: string;
  officialUrl?: string;
  summary?: string;
  status?: DocStatus;
  reviewNote?: string;
  categoryIds?: number[];
  /** Peso en la búsqueda del asistente (1 = normal; menor = aparece después). */
  weight?: number;
};

export type CreateResult = { document: DocumentSummary; duplicate: boolean; warning?: string };

export type Route = {
  id: string;
  title: string;
  /** Qué entendió RAIZIA del relato (una frase). */
  issue: string;
  why: string;
  /** Pasos concretos, en orden. */
  steps: string[];
  /** Herramienta de RAIZIA que ayuda en este camino. */
  tool?: { slug: string; name: string; label: string };
};

export type Doubt = { q: string; a: string };

export type LibraryParams = {
  q?: string;
  categoria?: string;
  tipo?: string;
  entidad?: string;
  pagina?: string;
  tamano?: number;
};

export type LibraryResponse = {
  documents: DocumentSummary[];
  total: number;
  page: number;
  pages: number;
  approved: number;
  facets: { entities: string[]; docTypes: string[] };
  categories: CategoryNode[];
};

export type DocumentWithChunks = {
  document: DocumentSummary;
  chunks: { id: number; heading: string; content: string }[];
};

export type HomeResponse = {
  stats: { approved: number; total: number; pending: number; chunks: number; categories: number };
  categories: CategoryNode[];
};

export type AdminSession = { configured: boolean; admin: boolean };
