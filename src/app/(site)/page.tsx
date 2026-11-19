import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  FileText,
  Lock,
  MessageCircle,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { brand } from "@/brand/brand";
import { HeroSearch } from "@/components/home/HeroSearch";
import { getHome } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Curvas de nivel: evocan territorio sin recurrir a símbolos culturales. */
function Contours({ className = "" }: { className?: string }) {
  const rings = [
    "M300 40c120-10 230 60 250 170s-40 230-160 260-260-10-310-120 0-250 100-290c40-15 80-17 120-20Z",
    "M300 90c95-8 180 45 198 135s-30 185-128 208-205-8-245-95 2-198 80-230c32-13 63-15 95-18Z",
    "M302 140c70-6 130 33 144 100s-22 137-94 154-150-6-180-70 3-146 60-170c24-10 46-12 70-14Z",
    "M304 190c46-4 84 22 93 66s-14 89-61 100-97-4-116-46 2-94 39-110c15-6 30-8 45-10Z",
    "M306 238c22-2 40 10 44 31s-7 42-29 47-46-2-55-22 1-44 19-52c7-3 14-3 21-4Z",
  ];
  return (
    <svg viewBox="0 0 600 520" fill="none" aria-hidden="true" className={className}>
      {rings.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1.2" opacity={0.35 + i * 0.12} />
      ))}
    </svg>
  );
}

const steps = [
  {
    n: "01",
    title: "Cuenta tu situación",
    text: "Escribe lo que está pasando como se lo contarías a alguien de confianza. No necesitas términos jurídicos.",
  },
  {
    n: "02",
    title: "Buscamos en fuentes oficiales",
    text: "RAIZIA identifica el tema y localiza los apartados pertinentes en leyes, decretos y sentencias revisadas.",
  },
  {
    n: "03",
    title: "Recibe orientación con citas",
    text: "Obtienes una explicación sencilla con el documento y el apartado exactos, para que puedas verificarlo.",
  },
];

const services = [
  {
    href: "/asistente",
    icon: MessageCircle,
    title: "Asistente jurídico",
    text: "Conversa sobre tu caso y conoce tus derechos, con las fuentes siempre a la vista.",
    cta: "Hacer una consulta",
  },
  {
    href: "/biblioteca",
    icon: BookOpenText,
    title: "Biblioteca jurídica",
    text: "Explora normas y jurisprudencia organizadas por temáticas que importan a las comunidades.",
    cta: "Explorar documentos",
  },
  {
    href: "/herramientas",
    icon: FileText,
    title: "Herramientas",
    text: "Prepara paso a paso un derecho de petición o un borrador de tutela y descárgalo en Word.",
    cta: "Crear un documento",
  },
];

