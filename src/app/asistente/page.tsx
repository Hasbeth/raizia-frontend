import type { Metadata } from "next";
import { Suspense } from "react";
import { Chat } from "@/components/chat/Chat";

export const metadata: Metadata = {
  title: "Asistente jurídico",
  description: "Consulta tus derechos en lenguaje cotidiano, con citas de documentos oficiales.",
};

export default function AsistentePage() {
  return (
    <main id="contenido" className="flex h-[calc(100dvh-4rem-1px)] min-h-0 flex-col">
      <Suspense>
        <Chat />
      </Suspense>
    </main>
  );
}
