"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole, Menu, MessageCircle, X } from "lucide-react";
import { nav } from "@/brand/brand";
import { Logo } from "./Logo";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú móvil al cambiar de página.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/85 backdrop-blur-md">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
      >
        Saltar al contenido
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="RAIZIA, ir al inicio" className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors ${
                  active
                    ? "bg-forest-100 text-forest-900"
                    : "text-muted hover:bg-forest-50 hover:text-forest-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/admin"
            aria-label="Administración"
            title="Administración"
            className={`btn btn-ghost btn-icon hidden md:inline-flex ${
              isActive(pathname, "/admin") ? "bg-forest-100" : ""
            }`}
          >
            <LockKeyhole size={18} strokeWidth={1.8} />
          </Link>
          {!pathname.startsWith("/asistente") && (
            <Link href="/asistente" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <MessageCircle size={16} />
              Consultar
            </Link>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon md:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-movil"
          aria-label="Principal"
          className="animate-fade border-t border-line/70 bg-ivory md:hidden"
        >
          <ul className="container-page flex flex-col gap-1 py-3">
            {[...nav, { href: "/admin", label: "Administración" }].map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-xl px-4 text-base font-medium ${
                      active ? "bg-forest-100 text-forest-900" : "text-ink hover:bg-forest-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
