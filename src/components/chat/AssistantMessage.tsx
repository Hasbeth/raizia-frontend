"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpenText,
  Check,
  FilePenLine,
  Copy,
  ExternalLink,
  RotateCcw,
  SearchX,
  TriangleAlert,
  Volume2,
  Square,
} from "lucide-react";
import type { ChatMeta, ChatSource } from "@/lib/constants";
import { formatDate } from "@/lib/constants";
import { LogoMark } from "@/components/Logo";
import { speakAnswer, supportsSpeech, subscribeSpeechSupport } from "@/lib/speech";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: ChatMeta;
  status?: "buscando" | "redactando" | "listo" | "detenido";
  error?: string;
};

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-forest-500"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/** Convierte las citas [1], [1, 2] o [Fuente 1] en enlaces internos a la fuente. */
function linkCitations(text: string, valid: Set<number>): string {
  return text.replace(
    /\[(?:fuentes?\s+)?(\d{1,2}(?:\s*(?:,|y)\s*\d{1,2})*)\]/gi,
    (whole, inner: string) => {
      const nums = inner.split(/\s*(?:,|y)\s*/).map(Number);
      if (!nums.some((n) => valid.has(n))) return whole;
      return nums
        .filter((n) => valid.has(n))
        .map((n) => `[${n}](#cita-${n})`)
        .join(" ");
    },
  );
}

function groupByDocument(sources: ChatSource[]) {
  const groups: { doc: ChatSource; items: ChatSource[] }[] = [];
  for (const s of sources) {
    const g = groups.find((x) => x.doc.documentId === s.documentId);
    if (g) g.items.push(s);
    else groups.push({ doc: s, items: [s] });
  }
  return groups;
}

