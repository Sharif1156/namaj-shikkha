/**
 * i18n.js — Bengali / English interface strings.
 *
 * Bengali is the primary audience language, so `bn` is the default when the
 * browser asks for it; everything degrades to English.
 */

export const LOCALES = ['en', 'bn'];

const STRINGS = {
  en: {
    'app.name': 'Namaj Shikkha',
    'app.tagline': 'Prayer · Qibla · Learning',

    'nav.times': 'Prayer',
    'nav.qibla': 'Qibla',
    'nav.salah': 'Salah',
    'nav.duas': 'Duas',
    'nav.more': 'More',

    'home.next': 'Next prayer',
    'home.remaining': 'remaining',
    'home.now': 'Now',
    'home.today': 'Today',
    'home.location': 'Location',
    'home.useLocation': 'Use my location',
    'home.locating': 'Finding your location…',
    'home.locationDenied': 'Location unavailable — pick a city below.',
    'home.tomorrow': 'tomorrow',
    'home.sunrise': 'Sunrise',
    'home.sunset': 'Sunset',

    'times.title': 'Prayer times',
    'times.method': 'Calculation method',
    'times.madhab': 'Asr school (madhab)',
    'times.highLat': 'High-latitude rule',
    'times.tune': 'Manual adjustment (minutes)',
    'times.imsak': 'Imsak',
    'times.midnight': 'Midnight',
    'times.lastThird': 'Last third of night',

    'qibla.title': 'Qibla',
    'qibla.bearing': 'Bearing',
    'qibla.distance': 'Distance to Makkah',
    'qibla.enable': 'Enable compass',
    'qibla.noCompass': 'This device has no compass. Use the bearing and your phone\'s map compass.',
    'qibla.facing': 'Facing the Qibla',
    'qibla.turn': 'Turn',
    'qibla.calibrate': 'If the needle drifts, move your phone in a figure-8 to calibrate.',

    'salah.title': 'Salah guide',
    'salah.wudu': 'Wudu',
    'salah.prayer': 'Prayer',
    'salah.step': 'Step',
    'salah.repeat': 'Repeat',
    'salah.times': 'times',
    'salah.posture.standing': 'Standing',
    'salah.posture.bowing': 'Bowing',
    'salah.posture.prostration': 'Prostration',
    'salah.posture.sitting': 'Sitting',

    'duas.title': 'Duas & dhikr',
    'duas.all': 'All',
    'duas.source': 'Source',

    'tasbih.title': 'Tasbih',
    'tasbih.reset': 'Reset',
    'tasbih.target': 'Target',
    'tasbih.complete': 'Complete — may Allah accept it.',
    'tasbih.tap': 'Tap anywhere to count',

    'names.title': '99 Names of Allah',
    'names.search': 'Search a name',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.theme.auto': 'Match system',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.timeFormat': 'Time format',
    'settings.timeFormat.24': '24-hour',
    'settings.timeFormat.12': '12-hour',
    'settings.haptics': 'Haptic feedback',
    'settings.reset': 'Reset all data',
    'settings.resetConfirm': 'Erase saved settings and counters?',
    'settings.about': 'About',
    'settings.city': 'City',

    'about.title': 'About this app',
    'about.body':
      'Namaj Shikkha is an offline-first prayer companion. Prayer times are computed on your device from your coordinates using standard astronomical methods — no account, no tracking, no ads. Religious content is drawn from the Qur\'an and the authentic hadith collections.',
    'about.verify':
      'Please confirm worship-critical timings and texts with a qualified scholar or your local mosque. Calculation methods differ slightly by region.',
    'about.privacy':
      'Your location never leaves the device. There is no analytics and no third party.',
    'about.build': 'Build',
    'about.privacyLink': 'Privacy policy',
    'about.source': 'Content sources',
    'about.disclaimer': 'Not affiliated with any of the apps it was inspired by.',

    'ramadan.title': 'Ramadan',
    'ramadan.until': 'days until Ramadan',
    'ramadan.suhoor': 'Suhoor ends',
    'ramadan.iftar': 'Iftar',
    'ramadan.inRamadan': 'Ramadan Mubarak',

    'calendar.title': 'Hijri calendar',
    'calendar.today': 'Today',
    'calendar.note':
      'Uses the tabular Islamic calendar and may differ by a day from local moon sighting.',

    'common.today': 'Today',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.hijri': 'Hijri',
  },

  bn: {
    'app.name': 'নামাজ শিক্ষা',
    'app.tagline': 'নামাজ · কিবলা · শিক্ষা',

    'nav.times': 'নামাজ',
    'nav.qibla': 'কিবলা',
    'nav.salah': 'নামাজ শিক্ষা',
    'nav.duas': 'দোয়া',
    'nav.more': 'আরও',

    'home.next': 'পরবর্তী নামাজ',
    'home.remaining': 'বাকি',
    'home.now': 'এখন',
    'home.today': 'আজ',
    'home.location': 'অবস্থান',
    'home.useLocation': 'আমার অবস্থান ব্যবহার করুন',
    'home.locating': 'আপনার অবস্থান খোঁজা হচ্ছে…',
    'home.locationDenied': 'অবস্থান পাওয়া যায়নি — নিচে থেকে শহর বাছুন।',
    'home.tomorrow': 'আগামীকাল',
    'home.sunrise': 'সূর্যোদয়',
    'home.sunset': 'সূর্যাস্ত',

    'times.title': 'নামাজের সময়সূচি',
    'times.method': 'হিসাবের পদ্ধতি',
    'times.madhab': 'আসরের মাজহাব',
    'times.highLat': 'উচ্চ অক্ষাংশের নিয়ম',
    'times.tune': 'সংশোধন (মিনিট)',
    'times.imsak': 'ইমসাক',
    'times.midnight': 'মধ্যরাত',
    'times.lastThird': 'রাতের শেষ তৃতীয়াংশ',

    'qibla.title': 'কিবলা',
    'qibla.bearing': 'দিক',
    'qibla.distance': 'মক্কার দূরত্ব',
    'qibla.enable': 'কম্পাস চালু করুন',
    'qibla.noCompass': 'এই ডিভাইসে কম্পাস নেই। দিক নির্ণয়ের মান ব্যবহার করুন।',
    'qibla.facing': 'কিবলামুখী',
    'qibla.turn': 'ঘুরুন',
    'qibla.calibrate': 'কাঁটা সরে গেলে ফোনটি ৮ আকৃতিতে ঘুরিয়ে ক্যালিব্রেট করুন।',

    'salah.title': 'নামাজ শিক্ষা',
    'salah.wudu': 'ওযু',
    'salah.prayer': 'নামাজ',
    'salah.step': 'ধাপ',
    'salah.repeat': 'পুনরাবৃত্তি',
    'salah.times': 'বার',
    'salah.posture.standing': 'দাঁড়ানো',
    'salah.posture.bowing': 'রুকু',
    'salah.posture.prostration': 'সিজদা',
    'salah.posture.sitting': 'বসা',

    'duas.title': 'দোয়া ও জিকির',
    'duas.all': 'সব',
    'duas.source': 'সূত্র',

    'tasbih.title': 'তাসবিহ',
    'tasbih.reset': 'রিসেট',
    'tasbih.target': 'লক্ষ্য',
    'tasbih.complete': 'সম্পন্ন — আল্লাহ কবুল করুন।',
    'tasbih.tap': 'গণনার জন্য যেকোনো জায়গায় চাপ দিন',

    'names.title': 'আল্লাহর ৯৯টি নাম',
    'names.search': 'নাম খুঁজুন',

    'settings.title': 'সেটিংস',
    'settings.language': 'ভাষা',
    'settings.theme': 'থিম',
    'settings.theme.auto': 'সিস্টেম অনুযায়ী',
    'settings.theme.light': 'হালকা',
    'settings.theme.dark': 'গাঢ়',
    'settings.timeFormat': 'সময়ের ফরম্যাট',
    'settings.timeFormat.24': '২৪ ঘণ্টা',
    'settings.timeFormat.12': '১২ ঘণ্টা',
    'settings.haptics': 'কম্পন',
    'settings.reset': 'সব ডেটা মুছুন',
    'settings.resetConfirm': 'সেটিংস ও কাউন্টার মুছে ফেলবেন?',
    'settings.about': 'পরিচিতি',
    'settings.city': 'শহর',

    'about.title': 'এই অ্যাপ সম্পর্কে',
    'about.body':
      'নামাজ শিক্ষা একটি অফলাইন-প্রথম নামাজ সহায়ক অ্যাপ। আপনার অবস্থানের ভিত্তিতে ফোনের ভেতরেই নামাজের সময় হিসাব করা হয় — কোনো অ্যাকাউন্ট নেই, ট্র্যাকিং নেই, বিজ্ঞাপন নেই। ধর্মীয় বিষয়বস্তু কুরআন ও সহিহ হাদিস থেকে নেওয়া।',
    'about.verify':
      'ইবাদত-সংশ্লিষ্ট সময় ও পাঠ অবশ্যই একজন যোগ্য আলেম বা আপনার স্থানীয় মসজিদের সঙ্গে মিলিয়ে নিন। অঞ্চলভেদে হিসাবের পদ্ধতিতে সামান্য পার্থক্য থাকে।',
    'about.privacy':
      'আপনার অবস্থান কখনো ডিভাইসের বাইরে যায় না। কোনো অ্যানালিটিক্স বা তৃতীয় পক্ষ নেই।',
    'about.build': 'বিল্ড',
    'about.privacyLink': 'গোপনীয়তা নীতি',
    'about.source': 'তথ্যসূত্র',
    'about.disclaimer': 'এটি যেসব অ্যাপ থেকে অনুপ্রাণিত, তাদের সঙ্গে কোনো সম্পর্ক নেই।',

    'ramadan.title': 'রমজান',
    'ramadan.until': 'দিন বাকি রমজান পর্যন্ত',
    'ramadan.suhoor': 'সেহরির শেষ',
    'ramadan.iftar': 'ইফতার',
    'ramadan.inRamadan': 'রমজান মোবারক',

    'calendar.title': 'হিজরি ক্যালেন্ডার',
    'calendar.today': 'আজ',
    'calendar.note':
      'চন্দ্র গণনার ভিত্তিতে হিসাব, স্থানীয় চাঁদ দেখার সঙ্গে এক দিন পার্থক্য হতে পারে।',

    'common.today': 'আজ',
    'common.close': 'বন্ধ',
    'common.back': 'পেছনে',
    'common.hijri': 'হিজরি',
  },
};

let current = 'en';

/** Pick a sensible default from the browser's languages. */
export function detectLocale() {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) {
    if (!l) continue;
    if (l.toLowerCase().startsWith('bn')) return 'bn';
  }
  return 'en';
}

export function setLocale(locale) {
  current = LOCALES.includes(locale) ? locale : 'en';
  return current;
}

export function getLocale() {
  return current;
}

/** Look up a string, falling back to English and then to the key itself. */
export function t(key, vars) {
  const dict = STRINGS[current] ?? STRINGS.en;
  let str = dict[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/** Localised month names for Gregorian dates. */
const GREGORIAN_MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  bn: ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
};

export function monthName(monthIndex, locale = current) {
  return (GREGORIAN_MONTHS[locale] ?? GREGORIAN_MONTHS.en)[monthIndex] ?? '';
}

/** Translate a digit string to Bengali numerals when the locale is Bengali. */
export function localeDigits(value, locale = current) {
  const s = String(value);
  if (locale !== 'bn') return s;
  return s.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}
