import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaimDraft, citationLabel, claimDocument, detectHealthCase, extractEps, hasDangerSigns, readableCitations, SUPERSALUD_PORTAL, TUTELA_PORTAL } from '../src/lib/health-route.ts';

test('urgente: señales de peligro o medicamento agotado van primero', () => {
  assert.equal(detectHealthCase('La EPS no me da la cita y tengo dolor en el pecho').level, 'urgente');
  assert.equal(detectHealthCase('Se me acabó la insulina y Sanitas no me la entrega').level, 'urgente');
  assert.equal(detectHealthCase('Mi hijo convulsiona y la EPS no autoriza la remisión').level, 'urgente');
});
test('grave no urgente: permite tutela y reclamo en paralelo', () => {
  const c = detectHealthCase('Sufro del azúcar, la EPS no me entrega la insulina y me queda para cinco días');
  assert.equal(c.level, 'grave');
});
test('no urgente y negaciones: no alarma de más', () => {
  assert.equal(detectHealthCase('La EPS no me da una cita con el especialista hace un mes').level, 'ordinario');
  assert.equal(hasDangerSigns('no tengo dolor en el pecho'), false);
  assert.equal(detectHealthCase('Quiero saber qué es la consulta previa'), null);
});
test('EPS: solo la nombrada, nunca Supersalud como accionada', () => {
  assert.equal(extractEps('Es con Sanitas, vivo en Minca'), 'Sanitas');
  assert.equal(extractEps('La entidad no responde'), '');
  const draft = buildClaimDraft('Sanitas no me entrega la insulina', { accionado: 'Superintendencia Nacional de Salud' });
  assert.match(draft, /Reclamo contra Sanitas/);
});
test('el reclamo reutiliza datos, marca faltantes y no afirma radicación', () => {
  const draft = buildClaimDraft('Sanitas no me entrega', { nombre: 'Persona de Prueba', hechos: 'No entregan la insulina.', pruebas: 'Fórmula' });
  assert.match(draft, /Persona de Prueba/); assert.match(draft, /No entregan la insulina/); assert.match(draft, /\[completar: correo\]/);
  assert.doesNotMatch(draft, /radiqué|fue radicado|ya presenté/i);
  assert.match(claimDocument('<b>&'), /&lt;b&gt;&amp;/);
});
test('enlaces oficiales exactos', () => {
  assert.equal(TUTELA_PORTAL, 'https://procesojudicial.ramajudicial.gov.co/TutelaEnLinea');
  assert.equal(SUPERSALUD_PORTAL, 'https://superargo.supersalud.gov.co/2/formularioWeb/pqrd.php');
});
test('las citas dejan de ser números sueltos', () => {
  const law = { n: 5, title: 'Ley Estatutaria 1751 de 2015 — Derecho fundamental a la salud', heading: 'Capitulo I · Artículo 5' };
  const guide = { n: 8, title: 'Ruta RAIZIA — Salud en resguardos y zonas alejadas: cómo reclamar', heading: 'Fragmento 1' };
  assert.equal(citationLabel(law), 'Ley Estatutaria 1751 de 2015, art. 5');
  assert.equal(citationLabel(guide), 'Guía RAIZIA: Salud en resguardos y zonas alejadas');
  assert.equal(readableCitations('Debe garantizarla [5] [8].', [law, guide]), 'Debe garantizarla (Ley Estatutaria 1751 de 2015, art. 5; Guía RAIZIA: Salud en resguardos y zonas alejadas).');
});