export default async function Home() {
  const { stats, categories: tree } = await getHome();
  const categories = tree.filter((c) => c.slug !== "otras-tematicas");

  return (
    <>
      {/* Presentación */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,var(--color-forest-100),transparent_70%),radial-gradient(40rem_24rem_at_-10%_110%,var(--color-ochre-soft),transparent_70%)]"
        />
        <Contours className="pointer-events-none absolute -top-16 -right-40 hidden w-[44rem] text-forest-300 lg:block" />
        <div className="container-page relative pt-14 pb-16 md:pt-24 md:pb-24">
          <div className="max-w-3xl">
            <p className="eyebrow animate-rise">Orientación jurídica con fuentes oficiales</p>
            <h1 className="animate-rise mt-5 text-[2.6rem] leading-[1.04] text-forest-900 [animation-delay:60ms] sm:text-6xl md:text-[4.25rem]">
              Nuestras raíces,
              <br />
              <em className="font-normal text-clay">nuestros derechos.</em>
            </h1>
            <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-muted [animation-delay:120ms] md:text-xl">
              RAIZIA te ayuda a entender tus derechos y los de tu comunidad. Pregunta en lenguaje
              cotidiano y recibe orientación basada en documentos oficiales colombianos.
            </p>
            <div className="animate-rise mt-9 [animation-delay:180ms]">
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      {/* Garantías */}
      <section aria-label="Cómo trabajamos" className="border-y border-line bg-paper/70">
        <ul className="container-page grid gap-x-10 gap-y-5 py-7 text-sm sm:grid-cols-3">
          <li className="flex items-start gap-3">
            <Quote size={18} className="mt-0.5 shrink-0 text-clay" />
            <span className="text-ink/85">
              <strong className="font-semibold text-ink">Cada respuesta cita su fuente.</strong> Sin
              normas ni sentencias inventadas.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-clay" />
            <span className="text-ink/85">
              <strong className="font-semibold text-ink">
                {stats.approved > 0
                  ? `${stats.approved} documentos oficiales revisados.`
                  : "Documentos oficiales revisados."}
              </strong>{" "}
              Solo se consulta lo aprobado en la biblioteca.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-clay" />
            <span className="text-ink/85">
              <strong className="font-semibold text-ink">Tu consulta se queda aquí.</strong> La
              inteligencia artificial funciona en este equipo.
            </span>
          </li>
        </ul>
      </section>

      {/* Cómo funciona */}
      <section className="container-page py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">Cómo funciona</p>
          <h2 className="mt-3 text-3xl text-forest-900 md:text-[2.5rem] md:leading-tight">
            De una pregunta cotidiana a una respuesta que puedes verificar
          </h2>
        </div>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <li key={s.n} className="relative border-t border-line-strong pt-6">
              <span className="font-display text-sm tracking-widest text-clay">{s.n}</span>
              <h3 className="mt-3 text-xl text-forest-900">{s.title}</h3>
              <p className="mt-2.5 leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Servicios */}
      <section className="bg-sand/50 py-20 md:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Qué puedes hacer</p>
            <h2 className="mt-3 text-3xl text-forest-900 md:text-[2.5rem] md:leading-tight">
              Tres formas de acercarte a tus derechos
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {services.map((s) => (
              <Link key={s.href} href={s.href} className="card card-hover group flex flex-col p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-700 group-hover:text-paper">
                  <s.icon size={21} strokeWidth={1.8} />
                </span>
                <h3 className="mt-6 text-[1.4rem] text-forest-900">{s.title}</h3>
                <p className="mt-2.5 flex-1 leading-relaxed text-muted">{s.text}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-forest-700">
                  {s.cta}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Temáticas */}
      <section className="container-page py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Temáticas</p>
            <h2 className="mt-3 text-3xl text-forest-900 md:text-[2.5rem] md:leading-tight">
              Una biblioteca organizada alrededor de la vida en comunidad
            </h2>
          </div>
          <Link href="/biblioteca" className="btn btn-secondary">
            Ver toda la biblioteca
            <ArrowRight size={16} />
          </Link>
        </div>
        <ul className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/biblioteca?categoria=${c.id}`}
                className="group flex h-full items-start justify-between gap-4 border-t border-line py-5 transition-colors hover:border-forest-500"
              >
                <span>
                  <span className="block font-display text-lg leading-snug text-forest-900 group-hover:text-forest-700">
                    {c.name}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{c.description}</span>
                </span>
                <span className="mt-1 shrink-0 text-xs font-semibold tabular-nums text-faint">
                  {c.docCount > 0 ? `${c.docCount} doc.` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Cierre */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-forest-800 px-7 py-14 text-paper md:px-16 md:py-20">
          <Contours className="pointer-events-none absolute -right-24 -bottom-40 w-[36rem] text-forest-500" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl leading-tight md:text-[2.6rem]">
              Conocer un derecho es el primer paso para defenderlo.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-forest-100/90">{brand.disclaimer}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/asistente" className="btn bg-paper text-forest-900 hover:bg-forest-50">
                <MessageCircle size={17} />
                Empezar una consulta
              </Link>
              <Link
                href="/herramientas"
                className="btn border-forest-500 text-paper hover:bg-forest-700"
              >
                Preparar un documento
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
