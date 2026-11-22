import test from 'node:test';
import assert from 'node:assert/strict';
import { appendOrientationAnswer, pendingOrientationQuestions } from '../src/lib/orientation-flow.ts';
import { explicitDanger, EMERGENCY_NOTICE } from '../src/lib/emergency.ts';
test('Preguntas una a una: preserva relato y respuesta literal, sin incorporar rutas como hechos', () => {
  const story = 'Me discriminan por la ciudad de donde soy.';
  const questions = [{ texto: '¿Quién lo hace?', opciones: ['Una persona', 'En el trabajo'] }, { texto: '¿Qué dijeron?' }];
  const expanded = appendOrientationAnswer(story, questions[0], 'En el trabajo');
  assert.equal(expanded, story + '\n\n¿Quién lo hace?\nEn el trabajo');
  assert.deepEqual(pendingOrientationQuestions(questions, ['¿Quién lo hace?']), [questions[1]]);
  assert.equal(appendOrientationAnswer(expanded, questions[1], ''), expanded);
  assert.deepEqual(pendingOrientationQuestions(questions, questions.map(q => q.texto)), []);
  assert.doesNotMatch(expanded, /agresión|indígena|delito/);
});
test('123 visible antes de esperar a la IA, sin convertir discriminación o peligro negado en urgencia', () => {
  assert.ok(explicitDanger('Me están golpeando ahora')); assert.ok(explicitDanger('No puedo respirar'));
  assert.equal(explicitDanger('Me discriminan por mi ciudad'), false);
  assert.equal(explicitDanger('No estoy en peligro'), false);
  assert.match(EMERGENCY_NOTICE, /123.*atención urgente/);
});
