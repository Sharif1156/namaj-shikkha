/**
 * qibla.js — great-circle bearing to the Kaaba, plus compass helpers.
 */

const DEG = Math.PI / 180;
const rad = (d) => d * DEG;
const deg = (r) => r / DEG;

/** Coordinates of the Kaaba, Makkah al-Mukarramah. */
export const KAABA = Object.freeze({ latitude: 21.4224779, longitude: 39.8251832 });

/**
 * Initial great-circle bearing from a point to the Kaaba.
 *
 * @param {number} latitude  observer latitude, degrees
 * @param {number} longitude observer longitude, degrees (east positive)
 * @returns {number} bearing in degrees clockwise from true north, [0, 360)
 */
export function qiblaBearing(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('latitude and longitude must be finite numbers');
  }
  const φ1 = rad(latitude);
  const φ2 = rad(KAABA.latitude);
  const Δλ = rad(KAABA.longitude - longitude);

  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  const θ = deg(Math.atan2(y, x));
  return (θ + 360) % 360;
}

/**
 * Great-circle (haversine) distance to the Kaaba, in kilometres.
 */
export function distanceToKaaba(latitude, longitude) {
  const R = 6371.0088; // mean Earth radius, km
  const φ1 = rad(latitude);
  const φ2 = rad(KAABA.latitude);
  const Δφ = φ2 - φ1;
  const Δλ = rad(KAABA.longitude - longitude);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Convert a `deviceorientation`-style heading into a compass bearing.
 *
 * iOS supplies `webkitCompassHeading` directly (already true-north and
 * independent of screen rotation). Android supplies `alpha`, which runs
 * counter-clockwise from north, so we invert it. Screen orientation is
 * added back so the needle stays correct in landscape.
 *
 * @param {object} event DeviceOrientationEvent-like object
 * @param {number} [screenAngle=0] degrees from window.screen.orientation.angle
 * @returns {number|null} compass heading in degrees, or null if unavailable
 */
export function compassHeading(event, screenAngle = 0) {
  if (!event) return null;
  if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    return ((event.webkitCompassHeading % 360) + 360) % 360;
  }
  if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    const absolute = event.absolute === true;
    const heading = 360 - event.alpha + (absolute ? 0 : 0) + screenAngle;
    return ((heading % 360) + 360) % 360;
  }
  return null;
}

/**
 * Rotation to apply to a compass dial so that its "north" mark points at
 * true north, given the user's heading.
 */
export function dialRotation(heading) {
  if (!Number.isFinite(heading)) return 0;
  return -heading;
}

/** Relative angle the Qibla needle should point, given heading and bearing. */
export function needleRotation(heading, bearing) {
  if (!Number.isFinite(heading)) return bearing;
  return ((bearing - heading + 540) % 360) - 180;
}

/** 16-point compass abbreviation for a bearing. */
export function compassPoint(bearing) {
  if (!Number.isFinite(bearing)) return '—';
  const points = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const i = Math.round(((bearing % 360) + 360) % 360 / 22.5) % 16;
  return points[i];
}
