import { describe, it, expect } from 'vitest';
import {
  qiblaBearing,
  distanceToKaaba,
  compassHeading,
  needleRotation,
  dialRotation,
  compassPoint,
  KAABA,
} from '../src/core/qibla.js';

describe('qiblaBearing', () => {
  // Reference bearings computed independently and cross-checked against
  // published Qibla directions for each city.
  const cases = [
    ['Dhaka', 23.8103, 90.4125, 277.6],
    ['Karachi', 24.8607, 67.0011, 267.7],
    ['Jakarta', -6.2088, 106.8456, 295.1],
    ['Cairo', 30.0444, 31.2357, 136.1],
    ['New York', 40.7128, -74.006, 58.5],
    ['London', 51.5074, -0.1278, 119.0],
    ['Istanbul', 41.0082, 28.9784, 151.6],
    ['Delhi', 28.6139, 77.209, 266.6],
  ];

  for (const [city, lat, lng, expected] of cases) {
    it(`points correctly from ${city}`, () => {
      expect(qiblaBearing(lat, lng)).toBeCloseTo(expected, 0);
    });
  }

  it('always returns a bearing in [0, 360)', () => {
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lng = -180; lng < 180; lng += 15) {
        const b = qiblaBearing(lat, lng);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
    }
  });

  it('rejects non-finite input', () => {
    expect(() => qiblaBearing(NaN, 0)).toThrow(/finite/);
    expect(() => qiblaBearing(0, Infinity)).toThrow(/finite/);
  });
});

describe('distanceToKaaba', () => {
  it('is zero at the Kaaba', () => {
    expect(distanceToKaaba(KAABA.latitude, KAABA.longitude)).toBeLessThan(0.5);
  });

  it('is roughly 5,200 km from Dhaka', () => {
    expect(distanceToKaaba(23.8103, 90.4125)).toBeGreaterThan(4900);
    expect(distanceToKaaba(23.8103, 90.4125)).toBeLessThan(5400);
  });

  it('is roughly 10,300 km from New York', () => {
    expect(distanceToKaaba(40.7128, -74.006)).toBeGreaterThan(10000);
    expect(distanceToKaaba(40.7128, -74.006)).toBeLessThan(10600);
  });

  it('never exceeds half the Earth circumference', () => {
    expect(distanceToKaaba(-40, -140)).toBeLessThan(20100);
  });
});

describe('compassHeading', () => {
  it('prefers the iOS webkitCompassHeading', () => {
    expect(compassHeading({ webkitCompassHeading: 42 })).toBe(42);
  });

  it('inverts alpha on Android', () => {
    expect(compassHeading({ alpha: 90, absolute: true })).toBe(270);
    // 360 normalises to 0: alpha 0 means facing north.
    expect(compassHeading({ alpha: 0, absolute: true })).toBe(0);
  });

  it('normalises the result into [0, 360)', () => {
    expect(compassHeading({ webkitCompassHeading: 370 })).toBe(10);
    expect(compassHeading({ webkitCompassHeading: -10 })).toBe(350);
  });

  it('returns null when the sensor provides nothing usable', () => {
    expect(compassHeading(null)).toBeNull();
    expect(compassHeading({})).toBeNull();
    expect(compassHeading({ alpha: NaN })).toBeNull();
  });
});

describe('rotations', () => {
  it('rotates the dial opposite to the heading', () => {
    expect(dialRotation(30)).toBe(-30);
    expect(dialRotation(null)).toBe(0);
  });

  it('keeps the needle rotation in [-180, 180]', () => {
    for (let heading = 0; heading < 360; heading += 17) {
      const r = needleRotation(heading, 277.6);
      expect(r).toBeGreaterThanOrEqual(-180);
      expect(r).toBeLessThanOrEqual(180);
    }
  });

  it('points the needle straight up when facing the Qibla', () => {
    expect(needleRotation(277.6, 277.6)).toBeCloseTo(0, 6);
  });

  it('falls back to the raw bearing without a sensor', () => {
    expect(needleRotation(null, 277.6)).toBe(277.6);
  });
});

describe('compassPoint', () => {
  it('maps bearings to 16-point abbreviations', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(180)).toBe('S');
    expect(compassPoint(270)).toBe('W');
    expect(compassPoint(277.6)).toBe('W');
    expect(compassPoint(360)).toBe('N');
  });

  it('handles missing values', () => {
    expect(compassPoint(NaN)).toBe('—');
  });
});
