import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function parsePinnedVersion(pinFileText, pinPattern) {
  const m = pinFileText.match(new RegExp(pinPattern));
  return m ? m[1] : null;
}

export function parseStableTags(lsRemoteOutput) {
  return [...lsRemoteOutput.matchAll(/refs\/tags\/(v\d+\.\d+\.\d+)$/gm)].map((m) => m[1]);
}

// Suppose des entrées validées « vX.Y.Z » (le filtre de compareToLatest le garantit) ; NaN sinon.
export function cmpSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function compareToLatest(pinned, tags) {
  const pin = pinned.startsWith('v') ? pinned : `v${pinned}`;
  const stable = tags.filter((t) => /^v\d+\.\d+\.\d+$/.test(t)).slice().sort(cmpSemver);
  const latest = stable.length ? stable[stable.length - 1] : null;
  const newer = stable.filter((t) => cmpSemver(t, pin) > 0);
  return { pinned: pin, latest, newer, upToDate: latest !== null && newer.length === 0 };
}

// Renvoie { pinned, latest, newer, upToDate }.
export function runReleaseWatch(repoPath, config) {
  const pinned = parsePinnedVersion(readFileSync(resolve(repoPath, config.pinFile), 'utf8'), config.pinPattern);
  if (!pinned) throw new Error(`pin introuvable dans ${config.pinFile} (pattern ${config.pinPattern})`);
  const ls = execFileSync('git', ['ls-remote', '--tags', config.upstreamUrl], { encoding: 'utf8' });
  return compareToLatest(pinned, parseStableTags(ls));
}
