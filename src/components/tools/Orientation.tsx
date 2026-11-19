"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Compass, LoaderCircle } from "lucide-react";
import type { Doubt, Route } from "@/lib/types";
import { RouteCards } from "./RouteCards";

/** Entrada para quien no sabe qué documento necesita: cuenta qué pasó y recibe el camino. */
export function Orientation() {
  const [story, setStory] = useState("");
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const orient = async () => {
    if (story.trim().length < 12) {
      setError("Cuéntame un poco más para poder orientarte.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tools/orientar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story }),
      });
      const body = (await res.json()) as { routes: Route[]; doubts?: Doubt[] };
      setRoutes(body.routes);
      setDoubts(body.doubts || []);
    } catch {
      setError("No pude orientarte en este momento. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/herramientas" className="btn btn-ghost btn-sm -ml-3 text-muted">
        <ArrowLeft size={16} />
        Herramientas
      </Link>
      <p className="eyebrow mt-5">Orientación</p>
      <h1 className="mt-2 text-3xl text-forest-900 md:text-4xl">Cuéntame qué pasó y te digo qué camino seguir</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        No necesitas saber el nombre del documento ni de la entidad. Escribe como hablas.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void orient();
        }}
        className="mt-7"
      >
        <label htmlFor="relato" className="sr-only">
          Qué pasó
        </label>
        <textarea
          id="relato"
          rows={6}
          value={story}
          onChange={(e) => {
            setStory(e.target.value);
            setError("");
          }}
          placeholder="Por ejemplo: desde enero no hay médico en el puesto de salud y la alcaldía no responde…"
          className="input !rounded-3xl !p-5 !text-[1.0625rem]"
        />
        {error && (
          <p role="alert" className="mt-2 font-medium text-[#9b2c1f]">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary mt-4 !min-h-13 w-full !px-6 text-base sm:w-auto">
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Compass size={18} />}
          {loading ? "Revisando tu caso…" : "Orientarme"}
        </button>
      </form>

      {routes && (
        <section className="animate-rise mt-9" aria-live="polite">
          <h2 className="text-2xl text-forest-900">Esto fue lo que entendí</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[1.0625rem] leading-relaxed text-ink/90 marker:text-clay">
            {routes.map((r) => (
              <li key={r.id}>{r.issue}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Si entendí mal, corrige el relato arriba y vuelve a tocar «Orientarme».</p>

          <h2 className="mt-9 text-2xl text-forest-900">Por dónde empezar</h2>
          <div className="mt-4">
            <RouteCards routes={routes} story={story} />
          </div>

          {doubts.length > 0 && (
            <>
              <h2 className="mt-9 text-2xl text-forest-900">Tus dudas</h2>
              <dl className="mt-4 space-y-3">
                {doubts.map((d) => (
                  <div key={d.q} className="rounded-2xl border border-line bg-sand/50 p-5">
                    <dt className="font-semibold text-forest-900">{d.q}</dt>
                    <dd className="mt-1.5 leading-relaxed text-ink/85">{d.a}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Es una orientación general a partir de tu relato, no una decisión jurídica. Si tienes dudas, la
            personería de tu municipio y la Defensoría del Pueblo orientan sin costo.
          </p>
        </section>
      )}
    </div>
  );
}
