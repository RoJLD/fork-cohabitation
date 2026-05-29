import { describe, it, expect } from 'vitest';
import { validateConfig, normalizeConfig } from '../../src/config.mjs';

const OK = {
  upstreamUrl: 'https://github.com/x/y.git',
  additiveDiff: 'patches/additive-files.diff',
  inplaceDiff: 'patches/inplace-edits.diff',
  pinFile: 'Dockerfile.cli',
  pinPattern: 'y:(\\d+\\.\\d+\\.\\d+)',
};

describe('validateConfig', () => {
  it('aucune erreur pour une config complète', () => {
    expect(validateConfig(OK)).toEqual([]);
  });
  it('signale les champs requis manquants', () => {
    const errs = validateConfig({ upstreamUrl: 'u' });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toContain('pinFile');
  });
  it('signale une pinPattern regex invalide', () => {
    const errs = validateConfig({ ...OK, pinPattern: '(' });
    expect(errs.join(' ')).toMatch(/pinPattern/);
  });
});

describe('normalizeConfig', () => {
  it('applique cloneDir=upstream par défaut', () => {
    expect(normalizeConfig(OK).cloneDir).toBe('upstream');
  });
  it('respecte un cloneDir fourni', () => {
    expect(normalizeConfig({ ...OK, cloneDir: 'vendor' }).cloneDir).toBe('vendor');
  });
});
