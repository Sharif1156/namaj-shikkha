/**
 * dom.js — tiny helpers for building DOM without a framework.
 */

/** Escape a string for safe interpolation into HTML. */
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Build an element from an HTML string.
 * @param {string} html
 * @returns {HTMLElement}
 */
export function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/** Replace a container's contents with new markup and return the container. */
export function render(container, html) {
  container.innerHTML = html;
  return container;
}

/** Query helper scoped to a root. */
export const qs = (root, selector) => root.querySelector(selector);
export const qsa = (root, selector) => Array.from(root.querySelectorAll(selector));

/** Attach a delegated click handler by selector. */
export function on(root, event, selector, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}

/**
 * Format a duration in milliseconds as a short countdown, e.g. "1h 24m"
 * or "4m 09s" when under an hour.
 */
export function countdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(s)}s`;
}

/** Bengali-aware digit formatting. */
export function digits(value, locale) {
  const s = String(value);
  if (locale !== 'bn') return s;
  return s.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}

/** Short vibration when supported and enabled. */
export function haptic(enabled, pattern = 12) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

let toastTimer = null;
/** Show a transient message at the bottom of the screen. */
export function toast(message, ms = 2200) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), ms);
}
