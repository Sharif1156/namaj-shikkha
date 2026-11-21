/**
 * services.js — glue between persisted settings and the pure core modules.
 */

import { computePrayerTimes } from './core/prayer-times.js';
import { toHijri } from './core/hijri.js';
import { activeLocation, get } from './state.js';

/** Local calendar date key, e.g. "2026-11-21". */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Prayer times for a given date, using the current settings and location. */
export function timesFor(date = new Date(), settings = get()) {
  const loc = activeLocation(date);
  return computePrayerTimes({
    date,
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone,
    method: settings.method,
    madhab: settings.madhab,
    highLatitudeRule: settings.highLat,
    adjustments: settings.adjustments,
  });
}

/** Current local time as decimal hours. */
export function nowHours(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/** Hijri date for a Gregorian date. */
export function hijriFor(date = new Date()) {
  return toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
