/**
 * prayer-times.js — astronomical prayer time calculation.
 *
 * Implements the standard solar-position algorithm (as popularised by
 * PrayTimes.org, itself based on "Astronomical Algorithms" by Jean Meeus).
 * Everything is computed locally: no network, no API key, works offline.
 *
 * Accuracy note: the sun-position series used here is accurate to roughly
 * 10-30 seconds of arc over 1900-2100, which yields prayer times typically
 * within a minute of authoritative sources. Minute-level rounding is applied
 * at the end. Differences of 1-2 minutes versus your local mosque are normal
 * and expected; mosques apply their own safety margins.
 */

const DEG = Math.PI / 180;

const dsin = (d) => Math.sin(d * DEG);
const dcos = (d) => Math.cos(d * DEG);
const dtan = (d) => Math.tan(d * DEG);
const darcsin = (x) => Math.asin(x) / DEG;
const darccos = (x) => Math.acos(x) / DEG;
const darctan2 = (y, x) => Math.atan2(y, x) / DEG;
const darccot = (x) => Math.atan(1 / x) / DEG;

/** Reduce `a` into [0, b). */
function fix(a, b) {
  const r = a - b * Math.floor(a / b);
  return r < 0 ? r + b : r;
}
const fixAngle = (a) => fix(a, 360);
/** Reduce `a` into [0, 24). */
const fixHour = (a) => fix(a, 24);

/* ------------------------------------------------------------------ *
 * Calculation methods
 *
 * fajr / isha are either an angle below the horizon (degrees) or an
 * object {minutes: N} meaning "N minutes after maghrib" (Umm al-Qura).
 * ------------------------------------------------------------------ */
export const METHODS = {
  MWL: {
    name: 'Muslim World League',
    fajr: 18,
    isha: 17,
  },
  ISNA: {
    name: 'Islamic Society of North America',
    fajr: 15,
    isha: 15,
  },
  Egypt: {
    name: 'Egyptian General Authority of Survey',
    fajr: 19.5,
    isha: 17.5,
  },
  Makkah: {
    name: 'Umm al-Qura University, Makkah',
    fajr: 18.5,
    isha: { minutes: 90 },
  },
  Karachi: {
    name: 'University of Islamic Sciences, Karachi',
    fajr: 18,
    isha: 18,
  },
  Tehran: {
    name: 'Institute of Geophysics, University of Tehran',
    fajr: 17.7,
    isha: 14,
    maghrib: 4.5,
  },
  Jafari: {
    name: 'Shia Ithna-Ashari, Leva Institute, Qum',
    fajr: 16,
    isha: 14,
    maghrib: 4,
  },
  Gulf: {
    name: 'Gulf Region',
    fajr: 19.5,
    isha: { minutes: 90 },
  },
  Kuwait: {
    name: 'Kuwait',
    fajr: 18,
    isha: 17.5,
  },
  Qatar: {
    name: 'Qatar',
    fajr: 18,
    isha: { minutes: 90 },
  },
  Singapore: {
    name: 'Majlis Ugama Islam Singapura',
    fajr: 20,
    isha: 18,
  },
  Turkey: {
    name: 'Diyanet İşleri Başkanlığı',
    fajr: 18,
    isha: 17,
  },
  France: {
    name: 'Union des Organisations Islamiques de France',
    fajr: 12,
    isha: 12,
  },
  Russia: {
    name: 'Spiritual Administration of Muslims of Russia',
    fajr: 16,
    isha: 15,
  },
  Moonsighting: {
    name: 'Moonsighting Committee',
    fajr: 18,
    isha: 18,
  },
};

export const DEFAULT_METHOD = 'MWL';

/** High-latitude adjustment rules for when the sun never reaches the angle. */
export const HIGH_LATITUDE_RULES = {
  nightMiddle: 'Middle of the night',
  angleBased: 'Angle-based (1/60th)',
  oneSeventh: 'One seventh of the night',
  none: 'None (may return — for Fajr/Isha)',
};

export const MADHABS = {
  shafi: 'Shafi, Maliki, Hanbali (shadow ×1)',
  hanafi: 'Hanafi (shadow ×2)',
};

