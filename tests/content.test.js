import { describe, it, expect } from 'vitest';
import { validateContent } from '../scripts/content-checks.mjs';

const { problems, stats } = validateContent();

describe('religious content integrity', () => {
  it('reports no structural problems', () => {
    // Print everything at once so a failure is actionable rather than a surprise.
    expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
  });

  it('covers the full prayer lifecycle', () => {
    expect(stats.wuduSteps).toBeGreaterThanOrEqual(9);
    expect(stats.salahSteps).toBeGreaterThanOrEqual(10);
  });

  it('ships a usable dua collection', () => {
    expect(stats.duas).toBeGreaterThanOrEqual(12);
    expect(stats.duaCategories).toBeGreaterThanOrEqual(4);
  });

  it('contains exactly 99 names', () => {
    expect(stats.names).toBe(99);
  });
});
