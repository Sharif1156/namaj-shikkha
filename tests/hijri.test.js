import { describe, it, expect } from 'vitest';
import {
  toHijri,
  fromHijri,
  hijriMonthLength,
  hijriYearLength,
  isHijriLeapYear,
  isRamadan,
  notableDate,
  daysUntilRamadan,
  HIJRI_MONTHS,
} from '../src/core/hijri.js';

describe('toHijri — known anchor dates', () => {
  it('maps 11 March 2024 to 1 Ramadan 1445', () => {
    expect(toHijri(2024, 3, 11)).toMatchObject({ year: 1445, month: 9, day: 1 });
  });

  it('maps 1 March 2025 to 1 Ramadan 1446', () => {
    expect(toHijri(2025, 3, 1)).toMatchObject({ year: 1446, month: 9, day: 1 });
  });

  it('maps 20 March 2026 to 1 Shawwal 1447 (Eid al-Fitr)', () => {
    expect(toHijri(2026, 3, 20)).toMatchObject({ year: 1447, month: 10, day: 1 });
  });

  it('returns the month name', () => {
    expect(toHijri(2024, 3, 11).monthName).toBe('Ramadan');
    expect(toHijri(2024, 3, 11).monthName).toBe(HIJRI_MONTHS[8]);
  });
});

describe('toHijri — structural invariants', () => {
  it('always yields a valid month and day', () => {
    const start = new Date(Date.UTC(2024, 0, 1));
    for (let i = 0; i < 800; i += 3) {
      const dt = new Date(start.getTime() + i * 86400000);
      const h = toHijri(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      expect(h.month).toBeGreaterThanOrEqual(1);
      expect(h.month).toBeLessThanOrEqual(12);
      expect(h.day).toBeGreaterThanOrEqual(1);
      expect(h.day).toBeLessThanOrEqual(hijriMonthLength(h.year, h.month));
    }
  });

  it('advances exactly one Hijri day per Gregorian day', () => {
    let prev = toHijri(2024, 3, 11);
    for (let i = 1; i <= 120; i++) {
      const dt = new Date(Date.UTC(2024, 2, 11) + i * 86400000);
      const cur = toHijri(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      // Either the day incremented, or the month rolled over to day 1.
      const sameMonth = cur.month === prev.month && cur.year === prev.year;
      if (sameMonth) {
        expect(cur.day).toBe(prev.day + 1);
      } else {
        expect(cur.day).toBe(1);
        const expectedMonth = prev.month === 12 ? 1 : prev.month + 1;
        expect(cur.month).toBe(expectedMonth);
      }
      prev = cur;
    }
  });
});

describe('fromHijri / round trip', () => {
  it('round-trips a full Hijri year', () => {
    for (let month = 1; month <= 12; month++) {
      const g = fromHijri(1447, month, 1);
      const back = toHijri(g.year, g.month, g.day);
      expect(back).toMatchObject({ year: 1447, month, day: 1 });
    }
  });

  it('round-trips every 5th day of a Gregorian year', () => {
    const start = new Date(Date.UTC(2025, 0, 1));
    for (let i = 0; i < 365; i += 5) {
      const dt = new Date(start.getTime() + i * 86400000);
      const g = { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
      const h = toHijri(g.y, g.m, g.d);
      const back = fromHijri(h.year, h.month, h.day);
      expect(back).toEqual({ year: g.y, month: g.m, day: g.d });
    }
  });
});

describe('calendar arithmetic', () => {
  it('has 30 days in odd months and 29 in even months', () => {
    for (let m = 1; m <= 11; m++) {
      expect(hijriMonthLength(1447, m)).toBe(m % 2 === 1 ? 30 : 29);
    }
  });

  it('gives Dhu al-Hijjah 30 days only in leap years', () => {
    expect(hijriMonthLength(1447, 12)).toBe(isHijriLeapYear(1447) ? 30 : 29);
  });

  it('sums to 354 or 355 days per year', () => {
    for (let y = 1440; y <= 1460; y++) {
      let total = 0;
      for (let m = 1; m <= 12; m++) total += hijriMonthLength(y, m);
      expect(total).toBe(hijriYearLength(y));
      expect([354, 355]).toContain(total);
    }
  });

  it('marks 11 of every 30 years as leap', () => {
    let leap = 0;
    for (let y = 1; y <= 30; y++) if (isHijriLeapYear(y)) leap += 1;
    expect(leap).toBe(11);
  });
});

describe('Ramadan helpers', () => {
  it('detects Ramadan', () => {
    expect(isRamadan({ month: 9 })).toBe(true);
    expect(isRamadan({ month: 8 })).toBe(false);
  });

  it('counts down to the start of Ramadan', () => {
    const days = daysUntilRamadan(new Date(2026, 0, 1));
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(400);
  });

  it('counts to next year once Ramadan has begun', () => {
    const days = daysUntilRamadan(new Date(2024, 2, 20)); // mid-Ramadan 1445
    expect(days).toBeGreaterThan(300);
  });
});

describe('notableDate', () => {
  it('recognises Eid al-Fitr', () => {
    expect(notableDate({ month: 10, day: 1 }).en).toMatch(/Eid al-Fitr/);
  });

  it('recognises the Day of Arafah', () => {
    expect(notableDate({ month: 12, day: 9 }).en).toMatch(/Arafah/);
  });

  it('returns null for an ordinary day', () => {
    expect(notableDate({ month: 2, day: 3 })).toBeNull();
  });
});