export function AssistantMessage({
  message,
  question = "",
  onRetry,
  onAnswer,
}: {
  message: ChatMessage;
  /** Consulta de la persona que originó esta respuesta. */
  question?: string;
  onRetry?: () => void;
  onAnswer?: (answer: string) => void;
}) {
  const { meta, status, content, error } = message;
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const canSpeak = useSyncExternalStore(subscribeSpeechSupport, supportsSpeech, () => false);
  useEffect(() => () => stopRef.current?.(), []);
  const sources = meta?.sources || [];
  const valid = new Set(sources.map((s) => s.n));
  const streaming = status === "buscando" || status === "redactando";
  const generative = meta?.mode === "ia" || meta?.mode === "conversacion";
  const spokenText = content || (meta?.mode === "sin_resultados"
    ? "No encontré información. Intenta contarme más sobre lo que pasa."
    : sources.map(s => `${s.title}. ${s.heading}. ${s.excerpt}`).join(" "));

  const goToSource = (n: number) => {
    const el = document.getElementById(`${message.id}-f${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(n);
    window.setTimeout(() => setFlash(null), 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* portapapeles no disponible */
    }
  };

  return (
    <article className="animate-rise flex gap-3 sm:gap-4" aria-busy={streaming}>
      <LogoMark size={30} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="sr-only">RAIZIA responde:</p>

        {status === "buscando" && (
          <p className="flex items-center gap-3 py-1 text-[0.9375rem] text-muted" role="status">
            Buscando en la biblioteca jurídica <Dots />
          </p>
        )}

        {meta?.mode === "sin_resultados" && (
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-soil">
                <SearchX size={18} />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
                  No encontré información sobre esto en la biblioteca
                </h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
                  RAIZIA solo responde con base en documentos oficiales ya revisados, y ninguno
                  trata este tema con claridad. Prefiero decírtelo antes que darte una respuesta sin
                  respaldo.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.9375rem] text-muted marker:text-clay">
                  <li>Intenta describir la situación con otras palabras o con más detalle.</li>
                  <li>
                    Revisa directamente la{" "}
                    <Link href="/biblioteca" className="font-medium text-forest-700 underline underline-offset-4">
                      biblioteca jurídica
                    </Link>
                    .
                  </li>
                  <li>Si es urgente, acude a la Defensoría del Pueblo o a la personería municipal.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {meta?.mode === "busqueda" && (
          <>
            <div className="notice" role="status">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <p>
                <strong className="font-semibold">Modo búsqueda documental.</strong> {meta.notice}{" "}
                No puedo redactar una explicación, pero estos son los apartados de la biblioteca
                más relacionados con tu consulta.
              </p>
            </div>
          </>
        )}

        {generative && (
          <>
            {status === "redactando" && !content && (
              <p className="flex items-center gap-3 py-1 text-[0.9375rem] text-muted" role="status">
                {meta?.mode === "ia" ? (
                  <>
                    Leyendo {sources.length} {sources.length === 1 ? "apartado" : "apartados"} y
                    redactando la respuesta
                  </>
                ) : (
                  "Escribiendo"
                )}{" "}
                <Dots />
              </p>
            )}
            {content && (
              <div className="prose-raizia">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => {
                      const m = /^#cita-(\d+)$/.exec(href || "");
                      if (m) {
                        const n = Number(m[1]);
                        const s = sources.find((x) => x.n === n);
                        return (
                          <button
                            type="button"
                            onClick={() => goToSource(n)}
                            title={s ? `${s.title}${s.heading ? " — " + s.heading : ""}` : undefined}
                            aria-label={`Ver fuente ${n}`}
                            className="mx-0.5 inline-flex h-[1.35rem] min-w-[1.35rem] -translate-y-px items-center justify-center rounded-md bg-forest-100 px-1 align-middle text-[0.72rem] font-bold text-forest-800 transition-colors hover:bg-forest-700 hover:text-paper"
                          >
                            {n}
                          </button>
                        );
                      }
                      return (
                        <a href={href} target="_blank" rel="noreferrer noopener">
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {linkCitations(content, valid)}
                </ReactMarkdown>
                {status === "redactando" && (
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-forest-500"
                  />
                )}
              </div>
            )}
            {status === "detenido" && (
              <p className="mt-2 text-sm text-faint italic">Respuesta detenida.</p>
            )}
          </>
        )}

        {error && (
          <div className="notice notice-error mt-3" role="alert">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              {onRetry && (
                <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-3">
                  <RotateCcw size={14} />
                  Intentar de nuevo
                </button>
              )}
            </div>
          </div>
        )}

        {!streaming && sources.length > 0 && (
          <section className="mt-5" aria-label="Fuentes consultadas">
            {meta && meta.topics.length > 0 && (
              <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <span className="font-medium">Temas identificados:</span>
                {meta.topics.map((t) => (
                  <Link key={t.id} href={`/biblioteca?categoria=${t.id}`} className="chip chip-earth hover:brightness-95">
                    {t.name}
                  </Link>
                ))}
              </p>
            )}
            <h3 className="eyebrow !text-muted">
              {meta?.mode === "ia" ? "Fuentes de esta respuesta" : "Apartados encontrados"}
            </h3>
            <ul className="mt-2.5 space-y-2.5">
              {groupByDocument(sources).map(({ doc, items }) => (
                <li key={doc.documentId} className="card overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-3.5 pb-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-forest-900">{doc.title}</p>
                      {doc.kind === "contexto" && <span className="chip chip-earth mt-1">{doc.docType} · Contexto</span>}
                      <p className="mt-0.5 text-xs text-muted">
                        {[doc.docType, doc.entity, formatDate(doc.docDate)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Link href={`/biblioteca/${doc.documentId}`} className="btn btn-secondary btn-sm !min-h-8 !px-3">
                        <BookOpenText size={14} />
                        Biblioteca
                      </Link>
                      {doc.officialUrl && (
                        <a
                          href={doc.officialUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn btn-secondary btn-sm !min-h-8 !px-3"
                        >
                          <ExternalLink size={14} />
                          Fuente oficial
                        </a>
                      )}
                    </div>
                  </div>
                  <ul className="border-t border-line">
                    {items.map((s) => (
                      <li
                        key={s.n}
                        id={`${message.id}-f${s.n}`}
                        className={`flex gap-3 border-b border-line/70 px-4 py-3 transition-colors duration-500 last:border-b-0 ${
                          flash === s.n ? "bg-ochre-soft" : ""
                        }`}
                      >
                        <span className="mt-0.5 flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-md bg-forest-100 px-1 text-[0.72rem] font-bold text-forest-800">
                          {s.n}
                        </span>
                        <div className="min-w-0 text-sm leading-relaxed">
                          {s.heading && <p className="font-semibold text-ink">{s.heading}</p>}
                          <p className="text-muted">{s.excerpt}</p>
                          <Link
                            href={`/biblioteca/${s.documentId}#f-${s.chunkId}`}
                            className="mt-1 inline-block text-xs font-semibold text-forest-700 underline-offset-4 hover:underline"
                          >
                            Leer el apartado completo
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!streaming && meta?.identityQuestion && onAnswer && <fieldset className="mt-4">
          <legend className="font-semibold">{meta.identityQuestion.texto}</legend>
          <div className="mt-2 flex flex-wrap gap-2">{meta.identityQuestion.opciones.map(option =>
            <button key={option} type="button" className="btn btn-secondary" onClick={() => onAnswer(option)}>{option}</button>)}</div>
        </fieldset>}
        {!streaming && meta?.mode === "conversacion" && meta.notice === "sin_fuentes" && content && (
          <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs leading-relaxed text-faint">
            <SearchX size={13} className="shrink-0" />
            No encontré documentos aprobados sobre este tema, así que esto no es orientación
            jurídica.
            <Link href="/biblioteca" className="font-semibold text-forest-700 underline-offset-4 hover:underline">
              Ver la biblioteca
            </Link>
          </p>
        )}

        {!streaming && meta?.tool && (
          <Link
            href={`/herramientas/${meta.tool.slug}`}
            onClick={() => {
              try {
                // El relato viaja por el almacenamiento de la pestaña, no por la dirección web.
                window.sessionStorage.setItem("raizia.relato", question);
              } catch {
                /* sin almacenamiento */
              }
            }}
            className="card card-hover mt-4 flex items-center gap-3.5 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-clay-dark">
              <FilePenLine size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">¿Quieres dejarlo por escrito?</span>
              <span className="block text-sm text-muted">
                Te hago unas preguntas y preparo el documento: {meta.tool.name}.
              </span>
            </span>
            <span className="btn btn-primary btn-sm shrink-0 max-sm:hidden">Empezar</span>
          </Link>
        )}

        {!streaming && status !== "detenido" && !error && spokenText && canSpeak && (
          <button type="button" aria-label={reading ? "Detener lectura" : "Escuchar respuesta"}
            aria-pressed={reading} className="btn btn-ghost mt-3 !min-h-11 !min-w-11 text-forest-700"
            onClick={() => {
              if (reading) stopRef.current?.();
              else {
                setReading(true);
                stopRef.current = speakAnswer(spokenText, () => setReading(false));
              }
            }}>
            {reading ? <Square size={17} /> : <Volume2 size={17} />}
            {reading ? "Detener" : "Escuchar"}
          </button>
        )}

        {!streaming && meta?.mode === "ia" && content && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={copy} className="btn btn-ghost btn-sm !px-2.5 text-muted">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar respuesta"}
            </button>
            <p className="text-xs text-faint">
              Respuesta generada por IA{meta.model ? ` (${meta.model})` : ""}. Verifica siempre
              en la fuente.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
