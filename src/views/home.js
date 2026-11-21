/**
 * home.js — next prayer, countdown, and the day's timetable.
 */

import { formatHours, nextPrayer, hoursAfter, PRAYER_LABELS, OBLIGATORY } from '../core/prayer-times.js';
import { timesFor, nowHours, dateKey } from '../services.js';
import { activeLocation, locationLabel, get } from '../state.js';
import { el, countdown, digits, esc, toast } from '../ui/dom.js';
import { t, monthName } from '../core/i18n.js';
import { requestPosition, cityTimezone, CITIES } from '../core/location.js';
import * as state from '../state.js';

const ICONS = {
  fajr: '<path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c-1.2.8-2.6 1.2-4 1.2A7.2 7.2 0 0 1 12 3Z"/>',
  sunrise: '<path fill="currentColor" d="M4 18h16v2H4v-2Zm8-14 4 4h-2.5v5h-3V8H8l4-4Zm-8 8h3.5v2H4v-2Zm12.5 0H20v2h-3.5v-2Z"/>',
  dhuhr: '<path fill="currentColor" d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0-5 1.6 3.4h-3.2L12 2Zm0 20-1.6-3.4h3.2L12 22ZM2 12l3.4-1.6v3.2L2 12Zm20 0-3.4 1.6v-3.2L22 12Z"/>',
  asr: '<path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-9 4h2.5v1.5H3V12Zm15.5 0H21v1.5h-2.5V12ZM11 2h2v3h-2V2Zm0 17h2v3h-2v-3ZM4 20h16v1.6H4V20Z"/>',
  maghrib: '<path fill="currentColor" d="M4 20h16v2H4v-2Zm8-16a7 7 0 0 1 7 7c0 1-.2 2-.6 2.8H5.6A7 7 0 0 1 12 4Zm-8 8h2.2v1.8H4V12Zm13.8 0H20v1.8h-2.2V12Z"/>',
  isha: '<path fill="currentColor" d="M12 3a8 8 0 1 0 8 8c-1.1.7-2.4 1.1-3.7 1.1A6.4 6.4 0 0 1 12 3Zm5 13 .8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-.9-1.7.9.4-1.9-1.4-1.3 1.9-.2L17 16Z"/>',
  offset: '<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.6l4 2.4-1 1.6-5-3V7h2Z"/>',
};

function icon(kind, cls = 'prayer-row__icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind] ?? ICONS.dhuhr}</svg>`;
}