/* ------------------------------------------------------------------ *
 * Julian day
 * ------------------------------------------------------------------ */

/**
 * Julian Day Number at 00:00 UT for a Gregorian calendar date.
 * Valid for the Gregorian calendar (post-1582).
 */
export function julianDate(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
}

/* ------------------------------------------------------------------ *
 * Solar position
 * ------------------------------------------------------------------ */

/**
 * Declination of the sun and the equation of time for a Julian Day.
 * @returns {{declination: number, equation: number}} degrees, and minutes-as-hours
 */
export function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D); // mean anomaly
  const q = fixAngle(280.459 + 0.98564736 * D); // mean longitude
  const L = fixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g)); // ecliptic longitude
  const e = 23.439 - 0.00000036 * D; // obliquity of the ecliptic
  const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15; // right ascension, hours
  const equation = q / 15 - fixHour(RA); // equation of time, hours
  const declination = darcsin(dsin(e) * dsin(L));
  return { declination, equation };
}

/** Local solar noon, in hours. */
function midDay(jd) {
  return fixHour(12 - sunPosition(jd).equation);
}

/* ------------------------------------------------------------------ *
 * Angle / hour-angle helpers
 * ------------------------------------------------------------------ */

/**
 * The time at which the sun sits `angle` degrees below the horizon.
 * `direction` = 'cw' for evening (after noon), 'ccw' for morning.
 * Returns NaN when the sun never reaches that angle (high latitudes).
 */
function sunAngleTime(jd, angle, direction, latitude) {
  const { declination } = sunPosition(jd);
  const noon = midDay(jd);
  const cosH =
    (-dsin(angle) - dsin(declination) * dsin(latitude)) /
    (dcos(declination) * dcos(latitude));
  if (cosH > 1 || cosH < -1) return NaN; // no solution at this latitude/date
  const t = darccos(cosH) / 15;
  return noon + (direction === 'ccw' ? -t : t);
}

/** Asr: shadow length equals `factor` × object height plus the noon shadow. */
function asrTime(jd, factor, latitude) {
  const { declination } = sunPosition(jd);
  const angle = -darccot(factor + dtan(Math.abs(latitude - declination)));
  return sunAngleTime(jd, angle, 'cw', latitude);
}

/** Apparent horizon, corrected for observer elevation. */
function riseSetAngle(elevation = 0) {
  return 0.833 + 0.0347 * Math.sqrt(Math.max(0, elevation));
}

