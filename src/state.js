/**
 * state.js — application settings, persisted and observable.
 */

import * as storage from './core/storage.js';
import { detectLocale } from './core/i18n.js';
import { findCity, cityTimezone, currentTimezone } from './core/location.js';

/**
 * Defaults chosen for the primary audience (Bangladesh). Karachi (18°/18°)
 * is the method most commonly used there; it is only a starting point and is
 * fully configurable in Settings.
 */
export const DEFAULTS = Object.freeze({
  locale: null, // null = follow the browser
  theme: 'auto',
  hour12: false,
  haptics: true,
  method: 'Karachi',
  madhab: 'shafi',
  highLat: 'nightMiddle',
  cityId: 'dhaka',
  coords: null, // { latitude, longitude, label } — overrides cityId
  adjustments: {},
  vehicle: undefined,
});

let state = { ...DEFAULTS };
const listeners = new Set();

export function load() {
  const saved = storage.get('settings', {});
  state = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  return state;
}

export function get() {
  return state;
}

export function set(patch) {
  state = { ...state, ...patch };
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
      timezone: state.coords.timezone ?? currentTimezone(),
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
