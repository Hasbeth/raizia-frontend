import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interviewHarness } from './support/interview-harness.mjs';
import { emptyConversation, receiveConversation, conversationRequest, restoreConversation } from '../src/lib/tools-conversation.ts';
import { EMERGENCY_NOTICE } from '../src/lib/emergency.ts';

const text = 'Me negaron la solicitud ficticia.';
const proposal = { campo: 'hechos', valor: text, cita_literal: text };
const result = { respuesta: 'Gracias por contarme lo que pasó.', pregunta: '¿Quién te está afectando?', propuestas: [proposal], faltan: ['accionado'], peligro: false };

test('Valor limpio y cita normalizada sobreviven recepción y borrador; pregunta natural cuenta por campo', () => {
  const state = { ...emptyConversation('conversation'), mensajes: [{ role: 'user', content: 'Pues la ENTIDAD FICTICIA me negó la atención médica.' }] };
  const clean = { campo: 'hechos', valor: 'La entidad ficticia negó la atención médica.', cita_literal: 'pues la entidad ficticia me nego  la atencion medica' };
  const response = { ...result, propuestas: [clean], pregunta: '¿Cómo se llama la entidad que te negó la atención?', campoPregunta: 'accionado' };
  const received = receiveConversation(state, response);
  assert.deepEqual(received.propuestas, [clean]);
  assert.equal(received.preguntados.accionado, 1);
  assert.deepEqual(restoreConversation(received).propuestas, [clean]);
  assert.equal(receiveConversation(received, { ...response, propuestas: [] }).preguntados.accionado, 2);
  assert.equal(received.mode, 'conversation');
  assert.deepEqual(receiveConversation(state, { ...response, propuestas: [{ ...clean, cita_literal: 'INEXISTENTE' }] }).propuestas, []);
});

test('Cambio de modo conserva texto sin enviar, propuestas y datos aceptados; retomar y borrar', async () => {
  const ui = interviewHarness();
  await ui.input('respuesta', 'RESPUESTA PARCIAL FICTICIA');
  await ui.act(() => ui.button('Quiero contar algo más').props.onClick());
  let chat = ui.find(n => n.type === 'conversation');
  assert.equal(chat.props.state.contexto, 'hechos');
  await ui.act(() => chat.props.onChange(s => ({ ...s, draft: 'CHAT SIN ENVIAR', mensajes: [{ role: 'user', content: text }], propuestas: [proposal] })));
  assert.equal(ui.saved().data.hechos, undefined);
  await ui.act(() => ui.button('Responder paso a paso').props.onClick());
  assert.equal(ui.find(n => n.props.id === 'respuesta').props.value, 'RESPUESTA PARCIAL FICTICIA');
  assert.equal(ui.saved().conversation.draft, 'CHAT SIN ENVIAR');
  const restored = interviewHarness(ui.saved());
  await restored.act(() => restored.button('Retomar mi avance').props.onClick());
  await restored.act(() => restored.button('Contarlo conversando').props.onClick());
  chat = restored.find(n => n.type === 'conversation');
  assert.equal(chat.props.state.propuestas[0].valor, text);
  await restored.act(() => chat.props.onAccept(proposal));
  assert.equal(restored.saved().data.hechos, text);
  await restored.act(() => restored.button('Borrar mis datos').props.onClick());
  assert.equal(restored.saved(), null);
});

