"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";

/** Contexto de quien consulta. Se guarda únicamente en este navegador. */
export type Profile = { group: string; community: string; territory: string };

export const PROFILE_KEY = "raizia.perfil.v1";

export const ETHNIC_GROUPS = [
  "Pueblo indígena",
  "Comunidad negra o afrocolombiana",
  "Pueblo raizal",
  "Comunidad palenquera",
  "Pueblo Rrom",
  "No pertenezco a un grupo étnico",
] as const;

/** Sugerencias para escribir más rápido; se puede escribir cualquier otro nombre. */
const PEOPLES = [
  "Arhuaco (Iku)",
  "Kogui (Kággaba)",
  "Wiwa",
  "Kankuamo",
  "Ette Ennaka (Chimila)",
  "Wayuu",
  "Zenú",
  "Embera",
  "Nasa",
  "Misak",
  "Pijao",
  "Inga",
  "Awá",
  "U'wa",
];

export function profileLabel(p: Profile): string {
  if (!p.group) return "Sin comunidad indicada";
  const main = p.community || p.group;
  return p.territory ? `${main} · ${p.territory}` : main;
}

export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    const p = raw ? (JSON.parse(raw) as Profile) : null;
    return p && typeof p.group === "string" ? p : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile | null) {
  try {
    if (p) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* sin almacenamiento: el dato vive solo durante esta visita */
  }
}

export function ProfileStep({ onDone }: { onDone: (p: Profile) => void }) {
  const [group, setGroup] = useState("");
  const [community, setCommunity] = useState("");
  const [territory, setTerritory] = useState("");
  const [error, setError] = useState(false);
  const ethnic = group && group !== "No pertenezco a un grupo étnico";

  return (
    <div className="animate-rise pt-2 sm:pt-8">
      <LogoMark size={44} />
      <h1 className="mt-6 text-3xl text-forest-900 sm:text-[2.5rem] sm:leading-tight">
        Antes de empezar, ¿a qué comunidad perteneces?
      </h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">
        Saberlo me permite orientarte mejor: muchos derechos dependen de la comunidad y del
        territorio.
      </p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!group) {
            setError(true);
            return;
          }
          onDone({
            group,
            community: ethnic ? community.trim().slice(0, 80) : "",
            territory: territory.trim().slice(0, 80),
          });
        }}
        className="mt-8"
      >
        <fieldset aria-describedby={error ? "perfil-error" : undefined}>
          <legend className="label">Grupo étnico</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {ETHNIC_GROUPS.map((g) => (
              <label
                key={g}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-[0.9375rem] leading-snug transition-colors ${
                  group === g ? "border-forest-600 bg-forest-50" : "border-line-strong bg-paper hover:border-forest-300"
                }`}
              >
                <input
                  type="radio"
                  name="grupo"
                  value={g}
                  checked={group === g}
                  onChange={() => {
                    setGroup(g);
                    setError(false);
                  }}
                  className="h-4 w-4 shrink-0 accent-forest-700"
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
          {error && (
            <p id="perfil-error" role="alert" className="mt-2 text-sm font-medium text-[#9b2c1f]">
              Elige una opción o usa «Prefiero no decirlo».
            </p>
          )}
        </fieldset>

        {ethnic && (
          <div className="animate-fade mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="perfil-comunidad" className="label">
                Pueblo o comunidad <span className="font-normal text-faint">· opcional</span>
              </label>
              <input
                id="perfil-comunidad"
                className="input"
                list={group === "Pueblo indígena" ? "pueblos-sugeridos" : undefined}
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder={group === "Pueblo indígena" ? "Por ejemplo: Arhuaco, Wayuu…" : "Nombre de tu comunidad"}
                autoComplete="off"
              />
              <datalist id="pueblos-sugeridos">
                {PEOPLES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="perfil-territorio" className="label">
                Resguardo, territorio o municipio <span className="font-normal text-faint">· opcional</span>
              </label>
              <input
                id="perfil-territorio"
                className="input"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-muted">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-forest-600" />
          <span>
            Es un dato personal sensible: responder es voluntario. Se guarda solo en este
            navegador, se usa únicamente para orientar las respuestas y puedes cambiarlo o
            borrarlo cuando quieras.
          </span>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary">
            Continuar
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onDone({ group: "", community: "", territory: "" })}
          >
            Prefiero no decirlo
          </button>
        </div>
      </form>
    </div>
  );
}
