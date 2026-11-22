/**
 * main.js — bootstrap, routing and cross-cutting concerns.
 */

import { setLocale, t, getLocale } from './core/i18n.js';
import { formatHours } from './core/prayer-times.js';
import { HIJRI_MONTHS_BN } from './core/hijri.js';
import { hijriFor, dateKey } from './services.js';
import * as state from './state.js';
import { qs, qsa } from './ui/dom.js';

import { create as createHome } from './views/home.js';
import { create as createQibla } from './views/qibla.js';
import { create as createSalah } from './views/salah.js';
import { create as createDuas } from './views/duas.js';
import { create as createMore } from './views/more.js';

const VIEWS = {
  home: createHome,
  qibla: createQibla,
  salah: createSalah,
  duas: createDuas,
  more: createMore,
};

const viewEl = qs(document, '#view');
let currentRoute = null;
let currentView = null;
let tickTimer = null;
let mountedDay = dateKey();

/* ----------------------------------------------------------------- theme */

function applyTheme() {
  const theme = state.get().theme ?? 'light';
  document.documentElement.dataset.theme = theme;
  const meta = qs(document, 'meta[name="theme-color"]');
  // The app is light-only (white content), so the browser chrome stays white.
  if (meta) meta.setAttribute('content', '#ffffff');
}

/* --------------------------------------------------------------- context */

const ctx = {
  locale: () => getLocale(),
  fmt: (hours) => {
    const s = state.get();
    return formatHours(hours, { hour12: !!s.hour12, locale: getLocale() });
  },
  hijri: () => hijriFor(new Date()),
  hijriMonthBn: (index) => HIJRI_MONTHS_BN[index] ?? '',
  applyTheme,
  rerender: () => mount(currentRoute, { force: true }),
  onSettingsChange: () => {
    // setLocale must run here too: it is only called in boot(), so without
    // this a language change would sit in storage until the next reload.
    setLocale(state.effectiveLocale());
    applyTheme();
    applyStaticI18n();
    // Refresh in place instead of force-remounting: a remount rebuilds the
    // More view from scratch and drops its navigation stack, kicking the
    // user out of Settings after every single change.
    if (currentView?.refresh) currentView.refresh();
    else mount(currentRoute, { force: true });
  },
};

/* ------------------------------------------------------------ i18n glue */

function applyStaticI18n() {
  document.documentElement.lang = getLocale();
  for (const node of qsa(document, '[data-i18n]')) {
    const key = node.dataset.i18n;
    // Keep the tab labels short; the full string lives in the dictionary.
    node.textContent = t(key);
  }
  const title = qs(document, '.topbar__title');
  if (title) title.textContent = t('app.name');
}

function updateHeader() {
  const sub = qs(document, '#hijri-today');
  if (!sub) return;
  const h = hijriFor(new Date());
  const locale = getLocale();
  const month = locale === 'bn' ? HIJRI_MONTHS_BN[h.month - 1] : h.monthName;
  const digits = (n) =>
    locale === 'bn' ? String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : String(n);
  sub.textContent = `${digits(h.day)} ${month} ${digits(h.year)} ${t('common.hijri')}`;
}

/* --------------------------------------------------------------- routing */

function mount(route, { force = false } = {}) {
  if (!VIEWS[route]) route = 'home';
  if (route === currentRoute && !force && currentView) return;

  currentView?.cleanup?.();
  currentRoute = route;
  mountedDay = dateKey();
  // Per-page colour: each route gets its own accent (see the
  // "Per-page colours" block at the end of src/styles/main.css).
  document.documentElement.dataset.route = route;
  if (route !== 'more') delete document.documentElement.dataset.subpage;

  const view = VIEWS[route](ctx);
  currentView = view;
  viewEl.replaceChildren(view.root);
  viewEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });

  for (const btn of qsa(document, '.tabbar__btn')) {
    const active = btn.dataset.route === route;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  }

  if (location.hash.slice(1) !== route) {
    history.replaceState(null, '', `#${route}`);
  }
}

/* ------------------------------------------------------------ bootstrap */

function boot() {
  state.load();
  setLocale(state.effectiveLocale());

  applyTheme();
  applyStaticI18n();
  updateHeader();

  const initial = location.hash.slice(1) || 'home';
  mount(VIEWS[initial] ? initial : 'home', { force: true });

  for (const btn of qsa(document, '.tabbar__btn')) {
    btn.addEventListener('click', () => {
      // Re-tapping the current tab goes back to that tab's top level
      // (e.g. from a Tasbih/Settings sub-page back to the More menu).
      // mount() alone would return early for the current route.
      mount(btn.dataset.route, { force: btn.dataset.route === currentRoute });
    });
  }
  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1) || 'home';
    mount(route);
  });

  qs(document, '#settings-btn')?.addEventListener('click', () => {
    // The settings screen lives under "More".
    mount('more');
    // Nudge the More view straight to its settings page.
    setTimeout(() => {
      const el = document.querySelector('.more [data-page="settings"]');
      el?.click();
    }, 0);
  });

  // Scroll shadow on the header.
  const topbar = qs(document, '.topbar');
  window.addEventListener(
    'scroll',
    () => topbar?.classList.toggle('is-scrolled', window.scrollY > 4),
    { passive: true }
  );

  // One ticker drives countdowns; views opt in via `tick`.
  let lastHeaderMinute = -1;
  tickTimer = setInterval(() => {
    const now = new Date();
    currentView?.tick?.(now);
    if (now.getMinutes() !== lastHeaderMinute) {
      lastHeaderMinute = now.getMinutes();
      updateHeader();
    }
  }, 1000);

  // Re-evaluate the day at midnight so the timetable rolls over.
  scheduleMidnightRefresh();

  registerServiceWorker();
  // Re-render when the tab becomes visible again after a long pause.
  // Only rebuild if the day rolled over while hidden; remounting on every
  // return would reset the compass, scroll position and open settings page.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (dateKey() !== mountedDay) mount(currentRoute, { force: true });
    else currentView?.tick?.(new Date());
  });
}

function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => {
    mount(currentRoute, { force: true });
    scheduleMidnightRefresh();
  }, midnight - now);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline caching is a bonus; failure must not break the app. */
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
