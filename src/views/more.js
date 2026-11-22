/**
 * more.js — hub for tasbih, 99 names, calendar, Ramadan, settings and about.
 * Keeps a small internal navigation stack.
 */

import names99 from '../data/names99.json' with { type: 'json' };
import { METHODS, MADHABS, HIGH_LATITUDE_RULES } from '../core/prayer-times.js';
import { CITIES } from '../core/location.js';
import { HIJRI_MONTHS, HIJRI_MONTHS_BN, notableDate, daysUntilRamadan, fromHijri, isRamadan } from '../core/hijri.js';
import { timesFor, hijriFor } from '../services.js';
import { el, esc, digits, toast } from '../ui/dom.js';
import { t, monthName } from '../core/i18n.js';
import { create as createTasbih } from './tasbih.js';
import * as state from '../state.js';

export function create(ctx) {
  let stack = ['menu'];
  let namesQuery = '';
  let tasbihInstance = null;

  const root = el('<div class="more"></div>');

  function build() {
    const page = stack[stack.length - 1];
    document.documentElement.dataset.subpage = page;
    tasbihInstance?.cleanup?.();
    tasbihInstance = null;

    if (page === 'tasbih') {
      tasbihInstance = createTasbih(ctx);
      // Tasbih used to be a dead end: no Back button, and re-tapping the
      // More tab did nothing while on this sub-page.
      root.innerHTML = `${backButton()}`;
      root.appendChild(tasbihInstance.root);
      wireBack();
      return;
    }
    if (page === 'names') return renderNames();
    if (page === 'calendar') return renderCalendar();
    if (page === 'ramadan') return renderRamadan();
    if (page === 'settings') return renderSettings();
    if (page === 'about') return renderAbout();
    return renderMenu();
  }

  function backButton(label = t('common.back')) {
    return `<button class="btn btn--ghost" type="button" data-action="back" style="margin-bottom:8px;padding:6px 12px;font-size:13px;">← ${esc(label)}</button>`;
  }

  function wireBack() {
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      stack.pop();
      build();
    });
  }

  function renderMenu() {
    const items = [
      { id: 'tasbih', icon: '📿', en: 'Tasbih counter', bn: 'তাসবিহ গণনা' },
      { id: 'names', icon: '✦', en: '99 Names of Allah', bn: 'আল্লাহর ৯৯টি নাম' },
      { id: 'calendar', icon: '☾', en: 'Hijri calendar', bn: 'হিজরি ক্যালেন্ডার' },
      { id: 'ramadan', icon: '🌙', en: 'Ramadan', bn: 'রমজান' },
      { id: 'settings', icon: '⚙', en: 'Settings', bn: 'সেটিংস' },
      { id: 'about', icon: 'ⓘ', en: 'About', bn: 'পরিচিতি' },
    ];
    const locale = ctx.locale();

    root.innerHTML = `
      <h2 class="section-title" style="margin-top:6px;">${esc(t('nav.more'))}</h2>
      <ul class="list">
        ${items
          .map(
            (i) => `<li><button class="list__item" type="button" data-page="${i.id}">
              <span style="width:22px;text-align:center;color:var(--accent)">${i.icon}</span>
              <span style="flex:1">${esc(locale === 'bn' ? i.bn : i.en)}</span>
              <span style="color:var(--text-muted)">›</span>
            </button></li>`
          )
          .join('')}
      </ul>
    `;

    root.querySelectorAll('[data-page]').forEach((b) =>
      b.addEventListener('click', () => {
        stack.push(b.dataset.page);
        build();
      })
    );
  }

  function renderNames() {
    const locale = ctx.locale();
    const q = namesQuery.trim().toLowerCase();
    const list = names99.names.filter(
      (n) =>
        !q ||
        n.translit.toLowerCase().includes(q) ||
        n.en.toLowerCase().includes(q) ||
        n.bn.includes(namesQuery.trim()) ||
        String(n.n) === q
    );

    root.innerHTML = `
      ${backButton()}
      <h2 class="section-title" style="margin-top:0;">${esc(t('names.title'))}</h2>
      <input class="input" type="search" data-search placeholder="${esc(t('names.search'))}"
        value="${esc(namesQuery)}" style="margin-bottom:12px;" />
      <ul class="list" data-names>
        ${
          list.length
            ? list
                .map(
                  (n) => `<li class="list__item" style="cursor:default;">
                    <span class="name-item__num">${esc(digits(n.n, locale))}</span>
                    <span class="name-item__arabic">${esc(n.arabic)}</span>
                    <span class="name-item__body">
                      <span class="name-item__translit">${esc(n.translit)}</span>
                      <span class="name-item__meaning">${esc(locale === 'bn' ? n.bn : n.en)}</span>
                    </span>
                  </li>`
                )
                .join('')
            : `<li class="list__item" style="cursor:default;color:var(--text-muted)">—</li>`
        }
      </ul>
    `;

    wireBack();
    const input = root.querySelector('[data-search]');
    input?.addEventListener('input', (e) => {
      namesQuery = e.target.value;
      const cursor = e.target.selectionStart;
      renderNames();
      const next = root.querySelector('[data-search]');
      if (next) {
        next.focus();
        next.setSelectionRange(cursor, cursor);
      }
    });
  }

  function renderCalendar() {
    const locale = ctx.locale();
    const today = new Date();
    const hijri = hijriFor(today);
    const months = locale === 'bn' ? HIJRI_MONTHS_BN : HIJRI_MONTHS;

    // Notable dates for the current Hijri year, in Gregorian order.
    const year = hijri.year;
    const dates = [];
    for (const nd of [
      { month: 1, day: 1 }, { month: 1, day: 10 }, { month: 3, day: 12 },
      { month: 7, day: 27 }, { month: 8, day: 15 }, { month: 9, day: 1 },
      { month: 10, day: 1 }, { month: 12, day: 9 }, { month: 12, day: 10 },
    ]) {
      const g = fromHijri(year, nd.month, nd.day);
      const meta = notableDate({ month: nd.month, day: nd.day });
      dates.push({ g, meta });
    }
    dates.sort((a, b) => new Date(a.g.year, a.g.month - 1, a.g.day) - new Date(b.g.year, b.g.month - 1, b.g.day));

    root.innerHTML = `
      ${backButton()}
      <h2 class="section-title" style="margin-top:0;">${esc(t('calendar.title'))}</h2>

      <div class="card" style="text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);">${esc(t('common.today'))}</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;">
          ${esc(digits(hijri.day, locale))} ${esc(months[hijri.month - 1])} ${esc(digits(hijri.year, locale))}
        </div>
        <div class="muted-text" style="margin-top:4px;">
          ${esc(monthName(today.getMonth(), locale))} ${esc(digits(today.getDate(), locale))}, ${esc(digits(today.getFullYear(), locale))}
        </div>
      </div>

      <h3 class="section-title">${esc(digits(year, locale))} ${esc(t('common.hijri'))}</h3>
      <ul class="list">
        ${dates
          .map(
            (d) => `<li class="list__item" style="cursor:default;">
              <span style="flex:1">${esc(locale === 'bn' ? d.meta.bn : d.meta.en)}</span>
              <span style="font-size:12.5px;color:var(--text-muted);font-variant-numeric:tabular-nums;">
                ${esc(digits(d.g.day, locale))} ${esc(monthName(d.g.month - 1, locale))} ${esc(digits(d.g.year, locale))}
              </span>
            </li>`
          )
          .join('')}
      </ul>
      <p class="muted-text" style="margin-top:14px;">${esc(t('calendar.note'))}</p>
    `;
    wireBack();
  }

  function renderRamadan() {
    const locale = ctx.locale();
    const now = new Date();
    const hijri = hijriFor(now);
    const times = timesFor(now);
    const days = daysUntilRamadan(now);
    const inRamadan = isRamadan(hijri);

    root.innerHTML = `
      ${backButton()}
      <h2 class="section-title" style="margin-top:0;">${esc(t('ramadan.title'))}</h2>

      <div class="hero" style="border-radius:var(--radius);">
        <p class="hero__label">${esc(inRamadan ? t('ramadan.inRamadan') : t('ramadan.until'))}</p>
        <h3 class="hero__name" style="font-size:38px;">${esc(digits(inRamadan ? '—' : days, locale))}</h3>
        ${inRamadan ? '' : `<p class="hero__time">${esc(t('ramadan.until'))}</p>`}
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="row-between">
          <span>${esc(t('ramadan.suhoor'))}</span>
          <strong style="font-variant-numeric:tabular-nums;">${esc(ctx.fmt(times.imsak))}</strong>
        </div>
        <div class="row-between">
          <span>${esc(t('ramadan.iftar'))}</span>
          <strong style="font-variant-numeric:tabular-nums;">${esc(ctx.fmt(times.maghrib))}</strong>
        </div>
      </div>
      <p class="muted-text" style="margin-top:14px;">${esc(t('common.today'))}: ${esc(digits(now.getDate(), locale))} ${esc(monthName(now.getMonth(), locale))} ${esc(digits(now.getFullYear(), locale))}</p>
      <p class="muted-text" style="margin-top:14px;">${esc(t('calendar.note'))}</p>
    `;
    wireBack();
  }

  function renderSettings() {
    const s = state.get();
    const locale = ctx.locale();

    root.innerHTML = `
      ${backButton()}
      <h2 class="section-title" style="margin-top:0;">${esc(t('settings.title'))}</h2>

      <div class="card">
        <label class="field">
          <span class="field__label">${esc(t('settings.language'))}</span>
          <select class="select" data-setting="locale">
            <option value="auto" ${s.locale === null ? 'selected' : ''}>Auto</option>
            <option value="en" ${s.locale === 'en' ? 'selected' : ''}>English</option>
            <option value="bn" ${s.locale === 'bn' ? 'selected' : ''}>বাংলা</option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">${esc(t('settings.city'))}</span>
          <select class="select" data-setting="cityId">
            ${CITIES.map(
              (c) => `<option value="${c.id}" ${s.cityId === c.id && !s.coords ? 'selected' : ''}>
                ${esc(locale === 'bn' ? c.bn : c.en)}
              </option>`
            ).join('')}
          </select>
        </label>

        <label class="field">
          <span class="field__label">${esc(t('times.method'))}</span>
          <select class="select" data-setting="method">
            ${Object.entries(METHODS)
              .map(
                ([k, v]) => `<option value="${k}" ${s.method === k ? 'selected' : ''}>${esc(k)} — ${esc(v.name)}</option>`
              )
              .join('')}
          </select>
        </label>

        <label class="field">
          <span class="field__label">${esc(t('times.madhab'))}</span>
          <select class="select" data-setting="madhab">
            ${Object.entries(MADHABS)
              .map(
                ([k, v]) => `<option value="${k}" ${s.madhab === k ? 'selected' : ''}>${esc(v)}</option>`
              )
              .join('')}
          </select>
        </label>

        <label class="field" style="margin-bottom:0;">
          <span class="field__label">${esc(t('times.highLat'))}</span>
          <select class="select" data-setting="highLat">
            ${Object.entries(HIGH_LATITUDE_RULES)
              .map(
                ([k, v]) => `<option value="${k}" ${s.highLat === k ? 'selected' : ''}>${esc(v)}</option>`
              )
              .join('')}
          </select>
        </label>
      </div>

      <div class="card">
        <div class="row-between">
          <span>${esc(t('settings.timeFormat'))}</span>
          <div class="segmented">
            <button type="button" data-toggle="hour12" data-value="false" aria-pressed="${!s.hour12}">24h</button>
            <button type="button" data-toggle="hour12" data-value="true" aria-pressed="${s.hour12}">12h</button>
          </div>
        </div>
        <div class="row-between">
          <span>${esc(t('settings.theme'))}</span>
          <div class="segmented">
            <button type="button" data-toggle="theme" data-value="auto" aria-pressed="${s.theme === 'auto'}">Auto</button>
            <button type="button" data-toggle="theme" data-value="light" aria-pressed="${s.theme === 'light'}">☀</button>
            <button type="button" data-toggle="theme" data-value="dark" aria-pressed="${s.theme === 'dark'}">☾</button>
          </div>
        </div>
        <div class="row-between">
          <span>${esc(t('settings.haptics'))}</span>
          <div class="segmented">
            <button type="button" data-toggle="haptics" data-value="true" aria-pressed="${s.haptics}">On</button>
            <button type="button" data-toggle="haptics" data-value="false" aria-pressed="${!s.haptics}">Off</button>
          </div>
        </div>
      </div>

      <button class="btn btn--ghost btn--block" type="button" data-action="reset-all" style="margin-top:14px;color:var(--danger);">
        ${esc(t('settings.reset'))}
      </button>
    `;

    wireBack();

    root.querySelectorAll('[data-setting]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const key = sel.dataset.setting;
        let value = sel.value;
        if (key === 'locale') value = value === 'auto' ? null : value;
        const patch = { [key]: value };
        // Choosing a city explicitly drops any GPS override.
        if (key === 'cityId') patch.coords = null;
        state.set(patch);
        ctx.onSettingsChange();
      });
    });

    root.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        let value = btn.dataset.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        state.set({ [key]: value });
        if (key === 'theme') ctx.applyTheme();
        ctx.onSettingsChange();
      });
    });

    root.querySelector('[data-action="reset-all"]')?.addEventListener('click', () => {
      if (!window.confirm(t('settings.resetConfirm'))) return;
      state.resetAll();
      toast(t('settings.reset'));
      ctx.onSettingsChange();
      stack = ['menu'];
      build();
    });
  }

  function renderAbout() {
    const times = timesFor(new Date());
    root.innerHTML = `
      ${backButton()}
      <h2 class="section-title" style="margin-top:0;">${esc(t('about.title'))}</h2>
      <div class="card">
        <p class="meaning" style="margin:0 0 12px;">${esc(t('about.body'))}</p>
        <p class="meaning" style="margin:0 0 12px;color:var(--text-muted);">${esc(t('about.privacy'))}</p>
        <div class="notice">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 6 7.5 11.5h-15L12 8Z"/></svg>
          <span>${esc(t('about.verify'))}</span>
        </div>
      </div>
      <div class="card">
        <div class="row-between"><span>${esc(t('about.build'))}</span><code style="font-size:12px;">1.1.0</code></div>
        <div class="row-between"><span>${esc(t('times.method'))}</span><span style="font-size:13px;">${esc(times.meta.methodName)}</span></div>
        <div class="row-between"><span>${esc(t('about.privacyLink'))}</span><a href="./privacy.html" style="font-size:13px;color:var(--accent,inherit);">privacy.html ↗</a></div>
        <div class="row-between"><span>${esc(t('about.source'))}</span><span style="font-size:13px;">Qur'an · Bukhari · Muslim</span></div>
      </div>
      <p class="muted-text" style="margin-top:14px;">${esc(t('about.disclaimer'))}</p>
    `;
    wireBack();
  }

  build();

  return {
    root,
    refresh: build,
    tick: () => {},
    cleanup() {
      tasbihInstance?.cleanup?.();
    },
  };
}
