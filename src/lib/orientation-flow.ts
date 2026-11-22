type Question = { texto: string; opciones?: string[] };
/** Conserva el relato literal e identifica la pregunta como pregunta, no como hecho. */
export function appendOrientationAnswer(story: string, question: Question, answer: string) {
  if (!answer.trim()) return story;
  return `${story}\n\n${question.texto}\n${answer.trim()}`;
}
export function pendingOrientationQuestions(questions: Question[], answered: string[]) {
  const key = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const seen = new Set(answered.map(key));
  return questions.filter(q => !seen.has(key(q.texto)));
}
