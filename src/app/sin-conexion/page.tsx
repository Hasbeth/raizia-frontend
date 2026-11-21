import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main style={{ margin: "auto", padding: "3rem 1.5rem", maxWidth: "36rem", color: "#1f4a34", background: "#faf6ec", fontFamily: "sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>No hay internet</h1>
      <p>El asistente necesita conexión para responder.</p>
      <p>Revisa tu conexión e intenta de nuevo.</p>
      {/* Enlace normal: funciona incluso sin JavaScript ni archivos de Next en caché. */}
      <a href="/asistente" style={{ display: "inline-block", marginTop: "1.5rem", padding: "0.75rem 1.25rem", minHeight: 44, borderRadius: 16, background: "#1f4a34", color: "#faf6ec", textDecoration: "none" }}>
        Intentar de nuevo
      </a>
    </main>
  );
}
