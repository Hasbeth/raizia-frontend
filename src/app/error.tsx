"use client";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="contenido" className="container-page flex-1 py-16">
      <section className="card mx-auto max-w-lg p-8" role="alert">
        <p className="eyebrow">RAIZIA</p>
        <h1 className="mt-3 text-3xl text-forest-900">No pudimos conectar con el servidor de RAIZIA.</h1>
        <p className="mt-4 leading-relaxed text-muted">Intenta de nuevo en un momento.</p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => retry()}>
          Volver a intentar
        </button>
      </section>
    </main>
  );
}
