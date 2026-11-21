/**
 * tasbih.js — pure counting logic for the dhikr counter.
 *
 * Kept free of DOM access so it can be unit tested directly.
 */

export const PRESETS = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', translit: 'Subhanallah', en: 'Glory be to Allah', bn: 'আল্লাহ পবিত্র', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', translit: 'Alhamdulillah', en: 'All praise is for Allah', bn: 'সকল প্রশংসা আল্লাহর', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', translit: 'Allahu akbar', en: 'Allah is the Greatest', bn: 'আল্লাহ সর্বশ্রেষ্ঠ', target: 34 },
  { id: 'lailaha', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', translit: 'La ilaha illallah', en: 'There is no god but Allah', bn: 'আল্লাহ ছাড়া কোনো ইলাহ নেই', target: 100 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', translit: 'Astaghfirullah', en: 'I seek Allah\'s forgiveness', bn: 'আমি আল্লাহর কাছে ক্ষমা চাই', target: 100 },
  { id: 'salawat', arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', translit: 'Salawat', en: 'Blessings upon the Prophet', bn: 'নবীর প্রতি দরুদ', target: 100 },
];

/** Create a fresh counter state. */
export function createState(presetId = 'subhanallah', target = 33) {
  return { count: 0, presetId, target, rounds: 0 };
}

/**
 * Increment the counter. Wraps back to zero once the target is reached and
 * records a completed round.
 *
 * @returns {{state: object, completedRound: boolean}}
 */
export function increment(state) {
  const target = Math.max(1, Number(state.target) || 1);
  const next = state.count + 1;
  if (next >= target) {
    return {
      state: { ...state, count: 0, rounds: (state.rounds ?? 0) + 1 },
      completedRound: true,
    };
  }
  return { state: { ...state, count: next }, completedRound: false };
}

/** Decrement without going below zero. */
export function decrement(state) {
  return { ...state, count: Math.max(0, state.count - 1) };
}

export function reset(state) {
  return { ...state, count: 0, rounds: 0 };
}

/** Progress in [0, 1] toward the current target. */
export function progress(state) {
  const target = Math.max(1, Number(state.target) || 1);
  return Math.min(1, state.count / target);
}

/** Switch preset, resetting the running count. */
export function selectPreset(state, presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return state;
  return { ...state, presetId, target: preset.target, count: 0 };
}

/** Total dhikr performed, counting completed rounds plus the current count. */
export function totalCount(state) {
  const target = Math.max(1, Number(state.target) || 1);
  return (state.rounds ?? 0) * target + state.count;
}
