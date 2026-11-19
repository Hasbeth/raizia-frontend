import Link from "next/link";
import { brand, nav } from "@/brand/brand";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sand/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm font-display text-lg text-forest-800 italic">{brand.tagline}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{brand.description}</p>
        </div>
        <nav aria-label="Secciones">
          <h2 className="eyebrow">Secciones</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
            {[...nav, { href: "/admin", label: "Administración" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink/80 underline-offset-4 hover:text-forest-700 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="eyebrow">Aviso</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">{brand.disclaimer}</p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs leading-relaxed text-faint">{brand.context}</p>
      </div>
    </footer>
  );
}
