import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as config from '../../src/lib/tools-config.ts';
import * as drafts from '../../src/lib/tools-draft.ts';

// Ejecuta los handlers y efectos reales del componente con almacenamiento y APIs
// locales. No sustituye una prueba visual en navegador ni el reconciliador React.
export function interviewHarness(saved) {
  const cells = [], effects = [], frames = new Map(), calls = [];
  let cursor = 0, dirty = true, tree, frameId = 0;
  const storage = initial => {
    const map = new Map(initial);
    return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k), key: i => [...map.keys()][i], get length() { return map.size; } };
  };
  const localStorage = storage(saved ? [[drafts.draftKey('tutela'), JSON.stringify(saved)]] : []);
  const browser = { localStorage, sessionStorage: storage(), requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id) };
  const changed = (before, after) => !before || !after || before.length !== after.length || after.some((v, i) => !Object.is(v, before[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], next => { const value = typeof next === 'function' ? next(cells[i]) : next; if (!Object.is(cells[i], value)) { cells[i] = value; dirty = true; } }];
    },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (changed(cells[i]?.deps, deps)) cells[i] = { deps, value: fn() }; return cells[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (changed(cells[i]?.deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const adapters = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, 'next/link': { default: 'a' },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowUp', 'Check', 'ListChecks', 'LoaderCircle', 'Pencil', 'SkipForward', 'Volume2'].map(name => [name, name])),
    '@/components/Logo': { LogoMark: 'logo' }, '@/lib/speech': { speak() {}, stopSpeaking() {} },
    '@/lib/document-model': { entries: v => String(v || '').split('\n').filter(Boolean) },
    './RouteCards': { RouteCards: 'routes' }, './DocumentReview': { DocumentReview: 'review' },
    '../chat/ProfileStep': { loadProfile: () => ({}) }, '@/lib/tools-draft': drafts, '@/lib/tools-config': config,
  };
  const request = async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url, body });
    return { json: async () => url.endsWith('organizar') ? { text: `VERSIÓN ORGANIZADA FICTICIA: ${body.text}`, organized: true } : { fits: true, routes: [] } };
  };
  function load(relative) {
    const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const loaded = { exports: {} };
    new Function('require', 'module', 'exports', 'window', 'fetch', code)(name => {
      if (!(name in adapters)) throw new Error(`Adaptador faltante: ${name}`);
      return adapters[name];
    }, loaded, loaded.exports, browser, request);
    return loaded.exports;
  }
  adapters['./ToolFields'] = load('../../src/components/tools/ToolFields.tsx');
  const { Interview } = load('../../src/components/tools/Interview.tsx');
  function expand(node) {
    if (node == null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props.children) } };
  }
  function flush() {
    for (let turn = 0; turn < 40 && (dirty || effects.length || frames.size); turn++) {
      if (dirty) { dirty = false; cursor = 0; tree = expand(Interview({ kind: 'tutela' })); }
      for (const effect of effects.splice(0)) effect();
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());
    }
    if (dirty || frames.size) throw new Error('El componente no estabilizó');
  }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(n => nodes(n));
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props.children)];
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(n => text(n)).join('');
    return node && typeof node === 'object' ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  }
  const find = predicate => { const node = nodes(tree).find(predicate); if (!node) throw new Error('Control no encontrado'); return node; };
  async function act(fn) { await fn(); for (let i = 0; i < 8; i++) { await Promise.resolve(); flush(); } }
  flush();
  return { calls, storage: localStorage, text: () => text(tree), nodes: () => nodes(tree), find, act,
    button: label => find(n => n.type === 'button' && text(n) === label),
    input: (id, value) => act(() => find(n => n.props.id === id).props.onChange({ target: { value } })),
    submit: () => act(() => find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })),
    saved: () => JSON.parse(localStorage.getItem(drafts.draftKey('tutela'))),
  };
}
