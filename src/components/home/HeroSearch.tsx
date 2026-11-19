"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { suggestedQuestions } from "@/brand/brand";

export function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const go = (q: string) => {
    const text = q.trim();
    if (!text) {
      ref.current?.focus();
      return;
    }
    router.push(`/asistente?q=${encodeURIComponent(text)}`);
  };

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="group rounded-[1.75rem] border border-line-strong bg-paper p-2 shadow-soft transition-shadow focus-within:border-forest-500 focus-within:shadow-lift"
      >
        <label htmlFor="consulta-inicio" className="sr-only">
          Escribe tu consulta jurídica
        </label>
        <textarea
          id="consulta-inicio"
          ref={ref}
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              go(value);
            }
          }}
          placeholder="Cuéntanos tu situación con tus propias palabras…"
          className="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[1.0625rem] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="pl-2 text-xs text-faint">Respuestas con citas de documentos oficiales</p>
          <button type="submit" className="btn btn-primary">
            Consultar
            <ArrowRight size={17} />
          </button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-sm font-medium text-muted">O empieza con una pregunta frecuente:</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => go(q)}
                className="group/q inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-3.5 py-2 text-left text-sm text-ink/85 transition-colors hover:border-forest-300 hover:bg-forest-50 hover:text-forest-900"
              >
                {q}
                <ArrowUpRight
                  size={14}
                  className="shrink-0 text-faint transition-transform group-hover/q:translate-x-0.5 group-hover/q:-translate-y-0.5 group-hover/q:text-forest-600"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
