import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupDOM } from './helpers/dom.js';

/**
 * Boots the real application entry point against a DOM and asserts that the
 * router mounts a populated view and wires the tab bar. This covers main.js
 * itself, which the per-view smoke tests do not.
 */

let document;

beforeAll(async () => {
  ({ document } = setupDOM());
  // Fake timers keep main.js's midnight refresh and 1s ticker from holding
  // the process open or firing mid-assertion.
  vi.useFakeTimers();

  // Fresh module registry for the app entry point.
  vi.resetModules();
  await import('../src/main.js');
});

afterAll(() => {
  vi.useRealTimers();
});

describe('application bootstrap', () => {
  it('mounts a populated view into #view', () => {
    const view = document.querySelector('#view');
    expect(view).not.toBeNull();
    expect(view.children.length).toBeGreaterThan(0);
    // The home view always renders the prayer list.
    expect(view.innerHTML.toLowerCase()).toContain('fajr');
  });

  it('renders a real time in the timetable', () => {
    const view = document.querySelector('#view');
    expect(view.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('marks exactly one tab as active and it is home', () => {
    const active = document.querySelectorAll('.tabbar__btn.is-active');
    expect(active.length).toBe(1);
    expect(active[0].dataset.route).toBe('home');
  });

  it('applies the interface language to the document', () => {
    expect(document.documentElement.lang).toBe('en');
  });

  it('resolves the app name into the header', () => {
    expect(document.querySelector('.topbar__title').textContent).toBe('Namaj Shikkha');
  });

  it('fills the Hijri subtitle', () => {
    const sub = document.querySelector('#hijri-today');
    expect(sub.textContent.trim().length).toBeGreaterThan(0);
    expect(sub.textContent).toMatch(/\d/);
  });

  it('navigates when a tab is clicked', () => {
    const qiblaBtn = document.querySelector('.tabbar__btn[data-route="qibla"]');
    qiblaBtn.dispatchEvent(new document.defaultView.Event('click'));
    expect(document.querySelector('#view').querySelector('.compass')).not.toBeNull();
    expect(document.querySelector('.tabbar__btn.is-active').dataset.route).toBe('qibla');
  });
});
