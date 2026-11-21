/**
 * storage.js — small, defensive wrapper around localStorage.
 *
 * Every read is guarded: a corrupt value, a full quota, or a browser with
 * storage disabled (Safari private mode) must never break the app.
 */

const PREFIX = 'namaj:';

/** True when persistent storage is usable. */
export function isAvailable() {
  try {
    const k = `${PREFIX}__probe__`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const memory = new Map();

export function get(key, fallback = null) {
  const full = PREFIX + key;
  try {
    const raw = localStorage.getItem(full);
    if (raw === null) return memory.has(full) ? memory.get(full) : fallback;
    return JSON.parse(raw);
  } catch {
    return memory.has(full) ? memory.get(full) : fallback;
  }
}

export function set(key, value) {
  const full = PREFIX + key;
  memory.set(full, value);
  try {
    localStorage.setItem(full, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or blocked — the in-memory copy still works this session.
    return false;
  }
}

export function remove(key) {
  const full = PREFIX + key;
  memory.delete(full);
  try {
    localStorage.removeItem(full);
  } catch {
    /* ignore */
  }
}

export function clearAll() {
  memory.clear();
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** Read-modify-write helper for object-valued keys. */
export function update(key, updater, fallback = {}) {
  const current = get(key, fallback);
  const next = updater(current ?? fallback);
  set(key, next);
  return next;
}
