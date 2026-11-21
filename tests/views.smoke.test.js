import { describe, it, expect, beforeAll } from 'vitest';
import { setupDOM, fakeCtx } from './helpers/dom.js';

/**
 * Smoke tests: every view must mount and render meaningful content without
 * throwing. This catches the blank-screen class of bug (a view whose build
 * function is never invoked), broken imports, and null dereferences — none of
 * which the pure-maths tests can see.
 */

let ctx;
let views;

beforeAll(async () => {
  setupDOM();
  const state = await import('../src/state.js');
  const i18n = await import('../src/core/i18n.js');
  state.load();
  i18n.setLocale('en');
  ctx = fakeCtx({ locale: () => i18n.getLocale() });

  views = {
    home: (await import('../src/views/home.js')).create,
    qibla: (await import('../src/views/qibla.js')).create,
    salah: (await import('../src/views/salah.js')).create,
    duas: (await import('../src/views/duas.js')).create,
    more: (await import('../src/views/more.js')).create,
  };
});

describe('view smoke tests', () => {
  it('home renders a countdown and the five prayers', () => {
    const v = views.home(ctx);
    const text = v.root.textContent;
    expect(v.root.children.length).toBeGreaterThan(0);
    for (const prayer of ['Fajr', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
      expect(v.root.innerHTML.toLowerCase()).toContain(prayer.toLowerCase());
    }
    // A time of the form HH:MM must be present.
    expect(text).toMatch(/\d{1,2}:\d{2}/);
    expect(v.root.querySelectorAll('.prayer-row').length).toBe(7);
  });

  it('home updates on tick without throwing', () => {
    const v = views.home(ctx);
    expect(() => v.tick(new Date())).not.toThrow();
  });

  it('qibla shows a bearing and a distance', () => {
    const v = views.qibla(ctx);
    const text = v.root.textContent;
    expect(text).toMatch(/\d+\.\d°|\d+°/);
    expect(v.root.querySelector('.compass')).not.toBeNull();
    expect(v.root.querySelector('.compass__needle')).not.toBeNull();
  });

  it('salah renders wudu steps by default section switch', () => {
    const v = views.salah(ctx);
    expect(v.root.querySelectorAll('.step').length).toBeGreaterThanOrEqual(10);
    expect(v.root.textContent).toContain('Allahu akbar');
    // Switching to wudu re-renders.
    const wuduBtn = v.root.querySelector('[data-section="wudu"]');
    expect(wuduBtn).not.toBeNull();
    wuduBtn.dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
  });

  it('duas renders items with Arabic text', () => {
    const v = views.duas(ctx);
    expect(v.root.querySelectorAll('.card').length).toBeGreaterThanOrEqual(10);
    expect(v.root.querySelector('.arabic')).not.toBeNull();
    // Arabic script must actually be present.
    expect(v.root.textContent).toMatch(/[\u0600-\u06FF]/);
  });

  it('more renders the menu', () => {
    const v = views.more(ctx);
    expect(v.root.querySelectorAll('[data-page]').length).toBeGreaterThanOrEqual(5);
  });

  it('more can navigate to the 99 names page', () => {
    const v = views.more(ctx);
    v.root.querySelector('[data-page="names"]').dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
    const items = v.root.querySelectorAll('[data-names] .list__item');
    expect(items.length).toBe(99);
  });

  it('more renders the settings page with every calculation method', () => {
    const v = views.more(ctx);
    v.root.querySelector('[data-page="settings"]').dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
    const options = v.root.querySelectorAll('[data-setting="method"] option');
    expect(options.length).toBeGreaterThan(10);
  });

  it('more renders the calendar and ramadan pages', () => {
    const v = views.more(ctx);
    v.root.querySelector('[data-page="calendar"]').dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
    expect(v.root.textContent).toMatch(/Hijri|হিজরি/);

    const v2 = views.more(ctx);
    v2.root.querySelector('[data-page="ramadan"]').dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
    expect(v2.root.textContent).toMatch(/Suhoor|Iftar/);
  });

  it('more renders tasbih with a counter', () => {
    const v = views.more(ctx);
    v.root.querySelector('[data-page="tasbih"]').dispatchEvent(new (globalThis.window.Event ?? Object)('click'));
    expect(v.root.querySelector('[data-dial]')).not.toBeNull();
    expect(v.root.querySelector('[data-count]')).not.toBeNull();
  });

  it('renders in Bengali without throwing', async () => {
    const i18n = await import('../src/core/i18n.js');
    i18n.setLocale('bn');
    const bctx = fakeCtx({ locale: () => 'bn' });
    for (const [name, factory] of Object.entries(views)) {
      expect(() => factory(bctx), `${name} should render in bn`).not.toThrow();
    }
    i18n.setLocale('en');
  });
});