test('Chat real: texto, peligro antes de IA, contexto y revisión sin sobrescritura', async () => {
  let release;
  const ui = interviewHarness(undefined, { component: 'Conversation', data: { hechos: 'ANTERIOR FICTICIO', numeroDocumento: 'PRIVADO FICTICIO' }, fetch: () => new Promise(resolve => { release = resolve; }) });
  await ui.input('conversacion-mensaje', 'Me van a matar. ' + text);
  assert.ok(ui.text().includes(EMERGENCY_NOTICE)); assert.equal(ui.calls.length, 0);
  await ui.submit();
  assert.ok(ui.text().includes(EMERGENCY_NOTICE)); assert.equal(ui.calls.length, 1);
  assert.equal(ui.calls[0].body.confirmados.numeroDocumento, undefined);
  await ui.input('conversacion-mensaje', 'NUEVO BORRADOR MIENTRAS ESPERO');
  await ui.act(() => release({ ok: true, status: 200, json: async () => result }));
  await ui.act(() => ui.button('Escuchar').props.onClick());
  assert.equal(ui.spoken[0], 'Me van a matar. ' + text);
  assert.equal(ui.chat().state.draft, 'NUEVO BORRADOR MIENTRAS ESPERO');
  assert.equal(ui.chat().data.hechos, 'ANTERIOR FICTICIO');
  assert.equal(ui.chat().state.preguntados.accionado, 1);
  assert.match(ui.text(), /Dato confirmado que cambiaría: ANTERIOR FICTICIO/);
  await ui.act(() => ui.button('Aceptar este cambio').props.onClick());
  assert.equal(ui.chat().data.hechos, text); assert.deepEqual(ui.chat().state.propuestas, []);
  await ui.act(() => ui.button('Revisar mis datos y preparar el documento').props.onClick());
  assert.equal(ui.chat().reviewed, true); ui.unmount();
});

test('Una respuesta parcial del paso a paso llega a revisión y se recupera al editar', async () => {
  const ui = interviewHarness();
  await ui.input('respuesta', 'PARCIAL FICTICIO SIN CONFIRMAR');
  await ui.act(() => ui.button('Contarlo conversando').props.onClick());
  await ui.act(() => ui.find(n => n.type === 'conversation').props.onReview());
  assert.match(ui.text(), /Respuesta que dejaste sin confirmar/);
  assert.equal(ui.find(n => n.type === 'review').props.data.hechos, undefined);
  await ui.act(() => ui.button('Volver a completar esta respuesta').props.onClick());
  assert.equal(ui.find(n => n.props.id === 'respuesta').props.value, 'PARCIAL FICTICIO SIN CONFIRMAR');
});

test('Aceptar urgencia desde chat conserva la pregunta abierta y su texto parcial', async () => {
  const ui = interviewHarness({ version: 3, kind: 'tutela', data: { hechos: text, medidaProvisional: 'No', nombre: 'PERSONA FICTICIA' }, questionId: 'persona', index: 8, answer: 'NOMBRE PARCIAL FICTICIO', picked: [] });
  await ui.act(() => ui.button('Retomar mi avance').props.onClick());
  await ui.act(() => ui.button('Contarlo conversando').props.onClick());
  await ui.act(() => ui.find(n => n.type === 'conversation').props.onAccept({ campo: 'medidaProvisional', valor: 'Sí', cita_literal: 'Sí' }));
  await ui.act(() => ui.button('Responder paso a paso').props.onClick());
  assert.equal(ui.saved().questionId, 'persona');
  assert.equal(ui.find(n => n.props.id === 'dato-nombre').props.value, 'NOMBRE PARCIAL FICTICIO');
});

test('Falla, límite y plazo de 15 segundos conservan relato y vuelven a paso a paso', async () => {
  const scenarios = [
    { fetch: async () => { throw new Error('stub sin red'); } },
    { fetch: async () => ({ ok: false, status: 429, json: async () => ({ ...result, propuestas: [], respaldo: true, respuesta: 'Límite ficticio. Puedes continuar paso a paso.' }) }) },
    { fetch: async () => new Promise(() => {}), setTimeout: (callback, ms) => { assert.equal(ms, 15000); queueMicrotask(callback); return 0; } },
  ];
  for (const scenario of scenarios) {
    const ui = interviewHarness(undefined, { component: 'Conversation', ...scenario });
    await ui.input('conversacion-mensaje', text); await ui.submit();
    assert.equal(ui.chat().state.mode, 'steps'); assert.equal(ui.chat().state.mensajes[0].content, text); assert.ok(ui.chat().state.notice); ui.unmount();
  }
});

