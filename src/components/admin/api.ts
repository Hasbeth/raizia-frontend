"use client";

import { useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options }); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("No pudimos conectar. Revisa tu conexión e intenta de nuevo.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(typeof data?.error === "string" ? data.error : "No pudimos completar la solicitud. Intenta de nuevo.", response.status);
  if (data === null) throw new ApiError("La respuesta no se pudo leer. Intenta de nuevo.");
  return data as T;
}

export function jsonRequest(method: string, value: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos completar la solicitud. Intenta de nuevo.";
}

/** Ignore responses belonging to an older search, retry, or unmounted panel. */
export function useAdminResource<T>(url: string, revision = 0) {
  const key = `${url}:${revision}`;
  const [state, setState] = useState<{ key: string; data: T | null; error: Error | null }>({ key: "", data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    api<T>(url, { signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setState({ key, data, error: null }); },
      (error: unknown) => { if (!controller.signal.aborted) setState((previous) => ({ key, data: previous.data, error: error instanceof Error ? error : new Error(errorMessage(error)) })); },
    );
    return () => controller.abort();
  }, [url, key]);
  return { data: state.data, loading: state.key !== key, error: state.key === key ? state.error : null };
}
