import { describe, it, expect } from 'vitest';
import {
  computePrayerTimes,
  julianDate,
  sunPosition,
  formatHours,
  roundMinutes,
  nextPrayer,
  currentPrayer,
  hoursAfter,
  METHODS,
} from '../src/core/prayer-times.js';

const DHAKA = { latitude: 23.8103, longitude: 90.4125, timezone: 6 };
const d = (year, month, day) => ({ year, month, day });

const times = (o) => computePrayerTimes({ ...DHAKA, ...o });

/** Decimal hours → minutes since midnight, for readable assertions. */
const mins = (h) => Math.round(h * 60);

describe('julianDate', () => {
  it('matches the J2000.0 epoch', () => {
    // 2000-01-01 12:00 UT is JD 2451545.0; our function returns 00:00 UT.
    expect(julianDate(2000, 1, 1)).toBeCloseTo(2451544.5, 6);
  });

  it('advances by exactly one day', () => {
    const a = julianDate(2026, 3, 20);
    const b = julianDate(2026, 3, 21);
    expect(b - a).toBeCloseTo(1, 10);
  });
});

describe('sunPosition', () => {
  it('reaches the obliquity limit at the June solstice', () => {
    const { declination } = sunPosition(julianDate(2026, 6, 21));
    expect(declination).toBeGreaterThan(23.3);
    expect(declination).toBeLessThan(23.6);
  });

  it('reaches the negative limit at the December solstice', () => {
    const { declination } = sunPosition(julianDate(2026, 12, 21));
    expect(declination).toBeGreaterThan(-23.6);
    expect(declination).toBeLessThan(-23.3);
  });

  it('is near zero at the March equinox', () => {
    const { declination } = sunPosition(julianDate(2026, 3, 20));
    expect(Math.abs(declination)).toBeLessThan(1);
  });

  it('keeps the equation of time within its real bounds (about -14..+16 min)', () => {
    for (let month = 1; month <= 12; month++) {
      const { equation } = sunPosition(julianDate(2026, month, 15));
      expect(equation).toBeGreaterThan(-0.25);
      expect(equation).toBeLessThan(0.28);
    }
  });
});

describe('computePrayerTimes — physical invariants', () => {
  const t = times({ date: d(2026, 6, 21) });

  it('orders the day correctly', () => {
    expect(t.imsak).toBeLessThan(t.fajr);
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.sunrise).toBeLessThan(t.dhuhr);
    expect(t.dhuhr).toBeLessThan(t.asr);
    expect(t.asr).toBeLessThan(t.maghrib);
    expect(t.maghrib).toBeLessThan(t.isha);
  });

  it('places sunrise and sunset symmetrically about solar noon', () => {
    expect(t.sunrise + t.maghrib).toBeCloseTo(2 * t.dhuhr, 1);
  });

  it('has a night half equal to the sunset-to-sunrise span', () => {
    const night = ((t.sunrise - t.maghrib + 24) % 24);
    expect(night).toBeGreaterThan(9);
    expect(night).toBeLessThan(11);
  });

  it('keeps every time inside a single 24 hour day', () => {
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(t[k]).toBeGreaterThanOrEqual(0);
      expect(t[k]).toBeLessThan(24);
    }
  });
});

describe('computePrayerTimes — known Dhaka values', () => {
  it('reproduces Dhaka midsummer sunrise and sunset', () => {
    const t = times({ date: d(2026, 6, 21) });
    // Verified against published Dhaka timetables: ~05:12 and ~18:48.
    expect(mins(t.sunrise)).toBe(312);
    expect(mins(t.maghrib)).toBe(1128);
  });

  it('reproduces Dhaka midwinter sunrise and sunset', () => {
    const t = times({ date: d(2026, 12, 21) });
    expect(mins(t.sunrise)).toBe(396);
    expect(mins(t.maghrib)).toBe(1036);
  });

  it('gives a longer day in June than in December', () => {
    const jun = times({ date: d(2026, 6, 21) });
    const dec = times({ date: d(2026, 12, 21) });
    const dayLen = (x) => x.maghrib - x.sunrise;
    expect(dayLen(jun)).toBeGreaterThan(dayLen(dec) + 2);
  });

  it('puts solar noon close to 12:00 for a place near its standard meridian', () => {
    // Dhaka's meridian is 90°E; the equation of time nudges noon slightly.
    const t = times({ date: d(2026, 6, 21) });
    expect(Math.abs(t.dhuhr - 12)).toBeLessThan(0.35);
  });
});

