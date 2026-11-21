import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import fs from 'node:fs';

function worker() {
  const listeners = {}, entries = new Map(), puts = [], removed = [];
  let fetches = 0;
  const cache = {
    match: async key => entries.get(typeof key === 'string' ? key : new URL(key.url).pathname),
    put: async (key, response) => { puts.push(key); entries.set(typeof key === 'string' ? key : new URL(key.url).pathname, response); },
  };
  const context = vm.createContext({ URL, Response,
    self: { location: { origin: 'https://raizia.test' }, addEventListener: (name, callback) => { listeners[name] = callback; }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => ['raizia-v0-static','raizia-v1-static','other-app'], delete: async key => { removed.push(key); } },
    fetch: async () => { fetches++; return new Response('public', { headers: { 'Cache-Control': 'public, max-age=1000' } }); },
  });
  vm.runInContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8') + '\nglobalThis.api = { strategy, publicResponse, cachedAsset, navigation, PRECACHE };', context);
  return { context, api: context.api, entries, puts, removed, listeners, fetches: () => fetches };
}
const request = (path, options = {}) => ({url: `https://raizia.test${path}`, method:'GET', mode:'cors', headers: new Headers(), ...options});

test('Nunca intercepta API, admin, métodos de escritura ni credenciales explícitas', () => {
  const {api} = worker();
  for (const path of ['/api/chat','/api/documents/1/file','/api','/admin','/admin/documents','/administrator','/%61pi/chat','/ADMIN']) {
    assert.equal(api.strategy(request(path, {mode:'navigate'})), 'ignore');
  }
  assert.equal(api.strategy(request('/_next/static/app.js', {method:'POST'})), 'ignore');
  assert.equal(api.strategy(request('/_next/static/app.js', {headers:new Headers({authorization:'Bearer prueba'})})), 'ignore');
  assert.equal(api.strategy(request('/asistente?_rsc=1')), 'ignore');
  assert.equal(api.strategy(request('/_next/static/app.js')), 'static');
  assert.equal(api.strategy(request('/asistente', {mode:'navigate'})), 'navigation');
  assert.equal(api.strategy(request('/sin-conexion', {mode:'navigate'})), 'navigation');
});
test('Precache exacto y activación borra solo versiones anteriores de RAIZIA', async () => {
  const {api, listeners, puts, removed} = worker();
  assert.deepEqual([...api.PRECACHE], ['/sin-conexion','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png']);
  let task;
  listeners.install({ waitUntil: promise => {task = promise;} });
  await task;
  assert.equal(puts.length,4);
  listeners.activate({ waitUntil: promise => {task = promise;} });
  await task;
  assert.deepEqual(removed,['raizia-v0-static']);
});
test('Assets cache-first, rechaza respuestas privadas y navegaciones nunca se guardan', async () => {
  const {api, context, entries, puts, fetches} = worker();
  await api.cachedAsset(request('/_next/static/app.js'),'test');
  await api.cachedAsset(request('/_next/static/app.js'),'test');
  assert.equal(fetches(),1);
  for (const headers of [{'Cache-Control':'private'}, {'Cache-Control':'no-store'}, {'Set-Cookie':'session=x'}, {'Vary':'Cookie'}]) {
    const response = new Response('personal',{headers});
    assert.equal(api.publicResponse(response),false);
    context.fetch = async () => response;
    await api.cachedAsset(request('/_next/static/private.js'),'test');
  }
  assert.equal(puts.length,1);
  await api.navigation(request('/asistente'));
  assert.equal(puts.length,1);
  entries.set('/sin-conexion',new Response('No hay internet'));
  context.fetch = async () => {throw new Error('offline');};
  assert.equal(await (await api.navigation(request('/asistente'))).text(),'No hay internet');
});
