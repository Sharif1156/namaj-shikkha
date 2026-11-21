/**
 * hijri.js — Gregorian ⇄ Hijri conversion using the tabular (arithmetic)
 * Islamic calendar, which is what most software uses.
 *
 * IMPORTANT: the tabular calendar is deterministic and may differ by ±1 day
 * from locally observed dates, because the true Islamic month begins with the
 * sighting of the new crescent. Use this for planning and general guidance;
 * defer to your local authority for worship-critical dates.
 */

/** Gregorian date → Julian Day Number. */
function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Day Number → Gregorian date. */
function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

/** Epoch of the tabular Islamic calendar (16 July 622 CE, Julian). */
const ISLAMIC_EPOCH = 1948439.5;

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah',
];

export const HIJRI_MONTHS_BN = [
  'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
  'জুমাদাল উলা', 'জুমাদাল আখিরা', 'রজব', 'শাবান',
  'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ',
];

/**
 * Gregorian → Hijri.
 * @returns {{year:number, month:number, day:number, monthName:string}}
 */
export function toHijri(year, month, day) {
  const jdn = gregorianToJDN(year, month, day);
  // Day count since the Islamic epoch.
  let days = Math.floor(jdn - Math.floor(ISLAMIC_EPOCH) - 0.5) + 1;
  const cycles = Math.floor((days - 1) / 10631);
  const rem = (days - 1) % 10631;

  // A 30-year cycle holds 10631 days: 19 years of 354 + 11 of 355.
  let hYear = cycles * 30 + 1;
  let daysLeft = rem;

  for (let i = 0; i < 30; i++) {
    const yLen = isHijriLeapYear(hYear) ? 355 : 354;
    if (daysLeft < yLen) break;
    daysLeft -= yLen;
    hYear += 1;
  }

  let hMonth = 1;
  while (hMonth <= 12) {
    const mLen = hijriMonthLength(hYear, hMonth);
    if (daysLeft < mLen) break;
    daysLeft -= mLen;
    hMonth += 1;
  }

  return {
    year: hYear,
    month: hMonth,
    day: daysLeft + 1,
    monthName: HIJRI_MONTHS[hMonth - 1],
  };
}

/** Hijri → Gregorian. */
export function fromHijri(hYear, hMonth, hDay) {
  let days = 0;
  for (let y = 1; y < hYear; y++) {
    days += isHijriLeapYear(y) ? 355 : 354;
  }
  for (let m = 1; m < hMonth; m++) {
    days += hijriMonthLength(hYear, m);
  }
  days += hDay - 1;
  // `days` is a 0-based offset from 1 Muharram 1 AH; toHijri derives its
  // offset as floor(jdn - epoch - 0.5), so the +1 here keeps the two
  // conversions exact inverses of each other.
  const jdn = Math.floor(ISLAMIC_EPOCH) + days + 1;
  return jdnToGregorian(jdn);
}

/** Years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 of each 30-year cycle are leap. */
export function isHijriLeapYear(hYear) {
  const inCycle = ((hYear - 1) % 30) + 1;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(inCycle);
}

/** Odd months have 30 days, even have 29; month 12 has 30 in leap years. */
export function hijriMonthLength(hYear, hMonth) {
  if (hMonth === 12) return isHijriLeapYear(hYear) ? 30 : 29;
  return hMonth % 2 === 1 ? 30 : 29;
}

/** Number of days in the Hijri year. */
export function hijriYearLength(hYear) {
  return isHijriLeapYear(hYear) ? 355 : 354;
}

/** True when the given Hijri month is Ramadan. */
export function isRamadan(hijri) {
  return hijri.month === 9;
}

/**
 * Notable Islamic dates (Hijri month/day) for calendar highlighting.
 */
export const NOTABLE_DATES = [
  { month: 1, day: 1, en: 'Islamic New Year', bn: 'হিজরি নববর্ষ' },
  { month: 1, day: 10, en: 'Ashura', bn: 'আশুরা' },
  { month: 3, day: 12, en: "Mawlid an-Nabi (12 Rabi' al-Awwal)", bn: 'মিলাদুন্নবী' },
  { month: 7, day: 27, en: "Isra' and Mi'raj", bn: 'শবে মেরাজ' },
  { month: 8, day: 15, en: "Laylat al-Bara'ah", bn: 'শবে বরাত' },
  { month: 9, day: 1, en: 'Ramadan begins', bn: 'রমজান শুরু' },
  { month: 9, day: 27, en: 'Laylat al-Qadr (likely)', bn: 'শবে কদর' },
  { month: 10, day: 1, en: 'Eid al-Fitr', bn: 'ঈদুল ফিতর' },
  { month: 12, day: 9, en: 'Day of Arafah', bn: 'আরাফার দিন' },
  { month: 12, day: 10, en: 'Eid al-Adha', bn: 'ঈদুল আজহা' },
];

/** Which notable date, if any, falls on this Hijri day. */
export function notableDate(hijri) {
  return NOTABLE_DATES.find((d) => d.month === hijri.month && d.day === hijri.day) ?? null;
}

/** Days remaining until Ramadan 1 of the current Hijri year. */
export function daysUntilRamadan(gregorianDate) {
  const h = toHijri(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  const targetYear = h.month > 9 || (h.month === 9 && h.day > 1) ? h.year + 1 : h.year;
  const target = fromHijri(targetYear, 9, 1);
  const a = gregorianToJDN(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  const b = gregorianToJDN(target.year, target.month, target.day);
  return b - a;
}
