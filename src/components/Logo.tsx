import { brand } from "@/brand/brand";

/**
 * Isotipo de RAIZIA: un brote cuyas líneas continúan hacia abajo como raíces.
 * Forma abstracta y propia; no reproduce símbolos ni patrones tradicionales.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="10" className="fill-forest-700" />
      <path
        d="M16 8.2v15.6M16 17.4c0 3-1.9 4.6-5 6.1M16 17.4c0 3 1.9 4.6 5 6.1"
        className="stroke-ivory"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M16 14.6c-.2-3.3-2.3-5.2-5.6-5.4.1 3.300 2.200 5.300 5.600 5.400Z" className="fill-forest-300" />
      <path d="M16 12c.2-2.800 2-4.500 4.900-4.700-.1 2.900-1.900 4.600-4.900 4.700Z" className="fill-ochre" />
    </svg>
  );
}

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-display text-[1.35rem] leading-none font-semibold tracking-[0.04em] text-forest-900"
        aria-label={brand.name}
      >
        RAIZ<span className="text-clay">IA</span>
      </span>
    </span>
  );
}
