/** Estimador civil colombiano: excluye fines de semana y festivos nacionales.
 * No conoce cierres locales, suspensiones, prórrogas ni calendarios del despacho. */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
export function parseDate(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const parsed = new Date(`${input}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || iso(parsed) !== input ? null : parsed;
}
export function colombianHolidays(year: number): Set<string> {
  // Algoritmo gregoriano de Pascua (Meeus/Jones/Butcher).
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  const easter = day(year, Math.floor(n / 31), n % 31 + 1);
  const dates = new Set<string>();
  const add = (date: Date, monday = false) => {
    if (monday) date.setUTCDate(date.getUTCDate() + (8 - date.getUTCDay()) % 7);
    dates.add(iso(date));
  };
  for (const [month, date] of [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]]) add(day(year, month, date));
  for (const [month, date] of [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]]) add(day(year, month, date), true);
  for (const offset of [-3, -2, 43, 64, 71]) { const date = new Date(easter); date.setUTCDate(date.getUTCDate() + offset); add(date); }
  return dates;
}
export function addBusinessDays(start: string, count: number, closures: string[] = []): string | null {
  const date = parseDate(start);
  if (!date || !Number.isInteger(count) || count < 0 || count > 366) return null;
  const calendars = new Map<number, Set<string>>();
  for (let passed = 0; passed < count;) {
    date.setUTCDate(date.getUTCDate() + 1);
    const y = date.getUTCFullYear();
    if (!calendars.has(y)) calendars.set(y, colombianHolidays(y));
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !calendars.get(y)!.has(iso(date)) && !closures.includes(iso(date))) passed++;
  }
  return iso(date);
}
export function deadlineDays(kind: string, type = ""): number | null {
  if (kind === "impugnacion") return 3;
  if (kind === "tutela") return 10;
  if (kind === "reclamacion") return type.startsWith("Antes de una acción popular") ? 15 : type.startsWith("Antes de una acción de cumplimiento") ? 10 : null;
  if (["peticion", "consulta-previa", "acompanamiento"].includes(kind)) return /información|documentos/i.test(type) ? 10 : /Consulta a la entidad/.test(type) ? 30 : 15;
  return null;
}
