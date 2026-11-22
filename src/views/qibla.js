/**
 * qibla.js — compass view with the direction to the Kaaba.
 */

import { qiblaBearing, distanceToKaaba, compassHeading, turnDirection, compassPoint } from '../core/qibla.js';
import { activeLocation, locationLabel, get } from '../state.js';
import { el, esc, digits } from '../ui/dom.js';
import { t } from '../core/i18n.js';

export function create(ctx) {
  const root = el('<div class="qibla"></div>');
  const loc = activeLocation();
  const bearing = qiblaBearing(loc.latitude, loc.longitude);
  const distance = distanceToKaaba(loc.latitude, loc.longitude);

  let heading = null;
  let listening = false;
  let smoothing = null;
  let sawAbsolute = false; // Android: true-north events have arrived
  let watchdog = null;

  function ticks() {
    let out = '';
    for (let i = 0; i < 72; i++) {
      const major = i % 18 === 0;
      out += `<span class="compass__tick" style="transform: rotate(${i * 5}deg) translateY(0); height:${major ? 14 : 7}px; opacity:${major ? 0.7 : 0.35}"></span>`;
    }
    return out;
  }

  function build() {
    const locale = ctx.locale();
    const locName = locationLabel(loc, locale);
    root.innerHTML = `
      <h2 class="section-title" style="margin-top:6px">${esc(t('qibla.title'))}</h2>
      <p class="muted-text" style="margin:0 4px 4px;">${esc(locName)}</p>

      <div class="compass" data-compass>
        <div class="compass__dial" data-dial>
          ${ticks()}
          <span class="compass__cardinal compass__cardinal--n">N</span>
          <span class="compass__cardinal compass__cardinal--e">E</span>
          <span class="compass__cardinal compass__cardinal--s">S</span>
          <span class="compass__cardinal compass__cardinal--w">W</span>
        </div>
        <div class="compass__needle" data-needle style="--angle:${bearing}deg"></div>
        <div class="compass__hub"></div>
      </div>

      <p class="muted-text" data-status style="text-align:center;margin-top:14px;"></p>

      <div class="qibla-stats">
        <div class="stat">
          <div class="stat__value">${esc(digits(bearing.toFixed(1), locale))}°</div>
          <div class="stat__label">${esc(t('qibla.bearing'))} · ${esc(compassPoint(bearing))}</div>
        </div>
        <div class="stat">
          <div class="stat__value">${esc(digits(Math.round(distance).toLocaleString('en-US'), locale))}</div>
          <div class="stat__label">${esc(t('qibla.distance'))} (km)</div>
        </div>
      </div>

      <button class="btn btn--primary btn--block" type="button" data-action="enable" style="margin-top:16px;">
        ${esc(t('qibla.enable'))}
      </button>

      <p class="muted-text" style="margin-top:14px;text-align:center;">${esc(t('qibla.calibrate'))}</p>
    `;

    root.querySelector('[data-action="enable"]')?.addEventListener('click', enableCompass);
    update();
  }

  async function enableCompass() {
    const statusEl = root.querySelector('[data-status]');
    try {
      const DOE = window.DeviceOrientationEvent;
      if (!DOE) throw new Error('unsupported');

      // iOS 13+ requires an explicit user-gesture permission request.
      if (typeof DOE.requestPermission === 'function') {
        const permission = await DOE.requestPermission();
        if (permission !== 'granted') throw new Error('denied');
      }

      window.addEventListener('deviceorientationabsolute', onOrientation, true);
      window.addEventListener('deviceorientation', onOrientation, true);
      listening = true;

      // Say so immediately: on a device with no magnetometer the button
      // used to vanish with no status at all until the watchdog fired.
      if (statusEl) statusEl.textContent = t('qibla.waiting');

      // If no usable heading arrives (no magnetometer, or only relative
      // events), say so instead of leaving a dead needle — and bring the
      // button back so the user can try again.
      watchdog = setTimeout(() => {
        if (heading === null) {
          const s = root.querySelector('[data-status]');
          if (s) s.textContent = t('qibla.noCompass');
          const btn = root.querySelector('[data-action="enable"]');
          if (btn) btn.style.display = '';
        }
      }, 2500);

      const btn = root.querySelector('[data-action="enable"]');
      if (btn) btn.style.display = 'none';
    } catch {
      if (statusEl) statusEl.textContent = t('qibla.noCompass');
    }
  }

  function onOrientation(event) {
    // Android fires both event types. `deviceorientation` alpha is relative to
    // an arbitrary start, so only trust it when it is flagged absolute (or is
    // iOS's webkitCompassHeading); otherwise the two streams fight each other.
    const isAbsoluteEvent = event.type === 'deviceorientationabsolute';
    if (isAbsoluteEvent) sawAbsolute = true;
    const trusted =
      isAbsoluteEvent ||
      event.absolute === true ||
      typeof event.webkitCompassHeading === 'number';
    if (!trusted) return;
    if (!isAbsoluteEvent && sawAbsolute && typeof event.webkitCompassHeading !== 'number') return;

    const screenAngle =
      screen?.orientation?.angle ?? window.orientation ?? 0;
    const raw = compassHeading(event, Number(screenAngle) || 0);
    if (raw === null) return;

    // Exponential smoothing keeps the needle from jittering.
    smoothing = smoothing === null ? raw : smoothing + 0.22 * shortestDelta(smoothing, raw);
    heading = ((smoothing % 360) + 360) % 360;
    update();
  }

  /** Signed shortest angular delta from a to b, in [-180, 180]. */
  function shortestDelta(a, b) {
    return ((b - a + 540) % 360) - 180;
  }

  function update() {
    const needle = root.querySelector('[data-needle]');
    const dial = root.querySelector('[data-dial]');
    const compass = root.querySelector('[data-compass]');
    if (!needle) return;

    if (heading === null) {
      needle.style.setProperty('--angle', `${bearing}deg`);
      return;
    }

    // Dial rotates so its N points at true north; needle shows the bearing.
    if (dial) dial.style.transform = `rotate(${-heading}deg)`;
    needle.style.setProperty('--angle', `${bearing - heading}deg`);

    const dir = turnDirection(heading, bearing);
    compass?.classList.toggle('is-aligned', dir === 'aligned');

    const status = root.querySelector('[data-status]');
    if (status) {
      status.textContent =
        dir === 'aligned' ? t('qibla.facing') : `${t('qibla.turn')} ${dir === 'left' ? '←' : '→'}`;
    }
  }

  return {
    root: buildRoot(),
    refresh: () => {},
    tick: () => {},
    cleanup() {
      clearTimeout(watchdog);
      if (listening) {
        window.removeEventListener('deviceorientationabsolute', onOrientation, true);
        window.removeEventListener('deviceorientation', onOrientation, true);
      }
    },
  };

  function buildRoot() {
    build();
    return root;
  }
}
