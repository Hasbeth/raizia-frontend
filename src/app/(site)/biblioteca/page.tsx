import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FilePlus2, FileSearch, LibraryBig } from "lucide-react";
import { Highlight } from "@/components/Highlight";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { formatDate } from "@/lib/constants";
import { getLibrary } from "@/lib/api";

const short = (t: string, n = 280) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, "")}…` : t);

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Biblioteca jurídica",
  description: "Normas y jurisprudencia oficiales organizadas por temáticas.",
};

type Search = { q?: string; categoria?: string; tipo?: string; entidad?: string; pagina?: string };

function hrefWith(current: Search, patch: Partial<Search>): string {
  const next = new URLSearchParams();
  // Cambiar cualquier filtro vuelve a la primera página.
  const merged = { ...current, pagina: undefined, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v && !(k === "pagina" && v === "1")) next.set(k, v);
  const qs = next.toString();
  return qs ? `/biblioteca?${qs}` : "/biblioteca";
}

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const current: Search = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    categoria: typeof sp.categoria === "string" ? sp.categoria : undefined,
    tipo: typeof sp.tipo === "string" ? sp.tipo : undefined,
    entidad: typeof sp.entidad === "string" ? sp.entidad : undefined,
    pagina: typeof sp.pagina === "string" ? sp.pagina : undefined,
  };
  const categoryId = Number(current.categoria) || undefined;

  const { documents: visible, total: matches, approved: total, pages, page, facets, categories: tree } =
    await getLibrary(current);

  const activeParent = tree.find((c) => c.id === categoryId || c.children.some((s) => s.id === categoryId));
  const activeCategory =
    activeParent?.id === categoryId ? activeParent : activeParent?.children.find((s) => s.id === categoryId);
  const filtered = Boolean(current.q || categoryId || current.tipo || current.entidad);

  return (
    <div className="container-page pt-12 pb-8 md:pt-16">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="max-w-3xl">
        <p className="eyebrow">Biblioteca jurídica</p>
        <h1 className="mt-3 text-4xl text-forest-900 md:text-5xl">
          Documentos oficiales, organizados por tema
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Leyes, decretos y sentencias revisados antes de publicarse. Son las mismas fuentes que
          consulta el asistente.
        </p>
        </div>
        <Link href="/admin#agregar" className="btn btn-secondary shrink-0">
          <FilePlus2 size={17} />
          Agregar documentos
        </Link>
      </header>

      <div className="mt-9">
        <LibraryFilters entities={facets.entities} docTypes={facets.docTypes} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[17rem_1fr]">
        {/* Temáticas */}
        <nav aria-label="Temáticas" className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="eyebrow !text-faint max-lg:sr-only">Temáticas</h2>
          <ul className="flex gap-2 overflow-x-auto pb-2 max-lg:-mx-5 max-lg:px-5 lg:mt-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            <li className="shrink-0">
              <Link
                href={hrefWith(current, { categoria: undefined })}
                aria-current={!categoryId ? "page" : undefined}
                className={`flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl lg:px-3 lg:whitespace-normal ${
                  !categoryId
                    ? "bg-forest-700 text-paper lg:bg-forest-100 lg:text-forest-900"
                    : "border border-line bg-paper text-ink/80 hover:bg-forest-50 lg:border-0 lg:bg-transparent"
                }`}
              >
                Todas
                <span className="text-xs tabular-nums opacity-70 max-lg:hidden">{total}</span>
              </Link>
            </li>
            {tree.map((c) => {
              const active = activeParent?.id === c.id;
              return (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={hrefWith(current, { categoria: String(c.id) })}
                    aria-current={categoryId === c.id ? "page" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl lg:px-3 lg:whitespace-normal ${
                      active
                        ? "bg-forest-700 text-paper lg:bg-forest-100 lg:text-forest-900"
                        : "border border-line bg-paper text-ink/80 hover:bg-forest-50 lg:border-0 lg:bg-transparent"
                    }`}
                  >
                    {c.name}
                    <span className="text-xs tabular-nums opacity-70 max-lg:hidden">{c.docCount || ""}</span>
                  </Link>
                  {active && c.children.length > 0 && (
                    <ul className="mt-1 mb-2 ml-3 hidden border-l border-line pl-2 lg:block">
                      {c.children.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={hrefWith(current, { categoria: String(s.id) })}
                            aria-current={categoryId === s.id ? "page" : undefined}
                            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              categoryId === s.id
                                ? "font-semibold text-forest-800"
                                : "text-muted hover:text-forest-800"
                            }`}
                          >
                            {s.name}
                            <span className="text-xs tabular-nums text-faint">{s.docCount || ""}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Resultados */}
        <section aria-label="Documentos" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm text-muted">
              <strong className="font-semibold text-ink">
                {matches} {matches === 1 ? "documento" : "documentos"}
              </strong>
              {activeCategory ? ` en ${activeCategory.name}` : ""}
              {current.q ? ` para «${current.q}»` : ""}
            </p>
            {filtered && (
              <Link href="/biblioteca" className="text-sm font-semibold text-forest-700 underline-offset-4 hover:underline">
                Quitar filtros
              </Link>
            )}
          </div>

          {activeParent && activeParent.children.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {activeParent.children.map((s) => (
                <li key={s.id}>
                  <Link
                    href={hrefWith(current, { categoria: String(categoryId === s.id ? activeParent.id : s.id) })}
                    className={`chip !py-1.5 ${categoryId === s.id ? "!border-forest-600 !bg-forest-100" : "chip-neutral"}`}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {matches === 0 ? (
            <div className="mx-auto max-w-md py-20 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-soil">
                {total === 0 ? <LibraryBig size={26} strokeWidth={1.6} /> : <FileSearch size={26} strokeWidth={1.6} />}
              </span>
              {total === 0 ? (
                <>
                  <h2 className="mt-5 text-2xl text-forest-900">La biblioteca está vacía</h2>
                  <p className="mt-2 leading-relaxed text-muted">
                    Aún no hay documentos aprobados. Se cargan y revisan desde el panel de
                    administración.
                  </p>
                  <Link href="/admin" className="btn btn-secondary mt-6">
                    Ir a Administración
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="mt-5 text-2xl text-forest-900">No encontramos documentos</h2>
                  <p className="mt-2 leading-relaxed text-muted">
                    Prueba con otras palabras, quita algún filtro o pregúntale directamente al
                    asistente.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                    <Link href="/biblioteca" className="btn btn-secondary">
                      Quitar filtros
                    </Link>
                    <Link
                      href={current.q ? `/asistente?q=${encodeURIComponent(current.q)}` : "/asistente"}
                      className="btn btn-primary"
                    >
                      Preguntar al asistente
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <ul>
              {visible.map((d) => (
                <li key={d.id} className="border-b border-line">
                  <Link href={`/biblioteca/${d.id}`} className="group block py-6 transition-colors">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
                      <span className={`chip ${d.docType === "Sentencia" || d.docType === "Auto" ? "chip-earth" : ""}`}>
                        {d.docType}
                      </span>
                      <span className="text-muted">
                        {[d.entity, formatDate(d.docDate)].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <h2 className="mt-2.5 flex items-start justify-between gap-4 text-[1.35rem] leading-snug text-forest-900 group-hover:text-forest-700">
                      <span>{d.title}</span>
                      <ArrowUpRight
                        size={20}
                        className="mt-1 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest-600"
                      />
                    </h2>
                    {d.snippet ? (
                      <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
                        <Highlight text={d.snippet} />
                      </p>
                    ) : d.summary ? (
                      <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">{short(d.summary)}</p>
                    ) : null}
                    {d.categories.length > 0 && (
                      <p className="mt-3 flex flex-wrap gap-1.5">
                        {d.categories.slice(0, 4).map((c) => (
                          <span key={c.id} className="chip chip-neutral">
                            {c.name}
                          </span>
                        ))}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Páginas" className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
              {page > 1 && (
                <Link href={hrefWith(current, { pagina: String(page - 1) })} className="btn btn-secondary">
                  ← Anteriores
                </Link>
              )}
              <span className="text-muted">
                Página {page} de {pages}
              </span>
              {page < pages && (
                <Link href={hrefWith(current, { pagina: String(page + 1) })} className="btn btn-secondary">
                  Siguientes →
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
