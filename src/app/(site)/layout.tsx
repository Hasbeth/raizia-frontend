import { Footer } from "@/components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
