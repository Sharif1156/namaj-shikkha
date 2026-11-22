import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

import * as state from '../src/state.js';
import { zoneOffset, cityTimezone, findCity, cityZone } from '../src/core/location.js';
import { turnDirection } from '../src/core/qibla.js';
import { computePrayerTimes, METHODS, formatHours, nextPrayer } from '../src/core/prayer-times.js';
import * as storage from '../src/core/storage.js';
import { fromHijri } from '../src/core/hijri.js';
import { countdown } from '../src/ui/dom.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('defaults for the Bangladesh audience', () => {
  it('uses the Hanafi Asr by default', () => {
    expect(state.DEFAULTS.madhab).toBe('hanafi');
  });
  it('adds a 1-minute Dhuhr safety margin by default', () => {
    expect(state.DEFAULTS.dhuhrMinutes).toBe(1);
  });
});

describe('zoneOffset — DST-aware offsets', () => {
  const summer = new Date(Date.UTC(2026, 6, 1, 12));
  const winter = new Date(Date.UTC(2026, 0, 15, 12));

  it('handles fixed zones, including half-hour offsets', () => {
    expect(zoneOffset('Asia/Dhaka', summer)).toBe(6);
    expect(zoneOffset('Asia/Kolkata', winter)).toBe(5.5);
  });
  it('follows daylight saving', () => {
    expect(zoneOffset('Europe/London', summer)).toBe(1);
    expect(zoneOffset('Europe/London', winter)).toBe(0);
    expect(zoneOffset('America/New_York', summer)).toBe(-4);
    expect(zoneOffset('America/New_York', winter)).toBe(-5);
  });
  it('returns null for missing or invalid zones', () => {
    expect(zoneOffset(null)).toBeNull();
    expect(zoneOffset('Not/AZone')).toBeNull();
  });
  it('cityTimezone applies DST for built-in cities', () => {
    const london = findCity('london');
    expect(cityZone(london)).toBe('Europe/London');
    expect(cityTimezone(london, summer)).toBe(1);
    expect(cityTimezone(london, winter)).toBe(0);
  });
});

describe('GPS location timezone is recomputed per date', () => {
  it('does not freeze a stale offset across a DST change', () => {
    state.set({ coords: { latitude: 51.5, longitude: -0.13, zone: 'Europe/London' } });
    expect(state.activeLocation(new Date(Date.UTC(2026, 6, 1, 12))).timezone).toBe(1);
    expect(state.activeLocation(new Date(Date.UTC(2026, 0, 15, 12))).timezone).toBe(0);
    state.set({ coords: null });
  });
});

describe('turnDirection', () => {
  it('turns the short way round across north', () => {
    expect(turnDirection(350, 10)).toBe('right');
    expect(turnDirection(10, 350)).toBe('left');
  });
  it('reports aligned within tolerance', () => {
    expect(turnDirection(275, 277.6)).toBe('aligned');
  });
  it('turns right/left outside tolerance', () => {
    expect(turnDirection(100, 277)).not.toBe('aligned');
    expect(turnDirection(270, 280)).toBe('right');
    expect(turnDirection(290, 280)).toBe('left');
  });
});

describe('Umm al-Qura Isha in Ramadan', () => {
  const make = (date) =>
    computePrayerTimes({ date, latitude: 21.4225, longitude: 39.8262, timezone: 3, method: 'Makkah' });

  it('is 90 minutes after Maghrib outside Ramadan', () => {
    const t = make(fromHijri(1448, 2, 10));
    expect((t.isha - t.maghrib) * 60).toBeCloseTo(90, 0);
  });
  it('is 120 minutes after Maghrib during Ramadan', () => {
    const t = make(fromHijri(1448, 9, 10));
    expect((t.isha - t.maghrib) * 60).toBeCloseTo(120, 0);
  });
});

describe('method labels are honest', () => {
  it('flags Moonsighting as an approximation', () => {
    expect(METHODS.Moonsighting.name.toLowerCase()).toContain('approx');
  });
});

describe('countdown localisation', () => {
  it('keeps the English format', () => {
    expect(countdown(5280000)).toBe('1h 28m');
    expect(countdown(249000)).toBe('4m 09s');
  });
  it('renders Bengali words and digits', () => {
    expect(countdown(5280000, 'bn')).toBe('১ ঘণ্টা ২৮ মি');
    expect(countdown(249000, 'bn')).toBe('৪ মি ০৯ সে');
  });
});

describe('Bengali 12-hour clock', () => {
  it('localises the AM/PM suffix too', () => {
    expect(formatHours(13.5, { hour12: true, locale: 'bn' })).toBe('১:৩০ পিএম');
    expect(formatHours(4.5, { hour12: true, locale: 'bn' })).toBe('৪:৩০ এএম');
    expect(formatHours(13.5, { hour12: true, locale: 'en' })).toBe('1:30 PM');
  });
});

describe('nextPrayer at the exact minute', () => {
  it('still reports the prayer starting now as next', () => {
    const times = { fajr: 4.983, sunrise: 6.3, dhuhr: 11.77, asr: 15.58, maghrib: 17.18, isha: 18.5 };
    expect(nextPrayer(times, 4.983).key).toBe('fajr');
  });
});

describe('persisted settings are validated on load', () => {
  it('drops an unknown method, madhab and non-finite coords instead of breaking boot', () => {
    storage.set('settings', {
      method: 'NOPE',
      madhab: 'x',
      theme: 'neon',
      coords: { latitude: NaN, longitude: 90 },
      cityId: 'nowhere',
    });
    state.load();
    expect(state.get().method).toBe(state.DEFAULTS.method);
    expect(state.get().madhab).toBe(state.DEFAULTS.madhab);
    expect(state.get().theme).toBe(state.DEFAULTS.theme);
    expect(state.get().coords).toBeNull();
    expect(state.get().cityId).toBe(state.DEFAULTS.cityId);
    state.resetAll();
    state.load();
  });
  it('ignores invalid values passed to set()', () => {
    state.set({ method: 'NOPE' });
    expect(state.get().method).toBe(state.DEFAULTS.method);
  });
});

describe('per-page colours', () => {
  const css = readFileSync(resolve(ROOT, 'src/styles/main.css'), 'utf8');

  it('gives 99 Names its own rose accent, not Salah gold', () => {
    expect(css).toContain('data-subpage="names"] { --accent: #be185d');
  });
  it('gives Ramadan its own sunset-orange accent, not Prayer green', () => {
    expect(css).toContain('data-subpage="ramadan"] { --accent: #c2410c');
  });
  it('gives Settings a stronger slate accent', () => {
    expect(css).toContain('data-subpage="settings"] { --accent: #334155');
  });
  it('paints the topbar and hero with the page accent, not dark green', () => {
    expect(css).toContain('background: var(--accent);');
    expect(css).toContain('linear-gradient(152deg, var(--accent)');
    expect(css).not.toContain('var(--emerald-700) 0%, var(--emerald-900)');
  });
  it('keeps the content area white with no dark theme', () => {
    expect(css).toContain('--bg: #ffffff;');
    expect(css).not.toContain('data-theme="dark"');
    expect(css).not.toContain('prefers-color-scheme');
  });
  it('defaults to the light theme', () => {
    expect(state.DEFAULTS.theme).toBe('light');
  });
});

describe('service worker version stamp', () => {
  it('is current (run `npm run stamp` after changing precached files)', () => {
    expect(() =>
      execFileSync(process.execPath, [resolve(ROOT, 'scripts/stamp-sw.mjs'), '--check'], { stdio: 'pipe' })
    ).not.toThrow();
  });
});