export function create(ctx) {
  const root = el('<div class="home"></div>');
  let currentKey = null;
  let times = null;
  let dayTimes = null;
  let day;

  function refresh() {
    const now = new Date();
    const key = dateKey(now);
    const settings = get();
    if (key !== currentKey) {
      currentKey = key;
      day = now;
      times = timesFor(now, settings);
      build();
    } else {
      times = timesFor(now, settings);
    }
    tick(new Date());
  }

  function build() {
    const settings = get();
    const loc = activeLocation();
    const now = new Date();
    const locale = ctx.locale();
    const hijri = ctx.hijri();
    const locName = locationLabel(loc, locale);

    const dateLabel = `${monthName(now.getMonth(), locale)} ${digits(now.getDate(), locale)}, ${digits(now.getFullYear(), locale)}`;
    const hijriLabel = `${hijri.day} ${locale === 'bn' ? ctx.hijriMonthBn(hijri.month - 1) : hijri.monthName} ${hijri.year}`;

    root.innerHTML = `
      <section class="hero" aria-live="polite">
        <div class="hero__top">
          <div>
            <p class="hero__label" data-hero="label">${esc(t('home.next'))}</p>
            <h2 class="hero__name" data-hero="name">—</h2>
            <p class="hero__time" data-hero="time">—</p>
          </div>
          <div class="hero__countdown">
            <span class="hero__count-num" data-hero="count">—</span>
            <span class="hero__count-label" data-hero="countlabel">${esc(t('home.remaining'))}</span>
          </div>
        </div>
        <div class="hero__progress" role="presentation"><span data-hero="bar" style="width:0%"></span></div>
      </section>

      <div class="row-between" style="margin-top:16px;padding:0 4px;">
        <div>
          <div style="font-size:13px;font-weight:600;">${esc(locName)}</div>
          <div class="muted-text" style="font-size:12px;">${esc(dateLabel)} · ${esc(digits(hijriLabel, locale))} ${esc(t('common.hijri'))}</div>
        </div>
        <button class="btn btn--ghost" type="button" data-action="locate" style="padding:7px 13px;font-size:13px;">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 3h-2.1a7 7 0 0 0-5.9-5.9V3h-2v2.1A7 7 0 0 0 5.1 11H3v2h2.1a7 7 0 0 0 5.9 5.9V21h2v-2.1a7 7 0 0 0 5.9-5.9H21v-2Z"/></svg>
          ${esc(t('home.useLocation'))}
        </button>
      </div>

      <h3 class="section-title">${esc(t('home.today'))}</h3>
      <ul class="prayer-list" data-list></ul>

      <div class="notice" style="margin-top:16px;">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 6 7.5 11.5h-15L12 8Zm-1 3v4h2v-4h-2Zm0 5v2h2v-2h-2Z"/></svg>
        <span>${esc(t('about.verify'))}</span>
      </div>
    `;

    renderList();
    tick(new Date());

    root.querySelector('[data-action="locate"]')?.addEventListener('click', onLocate);
  }

  async function onLocate() {
    const btn = root.querySelector('[data-action="locate"]');
    const original = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('home.locating');
    }
    try {
      const pos = await requestPosition();
      // Pick the nearest known city for a friendly label and a DST-aware zone.
      let label = t('home.location');
      let tz = -new Date().getTimezoneOffset() / 60;
      const near = CITIES.map((c) => ({
        c,
        d: Math.abs(c.latitude - pos.latitude) + Math.abs(c.longitude - pos.longitude),
      })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 1.5) tz = cityTimezone(near.c);
      state.set({
        coords: { latitude: pos.latitude, longitude: pos.longitude, label, timezone: tz },
      });
      toast(t('home.location'));
      ctx.rerender();
    } catch {
      toast(t('home.locationDenied'));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
  }

  function renderList() {
    const list = root.querySelector('[data-list]');
    if (!list) return;
    const locale = ctx.locale();
    const now = nowHours(new Date());
    const next = nextPrayer(times, now);

    const keys = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    list.innerHTML = keys
      .map((key) => {
        const value = times[key];
        const label = PRAYER_LABELS[key];
        const isNext = next?.key === key && !next.tomorrow;
        const isSecondary = key === 'sunrise' || key === 'imsak';
        const obligatory = OBLIGATORY.includes(key);
        // "current" = the obligatory prayer whose window we are inside
        let isCurrent = false;
        if (obligatory) {
          const prevObligatory = OBLIGATORY.filter((k) => times[k] <= now).pop();
          isCurrent = prevObligatory === key;
        }
        const cls = [
          'prayer-row',
          isCurrent ? 'is-current' : '',
          isNext ? 'is-next' : '',
          isSecondary ? 'is-secondary' : '',
        ].filter(Boolean).join(' ');
        return `
          <li class="${cls}">
            ${icon(key)}
            <span class="prayer-row__name">${esc(locale === 'bn' ? label.bn : label.en)}
              ${isCurrent ? `<small>${esc(t('home.now'))}</small>` : ''}
            </span>
            <span class="prayer-row__time">${esc(ctx.fmt(value))}</span>
          </li>`;
      })
      .join('');
  }

  function tick(now) {
    if (!times) return;
    const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const next = nextPrayer(times, nowH);
    if (!next) return;

    const labels = PRAYER_LABELS[next.key];
    const locale = ctx.locale();
    const nameEl = root.querySelector('[data-hero="name"]');
    if (!nameEl) return;

    nameEl.textContent = locale === 'bn' ? labels.bn : labels.en;
    root.querySelector('[data-hero="time"]').textContent =
      `${ctx.fmt(next.hours)}${next.tomorrow ? ` · ${t('home.tomorrow')}` : ''}`;

    const msLeft = next.inHours * 3600 * 1000;
    root.querySelector('[data-hero="count"]').textContent = countdown(msLeft);

    // Progress across the current interval.
    const prevKey = OBLIGATORY.filter((k) => Number.isFinite(times[k]) && times[k] <= nowH).pop();
    const prevHours = prevKey ? times[prevKey] : (times.isha ?? 0) - 24;
    const span = hoursAfter(prevHours, next.hours) || 1;
    const elapsed = hoursAfter(prevHours, nowH);
    const pct = Math.max(0, Math.min(100, (elapsed / span) * 100));
    const bar = root.querySelector('[data-hero="bar"]');
    if (bar) bar.style.width = `${pct}%`;

    // Refresh the highlighted rows once a minute.
    if (!tick._lastListMinute || tick._lastListMinute !== now.getMinutes()) {
      tick._lastListMinute = now.getMinutes();
      renderList();
    }
  }

  // Render immediately; without this the view stays blank until the first tick.
  refresh();

  return { root, refresh, tick };
}
