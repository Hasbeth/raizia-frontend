/** Alerta de seguridad sin clasificación jurídica. Espejo en el frontend. */
export const EMERGENCY_NOTICE = "Si estás en peligro inmediato, llama al 123 y busca atención urgente en un lugar seguro.";
export function explicitDanger(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.split(/[.!?;\n]+/).some(s => !/\bno (?:estoy|estamos|hay|me estan|nos estan|me van)|sin (?:amenaza|violencia|peligro)/.test(s) &&
    /(?:estoy|estamos|sigo) en (?:peligro|riesgo ahora)|(?:me|nos) (?:estan? (?:golpeando|atacando|persiguiendo)|van a matar|quieren matar|matan|amenaza\w* con (?:matar|un arma))|amenaza\w* de muerte|(?:sangrando|no puedo respirar)|(?:peligro|amenaza|violencia) (?:inmediato|inmediata|ahora)/.test(s));
}
