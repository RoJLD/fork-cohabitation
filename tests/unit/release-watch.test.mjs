import { describe, it, expect } from 'vitest';
import { parsePinnedVersion, parseStableTags, cmpSemver, compareToLatest } from '../../src/release-watch.mjs';

describe('parsePinnedVersion (pattern depuis config)', () => {
  it('extrait via un pinPattern fourni', () => {
    expect(parsePinnedVersion('FROM ghcr.io/x/y:1.6.5\n', 'y:(\\d+\\.\\d+\\.\\d+)')).toBe('1.6.5');
  });
  it('null si pas de match', () => {
    expect(parsePinnedVersion('FROM node:22\n', 'y:(\\d+\\.\\d+\\.\\d+)')).toBe(null);
  });
});
describe('parseStableTags', () => {
  it('ignore rc/ et peeled ^{}', () => {
    const out = ['a\trefs/tags/v1.6.5', 'b\trefs/tags/v1.6.5^{}', 'c\trefs/tags/rc/x', 'd\trefs/tags/v1.7.0'].join('\n');
    expect(parseStableTags(out).sort()).toEqual(['v1.6.5', 'v1.7.0']);
  });
});
describe('cmpSemver', () => {
  it('numérique', () => { expect(cmpSemver('v1.10.0', 'v1.9.0')).toBeGreaterThan(0); });
});
describe('compareToLatest', () => {
  it('à jour', () => { expect(compareToLatest('1.6.5', ['v1.6.4', 'v1.6.5']).upToDate).toBe(true); });
  it('alerte si plus récent', () => {
    const r = compareToLatest('1.6.5', ['v1.6.5', 'v1.7.0']);
    expect(r.upToDate).toBe(false); expect(r.latest).toBe('v1.7.0');
  });
  it('liste vide : PAS à jour', () => { expect(compareToLatest('1.6.5', []).upToDate).toBe(false); });
});
