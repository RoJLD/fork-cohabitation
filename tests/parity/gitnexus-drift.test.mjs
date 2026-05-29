import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const GITNEXUS = resolve(ROOT, '../gitnexus');

function exitCodeOf(fn) {
  try { fn(); return 0; } catch (e) { return typeof e.status === 'number' ? e.status : 1; }
}

describe.skipIf(!existsSync(GITNEXUS))('parité drift central vs script gitnexus', () => {
  it('même exit code (0 clean / 1 drift) que check-patch-drift.mjs', () => {
    const local = exitCodeOf(() =>
      execFileSync('node', [resolve(GITNEXUS, 'scripts/check-patch-drift.mjs')], { stdio: 'pipe' }));
    const central = exitCodeOf(() =>
      execFileSync('node', [resolve(ROOT, 'bin/cohabit.mjs'), 'drift', 'gitnexus'], { stdio: 'pipe' }));
    expect(central).toBe(local);
  });
});
