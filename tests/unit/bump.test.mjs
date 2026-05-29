import { describe, it, expect } from 'vitest';
import { formatBumpReport } from '../../src/bump.mjs';

describe('formatBumpReport', () => {
  it('résume clean/conflict/fail + nomme les fichiers à reprendre', () => {
    const md = formatBumpReport('v1.7.0', [
      { file: 'a.mjs', layer: 'additive', status: 'clean' },
      { file: 'App.tsx', layer: 'inplace', status: 'fail' },
    ]);
    expect(md).toContain('v1.7.0');
    expect(md).toContain('App.tsx');
    expect(md).toMatch(/clean.*1/i);
    expect(md).toMatch(/fail.*1/i);
  });
  it('signale un bump trivial sans conflit', () => {
    const md = formatBumpReport('v1.7.0', [{ file: 'a', layer: 'inplace', status: 'clean' }]);
    expect(md).toMatch(/trivial|aucun conflit/i);
  });
});