test('Dictado con stub, permiso fallido, Escuchar y cancelación al salir', async () => {
  const voices = [];
  class Recognition {
    constructor() { voices.push(this); }
    start() {}
    stop() { this.onend?.(); }
    abort() { this.aborted = true; }
  }
  const ui = interviewHarness(undefined, { component: 'Conversation', Recognition });
  await ui.act(() => ui.button('Dictar').props.onClick());
  const voice = voices[0];
  assert.equal(voice.lang, 'es-CO');
  await ui.act(() => voice.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] }));
  assert.equal(ui.chat().state.draft, text);
  await ui.act(() => voice.onerror()); assert.match(ui.text(), /permiso del micrófono/);
  ui.unmount(); assert.equal(voice.aborted, true);
  const unavailable = interviewHarness(undefined, { component: 'Conversation' });
  await unavailable.act(() => unavailable.button('Dictar').props.onClick()); assert.match(unavailable.text(), /no permite dictado/); unavailable.unmount();
});

test('Hechos adicionales solo se incluyen al aceptar, se pueden editar y descartar', async () => {
  const state = { ...emptyConversation(), mensajes: [{ role: 'user', content: text }] };
  const ui = interviewHarness(undefined, { component: 'ConversationNotes', state });
  await ui.act(() => ui.button('Proponer como hecho adicional').props.onClick());
  assert.equal(ui.chat().data.hechosAdicionales, undefined);
  await ui.input('propuesta-chat-0', 'DETALLE CORREGIDO FICTICIO');
  await ui.act(() => ui.button('Aceptar e incluir').props.onClick());
  assert.equal(ui.chat().data.hechosAdicionales, 'DETALLE CORREGIDO FICTICIO');
  await ui.act(() => ui.button('Proponer como hecho adicional').props.onClick());
  await ui.act(() => ui.button('Descartar propuesta').props.onClick());
  assert.deepEqual(ui.chat().state.propuestas, []);
  assert.equal(ui.chat().data.hechosAdicionales, 'DETALLE CORREGIDO FICTICIO');
});

test('Contexto acotado sin truncar historial local; restauración conserva estado y contador', () => {
  const state = { ...emptyConversation(), mensajes: Array.from({ length: 40 }, (_, i) => ({ role: 'user', content: `FICTICIO ${i} ` + 'x'.repeat(1900) })), draft: 'PARCIAL', preguntados: { hechos: 2 } };
  const request = conversationRequest(state, { numeroDocumento: 'FICTICIO', hechos: text });
  assert.ok(request.mensajes.length <= 16); assert.ok(request.mensajes.reduce((sum, m) => sum + m.content.length, 0) <= 16000); assert.equal(state.mensajes.length, 40);
  assert.deepEqual(request.confirmados, { hechos: text });
  assert.deepEqual(restoreConversation(state).mensajes, state.mensajes);
  const got = receiveConversation({ ...emptyConversation(), mensajes: [{ role: 'user', content: text }] }, result);
  assert.deepEqual(got.propuestas, [proposal]); assert.equal(got.preguntados.accionado, 1);
});

test('Dos opciones equivalentes al iniciar; revisión opcional no agrega preguntas al camino corto', () => {
  const runner = readFileSync(new URL('../src/components/tools/ToolRunner.tsx', import.meta.url), 'utf8');
  assert.match(runner, /Contarlo conversando/); assert.match(runner, /Responder paso a paso/);
  assert.equal((runner.match(/btn btn-primary min-h-16 w-full/g) || []).length, 2);
  const interview = readFileSync(new URL('../src/components/tools/Interview.tsx', import.meta.url), 'utf8');
  assert.match(interview, /¿Hay algo más que consideres importante\?/);
});
