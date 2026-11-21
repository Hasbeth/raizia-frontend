/** Texto para lectura: conserva las palabras, omite formato, citas y direcciones. */
export function cleanSpeechText(text: string): string {
  return text
    .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[(?:fuentes?\s+)?\d+(?:\s*(?:,|y|-)\s*\d+)*\]/gi, "")
    .replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*```[^\n]*|```/gm, "")
    .replace(/^\s*(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/gm, "")
    .replace(/^\s*[-:| ]{3,}\s*$/gm, "")
    .replace(/[*_~`\[\]#|]/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ").trim();
}

/** Frases cortas; también divide frases sin puntuación por espacios. */
export function speechChunks(text: string, maxLength = 220): string[] {
  const chunks: string[] = [];
  for (const sentence of cleanSpeechText(text).match(/[^.!?]+[.!?]*|[.!?]+/g) || []) {
    let rest = sentence.trim();
    while (rest.length > maxLength) {
      const space = rest.lastIndexOf(" ", maxLength);
      const cut = space > 0 ? space : maxLength;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}

export const supportsSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const subscribeSpeechSupport = () => () => {};
let active: (() => void) | undefined;

export function stopSpeaking() {
  active?.();
  try { if (supportsSpeech()) window.speechSynthesis.cancel(); } catch { /* sin voz */ }
}

function read(parts: string[], onStop?: () => void): () => void {
  stopSpeaking();
  let stopped = false;
  const finish = () => {
    if (stopped) return;
    stopped = true;
    if (active === finish) active = undefined;
    onStop?.();
  };
  active = finish;
  try {
    const synth = window.speechSynthesis;
    const voice = synth.getVoices().find(v => v.lang.toLowerCase().startsWith("es"));
    const next = (index: number) => {
      if (stopped) return;
      if (index >= parts.length) { finish(); return; }
      const utterance = new SpeechSynthesisUtterance(parts[index]);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || "es-CO";
      utterance.rate = 0.92;
      utterance.onend = () => next(index + 1);
      utterance.onerror = finish;
      try { synth.speak(utterance); } catch { finish(); }
    };
    next(0);
  } catch { finish(); }
  return () => { if (active === finish) stopSpeaking(); };
}

/** Mantiene la lectura original de la entrevista, con la voz española y velocidad 0.92. */
export function speak(text: string) { read([text]); }
export function speakAnswer(text: string, onStop: () => void) { return read(speechChunks(text), onStop); }
