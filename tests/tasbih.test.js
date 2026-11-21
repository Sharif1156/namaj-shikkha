import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  createState,
  increment,
  decrement,
  reset,
  progress,
  selectPreset,
  totalCount,
} from '../src/core/tasbih.js';

describe('createState', () => {
  it('starts empty', () => {
    expect(createState()).toMatchObject({ count: 0, rounds: 0, presetId: 'subhanallah' });
  });
});

describe('increment', () => {
  it('counts upward without completing the round', () => {
    const { state, completedRound } = increment({ ...createState(), count: 5, target: 33 });
    expect(state.count).toBe(6);
    expect(completedRound).toBe(false);
  });

  it('wraps to zero and records a round at the target', () => {
    const { state, completedRound } = increment({ ...createState(), count: 32, target: 33 });
    expect(state.count).toBe(0);
    expect(state.rounds).toBe(1);
    expect(completedRound).toBe(true);
  });

  it('never mutates the input state', () => {
    const original = { ...createState(), count: 10, target: 33 };
    const snapshot = { ...original };
    increment(original);
    expect(original).toEqual(snapshot);
  });

  it('treats a missing or invalid target as 1', () => {
    expect(increment({ count: 0, target: 0 }).completedRound).toBe(true);
    expect(increment({ count: 0, target: NaN }).completedRound).toBe(true);
  });
});

describe('decrement', () => {
  it('steps back by one', () => {
    expect(decrement({ count: 5 }).count).toBe(4);
  });

  it('clamps at zero', () => {
    expect(decrement({ count: 0 }).count).toBe(0);
  });
});

describe('reset', () => {
  it('clears the count and rounds', () => {
    expect(reset({ count: 12, rounds: 3, target: 33 })).toMatchObject({ count: 0, rounds: 0 });
  });
});

describe('progress', () => {
  it('is the fraction of the target reached', () => {
    expect(progress({ count: 0, target: 33 })).toBe(0);
    expect(progress({ count: 33, target: 33 })).toBe(1);
    expect(progress({ count: 11, target: 33 })).toBeCloseTo(1 / 3, 5);
  });

  it('never exceeds 1', () => {
    expect(progress({ count: 50, target: 33 })).toBe(1);
  });
});

describe('selectPreset', () => {
  it('adopts the preset target and clears the count', () => {
    const next = selectPreset({ count: 20, target: 33, rounds: 2 }, 'allahuakbar');
    expect(next.presetId).toBe('allahuakbar');
    expect(next.target).toBe(34);
    expect(next.count).toBe(0);
  });

  it('ignores an unknown preset', () => {
    const state = { count: 5, presetId: 'x', target: 33 };
    expect(selectPreset(state, 'nope')).toBe(state);
  });

  it('has a stable, valid preset list', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const p of PRESETS) {
      expect(p.target).toBeGreaterThan(0);
      expect(p.arabic).toMatch(/[\u0600-\u06FF]/);
    }
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('totalCount', () => {
  it('combines completed rounds with the running count', () => {
    expect(totalCount({ count: 5, rounds: 2, target: 33 })).toBe(71);
  });

  it('equals the count before any round completes', () => {
    expect(totalCount({ count: 7, rounds: 0, target: 33 })).toBe(7);
  });
});
