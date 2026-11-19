"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";

export function LibraryFilters({
  entities,
  docTypes,
}: {
  entities: string[];
  docTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") || "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina"); // un filtro nuevo empieza desde la primera página
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Mantiene el campo sincronizado si la dirección cambia (p. ej. "Quitar filtros").
  const urlQ = params.get("q") || "";
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (seenUrlQ !== urlQ) {
    setSeenUrlQ(urlQ);
    if (urlQ !== q.trim()) setQ(urlQ);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onType = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update("q", value.trim()), 350);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        update("q", q.trim());
      }}
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
    >
      <div className="relative">
        <label htmlFor="buscar-biblioteca" className="sr-only">
          Buscar en la biblioteca
        </label>
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
        <input
          id="buscar-biblioteca"
          type="search"
          value={q}
          onChange={(e) => onType(e.target.value)}
          placeholder="Buscar por nombre, entidad, tema o contenido…"
          className="input !rounded-full !pr-11 !pl-11 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center">
          {pending ? (
            <LoaderCircle size={17} className="animate-spin text-forest-500" aria-label="Buscando" />
          ) : q ? (
            <button
              type="button"
              onClick={() => onType("")}
              aria-label="Borrar búsqueda"
              className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-sand hover:text-ink"
            >
              <X size={16} />
            </button>
          ) : null}
        </span>
      </div>
      <div>
        <label htmlFor="filtro-tipo" className="sr-only">
          Tipo de documento
        </label>
        <select
          id="filtro-tipo"
          className="input !rounded-full sm:w-44"
          value={params.get("tipo") || ""}
          onChange={(e) => update("tipo", e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {docTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filtro-entidad" className="sr-only">
          Entidad emisora
        </label>
        <select
          id="filtro-entidad"
          className="input !rounded-full sm:w-52"
          value={params.get("entidad") || ""}
          onChange={(e) => update("entidad", e.target.value)}
        >
          <option value="">Todas las entidades</option>
          {entities.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
