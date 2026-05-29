import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export function formatBumpReport(target, results) {
  const by = (s) => results.filter((r) => r.status === s);
  const clean = by('clean');
  const conflict = by('conflict');
  const fail = by('fail');
  const lines = [];
  lines.push(`# Bump dry-run report — cible \`${target}\``);
  lines.push('');
  lines.push(`- clean: ${clean.length}`);
  lines.push(`- conflict: ${conflict.length}`);
  lines.push(`- fail: ${fail.length}`);
  lines.push('');
  if (conflict.length === 0 && fail.length === 0) {
    lines.push('**Bump trivial — aucun conflit détecté.**');
  } else {
    lines.push('## Fichiers à reprendre à la main');
    for (const r of [...conflict, ...fail]) {
      lines.push(`- [${r.status}] (${r.layer}) ${r.file}`);
    }
  }
  lines.push('');
  lines.push('## Détail');
  for (const r of results) {
    lines.push(`- [${r.status}] (${r.layer}) ${r.file}`);
  }
  return lines.join('\n');
}

export function listDiffFiles(cwd, diffPath) {
  // `git apply --numstat` lists "added\tdeleted\tpath" per file in the diff.
  return execFileSync('git', ['apply', '--numstat', diffPath], { cwd, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
    .map((l) => l.split('\t').pop());
}

export function applyPerFile(cwd, diffPath, layer, mode) {
  const files = listDiffFiles(cwd, diffPath);
  const results = [];
  for (const file of files) {
    // --include treats the path as an fnmatch pattern; our diff paths are literal
    // full paths with no glob metachars, so each matches exactly one file. Guard it:
    if (/[*?[]/.test(file)) { results.push({ file, layer, status: 'fail' }); continue; }
    try {
      execFileSync('git', ['apply', ...mode, '--include', file, diffPath], { cwd, stdio: 'pipe' });
      // In --3way mode, a "successful" apply can still leave conflict markers.
      let hasMarkers = false;
      if (mode.includes('--3way')) {
        try { hasMarkers = /^<{7} /m.test(readFileSync(join(cwd, file), 'utf8')); }
        catch { hasMarkers = false; }
      }
      results.push({ file, layer, status: hasMarkers ? 'conflict' : 'clean' });
    } catch {
      results.push({ file, layer, status: 'fail' });
    }
  }
  return results;
}

// Dry-run : clone config.upstreamUrl@target (clone COMPLET, pas --depth 1, requis pour --3way),
// applique additif (--check) + inplace (--3way). Renvoie { target, results:[{file,layer,status}] }.
export function runBump(repoPath, config, target) {
  const tmp = mkdtempSync(join(tmpdir(), 'cohabit-bump-'));
  try {
    execFileSync('git', ['clone', '--branch', target, config.upstreamUrl, tmp], { stdio: 'inherit' });
    const additive = applyPerFile(tmp, resolve(repoPath, config.additiveDiff), 'additive', ['--check']);
    const inplace = applyPerFile(tmp, resolve(repoPath, config.inplaceDiff), 'inplace', ['--3way']);
    return { target, results: [...additive, ...inplace] };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
