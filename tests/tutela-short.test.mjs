import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTELA, TOOL_LIST, RIGHTS, LEGACY_TUTELA_FIELDS, interviewQuestions, tutelaDefaults, migrateTutelaDraft, validateTool, suggestRights, optionLabel } from '../src/lib/tools-config.ts';
import { readDraft, draftKey } from '../src/lib/tools-draft.ts';
import { interviewHarness } from './support/interview-harness.mjs';

const short = tutelaDefaults({ hechos: 'Relato ficticio de una negativa de atención médica.', accionado: 'ENTIDAD FICTICIA', actuaciones: 'Pedí una solución ficticia; la negaron y no conozco otro camino.', cuando: 'En noviembre de 2026; sigue pasando.', medidaProvisional: 'No', derechos: [RIGHTS[7]], pretensiones: 'Que la entidad ficticia entregue el medicamento ficticio.', pruebas: 'ninguna por ahora', nombre: 'PERSONA FICTICIA', numeroDocumento: 'DOCUMENTO-FICTICIO', ciudad: 'MUNICIPIO FICTICIO', correo: 'persona@example.invalid' });

test('Semáforo muestra tres sugerencias y deja el resto cerrado en Agregar más detalles; juramento por casilla', async () => {
  const ui = interviewHarness(undefined, { component: 'DocumentReview', data: short });
  const section = ui.find(n => n.props['aria-labelledby'] === 'revision-calidad');
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
  const immediate = (Array.isArray(section.props.children) ? section.props.children : [section.props.children]).flat(Infinity);
  const visibleList = immediate.find(n => n?.type === 'ul');
  assert.equal(nodes(visibleList).filter(n => n.type === 'li').length, 3);
  const details = immediate.find(n => n?.type === 'details' && nodes(n).some(c => c.type === 'summary' && c.props.children === 'Agregar más detalles (opcional)'));
  assert.equal(details.props.open, undefined);
  assert.ok(nodes(details).some(n => n.type === 'li'));
  assert.match(ui.text(), /Confirmación pendiente/);
  assert.doesNotMatch(ui.text(), /números de los hechos|números de las pruebas/);
  await ui.act(() => ui.button('Ver y editar el documento').props.onClick());
  assert.equal(ui.button('Descargar documento Word').props.disabled, true);
  for (let i = 0; i < 2; i++) await ui.act(() => ui.nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox')[i].props.onChange({ target: { checked: true } }));
  assert.doesNotMatch(ui.text(), /Confirmación pendiente/);
  assert.equal(ui.button('Descargar documento Word').props.disabled, false);
  ui.unmount();
});

test('Camino normal: doce pantallas en orden, documento y contacto agrupados', () => {
  const questions = interviewQuestions(TUTELA, tutelaDefaults());
  assert.equal(questions.length, 12);
  assert.deepEqual(questions.map(q => q.stepId), ['hechos', 'accionado', 'actuaciones', 'cuando', 'peligro', 'derechos', 'pretensiones', 'pruebas', 'persona', 'documento', 'municipio', 'contacto']);
  assert.deepEqual(questions[8].fields.map(f => f.name), ['nombre', 'calidad']);
  assert.deepEqual(questions[9].fields.map(f => f.name).sort(), ['numeroDocumento', 'tipoDocumento']);
  assert.deepEqual(questions[11].fields.map(f => f.name), ['correo', 'telefono']);
  assert.equal(tutelaDefaults().tipoDocumento, 'Cédula de ciudadanía');
  assert.equal(optionLabel('calidad', tutelaDefaults().calidad), 'Para mí');
  assert.deepEqual(validateTool(TUTELA, short), {});
  assert.deepEqual(validateTool(TUTELA, { ...short, correo: '', telefono: 'TELÉFONO FICTICIO' }), {});
  assert.ok(validateTool(TUTELA, { ...short, correo: '', direccion: 'DIRECCIÓN FICTICIA' }).correo);
});

test('Peligro: una pantalla condicional, solo con Sí; exige medida y razón', () => {
  const urgent = { ...short, medidaProvisional: 'Sí' };
  assert.equal(interviewQuestions(TUTELA, urgent).length, 13);
  assert.equal(interviewQuestions(TUTELA, urgent)[5].stepId, 'medida');
  assert.deepEqual(Object.keys(validateTool(TUTELA, urgent)).sort(), ['medida', 'razonMedida']);
  assert.deepEqual(validateTool(TUTELA, { ...urgent, medida: 'MEDIDA FICTICIA', razonMedida: 'RAZÓN FICTICIA' }), {});
  assert.equal(interviewQuestions(TUTELA, short).some(q => q.stepId === 'medida'), false);
});

test('Otra persona o comunidad: pregunta a nombre de quién y actualiza total al cambiar', () => {
  for (const calidad of ['En representación de otra persona', 'Como autoridad o representante de una comunidad', 'Como agente oficioso de alguien que no puede defenderse']) {
    const data = { ...short, calidad };
    const questions = interviewQuestions(TUTELA, data);
    assert.equal(questions.length, 13);
    assert.equal(questions[9].stepId, 'representacion');
    assert.ok(validateTool(TUTELA, data).comunidad);
    assert.deepEqual(validateTool(TUTELA, { ...data, comunidad: 'NOMBRE FICTICIO' }), {});
    assert.equal(interviewQuestions(TUTELA, { ...data, medidaProvisional: 'Sí' }).length, 14);
    assert.equal(interviewQuestions(TUTELA, { ...data, calidad: 'En nombre propio' }).length, 12);
  }
});

test('Detalles opcionales no agregan pantallas ni obligaciones; sugerencias requieren confirmación', () => {
  const optional = TUTELA.steps.find(s => s.optionalDetails);
  for (const name of ['direccion', 'contactoAccionado', 'demuestra', 'responsables', 'plazos', 'verificaciones', 'explicacion', 'otroDerecho']) assert.ok(optional.fields.some(f => f.name === name && !f.required));
  assert.deepEqual(suggestRights('La EPS negó el medicamento ficticio.'), [RIGHTS[7]]);
  assert.equal(optionLabel('derechos', RIGHTS[7]), 'Mi salud');
  const data = { ...short, derechos: [] };
  suggestRights(data.hechos);
  assert.deepEqual(data.derechos, []);
  assert.ok(validateTool(TUTELA, data).derechos);
});

test('Borrador v2: conserva cada respuesta parcial anterior, detalles, derechos y ediciones', () => {
  assert.equal(LEGACY_TUTELA_FIELDS.length, 37);
  for (const [index, field] of LEGACY_TUTELA_FIELDS.entries()) {
    const saved = { version: 2, kind: 'tutela', index, data: { ...short, edicion_hechos: 'EDICIÓN FICTICIA' }, answer: 'RESPUESTA FICTICIA PARCIAL', picked: field === 'derechos' ? [RIGHTS[4]] : [] };
    const storage = { getItem: key => key === draftKey('tutela') ? JSON.stringify(saved) : null };
    const migrated = migrateTutelaDraft(readDraft(storage, 'tutela'));
    assert.deepEqual(migrated.data[field], field === 'derechos' ? [RIGHTS[4]] : saved.answer);
    assert.equal(migrated.data.edicion_hechos, 'EDICIÓN FICTICIA');
    assert.ok(migrated.index >= 0 && migrated.index <= interviewQuestions(TUTELA, migrated.data).length);
    assert.equal(migrated.version, 3);
  }
});

test('Borradores terminados y nuevos: revisión estable y respuestas agrupadas parciales', () => {
  const complete = migrateTutelaDraft({ version: 2, data: short, index: 37, answer: '', picked: [] });
  assert.equal(complete.questionId, 'revision');
  assert.equal(complete.index, 12);
  const saved = { version: 3, kind: 'tutela', data: { ...short, correo: '', telefono: 'TELÉFONO FICTICIO' }, questionId: 'contacto', index: 999, answer: 'correo-parcial', picked: [] };
  const restored = migrateTutelaDraft(saved);
  assert.equal(restored.index, 11);
  assert.equal(restored.answer, 'correo-parcial');
  assert.equal(restored.data.telefono, 'TELÉFONO FICTICIO');
});

test('Otros mecanismos mantienen una pregunta por campo y el relato primero', () => {
  for (const tool of TOOL_LIST.filter(t => t.kind !== 'tutela')) {
    const fields = tool.steps.flatMap(step => step.fields.map(f => f.name));
    assert.deepEqual(interviewQuestions(tool, {}).map(q => q.field.name), ['hechos', ...fields.filter(n => n !== 'hechos')]);
    assert.equal(tool.steps.some(s => s.optionalDetails || s.condition), false);
  }
});

test('Configuración idéntica byte por byte en ambos repositorios', () => {
  assert.deepEqual(readFileSync(new URL('../src/lib/tools-config.ts', import.meta.url)), readFileSync(new URL('../../raizia-backend/src/lib/tools-config.ts', import.meta.url)));
});
