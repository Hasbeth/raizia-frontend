import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSpeechText, speechChunks, speak, speakAnswer, stopSpeaking } from '../src/lib/speech.ts';
import { recognitionConstructor, supportsDictation } from '../src/lib/dictation.ts';

function browserGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
}

test('Lectura limpia sin markdown, citas ni URLs; conserva el texto de enlaces', () => {
  const result = cleanSpeechText('# Tus **derechos**\n1. Pide [ayuda](https://ejemplo.co/ayuda). [1] [2, 3] [Fuente 4]\n> Lee _con calma_ en https://ejemplo.co y www.ejemplo.co\n![imagen](x.png)\n---');
  assert.equal(result, 'Tus derechos Pide ayuda. Lee con calma en y');
  assert.equal(cleanSpeechText('```js\ntexto\n```\n[ayuda]: https://ejemplo.co'), 'texto');
});

test('Divide frases largas sin perder palabras ni superar el tamaño', () => {
  const text = 'Primera frase. ¿Cómo estás? ' + 'palabra '.repeat(300) + 'Fin.';
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every(chunk => chunk.length <= 220 && chunk.trim()));
  assert.equal(chunks.join(' '), cleanSpeechText(text));
  assert.deepEqual(speechChunks(''), []);
  assert.ok(speechChunks('a'.repeat(1000)).every(chunk => chunk.length <= 220));
});

test('Una sola lectura: pausa la anterior, continúa por frases y cancela al salir', t => {
  const utterances = [];
  let cancelled = 0, endedA = 0, endedB = 0;
  browserGlobal(t, 'window', { speechSynthesis: { cancel() { cancelled++; }, getVoices: () => [{lang:'es-CO'}], speak(u) { utterances.push(u); } } });
  browserGlobal(t, 'SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  const cancelA = speakAnswer('Una. Dos.', () => endedA++);
  assert.equal(utterances[0].text, 'Una.');
  assert.equal(utterances[0].rate, 0.92);
  utterances[0].onend();
  assert.equal(utterances[1].text, 'Dos.');
  speakAnswer('Otra [1].', () => endedB++);
  assert.equal(endedA, 1);
  cancelA(); // El desmontaje del mensaje anterior no cancela el nuevo.
  assert.equal(endedB, 0);
  stopSpeaking();
  assert.equal(endedB, 1);
  utterances[1].onend();
  assert.equal(utterances.length, 3);
  assert.ok(cancelled >= 3);
  speak('Entrevista sin cambios. Dos frases.');
  assert.equal(utterances.at(-1).text, 'Entrevista sin cambios. Dos frases.');
  stopSpeaking();
});

test('Dictado detecta estándar, webkit o ausencia de soporte', t => {
  class Recognition {}
  browserGlobal(t, 'window', {});
  assert.equal(supportsDictation(), false);
  window.webkitSpeechRecognition = Recognition;
  assert.equal(recognitionConstructor(), Recognition);
  window.SpeechRecognition = class Standard {};
  assert.equal(recognitionConstructor(), window.SpeechRecognition);
});
