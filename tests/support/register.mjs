import { registerHooks } from 'node:module';
import { extname } from 'node:path';
const root = new URL('../../src/', import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    if (url.href.startsWith(root.href) && !extname(url.pathname)) { url.pathname += '.ts'; return nextResolve(url.href, context); }
  }
  return nextResolve(specifier, context);
} });