describe('computePrayerTimes — equator and seasons', () => {
  it('has a ~12 hour day at the equator on the equinox', () => {
    const t = computePrayerTimes({
      latitude: 0,
      longitude: 0,
      timezone: 0,
      date: d(2026, 3, 20),
    });
    const dayLength = t.maghrib - t.sunrise;
    // Slightly over 12h because of atmospheric refraction and solar disc size.
    expect(dayLength).toBeGreaterThan(12);
    expect(dayLength).toBeLessThan(12.4);
  });

  it('has 12 hour days year-round at the equator', () => {
    for (const [m, day] of [[1, 15], [4, 15], [7, 15], [10, 15]]) {
      const t = computePrayerTimes({
        latitude: 0,
        longitude: 0,
        timezone: 0,
        date: d(2026, m, day),
      });
      const dayLength = t.maghrib - t.sunrise;
      expect(Math.abs(dayLength - 12)).toBeLessThan(0.3);
    }
  });
});

describe('computePrayerTimes — calculation methods', () => {
  it('gives an earlier Fajr for a larger depression angle', () => {
    const mwl = times({ date: d(2026, 6, 21), method: 'MWL' }); // fajr 18
    const isna = times({ date: d(2026, 6, 21), method: 'ISNA' }); // fajr 15
    expect(mwl.fajr).toBeLessThan(isna.fajr);
  });

  it('gives an earlier Isha for a larger depression angle', () => {
    const mwl = times({ date: d(2026, 6, 21), method: 'MWL' }); // isha 17
    const isna = times({ date: d(2026, 6, 21), method: 'ISNA' }); // isha 15
    expect(mwl.isha).toBeGreaterThan(isna.isha);
  });

  it('applies the Umm al-Qura 90 minute Isha interval', () => {
    const t = times({ date: d(2026, 6, 21), method: 'Makkah' });
    expect(mins(t.isha) - mins(t.maghrib)).toBe(90);
  });

  it('has every documented method produce a valid day', () => {
    for (const key of Object.keys(METHODS)) {
      const t = times({ date: d(2026, 6, 21), method: key, highLatitudeRule: 'nightMiddle' });
      for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
        expect(t[k], `${key}.${k}`).not.toBeNull();
      }
      expect(t.fajr).toBeLessThan(t.sunrise);
      expect(t.maghrib).toBeLessThan(t.isha);
    }
  });

  it('rejects an unknown method', () => {
    expect(() => times({ date: d(2026, 6, 21), method: 'NOPE' })).toThrow(/unknown calculation method/);
  });
});

describe('computePrayerTimes — madhab', () => {
  it('gives a later Asr for the Hanafi shadow factor', () => {
    const shafi = times({ date: d(2026, 6, 21), madhab: 'shafi' });
    const hanafi = times({ date: d(2026, 6, 21), madhab: 'hanafi' });
    expect(hanafi.asr).toBeGreaterThan(shafi.asr);
  });

  it('keeps the Hanafi Asr before Maghrib at mid latitudes', () => {
    const hanafi = times({ date: d(2026, 6, 21), madhab: 'hanafi' });
    expect(hanafi.asr).toBeLessThan(hanafi.maghrib);
  });
});

describe('computePrayerTimes — high latitudes', () => {
  it('returns finite times at extreme latitude with the nightMiddle rule', () => {
    const t = computePrayerTimes({
      latitude: 64.15, // Reykjavik area
      longitude: -21.94,
      timezone: 0,
      date: d(2026, 6, 21),
      highLatitudeRule: 'nightMiddle',
    });
    expect(t.fajr).not.toBeNull();
    expect(t.isha).not.toBeNull();
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.maghrib).toBeLessThan(t.isha);
  });

  it('keeps Fajr chronologically before sunrise under every high-latitude rule', () => {
    // At high latitudes Fajr/Isha legitimately cross midnight (Oslo in June
    // puts Fajr and Isha at 00:19), so ordering must be checked with modular
    // arithmetic rather than plain numeric comparison.
    for (const rule of ['nightMiddle', 'angleBased', 'oneSeventh']) {
      const t = computePrayerTimes({
        latitude: 59.9, // Oslo
        longitude: 10.75,
        timezone: 1,
        date: d(2026, 6, 21),
        highLatitudeRule: rule,
      });
      const toSunrise = hoursAfter(t.fajr, t.sunrise);
      expect(toSunrise, `${rule}: fajr→sunrise`).toBeGreaterThan(0);
      expect(toSunrise, `${rule}: fajr→sunrise`).toBeLessThan(12);

      const toIsha = hoursAfter(t.maghrib, t.isha);
      expect(toIsha, `${rule}: maghrib→isha`).toBeGreaterThan(0);
      expect(toIsha, `${rule}: maghrib→isha`).toBeLessThan(12);
    }
  });

  it('meets Fajr and Isha at midnight under the nightMiddle rule', () => {
    const t = computePrayerTimes({
      latitude: 59.9,
      longitude: 10.75,
      timezone: 1,
      date: d(2026, 6, 21),
      highLatitudeRule: 'nightMiddle',
    });
    // Both fall at the middle of the night, so they coincide.
    expect(t.fajr).toBeCloseTo(t.isha, 2);
  });
});

