import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RAIZIA", short_name: "RAIZIA", lang: "es-CO",
    description: "Conoce tus derechos. Pregunta con tus palabras.",
    start_url: "/asistente", scope: "/", display: "standalone",
    background_color: "#faf6ec", theme_color: "#1f4a34",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
