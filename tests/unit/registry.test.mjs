import { describe, it, expect } from 'vitest';
import { cadenceDays, isDue, dueRepos, resolveRepo } from '../../src/registry.mjs';

const REG = [
  { name: 'a', path: '../a', tier: 'normal', cadence: 'weekly', lastWatch: null },
  { name: 'b', path: '../b', tier: 'critical', cadence: 'daily', lastWatch: '2026-05-01T00:00:00.000Z' },
];

describe('cadenceDays', () => {
  it('mappe les noms connus', () => {
    expect(cadenceDays('daily')).toBe(1);
    expect(cadenceDays('weekly')).toBe(7);
    expect(cadenceDays('monthly')).toBe(30);
  });
  it('renvoie null pour une cadence inconnue', () => {
    expect(cadenceDays('hourly')).toBe(null);
  });
});

describe('isDue', () => {
  it('dû si jamais surveillé (lastWatch null)', () => {
    expect(isDue(REG[0], Date.parse('2026-05-29T00:00:00Z'))).toBe(true);
  });
  it("dû si l'intervalle de cadence est dépassé", () => {
    expect(isDue(REG[1], Date.parse('2026-05-29T00:00:00Z'))).toBe(true);
  });
  it("pas dû si dans l'intervalle", () => {
    const entry = { ...REG[1], lastWatch: '2026-05-29T00:00:00.000Z' };
    expect(isDue(entry, Date.parse('2026-05-29T06:00:00Z'))).toBe(false);
  });
  it('dû (conservateur) si cadence inconnue', () => {
    const entry = { ...REG[1], cadence: 'hourly', lastWatch: '2026-05-29T00:00:00.000Z' };
    expect(isDue(entry, Date.parse('2026-05-29T00:30:00Z'))).toBe(true);
  });
});

describe('dueRepos', () => {
  it('filtre les entrées dues', () => {
    const now = Date.parse('2026-05-02T00:00:00Z');
    expect(dueRepos(REG, now).map((e) => e.name)).toEqual(['a', 'b']);
  });
});

describe('resolveRepo', () => {
  it('trouve par nom', () => {
    expect(resolveRepo(REG, 'b').tier).toBe('critical');
  });
  it('throw si absent', () => {
    expect(() => resolveRepo(REG, 'zzz')).toThrow(/registre/);
  });
});
