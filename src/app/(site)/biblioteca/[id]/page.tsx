import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, MessageCircle } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/constants";
import { getDocumentWithChunks } from "@/lib/api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getDocumentWithChunks(Number(id));
  if (!result) notFound();
  return { title: result.document.title };
}

export default async function DocumentoPage({ params }: Props) {
  const { id } = await params;
  const result = await getDocumentWithChunks(Number(id));
  if (!result) notFound();
  const { document: doc, chunks } = result;
  const isPdf = doc.mime.includes("pdf");
  const isWord = doc.mime.includes("wordprocessingml");
  const fileUrl = `/api/documents/${doc.id}/file`;
  const shortName = doc.title.split(" — ")[0];

  // Agrupa fragmentos consecutivos del mismo apartado bajo un solo encabezado.
  const sections: { heading: string; items: typeof chunks }[] = [];
  for (const c of chunks) {
    const last = sections[sections.length - 1];
    if (last && last.heading === c.heading) last.items.push(c);
    else sections.push({ heading: c.heading, items: [c] });
  }

  const fileKind = isPdf ? "PDF" : isWord ? "Word" : "Página web";
  const facts = [
    { label: "Entidad emisora", value: doc.entity },
    { label: "Tipo", value: doc.docType },
    { label: "Fecha", value: formatDate(doc.docDate) },
    { label: "Archivo", value: `${fileKind} · ${formatBytes(doc.fileSize)}` },
  ].filter((f) => f.value);

  return (
    <article className="container-page pt-8 pb-8 md:pt-12">
      <Link href="/biblioteca" className="btn btn-ghost btn-sm -ml-3 text-muted">
        <ArrowLeft size={16} />
        Biblioteca
      </Link>

      <header className="mt-5 max-w-4xl">
        <span className={`chip ${doc.docType === "Sentencia" || doc.docType === "Auto" ? "chip-earth" : ""}`}>
          {doc.docType}
        </span>
        <h1 className="mt-4 text-3xl leading-tight text-forest-900 md:text-[2.75rem]">{doc.title}</h1>
        {doc.summary && <p className="mt-4 text-lg leading-relaxed text-muted">{doc.summary}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_19rem]">
        <div className="min-w-0 lg:order-2">
          <aside className="card p-5 lg:sticky lg:top-24" aria-label="Ficha del documento">
            <dl className="space-y-3.5 text-sm">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs font-semibold tracking-wide text-faint uppercase">{f.label}</dt>
                  <dd className="mt-0.5 text-ink">{f.value}</dd>
                </div>
              ))}
              {doc.categories.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-faint uppercase">Temáticas</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {doc.categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/biblioteca?categoria=${c.id}`}
                        className="chip chip-neutral hover:brightness-95"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">
              {doc.officialUrl && (
                <a href={doc.officialUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
                  <ExternalLink size={16} />
                  Ver en la fuente oficial
                </a>
              )}
              {(isPdf || isWord) && (
                <a
                  href={isPdf ? fileUrl : `${fileUrl}?descargar`}
                  target={isPdf ? "_blank" : undefined}
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  {isPdf ? <FileText size={16} /> : <Download size={16} />}
                  {isPdf ? "Abrir el PDF original" : "Descargar el original"}
                </a>
              )}
              <Link
                href={`/asistente?q=${encodeURIComponent(`¿Qué dice ${shortName} y cómo me protege?`)}`}
                className="btn btn-secondary"
              >
                <MessageCircle size={16} />
                Preguntar al asistente
              </Link>
            </div>
          </aside>
        </div>

        <div className="min-w-0 lg:order-1">
          {chunks.length === 0 ? (
            <div className="notice">
              <p>
                Este documento no tiene texto legible indexado. Puedes abrir el archivo original o
                consultarlo en la fuente oficial.
              </p>
            </div>
          ) : (
            <>
              <p className="notice notice-info">
                <span>
                  Texto extraído automáticamente para facilitar la lectura y la búsqueda. Ante
                  cualquier duda, prevalece el documento publicado por la fuente oficial.
                </span>
              </p>
              <div className="mt-8 max-w-[46rem] space-y-9">
                {sections.map((s, i) => (
                  <section key={i}>
                    {s.heading && (
                      <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.1em] text-clay-dark uppercase">
                        {s.heading}
                      </h2>
                    )}
                    <div className="space-y-4">
                      {s.items.map((c) => (
                        <p
                          key={c.id}
                          id={`f-${c.id}`}
                          className="scroll-mt-28 rounded-lg text-[1.02rem] leading-[1.75] whitespace-pre-line text-ink/90 transition-colors target:bg-ochre-soft target:px-3 target:py-2 target:shadow-[0_0_0_1px_var(--color-ochre)]"
                        >
                          {c.content}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
