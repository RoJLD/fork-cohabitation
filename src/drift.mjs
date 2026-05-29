import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function filesInDiff(diffText) {
  const set = new Set();
  for (const line of diffText.split('\n')) {
    const m = line.match(/^diff --git a\/(.+?) b\//);
    if (m) set.add(m[1]);
  }
  return set;
}

export function compareDiffFileSets(committed, live) {
  const missing = [...live].filter((f) => !committed.has(f)).sort(); // dans le clone, pas commité
  const extra = [...committed].filter((f) => !live.has(f)).sort();   // commité, disparu du clone
  return { missing, extra, drifted: missing.length > 0 || extra.length > 0 };
}

// git diff émet du LF ; on neutralise un .diff sauvé en CRLF. BOM non géré (les patches/ sont LF sans BOM).
export function normalizeDiff(text) {
  return text.replace(/\r\n/g, '\n');
}

// Renvoie { drifted, reports:[{diff, missing, extra, contentDrift}] }. Ne modifie rien.
export function runDrift(repoPath, config) {
  const up = resolve(repoPath, config.cloneDir);
  const reports = [];
  let drifted = false;
  try {
    execFileSync('git', ['add', '-N', '.'], { cwd: up });
    for (const [filter, diffRel] of [['A', config.additiveDiff], ['M', config.inplaceDiff]]) {
      const liveText = execFileSync('git', ['diff', 'HEAD', `--diff-filter=${filter}`], { cwd: up, encoding: 'utf8' });
      const committedText = readFileSync(resolve(repoPath, diffRel), 'utf8');
      const setCmp = compareDiffFileSets(filesInDiff(committedText), filesInDiff(liveText));
      const contentDrift = normalizeDiff(liveText) !== normalizeDiff(committedText);
      if (setCmp.drifted || contentDrift) drifted = true;
      reports.push({ diff: diffRel, missing: setCmp.missing, extra: setCmp.extra, contentDrift });
    }
  } finally {
    execFileSync('git', ['reset'], { cwd: up });
  }
  return { drifted, reports };
}
