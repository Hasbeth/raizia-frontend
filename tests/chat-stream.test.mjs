import assert from 'node:assert/strict';
import test from 'node:test';
import { readChatStream } from '../src/lib/chat-stream.ts';

const body = pieces => new ReadableStream({ start(controller) {
  pieces.forEach(piece => controller.enqueue(new TextEncoder().encode(piece)));
  controller.close();
} });
test('Lee eventos partidos y exige done, incluso sin salto de línea final', async () => {
  const events = [];
  await readChatStream(body(['{"type":"to', 'ken","text":"Hola"}\n', '{"type":"done"}']), event => events.push(event), () => {});
  assert.deepEqual(events, [{type:'token',text:'Hola'}, {type:'done'}]);
});
test('Detecta corte durante respuesta para conservar pregunta y reintentar', async () => {
  const events = [];
  await assert.rejects(readChatStream(body(['{"type":"token","text":"Parcial"}\n']), event => events.push(event), () => {}), /incomplete-chat-stream/);
  assert.equal(events[0].text, 'Parcial');
});
