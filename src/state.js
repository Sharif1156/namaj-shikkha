/**
 * state.js — application settings, persisted and observable.
 */

import * as storage from './core/storage.js';
import { detectLocale } from './core/i18n.js';
import { findCity, cityTimezone, currentTimezone, zoneOffset, CITIES } from './core/location.js';
import { METHODS, MADHABS, HIGH_LATITUDE_RULES } from './core/prayer-times.js';

/**
 * Defaults chosen for the primary audience (Bangladesh). Karachi (18°/18°)
 * and the Hanafi Asr (shadow ×2) are what is most commonly followed there;
 * they are only a starting point and are fully configurable in Settings.
 */
export const DEFAULTS = Object.freeze({
  locale: null, // null = follow the browser
  theme: 'auto',
  hour12: false,
  haptics: true,
  method: 'Karachi',
  madhab: 'hanafi',
  dhuhrMinutes: 1, // small safety margin after solar noon (zawal)
  highLat: 'nightMiddle',
  cityId: 'dhaka',
  coords: null, // { latitude, longitude, label } — overrides cityId
  adjustments: {},
  vehicle: undefined,
});

let state = { ...DEFAULTS };
const listeners = new Set();

/**
 * Drop invalid saved values instead of letting them break boot: a tampered
 * or legacy localStorage entry (unknown method, non-finite coordinates)
 * used to make computePrayerTimes throw inside Home's create(), leaving
 * #view blank. Unknown keys are dropped; valid keys are kept.
 */
function cleanPatch(patch) {
  if (!patch || typeof patch !== 'object') return {};
  const out = {};
  if ('locale' in patch && (patch.locale === null || patch.locale === 'en' || patch.locale === 'bn')) {
    out.locale = patch.locale;
  }
  if ('theme' in patch && ['auto', 'light', 'dark'].includes(patch.theme)) out.theme = patch.theme;
  if ('hour12' in patch && typeof patch.hour12 === 'boolean') out.hour12 = patch.hour12;
  if ('haptics' in patch && typeof patch.haptics === 'boolean') out.haptics = patch.haptics;
  if ('method' in patch && patch.method in METHODS) out.method = patch.method;
  if ('madhab' in patch && patch.madhab in MADHABS) out.madhab = patch.madhab;
  if ('highLat' in patch && patch.highLat in HIGH_LATITUDE_RULES) out.highLat = patch.highLat;
  if ('dhuhrMinutes' in patch && Number.isFinite(patch.dhuhrMinutes)) {
    out.dhuhrMinutes = Math.max(0, Math.min(30, patch.dhuhrMinutes));
  }
  if ('cityId' in patch && CITIES.some((c) => c.id === patch.cityId)) out.cityId = patch.cityId;
  if ('coords' in patch) {
    const c = patch.coords;
    out.coords =
      c &&
      typeof c === 'object' &&
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude)
        ? c
        : null;
  }
  if ('adjustments' in patch && patch.adjustments && typeof patch.adjustments === 'object') {
    out.adjustments = patch.adjustments;
  }
  return out;
}

export function load() {
  const saved = storage.get('settings', {});
  state = { ...DEFAULTS, ...cleanPatch(saved) };
  return state;
}

export function get() {
  return state;
}

export function set(patch) {
  state = { ...state, ...cleanPatch(patch) };
  storage.set('settings', state);
  for (const fn of listeners) fn(state);
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetAll() {
  storage.clearAll();
  state = { ...DEFAULTS };
}

/** Effective locale, honouring the explicit setting. */
export function effectiveLocale() {
  return state.locale ?? detectLocale();
}

/**
 * The active location: GPS coordinates when set, otherwise the chosen city.
 * @returns {{latitude:number, longitude:number, label:string, labelBn:string, timezone:number}}
 */
export function activeLocation(date = new Date()) {
  if (state.coords && Number.isFinite(state.coords.latitude)) {
    return {
      latitude: state.coords.latitude,
      longitude: state.coords.longitude,
      label: state.coords.label || 'My location',
      labelBn: state.coords.labelBn || 'আমার অবস্থান',
      // Recomputed for the requested date so a DST change never leaves a
      // stale offset behind.
      timezone: zoneOffset(state.coords.zone, date) ?? currentTimezone(date),
      isGps: true,
    };
  }
  const city = findCity(state.cityId) ?? findCity('dhaka');
  return {
    latitude: city.latitude,
    longitude: city.longitude,
    label: city.en,
    labelBn: city.bn,
    timezone: cityTimezone(city, date),
    isGps: false,
  };
}

/** Display name for a location in the current locale. */
export function locationLabel(loc, locale) {
  return locale === 'bn' ? loc.labelBn : loc.label;
}
