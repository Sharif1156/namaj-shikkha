/**
 * location.js — geolocation plus a built-in city list.
 *
 * Nothing is sent anywhere: coordinates stay in localStorage on the device.
 */

/** A short list of cities, weighted toward Bangladesh and the diaspora. */
export const CITIES = [
  { id: 'dhaka', en: 'Dhaka', bn: 'ঢাকা', country: 'BD', latitude: 23.8103, longitude: 90.4125, timezone: 6 },
  { id: 'chattogram', en: 'Chattogram', bn: 'চট্টগ্রাম', country: 'BD', latitude: 22.3569, longitude: 91.7832, timezone: 6 },
  { id: 'sylhet', en: 'Sylhet', bn: 'সিলেট', country: 'BD', latitude: 24.8949, longitude: 91.8687, timezone: 6 },
  { id: 'khulna', en: 'Khulna', bn: 'খুলনা', country: 'BD', latitude: 22.8456, longitude: 89.5403, timezone: 6 },
  { id: 'rajshahi', en: 'Rajshahi', bn: 'রাজশাহী', country: 'BD', latitude: 24.3745, longitude: 88.6042, timezone: 6 },
  { id: 'barishal', en: 'Barishal', bn: 'বরিশাল', country: 'BD', latitude: 22.7010, longitude: 90.3535, timezone: 6 },
  { id: 'rangpur', en: 'Rangpur', bn: 'রংপুর', country: 'BD', latitude: 25.7439, longitude: 89.2752, timezone: 6 },
  { id: 'mymensingh', en: 'Mymensingh', bn: 'ময়মনসিংহ', country: 'BD', latitude: 24.7471, longitude: 90.4203, timezone: 6 },
  { id: 'coxsbazar', en: "Cox's Bazar", bn: 'কক্সবাজার', country: 'BD', latitude: 21.4272, longitude: 92.0058, timezone: 6 },
  { id: 'makkah', en: 'Makkah', bn: 'মক্কা', country: 'SA', latitude: 21.4225, longitude: 39.8262, timezone: 3 },
  { id: 'madinah', en: 'Madinah', bn: 'মদিনা', country: 'SA', latitude: 24.4672, longitude: 39.6111, timezone: 3 },
  { id: 'karachi', en: 'Karachi', bn: 'করাচি', country: 'PK', latitude: 24.8607, longitude: 67.0011, timezone: 5 },
  { id: 'delhi', en: 'Delhi', bn: 'দিল্লি', country: 'IN', latitude: 28.6139, longitude: 77.209, timezone: 5.5 },
  { id: 'kolkata', en: 'Kolkata', bn: 'কলকাতা', country: 'IN', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
  { id: 'jakarta', en: 'Jakarta', bn: 'জাকার্তা', country: 'ID', latitude: -6.2088, longitude: 106.8456, timezone: 7 },
  { id: 'kualalumpur', en: 'Kuala Lumpur', bn: 'কুয়ালালামপুর', country: 'MY', latitude: 3.139, longitude: 101.6869, timezone: 8 },
  { id: 'dubai', en: 'Dubai', bn: 'দুবাই', country: 'AE', latitude: 25.2048, longitude: 55.2708, timezone: 4 },
  { id: 'doha', en: 'Doha', bn: 'দোহা', country: 'QA', latitude: 25.2854, longitude: 51.531, timezone: 3 },
  { id: 'istanbul', en: 'Istanbul', bn: 'ইস্তাম্বুল', country: 'TR', latitude: 41.0082, longitude: 28.9784, timezone: 3 },
  { id: 'cairo', en: 'Cairo', bn: 'কায়রো', country: 'EG', latitude: 30.0444, longitude: 31.2357, timezone: 2 },
  { id: 'london', en: 'London', bn: 'লন্ডন', country: 'GB', latitude: 51.5074, longitude: -0.1278, timezone: 0 },
  { id: 'newyork', en: 'New York', bn: 'নিউ ইয়র্ক', country: 'US', latitude: 40.7128, longitude: -74.006, timezone: -5 },
  { id: 'toronto', en: 'Toronto', bn: 'টরন্টো', country: 'CA', latitude: 43.6532, longitude: -79.3832, timezone: -5 },
  { id: 'sydney', en: 'Sydney', bn: 'সিডনি', country: 'AU', latitude: -33.8688, longitude: 151.2093, timezone: 10 },
];

export function findCity(id) {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** Resolve a city by its coordinates (nearest within ~50 km), else null. */
export function nearestCity(latitude, longitude) {
  let best = null;
  let bestDist = Infinity;
  for (const c of CITIES) {
    const d = haversineKm(latitude, longitude, c.latitude, c.longitude);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= 50 ? { city: best, distanceKm: bestDist } : { city: null, distanceKm: bestDist };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * UTC offset (hours) of an IANA zone on a given date, DST-aware.
 * Returns null when the zone is unknown or Intl cannot resolve it.
 */
export function zoneOffset(zone, date = new Date()) {
  if (!zone) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' });
    const part = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName');
    const value = part?.value ?? '';
    if (value === 'GMT' || value === 'UTC') return 0;
    const m = value.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return null;
    const hours = Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0);
    return m[1] === '-' ? -hours : hours;
  } catch {
    return null;
  }
}

/** The device's IANA zone, e.g. "Asia/Dhaka", or null if unavailable. */
export function deviceZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** The device's UTC offset in hours on a given date (DST-aware). */
export function currentTimezone(date = new Date()) {
  return -date.getTimezoneOffset() / 60;
}

/** IANA zone for a built-in city, or null. */
export function cityZone(city) {
  return (city && CITY_ZONES[city.id]) || null;
}

/**
 * Timezone offset for a city on `date`, honouring daylight saving when the
 * browser supports Intl zones, otherwise the city's fixed offset.
 */
export function cityTimezone(city, date = new Date()) {
  if (!city) return currentTimezone(date);
  return zoneOffset(cityZone(city), date) ?? city.timezone;
}

/** IANA zone per city, for daylight-saving-aware offsets. */
const CITY_ZONES = {
  dhaka: 'Asia/Dhaka', chattogram: 'Asia/Dhaka', sylhet: 'Asia/Dhaka', khulna: 'Asia/Dhaka',
  rajshahi: 'Asia/Dhaka', barishal: 'Asia/Dhaka', rangpur: 'Asia/Dhaka', mymensingh: 'Asia/Dhaka',
  coxsbazar: 'Asia/Dhaka', makkah: 'Asia/Riyadh', madinah: 'Asia/Riyadh',
  karachi: 'Asia/Karachi', delhi: 'Asia/Kolkata', kolkata: 'Asia/Kolkata',
  jakarta: 'Asia/Jakarta', kualalumpur: 'Asia/Kuala_Lumpur', dubai: 'Asia/Dubai',
  doha: 'Asia/Qatar', istanbul: 'Europe/Istanbul', cairo: 'Africa/Cairo',
  london: 'Europe/London', newyork: 'America/New_York', toronto: 'America/Toronto',
  sydney: 'Australia/Sydney',
};

/**
 * Ask the browser for a position.
 * @returns {Promise<{latitude:number, longitude:number}>}
 */
export function requestPosition({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation-unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout, maximumAge: 600000 }
    );
  });
}