/** Shortest distance between two times-of-day, accounting for midnight wrap. */
function timeDiff(t1, t2) {
  return fixHour(t2 - t1);
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

/**
 * Compute prayer times for a single day.
 *
 * @param {object} opts
 * @param {Date|{year:number,month:number,day:number}} opts.date  local calendar date
 * @param {number} opts.latitude   degrees, north positive
 * @param {number} opts.longitude  degrees, east positive
 * @param {number} opts.timezone   offset from UTC in hours (e.g. Bangladesh = 6)
 * @param {string} [opts.method='MWL']            key of METHODS
 * @param {'shafi'|'hanafi'} [opts.madhab='shafi']
 * @param {string} [opts.highLatitudeRule='nightMiddle']
 * @param {number} [opts.elevation=0]             metres above sea level
 * @param {object} [opts.adjustments]             per-prayer minute tweaks
 * @param {number} [opts.imsakMinutes=10]         minutes before Fajr
 * @param {number} [opts.dhuhrMinutes=0]          minutes added to Dhuhr
 * @returns {object} times as decimal hours in local time
 */
export function computePrayerTimes(opts) {
  const {
    date,
    latitude,
    longitude,
    timezone,
    method = DEFAULT_METHOD,
    madhab = 'shafi',
    highLatitudeRule = 'nightMiddle',
    elevation = 0,
    adjustments = {},
    imsakMinutes = 10,
    dhuhrMinutes = 0,
  } = opts;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('latitude and longitude must be finite numbers');
  }
  if (Math.abs(latitude) > 90) throw new RangeError('latitude out of range');
  if (!Number.isFinite(timezone)) throw new TypeError('timezone must be a finite number');

  const params = METHODS[method];
  if (!params) throw new RangeError(`unknown calculation method: ${method}`);

  const { year, month, day } = normaliseDate(date);
  const jd = julianDate(year, month, day);

  const fajrAngle = params.fajr;
  const ishaSpec = params.isha;
  const maghribAngle = params.maghrib ?? riseSetAngle(elevation);
  const riseAngle = riseSetAngle(elevation);
  const asrFactor = madhab === 'hanafi' ? 2 : 1;

  // First pass: rough day-portions used to evaluate the sun's position.
  const t = {
    fajr: sunAngleTime(jd + 5 / 24, fajrAngle, 'ccw', latitude),
    sunrise: sunAngleTime(jd + 6 / 24, riseAngle, 'ccw', latitude),
    dhuhr: midDay(jd + 12 / 24),
    asr: asrTime(jd + 13 / 24, asrFactor, latitude),
    sunset: sunAngleTime(jd + 18 / 24, riseAngle, 'cw', latitude),
    maghrib: sunAngleTime(jd + 18 / 24, maghribAngle, 'cw', latitude),
    isha:
      typeof ishaSpec === 'number'
        ? sunAngleTime(jd + 18 / 24, ishaSpec, 'cw', latitude)
        : NaN,
  };

  // Shift from solar time to local clock time.
  const tz = timezone - longitude / 15;
  for (const k of Object.keys(t)) {
    if (Number.isFinite(t[k])) t[k] += tz;
  }

  // Isha as a fixed interval after Maghrib (Umm al-Qura & friends).
  if (typeof ishaSpec === 'object' && ishaSpec && Number.isFinite(t.maghrib)) {
    t.isha = t.maghrib + ishaSpec.minutes / 60;
  }

  // High-latitude safety net for Fajr and Isha.
  const night = timeDiff(t.sunset, t.sunrise);
  if (highLatitudeRule !== 'none' && Number.isFinite(night)) {
    t.fajr = adjustHighLat(t.fajr, t.sunrise, fajrAngle, night, 'ccw', highLatitudeRule);
    if (typeof ishaSpec === 'number') {
      t.isha = adjustHighLat(t.isha, t.sunset, ishaSpec, night, 'cw', highLatitudeRule);
    }
    if (Number.isFinite(t.maghrib) && params.maghrib) {
      if (timeDiff(t.maghrib, t.sunset) > nightPart(maghribAngle, night, highLatitudeRule)) {
        // only meaningful for methods that use a maghrib angle
      }
    }
  }

  // Fixed offsets applied last.
  if (Number.isFinite(t.dhuhr)) t.dhuhr += dhuhrMinutes / 60;
  const imsak = Number.isFinite(t.fajr) ? t.fajr - imsakMinutes / 60 : NaN;

  // Midnight and the last third of the night (for Tahajjud).
  let midnight = NaN;
  let lastThird = NaN;
  if (Number.isFinite(t.sunset) && Number.isFinite(night)) {
    midnight = fixHour(t.sunset + night / 2);
    lastThird = fixHour(t.sunset + (night * 2) / 3);
  }

  const computed = {
    imsak,
    fajr: t.fajr,
    sunrise: t.sunrise,
    dhuhr: t.dhuhr,
    asr: t.asr,
    sunset: t.sunset,
    maghrib: t.maghrib,
    isha: t.isha,
    midnight,
    lastThird,
  };

  // Apply user tuning, then round to the minute.
  const out = {};
  for (const [k, v] of Object.entries(computed)) {
    const adj = Number(adjustments[k]) || 0;
    out[k] = Number.isFinite(v) ? roundMinutes(fixHour(v + adj / 60)) : null;
  }

  return {
    ...out,
    meta: {
      date: { year, month, day },
      latitude,
      longitude,
      timezone,
      method,
      methodName: params.name,
      madhab,
      highLatitudeRule,
    },
  };
}

function nightPart(angle, night, rule) {
  switch (rule) {
    case 'angleBased':
      return (angle / 60) * night;
    case 'oneSeventh':
      return night / 7;
    case 'none':
      return 0;
    case 'nightMiddle':
    default:
      return night / 2;
  }
}

