import test from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessDays, colombianHolidays, deadlineDays } from '../src/lib/tools-deadlines.ts';
import { clearToolDrafts, draftKey, readDraft } from '../src/lib/tools-draft.ts';
import { NEEDS, JOURNEY } from '../src/lib/tools-journey.ts';

test('Plazos por mecanismo y modalidad, sin inventar vencimientos para los demás', () => {
  for (const [kind, type, days] of [['peticion', '', 15], ['peticion', 'Solicitud de información', 10], ['peticion', 'Solicitud de documentos o copias', 10], ['peticion', 'Consulta a la entidad', 30], ['tutela', '', 10], ['impugnacion', '', 3], ['desacato', '', null], ['popular', '', null]]) assert.equal(deadlineDays(kind, type), days);
});
test('Días hábiles: día siguiente, fines de semana, festivos fijos y trasladados, Pascua y cambio de año', () => {
  assert.equal(addBusinessDays('2026-11-20', 3), '2026-11-25');
  assert.equal(addBusinessDays('2026-11-13', 1), '2026-11-17');
  assert.equal(addBusinessDays('2026-12-07', 1), '2026-12-09');
  assert.equal(addBusinessDays('2026-04-01', 1), '2026-04-06');
  assert.equal(addBusinessDays('2026-12-31', 1), '2027-01-04');
  assert.equal(addBusinessDays('2026-12-31', 1, ['2027-01-04']), '2027-01-05');
  assert.equal(addBusinessDays('2026-11-20', 10), '2026-12-04');
  assert.equal(addBusinessDays('2026-11-20', 15), '2026-12-14');
  assert.equal(addBusinessDays('2026-11-20', 30), '2027-01-06');
  assert.ok(colombianHolidays(2026).has('2026-05-18'));
  assert.ok(colombianHolidays(2026).has('2026-06-08'));
  assert.ok(colombianHolidays(2026).has('2026-06-15'));
});
test('Fechas inválidas o cantidades ilimitadas nunca producen vencimientos', () => {
  for (const date of ['', '2026-02-30', '20/11/2026', '2026-13-01']) assert.equal(addBusinessDays(date, 3), null);
  for (const count of [-1, Infinity, 2.5, 99999]) assert.equal(addBusinessDays('2026-11-20', count), null);
});
test('Borrador versionado: conserva respuesta parcial y no mezcla mecanismos; borrar no toca otras preferencias', () => {
  const map = new Map();
  const storage = { getItem: k => map.get(k) || null, removeItem: k => map.delete(k), key: i => [...map.keys()][i], get length() { return map.size; } };
  const draft = { version: 2, kind: 'tutela', index: 4, data: { nombre: 'PERSONA FICTICIA' }, answer: 'RESPUESTA FICTICIA AÚN SIN ENVIAR', picked: [] };
  map.set(draftKey('tutela'), JSON.stringify(draft)); map.set('preferencia', 'conservar');
  assert.deepEqual(readDraft(storage, 'tutela'), draft); assert.equal(readDraft(storage, 'peticion'), null);
  map.set(draftKey('peticion'), '{'); assert.equal(readDraft(storage, 'peticion'), null);
  map.set('raizia.borrador.legado', '{}'); clearToolDrafts(storage);
  assert.deepEqual([...map.keys()], ['preferencia']);
});
test('Entrada cotidiana explica por qué y cuándo no; cada mecanismo tiene paso posterior', () => {
  assert.equal(NEEDS.length, 7);
  for (const need of NEEDS) assert.ok(need.label && need.why && need.avoid && JOURNEY[need.kind]);
  for (const path of Object.values(JOURNEY)) assert.ok(path.before && path.where && path.term && path.next && JOURNEY[path.nextKind]);
  assert.match(JOURNEY.tutela.where, /Tutela en Línea/);
  assert.match(JOURNEY.impugnacion.term, /3 días/);
});
