import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";
import { brand } from "@/brand/brand";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: { default: `${brand.name} · ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
};

export const viewport: Viewport = {
  themeColor: "#faf6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