describe('computePrayerTimes — input validation', () => {
  it('rejects non-numeric coordinates', () => {
    expect(() => computePrayerTimes({ date: d(2026, 1, 1), latitude: NaN, longitude: 0, timezone: 0 }))
      .toThrow(/finite/);
  });

  it('rejects an out-of-range latitude', () => {
    expect(() => computePrayerTimes({ date: d(2026, 1, 1), latitude: 100, longitude: 0, timezone: 0 }))
      .toThrow(/latitude out of range/);
  });

  it('rejects an invalid Date', () => {
    expect(() => computePrayerTimes({ date: new Date('nonsense'), latitude: 0, longitude: 0, timezone: 0 }))
      .toThrow();
  });

  it('accepts a Date object', () => {
    const t = computePrayerTimes({
      date: new Date(2026, 5, 21),
      latitude: 23.81,
      longitude: 90.41,
      timezone: 6,
    });
    expect(t.meta.date).toEqual({ year: 2026, month: 6, day: 21 });
  });
});

describe('computePrayerTimes — timezone handling', () => {
  it('shifts all times by one hour when the timezone offset changes', () => {
    const a = computePrayerTimes({ ...DHAKA, timezone: 6, date: d(2026, 6, 21) });
    const b = computePrayerTimes({ ...DHAKA, timezone: 7, date: d(2026, 6, 21) });
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(mins(b[k]) - mins(a[k]), k).toBe(60);
    }
  });
});

describe('formatHours', () => {
  it('formats 24 hour time with zero padding', () => {
    expect(formatHours(5.2)).toBe('05:12');
    expect(formatHours(13.5)).toBe('13:30');
    expect(formatHours(0)).toBe('00:00');
  });

  it('formats 12 hour time with AM/PM', () => {
    expect(formatHours(13.5, { hour12: true })).toBe('1:30 PM');
    expect(formatHours(0.25, { hour12: true })).toBe('12:15 AM');
    expect(formatHours(12, { hour12: true })).toBe('12:00 PM');
  });

  it('renders Bengali numerals when asked', () => {
    expect(formatHours(5.2, { locale: 'bn' })).toBe('০৫:১২');
  });

  it('handles missing values gracefully', () => {
    expect(formatHours(NaN)).toBe('—');
    expect(formatHours(null)).toBe('—');
  });
});

describe('roundMinutes', () => {
  it('rounds to the nearest minute and wraps at midnight', () => {
    expect(roundMinutes(5.2001)).toBeCloseTo(5 + 12 / 60, 6);
    expect(roundMinutes(23.99999)).toBe(0);
  });
});

describe('nextPrayer / currentPrayer', () => {
  const t = times({ date: d(2026, 6, 21) }); // fajr 3.73 .. isha 20.18

  it('finds the next prayer within the day', () => {
    expect(nextPrayer(t, 4).key).toBe('dhuhr');
    expect(nextPrayer(t, 1).key).toBe('fajr');
    expect(nextPrayer(t, 13).key).toBe('asr');
  });

  it('wraps to tomorrow\'s Fajr after Isha', () => {
    const n = nextPrayer(t, 22);
    expect(n.key).toBe('fajr');
    expect(n.tomorrow).toBe(true);
    expect(n.inHours).toBeGreaterThan(0);
    expect(n.inHours).toBeLessThan(24);
  });

  it('identifies the current prayer', () => {
    expect(currentPrayer(t, 13).key).toBe('dhuhr');
    expect(currentPrayer(t, 20).key).toBe('maghrib');
  });

  it('returns null when times are unknown', () => {
    const empty = { fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null };
    expect(nextPrayer(empty, 12)).toBeNull();
    expect(currentPrayer(empty, 12)).toBeNull();
  });
});
