import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Compass,
  FileSignature,
  Gavel,
  HandHelping,
  Handshake,
  Landmark,
  MailWarning,
  Scale,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NeedFinder } from "@/components/tools/NeedFinder";
import { TOOL_LIST, type ToolConfig } from "@/lib/tools-config";

export const metadata: Metadata = {
  title: "Herramientas jurídicas",
  description:
    "Prepara paso a paso peticiones, solicitudes de consulta previa y borradores de acciones de tutela, populares, de cumplimiento y de grupo.",
};

const ICONS: Record<string, LucideIcon> = {
  peticion: FileSignature,
  "consulta-previa": Handshake,
  reclamacion: MailWarning,
  acompanamiento: HandHelping,
  tutela: Scale,
  popular: Landmark,
  cumplimiento: Gavel,
  grupo: Users,
};

const groups: { id: ToolConfig["group"]; title: string; text: string }[] = [
  {
    id: "solicitudes",
    title: "Solicitudes ante entidades",
    text: "Escritos que se radican directamente ante una autoridad. Suelen ser el primer paso.",
  },
  {
    id: "acciones",
    title: "Acciones ante los jueces",
    text: "Mecanismos constitucionales para proteger derechos fundamentales y colectivos.",
  },
];

/** Otros mecanismos de participación: no generan un escrito, pero el asistente los explica con sus fuentes. */
const participation = [
  {
    name: "Veeduría ciudadana",
    text: "Vigilancia de la gestión pública por parte de ciudadanos y organizaciones (Ley 850 de 2003).",
    question: "¿Qué es una veeduría ciudadana y cómo se constituye?",
  },
  {
    name: "Cabildo abierto",
    text: "Reunión pública en la que los habitantes discuten asuntos de interés para la comunidad (Ley 134 de 1994 y Ley 1757 de 2015).",
    question: "¿Qué es un cabildo abierto y cómo se solicita?",
  },
  {
    name: "Consulta popular",
    text: "Pregunta de carácter general sobre un asunto de trascendencia que se somete a decisión del pueblo (Ley 134 de 1994).",
    question: "¿Qué es una consulta popular y quién puede convocarla?",
  },
  {
    name: "Iniciativa popular, referendo y revocatoria",
    text: "Mecanismos para proponer normas, aprobarlas o derogarlas y revocar el mandato (Ley 134 de 1994 y Ley 1757 de 2015).",
    question: "¿Qué mecanismos de participación ciudadana existen en Colombia?",
  },
];

export default function HerramientasPage() {
  return (
    <div className="container-page pt-12 pb-8 md:pt-16">
      <header className="max-w-3xl">
        <p className="eyebrow">Herramientas jurídicas</p>
        <h1 className="mt-3 text-4xl text-forest-900 md:text-5xl">¿Qué necesitas resolver?</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Responde unas preguntas sencillas y descarga un borrador en Word que puedes revisar,
          ajustar e imprimir. Tú pones los hechos; RAIZIA organiza el documento.
        </p>
      </header>

      <NeedFinder />
      <Link
        href="/herramientas/orientacion"
        className="group mt-9 flex flex-col gap-5 rounded-[1.75rem] bg-forest-800 p-6 text-paper transition-colors hover:bg-forest-700 sm:flex-row sm:items-center md:p-8"
      >
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-forest-600 text-paper">
          <Compass size={26} strokeWidth={1.7} />
        </span>
        <span className="flex-1">
          <span className="block font-display text-2xl">¿No sabes cuál necesitas?</span>
          <span className="mt-1 block leading-relaxed text-forest-100/90">
            Cuéntame qué pasó con tus palabras y te digo qué camino seguir y a qué entidad acudir.
          </span>
        </span>
        <span className="btn shrink-0 bg-paper text-forest-900 group-hover:bg-forest-50">
          Empezar aquí
          <ArrowRight size={16} />
        </span>
      </Link>

      {groups.map((g) => (
        <section key={g.id} className="mt-12" aria-labelledby={`grupo-${g.id}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-3">
            <h2 id={`grupo-${g.id}`} className="text-2xl text-forest-900">
              {g.title}
            </h2>
            <p className="text-sm text-muted">{g.text}</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {TOOL_LIST.filter((t) => t.group === g.id).map((t) => {
              const Icon = ICONS[t.kind] || FileSignature;
              return (
                <Link key={t.kind} href={`/herramientas/${t.slug}`} className="card card-hover group flex flex-col p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-forest-700 group-hover:text-paper">
                      <Icon size={21} strokeWidth={1.7} />
                    </span>
                    {t.badge && <span className="chip chip-ochre text-right">{t.badge}</span>}
                  </div>
                  <h3 className="mt-5 text-[1.45rem] leading-snug text-forest-900">{t.name}</h3>
                  <p className="mt-1 font-medium text-clay-dark">{t.short}</p>
                  <p className="mt-2.5 flex-1 text-[0.9375rem] leading-relaxed text-muted">{t.description}</p>
                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                      <Clock size={15} />
                      Unos {t.minutes} min · {t.steps.length + 1} pasos
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-forest-700">
                      Comenzar
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mt-14" aria-labelledby="otros-mecanismos">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-3">
          <h2 id="otros-mecanismos" className="text-2xl text-forest-900">
            Otros mecanismos de participación
          </h2>
          <p className="text-sm text-muted">No generan un escrito aquí, pero el asistente te los explica con sus fuentes.</p>
        </div>
        <ul className="mt-2 grid gap-x-10 md:grid-cols-2">
          {participation.map((m) => (
            <li key={m.name}>
              <Link
                href={`/asistente?q=${encodeURIComponent(m.question)}`}
                className="group flex h-full items-start justify-between gap-4 border-b border-line py-5 transition-colors hover:border-forest-500"
              >
                <span>
                  <span className="block font-display text-lg text-forest-900 group-hover:text-forest-700">{m.name}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{m.text}</span>
                </span>
                <ArrowUpRight size={18} className="mt-1 shrink-0 text-faint transition-colors group-hover:text-forest-600" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-[1.5rem] border border-line bg-sand/50 p-6 md:p-8" aria-labelledby="aviso-herramientas">
        <div className="flex items-start gap-4">
          <ShieldAlert size={22} className="mt-0.5 shrink-0 text-clay-dark" />
          <div>
            <h2 id="aviso-herramientas" className="font-sans text-base font-semibold tracking-normal text-ink">
              Lo que estas herramientas hacen y lo que no
            </h2>
            <ul className="mt-3 grid gap-x-10 gap-y-2 text-[0.9375rem] leading-relaxed text-muted md:grid-cols-2">
              <li>Generan un borrador editable con la estructura habitual de cada documento.</li>
              <li>No inventan hechos, argumentos ni jurisprudencia: usan solo lo que escribes.</li>
              <li>Citan únicamente las normas básicas de cada mecanismo.</li>
              <li>No evalúan si tu caso procede ni reemplazan la revisión de un profesional.</li>
              <li>Tus respuestas no se guardan en el servidor: el documento se genera y se descarga.</li>
              <li>
                Para orientación gratuita puedes acudir a la Defensoría del Pueblo, a la personería
                o a un consultorio jurídico universitario.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
