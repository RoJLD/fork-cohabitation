import { describe, it, expect } from 'vitest';
import { selectWatchTargets } from '../../src/orchestration.mjs';

const REG = [
  { name: 'a', cadence: 'weekly', lastWatch: null },
  { name: 'b', cadence: 'daily', lastWatch: '2026-05-29T00:00:00.000Z' },
];
const NOW = Date.parse('2026-05-29T06:00:00Z');

describe('selectWatchTargets', () => {
  it('--all renvoie tout', () => {
    expect(selectWatchTargets(REG, { all: true }, NOW).map((e) => e.name)).toEqual(['a', 'b']);
  });
  it('--due ne renvoie que les dus', () => {
    expect(selectWatchTargets(REG, { due: true }, NOW).map((e) => e.name)).toEqual(['a']);
  });
  it('un nom explicite renvoie ce repo', () => {
    expect(selectWatchTargets(REG, { name: 'b' }, NOW).map((e) => e.name)).toEqual(['b']);
  });
});
