import { describe, it, expect } from 'vitest';
import { filesInDiff, compareDiffFileSets, normalizeDiff } from '../../src/drift.mjs';

const DIFF = `diff --git a/foo.mjs b/foo.mjs
new file mode 100644
--- /dev/null
+++ b/foo.mjs
@@ -0,0 +1 @@
+x
diff --git a/bar/App.tsx b/bar/App.tsx
--- a/bar/App.tsx
+++ b/bar/App.tsx
@@ -1 +1 @@
-a
+b
`;

describe('filesInDiff', () => {
  it('extrait les chemins', () => {
    expect([...filesInDiff(DIFF)].sort()).toEqual(['bar/App.tsx', 'foo.mjs']);
  });
});
describe('compareDiffFileSets', () => {
  it('missing/extra/drifted', () => {
    const r = compareDiffFileSets(new Set(['a']), new Set(['a', 'b']));
    expect(r).toEqual({ missing: ['b'], extra: [], drifted: true });
  });
});
describe('normalizeDiff', () => {
  it('CRLF vers LF', () => { expect(normalizeDiff('a\r\nb')).toBe('a\nb'); });
});
