/**
 * dom.js — minimal browser environment for view smoke tests, powered by
 * linkedom. No real browser is required, so this runs in CI.
 */

import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Install a fresh fake browser environment on globalThis. */
export function setupDOM() {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const { window, document } = parseHTML(html);

  // Minimal Web Storage.
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };

  const matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });

  const noop = () => {};
  window.matchMedia = matchMedia;
  window.scrollTo = noop;
  window.localStorage = localStorage;
  window.history = { replaceState: noop, pushState: noop };
  window.location = { hash: '', pathname: '/', origin: 'http://localhost' };
  window.confirm = () => true;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  window.setInterval = setInterval;
  window.clearInterval = clearInterval;

  const g = globalThis;
  g.window = window;
  g.document = document;
  g.localStorage = localStorage;
  g.location = window.location;
  g.history = window.history;
  g.matchMedia = matchMedia;

  // Node 22 defines `navigator` as a read-only getter, so plain assignment
  // throws. Redefine it when possible and otherwise keep Node's own object,
  // which already exposes `language`.
  const nav = window.navigator ?? {};
  try {
    Object.defineProperty(g, 'navigator', {
      value: { languages: ['en'], language: 'en', ...nav },
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      g.navigator.languages = ['en'];
    } catch {
      /* read-only in this runtime; i18n falls back to English anyway */
    }
  }
  g.HTMLElement = window.HTMLElement;
  g.Node = window.Node;
  g.CustomEvent = window.CustomEvent ?? class {};
  g.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  return { window, document };
}

/** A minimal context object matching what views expect from main.js. */
export function fakeCtx(overrides = {}) {
  return {
    locale: () => 'en',
    fmt: (h) => (Number.isFinite(h) ? `${String(Math.floor(h)).padStart(2, '0')}:00` : '—'),
    hijri: () => ({ year: 1448, month: 6, day: 10, monthName: 'Jumada al-Akhirah' }),
    hijriMonthBn: () => 'জুমাদাল আখিরা',
    applyTheme: () => {},
    rerender: () => {},
    onSettingsChange: () => {},
    ...overrides,
  };
}
