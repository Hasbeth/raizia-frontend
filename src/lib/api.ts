import "server-only";
import { cache } from "react";
import type { AdminSession, DocumentWithChunks, HomeResponse, LibraryParams, LibraryResponse } from "./types";

class BackendError extends Error {
  constructor(public readonly status?: number) {
    super("No pudimos conectar con el servidor de RAIZIA. Intenta de nuevo en un momento.");
  }
}

async function getJson<T>(path: string, cookieHeader?: string): Promise<T> {
  const base = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new BackendError();
  }
  if (!response.ok) throw new BackendError(response.status);
  return response.json() as Promise<T>;
}

export function getLibrary(params: LibraryParams = {}): Promise<LibraryResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return getJson(`/api/library?${query}`);
}

// Deduplica la consulta de la página y sus metadatos solo dentro de cada render.
export const getDocumentWithChunks = cache(async (id: number): Promise<DocumentWithChunks | null> => {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await getJson<DocumentWithChunks>(`/api/documents/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null;
    throw error;
  }
});

export function getHome(): Promise<HomeResponse> {
  return getJson("/api/home");
}

export function getAdminSession(cookieHeader: string): Promise<AdminSession> {
  return getJson("/api/admin/session", cookieHeader);
}