function adjustHighLat(time, base, angle, night, direction, rule) {
  if (rule === 'none') return time;
  const portion = nightPart(angle, night, rule);
  const diff = direction === 'ccw' ? timeDiff(time, base) : timeDiff(base, time);
  if (!Number.isFinite(time) || diff > portion) {
    return base + (direction === 'ccw' ? -portion : portion);
  }
  return time;
}

/** Round a decimal-hours value to the nearest whole minute, wrapping at 24h. */
export function roundMinutes(hours) {
  if (!Number.isFinite(hours)) return null;
  return fixHour(Math.round(hours * 60) / 60);
}

function normaliseDate(date) {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) throw new RangeError('invalid Date');
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  }
  if (date && typeof date === 'object') {
    const { year, month, day } = date;
    if (![year, month, day].every(Number.isFinite)) {
      throw new TypeError('date object needs numeric year, month and day');
    }
    return { year, month, day };
  }
  throw new TypeError('date must be a Date or {year, month, day}');
}

/* ------------------------------------------------------------------ *
 * Formatting & navigation helpers
 * ------------------------------------------------------------------ */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Replace ASCII digits with Bengali numerals when locale is Bengali. */
function localiseDigits(str, locale) {
  if (locale !== 'bn') return str;
  return String(str).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Convert decimal hours to "HH:MM" (24h) or "h:MM AM/PM". */
export function formatHours(hours, { hour12 = false, locale = 'en' } = {}) {
  if (!Number.isFinite(hours)) return '—';
  const total = Math.round(fixHour(hours) * 60);
  let h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const mm = String(m).padStart(2, '0');

  if (!hour12) {
    return localiseDigits(`${String(h).padStart(2, '0')}:${mm}`, locale);
  }

  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${localiseDigits(`${h}:${mm}`, locale)} ${suffix}`;
}

/**
 * Forward time difference in hours, wrapping at midnight: how long after
 * `from` the time `to` occurs. Essential at high latitudes, where prayer
 * times legitimately cross midnight (e.g. Isha at 00:19 in Oslo in June),
 * making plain numeric comparison wrong.
 */
export function hoursAfter(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return NaN;
  return fixHour(to - from);
}

/** The five obligatory prayers in chronological order. */
export const OBLIGATORY = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS = {
  imsak: { en: 'Imsak', bn: 'ইমসাক' },
  fajr: { en: 'Fajr', bn: 'ফজর' },
  sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়' },
  dhuhr: { en: 'Dhuhr', bn: 'যোহর' },
  asr: { en: 'Asr', bn: 'আসর' },
  sunset: { en: 'Sunset', bn: 'সূর্যাস্ত' },
  maghrib: { en: 'Maghrib', bn: 'মাগরিব' },
  isha: { en: 'Isha', bn: 'ইশা' },
  midnight: { en: 'Midnight', bn: 'মধ্যরাত' },
  lastThird: { en: 'Last third', bn: 'শেষ তৃতীয়াংশ' },
};

/**
 * Find the next upcoming prayer after `nowHours` (decimal local hours).
 * Returns null-safe results for polar edge cases.
 */
export function nextPrayer(times, nowHours) {
  for (const key of OBLIGATORY) {
    const t = times[key];
    if (Number.isFinite(t) && t > nowHours) {
      return { key, hours: t, inHours: t - nowHours, tomorrow: false };
    }
  }
  const fajr = times.fajr;
  if (Number.isFinite(fajr)) {
    return { key: 'fajr', hours: fajr, inHours: 24 - nowHours + fajr, tomorrow: true };
  }
  return null;
}

/** Current prayer (the most recent one that has begun). */
export function currentPrayer(times, nowHours) {
  let current = null;
  for (const key of OBLIGATORY) {
    const t = times[key];
    if (Number.isFinite(t) && t <= nowHours) current = { key, hours: t };
  }
  return current ?? (Number.isFinite(times.isha) ? { key: 'isha', hours: times.isha } : null);
}
