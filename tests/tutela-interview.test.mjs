import test from 'node:test';
import assert from 'node:assert/strict';
import { interviewHarness } from './support/interview-harness.mjs';

test('Entrevista real con stubs: 12 preguntas, organizador aceptado, sugerencia confirmada y contacto único', async () => {
  const ui = interviewHarness();
  assert.match(ui.text(), /Pregunta 1 de 12/);
  await ui.input('respuesta', 'La EPS ficticia negó el medicamento ficticio.');
  await ui.submit();
  assert.match(ui.text(), /Así lo ordené/);
  assert.equal(ui.saved().data.hechos, undefined);
  await ui.act(() => ui.button('Usar mis palabras').props.onClick());
  assert.match(ui.text(), /Pregunta 2 de 12/);
  assert.equal(ui.saved().answer, '');
  assert.equal(ui.saved().questionId, 'accionado');
  for (const answer of ['ENTIDAD FICTICIA', 'Pedí una solución ficticia y la negaron.', 'En noviembre de 2026; sigue pasando.']) {
    await ui.input('respuesta', answer); await ui.submit();
  }
  assert.match(ui.text(), /Pregunta 5 de 12/);
  await ui.act(() => ui.button('No').props.onClick());
  assert.match(ui.text(), /Pregunta 6 de 12/);
  assert.match(ui.text(), /SUGERENCIA/);
  assert.equal(ui.button('Mi salud').props['aria-pressed'], true);
  assert.equal(ui.saved().data.derechos, undefined);
  await ui.act(() => ui.button('Confirmar estos derechos').props.onClick());
  assert.equal(ui.saved().data.derechos.length, 1);
  await ui.input('respuesta', 'Que entreguen el medicamento ficticio.'); await ui.submit();
  await ui.act(() => ui.button('Sí, está bien').props.onClick());
  await ui.input('respuesta', 'ninguna por ahora'); await ui.submit();
  assert.match(ui.text(), /Pregunta 9 de 12/);
  assert.equal(ui.button('Para mí').props['aria-pressed'], true);
  await ui.input('dato-nombre', 'PERSONA FICTICIA'); await ui.submit();
  assert.match(ui.text(), /Pregunta 10 de 12/);
  assert.equal(ui.find(n => n.props.id === 'dato-tipoDocumento').props.value, 'Cédula de ciudadanía');
  await ui.input('dato-numeroDocumento', 'DOCUMENTO-FICTICIO'); await ui.submit();
  await ui.input('respuesta', 'MUNICIPIO FICTICIO'); await ui.submit();
  assert.match(ui.text(), /Pregunta 12 de 12/);
  await ui.submit();
  assert.match(ui.text(), /Indica al menos un medio de contacto/);
  await ui.input('dato-telefono', 'TELÉFONO FICTICIO'); await ui.submit();
  const review = ui.find(n => n.type === 'review');
  assert.equal(review.props.data.correo, '');
  assert.equal(review.props.data.telefono, 'TELÉFONO FICTICIO');
  assert.match(ui.text(), /Completadas 12 de 12/);
  assert.equal(ui.calls.some(c => c.body.step === 'preguntas'), false);
  assert.equal(ui.calls.filter(c => c.url.endsWith('organizar')).length, 2);
});

test('Editar peligro y representación en revisión muestra las nuevas condicionales y vuelve a revisión', async () => {
  const data = { hechos: 'HECHOS FICTICIOS', accionado: 'ENTIDAD FICTICIA', actuaciones: 'GESTIÓN FICTICIA', cuando: 'FECHA FICTICIA', medidaProvisional: 'No', derechos: ['Salud'], pretensiones: 'PEDIDO FICTICIO', pruebas: 'ninguna por ahora', nombre: 'PERSONA FICTICIA', numeroDocumento: 'DOCUMENTO-FICTICIO', ciudad: 'MUNICIPIO FICTICIO', correo: 'persona@example.invalid' };
  const ui = interviewHarness({ version: 2, kind: 'tutela', data, index: 37, answer: '', picked: [] });
  await ui.act(() => ui.button('Retomar mi avance').props.onClick());
  await ui.act(() => ui.find(n => n.type === 'review').props.editField('medidaProvisional'));
  await ui.act(() => ui.button('Sí').props.onClick());
  assert.match(ui.text(), /Pregunta 6 de 13/);
  await ui.input('dato-medida', 'MEDIDA FICTICIA'); await ui.input('dato-razonMedida', 'RAZÓN FICTICIA'); await ui.submit();
  assert.ok(ui.find(n => n.type === 'review'));
  await ui.act(() => ui.find(n => n.type === 'review').props.editField('calidad'));
  await ui.act(() => ui.button('Para otra persona').props.onClick());
  await ui.submit();
  assert.match(ui.text(), /Pregunta 11 de 14/);
  await ui.input('respuesta', 'PERSONA REPRESENTADA FICTICIA'); await ui.submit();
  assert.equal(ui.find(n => n.type === 'review').props.data.comunidad, 'PERSONA REPRESENTADA FICTICIA');
  await ui.act(() => ui.find(n => n.type === 'review').props.editField('medidaProvisional'));
  await ui.act(() => ui.button('No').props.onClick());
  assert.match(ui.text(), /Completadas 13 de 13/);
});
