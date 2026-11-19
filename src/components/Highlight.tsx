import { MARK_CLOSE, MARK_OPEN } from "@/lib/constants";

/** Muestra un fragmento de búsqueda convirtiendo los marcadores en <mark>. */
export function Highlight({ text }: { text: string }) {
  const parts = text.split(MARK_OPEN);
  return (
    <>
      {parts.map((part, i) => {
        if (i === 0) return <span key={i}>{part}</span>;
        const [hit, rest = ""] = part.split(MARK_CLOSE);
        return (
          <span key={i}>
            <mark className="rounded bg-ochre-soft px-0.5 text-ink">{hit}</mark>
            {rest}
          </span>
        );
      })}
    </>
  );
}
