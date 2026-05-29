import { describe, it, expect } from 'vitest';
import { resolveRepoPath, entriesToClone } from '../../src/registry.mjs';
import { resolve } from 'node:path';

describe('resolveRepoPath', () => {
  it('résout entry.path relativement au dossier du registre', () => {
    expect(resolveRepoPath('/work', { path: './gitnexus' })).toBe(resolve('/work', './gitnexus'));
  });
});

describe('entriesToClone', () => {
  it('ne garde que les entrées avec gitUrl, ref défaut main', () => {
    const reg = [
      { name: 'a', path: './a', gitUrl: 'https://x/a.git' },
      { name: 'b', path: '../b' },
      { name: 'c', path: './c', gitUrl: 'https://x/c.git', ref: 'v1.2.3' },
    ];
    expect(entriesToClone(reg)).toEqual([
      { name: 'a', gitUrl: 'https://x/a.git', ref: 'main' },
      { name: 'c', gitUrl: 'https://x/c.git', ref: 'v1.2.3' },
    ]);
  });
  it("renvoie [] si aucune entrée n'a de gitUrl", () => {
    expect(entriesToClone([{ name: 'b', path: '../b' }])).toEqual([]);
  });
});
