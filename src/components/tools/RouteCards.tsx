"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "@/lib/types";

/** Caminos sugeridos por el orientador, en orden, con el paso a la herramienta que corresponde. */
export function RouteCards({ routes, story }: { routes: Route[]; story: string }) {
  const router = useRouter();

  const go = (slug: string) => {
    try {
      // El relato viaja por el almacenamiento de la pestaña, no por la dirección web.
      window.sessionStorage.setItem("raizia.relato", story);
    } catch {
      /* sin almacenamiento */
    }
    router.push(`/herramientas/${slug}`);
  };

  return (
    <ol className="space-y-3">
      {routes.map((r, i) => (
        <li key={r.id} className={`card p-5 ${i === 0 && routes.length > 1 ? "!border-forest-500 shadow-soft" : ""}`}>
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg ${
                i === 0 ? "bg-forest-700 text-paper" : "bg-forest-100 text-forest-800"
              }`}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              {routes.length > 1 && (
                <p className="text-xs font-semibold tracking-wide text-clay-dark uppercase">
                  Camino condicionado
                </p>
              )}
              <h3 className="font-sans text-[1.0625rem] font-semibold tracking-normal text-forest-900">{r.title}</h3>
              {r.condition && <p className="mt-2 font-semibold text-forest-800">{r.condition}</p>}
              <p className="mt-1 leading-relaxed text-ink/85">{r.why}</p>
            </div>
          </div>
          {r.steps.length > 0 && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[0.9875rem] leading-relaxed text-ink/85 marker:text-clay">
              {r.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {r.tool && (
            <button
              type="button"
              onClick={() => go(r.tool!.slug)}
              className={`btn mt-4 !min-h-12 w-full !whitespace-normal text-left sm:w-auto ${i === 0 ? "btn-primary" : "btn-secondary"}`}
            >
              {r.tool.label}
              <ArrowRight size={17} className="shrink-0" />
            </button>
          )}
          {!!r.sources?.length && <ul aria-label="Fuentes de este camino" className="mt-4 space-y-2 text-sm">
            {r.sources.map(s => <li key={s.n}>
              <span className="chip chip-earth mr-2">{s.docType}</span>
              <Link className="underline" href={`/biblioteca/${s.documentId}#f-${s.chunkId}`}>[{s.n}] {s.title} — {s.heading}</Link>
              {s.docDate && <span> · {s.docDate}</span>}
              {s.officialUrl && /^https?:\/\//i.test(s.officialUrl) && <a href={s.officialUrl} target="_blank" rel="noreferrer noopener" className="ml-2 underline">Fuente original</a>}
            </li>)}
          </ul>}
        </li>
      ))}
    </ol>
  );
}
