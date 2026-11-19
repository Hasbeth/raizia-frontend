import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="container-page flex flex-1 flex-col items-start justify-center py-24">
      <p className="eyebrow">Página no encontrada</p>
      <h1 className="mt-3 max-w-xl text-4xl text-forest-900 md:text-5xl">
        Este camino no lleva a ningún lugar.
      </h1>
      <p className="mt-4 max-w-lg text-lg text-muted">
        La página o el documento que buscas no existe o ya no está publicado.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          Volver al inicio
        </Link>
        <Link href="/biblioteca" className="btn btn-secondary">
          Ir a la biblioteca
        </Link>
      </div>
    </main>
  );
}
